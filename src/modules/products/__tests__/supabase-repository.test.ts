import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProductCreateInput } from '../types';

const { createAdminSupabaseClientMock } = vi.hoisted(() => ({
  createAdminSupabaseClientMock: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminSupabaseClient: createAdminSupabaseClientMock,
}));

import { createProduct, listProducts, removeOrDeactivateProduct } from '../supabase-repository';

const queryBuilder = {
  eq: vi.fn(),
  insert: vi.fn(),
  maybeSingle: vi.fn(),
  order: vi.fn(),
  select: vi.fn(),
  single: vi.fn(),
  update: vi.fn(),
};

const productRow = {
  id: 'product_1',
  code: 'KAT-000001',
  normalized_code: 'KAT-000001',
  code_type: 'internal' as const,
  variant_group_id: 'variant_1',
  name: 'Blusa',
  category: 'ropa' as const,
  size: 'M',
  color: 'Negro',
  cost_price: 30000,
  sale_price: 55000,
  stock: 5,
  min_stock: 1,
  active: true,
  created_at: '2026-10-29T10:00:00.000Z',
  updated_at: '2026-10-29T10:00:00.000Z',
};

const validInput: ProductCreateInput = {
  name: 'Blusa',
  category: 'ropa',
  size: 'M',
  color: 'Negro',
  costPrice: 30000,
  salePrice: 55000,
  stock: 5,
  minStock: 1,
  active: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  queryBuilder.eq.mockReturnValue(queryBuilder);
  queryBuilder.insert.mockReturnValue(queryBuilder);
  queryBuilder.maybeSingle.mockReturnValue(queryBuilder);
  queryBuilder.order.mockReturnValue(queryBuilder);
  queryBuilder.select.mockReturnValue(queryBuilder);
  queryBuilder.single.mockReturnValue(queryBuilder);
  queryBuilder.update.mockReturnValue(queryBuilder);
  createAdminSupabaseClientMock.mockReturnValue({
    from: vi.fn(() => queryBuilder),
  });
});

describe('repositorio Supabase de productos', () => {
  it('mapea las columnas snake_case a los campos camelCase de la aplicación', async () => {
    queryBuilder.order.mockResolvedValue({ data: [productRow], error: null });

    await expect(listProducts()).resolves.toEqual([
      {
        id: 'product_1',
        code: 'KAT-000001',
        codeType: 'internal',
        variantGroupId: 'variant_1',
        name: 'Blusa',
        category: 'ropa',
        size: 'M',
        color: 'Negro',
        costPrice: 30000,
        salePrice: 55000,
        stock: 5,
        minStock: 1,
        active: true,
        createdAt: '2026-10-29T10:00:00.000Z',
        updatedAt: '2026-10-29T10:00:00.000Z',
      },
    ]);
  });

  it('deja que la base genere el código interno si el código está vacío', async () => {
    queryBuilder.single.mockResolvedValue({ data: productRow, error: null });

    await expect(createProduct(validInput)).resolves.toMatchObject({
      code: 'KAT-000001',
      codeType: 'internal',
    });

    expect(queryBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        code: null,
        id: expect.any(String),
      }),
    );
  });

  it('traduce el error de unicidad de Postgres al conflicto conocido por la app', async () => {
    queryBuilder.single.mockResolvedValue({
      data: null,
      error: { code: '23505', message: 'detalle interno de la base' },
    });

    await expect(createProduct({ ...validInput, code: 'FAB-1' })).rejects.toMatchObject({
      code: 'DUPLICATE_CODE',
      message: 'Ya existe un producto con ese código.',
    });
  });

  it('no filtra mensajes crudos de errores de la base de datos', async () => {
    queryBuilder.single.mockResolvedValue({
      data: null,
      error: { code: 'XX000', message: 'detalle interno de la base' },
    });

    await expect(createProduct({ ...validInput, code: 'FAB-1' })).rejects.toMatchObject({
      code: 'IO_ERROR',
      message: 'No se pudo completar la operación de productos en la base de datos.',
    });
  });

  it('desactiva el producto sin intentar eliminarlo en modo Supabase', async () => {
    queryBuilder.maybeSingle.mockResolvedValue({ data: productRow, error: null });

    await expect(removeOrDeactivateProduct('product_1')).resolves.toEqual({
      deleted: false,
      deactivated: true,
    });

    expect(queryBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ active: false }),
    );
  });
});
