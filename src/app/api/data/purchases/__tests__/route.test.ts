import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const {
  authorizePurchaseRequestMock,
  createPurchaseMock,
  getRecentPurchasesMock,
} = vi.hoisted(() => ({
  authorizePurchaseRequestMock: vi.fn(),
  createPurchaseMock: vi.fn(),
  getRecentPurchasesMock: vi.fn(),
}));

vi.mock('@/modules/purchases/api-access', () => ({
  authorizePurchaseRequest: authorizePurchaseRequestMock,
}));
vi.mock('@/modules/purchases/service', () => ({
  createPurchase: createPurchaseMock,
  getRecentPurchases: getRecentPurchasesMock,
}));

import { GET, POST } from '../route';

const validPayload = {
  productCode: 'KAT-000001',
  supplierId: 'supplier_1',
  quantity: 2,
  total: 12000.5,
  date: '2026-10-31',
};

function request(method: string, body?: unknown) {
  return new NextRequest('https://shop.example.test/api/data/purchases', {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

describe('/api/data/purchases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authorizePurchaseRequestMock.mockResolvedValue(null);
  });

  it.each([
    ['401', 401],
    ['403', 403],
  ])('returns %s without listing or creating purchases', async (_label, status) => {
    authorizePurchaseRequestMock.mockResolvedValue(
      Response.json({ success: false }, { status }),
    );

    const response = await POST(request('POST', validPayload));

    expect(response.status).toBe(status);
    expect(createPurchaseMock).not.toHaveBeenCalled();
  });

  it('validates purchase input with Zod before calling the service', async () => {
    const response = await POST(request('POST', { ...validPayload, quantity: 1.5 }));

    expect(response.status).toBe(400);
    expect(createPurchaseMock).not.toHaveBeenCalled();
  });

  it('does not pass user identity fields from the request body to the service', async () => {
    createPurchaseMock.mockResolvedValue({
      ...validPayload,
      id: 'purchase_1',
      productName: 'Blusa',
      newStock: 8,
      createdAt: '2026-10-31T12:00:00.000Z',
      updatedAt: '2026-10-31T12:00:00.000Z',
    });

    const response = await POST(
      request('POST', {
        ...validPayload,
        email: 'forged@example.test',
        createdBy: 'forged@example.test',
      }),
    );

    expect(response.status).toBe(201);
    expect(createPurchaseMock).toHaveBeenCalledWith(validPayload);
  });

  it('protects the recent purchases endpoint too', async () => {
    authorizePurchaseRequestMock.mockResolvedValue(
      Response.json({ success: false }, { status: 401 }),
    );

    const response = await GET(request('GET'));

    expect(response.status).toBe(401);
    expect(getRecentPurchasesMock).not.toHaveBeenCalled();
  });
});
