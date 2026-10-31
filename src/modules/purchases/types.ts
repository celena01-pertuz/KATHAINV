import type { PurchaseCreateData, PurchaseRecord } from '@data/_schema/purchase.schema';
import type { SupplierCreateData, SupplierRecord } from '@data/_schema/supplier.schema';

export type { PurchaseRecord, SupplierRecord };
export type PurchaseInput = PurchaseCreateData;
export type SupplierInput = SupplierCreateData;

export interface PurchaseResult extends PurchaseRecord {
  productName: string;
  newStock: number;
}

export interface RecentPurchase extends PurchaseRecord {
  supplierName: string;
  productName: string;
}
