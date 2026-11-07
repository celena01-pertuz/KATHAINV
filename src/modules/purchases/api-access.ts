import { NextResponse } from 'next/server';
import { getServerAccessStatus } from '@/lib/auth/server-access';

export async function authorizePurchaseRequest(): Promise<NextResponse | null> {
  try {
    const status = await getServerAccessStatus();
    if (status === 'unauthenticated') {
      return NextResponse.json(
        { success: false, error: 'Inicia sesión para continuar.', code: 'UNAUTHORIZED' },
        { status: 401 },
      );
    }
    if (status === 'forbidden') {
      return NextResponse.json(
        {
          success: false,
          error: 'No tienes permiso para acceder a este recurso.',
          code: 'FORBIDDEN',
        },
        { status: 403 },
      );
    }
    return null;
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'No fue posible verificar el acceso. Inténtalo más tarde.',
        code: 'AUTH_UNAVAILABLE',
      },
      { status: 503 },
    );
  }
}
