import type { ZodSchema } from 'zod';
import { exampleRecordSchema } from './example.schema';
import { productRecordSchema } from './product.schema';
import { supplierRecordSchema } from './supplier.schema';
import { purchaseRecordSchema } from './purchase.schema';
import { saleRecordSchema } from './sale.schema';

export const schemaRegistry: Record<string, ZodSchema> = {
  example: exampleRecordSchema,
  tmp_example: exampleRecordSchema,
  product: productRecordSchema,
  supplier: supplierRecordSchema,
  purchase: purchaseRecordSchema,
  sale: saleRecordSchema,
};

export function getSchema(collection: string): ZodSchema | null {
  const normalized = collection.replace(/\.json$/i, '').trim();
  return schemaRegistry[normalized] ?? null;
}
