import { z } from 'zod';
import { CUSTOMER_DATA_NOTICE_VERSION } from './consent-notice';
import { normalizeColombianPhone } from './phone-utils';

export const customerPhoneSchema = z.string().trim().transform((value, context) => {
  const normalized = normalizeColombianPhone(value);
  if (!normalized) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Ingresa un celular colombiano válido de 10 dígitos.',
    });
    return z.NEVER;
  }
  return normalized;
});

const customerFieldsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'El nombre es obligatorio.')
    .max(120, 'El nombre es demasiado largo.'),
  phone: customerPhoneSchema,
  document: z
    .string()
    .trim()
    .max(80, 'El documento es demasiado largo.')
    .transform((value) => value || null),
});

export const customerCreateSchema = customerFieldsSchema.extend({
  authorization: z.object({
    accepted: z.literal(true, {
      errorMap: () => ({ message: 'Debes registrar la autorización de tratamiento de datos.' }),
    }),
    noticeVersion: z.literal(CUSTOMER_DATA_NOTICE_VERSION),
    source: z.enum(['registro presencial', 'formulario']),
  }),
});

export const customerUpdateSchema = customerFieldsSchema.extend({
  id: z.string().trim().min(1, 'No se encontró el cliente.'),
});

export const customerStatusSchema = z.object({
  id: z.string().trim().min(1, 'No se encontró el cliente.'),
  active: z.boolean(),
});

export const customerSearchSchema = z.string().trim().max(120);
