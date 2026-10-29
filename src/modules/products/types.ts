import type { ProductCreateData, ProductRecord } from '@data/_schema/product.schema';

export type { ProductRecord };
export type ProductInput = Omit<ProductRecord, 'id' | 'createdAt' | 'updatedAt'>;
export type ProductCreateInput = ProductCreateData;

export interface ProductDeleteResult {
  deleted: boolean;
  deactivated: boolean;
}
