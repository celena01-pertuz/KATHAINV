import { z } from 'zod';
import { baseRecordSchema } from './base.schema';

export const saleRecordSchema = baseRecordSchema.extend({
  productCode: z.string(),
  quantity: z.number().int().positive(),
  total: z.number(),
  date: z.string().date(),
});

export type SaleRecord = z.infer<typeof saleRecordSchema>;
