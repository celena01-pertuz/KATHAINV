import 'server-only';

import { getProductSalesReport } from './supabase-repository';
import type { ProductSalesReport, ReportDateRange } from './types';

export async function getReports(range: ReportDateRange): Promise<ProductSalesReport> {
  return getProductSalesReport(range);
}
