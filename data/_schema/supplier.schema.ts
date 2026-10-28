import { z } from 'zod';
import { baseRecordSchema } from './base.schema';

export const supplierRecordSchema = baseRecordSchema.extend({
  name: z.string(),
});

export type SupplierRecord = z.infer<typeof supplierRecordSchema>;
