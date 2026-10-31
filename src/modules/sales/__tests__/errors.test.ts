import { describe, expect, it } from 'vitest';
import { mapCreateSaleDatabaseError } from '../errors';

describe('mapeo de errores de ventas', () => {
  it('convierte errores P0001 conocidos en mensajes 400 en español', () => {
    const error = mapCreateSaleDatabaseError({
      code: 'P0001',
      message: 'Stock insuficiente para uno o más productos.',
    });

    expect(error.status).toBe(400);
    expect(error.message).toBe('Stock insuficiente para uno o más productos.');
  });

  it('no expone detalles internos de otros errores de base de datos', () => {
    const error = mapCreateSaleDatabaseError({
      code: 'XX000',
      message: 'correo privado y detalles internos',
    });

    expect(error.status).toBe(500);
    expect(error.message).not.toContain('correo privado');
    expect(error.message).not.toContain('detalles internos');
  });

  it('no expone detalles desconocidos incluso con P0001', () => {
    const error = mapCreateSaleDatabaseError({
      code: 'P0001',
      message: 'detalle sensible inesperado',
    });

    expect(error.status).toBe(400);
    expect(error.message).not.toContain('detalle sensible');
  });
});
