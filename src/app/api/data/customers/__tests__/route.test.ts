import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const {
  createCustomerMock,
  getServerAccessStatusMock,
  listCustomersMock,
} = vi.hoisted(() => ({
  createCustomerMock: vi.fn(),
  getServerAccessStatusMock: vi.fn(),
  listCustomersMock: vi.fn(),
}));

vi.mock('@/lib/auth/server-access', () => ({
  getServerAccessStatus: getServerAccessStatusMock,
}));

vi.mock('@/modules/customers/service', () => ({
  changeCustomerStatus: vi.fn(),
  createCustomer: createCustomerMock,
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

    const response = await POST(
      request('http://localhost/api/data/customers', 'POST', {}),
    );

    expect(response.status).toBe(403);
    expect(createCustomerMock).not.toHaveBeenCalled();
  });
});
