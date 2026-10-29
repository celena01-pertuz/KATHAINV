import { NextResponse, type NextRequest } from 'next/server';
import { isEmailAllowed } from '@/lib/auth/access-policy';
import { registerSchema } from '@/lib/auth/schemas';
import { createServerSupabaseClient } from '@/lib/supabase/server';

function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Los datos enviados no son válidos.', 400);
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      parsed.error.issues[0]?.message ?? 'Los datos enviados no son válidos.',
      400,
    );
  }

  if (!isEmailAllowed(parsed.data.email)) {
    return errorResponse(
      'No se pudo completar el registro. Verifica los datos o contacta a la administradora.',
      403,
    );
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signUp({
      ...parsed.data,
      options: {
        emailRedirectTo: new URL('/auth/callback', request.url).toString(),
      },
    });

    if (error) {
      console.error('Supabase no pudo completar el registro.', {
        status: error.status,
        code: error.code,
      });
      return errorResponse(
        'No se pudo completar el registro. Revisa los datos e inténtalo de nuevo.',
        400,
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Si el correo está autorizado, recibirás un mensaje para confirmar tu cuenta.',
    });
  } catch (error) {
    console.error('No se pudo completar el registro.', error);
    return errorResponse('No fue posible completar el registro. Inténtalo más tarde.', 503);
  }
}
