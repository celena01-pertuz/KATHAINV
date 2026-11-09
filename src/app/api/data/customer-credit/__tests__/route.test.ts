import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const {
  getCustomerCreditDetailMock,
  getCustomerCreditOverviewMock,
  getServerAccessContextMock,
  recordCustomerCreditPaymentMock,
  voidCustomerCreditPaymentMock,
} = vi.hoisted(() => ({
  getCustomerCreditDetailMock: vi.fn(),
  getCustomerCreditOverviewMock: vi.fn(),
  getServerAccessContextMock: vi.fn(),
  recordCustomerCreditPaymentMock: vi.fn(),
  voidCustomerCreditPaymentMock: vi.fn(),
}));

vi.mock('@/lib/auth/server-access', () => ({
  getServerAccessContext: getServerAccessContextMock,
}));

vi.mock('@/modules/customer-credit/service', () => ({
  CustomerCreditOperationError: class CustomerCreditOperationError extends Error {
    constructor(
      message: string,
      readonly status: number,
      readonly code: string,
    ) {
      super(message);
    }
  },
  getCustomerCreditDetail: getCustomerCreditDetailMock,
  getCustomerCreditOverview: getCustomerCreditOverviewMock,
  recordCustomerCreditPayment: recordCustomerCreditPaymentMock,
  voidCustomerCreditPayment: voidCustomerCreditPaymentMock,
}));

import { GET, PATCH, POST } from '../route';

function request(url: string, method = 'GET', body?: unknown) {
  return new NextRequest(url, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

describe('/api/data/customer-credit acceso e identidad', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerAccessContextMock.mockResolvedValue({
      status: 'authorized',
      email: 'owner@example.test',
    });
  });

  it('responde 401 y 403 antes de consultar cartera o registrar abonos', async () => {
    getServerAccessContextMock.mockResolvedValueOnce({
      status: 'unauthenticated',
      email: null,
    });
    expect((await GET(request('http://localhost/api/data/customer-credit'))).status).toBe(401);

    getServerAccessContextMock.mockResolvedValueOnce({
      status: 'forbidden',
      email: 'outside@example.test',
    });
    expect(
      (
        await POST(
          request('http://localhost/api/data/customer-credit', 'POST', {
            customerId: 'customer_1',
            amount: 100,
            paymentMethod: 'efectivo',
            requestKey: '9c77dcc1-6f9c-4581-8cde-7c75d5bc9908',
          }),
        )
      ).status,
    ).toBe(403);
    expect(getCustomerCreditOverviewMock).not.toHaveBeenCalled();
    expect(recordCustomerCreditPaymentMock).not.toHaveBeenCalled();
  });

  it('usa la sesión verificada para autoría, no una identidad del navegador', async () => {
    recordCustomerCreditPaymentMock.mockResolvedValue({
      paymentId: 7,
      paidAt: '2026-11-09T12:00:00.000Z',
      amount: 1000,
    });

    const response = await POST(
      request('http://localhost/api/data/customer-credit', 'POST', {
        customerId: 'customer_1',
        amount: 1000,
        paymentMethod: 'efectivo',
        requestKey: '9c77dcc1-6f9c-4581-8cde-7c75d5bc9908',
        createdBy: 'forged@example.test',
      }),
    );

    expect(response.status).toBe(201);
    expect(recordCustomerCreditPaymentMock).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: 'customer_1', amount: 1000 }),
      'owner@example.test',
    );
    expect(JSON.stringify(recordCustomerCreditPaymentMock.mock.calls)).not.toContain(
      'forged@example.test',
    );
  });

  it('rechaza monto cero y motivo vacío', async () => {
    const invalidPayment = await POST(
      request('http://localhost/api/data/customer-credit', 'POST', {
        customerId: 'customer_1',
        amount: 0,
        paymentMethod: 'efectivo',
        requestKey: '9c77dcc1-6f9c-4581-8cde-7c75d5bc9908',
      }),
    );
    expect(invalidPayment.status).toBe(400);

    const invalidVoid = await PATCH(
      request('http://localhost/api/data/customer-credit', 'PATCH', {
        paymentId: 7,
        reason: '   ',
      }),
    );
    expect(invalidVoid.status).toBe(400);
    expect(voidCustomerCreditPaymentMock).not.toHaveBeenCalled();
  });
});
