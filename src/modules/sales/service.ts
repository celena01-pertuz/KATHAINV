import 'server-only';

import { createSale as createSaleRpc, listRecentSales } from './supabase-repository';
import type { CreateSaleInput, SaleRecord, SaleResult } from './types';

export async function getRecentSales(limit = 20): Promise<SaleRecord[]> {
  return listRecentSales(limit);
}

export async function createSale(
  input: CreateSaleInput,
  createdBy: string,
): Promise<SaleResult> {
  return createSaleRpc(input, createdBy);
}
