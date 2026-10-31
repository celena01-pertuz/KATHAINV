const purchaseMessages = new Set([
  'El código del producto es obligatorio.',
  'Selecciona un proveedor.',
  'La cantidad debe ser un entero mayor que cero.',
  'El total debe ser un número igual o mayor que cero.',
  'La fecha de compra es obligatoria.',
  'El proveedor no existe.',
  'No se encontró un producto con ese código.',
  'La cantidad supera el stock máximo permitido.',
]);

export class PurchaseOperationError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = 'PurchaseOperationError';
  }
}

export function mapPurchaseDatabaseError(error: unknown): PurchaseOperationError {
  const databaseError =
    typeof error === 'object' && error !== null
      ? (error as { code?: unknown; message?: unknown })
      : null;

  if (databaseError?.code === 'P0001') {
    const message =
      typeof databaseError.message === 'string' && purchaseMessages.has(databaseError.message)
        ? databaseError.message
        : 'No se pudo validar la compra. Revisa los datos e inténtalo de nuevo.';
    const status = message.includes('producto con ese código') ? 404 : 400;
    return new PurchaseOperationError(message, status, 'PURCHASE_VALIDATION_ERROR');
  }

  if (databaseError?.code === '23505') {
    return new PurchaseOperationError('Ya existe un proveedor con ese nombre.', 409, 'DUPLICATE_SUPPLIER');
  }

  return new PurchaseOperationError(
    'No se pudo completar la operación de compras. Inténtalo más tarde.',
    500,
    'PURCHASE_OPERATION_ERROR',
  );
}
