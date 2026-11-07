import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('@/modules/products/components/ProductBarcodeCamera', () => ({
  ProductBarcodeCamera: () => null,
}));

import { PurchaseManager } from '../components/PurchaseManager';

const fetchMock = vi.fn();

const recentPurchase = {
  id: 'purchase_1',
  productCode: 'KAT-000001',
  supplierId: 'supplier_1',
  quantity: 2,
  total: 12000,
  date: '2026-10-31',
  createdAt: '2026-10-31T12:00:00.000Z',
  updatedAt: '2026-10-31T12:00:00.000Z',
  supplierName: 'Proveedor Uno',
  productName: 'Blusa azul',
};

beforeEach(() => {
  fetchMock.mockImplementation(async (resource: RequestInfo | URL) => {
    const url = String(resource);
    const data = url.includes('/purchases')
      ? { data: [recentPurchase] }
      : { data: [] };
    return {
      ok: true,
      json: async () => ({ success: true, data }),
    };
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('PurchaseManager', () => {
  it('accepts only whole-peso input and displays COP without decimals', async () => {
    render(<PurchaseManager />);

    expect(await screen.findByRole('heading', { name: 'Proveedores' })).toBeInTheDocument();
    expect(screen.getByText('Compra de mercancía a tus proveedores')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Compra a proveedor' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Compras recientes' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Registrar compra' })).not.toBeInTheDocument();

    const totalInput = await screen.findByLabelText('Total pagado (COP, pesos enteros)');
    expect(totalInput).toHaveAttribute('type', 'number');
    expect(totalInput).toHaveAttribute('inputmode', 'numeric');
    expect(totalInput).toHaveAttribute('min', '0');
    expect(totalInput).toHaveAttribute('step', '1');

    expect(screen.getByRole('button', { name: 'Guardar compra' })).toBeDisabled();
    expect(screen.getByText(/\$\s*12\.000/)).toBeInTheDocument();
  });

  it('labels the supplier registration section Nuevo proveedor', async () => {
    render(<PurchaseManager />);

    fireEvent.click(await screen.findByRole('button', { name: 'Nuevo proveedor' }));

    expect(screen.getByRole('heading', { name: 'Nuevo proveedor' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre del proveedor')).toBeInTheDocument();
  });
});
