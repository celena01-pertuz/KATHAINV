import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const recoveryCookieName = 'kathainv-password-recovery';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const isPasswordRecovery = request.nextUrl.searchParams.get('next') === '/reset-password';

  if (!code) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('No se pudo validar el enlace de confirmación.', {
        status: error.status,
        code: error.code,
      });
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const response = NextResponse.redirect(
      new URL(isPasswordRecovery ? '/reset-password' : '/', request.url),
    );
    if (isPasswordRecovery) {
      response.cookies.set(recoveryCookieName, '1', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/reset-password',
        maxAge: 60 * 60,
      });
    }
    return response;
  } catch (error) {
    console.error('No se pudo completar la confirmación del correo.', error);
    return NextResponse.redirect(new URL('/login', request.url));
  }
}
