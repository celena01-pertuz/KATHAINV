import { CUSTOMER_CREDIT_LABELS } from '@/modules/customer-credit/labels';

const databaseValidationMessages = new Set([
  'El tipo de pago no es válido.',
  'El pago inicial no es válido.',
  'Se necesita un cliente registrado para fiar o pagar parcialmente.',
  'El cliente no está disponible.',
  'La venta debe incluir al menos un producto.',
  'Los productos o sus cantidades no son válidos.',
  'Una cantidad supera el límite permitido.',
  'Cada producto debe aparecer una sola vez en la venta.',
  'Uno o más productos no están disponibles.',
  'Stock insuficiente para uno o más productos.',
  'El total de la venta supera el límite permitido.',
  'Una venta fiada no puede incluir un pago inicial.',
  'El pago parcial debe ser mayor que cero y menor que el total.',
  'El método de pago no es válido.',
  'La clave de solicitud es obligatoria.',
  'El correo de quien registra la venta es obligatorio.',
]);

const userFacingDatabaseMessages = new Map([
  [
    'Se necesita un cliente registrado para fiar o pagar parcialmente.',
    CUSTOMER_CREDIT_LABELS.customerRequired,
  ],
  [
    'Una venta fiada no puede incluir un pago inicial.',
    'Revisa cuánto paga hoy en la venta a crédito.',
  ],
  [
    'El pago parcial debe ser mayor que cero y menor que el total.',
    'El pago de hoy debe ser mayor que cero y menor que el total.',
  ],
  ['El método de pago no es válido.', CUSTOMER_CREDIT_LABELS.paymentMethodRequired],
]);

export class SalesOperationError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = 'SalesOperationError';
  }
}

export function mapCreateSaleDatabaseError(error: unknown): SalesOperationError {
  const databaseError =
    typeof error === 'object' && error !== null
      ? (error as { code?: unknown; message?: unknown })
      : null;

  if (databaseError?.code === 'P0001') {
    const message =
      typeof databaseError.message === 'string' &&
      databaseValidationMessages.has(databaseError.message)
        ? (userFacingDatabaseMessages.get(databaseError.message) ?? databaseError.message)
        : 'No se pudo validar la venta. Revisa los datos e inténtalo de nuevo.';
    return new SalesOperationError(message, 400, 'SALE_VALIDATION_ERROR');
  }

  return new SalesOperationError(
    'No se pudo completar la venta. Inténtalo más tarde.',
    500,
    'SALE_OPERATION_ERROR',
  );
}
