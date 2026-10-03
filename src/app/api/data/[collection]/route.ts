import { NextRequest, NextResponse } from 'next/server';
import { count, create, getAll, getById, remove, update } from '@/lib/json-db';
import { now } from '@/lib/utils';
import { getSchema } from '@data/_schema/registry';

function apiError(error: string, code: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      error,
      code,
      timestamp: now(),
    },
    { status },
  );
}

function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: now(),
    },
    { status },
  );
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ collection: string }> },
) {
  const { collection } = await context.params;
  const id = new URL(request.url).searchParams.get('id');

  try {
    if (!getSchema(collection)) {
      return apiError(`La colección ${collection} no existe.`, 'NOT_FOUND', 404);
    }

    if (id) {
      const record = await getById(collection, id);
      if (!record) {
        return apiError(`No se encontró el registro ${id}.`, 'NOT_FOUND', 404);
      }
      return apiSuccess(record, 200);
    }

    const list = await getAll(collection, {
      limit: Number(new URL(request.url).searchParams.get('limit') ?? '0') || undefined,
      offset: Number(new URL(request.url).searchParams.get('offset') ?? '0') || 0,
      sortBy: new URL(request.url).searchParams.get('sortBy') ?? undefined,
      sortOrder: (new URL(request.url).searchParams.get('sortOrder') as 'asc' | 'desc') ?? 'asc',
    });

    return apiSuccess(list, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error inesperado';
    return apiError(message, 'IO_ERROR', 500);
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ collection: string }> }) {
  const { collection } = await context.params;
  const schema = getSchema(collection);

  if (!schema) {
    return apiError(`La colección ${collection} no existe.`, 'NOT_FOUND', 404);
  }

  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues.map((issue) => issue.message).join(', '), 'VALIDATION_ERROR', 400);
    }

    const created = await create(collection, parsed.data as never);
    return apiSuccess(created, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error inesperado';
    return apiError(message, error instanceof Error && 'code' in error ? String((error as { code?: string }).code) : 'IO_ERROR', 500);
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ collection: string }> }) {
  const { collection } = await context.params;
  const schema = getSchema(collection);

  if (!schema) {
    return apiError(`La colección ${collection} no existe.`, 'NOT_FOUND', 404);
  }

  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues.map((issue) => issue.message).join(', '), 'VALIDATION_ERROR', 400);
    }

    const updated = await update(collection, String((parsed.data as { id: string }).id), parsed.data as never);
    if (!updated) {
      return apiError('Registro no encontrado.', 'NOT_FOUND', 404);
    }

    return apiSuccess(updated, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error inesperado';
    return apiError(message, 'IO_ERROR', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ collection: string }> },
) {
  const { collection } = await context.params;
  const id = new URL(request.url).searchParams.get('id');

  if (!id) {
    return apiError('Se requiere un parámetro id.', 'VALIDATION_ERROR', 400);
  }

  try {
    const removed = await remove(collection, id);
    if (!removed) {
      return apiError(`No existe el registro ${id}.`, 'NOT_FOUND', 404);
    }

    return apiSuccess({ deleted: true, id }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error inesperado';
    return apiError(message, 'IO_ERROR', 500);
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ collection: string }> }) {
  return POST(request, context);
}

export async function HEAD(_request: NextRequest, context: { params: Promise<{ collection: string }> }) {
  const { collection } = await context.params;
  const total = await count(collection).catch(() => 0);

  return NextResponse.json(
    {
      collection,
      total,
      timestamp: now(),
    },
    { status: 200, headers: { 'X-Collection-Name': collection } },
  );
}
