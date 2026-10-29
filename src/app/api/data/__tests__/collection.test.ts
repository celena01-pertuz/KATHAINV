import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const {
  countMock,
  createMock,
  getAllMock,
  getByIdMock,
  getServerAccessStatusMock,
  createProductMock,
  listProductsMock,
  removeOrDeactivateProductMock,
  removeMock,
  updateMock,
} = vi.hoisted(() => ({
  countMock: vi.fn(),
  createMock: vi.fn(),
  getAllMock: vi.fn(),
  getByIdMock: vi.fn(),
  getServerAccessStatusMock: vi.fn(),
  createProductMock: vi.fn(),
  listProductsMock: vi.fn(),
  removeOrDeactivateProductMock: vi.fn(),
  removeMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock('@/lib/auth/server-access', () => ({
  getServerAccessStatus: getServerAccessStatusMock,
}));

vi.mock('@/lib/json-db', () => ({
  JsonDBError: class JsonDBError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
  count: countMock,
  create: createMock,
  getAll: getAllMock,
  getById: getByIdMock,
  remove: removeMock,
  update: updateMock,
}));

vi.mock('@/modules/products/service', () => ({
  createProduct: createProductMock,
  findProductByCode: vi.fn(),
  getProduct: vi.fn(),
  listProducts: listProductsMock,
  normalizeProductCode: (code: string) => code.replace(/\s+/g, '').toUpperCase(),
  removeOrDeactivateProduct: removeOrDeactivateProductMock,
  updateProduct: vi.fn(),
}));

import { DELETE, GET, POST } from '../[collection]/route';

const productInput = {
  code: 'KAT-000001',
  name: 'Blusa',
  category: 'ropa',
  size: 'M',
  color: 'Negro',
  costPrice: 15000,
  salePrice: 25000,
  stock: 5,
  minStock: 1,
  active: true,
};

const productRecord = {
  id: 'product_001',
  createdAt: '2026-10-28T00:00:00.000Z',
  updatedAt: '2026-10-28T00:00:00.000Z',
  codeType: 'factory',
  variantGroupId: 'variant_001',
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
    getServerAccessStatusMock.mockResolvedValue('authorized');
  });

  it('lista productos en una respuesta estándar', async () => {
    listProductsMock.mockResolvedValue([productRecord]);

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
    createProductMock.mockResolvedValue(productRecord);

    const response = await POST(
      makeRequest('http://localhost/api/data/product', 'POST', productInput),
      makeContext('product'),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({ success: true, data: productRecord });
    expect(body.timestamp).toBeDefined();
    expect(createProductMock).toHaveBeenCalledWith(productInput);
  });

  it('rechaza un producto inválido con 400', async () => {
    const response = await POST(
      makeRequest('http://localhost/api/data/product', 'POST', {
        ...productInput,
        salePrice: -1,
      }),
      makeContext('product'),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({ success: false, code: 'VALIDATION_ERROR' });
    expect(body.error).toBeDefined();
    expect(body.timestamp).toBeDefined();
    expect(createProductMock).not.toHaveBeenCalled();
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
    removeOrDeactivateProductMock.mockResolvedValue(null);

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

  it('responde 401 si no hay una sesión válida', async () => {
    getServerAccessStatusMock.mockResolvedValue('unauthenticated');

    const response = await GET(
      makeRequest('http://localhost/api/data/product'),
      makeContext('product'),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toMatchObject({ success: false, code: 'UNAUTHORIZED' });
    expect(body.error).toBe('Inicia sesión para continuar.');
    expect(listProductsMock).not.toHaveBeenCalled();
  });

  it('responde 403 si la cuenta no está autorizada', async () => {
    getServerAccessStatusMock.mockResolvedValue('forbidden');

    const response = await GET(
      makeRequest('http://localhost/api/data/product'),
      makeContext('product'),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toMatchObject({ success: false, code: 'FORBIDDEN' });
    expect(body.error).toBe('No tienes permiso para acceder a este recurso.');
    expect(body.error).not.toContain('duena@');
    expect(listProductsMock).not.toHaveBeenCalled();
  });

  it('no permite modificar datos sin una sesión autorizada', async () => {
    getServerAccessStatusMock.mockResolvedValue('unauthenticated');

    const response = await POST(
      makeRequest('http://localhost/api/data/product', 'POST', productInput),
      makeContext('product'),
    );

    expect(response.status).toBe(401);
    expect(createProductMock).not.toHaveBeenCalled();
  });
});
