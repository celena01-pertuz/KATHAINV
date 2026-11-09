import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CustomerManager } from './CustomerManager';

const customer = {
  id: 'customer_1',
  name: 'Ana Ejemplo',
  phone: '573001234567',
  document: null,
  dataTreatmentAuthorizedAt: '2026-11-01T00:00:00.000Z',
  dataTreatmentNoticeVersion: '1.0',
  dataTreatmentAuthorizationSource: 'formulario' as const,
  active: false,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('CustomerManager interfaz', () => {
  it('muestra la búsqueda antes del mensaje vacío y permite crear un cliente', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).startsWith('/api/data/customer-credit')) {
          return {
            ok: true,
            json: async () => ({ success: true, data: [] }),
          };
        }
        return {
          ok: true,
          json: async () => ({ success: true, data: { data: [], total: 0 } }),
        };
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

  it('muestra la cartera calculada y mantiene visibles los clientes inactivos con saldo', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).startsWith('/api/data/customer-credit')) {
          return {
            ok: true,
            json: async () => ({
              success: true,
              data: [
                {
                  customerId: customer.id,
                  balance: 12500,
                  oldestDebtAt: '2026-11-01T00:00:00.000Z',
                },
              ],
            }),
          };
        }
        return {
          ok: true,
          json: async () => ({ success: true, data: { data: [customer], total: 1 } }),
        };
      }),
    );

    render(<CustomerManager />);

    expect(await screen.findByText('Ana Ejemplo')).toBeInTheDocument();
    expect(screen.getByText(/Saldo pendiente.*12\.500/)).toBeInTheDocument();
    expect(screen.getByText('(Inactivo)')).toBeInTheDocument();
    expect(screen.getByText(/Total por cobrar:/).textContent).toContain('12.500');

    fireEvent.click(screen.getByRole('button', { name: 'Al día' }));
    expect(
      await screen.findByText('No hay clientes que coincidan con este filtro de cartera.'),
    ).toBeInTheDocument();
  });
});
