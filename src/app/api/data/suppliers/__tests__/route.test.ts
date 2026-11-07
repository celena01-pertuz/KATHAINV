import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { authorizePurchaseRequestMock, createSupplierMock, listSuppliersMock } = vi.hoisted(
  () => ({
    authorizePurchaseRequestMock: vi.fn(),
    createSupplierMock: vi.fn(),
    listSuppliersMock: vi.fn(),
  }),
);

vi.mock('@/modules/purchases/api-access', () => ({
  authorizePurchaseRequest: authorizePurchaseRequestMock,
}));
vi.mock('@/modules/purchases/service', () => ({
  createSupplier: createSupplierMock,
  listSuppliers: listSuppliersMock,
}));

import { GET, POST } from '../route';

function request(method: string, body?: unknown) {
  return new NextRequest('https://shop.example.test/api/data/suppliers', {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

describe('/api/data/suppliers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authorizePurchaseRequestMock.mockResolvedValue(null);
  });

  it.each([401, 403])('returns %i for unauthenticated or forbidden access', async (status) => {
    authorizePurchaseRequestMock.mockResolvedValue(
      Response.json({ success: false }, { status }),
    );

    const response = await POST(request('POST', { name: 'Proveedor' }));

    expect(response.status).toBe(status);
    expect(createSupplierMock).not.toHaveBeenCalled();
  });

  it('rejects a blank supplier name with Zod', async () => {
    const response = await POST(request('POST', { name: '   ' }));

    expect(response.status).toBe(400);
    expect(createSupplierMock).not.toHaveBeenCalled();
  });

  it('creates suppliers using only the validated name, never body identity', async () => {
    createSupplierMock.mockResolvedValue({
      id: 'supplier_1',
      name: 'Proveedor',
      createdAt: '2026-10-31T12:00:00.000Z',
      updatedAt: '2026-10-31T12:00:00.000Z',
    });

    const response = await POST(
      request('POST', { name: 'Proveedor', createdBy: 'forged@example.test' }),
    );

    expect(response.status).toBe(201);
    expect(createSupplierMock).toHaveBeenCalledWith('Proveedor');
  });

  it('protects the supplier list endpoint', async () => {
    authorizePurchaseRequestMock.mockResolvedValue(
      Response.json({ success: false }, { status: 403 }),
    );

    const response = await GET();

    expect(response.status).toBe(403);
    expect(listSuppliersMock).not.toHaveBeenCalled();
  });
});
