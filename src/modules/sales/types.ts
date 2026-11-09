import type { z } from 'zod';
import type { createSaleSchema, outOfStockProductSchema, saleResultSchema } from './schemas';

export type SalePaymentType = 'cash' | 'credit' | 'partial';
export type SalePaymentMethod = 'efectivo' | 'transferencia' | 'nequi' | 'tarjeta';

export interface SaleRecord {
  id: number;
  saleNumber: string;
  soldAt: string;
  paymentType: SalePaymentType;
  total: number;
  status: 'active' | 'voided';
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
}

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type OutOfStockProduct = z.infer<typeof outOfStockProductSchema>;
export type SaleResult = z.infer<typeof saleResultSchema>;
