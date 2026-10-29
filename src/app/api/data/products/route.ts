import { NextRequest, NextResponse } from 'next/server';
import { productCreateSchema, productRecordSchema } from '@data/_schema/product.schema';
import { getServerAccessStatus } from '@/lib/auth/server-access';
import { JsonDBError } from '@/lib/json-db';
import {
  createProduct,
  findProductByCode,
  getProduct,
  listProducts,
  normalizeProductCode,
  removeOrDeactivateProduct,
  updateProduct,
} from '@/modules/products/service';
import { now } from '@/lib/utils';

function apiError(message: string, code: string, status: number) {
  return NextResponse.json(
    { success: false, error: message, code, timestamp: now() },
    { status },
  );
}

function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data, timestamp: now() }, { status });
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
  } catch (error) {
    console.error('No se pudo validar el acceso a la API de productos.', error);
    return apiError(
      'No fue posible verificar el acceso. Inténtalo más tarde.',
      'AUTH_UNAVAILABLE',
      503,
    );
  }
}

function serviceError(error: unknown) {
  if (error instanceof JsonDBError && error.code === 'DUPLICATE_CODE') {
    return apiError(error.message, error.code, 409);
  }
  if (error instanceof JsonDBError && error.code === 'READ_ONLY') {
    return apiError(error.message, error.code, 503);
  }
  if (error instanceof JsonDBError && error.code === 'VALIDATION_ERROR') {
    return apiError(error.message, error.code, 400);
  }
  const message = error instanceof Error ? error.message : 'Error inesperado.';
  return apiError(message, 'IO_ERROR', 500);
}

export async function GET(request: NextRequest) {
  const denied = await authorizationError();
  if (denied) return denied;

  const params = new URL(request.url).searchParams;
  try {
    const id = params.get('id');
    const code = params.get('code');
    if (id) {
      const product = await getProduct(id);
      return product ? apiSuccess(product) : apiError('Producto no encontrado.', 'NOT_FOUND', 404);
    }
    if (code) {
      const product = await findProductByCode(code);
      return product ? apiSuccess(product) : apiError('Producto no encontrado.', 'NOT_FOUND', 404);
    }

    const search = params.get('q')?.trim().toLocaleLowerCase('es-CO') ?? '';
    const products = await listProducts();
    const filtered = search
      ? products.filter(
          (product) =>
            product.name.toLocaleLowerCase('es-CO').includes(search) ||
            normalizeProductCode(product.code).includes(normalizeProductCode(search)),
        )
      : products;
    return apiSuccess({ data: filtered, total: filtered.length });
  } catch (error) {
    return serviceError(error);
  }
}

export async function POST(request: NextRequest) {
  const denied = await authorizationError();
  if (denied) return denied;

  try {
    const parsed = productCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return apiError(
        parsed.error.issues.map((issue) => issue.message).join(', '),
        'VALIDATION_ERROR',
        400,
      );
    }
    return apiSuccess(await createProduct(parsed.data), 201);
  } catch (error) {
    return serviceError(error);
  }
}

export async function PUT(request: NextRequest) {
  const denied = await authorizationError();
  if (denied) return denied;

  try {
    const parsed = productRecordSchema.safeParse(await request.json());
    if (!parsed.success) {
      return apiError(
        parsed.error.issues.map((issue) => issue.message).join(', '),
        'VALIDATION_ERROR',
        400,
      );
    }
    const { id, createdAt, updatedAt, ...productInput } = parsed.data;
    void createdAt;
    void updatedAt;
    const updated = await updateProduct(id, productInput);
    return updated ? apiSuccess(updated) : apiError('Producto no encontrado.', 'NOT_FOUND', 404);
  } catch (error) {
    return serviceError(error);
  }
}

export async function DELETE(request: NextRequest) {
  const denied = await authorizationError();
  if (denied) return denied;

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return apiError('Se requiere el parámetro id.', 'VALIDATION_ERROR', 400);

  try {
    const result = await removeOrDeactivateProduct(id);
    return result ? apiSuccess(result) : apiError('Producto no encontrado.', 'NOT_FOUND', 404);
  } catch (error) {
    return serviceError(error);
  }
}

export async function HEAD(_request: NextRequest) {
  const denied = await authorizationError();
  if (denied) return denied;
  try {
    return apiSuccess({ total: (await listProducts()).length });
  } catch (error) {
    return serviceError(error);
  }
}
