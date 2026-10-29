import { normalizeProductCode } from './code-utils';
import type { ProductRecord } from './types';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function readResponse<T>(response: Response): Promise<ApiResponse<T>> {
  return (await response.json()) as ApiResponse<T>;
}

export async function buscarProductoPorCodigo(code: string): Promise<ProductRecord | null> {
  const normalizedCode = normalizeProductCode(code);
  if (!normalizedCode) return null;

  const response = await fetch(
    `/api/data/products?code=${encodeURIComponent(normalizedCode)}`,
    { cache: 'no-store' },
  );
  const body = await readResponse<ProductRecord>(response);

  if (response.status === 404) return null;
  if (!response.ok || !body.data) {
    throw new Error(body.error ?? 'No se pudo consultar el producto.');
  }
  return body.data;
}

export async function buscarProductosPorNombre(name: string): Promise<ProductRecord[]> {
  const search = name.trim();
  if (!search) return [];

  const response = await fetch(`/api/data/products?q=${encodeURIComponent(search)}`, {
    cache: 'no-store',
  });
  const body = await readResponse<{ data: ProductRecord[]; total: number }>(response);

  if (!response.ok || !body.data) {
    throw new Error(body.error ?? 'No se pudieron buscar productos.');
  }
  return body.data.data;
}
