import { z } from 'zod';
import { baseRecordSchema } from './base.schema';

const productFieldsSchema = z.object({
  code: z.string().trim().min(1),
  codeType: z.enum(['internal', 'factory']),
  variantGroupId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  category: z.enum(['ropa', 'calzado', 'bolso', 'accesorio']),
  size: z.string().trim(),
  color: z.string().trim(),
  costPrice: z.number().int().min(0),
  salePrice: z.number().int().positive(),
  stock: z.number().int().min(0),
  minStock: z.number().int().min(0),
  active: z.boolean(),
});

function validateProductSize(
  product: Pick<z.infer<typeof productFieldsSchema>, 'category' | 'size' | 'color'>,
  context: z.RefinementCtx,
) {
  if (product.category === 'ropa' || product.category === 'calzado') {
    if (!product.size) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La talla es obligatoria para ropa y calzado.',
        path: ['size'],
      });
    }
    if (!product.color) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El color es obligatorio para ropa y calzado.',
        path: ['color'],
      });
    }
  }
}

export const productRecordSchema = baseRecordSchema
  .extend(productFieldsSchema.shape)
  .superRefine(validateProductSize);

export const productCreateSchema = productFieldsSchema
  .omit({ code: true, codeType: true, variantGroupId: true })
  .extend({
    code: z.string().trim().optional(),
    variantGroupId: z.string().trim().min(1).optional(),
  })
  .superRefine(validateProductSize);

export type ProductRecord = z.infer<typeof productRecordSchema>;
export type ProductCreateData = z.infer<typeof productCreateSchema>;
