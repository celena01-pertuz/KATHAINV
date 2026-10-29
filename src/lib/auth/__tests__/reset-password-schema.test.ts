import { describe, expect, it } from 'vitest';
import { resetPasswordSchema } from '../schemas';

describe('validación del restablecimiento de contraseña', () => {
  it('acepta contraseñas de al menos 8 caracteres cuando coinciden', () => {
    expect(
      resetPasswordSchema.safeParse({
        password: 'clave123',
        confirmPassword: 'clave123',
      }).success,
    ).toBe(true);
  });

  it('rechaza contraseñas con menos de 8 caracteres', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'corta',
      confirmPassword: 'corta',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.password).toContain(
        'La contraseña debe tener al menos 8 caracteres.',
      );
    }
  });

  it('rechaza la confirmación cuando no coincide', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'clave-segura',
      confirmPassword: 'otra-clave',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.confirmPassword).toContain(
        'Las contraseñas no coinciden.',
      );
    }
  });
});
