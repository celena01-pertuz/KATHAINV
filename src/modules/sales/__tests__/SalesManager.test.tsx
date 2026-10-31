import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SalesManager } from '../components/SalesManager';

const product = {
  id: 'product_1',
  code: 'KAT-000001',
  codeType: 'internal' as const,
  variantGroupId: 'variant_1',
  name: 'Camisa de prueba',
  category: 'ropa' as const,
  size: 'M',
  color: 'Azul',
  costPrice: 5000,
  salePrice: 12500,
  stock: 2,
  minStock: 0,
  active: true,
  createdAt: '2026-10-30T00:00:00.000Z',
  updatedAt: '2026-10-30T00:00:00.000Z',
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify({ success: status < 400, data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SalesManager request_key', () => {
  it('reutiliza la misma clave al reintentar tras un fallo de red', async () => {
    const randomUUID = vi
      .fn()
      .mockReturnValueOnce('9c77dcc1-6f9c-4581-8cde-7c75d5bc9908')
      .mockReturnValueOnce('c32888d6-f943-44cc-aa3a-548ff620d756');
    vi.stubGlobal('crypto', { randomUUID });

    const postBodies: Record<string, unknown>[] = [];
    let postCount = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith('/api/data/sales') && init?.method !== 'POST') {
        return jsonResponse({ data: [], total: 0 });
      }
      if (url.startsWith('/api/data/products?code=')) {
        return jsonResponse(product);
      }
      if (url === '/api/data/sales' && init?.method === 'POST') {
        postBodies.push(JSON.parse(String(init.body)) as Record<string, unknown>);
        postCount += 1;
        if (postCount === 1) throw new TypeError('Network unavailable');
        return jsonResponse({ saleId: 1, saleNumber: 'V-000001', total: 12500 }, 201);
      }
      throw new Error('Ruta inesperada en la prueba.');
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<SalesManager />);
    fireEvent.change(screen.getByLabelText('Código de barras o del producto'), {
      target: { value: 'KAT-000001' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar por código' }));
    await screen.findByText('Camisa de prueba');
    fireEvent.change(screen.getByLabelText('Método de pago'), {
      target: { value: 'efectivo' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Vender' }));
    await screen.findByText('Network unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'Vender' }));

    await screen.findByText('Venta V-000001 registrada correctamente.');
    await waitFor(() => expect(postBodies).toHaveLength(2));
    expect(postBodies[0].requestKey).toBe('9c77dcc1-6f9c-4581-8cde-7c75d5bc9908');
    expect(postBodies[1].requestKey).toBe(postBodies[0].requestKey);
    expect(randomUUID).toHaveBeenCalledTimes(2);
  });
});
