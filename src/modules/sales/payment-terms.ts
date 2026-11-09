import { SalesOperationError } from './errors';
import { CUSTOMER_CREDIT_LABELS } from '@/modules/customer-credit/labels';
import type { CreateSaleInput, SalePaymentMethod, SalePaymentType } from './types';

export interface ResolvedSalePayment {
  paymentType: SalePaymentType;
  initialPayment: number | null;
  paymentMethod: SalePaymentMethod | null;
  treatedAsCash: boolean;
}

export function resolveSalePayment(
  input: Pick<CreateSaleInput, 'paymentType' | 'initialPayment' | 'paymentMethod'>,
  customerId: string | null,
  total: number,
): ResolvedSalePayment {
  if (!Number.isSafeInteger(total) || total <= 0) {
    throw new SalesOperationError('El total de la venta no es válido.', 400, 'INVALID_TOTAL');
  }
  if (input.paymentType === 'cash') {
    if (!input.paymentMethod) {
      throw new SalesOperationError(
        CUSTOMER_CREDIT_LABELS.paymentMethodRequired,
        400,
        'PAYMENT_METHOD_REQUIRED',
      );
    }
    return {
      paymentType: 'cash',
      initialPayment: null,
      paymentMethod: input.paymentMethod,
      treatedAsCash: false,
    };
  }

  if (!customerId) {
    throw new SalesOperationError(
      CUSTOMER_CREDIT_LABELS.customerRequired,
      400,
      'CUSTOMER_REQUIRED',
    );
  }
  const amount = input.initialPayment;
  if (amount === null || !Number.isSafeInteger(amount) || amount < 0) {
    throw new SalesOperationError('El pago de hoy no es válido.', 400, 'INVALID_INITIAL_PAYMENT');
  }
  if (amount > total) {
    throw new SalesOperationError(
      CUSTOMER_CREDIT_LABELS.paymentExceedsTotal,
      400,
      'INITIAL_PAYMENT_EXCEEDS_TOTAL',
    );
  }

  if (amount === total) {
    if (!input.paymentMethod) {
      throw new SalesOperationError(
        CUSTOMER_CREDIT_LABELS.paymentMethodRequired,
        400,
        'PAYMENT_METHOD_REQUIRED',
      );
    }
    return {
      paymentType: 'cash',
      initialPayment: null,
      paymentMethod: input.paymentMethod,
      treatedAsCash: true,
    };
  }

  if (amount === 0) {
    return {
      paymentType: 'credit',
      initialPayment: 0,
      paymentMethod: null,
      treatedAsCash: false,
    };
  }
  if (!input.paymentMethod) {
    throw new SalesOperationError(
      CUSTOMER_CREDIT_LABELS.paymentMethodRequired,
      400,
      'PAYMENT_METHOD_REQUIRED',
    );
  }
  return {
    paymentType: 'partial',
    initialPayment: amount,
    paymentMethod: input.paymentMethod,
    treatedAsCash: false,
  };
}
