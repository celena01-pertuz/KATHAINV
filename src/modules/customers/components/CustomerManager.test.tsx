import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CustomerManager } from './CustomerManager';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('CustomerManager interfaz', () => {
  it('muestra la búsqueda antes del mensaje vacío y permite crear un cliente', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { data: [], total: 0 } }),
      }),
    );

    const { container } = render(<CustomerManager />);

    expect(await screen.findByText(/Todavía no hay clientes/)).toBeInTheDocument();
    expect(screen.getByLabelText('Buscar por nombre o teléfono')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nuevo cliente' })).toBeInTheDocument();
    expect(container.querySelectorAll('[data-primary-action]')).toHaveLength(0);
    expect(container.querySelector('main > div')?.className).toContain(
      'md:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Nuevo cliente' }));
    expect(screen.getByRole('heading', { name: 'Registrar cliente' })).toBeInTheDocument();
    expect(container.querySelectorAll('[data-primary-action]')).toHaveLength(1);
  });
});
