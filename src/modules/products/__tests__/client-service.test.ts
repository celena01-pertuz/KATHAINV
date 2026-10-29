import { afterEach, describe, expect, it, vi } from 'vitest';
import { buscarProductoPorCodigo } from '../client-service';
import { normalizeProductCode } from '../code-utils';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('búsqueda de productos para el escáner', () => {
  it('normaliza el código ignorando espacios y mayúsculas', () => {
    expect(normalizeProductCode(' kat - 000123 ')).toBe('KAT-000123');
  });

  it('busca por código normalizado y devuelve el producto encontrado', async () => {
    const product = {
      id: 'product_1',
      createdAt: '2026-10-28T00:00:00.000Z',
      updatedAt: '2026-10-28T00:00:00.000Z',
      code: 'KAT-000123',
      codeType: 'internal',
      variantGroupId: 'variant_1',
      name: 'Blusa',
      category: 'ropa',
      size: 'M',
      color: 'Negro',
      costPrice: 30000,
      salePrice: 55000,
      stock: 5,
      minStock: 1,
      active: true,
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: product }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(buscarProductoPorCodigo(' kat - 000123 ')).resolves.toEqual(product);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/data/products?code=KAT-000123',
      { cache: 'no-store' },
    );
  });

  it('devuelve null si el código no existe', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ success: false, error: 'Producto no encontrado.' }),
          { status: 404 },
        ),
      ),
    );

    await expect(buscarProductoPorCodigo('DESCONOCIDO')).resolves.toBeNull();
  });
});
