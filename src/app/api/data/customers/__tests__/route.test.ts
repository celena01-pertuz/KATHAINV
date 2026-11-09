import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { createCustomerMock, getCustomerByIdMock, getServerAccessStatusMock, listCustomersMock } =
  vi.hoisted(() => ({
    createCustomerMock: vi.fn(),
    getCustomerByIdMock: vi.fn(),
    getServerAccessStatusMock: vi.fn(),
    listCustomersMock: vi.fn(),
  }));

vi.mock('@/lib/auth/server-access', () => ({
  getServerAccessStatus: getServerAccessStatusMock,
}));

vi.mock('@/modules/customers/service', () => ({
  changeCustomerStatus: vi.fn(),
  createCustomer: createCustomerMock,
  getCustomerById: getCustomerByIdMock,
  customerPhoneAlreadyExists: vi.fn(),
  listCustomers: listCustomersMock,
  updateCustomer: vi.fn(),
}));

import { GET, POST } from '../route';

function request(url: string, method = 'GET', body?: unknown) {
  return new NextRequest(url, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

describe('/api/data/customers control de acceso', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerAccessStatusMock.mockResolvedValue('unauthenticated');
  });

  it('responde 401 sin sesión y no consulta clientes', async () => {
    const response = await GET(request('http://localhost/api/data/customers'));

    expect(response.status).toBe(401);
    expect(listCustomersMock).not.toHaveBeenCalled();
  });

  it('responde 403 si el correo no está autorizado', async () => {
    getServerAccessStatusMock.mockResolvedValue('forbidden');

    const response = await POST(request('http://localhost/api/data/customers', 'POST', {}));

    expect(response.status).toBe(403);
    expect(createCustomerMock).not.toHaveBeenCalled();
  });

  it('consulta de forma validada un cliente por customerId', async () => {
    getServerAccessStatusMock.mockResolvedValue('authorized');
    getCustomerByIdMock.mockResolvedValue({
      id: 'customer_1',
      active: true,
    });

    const response = await GET(
      request('http://localhost/api/data/customers?customerId=customer_1'),
    );

    expect(response.status).toBe(200);
    expect(getCustomerByIdMock).toHaveBeenCalledWith('customer_1');
  });

  it('rechaza customerId vacío antes de consultar', async () => {
    getServerAccessStatusMock.mockResolvedValue('authorized');

    const response = await GET(request('http://localhost/api/data/customers?customerId=%20%20'));

    expect(response.status).toBe(400);
    expect(getCustomerByIdMock).not.toHaveBeenCalled();
  });
});
