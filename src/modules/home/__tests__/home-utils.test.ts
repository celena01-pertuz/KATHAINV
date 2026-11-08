import { describe, expect, it } from 'vitest';
import type { ProductRecord } from '@/modules/products/types';
import {
  getColombiaGreeting,
  getColombiaToday,
  getDayDescription,
  getGreetingName,
  getPreviousBogotaDate,
  getProductsToRestock,
} from '../home-utils';

function product(id: string, stock: number, minStock: number, active = true): ProductRecord {
  return {
    id,
    code: id,
    codeType: 'factory',
    variantGroupId: `group-${id}`,
    name: `Producto ${id}`,
    category: 'ropa',
    size: 'M',
    color: 'Negro',
    costPrice: 100,
    salePrice: 200,
    stock,
    minStock,
    active,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('utilidades del inicio', () => {
  it.each([
    ['2026-11-07T16:59:00.000Z', 'Buenos días'],
    ['2026-11-07T17:00:00.000Z', 'Buenas tardes'],
    ['2026-11-07T23:59:00.000Z', 'Buenas tardes'],
    ['2026-11-08T00:00:00.000Z', 'Buenas noches'],
  ])('saluda según la hora de Colombia: %s', (instant, expected) => {
    expect(getColombiaGreeting(new Date(instant))).toBe(expected);
  });

  it('prefiere el nombre de la sesión y usa solo la parte local del correo como alternativa', () => {
    expect(getGreetingName('celena pertuz', 'celena@example.com')).toBe('Celena pertuz');
    expect(getGreetingName(null, 'celena@example.com')).toBe('Celena');
    expect(getGreetingName('celena@example.com', 'celena@example.com')).toBe('Celena');
    expect(getGreetingName(null, null)).toBe('');
  });

  it('interpreta la fecha del día con la zona horaria de Colombia', () => {
    expect(getColombiaToday(new Date('2026-11-08T04:30:00.000Z'))).toBe('2026-11-07');
  });

  it('describe hoy, ayer y una fecha elegida en español', () => {
    expect(getPreviousBogotaDate('2026-11-07')).toBe('2026-11-06');
    expect(getDayDescription('2026-11-07', '2026-11-07')).toBe('Este es tu reporte de hoy');
    expect(getDayDescription('2026-11-06', '2026-11-07')).toBe('Este es tu reporte de ayer');
    expect(getDayDescription('2026-11-05', '2026-11-07')).toBe(
      'Este es tu reporte del 5 de noviembre',
    );
  });

  it('ordena agotados primero, filtra inactivos y productos fuera del mínimo y limita a cinco', () => {
    const products = [
      product('stock-2', 2, 2),
      product('empty-b', 0, 0),
      product('healthy', 8, 2),
      product('empty-a', 0, 2),
      product('stock-1', 1, 3),
      product('inactive', 0, 2, false),
      product('stock-3', 3, 3),
      product('empty-c', 0, 1),
      product('stock-4', 4, 4),
    ];

    expect(getProductsToRestock(products).map(({ id }) => id)).toEqual([
      'empty-a',
      'empty-b',
      'empty-c',
      'stock-1',
      'stock-2',
    ]);
  });
});
