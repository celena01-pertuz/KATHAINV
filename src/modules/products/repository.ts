import type { BaseRecord, CollectionFile } from '@/lib/types';
import { JsonDBError, getAll, getById, query, transactCollection } from '@/lib/json-db';
import { generateId, now } from '@/lib/utils';
import { normalizeProductCode } from './code-utils';
import type { ProductCreateInput, ProductDeleteResult, ProductInput, ProductRecord } from './types';

const COLLECTION = 'product';
const INTERNAL_CODE_PREFIX = 'KAT';
type MovementRecord = BaseRecord & { productCode: string };

function duplicateCode(records: ProductRecord[], code: string, exceptId?: string): boolean {
  const normalized = normalizeProductCode(code);
  return records.some(
    (record) => record.id !== exceptId && normalizeProductCode(record.code) === normalized,
  );
}

function nextInternalSequence(collection: CollectionFile<ProductRecord>): number {
  const savedSequence = collection._meta.nextProductCodeSequence ?? 1;
  const highestExistingSequence = collection.records.reduce((highest, product) => {
    const match = /^KAT-(\d+)$/i.exec(product.code.trim());
    return match ? Math.max(highest, Number(match[1]) + 1) : highest;
  }, 1);
  return Math.max(savedSequence, highestExistingSequence);
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
  const result = await getAll<ProductRecord>(COLLECTION, { sortBy: 'name' });
  return result.data;
}

export async function getProduct(id: string): Promise<ProductRecord | null> {
  return getById<ProductRecord>(COLLECTION, id);
}

export async function findProductByCode(code: string): Promise<ProductRecord | null> {
  const normalized = normalizeProductCode(code);
  if (!normalized) return null;
  const products = await listProducts();
  return products.find((product) => normalizeProductCode(product.code) === normalized) ?? null;
}

export async function createProduct(input: ProductCreateInput): Promise<ProductRecord> {
  return transactCollection<ProductRecord, ProductRecord>(COLLECTION, (collection) => {
    let code = input.code?.trim() ?? '';
    let codeType: ProductRecord['codeType'] = 'factory';

    if (!code) {
      codeType = 'internal';
      let sequence = nextInternalSequence(collection);
      code = `${INTERNAL_CODE_PREFIX}-${String(sequence).padStart(6, '0')}`;
      while (duplicateCode(collection.records, code)) {
        sequence += 1;
        code = `${INTERNAL_CODE_PREFIX}-${String(sequence).padStart(6, '0')}`;
      }
      collection._meta.nextProductCodeSequence = sequence + 1;
    } else if (duplicateCode(collection.records, code)) {
      throw new JsonDBError('DUPLICATE_CODE', 'Ya existe un producto con ese código.');
    }

    const record: ProductRecord = {
      ...input,
      code,
      codeType,
      variantGroupId: input.variantGroupId || generateId('variant'),
      id: generateId('product'),
      createdAt: now(),
      updatedAt: now(),
    };
    collection.records.push(record);
    return { result: record, changed: true };
  });
}

export async function updateProduct(id: string, input: ProductInput): Promise<ProductRecord | null> {
  return transactCollection<ProductRecord, ProductRecord | null>(COLLECTION, async (collection) => {
    const index = collection.records.findIndex((record) => record.id === id);
    if (index < 0) return { result: null, changed: false };

    const current = collection.records[index];
    if (!current) return { result: null, changed: false };
    if (duplicateCode(collection.records, input.code, id)) {
      throw new JsonDBError('DUPLICATE_CODE', 'Ya existe un producto con ese código.');
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

    const changedCode = normalizeProductCode(current.code) !== normalizeProductCode(input.code);
    const updated: ProductRecord = {
      ...input,
      codeType: changedCode
        ? /^KAT-\d{6}$/i.test(input.code)
          ? 'internal'
          : 'factory'
        : current.codeType,
      id,
      createdAt: current.createdAt,
      updatedAt: now(),
    };
    collection.records[index] = updated;
    return { result: updated, changed: true };
  });
}

export async function removeOrDeactivateProduct(id: string): Promise<ProductDeleteResult | null> {
  return transactCollection<ProductRecord, ProductDeleteResult | null>(COLLECTION, async (collection) => {
    const index = collection.records.findIndex((record) => record.id === id);
    if (index < 0) return { result: null, changed: false };

    const product = collection.records[index];
    if (!product) return { result: null, changed: false };
    if (await productHasMovements(product.code)) {
      collection.records[index] = { ...product, active: false, updatedAt: now() };
      return { result: { deleted: false, deactivated: true }, changed: true };
    }

    collection.records.splice(index, 1);
    return { result: { deleted: true, deactivated: false }, changed: true };
  });
}
