export {
  createProduct,
  findProductByCode,
  getProduct,
  listProducts,
  removeOrDeactivateProduct,
  updateProduct,
} from './repository';
export { normalizeProductCode } from './code-utils';
export type {
  ProductCreateInput,
  ProductDeleteResult,
  ProductInput,
  ProductRecord,
} from './types';
