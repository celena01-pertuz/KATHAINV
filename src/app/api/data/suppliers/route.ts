import { NextRequest, NextResponse } from 'next/server';
import { authorizePurchaseRequest } from '@/modules/purchases/api-access';
import { PurchaseOperationError } from '@/modules/purchases/errors';
import { createSupplierSchema } from '@/modules/purchases/schemas';
import { createSupplier, listSuppliers } from '@/modules/purchases/service';

function apiError(message: string, code: string, status: number) {
  return NextResponse.json(
    { success: false, error: message, code, timestamp: new Date().toISOString() },
    { status },
  );
}

export async function GET() {
  const denied = await authorizePurchaseRequest();
  if (denied) return denied;

  try {
    const suppliers = await listSuppliers();
    return NextResponse.json({
      success: true,
      data: { data: suppliers, total: suppliers.length },
      timestamp: new Date().toISOString(),
    });
  } catch {
    return apiError(
      'No se pudieron consultar los proveedores.',
      'SUPPLIER_READ_ERROR',
      500,
    );
  }
}

export async function POST(request: NextRequest) {
  const denied = await authorizePurchaseRequest();
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('La solicitud no tiene un formato válido.', 'INVALID_REQUEST', 400);
  }

  const parsed = createSupplierSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      parsed.error.issues.map((issue) => issue.message).join(' '),
      'VALIDATION_ERROR',
      400,
    );
  }

  try {
    const supplier = await createSupplier(parsed.data.name);
    return NextResponse.json(
      { success: true, data: supplier, timestamp: new Date().toISOString() },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof PurchaseOperationError) {
      return apiError(error.message, error.code, error.status);
    }
    return apiError(
      'No se pudo crear el proveedor.',
      'SUPPLIER_OPERATION_ERROR',
      500,
    );
  }
}
