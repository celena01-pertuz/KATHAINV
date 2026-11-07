export interface ReportDateRange {
  from: string;
  to: string;
}

export interface ReportProduct {
  id: string;
  code: string;
  name: string;
  size: string;
  color: string;
  active: boolean;
  unitsSold: number;
  totalSold: number;
}

export interface ProductSalesReport {
  summary: {
    unitsSold: number;
    totalSold: number;
    salesCount: number;
  };
  mostSold: ReportProduct[];
  leastSold: ReportProduct[];
}

export interface ProductSalesReportSource {
  salesCount: number;
  products: ReportProduct[];
}
