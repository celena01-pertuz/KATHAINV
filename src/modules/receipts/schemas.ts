import { z } from 'zod';

export const createReceiptLinkSchema = z.object({
  saleId: z.number().int().positive(),
});

export const publicReceiptSchema = z.object({
  sale_number: z.string(),
  sold_at: z.string(),
  status: z.enum(['active', 'voided']),
  payment_type: z.enum(['cash', 'credit', 'partial']),
  items: z.array(
    z.object({
      name: z.string(),
      size: z.string(),
      color: z.string(),
      quantity: z.number().int().positive(),
      unit_price: z.number().nonnegative(),
    }),
  ),
  total: z.number().nonnegative(),
  paid: z.number().nonnegative(),
  balance: z.number().nonnegative(),
});

export const saleIdSchema = z.coerce.number().int().positive();
