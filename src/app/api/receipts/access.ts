import { NextResponse } from 'next/server';
import { getServerAccessContext } from '@/lib/auth/server-access';

export async function authorizeReceiptRequest(): Promise<
  { email: string; response?: never } | { email?: never; response: NextResponse }
> {
  try {
    const access = await getServerAccessContext();
    if (access.status === 'unauthenticated') {
      return {
        response: NextResponse.json(
          { success: false, error: 'Inicia sesión para continuar.' },
          { status: 401 },
        ),
      };
    }
    if (access.status === 'forbidden') {
      return {
        response: NextResponse.json(
          { success: false, error: 'No tienes permiso para continuar.' },
          { status: 403 },
        ),
      };
    }
    if (!access.email) {
      return {
        response: NextResponse.json(
          { success: false, error: 'No fue posible verificar la cuenta.' },
          { status: 503 },
        ),
      };
    }
    return { email: access.email };
  } catch {
    return {
      response: NextResponse.json(
        { success: false, error: 'No fue posible verificar el acceso.' },
        { status: 503 },
      ),
    };
  }
}
