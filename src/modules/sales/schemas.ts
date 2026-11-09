import { z } from 'zod';
import { CUSTOMER_CREDIT_LABELS } from '@/modules/customer-credit/labels';

const paymentMethodSchema = z.enum(['efectivo', 'transferencia', 'nequi', 'tarjeta']);

export const outOfStockProductSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  size: z.string().min(1),
  color: z.string().min(1),
});

export const saleResultSchema = z.object({
  saleId: z.number().int().positive(),
  saleNumber: z.string().min(1),
  total: z.number().finite().nonnegative(),
  outOfStock: z.array(outOfStockProductSchema),
});

export const saleResponseSchema = saleResultSchema.extend({
  treatedAsCash: z.boolean(),
});

export const createSaleSchema = z
  .object({
    customerId: z.string().trim().min(1).nullable(),
    items: z
      .array(
        z.object({
          productId: z.string().trim().min(1, 'Selecciona un producto válido.'),
          quantity: z
            .number({ invalid_type_error: 'La cantidad debe ser un número entero.' })
            .int('La cantidad debe ser un número entero.')
            .positive('La cantidad debe ser mayor que cero.')
            .max(2147483647, 'La cantidad supera el límite permitido.'),
        }),
      )
      .min(1, 'Agrega al menos un producto a la venta.'),
    paymentType: z.enum(['cash', 'credit']),
    initialPayment: z
      .number({ invalid_type_error: 'El pago inicial debe ser un número entero.' })
      .int('El pago inicial debe ser un número entero.')
      .nonnegative('El pago inicial no puede ser negativo.')
      .nullable(),
    paymentMethod: paymentMethodSchema.nullable(),
    requestKey: z.string().uuid('La clave de solicitud no es válida.'),
  })
  .superRefine((sale, context) => {
    if (new Set(sale.items.map((item) => item.productId)).size !== sale.items.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['items'],
        message: 'Cada producto debe aparecer una sola vez en la venta.',
      });
    }

    if (sale.paymentType === 'credit' && !sale.customerId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customerId'],
        message: CUSTOMER_CREDIT_LABELS.customerRequired,
      });
    }

    if (sale.paymentType === 'cash' && sale.initialPayment !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['initialPayment'],
        message: 'Una venta de contado no lleva un pago inicial separado.',
      });
    }

    if (sale.paymentType === 'credit' && sale.initialPayment === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['initialPayment'],
        message: 'Indica cuánto paga hoy en la venta a crédito.',
      });
    }

    if (
      (sale.paymentType === 'cash' ||
        (sale.paymentType === 'credit' &&
          sale.initialPayment !== null &&
          sale.initialPayment > 0)) &&
      !sale.paymentMethod
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['paymentMethod'],
        message: CUSTOMER_CREDIT_LABELS.paymentMethodRequired,
      });
    }
  });

export const saleListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const voidSaleRequestSchema = z.object({
  reason: z.string().trim().min(1, 'El motivo de anulación es obligatorio.').max(
    500,
    'El motivo no puede superar 500 caracteres.',
  ),
});

export const saleIdParamSchema = z
  .string()
  .regex(/^[1-9]\d*$/, 'La venta indicada no es válida.')
  .transform(Number)
  .refine(Number.isSafeInteger, 'La venta indicada no es válida.');

export const reactivatedSaleProductSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
});

export const voidSaleResultSchema = z.object({
  saleId: z.number().int().positive(),
  voidedAt: z.string().datetime({ offset: true }),
  voidedBy: z.string().min(1),
  voidReason: z.string().min(1).max(500),
  reactivatedProducts: z.array(reactivatedSaleProductSchema),
});

export { paymentMethodSchema };
