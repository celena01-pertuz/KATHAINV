import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { getReportsMock, getServerAccessStatusMock } = vi.hoisted(() => ({
  getReportsMock: vi.fn(),
  getServerAccessStatusMock: vi.fn(),
}));

vi.mock('@/lib/auth/server-access', () => ({
  getServerAccessStatus: getServerAccessStatusMock,
}));
vi.mock('@/modules/reports/service', () => ({
  getReports: getReportsMock,
}));

import { GET } from '../route';

function request(query = '') {
  return new NextRequest(`http://localhost/api/data/reports${query}`);
}

describe('/api/data/reports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerAccessStatusMock.mockResolvedValue('authorized');
  });

  it('responde 401 sin consultar reportes si no hay sesión', async () => {
    getServerAccessStatusMock.mockResolvedValue('unauthenticated');

    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(getReportsMock).not.toHaveBeenCalled();
  });

  it('responde 403 sin consultar reportes si la cuenta no tiene permiso', async () => {
    getServerAccessStatusMock.mockResolvedValue('forbidden');

    const response = await GET(request());

    expect(response.status).toBe(403);
    expect(getReportsMock).not.toHaveBeenCalled();
  });

  it('valida fechas antes de consultar', async () => {
    const response = await GET(request('?from=2026-02-31&to=2026-03-01'));

    expect(response.status).toBe(400);
    expect(getReportsMock).not.toHaveBeenCalled();
  });

  it('usa por defecto el rango de 30 días y devuelve el reporte', async () => {
    getReportsMock.mockResolvedValue({
      summary: { unitsSold: 4, totalSold: 80000, salesCount: 2 },
      mostSold: [],
      leastSold: [],
    });

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(getReportsMock).toHaveBeenCalledWith(
      expect.objectContaining({ from: expect.any(String), to: expect.any(String) }),
    );
  });
});
