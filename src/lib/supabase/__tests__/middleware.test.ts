// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { getUserMock } = vi.hoisted(() => ({ getUserMock: vi.fn() }));

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({ auth: { getUser: getUserMock } }),
}));
vi.mock('@/lib/supabase/config', () => ({
  getSupabaseConfig: () => ({ url: 'https://example.supabase.co', publishableKey: 'test-key' }),
}));

import { updateSupabaseSession } from '../middleware';

describe('middleware de sesión Supabase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });
  });

  it('redirige al login y borra la cookie de refresh token inexistente', async () => {
    getUserMock.mockResolvedValue({
      data: { user: null },
      error: Object.assign(new Error('Invalid Refresh Token: Refresh Token Not Found'), {
        code: 'refresh_token_not_found',
        name: 'AuthApiError',
        status: 400,
      }),
    });
    const request = new NextRequest('http://localhost/products', {
      headers: { cookie: 'sb-project-auth-token=stale; theme=dark' },
    });

    const response = await updateSupabaseSession(request);

    expect(response.headers.get('location')).toBe('http://localhost/login');
    expect(Number(response.cookies.get('sb-project-auth-token')?.expires)).toBe(0);
    expect(response.cookies.get('theme')).toBeUndefined();
  });

  it('mantiene 503 cuando Supabase falla realmente y no registra el error', async () => {
    const error = new Error('network failure with sensitive detail');
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    getUserMock.mockRejectedValue(error);

    const response = await updateSupabaseSession(new NextRequest('http://localhost/products'));

    expect(response.status).toBe(503);
    expect(log).toHaveBeenCalledWith('No se pudo validar el acceso a la página.');
    expect(log).not.toHaveBeenCalledWith(expect.anything(), error);
    log.mockRestore();
  });
});