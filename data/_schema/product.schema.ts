import { z } from 'zod';
import { baseRecordSchema } from './base.schema';

const productFieldsSchema = z.object({
  code: z.string().trim().min(1),
  codeType: z.enum(['internal', 'factory']),
  variantGroupId: z.string().trim().min(1),
  name: z.string().trim().min(1, 'El nombre del producto es obligatorio.'),
  category: z.enum(['ropa', 'calzado', 'bolso', 'accesorio']),
  size: z.string().trim().min(1, 'La talla es obligatoria.'),
  color: z.string().trim().min(1, 'El color es obligatorio.'),
  costPrice: z.number().int().min(0),
  salePrice: z.number().int().positive(),
  stock: z.number().int().min(0),
  minStock: z.number().int().min(0),
  active: z.boolean(),
});

export const productRecordSchema = baseRecordSchema.extend(productFieldsSchema.shape);

export const productCreateSchema = productFieldsSchema
  .omit({ code: true, codeType: true, variantGroupId: true })
  .extend({
    code: z.string().trim().optional(),
    variantGroupId: z.string().trim().min(1).optional(),
  });

export type ProductRecord = z.infer<typeof productRecordSchema>;
export type ProductCreateData = z.infer<typeof productCreateSchema>;
