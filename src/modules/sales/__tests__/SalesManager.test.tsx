import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CustomerRecord } from '@/modules/customers/types';
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

const existingCustomer: CustomerRecord = {
  id: 'customer_1',
  name: 'Cliente existente',
  phone: '573001234567',
  document: null,
  dataTreatmentAuthorizedAt: '2026-10-30T00:00:00.000Z',
  dataTreatmentNoticeVersion: '1.0',
  dataTreatmentAuthorizationSource: 'formulario',
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

function setupSalesApi(
  initialCustomers: CustomerRecord[] = [],
  outOfStock: { id: string; code: string; name: string; size: string; color: string }[] = [],
) {
  const postBodies: Record<string, unknown>[] = [];
  const customerPostBodies: Record<string, unknown>[] = [];
  const customers = [...initialCustomers];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.startsWith('/api/data/sales') && init?.method !== 'POST') {
      return jsonResponse({ data: [], total: 0 });
    }
    if (url.startsWith('/api/data/customers?phone=')) {
      const phone = new URLSearchParams(url.split('?')[1]).get('phone');
      return jsonResponse({
        duplicatePhone: customers.some((customer) => customer.phone === phone),
      });
    }
    if (url.startsWith('/api/data/customers?customerId=')) {
      const customerId = new URLSearchParams(url.split('?')[1]).get('customerId');
      const customer = customers.find((entry) => entry.id === customerId);
      return customer
        ? jsonResponse(customer)
        : jsonResponse({ error: 'No encontrado.' }, 404);
    }
    if (url.startsWith('/api/data/customers?q=')) {
      return jsonResponse({ data: customers, total: customers.length });
    }
    if (url === '/api/data/customers' && init?.method === 'POST') {
      const body = JSON.parse(String(init.body)) as Record<string, unknown>;
      customerPostBodies.push(body);
      const customer: CustomerRecord = {
        ...existingCustomer,
        id: 'customer_new',
        name: String(body.name),
        phone: String(body.phone),
      };
      customers.push(customer);
      return jsonResponse({ customer, duplicatePhone: false }, 201);
    }
    if (url.startsWith('/api/data/products?code=')) {
      return jsonResponse(product);
    }
    if (url === '/api/data/sales' && init?.method === 'POST') {
      postBodies.push(JSON.parse(String(init.body)) as Record<string, unknown>);
      return jsonResponse(
        {
          saleId: 1,
          saleNumber: 'V-000001',
          total: 12500,
          outOfStock,
          treatedAsCash: false,
        },
        201,
      );
    }
    throw new Error('Ruta inesperada en la prueba.');
  });
  vi.stubGlobal('crypto', { randomUUID: vi.fn(() => '9c77dcc1-6f9c-4581-8cde-7c75d5bc9908') });
  vi.stubGlobal('fetch', fetchMock);
  return { fetchMock, postBodies, customerPostBodies };
}

