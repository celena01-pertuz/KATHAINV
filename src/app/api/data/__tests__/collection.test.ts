import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { countMock, createMock, getAllMock, getByIdMock, removeMock, updateMock } = vi.hoisted(() => ({
  countMock: vi.fn(),
  createMock: vi.fn(),
  getAllMock: vi.fn(),
  getByIdMock: vi.fn(),
  removeMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock('@/lib/json-db', () => ({
  count: countMock,
  create: createMock,
  getAll: getAllMock,
  getById: getByIdMock,
  remove: removeMock,
  update: updateMock,
}));

import { DELETE, GET, POST } from '../[collection]/route';

const productInput = {
  code: 'KAT-001',
  name: 'Blusa',
  category: 'ropa',
  size: 'M',
  color: 'Negro',
  price: 25000,
  stock: 5,
};

const productRecord = {
  id: 'product_001',
  createdAt: '2026-10-28T00:00:00.000Z',
  updatedAt: '2026-10-28T00:00:00.000Z',
  ...productInput,
};

function makeRequest(url: string, method = 'GET', body?: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function makeContext(collection: string) {
  return { params: Promise.resolve({ collection }) };
}

describe('/api/data/[collection]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lista productos en una respuesta estándar', async () => {
    getAllMock.mockResolvedValue({
      data: [productRecord],
      total: 1,
      limit: 1,
      offset: 0,
      records: [productRecord],
    });

    const response = await GET(
      makeRequest('http://localhost/api/data/product'),
      makeContext('product'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      data: { data: [productRecord], total: 1 },
    });
    expect(body.timestamp).toBeDefined();
  });

  it('crea un producto válido sin exigir campos generados por el motor', async () => {
    createMock.mockResolvedValue(productRecord);

    const response = await POST(
      makeRequest('http://localhost/api/data/product', 'POST', productInput),
      makeContext('product'),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({ success: true, data: productRecord });
    expect(body.timestamp).toBeDefined();
    expect(createMock).toHaveBeenCalledWith('product', productInput);
  });

  it('rechaza un producto inválido con 400', async () => {
    const response = await POST(
      makeRequest('http://localhost/api/data/product', 'POST', { ...productInput, price: -1 }),
      makeContext('product'),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({ success: false, code: 'VALIDATION_ERROR' });
    expect(body.error).toBeDefined();
    expect(body.timestamp).toBeDefined();
    expect(createMock).not.toHaveBeenCalled();
  });

  it('responde 404 para una colección inexistente', async () => {
    const response = await GET(
      makeRequest('http://localhost/api/data/unknown'),
      makeContext('unknown'),
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toMatchObject({ success: false, code: 'NOT_FOUND' });
    expect(body.error).toBeDefined();
    expect(body.timestamp).toBeDefined();
  });

  it('responde 404 al eliminar un producto inexistente', async () => {
    removeMock.mockResolvedValue(false);

    const response = await DELETE(
      makeRequest('http://localhost/api/data/product?id=missing', 'DELETE'),
      makeContext('product'),
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toMatchObject({ success: false, code: 'NOT_FOUND' });
    expect(body.error).toBeDefined();
    expect(body.timestamp).toBeDefined();
  });
});
