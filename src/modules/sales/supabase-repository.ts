import 'server-only';

import { z } from 'zod';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { mapCreateSaleDatabaseError, SalesOperationError } from './errors';
import { outOfStockProductSchema, saleResultSchema } from './schemas';
import type { CreateSaleInput, SaleRecord, SaleResult } from './types';

interface SaleRow {
  id: number;
  sale_number: string;
  sold_at: string;
  payment_type: SaleRecord['paymentType'];
  total: number;
  status: SaleRecord['status'];
  customer_id: string | null;
  customer:
    | { name: string; phone: string }
    | { name: string; phone: string }[]
    | null;
}

interface SaleRpcRow {
  sale_id: number;
  sale_number: string;
  total: number;
}

const productStockRowSchema = outOfStockProductSchema.extend({
  stock: z.number().int().nonnegative(),
});

function mapSale(row: SaleRow): SaleRecord {
  return {
    id: row.id,
    saleNumber: row.sale_number,
    soldAt: row.sold_at,
    paymentType: row.payment_type,
    total: row.total,
    status: row.status,
    customerId: row.customer_id,
    customerName: Array.isArray(row.customer)
      ? (row.customer[0]?.name ?? null)
      : (row.customer?.name ?? null),
    customerPhone: Array.isArray(row.customer)
      ? (row.customer[0]?.phone ?? null)
      : (row.customer?.phone ?? null),
  };
}

async function readOutOfStockProducts(
  client: ReturnType<typeof createAdminSupabaseClient>,
  productIds: string[],
) {
  try {
    const { data, error } = await client
      .from('products')
      .select('id, code, name, size, color, stock')
      .in('id', [...new Set(productIds)]);

    if (error) throw new Error('Product stock query failed.');

    const parsedRows = z.array(productStockRowSchema).safeParse(data);
    if (!parsedRows.success) throw new Error('Product stock response was invalid.');

    return parsedRows.data
      .filter((product) => product.stock === 0)
      .map(({ stock: _stock, ...product }) => outOfStockProductSchema.parse(product));
  } catch {
    console.error('[Ventas] No se pudo leer el stock actual para el aviso de agotados.');
    return [];
  }
}

export async function listRecentSales(limit = 20): Promise<SaleRecord[]> {
  const client = createAdminSupabaseClient();
  const { data, error } = await client
    .from('sales')
    .select(
      'id, sale_number, sold_at, payment_type, total, status, customer_id, customer:customers(name, phone)',
    )
    .order('sold_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new SalesOperationError(
      'No se pudieron consultar las ventas recientes.',
      500,
      'SALE_READ_ERROR',
    );
  }

  return (data as SaleRow[]).map(mapSale);
}

export async function createSale(
  input: CreateSaleInput,
  createdBy: string,
): Promise<SaleResult> {
  const client = createAdminSupabaseClient();
  const { data, error } = await client.rpc('create_sale', {
    p_customer_id: input.customerId,
    p_items: input.items.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
    })),
    p_payment_type: input.paymentType,
    p_initial_payment:
      input.paymentType === 'cash' ? null : (input.initialPayment ?? 0),
    p_payment_method: input.paymentMethod,
    p_request_key: input.requestKey,
    p_created_by: createdBy,
  });

  if (error) throw mapCreateSaleDatabaseError(error);

  const row = (data as SaleRpcRow[] | null)?.[0];
  if (!row) {
    throw new SalesOperationError(
      'No se pudo completar la venta. Inténtalo más tarde.',
      500,
      'SALE_OPERATION_ERROR',
    );
  }

  const outOfStock = await readOutOfStockProducts(
    client,
    input.items.map((item) => item.productId),
  );

  return saleResultSchema.parse({
    saleId: row.sale_id,
    saleNumber: row.sale_number,
    total: row.total,
    outOfStock,
  });
}
