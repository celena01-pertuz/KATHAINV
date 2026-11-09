import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { getServerAccessContextMock, voidSaleMock } = vi.hoisted(() => ({
  getServerAccessContextMock: vi.fn(),
  voidSaleMock: vi.fn(),
}));

vi.mock('@/lib/auth/server-access', () => ({
  getServerAccessContext: getServerAccessContextMock,
}));

vi.mock('@/modules/sales/service', () => ({
  voidSale: voidSaleMock,
}));

import { POST } from '../route';

const context = { params: Promise.resolve({ saleId: '5' }) };

function request(body: unknown) {
  return new NextRequest('http://localhost/api/data/sales/5/void', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/data/sales/[saleId]/void', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerAccessContextMock.mockResolvedValue({
      status: 'unauthenticated',
      email: null,
    });
  });

  it('responde 401 sin anular una venta si no hay sesión', async () => {
    const response = await POST(request({ reason: 'Prueba' }), context);

    expect(response.status).toBe(401);
    expect(voidSaleMock).not.toHaveBeenCalled();
  });

  it('responde 403 para una cuenta no autorizada', async () => {
    getServerAccessContextMock.mockResolvedValue({
      status: 'forbidden',
      email: 'not-allowed@example.test',
    });

    const response = await POST(request({ reason: 'Prueba' }), context);

    expect(response.status).toBe(403);
    expect(voidSaleMock).not.toHaveBeenCalled();
  });

  it('valida motivo obligatorio y máximo 500 caracteres', async () => {
    getServerAccessContextMock.mockResolvedValue({
      status: 'authorized',
      email: 'owner@example.test',
    });

    const response = await POST(request({ reason: 'x'.repeat(501) }), context);

    expect(response.status).toBe(400);
    expect(voidSaleMock).not.toHaveBeenCalled();
  });

  it('usa la identidad de la sesión verificada, no la enviada por el navegador', async () => {
    getServerAccessContextMock.mockResolvedValue({
      status: 'authorized',
      email: 'owner@example.test',
    });
    voidSaleMock.mockResolvedValue({
      saleId: 5,
      voidedAt: '2026-11-09T12:00:00.000Z',
      voidedBy: 'owner@example.test',
      voidReason: 'Cliente devolvió la compra',
      reactivatedProducts: [],
    });

    const response = await POST(
      request({ reason: ' Cliente devolvió la compra ', voidedBy: 'browser@example.test' }),
      context,
    );

    expect(response.status).toBe(200);
    expect(voidSaleMock).toHaveBeenCalledWith(
      5,
      'Cliente devolvió la compra',
      'owner@example.test',
    );
  });

  it('devuelve 409 con el mensaje requerido cuando la venta tiene abonos activos', async () => {
    getServerAccessContextMock.mockResolvedValue({
      status: 'authorized',
      email: 'owner@example.test',
    });
    const { SalesOperationError } = await import('@/modules/sales/errors');
    voidSaleMock.mockRejectedValue(
      new SalesOperationError(
        'Esta venta tiene abonos. Anula primero esos abonos y luego la venta.',
        409,
        'SALE_HAS_ACTIVE_INSTALLMENTS',
      ),
    );

    const response = await POST(request({ reason: 'Prueba' }), context);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Esta venta tiene abonos. Anula primero esos abonos y luego la venta.',
    });
  });
});
