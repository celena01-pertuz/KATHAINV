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

  it('traduce errores internos de fiado y pago parcial al vocabulario visible actual', () => {
    const creditError = mapCreateSaleDatabaseError({
      code: 'P0001',
      message: 'Se necesita un cliente registrado para fiar o pagar parcialmente.',
    });
    const partialError = mapCreateSaleDatabaseError({
      code: 'P0001',
      message: 'El pago parcial debe ser mayor que cero y menor que el total.',
    });

    expect(creditError.message).toBe('Selecciona un cliente para registrar una venta a crédito.');
    expect(partialError.message).toBe('El pago de hoy debe ser mayor que cero y menor que el total.');
  });
});
