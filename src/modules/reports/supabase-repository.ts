import 'server-only';

import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { buildProductSalesReport } from './calculations';
import { productSalesReportSourceSchema } from './date-range';
import { ReportOperationError } from './errors';
import type { ProductSalesReport, ReportDateRange } from './types';

export async function getProductSalesReport(
  range: ReportDateRange,
): Promise<ProductSalesReport> {
  const client = createAdminSupabaseClient();
  const { data, error } = await client.rpc('get_product_sales_report', {
    p_from: range.from,
    p_to: range.to,
  });

  if (error) {
    throw new ReportOperationError('No se pudieron consultar los reportes.');
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new ReportOperationError('La respuesta del reporte no tiene un formato válido.');
  }

  const parsed = productSalesReportSourceSchema.safeParse(data);
  if (!parsed.success) {
    throw new ReportOperationError('La respuesta del reporte no tiene un formato válido.');
  }
  return buildProductSalesReport(parsed.data);
}
