import { z } from 'zod';
import { purchaseCreateSchema } from '@data/_schema/purchase.schema';
import { supplierCreateSchema } from '@data/_schema/supplier.schema';

export const createPurchaseSchema = purchaseCreateSchema;
export const createSupplierSchema = supplierCreateSchema;
export const purchaseListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
