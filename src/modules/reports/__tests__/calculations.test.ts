import { describe, expect, it } from 'vitest';
import { buildProductSalesReport } from '../calculations';

const source = {
  salesCount: 3,
  products: [
    {
      id: 'p-2',
      code: 'B-2',
      name: 'Blusa',
      size: 'M',
      color: 'Azul',
      active: true,
      unitsSold: 5,
      totalSold: 100000,
    },
    {
      id: 'p-1',
      code: 'A-1',
      name: 'Camisa',
      size: 'S',
      color: 'Rojo',
      active: true,
      unitsSold: 2,
      totalSold: 30000,
    },
    {
      id: 'p-3',
      code: 'C-3',
      name: 'Pantalón',
      size: 'L',
      color: 'Negro',
      active: true,
      unitsSold: 0,
      totalSold: 0,
    },
    {
      id: 'p-4',
      code: 'D-4',
      name: 'Producto activo sin ventas',
      size: 'Única',
      color: 'Verde',
      active: true,
      unitsSold: 0,
      totalSold: 0,
    },
  ],
};

describe('cálculos de reportes', () => {
  it('suma unidades y totales enteros del periodo', () => {
    expect(buildProductSalesReport(source).summary).toEqual({
      unitsSold: 7,
      totalSold: 130000,
      salesCount: 3,
    });
  });

  it('ordena más vendidos de mayor a menor por unidades', () => {
    expect(buildProductSalesReport(source).mostSold.map((product) => product.id)).toEqual([
      'p-2',
      'p-1',
    ]);
  });

  it('ordena menos vendidos de menor a mayor e incluye productos con cero ventas', () => {
    expect(buildProductSalesReport(source).leastSold.map((product) => product.id)).toEqual([
      'p-3',
      'p-4',
      'p-1',
      'p-2',
    ]);
  });

  it('omite productos con cero unidades en más vendidos', () => {
    const report = buildProductSalesReport(source);
    expect(report.mostSold.every((product) => product.unitsSold > 0)).toBe(true);
  });
});
