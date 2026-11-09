import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createAdminSupabaseClientMock, fromMock, rpcMock } = vi.hoisted(() => ({
  createAdminSupabaseClientMock: vi.fn(),
  fromMock: vi.fn(),
  rpcMock: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminSupabaseClient: createAdminSupabaseClientMock,
}));

import { createSale, listRecentSales } from '../supabase-repository';

const createSaleInput = {
  customerId: null,
  items: [{ productId: 'product_1', quantity: 2 }],
  paymentType: 'cash' as const,
  initialPayment: null,
  paymentMethod: 'efectivo' as const,
  requestKey: '9c77dcc1-6f9c-4581-8cde-7c75d5bc9908',
};

function prepareProductStockRead(data: unknown, error: { message: string } | null = null) {
  const inMock = vi.fn().mockResolvedValue({ data, error });
  const selectMock = vi.fn().mockReturnValue({ in: inMock });
  fromMock.mockReturnValue({ select: selectMock });
  return { selectMock, inMock };
}

function stockRow(id: string, stock: number) {
  return {
    id,
    code: `KAT-${id}`,
    name: `Producto ${id}`,
    size: 'M',
    color: 'Azul',
    stock,
  };
}

describe('repositorio Supabase de ventas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createAdminSupabaseClientMock.mockReturnValue({
      from: fromMock,
      rpc: rpcMock,
    });
  });

  it('registra la venta y agrega el producto que quedó agotado', async () => {
    rpcMock.mockResolvedValue({
      data: [{ sale_id: 8, sale_number: 'V-000008', total: 25000 }],
      error: null,
    });
    const { selectMock, inMock } = prepareProductStockRead([stockRow('product_1', 0)]);

    await expect(createSale(createSaleInput, 'owner@example.test')).resolves.toEqual({
      saleId: 8,
      saleNumber: 'V-000008',
      total: 25000,
      outOfStock: [
        {
          id: 'product_1',
          code: 'KAT-product_1',
          name: 'Producto product_1',
          size: 'M',
          color: 'Azul',
        },
      ],
    });
    expect(rpcMock).toHaveBeenCalledWith('create_sale', {
      p_customer_id: null,
      p_items: createSaleInput.items.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
      })),
      p_payment_type: 'cash',
      p_initial_payment: null,
      p_payment_method: 'efectivo',
      p_request_key: createSaleInput.requestKey,
      p_created_by: 'owner@example.test',
    });
    expect(fromMock).toHaveBeenCalledWith('products');
    expect(selectMock).toHaveBeenCalledWith('id, code, name, size, color, stock');
    expect(inMock).toHaveBeenCalledWith('id', ['product_1']);
  });

  it('devuelve una lista vacía si ningún producto vendido está agotado', async () => {
    rpcMock.mockResolvedValue({
      data: [{ sale_id: 8, sale_number: 'V-000008', total: 25000 }],
      error: null,
    });
    prepareProductStockRead([stockRow('product_1', 3)]);

    await expect(createSale(createSaleInput, 'owner@example.test')).resolves.toMatchObject({
      outOfStock: [],
    });
  });

  it('incluye únicamente la línea agotada en ventas con varios productos', async () => {
    rpcMock.mockResolvedValue({
      data: [{ sale_id: 8, sale_number: 'V-000008', total: 35000 }],
      error: null,
    });
    prepareProductStockRead([
      stockRow('product_1', 4),
      stockRow('product_2', 0),
      stockRow('product_3', 1),
    ]);

    await expect(
      createSale(
        {
          ...createSaleInput,
          items: [
            { productId: 'product_1', quantity: 1 },
            { productId: 'product_2', quantity: 1 },
            { productId: 'product_3', quantity: 1 },
          ],
        },
        'owner@example.test',
      ),
    ).resolves.toMatchObject({
      outOfStock: [
        {
          id: 'product_2',
          code: 'KAT-product_2',
          name: 'Producto product_2',
          size: 'M',
          color: 'Azul',
        },
      ],
    });
  });

  it('mantiene el éxito de la venta si falla la lectura del stock', async () => {
    rpcMock.mockResolvedValue({
      data: [{ sale_id: 8, sale_number: 'V-000008', total: 25000 }],
      error: null,
    });
    prepareProductStockRead(null, { message: 'database error' });
    const logError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(createSale(createSaleInput, 'owner@example.test')).resolves.toEqual({
      saleId: 8,
      saleNumber: 'V-000008',
      total: 25000,
      outOfStock: [],
    });
    expect(logError).toHaveBeenCalledWith(
      '[Ventas] No se pudo leer el stock actual para el aviso de agotados.',
    );
    expect(logError.mock.calls.flat().join(' ')).not.toContain(createSaleInput.requestKey);
  });

  it('vuelve a consultar el stock actual al reintentar con la misma clave', async () => {
    rpcMock.mockResolvedValue({
      data: [{ sale_id: 8, sale_number: 'V-000008', total: 25000 }],
      error: null,
    });
    const { inMock } = prepareProductStockRead([stockRow('product_1', 0)]);

    await createSale(createSaleInput, 'owner@example.test');

    expect(inMock).toHaveBeenCalledWith('id', ['product_1']);
    expect(rpcMock).toHaveBeenCalledWith(
      'create_sale',
      expect.objectContaining({ p_request_key: createSaleInput.requestKey }),
    );
  });

  it('lee ventas con SELECT y mapea el cliente relacionado', async () => {
    const limitMock = vi.fn().mockResolvedValue({
      data: [
        {
          id: 8,
          sale_number: 'V-000008',
          sold_at: '2026-10-30T12:00:00.000Z',
          payment_type: 'credit',
          total: 25000,
          status: 'active',
          customer_id: 'customer_1',
          customer: { name: 'Cliente de prueba', phone: '573001112233' },
        },
      ],
      error: null,
    });
    const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
    const selectMock = vi.fn().mockReturnValue({ order: orderMock });
    fromMock.mockReturnValue({ select: selectMock });

    await expect(listRecentSales(10)).resolves.toEqual([
      {
        id: 8,
        saleNumber: 'V-000008',
        soldAt: '2026-10-30T12:00:00.000Z',
        paymentType: 'credit',
        total: 25000,
        status: 'active',
        customerId: 'customer_1',
        customerName: 'Cliente de prueba',
        customerPhone: '573001112233',
      },
    ]);
    expect(fromMock).toHaveBeenCalledWith('sales');
    expect(selectMock).toHaveBeenCalledWith(
      'id, sale_number, sold_at, payment_type, total, status, customer_id, customer:customers(name, phone)',
    );
    expect(orderMock).toHaveBeenCalledWith('sold_at', { ascending: false });
    expect(limitMock).toHaveBeenCalledWith(10);
  });
});
