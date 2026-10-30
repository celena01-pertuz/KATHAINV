import { NextRequest, NextResponse } from 'next/server';
import { getServerAccessStatus } from '@/lib/auth/server-access';
import {
  customerCreateSchema,
  customerPhoneSchema,
  customerSearchSchema,
  customerStatusSchema,
  customerUpdateSchema,
} from '@/modules/customers/schemas';
import {
  changeCustomerStatus,
  createCustomer,
  customerPhoneAlreadyExists,
  listCustomers,
  updateCustomer,
} from '@/modules/customers/service';

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
    const status = await getServerAccessStatus();
    if (status === 'unauthenticated') {
      return apiError('Inicia sesión para continuar.', 'UNAUTHORIZED', 401);
    }
    if (status === 'forbidden') {
      return apiError('No tienes permiso para acceder a este recurso.', 'FORBIDDEN', 403);
    }
    return null;
  } catch {
    return apiError(
      'No fue posible verificar el acceso. Inténtalo más tarde.',
      'AUTH_UNAVAILABLE',
      503,
    );
  }
}

function validationError(messages: string[]) {
  return apiError(messages.join(' '), 'VALIDATION_ERROR', 400);
}

function serviceError() {
  return apiError(
    'No se pudo completar la operación de clientes. Inténtalo más tarde.',
    'IO_ERROR',
    500,
  );
}

export async function GET(request: NextRequest) {
  const denied = await authorizationError();
  if (denied) return denied;

  const params = request.nextUrl.searchParams;
  const phone = params.get('phone');
  try {
    if (phone !== null) {
      const parsedPhone = customerPhoneSchema.safeParse(phone);
      if (!parsedPhone.success) {
        return validationError(parsedPhone.error.issues.map((issue) => issue.message));
      }
      const excludeId = params.get('excludeId') ?? undefined;
      return apiSuccess({
        duplicatePhone: await customerPhoneAlreadyExists(parsedPhone.data, excludeId),
      });
    }

    const parsedSearch = customerSearchSchema.safeParse(params.get('q') ?? '');
    if (!parsedSearch.success) {
      return validationError(parsedSearch.error.issues.map((issue) => issue.message));
    }
    const customers = await listCustomers(parsedSearch.data);
    return apiSuccess({ data: customers, total: customers.length });
  } catch {
    return serviceError();
  }
}

export async function POST(request: NextRequest) {
  const denied = await authorizationError();
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('La solicitud no tiene un formato válido.', 'INVALID_REQUEST', 400);
  }
  const parsed = customerCreateSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error.issues.map((issue) => issue.message));
  }
  try {
    return apiSuccess(await createCustomer(parsed.data), 201);
  } catch {
    return serviceError();
  }
}

export async function PUT(request: NextRequest) {
  const denied = await authorizationError();
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('La solicitud no tiene un formato válido.', 'INVALID_REQUEST', 400);
  }
  const parsed = customerUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error.issues.map((issue) => issue.message));
  }
  try {
    const result = await updateCustomer(parsed.data);
    return result ? apiSuccess(result) : apiError('Cliente no encontrado.', 'NOT_FOUND', 404);
  } catch {
    return serviceError();
  }
}

export async function PATCH(request: NextRequest) {
  const denied = await authorizationError();
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('La solicitud no tiene un formato válido.', 'INVALID_REQUEST', 400);
  }
  const parsed = customerStatusSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error.issues.map((issue) => issue.message));
  }
  try {
    const customer = await changeCustomerStatus(parsed.data.id, parsed.data.active);
    return customer ? apiSuccess(customer) : apiError('Cliente no encontrado.', 'NOT_FOUND', 404);
  } catch {
    return serviceError();
  }
}
