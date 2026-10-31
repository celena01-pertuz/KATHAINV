import 'server-only';

import { generateId } from '@/lib/utils';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { mapPurchaseDatabaseError, PurchaseOperationError } from './errors';
import type {
  PurchaseInput,
  PurchaseResult,
  RecentPurchase,
  SupplierRecord,
} from './types';

interface SupplierRow {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface PurchaseRpcRow {
  purchase_id: number;
  product_code: string;
  product_name: string;
  supplier_id: string;
  quantity: number;
  total: number;
  date: string;
  new_stock: number;
  created_at: string;
  updated_at: string;
}

interface RecentPurchaseRow {
  id: number;
  product_code: string;
  supplier_id: string;
  quantity: number;
  total: number;
  date: string;
  created_at: string;
  updated_at: string;
  supplier: { name: string } | { name: string }[] | null;
  product: { name: string } | { name: string }[] | null;
}

function mapSupplier(row: SupplierRow): SupplierRecord {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRecentPurchase(row: RecentPurchaseRow): RecentPurchase {
  const supplier = Array.isArray(row.supplier) ? row.supplier[0] : row.supplier;
  const product = Array.isArray(row.product) ? row.product[0] : row.product;
  return {
    id: String(row.id),
    productCode: row.product_code,
    supplierId: row.supplier_id,
    quantity: row.quantity,
    total: Number(row.total),
    date: row.date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    supplierName: supplier?.name ?? 'Proveedor no disponible',
    productName: product?.name ?? row.product_code,
  };
}

export async function listSuppliers(): Promise<SupplierRecord[]> {
  const client = createAdminSupabaseClient();
  const { data, error } = await client
    .from('suppliers')
    .select('id, name, created_at, updated_at')
    .order('name', { ascending: true });

  if (error) {
    throw new PurchaseOperationError(
      'No se pudieron consultar los proveedores.',
      500,
      'SUPPLIER_READ_ERROR',
    );
  }
  return (data as SupplierRow[]).map(mapSupplier);
}

export async function createSupplier(name: string): Promise<SupplierRecord> {
  const client = createAdminSupabaseClient();
  const { data, error } = await client
    .from('suppliers')
    .insert({ id: generateId('supplier'), name: name.trim() })
    .select('id, name, created_at, updated_at')
    .single();

  if (error) throw mapPurchaseDatabaseError(error);
  if (!data) {
    throw new PurchaseOperationError(
      'No se pudo crear el proveedor.',
      500,
      'SUPPLIER_OPERATION_ERROR',
    );
  }
  return mapSupplier(data as SupplierRow);
}

export async function listRecentPurchases(limit = 20): Promise<RecentPurchase[]> {
  const client = createAdminSupabaseClient();
  const { data, error } = await client
    .from('purchases')
    .select(
      'id, product_code, supplier_id, quantity, total, date, created_at, updated_at, supplier:suppliers(name), product:products(name)',
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new PurchaseOperationError(
      'No se pudieron consultar las compras recientes.',
      500,
      'PURCHASE_READ_ERROR',
    );
  }
  return (data as RecentPurchaseRow[]).map(mapRecentPurchase);
}

export async function createPurchase(input: PurchaseInput): Promise<PurchaseResult> {
  const client = createAdminSupabaseClient();
  const { data, error } = await client.rpc('create_purchase', {
    p_product_code: input.productCode,
    p_supplier_id: input.supplierId,
    p_quantity: input.quantity,
    p_total: input.total,
    p_date: input.date,
  });

  if (error) throw mapPurchaseDatabaseError(error);
  const row = (data as PurchaseRpcRow[] | null)?.[0];
  if (!row) {
    throw new PurchaseOperationError(
      'No se pudo completar la compra. Inténtalo más tarde.',
      500,
      'PURCHASE_OPERATION_ERROR',
    );
  }

  return {
    id: String(row.purchase_id),
    productCode: row.product_code,
    supplierId: row.supplier_id,
    quantity: row.quantity,
    total: Number(row.total),
    date: row.date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    productName: row.product_name,
    newStock: row.new_stock,
  };
}
