import { describe, expect, it } from 'vitest';
import { createSaleSchema } from '../schemas';

const validSale = {
  customerId: null,
  items: [{ productId: 'product_1', quantity: 1 }],
  paymentType: 'cash',
  initialPayment: null,
  paymentMethod: 'efectivo',
  requestKey: '9c77dcc1-6f9c-4581-8cde-7c75d5bc9908',
};

describe('validación de ventas', () => {
  it('acepta contado sin cliente y exige clave UUID', () => {
    expect(createSaleSchema.safeParse(validSale).success).toBe(true);
    expect(
      createSaleSchema.safeParse({ ...validSale, requestKey: 'clave-no-uuid' }).success,
    ).toBe(false);
  });

  it('exige cliente y pago inicial positivo para pago parcial', () => {
    expect(
      createSaleSchema.safeParse({
        ...validSale,
        customerId: 'customer_1',
        paymentType: 'partial',
        initialPayment: 100,
      }).success,
    ).toBe(true);
    expect(
      createSaleSchema.safeParse({
        ...validSale,
        customerId: null,
        paymentType: 'partial',
        initialPayment: 0,
      }).success,
    ).toBe(false);
  });

  it('rechaza fiado sin cliente o con pago inicial', () => {
    expect(
      createSaleSchema.safeParse({
        ...validSale,
        paymentType: 'credit',
        initialPayment: 0,
        paymentMethod: null,
      }).success,
    ).toBe(false);
    expect(
      createSaleSchema.safeParse({
        ...validSale,
        customerId: 'customer_1',
        paymentType: 'credit',
        initialPayment: 1,
        paymentMethod: null,
      }).success,
    ).toBe(false);
  });

  it('rechaza cantidades no enteras o no positivas', () => {
    expect(
      createSaleSchema.safeParse({
        ...validSale,
        items: [{ productId: 'product_1', quantity: 0 }],
      }).success,
    ).toBe(false);
    expect(
      createSaleSchema.safeParse({
        ...validSale,
        items: [{ productId: 'product_1', quantity: 1.5 }],
      }).success,
    ).toBe(false);
  });
});
