import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');

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

    return NextResponse.redirect(new URL('/', request.url));
  } catch (error) {
    console.error('No se pudo completar la confirmación del correo.', error);
    return NextResponse.redirect(new URL('/login', request.url));
  }
}
