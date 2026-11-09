import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductManager } from '../ProductManager';

describe('ProductManager formulario', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each(['bolso', 'accesorio'])(
    'exige talla y color y ofrece talla Única para %s',
    async (category) => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ data: { data: [] } }),
        }),
      );

      render(<ProductManager />);
      await screen.findByRole('heading', { name: 'Productos' });
      fireEvent.click(screen.getByRole('button', { name: 'Nuevo producto' }));

      const form = screen
        .getByRole('heading', { name: 'Crear producto o variante' })
        .closest('form');
      if (!form) throw new Error('No se encontró el formulario de producto.');
      const productForm = within(form);
      const sizeInput = productForm.getByLabelText('Talla');
      const colorInput = productForm.getByLabelText('Color');
      expect(sizeInput).toBeRequired();
      expect(colorInput).toBeRequired();

      fireEvent.change(productForm.getByLabelText('Categoría'), {
        target: { value: category },
      });

      await waitFor(() => {
        expect(document.querySelector('#product-size-options option[value="Única"]')).not.toBeNull();
      });
    },
  );

  it('muestra un mensaje amable al no tener productos y conserva una sola acción principal', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { data: [], total: 0 } }),
      }),
    );

    const { container } = render(<ProductManager />);

    expect(await screen.findByText('Todavía no hay productos.')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-primary-action]')).toHaveLength(1);
  });

  it('deshabilita la desactivación mientras hay stock y muestra la explicación', async () => {
    const product = {
      id: 'product_1',
      code: 'KAT-000001',
      codeType: 'internal',
      variantGroupId: 'variant_1',
      name: 'Blusa',
      category: 'ropa',
      size: 'M',
      color: 'Negro',
      costPrice: 30000,
      salePrice: 55000,
      stock: 3,
      minStock: 1,
      active: true,
      createdAt: '2026-10-28T00:00:00.000Z',
      updatedAt: '2026-10-28T00:00:00.000Z',
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { data: [product], total: 1 } }),
      }),
    );

    render(<ProductManager />);
    fireEvent.click(await screen.findByRole('button', { name: 'Editar' }));

    expect(screen.getByRole('checkbox', { name: 'Producto activo' })).toBeDisabled();
    expect(
      screen.getAllByText(
        'Este producto todavía tiene unidades. Déjalo en 0 antes de desactivarlo.',
      ),
    ).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Desactivar' })).toBeDisabled();
  });

  it('permite reactivar un producto inactivo', async () => {
    const product = {
      id: 'product_1',
      code: 'KAT-000001',
      codeType: 'internal',
      variantGroupId: 'variant_1',
      name: 'Blusa',
      category: 'ropa',
      size: 'M',
      color: 'Negro',
      costPrice: 30000,
      salePrice: 55000,
      stock: 0,
      minStock: 1,
      active: false,
      createdAt: '2026-10-28T00:00:00.000Z',
      updatedAt: '2026-10-28T00:00:00.000Z',
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { data: [product], total: 1 } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<ProductManager />);
    fireEvent.click(await screen.findByRole('button', { name: 'Editar' }));

    const activeControl = screen.getByRole('checkbox', { name: 'Producto activo' });
    expect(activeControl).toBeEnabled();
    fireEvent.click(activeControl);
    const form = screen.getByRole('heading', { name: 'Editar producto o variante' }).closest('form');
    if (!form) throw new Error('No se encontró el formulario de producto.');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/data/products',
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('"active":true'),
        }),
      );
    });
  });
});
