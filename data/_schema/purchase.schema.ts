import { z } from 'zod';
import { baseRecordSchema } from './base.schema';

export const purchaseRecordSchema = baseRecordSchema.extend({
  productCode: z.string().trim().min(1),
  supplierId: z.string().trim().min(1),
  quantity: z.number().int().positive().max(2147483647),
  total: z.number().finite().min(0),
  date: z.string().date(),
});

export const purchaseCreateSchema = purchaseRecordSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type PurchaseRecord = z.infer<typeof purchaseRecordSchema>;
export type PurchaseCreateData = z.infer<typeof purchaseCreateSchema>;
