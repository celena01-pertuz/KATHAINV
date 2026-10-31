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

describe('repositorio Supabase de ventas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createAdminSupabaseClientMock.mockReturnValue({
      from: fromMock,
      rpc: rpcMock,
    });
  });

  it('registra una venta únicamente llamando al RPC create_sale', async () => {
    rpcMock.mockResolvedValue({
      data: [{ sale_id: 8, sale_number: 'V-000008', total: 25000 }],
      error: null,
    });
    const input = {
      customerId: null,
      items: [{ productId: 'product_1', quantity: 2 }],
      paymentType: 'cash' as const,
      initialPayment: null,
      paymentMethod: 'efectivo' as const,
      requestKey: '9c77dcc1-6f9c-4581-8cde-7c75d5bc9908',
    };

    await expect(createSale(input, 'owner@example.test')).resolves.toEqual({
      saleId: 8,
      saleNumber: 'V-000008',
      total: 25000,
    });
    expect(rpcMock).toHaveBeenCalledWith('create_sale', {
      p_customer_id: null,
      p_items: [{ product_id: 'product_1', quantity: 2 }],
      p_payment_type: 'cash',
      p_initial_payment: null,
      p_payment_method: 'efectivo',
      p_request_key: input.requestKey,
      p_created_by: 'owner@example.test',
    });
    expect(fromMock).not.toHaveBeenCalled();
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
          customer: { name: 'Cliente de prueba' },
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
      },
    ]);
    expect(fromMock).toHaveBeenCalledWith('sales');
    expect(selectMock).toHaveBeenCalledWith(
      'id, sale_number, sold_at, payment_type, total, status, customer_id, customer:customers(name)',
    );
    expect(orderMock).toHaveBeenCalledWith('sold_at', { ascending: false });
    expect(limitMock).toHaveBeenCalledWith(10);
  });
});
