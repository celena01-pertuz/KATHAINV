import { z } from 'zod';

const emailSchema = z
  .string()
  .trim()
  .email('Ingresa un correo válido.')
  .transform((email) => email.toLowerCase());

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Ingresa tu contraseña.'),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
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
