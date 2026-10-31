import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { createSaleMock, getRecentSalesMock, getServerAccessContextMock } = vi.hoisted(() => ({
  createSaleMock: vi.fn(),
  getRecentSalesMock: vi.fn(),
  getServerAccessContextMock: vi.fn(),
}));

vi.mock('@/lib/auth/server-access', () => ({
  getServerAccessContext: getServerAccessContextMock,
}));

vi.mock('@/modules/sales/service', () => ({
  createSale: createSaleMock,
  getRecentSales: getRecentSalesMock,
}));

import { GET, POST } from '../route';

const validPayload = {
  customerId: null,
  items: [{ productId: 'product_1', quantity: 1 }],
  paymentType: 'cash',
  initialPayment: null,
  paymentMethod: 'efectivo',
  requestKey: '9c77dcc1-6f9c-4581-8cde-7c75d5bc9908',
};

function request(method: string, body?: unknown) {
  return new NextRequest('http://localhost/api/data/sales', {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

describe('/api/data/sales access and identity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerAccessContextMock.mockResolvedValue({
      status: 'unauthenticated',
      email: null,
    });
  });

  it('returns 401 without reading sales', async () => {
    const response = await GET(request('GET'));

    expect(response.status).toBe(401);
    expect(getRecentSalesMock).not.toHaveBeenCalled();
  });

  it('returns 403 for an unauthorized account without creating a sale', async () => {
    getServerAccessContextMock.mockResolvedValue({
      status: 'forbidden',
      email: 'not-allowed@example.test',
    });

    const response = await POST(request('POST', validPayload));

    expect(response.status).toBe(403);
    expect(createSaleMock).not.toHaveBeenCalled();
  });

  it('uses the authenticated server email rather than the browser payload', async () => {
    getServerAccessContextMock.mockResolvedValue({
      status: 'authorized',
      email: 'owner@example.test',
    });
    createSaleMock.mockResolvedValue({
      saleId: 5,
      saleNumber: 'V-000005',
      total: 12500,
    });

    const response = await POST(
      request('POST', { ...validPayload, createdBy: 'browser@example.test' }),
    );

    expect(response.status).toBe(201);
    expect(createSaleMock).toHaveBeenCalledWith(
      expect.objectContaining({ requestKey: validPayload.requestKey }),
      'owner@example.test',
    );
    expect(createSaleMock.mock.calls[0][0]).not.toHaveProperty('createdBy');
  });

  it('returns sanitized P0001 errors as HTTP 400', async () => {
    getServerAccessContextMock.mockResolvedValue({
      status: 'authorized',
      email: 'owner@example.test',
    });
    const { SalesOperationError } = await import('@/modules/sales/errors');
    createSaleMock.mockRejectedValue(
      new SalesOperationError('Stock insuficiente para uno o más productos.', 400, 'SALE_VALIDATION_ERROR'),
    );

    const response = await POST(request('POST', validPayload));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Stock insuficiente para uno o más productos.');
  });
});
