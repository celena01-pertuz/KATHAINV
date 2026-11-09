import 'server-only';

import {
  createSale as createSaleRpc,
  getSaleTotal,
  listRecentSales,
  voidSale as voidSaleRpc,
} from './supabase-repository';
import { resolveSalePayment } from './payment-terms';
import type { CreateSaleInput, SaleRecord, SaleResponse, VoidSaleResult } from './types';

export async function getRecentSales(limit = 20): Promise<SaleRecord[]> {
  return listRecentSales(limit);
}

export async function createSale(input: CreateSaleInput, createdBy: string): Promise<SaleResponse> {
  const total = await getSaleTotal(input);
  const payment = resolveSalePayment(input, input.customerId, total);
  const sale = await createSaleRpc(
    {
      ...input,
      paymentType: payment.paymentType,
      initialPayment: payment.initialPayment,
      paymentMethod: payment.paymentMethod,
    },
    createdBy,
  );
  return { ...sale, treatedAsCash: payment.treatedAsCash };
}

export async function voidSale(
  saleId: number,
  reason: string,
  voidedBy: string,
): Promise<VoidSaleResult> {
  return voidSaleRpc(saleId, reason, voidedBy);
}
