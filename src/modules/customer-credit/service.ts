import 'server-only';

import {
  getCustomerCreditDetail as readCustomerCreditDetail,
  getCustomerCreditOverview as readCustomerCreditOverview,
  recordCustomerCreditPayment as writeCustomerCreditPayment,
  voidCustomerCreditPayment as writeVoidCustomerCreditPayment,
} from './repository';
import { CUSTOMER_CREDIT_LABELS } from './labels';
import type { CreateCustomerCreditPaymentInput } from './types';

export class CustomerCreditOperationError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = 'CustomerCreditOperationError';
  }
}

export async function getCustomerCreditOverview() {
  return readCustomerCreditOverview();
}

export async function getCustomerCreditDetail(customerId: string) {
  return readCustomerCreditDetail(customerId);
}

export async function recordCustomerCreditPayment(
  input: CreateCustomerCreditPaymentInput,
  createdBy: string,
) {
  try {
    return await writeCustomerCreditPayment(input, createdBy);
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    if (error.message.includes('supera el saldo pendiente')) {
      throw new CustomerCreditOperationError(
        CUSTOMER_CREDIT_LABELS.paymentExceedsBalance,
        409,
        'PAYMENT_EXCEEDS_BALANCE',
      );
    }
    if (error.message.includes('no existe')) {
      throw new CustomerCreditOperationError(
        'No se encontró el cliente indicado.',
        404,
        'NOT_FOUND',
      );
    }
    if (error.message.includes('clave de solicitud')) {
      throw new CustomerCreditOperationError(
        'La solicitud ya fue registrada con otros datos.',
        409,
        'REQUEST_KEY_CONFLICT',
      );
    }
    throw error;
  }
}

export async function voidCustomerCreditPayment(
  paymentId: number,
  reason: string,
  voidedBy: string,
) {
  try {
    return await writeVoidCustomerCreditPayment(paymentId, reason, voidedBy);
  } catch (error) {
    if (error instanceof Error && error.message.includes('ya fue anulado')) {
      throw new CustomerCreditOperationError('El abono ya fue anulado.', 409, 'ALREADY_VOIDED');
    }
    if (error instanceof Error && error.message.includes('no existe')) {
      throw new CustomerCreditOperationError('No se encontró el abono indicado.', 404, 'NOT_FOUND');
    }
    throw error;
  }
}
