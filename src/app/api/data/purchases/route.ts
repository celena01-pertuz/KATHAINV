import { NextRequest, NextResponse } from 'next/server';
import { authorizePurchaseRequest } from '@/modules/purchases/api-access';
import { PurchaseOperationError } from '@/modules/purchases/errors';
import { createPurchaseSchema, purchaseListQuerySchema } from '@/modules/purchases/schemas';
import { createPurchase, getRecentPurchases } from '@/modules/purchases/service';

function apiError(message: string, code: string, status: number) {
  return NextResponse.json(
    { success: false, error: message, code, timestamp: new Date().toISOString() },
    { status },
  );
}

function serviceError(error: unknown) {
  if (error instanceof PurchaseOperationError) {
    return apiError(error.message, error.code, error.status);
  }
  return apiError(
    'No se pudo completar la operación de compras. Inténtalo más tarde.',
    'PURCHASE_OPERATION_ERROR',
    500,
  );
}

export async function GET(request: NextRequest) {
  const denied = await authorizePurchaseRequest();
  if (denied) return denied;

  const parsed = purchaseListQuerySchema.safeParse({
    limit: request.nextUrl.searchParams.get('limit') ?? undefined,
  });
  if (!parsed.success) {
    return apiError('El límite solicitado no es válido.', 'VALIDATION_ERROR', 400);
  }

  try {
    const purchases = await getRecentPurchases(parsed.data.limit);
    return NextResponse.json({
      success: true,
      data: { data: purchases, total: purchases.length },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return serviceError(error);
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

  const parsed = createPurchaseSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      parsed.error.issues.map((issue) => issue.message).join(' '),
      'VALIDATION_ERROR',
      400,
    );
  }

  try {
    const purchase = await createPurchase(parsed.data);
    return NextResponse.json(
      {
        success: true,
        data: purchase,
        timestamp: new Date().toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    return serviceError(error);
  }
}
