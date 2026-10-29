import { NextResponse, type NextRequest } from 'next/server';
import { isEmailAllowed } from '@/lib/auth/access-policy';
import { loginSchema } from '@/lib/auth/schemas';
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

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      parsed.error.issues[0]?.message ?? 'Los datos enviados no son válidos.',
      400,
    );
  }

  if (!isEmailAllowed(parsed.data.email)) {
    return errorResponse(
      'No se pudo iniciar sesión. Verifica tus datos y el acceso de tu cuenta.',
      403,
    );
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

    if (error) {
      if (error.code === 'email_not_confirmed') {
        return errorResponse('Confirma tu correo electrónico antes de iniciar sesión.', 403);
      }

      if (error.status !== undefined && error.status >= 500) {
        console.error('Supabase no pudo iniciar la sesión.', {
          status: error.status,
          code: error.code,
        });
        return errorResponse('No fue posible iniciar sesión. Inténtalo más tarde.', 503);
      }

      return errorResponse('Correo o contraseña incorrectos.', 401);
    }

    if (!data.user?.email_confirmed_at || !isEmailAllowed(data.user.email)) {
      await supabase.auth.signOut();
      return errorResponse(
        'No se pudo iniciar sesión. Verifica tus datos y el acceso de tu cuenta.',
        403,
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('No se pudo completar el inicio de sesión.', error);
    return errorResponse('No fue posible iniciar sesión. Inténtalo más tarde.', 503);
  }
}
