import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const { createAdminSupabaseClientMock, rpcMock, getPublicReceiptMock } = vi.hoisted(() => ({
  createAdminSupabaseClientMock: vi.fn(),
  rpcMock: vi.fn(),
  getPublicReceiptMock: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminSupabaseClient: createAdminSupabaseClientMock,
}));
vi.mock('../service', () => ({
  getPublicReceipt: getPublicReceiptMock,
}));

import ReceiptPage from '@/app/receipt/[token]/page';
import { findPublicReceipt } from '../supabase-repository';

describe('comprobante público', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createAdminSupabaseClientMock.mockReturnValue({ rpc: rpcMock });
  });

  it('solo expone los campos públicos del recibo y los productos', async () => {
    rpcMock.mockResolvedValue({
      data: {
        sale_number: 'V-000014',
        sold_at: '2026-10-30T12:00:00.000Z',
        status: 'active',
        payment_type: 'cash',
        items: [
          {
            name: 'Blusa',
            size: 'M',
            color: 'Azul',
            quantity: 1,
            unit_price: 25000,
            cost: 8000,
            product_id: 'private-id',
          },
        ],
        total: 25000,
        paid: 25000,
        balance: 0,
        customer_name: 'Dato privado',
        customer_phone: '573001112233',
        created_by: 'owner@example.test',
      },
      error: null,
    });

    const receipt = await findPublicReceipt('a'.repeat(64));

    expect(receipt).toEqual({
      sale_number: 'V-000014',
      sold_at: '2026-10-30T12:00:00.000Z',
      status: 'active',
      payment_type: 'cash',
      items: [{ name: 'Blusa', size: 'M', color: 'Azul', quantity: 1, unit_price: 25000 }],
      total: 25000,
      paid: 25000,
      balance: 0,
    });
    expect(receipt).not.toHaveProperty('customer_name');
    expect(receipt?.items[0]).not.toHaveProperty('cost');
  });

  it('muestra el mismo mensaje cuando el recibo no existe o fue revocado', async () => {
    getPublicReceiptMock.mockResolvedValue(null);
    const page = await ReceiptPage({ params: Promise.resolve({ token: 'token-no-disponible' }) });

    expect(renderToStaticMarkup(page)).toContain('Este comprobante no está disponible');
    expect(getPublicReceiptMock).toHaveBeenCalledWith('token-no-disponible');
  });
});
