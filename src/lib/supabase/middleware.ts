import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { canAccessInventory } from '@/lib/auth/access-policy';
import { isUnauthenticatedError } from '@/lib/auth/server-access';
import { getSupabaseConfig } from './config';

const publicPaths = new Set(['/login', '/register', '/auth/callback']);

function redirectWithCookies(
  response: NextResponse,
  request: NextRequest,
  destination: string,
): NextResponse {
  const redirectResponse = NextResponse.redirect(new URL(destination, request.url));
  response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
  return redirectResponse;
}

export async function updateSupabaseSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  const { url, publishableKey } = getSupabaseConfig();
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  if (publicPaths.has(request.nextUrl.pathname)) return response;

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error && !isUnauthenticatedError(error)) throw error;
    if (!user) return redirectWithCookies(response, request, '/login');
    if (!canAccessInventory(user)) return redirectWithCookies(response, request, '/login');

    return response;
  } catch (error) {
    console.error('No se pudo validar el acceso a la página.', error);
    return new NextResponse('No fue posible verificar el acceso. Inténtalo más tarde.', {
      status: 503,
    });
  }
}
