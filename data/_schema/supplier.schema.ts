import { z } from 'zod';
import { baseRecordSchema } from './base.schema';

export const supplierRecordSchema = baseRecordSchema.extend({
  name: z.string().trim().min(1),
});

export const supplierCreateSchema = supplierRecordSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type SupplierRecord = z.infer<typeof supplierRecordSchema>;
export type SupplierCreateData = z.infer<typeof supplierCreateSchema>;
