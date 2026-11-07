import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createAdminSupabaseClientMock, fromMock, rpcMock } = vi.hoisted(() => ({
  createAdminSupabaseClientMock: vi.fn(),
  fromMock: vi.fn(),
  rpcMock: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminSupabaseClient: createAdminSupabaseClientMock,
}));

import {
  createPurchase,
  createSupplier,
  listRecentPurchases,
  listSuppliers,
} from '../supabase-repository';

const input = {
  productCode: 'KAT-000001',
  supplierId: 'supplier_1',
  quantity: 3,
  total: 25000.5,
  date: '2026-10-31',
};

beforeEach(() => {
  vi.clearAllMocks();
  createAdminSupabaseClientMock.mockReturnValue({ from: fromMock, rpc: rpcMock });
});

describe('repositorio Supabase de compras', () => {
  it('guarda compra y aumento de stock mediante una sola llamada RPC transaccional', async () => {
    rpcMock.mockResolvedValue({
      data: [
        {
          purchase_id: 14,
          product_code: 'KAT-000001',
          product_name: 'Blusa azul',
          supplier_id: 'supplier_1',
          quantity: 3,
          total: 25000.5,
          date: '2026-10-31',
          new_stock: 8,
          created_at: '2026-10-31T12:00:00.000Z',
          updated_at: '2026-10-31T12:00:00.000Z',
        },
      ],
      error: null,
    });

    await expect(createPurchase(input)).resolves.toMatchObject({
      id: '14',
      productName: 'Blusa azul',
      quantity: 3,
      total: 25000.5,
      newStock: 8,
    });
    expect(rpcMock).toHaveBeenCalledWith('create_purchase', {
      p_product_code: input.productCode,
      p_supplier_id: input.supplierId,
      p_quantity: input.quantity,
      p_total: input.total,
      p_date: input.date,
    });
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('rechaza el código de un producto inexistente con un error claro', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { code: 'P0001', message: 'No se encontró un producto con ese código.' },
    });

    await expect(createPurchase(input)).rejects.toMatchObject({
      message: 'No se encontró un producto con ese código.',
      status: 404,
    });
  });

  it('rechaza el nombre duplicado comunicado por la restricción única de Supabase', async () => {
    const query = {
      insert: vi.fn(),
      select: vi.fn(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'duplicate key' },
      }),
    };
    query.insert.mockReturnValue(query);
    query.select.mockReturnValue(query);
    fromMock.mockReturnValue(query);

    await expect(createSupplier('proveedor uno')).rejects.toMatchObject({
      message: 'Ya existe un proveedor con ese nombre.',
      status: 409,
    });
  });

  it('lee la lista de proveedores', async () => {
    const query = {
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'supplier_1',
            name: 'Proveedor Uno',
            created_at: '2026-10-31T12:00:00.000Z',
            updated_at: '2026-10-31T12:00:00.000Z',
          },
        ],
        error: null,
      }),
      select: vi.fn(),
    };
    query.select.mockReturnValue(query);
    fromMock.mockReturnValue(query);

    await expect(listSuppliers()).resolves.toMatchObject([{ id: 'supplier_1', name: 'Proveedor Uno' }]);
  });

  it('lee las compras recientes con los nombres relacionados', async () => {
    const query = {
      limit: vi.fn().mockResolvedValue({
        data: [
          {
            id: 5,
            product_code: 'KAT-000001',
            supplier_id: 'supplier_1',
            quantity: 2,
            total: '12000.50',
            date: '2026-10-31',
            created_at: '2026-10-31T12:00:00.000Z',
            updated_at: '2026-10-31T12:00:00.000Z',
            supplier: { name: 'Proveedor Uno' },
            product: { name: 'Blusa azul' },
          },
        ],
        error: null,
      }),
      order: vi.fn(),
      select: vi.fn(),
    };
    query.order.mockReturnValue(query);
    query.select.mockReturnValue(query);
    fromMock.mockReturnValue(query);

    await expect(listRecentPurchases(10)).resolves.toMatchObject([
      {
        id: '5',
        productName: 'Blusa azul',
        supplierName: 'Proveedor Uno',
        quantity: 2,
        total: 12000.5,
      },
    ]);
  });
});
