import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ProductRecord } from '@/modules/products/types';
import type { ProductSalesReport } from '@/modules/reports/types';
import { HomeDashboard } from '../HomeDashboard';
import { getGreetingName } from '../../home-utils';

const today = '2026-11-07';
const yesterday = '2026-11-06';

function product(id: string, stock: number, minStock: number, active = true): ProductRecord {
  return {
    id,
    code: id,
    codeType: 'factory',
    variantGroupId: `group-${id}`,
    name: `Producto ${id}`,
    category: 'ropa',
    size: 'M',
    color: 'Negro',
    costPrice: 100,
    salePrice: 200,
    stock,
    minStock,
    active,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

const report: ProductSalesReport = {
  summary: { salesCount: 4, totalSold: 123456, unitsSold: 11 },
  mostSold: [
    {
      id: 'a',
      code: 'a',
      name: 'Blusa',
      size: 'M',
      color: 'Azul',
      active: true,
      unitsSold: 5,
      totalSold: 50000,
    },
    {
      id: 'b',
      code: 'b',
      name: 'Pantalón',
      size: 'S',
      color: 'Negro',
      active: true,
      unitsSold: 3,
      totalSold: 30000,
    },
    {
      id: 'c',
      code: 'c',
      name: 'Vestido',
      size: 'L',
      color: 'Rosa',
      active: true,
      unitsSold: 2,
      totalSold: 20000,
    },
    {
      id: 'd',
      code: 'd',
      name: 'Bolso',
      size: 'Única',
      color: 'Beige',
      active: true,
      unitsSold: 1,
      totalSold: 10000,
    },
  ],
  leastSold: [],
};

const products = [
  product('agotado-1', 0, 0),
  product('agotado-2', 0, 2),
  product('poco-1', 1, 2),
  product('poco-2', 2, 2),
  product('poco-3', 3, 3),
  product('poco-4', 4, 4),
  product('normal', 8, 2),
  product('inactivo', 0, 2, false),
];

const fetchMock = vi.fn();

function apiResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({ success: status < 300, data }),
  };
}

function useSuccessfulResponses(
  dailyReport: ProductSalesReport = report,
  inventory: ProductRecord[] = products,
) {
  fetchMock.mockImplementation(async (resource: RequestInfo | URL) => {
    const url = new URL(String(resource), 'http://localhost');
    if (url.pathname.endsWith('/profile')) return apiResponse({ fullName: 'Celena Pertuz' });
    return url.pathname.endsWith('/reports')
      ? apiResponse(dailyReport)
      : apiResponse({ data: inventory, total: inventory.length });
  });
}

