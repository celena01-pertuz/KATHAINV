import { z } from 'zod';

const emailSchema = z
  .string()
  .trim()
  .email('Ingresa un correo válido.')
  .transform((email) => email.toLowerCase());

export const fullNameSchema = z
  .string()
  .trim()
  .min(2, 'Escribe cómo quieres que te llamemos, entre 2 y 40 letras.')
  .max(40, 'Escribe cómo quieres que te llamemos, entre 2 y 40 letras.')
  .refine((name) => !/[\u0000-\u001F\u007F-\u009F]/.test(name), {
    message: 'Escribe cómo quieres que te llamemos, entre 2 y 40 letras.',
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Ingresa tu contraseña.'),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
  fullName: fullNameSchema,
});

export const changePasswordSchema = z
  .object({
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword'],
  });

export const resetPasswordSchema = changePasswordSchema;
