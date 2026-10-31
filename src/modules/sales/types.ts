import type { z } from 'zod';
import type { createSaleSchema } from './schemas';

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

export interface SaleResult {
  saleId: number;
  saleNumber: string;
  total: number;
}

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
