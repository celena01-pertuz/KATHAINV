import type { ProductCreateInput, ProductDeleteResult, ProductInput, ProductRecord } from './types';

async function getRepository() {
  const repository = process.env.PRODUCTS_REPOSITORY;

  if (repository === 'json') {
    return import('./json-repository');
  }
  if (repository === 'supabase') {
    return import('./supabase-repository');
  }

  throw new Error(
    'PRODUCTS_REPOSITORY debe estar configurada con uno de estos valores: json o supabase.',
  );
}

export async function listProducts(): Promise<ProductRecord[]> {
  return (await getRepository()).listProducts();
}

export async function getProduct(id: string): Promise<ProductRecord | null> {
  return (await getRepository()).getProduct(id);
}

export async function findProductByCode(code: string): Promise<ProductRecord | null> {
  return (await getRepository()).findProductByCode(code);
}

export async function createProduct(input: ProductCreateInput): Promise<ProductRecord> {
  return (await getRepository()).createProduct(input);
}

export async function updateProduct(
  id: string,
  input: ProductInput,
): Promise<ProductRecord | null> {
  return (await getRepository()).updateProduct(id, input);
}

export async function removeOrDeactivateProduct(
  id: string,
): Promise<ProductDeleteResult | null> {
  return (await getRepository()).removeOrDeactivateProduct(id);
}
