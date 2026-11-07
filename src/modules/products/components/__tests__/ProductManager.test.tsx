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
});
