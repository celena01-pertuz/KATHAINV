import 'server-only';

import { z } from 'zod';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import {
  customerCreditDetailSchema,
  customerCreditOverviewResponseSchema,
  customerCreditPaymentResponseSchema,
} from './schemas';
import type { CreateCustomerCreditPaymentInput } from './types';

function databaseError(message: string): Error {
  return new Error(message);
}

export async function getCustomerCreditOverview() {
  const { data, error } = await createAdminSupabaseClient().rpc('get_customer_credit_overview');
  if (error) throw databaseError('No se pudo consultar la cartera de clientes.');

  const parsed = customerCreditOverviewResponseSchema.safeParse(
    (data as { customer_id: string; balance: number; oldest_debt_at: string | null }[]).map(
      (row) => ({
        customerId: row.customer_id,
        balance: row.balance,
        oldestDebtAt: row.oldest_debt_at,
      }),
    ),
  );
  if (!parsed.success) throw databaseError('La respuesta de cartera no tiene un formato válido.');
  return parsed.data;
}

export async function getCustomerCreditDetail(customerId: string) {
  const { data, error } = await createAdminSupabaseClient().rpc('get_customer_credit_detail', {
    p_customer_id: customerId,
  });
  if (error) throw databaseError('No se pudo consultar el detalle de la cartera.');
  if (data === null) return null;

  const parsed = customerCreditDetailSchema.safeParse(data);
  if (!parsed.success) throw databaseError('El detalle de cartera no tiene un formato válido.');
  return parsed.data;
}

export async function recordCustomerCreditPayment(
  input: CreateCustomerCreditPaymentInput,
  createdBy: string,
) {
  const { data, error } = await createAdminSupabaseClient().rpc('record_customer_credit_payment', {
    p_customer_id: input.customerId,
    p_amount: input.amount,
    p_payment_method: input.paymentMethod,
    p_note: input.note || null,
    p_request_key: input.requestKey,
    p_created_by: createdBy,
  });
  if (error) {
    throw databaseError(error.message || 'No se pudo registrar el abono.');
  }

  const row = Array.isArray(data) ? data[0] : null;
  const parsed = customerCreditPaymentResponseSchema.safeParse(
    row
      ? {
          paymentId: row.payment_id,
          paidAt: row.paid_at,
          amount: row.amount,
        }
      : null,
  );
  if (!parsed.success) throw databaseError('No se pudo confirmar el abono.');
  return parsed.data;
}

export async function voidCustomerCreditPayment(
  paymentId: number,
  reason: string,
  voidedBy: string,
) {
  const { data, error } = await createAdminSupabaseClient().rpc('void_customer_credit_payment', {
    p_payment_id: paymentId,
    p_reason: reason,
    p_voided_by: voidedBy,
  });
  if (error) throw databaseError(error.message || 'No se pudo anular el abono.');

  const parsed = z.number().int().positive().safeParse(data);
  if (!parsed.success) throw databaseError('No se pudo confirmar la anulación del abono.');
  return parsed.data;
}
