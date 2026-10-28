import { z } from 'zod';
import { baseRecordSchema } from './base.schema';

export const productRecordSchema = baseRecordSchema.extend({
  code: z.string().trim().min(1),
  name: z.string(),
  category: z.enum(['ropa', 'calzado', 'bolso', 'accesorio']),
  size: z.string(),
  color: z.string(),
  price: z.number().positive(),
  stock: z.number().int().min(0),
});

export type ProductRecord = z.infer<typeof productRecordSchema>;
