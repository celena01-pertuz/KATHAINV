import type { ProductSalesReport, ProductSalesReportSource, ReportProduct } from './types';

function compareProducts(left: ReportProduct, right: ReportProduct): number {
  return left.code.localeCompare(right.code, 'es-CO') || left.id.localeCompare(right.id);
}

export function buildProductSalesReport(source: ProductSalesReportSource): ProductSalesReport {
  const mostSold = source.products
    .filter((product) => product.unitsSold > 0)
    .sort((left, right) => right.unitsSold - left.unitsSold || compareProducts(left, right));
  const leastSold = [...source.products].sort(
    (left, right) => left.unitsSold - right.unitsSold || compareProducts(left, right),
  );

  return {
    summary: {
      unitsSold: source.products.reduce((total, product) => total + product.unitsSold, 0),
      totalSold: source.products.reduce((total, product) => total + product.totalSold, 0),
      salesCount: source.salesCount,
    },
    mostSold,
    leastSold,
  };
}
