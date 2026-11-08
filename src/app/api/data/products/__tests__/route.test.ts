import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { JsonDBError } from '@/lib/json-db';

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

  it('responde 409 REFERENCIA_DUPLICADA al crear y editar una referencia existente', async () => {
    getServerAccessStatusMock.mockResolvedValue('authorized');
    const message =
      'Ya existe un producto con ese nombre, talla y color. Para sumar unidades registra una compra en Proveedores.';
    createProductMock.mockRejectedValue(new JsonDBError('REFERENCIA_DUPLICADA', message));
    updateProductMock.mockRejectedValue(new JsonDBError('REFERENCIA_DUPLICADA', message));
    const createPayload = {
      name: 'Blusa',
      category: 'ropa',
      size: 'M',
      color: 'Negro',
      costPrice: 30000,
      salePrice: 55000,
      stock: 5,
      minStock: 1,
      active: true,
    };
    const updatePayload = {
      id: 'product_1',
      createdAt: '2026-10-28T00:00:00.000Z',
      updatedAt: '2026-10-28T00:00:00.000Z',
      code: 'KAT-000001',
      codeType: 'internal',
      variantGroupId: 'variant_1',
      ...createPayload,
    };

    for (const response of [
      await POST(request('http://localhost/api/data/products', 'POST', createPayload)),
      await PUT(request('http://localhost/api/data/products', 'PUT', updatePayload)),
    ]) {
      const body = await response.json();
      expect(response.status).toBe(409);
      expect(body).toMatchObject({ code: 'REFERENCIA_DUPLICADA', error: message });
    }
  });

  it('responde 409 PRODUCTO_CON_EXISTENCIAS al intentar desactivar con stock', async () => {
    getServerAccessStatusMock.mockResolvedValue('authorized');
    removeOrDeactivateProductMock.mockRejectedValue(
      new JsonDBError(
        'PRODUCTO_CON_EXISTENCIAS',
        'Este producto todavía tiene unidades. Déjalo en 0 antes de desactivarlo.',
      ),
    );

    const response = await DELETE(
      request('http://localhost/api/data/products?id=product_1', 'DELETE'),
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toMatchObject({
      code: 'PRODUCTO_CON_EXISTENCIAS',
      error: 'Este producto todavía tiene unidades. Déjalo en 0 antes de desactivarlo.',
    });
  });

  it('impide leer productos sin sesión con 401', async () => {
    const response = await GET(request('http://localhost/api/data/products'));
    expect(response.status).toBe(401);
    expect(listProductsMock).not.toHaveBeenCalled();
  });

  it('responde 503 si la verificación de Supabase falla realmente', async () => {
    getServerAccessStatusMock.mockRejectedValue(new Error('Supabase unavailable'));

    const response = await GET(request('http://localhost/api/data/products'));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.code).toBe('AUTH_UNAVAILABLE');
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

  it('rechaza nombres, tallas o colores en blanco al crear y editar', async () => {
    getServerAccessStatusMock.mockResolvedValue('authorized');
    const createPayload = {
      name: 'Blusa',
      category: 'ropa',
      size: 'M',
      color: 'Negro',
      costPrice: 30000,
      salePrice: 55000,
      stock: 5,
      minStock: 1,
      active: true,
    };
    const updatePayload = {
      id: 'product_1',
      createdAt: '2026-10-28T00:00:00.000Z',
      updatedAt: '2026-10-28T00:00:00.000Z',
      code: 'KAT-000001',
      codeType: 'internal',
      variantGroupId: 'variant_1',
      ...createPayload,
    };

    for (const field of ['name', 'size', 'color'] as const) {
      const createResponse = await POST(
        request('http://localhost/api/data/products', 'POST', {
          ...createPayload,
          [field]: '   ',
        }),
      );
      const updateResponse = await PUT(
        request('http://localhost/api/data/products', 'PUT', {
          ...updatePayload,
          [field]: '   ',
        }),
      );

      expect(createResponse.status).toBe(400);
      expect(updateResponse.status).toBe(400);
    }

    expect(createProductMock).not.toHaveBeenCalled();
    expect(updateProductMock).not.toHaveBeenCalled();
  });

  it('responde 403 si la cuenta no está permitida', async () => {
    getServerAccessStatusMock.mockResolvedValue('forbidden');
    const response = await GET(request('http://localhost/api/data/products'));
    expect(response.status).toBe(403);
    expect(listProductsMock).not.toHaveBeenCalled();
  });
});
