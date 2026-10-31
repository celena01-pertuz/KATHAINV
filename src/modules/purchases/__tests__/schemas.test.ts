import { describe, expect, it } from 'vitest';
import { createPurchaseSchema, createSupplierSchema } from '../schemas';

const validPurchase = {
  productCode: 'KAT-000001',
  supplierId: 'supplier_1',
  quantity: 3,
  total: 25000.5,
  date: '2026-10-31',
};

describe('esquemas de compras', () => {
  it('acepta una compra con cantidad positiva y total decimal no negativo', () => {
    expect(createPurchaseSchema.safeParse(validPurchase).success).toBe(true);
    expect(createPurchaseSchema.safeParse({ ...validPurchase, total: 0 }).success).toBe(true);
  });

  it.each([0, -1, 1.5])('rechaza la cantidad inválida %s', (quantity) => {
    expect(createPurchaseSchema.safeParse({ ...validPurchase, quantity }).success).toBe(false);
  });

  it('rechaza totales negativos y fechas inválidas', () => {
    expect(createPurchaseSchema.safeParse({ ...validPurchase, total: -1 }).success).toBe(false);
    expect(createPurchaseSchema.safeParse({ ...validPurchase, date: '2026-02-31' }).success).toBe(false);
  });

  it('exige el nombre del proveedor', () => {
    expect(createSupplierSchema.safeParse({ name: '  Proveedor Uno  ' })).toMatchObject({
      success: true,
      data: { name: 'Proveedor Uno' },
    });
    expect(createSupplierSchema.safeParse({ name: '   ' }).success).toBe(false);
  });
});
