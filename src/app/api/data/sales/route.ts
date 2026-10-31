import { NextRequest, NextResponse } from 'next/server';
import { getServerAccessContext } from '@/lib/auth/server-access';
import { createSaleSchema, saleListQuerySchema } from '@/modules/sales/schemas';
import { createSale, getRecentSales } from '@/modules/sales/service';
import { SalesOperationError } from '@/modules/sales/errors';

function apiError(message: string, code: string, status: number) {
  return NextResponse.json(
    { success: false, error: message, code, timestamp: new Date().toISOString() },
    { status },
  );
}

function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(
    { success: true, data, timestamp: new Date().toISOString() },
    { status },
  );
}

async function authorizationError() {
  try {
    const access = await getServerAccessContext();
    if (access.status === 'unauthenticated') {
      return {
        response: apiError('Inicia sesión para continuar.', 'UNAUTHORIZED', 401),
        email: null,
      };
    }
    if (access.status === 'forbidden') {
      return {
        response: apiError('No tienes permiso para acceder a este recurso.', 'FORBIDDEN', 403),
        email: null,
      };
    }
    return { response: null, email: access.email };
  } catch {
    return {
      response: apiError(
        'No fue posible verificar el acceso. Inténtalo más tarde.',
        'AUTH_UNAVAILABLE',
        503,
      ),
      email: null,
    };
  }
}

function serviceError(error: unknown) {
  if (error instanceof SalesOperationError) {
    return apiError(error.message, error.code, error.status);
  }
  return apiError(
    'No se pudo completar la operación de ventas. Inténtalo más tarde.',
    'SALE_OPERATION_ERROR',
    500,
  );
}

export async function GET(request: NextRequest) {
  const authorization = await authorizationError();
  if (authorization.response) return authorization.response;

  const parsed = saleListQuerySchema.safeParse({
    limit: request.nextUrl.searchParams.get('limit') ?? undefined,
  });
  if (!parsed.success) {
    return apiError('El límite solicitado no es válido.', 'VALIDATION_ERROR', 400);
  }

  try {
    const sales = await getRecentSales(parsed.data.limit);
    return apiSuccess({ data: sales, total: sales.length });
  } catch (error) {
    return serviceError(error);
  }
}

export async function POST(request: NextRequest) {
  const authorization = await authorizationError();
  if (authorization.response) return authorization.response;
  if (!authorization.email) {
    return apiError(
      'No se pudo verificar la cuenta que registra la venta.',
      'AUTH_UNAVAILABLE',
      503,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('La solicitud no tiene un formato válido.', 'INVALID_REQUEST', 400);
  }

  const parsed = createSaleSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      parsed.error.issues.map((issue) => issue.message).join(' '),
      'VALIDATION_ERROR',
      400,
    );
  }

  try {
    return apiSuccess(await createSale(parsed.data, authorization.email), 201);
  } catch (error) {
    return serviceError(error);
  }
}
