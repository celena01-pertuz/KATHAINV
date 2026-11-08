import { NextResponse, type NextRequest } from 'next/server';
import { getServerAccessStatus } from '@/lib/auth/server-access';
import { fullNameSchema } from '@/lib/auth/schemas';
import { createServerSupabaseClient } from '@/lib/supabase/server';

function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function PATCH(request: NextRequest) {
  try {
    const accessStatus = await getServerAccessStatus();
    if (accessStatus === 'unauthenticated') {
      return errorResponse('Inicia sesión para guardar tu nombre.', 401);
    }
    if (accessStatus === 'forbidden') {
      return errorResponse('No tienes permiso para cambiar este nombre.', 403);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse('Los datos enviados no son válidos.', 400);
    }

    const nameValue =
      body && typeof body === 'object' && 'fullName' in body ? body.fullName : undefined;
    const parsedName = fullNameSchema.safeParse(nameValue);
    if (!parsedName.success) {
      return errorResponse(parsedName.error.issues[0]?.message ?? 'El nombre no es válido.', 400);
    }

    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.updateUser({
      data: { full_name: parsedName.data },
    });

    if (error) {
      console.error('Supabase no pudo actualizar el nombre.', {
        status: error.status,
        code: error.code,
      });
      const status = error.status === 401 || error.status === 403 ? error.status : 400;
      return errorResponse('No se pudo guardar el nombre. Inténtalo de nuevo.', status);
    }

    return NextResponse.json({
      success: true,
      data: { fullName: parsedName.data },
    });
  } catch {
    console.error('No se pudo actualizar el nombre.');
    return errorResponse('No fue posible guardar el nombre. Inténtalo más tarde.', 503);
  }
}
