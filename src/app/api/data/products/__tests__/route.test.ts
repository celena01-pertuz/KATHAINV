import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const {
  createProductMock,
  getServerAccessStatusMock,
  listProductsMock,
  removeOrDeactivateProductMock,
  updateProductMock,
} = vi.hoisted(() => ({
  createProductMock: vi.fn(),
  getServerAccessStatusMock: vi.fn(),
  listProductsMock: vi.fn(),
  removeOrDeactivateProductMock: vi.fn(),
  updateProductMock: vi.fn(),
}));

vi.mock('@/lib/auth/server-access', () => ({
  getServerAccessStatus: getServerAccessStatusMock,
}));

vi.mock('@/modules/products/service', () => ({
  createProduct: createProductMock,
  findProductByCode: vi.fn(),
  getProduct: vi.fn(),
  listProducts: listProductsMock,
  normalizeProductCode: (code: string) => code.replace(/\s+/g, '').toUpperCase(),
  removeOrDeactivateProduct: removeOrDeactivateProductMock,
  updateProduct: updateProductMock,
}));

import { DELETE, GET, POST, PUT } from '../route';

function request(url: string, method = 'GET', body?: unknown) {
  return new NextRequest(url, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

describe('/api/data/products autorización', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerAccessStatusMock.mockResolvedValue('unauthenticated');
  });

  it('impide leer productos sin sesión con 401', async () => {
    const response = await GET(request('http://localhost/api/data/products'));
    expect(response.status).toBe(401);
    expect(listProductsMock).not.toHaveBeenCalled();
  });

  it('impide crear productos sin sesión con 401', async () => {
    const response = await POST(request('http://localhost/api/data/products', 'POST', {}));
    expect(response.status).toBe(401);
    expect(createProductMock).not.toHaveBeenCalled();
  });

  it('impide editar y eliminar productos sin sesión con 401', async () => {
    const putResponse = await PUT(request('http://localhost/api/data/products', 'PUT', {}));
    const deleteResponse = await DELETE(
      request('http://localhost/api/data/products?id=prod_1', 'DELETE'),
    );
    expect(putResponse.status).toBe(401);
    expect(deleteResponse.status).toBe(401);
    expect(updateProductMock).not.toHaveBeenCalled();
    expect(removeOrDeactivateProductMock).not.toHaveBeenCalled();
  });

  it('responde 403 si la cuenta no está permitida', async () => {
    getServerAccessStatusMock.mockResolvedValue('forbidden');
    const response = await GET(request('http://localhost/api/data/products'));
    expect(response.status).toBe(403);
    expect(listProductsMock).not.toHaveBeenCalled();
  });
});
