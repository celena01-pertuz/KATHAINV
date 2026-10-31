import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createSaleMock, listRecentSalesMock } = vi.hoisted(() => ({
  createSaleMock: vi.fn(),
  listRecentSalesMock: vi.fn(),
}));

vi.mock('../supabase-repository', () => ({
  createSale: createSaleMock,
  listRecentSales: listRecentSalesMock,
}));

import { createSale, getRecentSales } from '../service';

const input = {
  customerId: null,
  items: [{ productId: 'product_1', quantity: 1 }],
  paymentType: 'cash' as const,
  initialPayment: null,
  paymentMethod: 'efectivo' as const,
  requestKey: '9c77dcc1-6f9c-4581-8cde-7c75d5bc9908',
};

describe('servicio de ventas', () => {
  beforeEach(() => vi.clearAllMocks());

  it('delegates sale creation with server-provided creator email', async () => {
    createSaleMock.mockResolvedValue({
      saleId: 14,
      saleNumber: 'V-000014',
      total: 25000,
    });

    await expect(createSale(input, 'owner@example.test')).resolves.toEqual({
      saleId: 14,
      saleNumber: 'V-000014',
      total: 25000,
    });
    expect(createSaleMock).toHaveBeenCalledWith(input, 'owner@example.test');
  });

  it('delegates recent sales reads with the requested limit', async () => {
    listRecentSalesMock.mockResolvedValue([]);

    await expect(getRecentSales(15)).resolves.toEqual([]);
    expect(listRecentSalesMock).toHaveBeenCalledWith(15);
  });
});