function renderHome(initialDisplayName: string | null = null) {
  return render(
    <HomeDashboard
      greeting="Buenos días"
      greetingName="Celena"
      initialDisplayName={initialDisplayName}
      today={today}
    />,
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('HomeDashboard', () => {
  it('muestra la tarjeta solo si falta el nombre y permite guardarlo o cambiarlo', async () => {
    useSuccessfulResponses();
    const { unmount } = renderHome(null);

    expect(screen.getByRole('region', { name: 'Completar nombre' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('¿Cómo te llamamos?'), {
      target: { value: 'Celena Pertuz' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(
      await screen.findByRole('heading', { name: 'Buenos días, Celena Pertuz' }),
    ).toBeInTheDocument();
    expect(await screen.findByText(/\$[\s\u00a0]*123\.456/)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Completar nombre' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cambiar mi nombre' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/profile',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ fullName: 'Celena Pertuz' }),
      }),
    );

    unmount();
    renderHome('Celena Pertuz');
    expect(screen.queryByRole('region', { name: 'Completar nombre' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cambiar mi nombre' })).toBeInTheDocument();
    expect(await screen.findByText(/\$[\s\u00a0]*123\.456/)).toBeInTheDocument();
  });

  it('shows the greeting, three quick actions, daily totals, top three and at most five restock products', async () => {
    useSuccessfulResponses();
    renderHome();

    expect(screen.getByRole('heading', { name: 'Buenos días, Celena' })).toBeInTheDocument();
    expect(await screen.findByText(/\$[\s\u00a0]*123\.456/)).toBeInTheDocument();
    expect(screen.getByText('4', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Nueva venta' })).toHaveAttribute('href', '/sales');
    expect(screen.getByRole('link', { name: 'Escanear' })).toHaveAttribute('href', '/scan');
    expect(screen.getByRole('link', { name: 'Registrar producto' })).toHaveAttribute(
      'href',
      '/products',
    );
    expect(screen.getByText('Blusa')).toBeInTheDocument();
    expect(screen.getByText('Talla M · Color Azul')).toBeInTheDocument();
    expect(screen.getByText('5 unidades')).toBeInTheDocument();
    expect(screen.queryByText('Bolso')).not.toBeInTheDocument();

    const restock = screen.getByRole('heading', { name: 'Por reponer' }).closest('section');
    const topSellers = screen.getByRole('heading', { name: 'Lo más vendido' }).closest('section');
    if (!restock || !topSellers) throw new Error('No se encontraron las secciones del reporte.');

    const restockItems = within(restock).getAllByRole('listitem');
    expect(restockItems).toHaveLength(5);
    expect(restockItems[0]).toHaveTextContent('Producto agotado-1');
    expect(restockItems[0]).toHaveTextContent('Agotado');
    expect(restockItems[1]).toHaveTextContent('Producto agotado-2');
    expect(restock).not.toHaveTextContent('Producto poco-4');
    expect(restock).not.toHaveTextContent('Producto normal');
    expect(restock).not.toHaveTextContent('Producto inactivo');
    expect(within(topSellers).getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByRole('link', { name: 'Ver reporte completo' })).toHaveAttribute(
      'href',
      '/reports',
    );
  });

  it('uses the email prefix for the greeting without rendering the full email', async () => {
    const email = 'celena@example.com';
    useSuccessfulResponses();
    render(
      <HomeDashboard
        greeting="Buenas tardes"
        greetingName={getGreetingName(null, email)}
        today={today}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Buenas tardes, Celena' })).toBeInTheDocument();
    await screen.findByText(/\$[\s\u00a0]*123\.456/);
    expect(screen.queryByText(email)).not.toBeInTheDocument();
  });

  it('starts on Hoy, queries one Bogota day, and switches to Ayer or a past picked date', async () => {
    useSuccessfulResponses();
    renderHome();

    await screen.findByText(/\$[\s\u00a0]*123\.456/);
    expect(screen.getByText('Este es tu reporte de hoy.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hoy' })).toHaveAttribute('aria-pressed', 'true');
    expect(
      fetchMock.mock.calls.some(([resource]) =>
        String(resource).includes(`from=${today}&to=${today}`),
      ),
    ).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Ayer' }));
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([resource]) =>
          String(resource).includes(`from=${yesterday}&to=${yesterday}`),
        ),
      ).toBe(true);
    });
    expect(screen.getByRole('button', { name: 'Ayer' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Hoy' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Este es tu reporte de ayer.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Hoy' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Hoy' })).toHaveAttribute('aria-pressed', 'true');
    });

    fireEvent.change(screen.getByLabelText('Elegir fecha'), {
      target: { value: '2026-11-05' },
    });
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([resource]) =>
          String(resource).includes('from=2026-11-05&to=2026-11-05'),
        ),
      ).toBe(true);
    });
    expect(screen.getByText('Este es tu reporte del 5 de noviembre.')).toBeInTheDocument();
  });

  it('does not accept a future date and marks today as the date limit', async () => {
    useSuccessfulResponses();
    renderHome();
    await screen.findByText(/\$[\s\u00a0]*123\.456/);

    const dateInput = screen.getByLabelText('Elegir fecha');
    expect(dateInput).toHaveAttribute('max', today);
    fireEvent.change(dateInput, { target: { value: '2026-11-08' } });

    expect(dateInput).toHaveValue(today);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('shows the friendly empty-day and no-restock messages', async () => {
    useSuccessfulResponses(
      { summary: { salesCount: 0, totalSold: 0, unitsSold: 0 }, mostSold: [], leastSold: [] },
      [],
    );
    renderHome();

    expect(await screen.findByText('Hoy todavía no hay ventas.')).toBeInTheDocument();
    expect(screen.getByText('Todo el inventario está al día.')).toBeInTheDocument();
    expect(screen.getByText(/\$[\s\u00a0]*0/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver reporte completo' })).toHaveAttribute(
      'href',
      '/reports',
    );
  });

  it('hides technical errors and retries the daily data request', async () => {
    fetchMock.mockRejectedValueOnce(new Error('database connection detail'));
    useSuccessfulResponsesAfterFailure();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderHome();

    expect(
      await screen.findByText('No pudimos cargar el reporte. Intenta de nuevo.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/database connection detail/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver reporte completo' })).toHaveAttribute(
      'href',
      '/reports',
    );
    expect(consoleError).toHaveBeenCalledWith(
      '[Inicio] No se pudo cargar el reporte diario.',
      expect.objectContaining({ message: 'database connection detail' }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText(/\$[\s\u00a0]*123\.456/)).toBeInTheDocument();
    consoleError.mockRestore();
  });

  it('shows a soft skeleton while the report is loading', () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    renderHome();

    expect(screen.getByRole('status', { name: 'Cargando reporte' })).toBeInTheDocument();
  });
});

function useSuccessfulResponsesAfterFailure() {
  fetchMock.mockImplementation(async (resource: RequestInfo | URL) => {
    const url = new URL(String(resource), 'http://localhost');
    return url.pathname.endsWith('/reports')
      ? apiResponse(report)
      : apiResponse({ data: products, total: products.length });
  });
}
