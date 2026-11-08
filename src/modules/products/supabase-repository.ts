import type { BaseRecord } from '@/lib/types';
import { JsonDBError, query } from '@/lib/json-db';
import { generateId, now } from '@/lib/utils';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { normalizeProductCode } from './code-utils';
import {
  hasDuplicateProductReference,
  PRODUCTO_CON_EXISTENCIAS_MESSAGE,
  REFERENCIA_DUPLICADA_MESSAGE,
} from './product-rules';
import type { ProductCreateInput, ProductDeleteResult, ProductInput, ProductRecord } from './types';

interface ProductRow {
  id: string;
  code: string;
  normalized_code: string;
  code_type: ProductRecord['codeType'];
  variant_group_id: string;
  name: string;
  category: ProductRecord['category'];
  size: string;
  color: string;
  cost_price: number;
  sale_price: number;
  stock: number;
  min_stock: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface DatabaseError {
  code?: string;
  constraint?: string;
  details?: string;
  message?: string;
}

type DatabaseResult<T> =
  | {
      data: T;
      error: null;
    }
  | {
      data: null;
      error: DatabaseError;
    };

type MovementRecord = BaseRecord & { productCode: string };

function mapProduct(row: ProductRow): ProductRecord {
  return {
    id: row.id,
    code: row.code,
    codeType: row.code_type,
    variantGroupId: row.variant_group_id,
    name: row.name,
    category: row.category,
    size: row.size,
    color: row.color,
    costPrice: row.cost_price,
    salePrice: row.sale_price,
    stock: row.stock,
    minStock: row.min_stock,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapProductInput(input: ProductInput | ProductCreateInput) {
  return {
    code: input.code?.trim() || null,
    code_type: 'codeType' in input ? input.codeType : undefined,
    variant_group_id: input.variantGroupId || generateId('variant'),
    name: input.name,
    category: input.category,
    size: input.size,
    color: input.color,
    cost_price: input.costPrice,
    sale_price: input.salePrice,
    stock: input.stock,
    min_stock: input.minStock,
    active: input.active,
  };
}

function throwDatabaseError(error: unknown): never {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const databaseError = error as DatabaseError;
    const constraint = [
      databaseError.constraint,
      databaseError.message,
      databaseError.details,
    ].join(' ');
    if (databaseError.code === '23505') {
      if (constraint.includes('products_normalized_code_unique')) {
        throw new JsonDBError('DUPLICATE_CODE', 'Ya existe un producto con ese código.');
      }
      throw new JsonDBError('REFERENCIA_DUPLICADA', REFERENCIA_DUPLICADA_MESSAGE);
    }
    if (
      databaseError.code === '23514' &&
      constraint.includes('products_active_requires_zero_stock')
    ) {
      throw new JsonDBError('PRODUCTO_CON_EXISTENCIAS', PRODUCTO_CON_EXISTENCIAS_MESSAGE);
    }
  }
  throw new JsonDBError(
    'IO_ERROR',
    'No se pudo completar la operación de productos en la base de datos.',
  );
}

async function databaseOperation<T>(
  operation: () => PromiseLike<DatabaseResult<T>>,
): Promise<T> {
  try {
    const result = await operation();
    if (result.error) throwDatabaseError(result.error);
    return result.data;
  } catch (error) {
    if (error instanceof JsonDBError) throw error;
    throwDatabaseError(error);
  }
}

async function productHasMovements(code: string): Promise<boolean> {
  const [purchases, sales] = await Promise.all([
    query<MovementRecord>(
      'purchase',
      (movement) => normalizeProductCode(movement.productCode) === normalizeProductCode(code),
    ),
    query<MovementRecord>(
      'sale',
      (movement) => normalizeProductCode(movement.productCode) === normalizeProductCode(code),
    ),
  ]);
  return purchases.length > 0 || sales.length > 0;
}

export async function listProducts(): Promise<ProductRecord[]> {
  const client = createAdminSupabaseClient();
  const rows = await databaseOperation<ProductRow[]>(() =>
    client.from('products').select('*').order('name', { ascending: true }),
  );
  return rows.map(mapProduct);
}

export async function getProduct(id: string): Promise<ProductRecord | null> {
  const client = createAdminSupabaseClient();
  const row = await databaseOperation<ProductRow | null>(() =>
    client.from('products').select('*').eq('id', id).maybeSingle(),
  );
  return row ? mapProduct(row) : null;
}

export async function findProductByCode(code: string): Promise<ProductRecord | null> {
  const normalizedCode = normalizeProductCode(code);
  if (!normalizedCode) return null;

  const client = createAdminSupabaseClient();
  const row = await databaseOperation<ProductRow | null>(() =>
    client.from('products').select('*').eq('normalized_code', normalizedCode).maybeSingle(),
  );
  return row ? mapProduct(row) : null;
}

export async function createProduct(input: ProductCreateInput): Promise<ProductRecord> {
  if (!input.active && input.stock > 0) {
    throw new JsonDBError('PRODUCTO_CON_EXISTENCIAS', PRODUCTO_CON_EXISTENCIAS_MESSAGE);
  }
  if (hasDuplicateProductReference(await listProducts(), input)) {
    throw new JsonDBError('REFERENCIA_DUPLICADA', REFERENCIA_DUPLICADA_MESSAGE);
  }

  const client = createAdminSupabaseClient();
  const payload = mapProductInput(input);
  const row = await databaseOperation<ProductRow | null>(() =>
    client
      .from('products')
      .insert({
        ...payload,
        id: generateId('product'),
      })
      .select('*')
      .single(),
  );
  if (!row) {
    throw new JsonDBError(
      'IO_ERROR',
      'No se pudo completar la operación de productos en la base de datos.',
    );
  }
  return mapProduct(row);
}

export async function updateProduct(
  id: string,
  input: ProductInput,
): Promise<ProductRecord | null> {
  const current = await getProduct(id);
  if (!current) return null;
  if (!input.active && input.stock > 0) {
    throw new JsonDBError('PRODUCTO_CON_EXISTENCIAS', PRODUCTO_CON_EXISTENCIAS_MESSAGE);
  }

  if (
    normalizeProductCode(current.code) !== normalizeProductCode(input.code) &&
    (await productHasMovements(current.code))
  ) {
    throw new JsonDBError(
      'VALIDATION_ERROR',
      'No se puede cambiar el código de un producto que ya tiene movimientos.',
    );
  }
  if (hasDuplicateProductReference(await listProducts(), input, id)) {
    throw new JsonDBError('REFERENCIA_DUPLICADA', REFERENCIA_DUPLICADA_MESSAGE);
  }

  const updatedAt = now();
  const payload = {
    ...mapProductInput(input),
    code_type:
      normalizeProductCode(current.code) === normalizeProductCode(input.code)
        ? current.codeType
        : /^KAT-\d{6}$/i.test(input.code)
          ? 'internal'
          : 'factory',
    updated_at: updatedAt,
  };
  const client = createAdminSupabaseClient();
  let update = client.from('products').update(payload).eq('id', id);
  if (!input.active) update = update.eq('stock', current.stock);
  const row = await databaseOperation<ProductRow | null>(() => update.select('*').maybeSingle());
  if (!row && !input.active) {
    const latest = await getProduct(id);
    if (latest && latest.stock !== current.stock) {
      throw new JsonDBError('PRODUCTO_CON_EXISTENCIAS', PRODUCTO_CON_EXISTENCIAS_MESSAGE);
    }
  }
  return row ? mapProduct(row) : null;
}

export async function removeOrDeactivateProduct(id: string): Promise<ProductDeleteResult | null> {
  const current = await getProduct(id);
  if (!current) return null;
  if (current.stock > 0) {
    throw new JsonDBError('PRODUCTO_CON_EXISTENCIAS', PRODUCTO_CON_EXISTENCIAS_MESSAGE);
  }

  const client = createAdminSupabaseClient();
  const row = await databaseOperation<ProductRow | null>(() =>
    client
      .from('products')
      .update({ active: false, updated_at: now() })
      .eq('id', id)
      .eq('stock', 0)
      .select('*')
      .maybeSingle(),
  );

  if (!row) {
    const latest = await getProduct(id);
    if (latest && latest.stock > 0) {
      throw new JsonDBError('PRODUCTO_CON_EXISTENCIAS', PRODUCTO_CON_EXISTENCIAS_MESSAGE);
    }
  }
  return row ? { deleted: false, deactivated: true } : null;
}
