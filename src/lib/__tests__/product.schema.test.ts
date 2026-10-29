import { describe, expect, it } from 'vitest';
import { productRecordSchema } from '../../../data/_schema/product.schema';

const validProduct = {
  id: 'product_001',
  createdAt: '2026-10-28T00:00:00.000Z',
  updatedAt: '2026-10-28T00:00:00.000Z',
  code: 'KAT-001',
  codeType: 'internal',
  variantGroupId: 'variant_001',
  name: 'Blusa',
  category: 'ropa',
  size: 'M',
  color: 'Negro',
  costPrice: 15000,
  salePrice: 25000,
  stock: 5,
  minStock: 1,
  active: true,
};

describe('productRecordSchema', () => {
  it('rechaza un producto con precio de venta negativo', () => {
    const result = productRecordSchema.safeParse({ ...validProduct, salePrice: -1 });

    expect(result.success).toBe(false);
  });

  it('rechaza un producto con código vacío', () => {
    const result = productRecordSchema.safeParse({ ...validProduct, code: '' });

    expect(result.success).toBe(false);
  });
});
