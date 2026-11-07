import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getDefaultReportDateRange,
  getQuickReportDateRange,
  productSalesReportSchema,
  reportDateRangeSchema,
} from '../date-range';

describe('rango de fechas de reportes', () => {
  afterEach(() => vi.useRealTimers());

  it('usa los últimos 30 días por defecto según la fecha de Colombia', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-07T04:30:00.000Z'));

    expect(getDefaultReportDateRange()).toEqual({ from: '2026-10-08', to: '2026-11-06' });
    expect(reportDateRangeSchema.parse({})).toEqual({ from: '2026-10-08', to: '2026-11-06' });
  });

  it('calcula los periodos rápidos incluyendo todo el día final', () => {
    const now = new Date('2026-11-07T17:00:00.000Z');
    expect(getQuickReportDateRange('today', now)).toEqual({
      from: '2026-11-07',
      to: '2026-11-07',
    });
    expect(getQuickReportDateRange('7days', now)).toEqual({
      from: '2026-11-01',
      to: '2026-11-07',
    });
    expect(getQuickReportDateRange('30days', now)).toEqual({
      from: '2026-10-09',
      to: '2026-11-07',
    });
    expect(getQuickReportDateRange('month', now)).toEqual({
      from: '2026-11-01',
      to: '2026-11-07',
    });
  });

  it('rechaza fechas inexistentes y un inicio posterior al final', () => {
    expect(reportDateRangeSchema.safeParse({ from: '2026-02-31', to: '2026-03-01' }).success).toBe(
      false,
    );
    expect(reportDateRangeSchema.safeParse({ from: '2026-11-08', to: '2026-11-07' }).success).toBe(
      false,
    );
    expect(reportDateRangeSchema.safeParse({ from: '2026-11-01' }).success).toBe(false);
  });

  it('valida la forma actual del reporte, sin campos de ventas anuladas', () => {
    const reportProduct = {
      id: 'product_1',
      code: 'KAT-000001',
      name: 'Blusa azul',
      size: 'M',
      color: 'Azul',
      active: true,
      unitsSold: 2,
      totalSold: 28000,
    };

    expect(
      productSalesReportSchema.safeParse({
        summary: { unitsSold: 2, totalSold: 28000, salesCount: 1 },
        mostSold: [reportProduct],
        leastSold: [reportProduct],
      }).success,
    ).toBe(true);

    expect(
      productSalesReportSchema.safeParse({
        summary: { unitsSold: 2, totalSold: 28000, salesCount: 1 },
        mostSold: [
          {
            ...reportProduct,
            activeUnitsSold: 2,
            activeTotalSold: 28000,
            voidedUnitsSold: 0,
            voidedTotalSold: 0,
          },
        ],
        leastSold: [],
      }).success,
    ).toBe(false);
  });
});
