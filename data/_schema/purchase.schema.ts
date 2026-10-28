import { z } from 'zod';
import { baseRecordSchema } from './base.schema';

export const purchaseRecordSchema = baseRecordSchema.extend({
  productCode: z.string(),
  supplierId: z.string(),
  quantity: z.number().int().positive(),
  total: z.number(),
  date: z.string().date(),
});

export type PurchaseRecord = z.infer<typeof purchaseRecordSchema>;
