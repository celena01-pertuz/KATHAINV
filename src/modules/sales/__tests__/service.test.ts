import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createSaleMock, getSaleTotalMock, listRecentSalesMock } = vi.hoisted(() => ({
  createSaleMock: vi.fn(),
  getSaleTotalMock: vi.fn(),
  listRecentSalesMock: vi.fn(),
}));

vi.mock('../supabase-repository', () => ({
  createSale: createSaleMock,
  getSaleTotal: getSaleTotalMock,
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
    getSaleTotalMock.mockResolvedValue(25000);
    createSaleMock.mockResolvedValue({
      saleId: 14,
      saleNumber: 'V-000014',
      total: 25000,
      outOfStock: [],
    });

    await expect(createSale(input, 'owner@example.test')).resolves.toEqual({
      saleId: 14,
      saleNumber: 'V-000014',
      total: 25000,
      outOfStock: [],
      treatedAsCash: false,
    });
    expect(createSaleMock).toHaveBeenCalledWith(input, 'owner@example.test');
  });

  it('mapea pago cero, un monto menor, total exacto y exceso en servidor', async () => {
    getSaleTotalMock.mockResolvedValue(25000);
    createSaleMock.mockResolvedValue({
      saleId: 15,
      saleNumber: 'V-000015',
      total: 25000,
      outOfStock: [],
    });

    await createSale(
      {
        ...input,
        customerId: 'customer_1',
        paymentType: 'credit',
        initialPayment: 0,
        paymentMethod: null,
      },
      'owner@example.test',
    );
    expect(createSaleMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ paymentType: 'credit', initialPayment: 0 }),
      'owner@example.test',
    );

    await createSale(
      {
        ...input,
        customerId: 'customer_1',
        paymentType: 'credit',
        initialPayment: 10000,
      },
      'owner@example.test',
    );
    expect(createSaleMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ paymentType: 'partial', initialPayment: 10000 }),
      'owner@example.test',
    );

    await expect(
      createSale(
        {
          ...input,
          customerId: 'customer_1',
          paymentType: 'credit',
          initialPayment: 25000,
        },
        'owner@example.test',
      ),
    ).resolves.toMatchObject({ treatedAsCash: true });
    expect(createSaleMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ paymentType: 'cash', initialPayment: null }),
      'owner@example.test',
    );

    await expect(
      createSale(
        {
          ...input,
          customerId: 'customer_1',
          paymentType: 'credit',
          initialPayment: 25001,
        },
        'owner@example.test',
      ),
    ).rejects.toMatchObject({ code: 'INITIAL_PAYMENT_EXCEEDS_TOTAL' });
  });

  it('delegates recent sales reads with the requested limit', async () => {
    listRecentSalesMock.mockResolvedValue([]);

    await expect(getRecentSales(15)).resolves.toEqual([]);
    expect(listRecentSalesMock).toHaveBeenCalledWith(15);
  });
});
