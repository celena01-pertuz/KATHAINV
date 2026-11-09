import { NextRequest, NextResponse } from 'next/server';
import { getServerAccessContext } from '@/lib/auth/server-access';
import {
  createCustomerCreditPaymentSchema,
  customerCreditQuerySchema,
  voidCustomerCreditPaymentSchema,
} from '@/modules/customer-credit/schemas';
import {
  CustomerCreditOperationError,
  getCustomerCreditDetail,
  getCustomerCreditOverview,
  recordCustomerCreditPayment,
  voidCustomerCreditPayment,
} from '@/modules/customer-credit/service';

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
  if (error instanceof CustomerCreditOperationError) {
    return apiError(error.message, error.code, error.status);
  }
  return apiError('No se pudo completar la operación de cartera.', 'CREDIT_OPERATION_ERROR', 500);
}

export async function GET(request: NextRequest) {
  const auth = await authorize();
  if (auth.response) return auth.response;

  const parsed = customerCreditQuerySchema.safeParse({
    customerId: request.nextUrl.searchParams.get('customerId') ?? undefined,
  });
  if (!parsed.success) {
    return apiError('El cliente solicitado no es válido.', 'VALIDATION_ERROR', 400);
  }
  try {
    if (!parsed.data.customerId) return apiSuccess(await getCustomerCreditOverview());
    const detail = await getCustomerCreditDetail(parsed.data.customerId);
    return detail
      ? apiSuccess(detail)
      : apiError('No se encontró el cliente indicado.', 'NOT_FOUND', 404);
  } catch (error) {
    return operationError(error);
  }
}

export async function POST(request: NextRequest) {
  const auth = await authorize();
  if (auth.response) return auth.response;
  if (!auth.email)
    return apiError('No se pudo verificar quién registra el abono.', 'AUTH_UNAVAILABLE', 503);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('La solicitud no tiene un formato válido.', 'INVALID_REQUEST', 400);
  }
  const parsed = createCustomerCreditPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      parsed.error.issues.map((issue) => issue.message).join(' '),
      'VALIDATION_ERROR',
      400,
    );
  }
  try {
    return apiSuccess(await recordCustomerCreditPayment(parsed.data, auth.email), 201);
  } catch (error) {
    return operationError(error);
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await authorize();
  if (auth.response) return auth.response;
  if (!auth.email)
    return apiError('No se pudo verificar quién anula el abono.', 'AUTH_UNAVAILABLE', 503);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('La solicitud no tiene un formato válido.', 'INVALID_REQUEST', 400);
  }
  const parsed = voidCustomerCreditPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      parsed.error.issues.map((issue) => issue.message).join(' '),
      'VALIDATION_ERROR',
      400,
    );
  }
  try {
    return apiSuccess(
      await voidCustomerCreditPayment(parsed.data.paymentId, parsed.data.reason, auth.email),
    );
  } catch (error) {
    return operationError(error);
  }
}
