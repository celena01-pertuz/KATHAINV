import { z } from 'zod';

const paymentMethodSchema = z.enum(['efectivo', 'transferencia', 'nequi', 'tarjeta']);

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
    paymentType: z.enum(['cash', 'credit', 'partial']),
    initialPayment: z
      .number({ invalid_type_error: 'El pago inicial debe ser un número entero.' })
      .int('El pago inicial debe ser un número entero.')
      .nonnegative('El pago inicial no puede ser negativo.')
      .nullable(),
    paymentMethod: paymentMethodSchema.nullable(),
    requestKey: z.string().uuid('La clave de solicitud no es válida.'),
  })
  .superRefine((sale, context) => {
    if (sale.paymentType !== 'cash' && !sale.customerId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customerId'],
        message: 'Selecciona un cliente para fiar o registrar un pago parcial.',
      });
    }

    if (sale.paymentType === 'partial' && (!sale.initialPayment || sale.initialPayment <= 0)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['initialPayment'],
        message: 'El pago parcial debe ser mayor que cero.',
      });
    }

    if (sale.paymentType === 'credit' && sale.initialPayment !== 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['initialPayment'],
        message: 'Una venta fiada no puede incluir un pago inicial.',
      });
    }

    if (
      (sale.paymentType === 'cash' || sale.paymentType === 'partial') &&
      !sale.paymentMethod
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['paymentMethod'],
        message: 'Selecciona el método de pago.',
      });
    }
  });

export const saleListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export { paymentMethodSchema };
