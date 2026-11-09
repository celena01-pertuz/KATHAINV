import 'server-only';

import { z } from 'zod';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { mapCreateSaleDatabaseError, SalesOperationError } from './errors';
import {
  outOfStockProductSchema,
  saleResultSchema,
  voidSaleResultSchema,
} from './schemas';
import type {
  CreateSaleInput,
  CreateSaleRpcInput,
  SaleRecord,
  SaleResult,
  VoidSaleResult,
} from './types';

interface SaleRow {
  id: number;
  sale_number: string;
  sold_at: string;
  payment_type: SaleRecord['paymentType'];
  total: number;
  status: SaleRecord['status'];
  voided_at: string | null;
  void_reason: string | null;
  customer_id: string | null;
  customer: { name: string; phone: string } | { name: string; phone: string }[] | null;
  void_audit:
    | { voided_by: string }[]
    | { voided_by: string }
    | null;
}

interface SaleRpcRow {
  sale_id: number;
  sale_number: string;
  total: number;
}

interface VoidSaleRpcRow {
  sale_id: number;
  voided_at: string;
  voided_by: string;
  void_reason: string;
  reactivated_products: unknown;
}

const productStockRowSchema = outOfStockProductSchema.extend({
  stock: z.number().int().nonnegative(),
});

const productPriceRowSchema = z.object({
  id: z.string().min(1),
  sale_price: z.number().int().positive(),
});

export async function getSaleTotal(input: CreateSaleInput): Promise<number> {
  const client = createAdminSupabaseClient();
  const productIds = [...new Set(input.items.map((item) => item.productId))];
  const { data, error } = await client
    .from('products')
    .select('id, sale_price')
    .in('id', productIds);
  if (error) {
    throw new SalesOperationError(
      'No se pudo calcular el total de la venta.',
      500,
      'SALE_TOTAL_READ_ERROR',
    );
  }

  const parsedRows = z.array(productPriceRowSchema).safeParse(data);
  if (!parsedRows.success || parsedRows.data.length !== productIds.length) {
    throw new SalesOperationError(
      'Uno o más productos ya no están disponibles.',
      400,
      'PRODUCT_UNAVAILABLE',
    );
  }
  const prices = new Map(parsedRows.data.map((row) => [row.id, row.sale_price]));
  const total = input.items.reduce((sum, item) => {
    const price = prices.get(item.productId);
    if (price === undefined) {
      throw new SalesOperationError(
        'Uno o más productos ya no están disponibles.',
        400,
        'PRODUCT_UNAVAILABLE',
      );
    }
    return sum + price * item.quantity;
  }, 0);
  if (!Number.isSafeInteger(total) || total > 2147483647) {
    throw new SalesOperationError(
      'El total de la venta supera el límite permitido.',
      400,
      'SALE_TOTAL_EXCEEDED',
    );
  }
  return total;
}

function mapSale(row: SaleRow): SaleRecord {
  return {
    id: row.id,
    saleNumber: row.sale_number,
    soldAt: row.sold_at,
    paymentType: row.payment_type,
    total: row.total,
    status: row.status,
    voidedAt: row.voided_at,
    voidedBy: Array.isArray(row.void_audit)
      ? (row.void_audit[0]?.voided_by ?? null)
      : (row.void_audit?.voided_by ?? null),
    voidReason: row.void_reason,
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
      'id, sale_number, sold_at, payment_type, total, status, voided_at, void_reason, customer_id, customer:customers(name, phone), void_audit:sale_void_audits(voided_by)',
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

export async function voidSale(
  saleId: number,
  reason: string,
  voidedBy: string,
): Promise<VoidSaleResult> {
  const client = createAdminSupabaseClient();
  const { data, error } = await client.rpc('void_sale', {
    p_sale_id: saleId,
    p_reason: reason,
    p_voided_by: voidedBy,
  });

  if (error) {
    const message = error.message;
    if (message.includes('ya fue anulada')) {
      throw new SalesOperationError('La venta ya fue anulada.', 409, 'ALREADY_VOIDED');
    }
    if (message.includes('tiene abonos')) {
      throw new SalesOperationError(
        'Esta venta tiene abonos. Anula primero esos abonos y luego la venta.',
        409,
        'SALE_HAS_ACTIVE_INSTALLMENTS',
      );
    }
    if (message.includes('no existe')) {
      throw new SalesOperationError('No se encontró la venta indicada.', 404, 'NOT_FOUND');
    }
    if (message.includes('stock máximo')) {
      throw new SalesOperationError(
        'La devolución supera el stock máximo permitido.',
        409,
        'STOCK_LIMIT_EXCEEDED',
      );
    }
    if (message.includes('motivo de anulación')) {
      throw new SalesOperationError(
        'El motivo de anulación es obligatorio y no puede superar 500 caracteres.',
        400,
        'VALIDATION_ERROR',
      );
    }
    throw new SalesOperationError(
      'No se pudo anular la venta. Inténtalo más tarde.',
      500,
      'SALE_VOID_ERROR',
    );
  }

  const row = (data as VoidSaleRpcRow[] | null)?.[0];
  const parsed = row
    ? voidSaleResultSchema.safeParse({
        saleId: row.sale_id,
        voidedAt: row.voided_at,
        voidedBy: row.voided_by,
        voidReason: row.void_reason,
        reactivatedProducts: row.reactivated_products,
      })
    : null;
  if (!parsed?.success) {
    throw new SalesOperationError(
      'No se pudo confirmar la anulación de la venta.',
      500,
      'SALE_VOID_ERROR',
    );
  }
  return parsed.data;
}

export async function createSale(
  input: CreateSaleRpcInput,
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
    p_initial_payment: input.paymentType === 'cash' ? null : (input.initialPayment ?? 0),
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
