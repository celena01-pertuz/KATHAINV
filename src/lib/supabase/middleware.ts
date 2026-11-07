import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { canAccessInventory } from '@/lib/auth/access-policy';
import { isUnauthenticatedError } from '@/lib/auth/server-access';
import { getSupabaseConfig } from './config';

const publicPaths = new Set([
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/auth/callback',
]);

function redirectWithCookies(
  response: NextResponse,
  request: NextRequest,
  destination: string,
): NextResponse {
  const redirectResponse = NextResponse.redirect(new URL(destination, request.url));
  response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
  return redirectResponse;
}

function clearSupabaseAuthCookies(response: NextResponse, request: NextRequest): void {
  const names = new Set([
    ...request.cookies.getAll().map(({ name }) => name),
    ...response.cookies.getAll().map(({ name }) => name),
  ]);

  names.forEach((name) => {
    if (/^sb-.*-auth-token$/.test(name)) response.cookies.delete(name);
  });
}

export async function updateSupabaseSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  if (publicPaths.has(request.nextUrl.pathname)) return response;

  try {
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

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error && !isUnauthenticatedError(error)) throw error;
    if (!user) {
      clearSupabaseAuthCookies(response, request);
      return redirectWithCookies(response, request, '/login');
    }
    if (!canAccessInventory(user)) {
      if (request.nextUrl.pathname === '/products' || request.nextUrl.pathname === '/scan') {
        return new NextResponse('No tienes permiso para consultar productos.', { status: 403 });
      }
      return redirectWithCookies(response, request, '/login');
    }

    return response;
  } catch {
    console.error('No se pudo validar el acceso a la página.');
    return new NextResponse('No fue posible verificar el acceso. Inténtalo más tarde.', {
      status: 503,
    });
  }
}
