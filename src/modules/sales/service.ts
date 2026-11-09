import 'server-only';

import { createSale as createSaleRpc, getSaleTotal, listRecentSales } from './supabase-repository';
import { resolveSalePayment } from './payment-terms';
import type { CreateSaleInput, SaleRecord, SaleResponse } from './types';

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
