import 'server-only';

import {
  createPurchase as createPurchaseRpc,
  createSupplier as insertSupplier,
  listRecentPurchases as queryRecentPurchases,
  listSuppliers as querySuppliers,
} from './supabase-repository';
import { PurchaseOperationError } from './errors';
import type {
  PurchaseInput,
  PurchaseResult,
  RecentPurchase,
  SupplierRecord,
} from './types';

export async function listSuppliers(): Promise<SupplierRecord[]> {
  return querySuppliers();
}

export async function createSupplier(name: string): Promise<SupplierRecord> {
  try {
    return await insertSupplier(name);
  } catch (error) {
    if (error instanceof PurchaseOperationError) throw error;
    throw new PurchaseOperationError(
      'No se pudo crear el proveedor. Inténtalo más tarde.',
      500,
      'SUPPLIER_OPERATION_ERROR',
    );
  }
}

export async function getRecentPurchases(limit = 20): Promise<RecentPurchase[]> {
  return queryRecentPurchases(limit);
}

export async function createPurchase(input: PurchaseInput): Promise<PurchaseResult> {
  return createPurchaseRpc(input);
}
