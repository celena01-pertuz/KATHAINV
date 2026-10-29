import { afterEach, describe, expect, it, vi } from 'vitest';

const { jsonListProductsMock, supabaseListProductsMock } = vi.hoisted(() => ({
  jsonListProductsMock: vi.fn(),
  supabaseListProductsMock: vi.fn(),
}));

vi.mock('../json-repository', () => ({
  listProducts: jsonListProductsMock,
}));

vi.mock('../supabase-repository', () => ({
  listProducts: supabaseListProductsMock,
}));

import { listProducts } from '../repository';

describe('selector de repositorio de productos', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('usa el repositorio JSON cuando PRODUCTS_REPOSITORY=json', async () => {
    const products = [{ id: 'product_1' }];
    jsonListProductsMock.mockResolvedValue(products);
    vi.stubEnv('PRODUCTS_REPOSITORY', 'json');

    await expect(listProducts()).resolves.toBe(products);
    expect(jsonListProductsMock).toHaveBeenCalledOnce();
    expect(supabaseListProductsMock).not.toHaveBeenCalled();
  });

  it('usa el repositorio Supabase cuando PRODUCTS_REPOSITORY=supabase', async () => {
    const products = [{ id: 'product_2' }];
    supabaseListProductsMock.mockResolvedValue(products);
    vi.stubEnv('PRODUCTS_REPOSITORY', 'supabase');

    await expect(listProducts()).resolves.toBe(products);
    expect(supabaseListProductsMock).toHaveBeenCalledOnce();
    expect(jsonListProductsMock).not.toHaveBeenCalled();
  });

  it.each([undefined, '', 'postgres'])(
    'falla en español si PRODUCTS_REPOSITORY es inválida (%s)',
    async (repository) => {
      if (repository === undefined) {
        vi.stubEnv('PRODUCTS_REPOSITORY', undefined);
      } else {
        vi.stubEnv('PRODUCTS_REPOSITORY', repository);
      }

      await expect(listProducts()).rejects.toThrow(
        'PRODUCTS_REPOSITORY debe estar configurada con uno de estos valores: json o supabase.',
      );
    },
  );
});
