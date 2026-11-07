import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createAdminSupabaseClientMock, rpcMock } = vi.hoisted(() => ({
  createAdminSupabaseClientMock: vi.fn(),
  rpcMock: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminSupabaseClient: createAdminSupabaseClientMock,
}));

import { getProductSalesReport } from '../supabase-repository';

beforeEach(() => {
  vi.clearAllMocks();
  createAdminSupabaseClientMock.mockReturnValue({ rpc: rpcMock });
});

describe('repositorio de reportes', () => {
  it('consulta la RPC de solo lectura con el rango recibido', async () => {
    rpcMock.mockResolvedValue({
      data: {
        salesCount: 1,
        products: [
          {
            id: 'product_1',
            code: 'KAT-000001',
            name: 'Blusa azul',
            size: 'M',
            color: 'Azul',
            active: true,
            unitsSold: 2,
            totalSold: 28000,
          },
        ],
      },
      error: null,
    });

    await expect(
      getProductSalesReport({ from: '2026-11-01', to: '2026-11-07' }),
    ).resolves.toMatchObject({
      summary: { unitsSold: 2, totalSold: 28000, salesCount: 1 },
      mostSold: [{ id: 'product_1', unitsSold: 2, totalSold: 28000 }],
    });
    expect(rpcMock).toHaveBeenCalledWith('get_product_sales_report', {
      p_from: '2026-11-01',
      p_to: '2026-11-07',
    });
  });

  it('propaga errores de base de datos como error explícito del reporte', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'unavailable' } });

    await expect(
      getProductSalesReport({ from: '2026-11-01', to: '2026-11-07' }),
    ).rejects.toMatchObject({
      code: 'REPORT_OPERATION_ERROR',
      status: 500,
    });
  });
});
