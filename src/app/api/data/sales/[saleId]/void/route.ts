import { NextResponse } from 'next/server';
import { getServerAccessContext } from '@/lib/auth/server-access';
import { saleIdParamSchema, voidSaleRequestSchema } from '@/modules/sales/schemas';
import { SalesOperationError } from '@/modules/sales/errors';
import { voidSale } from '@/modules/sales/service';

interface RouteContext {
  params: Promise<{ saleId: string }>;
}

function apiError(message: string, code: string, status: number) {
  return NextResponse.json(
    { success: false, error: message, code, timestamp: new Date().toISOString() },
    { status },
  );
}

async function authorize() {
  try {
    const access = await getServerAccessContext();
    if (access.status === 'unauthenticated') {
      return { response: apiError('Inicia sesión para continuar.', 'UNAUTHORIZED', 401) };
    }
    if (access.status === 'forbidden') {
      return {
        response: apiError('No tienes permiso para acceder a este recurso.', 'FORBIDDEN', 403),
      };
    }
    return { response: null, email: access.email };
  } catch {
    return {
      response: apiError('No fue posible verificar el acceso.', 'AUTH_UNAVAILABLE', 503),
    };
  }
}

function operationError(error: unknown) {
  if (error instanceof SalesOperationError) {
    return apiError(error.message, error.code, error.status);
  }
  return apiError('No se pudo completar la anulación de la venta.', 'SALE_VOID_ERROR', 500);
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await authorize();
  if (auth.response) return auth.response;
  if (!auth.email) {
    return apiError('No se pudo verificar quién anula la venta.', 'AUTH_UNAVAILABLE', 503);
  }

  const { saleId: rawSaleId } = await context.params;
  const parsedSaleId = saleIdParamSchema.safeParse(rawSaleId);
  if (!parsedSaleId.success) {
    return apiError('La venta indicada no es válida.', 'VALIDATION_ERROR', 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('La solicitud no tiene un formato válido.', 'INVALID_REQUEST', 400);
  }

  const parsed = voidSaleRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      parsed.error.issues.map((issue) => issue.message).join(' '),
      'VALIDATION_ERROR',
      400,
    );
  }

  try {
    return NextResponse.json({
      success: true,
      data: await voidSale(parsedSaleId.data, parsed.data.reason, auth.email),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return operationError(error);
  }
}
