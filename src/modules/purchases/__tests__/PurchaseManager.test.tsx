import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

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

    const totalInput = await screen.findByLabelText('Total pagado (COP, pesos enteros)');
    expect(totalInput).toHaveAttribute('type', 'number');
    expect(totalInput).toHaveAttribute('inputmode', 'numeric');
    expect(totalInput).toHaveAttribute('min', '0');
    expect(totalInput).toHaveAttribute('step', '1');

    expect(screen.getByText(/\$\s*12\.000/)).toBeInTheDocument();
  });
});
