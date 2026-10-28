import { describe, expect, it } from 'vitest';
import { productRecordSchema } from '../../../data/_schema/product.schema';

const validProduct = {
  id: 'product_001',
  createdAt: '2026-10-28T00:00:00.000Z',
  updatedAt: '2026-10-28T00:00:00.000Z',
  code: 'KAT-001',
  name: 'Blusa',
  category: 'ropa',
  size: 'M',
  color: 'Negro',
  price: 25000,
  stock: 5,
};

describe('productRecordSchema', () => {
  it('rechaza un producto con precio negativo', () => {
    const result = productRecordSchema.safeParse({ ...validProduct, price: -1 });

    expect(result.success).toBe(false);
  });

  it('rechaza un producto con código vacío', () => {
    const result = productRecordSchema.safeParse({ ...validProduct, code: '' });

    expect(result.success).toBe(false);
  });
});
