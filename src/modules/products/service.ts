export {
  createProduct,
  findProductByCode,
  getProduct,
  listProducts,
  normalizeProductCode,
  removeOrDeactivateProduct,
  updateProduct,
} from './repository';
export type {
  ProductCreateInput,
  ProductDeleteResult,
  ProductInput,
  ProductRecord,
} from './types';