async function addProductByCode() {
  fireEvent.change(screen.getByLabelText('Código de barras o del producto'), {
    target: { value: 'KAT-000001' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Agregar por código' }));
  await screen.findByText('Camisa de prueba');
}

function openNewCustomerForm() {
  fireEvent.click(screen.getByRole('button', { name: 'Nuevo cliente' }));
  return screen.getByTestId('new-customer-form');
}

function fillNewCustomerForm({ authorization = true, phone = '3001234567' } = {}) {
  fireEvent.change(screen.getByLabelText('Nombre'), {
    target: { value: 'Ana Prueba' },
  });
  fireEvent.change(screen.getByLabelText(/^Teléfono/), {
    target: { value: phone },
  });
  if (authorization) {
    fireEvent.click(
      screen.getByLabelText('El cliente leyó y autorizó el tratamiento de sus datos.'),
    );
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SalesManager interfaz', () => {
  it('preselecciona el cliente activo de customerId y abre A crédito', async () => {
    setupSalesApi([existingCustomer]);
    window.history.replaceState({}, '', '/sales?customerId=customer_1');
    render(<SalesManager />);

    expect(await screen.findByText('Cliente existente · 573001234567')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'A crédito' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    window.history.replaceState({}, '', '/sales');
  });

  it('muestra paga hoy, saldo pendiente y total para una venta a crédito', async () => {
    setupSalesApi([existingCustomer]);
    window.history.replaceState({}, '', '/sales?customerId=customer_1');
    render(<SalesManager />);
    await screen.findByText('Cliente existente · 573001234567');
    await addProductByCode();

    fireEvent.change(screen.getByLabelText('¿Cuánto paga hoy?'), {
      target: { value: '5000' },
    });

    expect(screen.getByText('Paga hoy')).toBeInTheDocument();
    expect(screen.getByText('Saldo pendiente')).toBeInTheDocument();
    expect(screen.getByText(/7\.500/)).toBeInTheDocument();
    expect(screen.getByTestId('sale-total').textContent?.replace(/\D/g, '')).toBe('12500');
    window.history.replaceState({}, '', '/sales');
  });

  it('muestra el mensaje vacío y una sola acción principal para registrar la venta', async () => {
    setupSalesApi();
    const { container } = render(<SalesManager />);

    expect(await screen.findByText('Todavía no hay ventas.')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-primary-action]')).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Registrar venta' })).toHaveLength(1);
  });

  it('calcula el total con los precios de los productos agregados', async () => {
    setupSalesApi();
    render(<SalesManager />);

    await addProductByCode();

    expect(screen.getByTestId('sale-total').textContent?.replace(/\D/g, '')).toBe('12500');
  });

  it('quita un producto del resumen y actualiza el total', async () => {
    setupSalesApi();
    render(<SalesManager />);
    await addProductByCode();

    fireEvent.click(screen.getByRole('button', { name: 'Quitar Camisa de prueba' }));

    expect(screen.queryByText('Camisa de prueba')).not.toBeInTheDocument();
    expect(screen.getByTestId('sale-total').textContent?.replace(/\D/g, '')).toBe('0');
  });

  it('no permite registrar una venta sin productos', async () => {
    const { fetchMock } = setupSalesApi();
    render(<SalesManager />);
    await screen.findByText('Todavía no hay ventas.');

    fireEvent.submit(screen.getByTestId('sale-form'));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Completa los datos de la venta antes de continuar.',
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      '/api/data/sales',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('muestra el panel del comprobante después de registrar la venta', async () => {
    setupSalesApi();
    render(<SalesManager />);
    await addProductByCode();
    fireEvent.change(screen.getByLabelText('Medio de pago'), {
      target: { value: 'efectivo' },
    });

    fireEvent.submit(screen.getByTestId('sale-form'));

    expect(await screen.findByRole('region', { name: 'Comprobante de venta' })).toBeInTheDocument();
    expect(screen.getByText('5. Comprobante de V-000001')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nueva venta' })).toBeInTheDocument();
  });

  it('muestra el aviso singular, permite reponer y cerrar el aviso', async () => {
    setupSalesApi([], [
      {
        id: product.id,
        code: product.code,
        name: product.name,
        size: product.size,
        color: product.color,
      },
    ]);
    render(<SalesManager />);
    await addProductByCode();
    fireEvent.change(screen.getByLabelText('Medio de pago'), {
      target: { value: 'efectivo' },
    });
    fireEvent.submit(screen.getByTestId('sale-form'));

    expect(await screen.findByText(/^Se agotó:/)).toHaveTextContent(
      'Se agotó: Camisa de prueba, talla M, color Azul',
    );
    expect(screen.getByRole('link', { name: 'Reponer' })).toHaveAttribute('href', '/purchases');

    fireEvent.click(screen.getByRole('button', { name: 'Entendido' }));

    expect(screen.queryByText('Se agotó:')).not.toBeInTheDocument();
  });

  it('usa el aviso plural cuando se agotan varios productos', async () => {
    setupSalesApi([], [
      { id: product.id, code: product.code, name: product.name, size: product.size, color: product.color },
      {
        id: 'product_2',
        code: 'KAT-000002',
        name: 'Falda de prueba',
        size: 'S',
        color: 'Negro',
      },
    ]);
    render(<SalesManager />);
    await addProductByCode();
    fireEvent.change(screen.getByLabelText('Medio de pago'), {
      target: { value: 'efectivo' },
    });
    fireEvent.submit(screen.getByTestId('sale-form'));

    expect(await screen.findByText(/^Se agotaron:/)).toHaveTextContent(
      'Se agotaron: Camisa de prueba, talla M, color Azul; Falda de prueba, talla S, color Negro',
    );
  });

  it('limpia el aviso al iniciar una nueva venta', async () => {
    setupSalesApi([], [
      {
        id: product.id,
        code: product.code,
        name: product.name,
        size: product.size,
        color: product.color,
      },
    ]);
    render(<SalesManager />);
    await addProductByCode();
    fireEvent.change(screen.getByLabelText('Medio de pago'), {
      target: { value: 'efectivo' },
    });
    fireEvent.submit(screen.getByTestId('sale-form'));

    await screen.findByRole('button', { name: 'Nueva venta' });
    fireEvent.click(screen.getByRole('button', { name: 'Nueva venta' }));

    expect(screen.queryByText('Se agotó:')).not.toBeInTheDocument();
  });

  it('guarda y selecciona un cliente nuevo para la venta', async () => {
    const { customerPostBodies } = setupSalesApi();
    render(<SalesManager />);
    const form = openNewCustomerForm();
    fillNewCustomerForm();

    fireEvent.submit(form);

    expect(await screen.findByText('Ana Prueba · 573001234567')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Cliente guardado y seleccionado para esta venta.',
    );
    expect(customerPostBodies[0]).toMatchObject({
      name: 'Ana Prueba',
      phone: '573001234567',
      document: '',
      authorization: {
        accepted: true,
        noticeVersion: '1.0',
        source: 'formulario',
      },
    });
  });

  it('muestra un error claro cuando el teléfono no es válido', async () => {
    const { customerPostBodies } = setupSalesApi();
    render(<SalesManager />);
    const form = openNewCustomerForm();
    fillNewCustomerForm({ phone: '1234' });

    fireEvent.submit(form);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ingresa un celular colombiano válido de 10 dígitos.',
    );
    expect(customerPostBodies).toHaveLength(0);
  });

  it('no guarda si falta la autorización de tratamiento de datos', async () => {
    const { customerPostBodies } = setupSalesApi();
    render(<SalesManager />);
    const form = openNewCustomerForm();
    fillNewCustomerForm({ authorization: false });

    fireEvent.submit(form);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Debes registrar la autorización de tratamiento de datos.',
    );
    expect(customerPostBodies).toHaveLength(0);
  });

  it('conserva productos, cantidades y forma de pago al crear un cliente', async () => {
    setupSalesApi();
    render(<SalesManager />);
    await addProductByCode();
    fireEvent.change(screen.getByLabelText('Cantidad de Camisa de prueba'), {
      target: { value: '2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'A crédito' }));
    fireEvent.change(screen.getByLabelText('¿Cuánto paga hoy?'), {
      target: { value: '5000' },
    });
    const form = openNewCustomerForm();
    fillNewCustomerForm();

    fireEvent.submit(form);

    await screen.findByText('Ana Prueba · 573001234567');
    expect(screen.getByLabelText('Cantidad de Camisa de prueba')).toHaveValue(2);
    expect(screen.getByLabelText('¿Cuánto paga hoy?')).toHaveValue('5.000');
    expect(screen.getByRole('button', { name: 'A crédito' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('sale-total').textContent?.replace(/\D/g, '')).toBe('25000');
  });

  it('selecciona el cliente existente cuando el teléfono ya está registrado', async () => {
    const { customerPostBodies } = setupSalesApi([existingCustomer]);
    render(<SalesManager />);
    const form = openNewCustomerForm();
    fillNewCustomerForm();

    fireEvent.submit(form);

    expect(await screen.findByText('Cliente existente · 573001234567')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Ese teléfono ya estaba registrado. Seleccionamos el cliente existente.',
    );
    expect(customerPostBodies).toHaveLength(0);
  });
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
        return jsonResponse(
          {
            saleId: 1,
            saleNumber: 'V-000001',
            total: 12500,
            outOfStock: [],
            treatedAsCash: false,
          },
          201,
        );
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
    fireEvent.change(screen.getByLabelText('Medio de pago'), {
      target: { value: 'efectivo' },
    });

    fireEvent.submit(screen.getByTestId('sale-form'));
    await screen.findByText('Network unavailable');
    fireEvent.submit(screen.getByTestId('sale-form'));

    await screen.findByText('Venta V-000001 registrada correctamente.');
    await waitFor(() => expect(postBodies).toHaveLength(2));
    expect(postBodies[0].requestKey).toBe('9c77dcc1-6f9c-4581-8cde-7c75d5bc9908');
    expect(postBodies[1].requestKey).toBe(postBodies[0].requestKey);
    expect(randomUUID).toHaveBeenCalledTimes(2);
  });
});
