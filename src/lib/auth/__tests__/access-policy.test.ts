import { describe, expect, it } from 'vitest';
import { canAccessInventory, isEmailAllowed } from '../access-policy';

describe('política de acceso por correo', () => {
  it('compara correos sin distinguir mayúsculas', () => {
    expect(isEmailAllowed('DUEÑA@EJEMPLO.COM', 'dueña@ejemplo.com')).toBe(true);
  });

  it('elimina espacios en el correo y en la lista', () => {
    expect(isEmailAllowed('  duena@ejemplo.com ', ' otro@ejemplo.com, duena@ejemplo.com ')).toBe(
      true,
    );
  });

  it('rechaza un correo ausente', () => {
    expect(isEmailAllowed(undefined, 'duena@ejemplo.com')).toBe(false);
    expect(isEmailAllowed(null, 'duena@ejemplo.com')).toBe(false);
  });

  it('rechaza cualquier correo cuando la lista está vacía', () => {
    expect(isEmailAllowed('duena@ejemplo.com', '')).toBe(false);
    expect(isEmailAllowed('duena@ejemplo.com', ' ,  ')).toBe(false);
    expect(isEmailAllowed('duena@ejemplo.com', undefined)).toBe(false);
  });

  it('exige confirmación del correo además de estar en la lista', () => {
    expect(canAccessInventory({ email: 'duena@ejemplo.com' }, 'duena@ejemplo.com')).toBe(false);
    expect(
      canAccessInventory(
        { email: 'duena@ejemplo.com', email_confirmed_at: '2026-10-29T00:00:00.000Z' },
        'duena@ejemplo.com',
      ),
    ).toBe(true);
  });
});
