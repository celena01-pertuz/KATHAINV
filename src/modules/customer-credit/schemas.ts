import { z } from 'zod';

export const creditPaymentMethodSchema = z.enum(['efectivo', 'transferencia', 'nequi', 'tarjeta']);

export const customerCreditOverviewSchema = z.object({
  customerId: z.string().min(1),
  balance: z.number().int().nonnegative(),
  oldestDebtAt: z.string().nullable(),
});

export const customerCreditSaleSchema = z.object({
  id: z.number().int().positive(),
  saleNumber: z.string().min(1),
  soldAt: z.string(),
  total: z.number().int().positive(),
  paid: z.number().int().nonnegative(),
  balance: z.number().int().positive(),
});

export const customerCreditAllocationSchema = z.object({
  saleNumber: z.string().min(1),
  amount: z.number().int().positive(),
});

export const customerCreditPaymentSchema = z.object({
  id: z.number().int().positive(),
  amount: z.number().int().positive(),
  paymentMethod: creditPaymentMethodSchema,
  paidAt: z.string(),
  note: z.string().nullable(),
  status: z.enum(['active', 'voided']),
  voidReason: z.string().nullable(),
  allocations: z.array(customerCreditAllocationSchema),
});

export const customerCreditDetailSchema = z.object({
  sales: z.array(customerCreditSaleSchema),
  payments: z.array(customerCreditPaymentSchema),
});

export const customerCreditQuerySchema = z.object({
  customerId: z.string().trim().min(1).optional(),
});

export const createCustomerCreditPaymentSchema = z.object({
  customerId: z.string().trim().min(1),
  amount: z.number().int().positive().max(2147483647),
  paymentMethod: creditPaymentMethodSchema,
  note: z.string().trim().max(500).optional(),
  requestKey: z.string().uuid(),
});

export const voidCustomerCreditPaymentSchema = z.object({
  paymentId: z.number().int().positive(),
  reason: z.string().trim().min(1).max(500),
});

export const customerCreditOverviewResponseSchema = z.array(customerCreditOverviewSchema);
export const customerCreditPaymentResponseSchema = z.object({
  paymentId: z.number().int().positive(),
  paidAt: z.string(),
  amount: z.number().int().positive(),
});
