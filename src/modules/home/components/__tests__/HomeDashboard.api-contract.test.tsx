import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { HomeDashboard } from '../HomeDashboard';

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

import { GET as getReportsRoute } from '@/app/api/data/reports/route';
import { ReportOperationError } from '@/modules/reports/errors';

const dailyReport = {
  summary: { salesCount: 0, totalSold: 0, unitsSold: 0 },
  mostSold: [],
  leastSold: [],
};

const fetchMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  getServerAccessStatusMock.mockResolvedValue('authorized');
  getReportsMock.mockResolvedValue(dailyReport);
  fetchMock.mockImplementation(async (resource: RequestInfo | URL) => {
    const url = new URL(String(resource), 'http://localhost');
    if (url.pathname === '/api/data/reports') {
      return getReportsRoute(new NextRequest(url));
    }
    return Response.json({
      success: true,
      data: { data: [], total: 0 },
      timestamp: new Date().toISOString(),
    });
  });
  vi.stubGlobal('fetch', fetchMock);
});

describe('HomeDashboard con la respuesta real de la ruta de reportes', () => {
  it('acepta el sobre API success/data y tolera cero ventas y una lista de productos vacía', async () => {
    render(
      <HomeDashboard
        greeting="Buenas noches"
        greetingName="Celena"
        initialDisplayName="Celena"
        today="2026-11-07"
      />,
    );

    expect(await screen.findByText('Hoy todavía no hay ventas.')).toBeInTheDocument();
    expect(screen.getByText('Todo el inventario está al día.')).toBeInTheDocument();
    expect(screen.getByText('0', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver reporte completo' })).toHaveAttribute(
      'href',
      '/reports',
    );
    expect(getReportsMock).toHaveBeenCalledWith({ from: '2026-11-07', to: '2026-11-07' });
  });

  it('registra el error de API de forma segura y conserva el enlace a Reportes', async () => {
    getReportsMock.mockRejectedValue(
      new ReportOperationError('No se pudieron consultar los reportes.', 500),
    );
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <HomeDashboard
        greeting="Buenas noches"
        greetingName="Celena"
        initialDisplayName="Celena"
        today="2026-11-07"
      />,
    );

    expect(
      await screen.findByText('No pudimos cargar el reporte. Intenta de nuevo.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver reporte completo' })).toHaveAttribute(
      'href',
      '/reports',
    );
    expect(consoleError).toHaveBeenCalledWith(
      '[Inicio] No se pudo cargar el reporte diario.',
      expect.objectContaining({
        endpoint: '/api/data/reports',
        status: 500,
        code: 'REPORT_OPERATION_ERROR',
        message: 'No se pudieron consultar los reportes.',
      }),
    );
    consoleError.mockRestore();
  });
});
