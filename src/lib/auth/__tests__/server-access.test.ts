import { beforeEach, describe, expect, it, vi } from 'vitest';

const { cookiesMock, createServerSupabaseClientMock, deleteCookieMock, getUserMock } = vi.hoisted(
  () => ({
    cookiesMock: vi.fn(),
    createServerSupabaseClientMock: vi.fn(),
    deleteCookieMock: vi.fn(),
    getUserMock: vi.fn(),
  }),
);

vi.mock('next/headers', () => ({ cookies: cookiesMock }));
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: createServerSupabaseClientMock,
}));

import { getServerAccessContext, isUnauthenticatedError } from '../server-access';

describe('acceso de servidor con sesión inválida', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookiesMock.mockResolvedValue({
      delete: deleteCookieMock,
      getAll: () => [
        { name: 'sb-project-auth-token' },
        { name: 'theme' },
        { name: 'sb-project-auth-token-code-verifier' },
      ],
    });
    createServerSupabaseClientMock.mockResolvedValue({ auth: { getUser: getUserMock } });
  });

  it('trata un refresh token inexistente como sesión ausente y elimina la cookie', async () => {
    const error = Object.assign(new Error('Invalid Refresh Token: Refresh Token Not Found'), {
      code: 'refresh_token_not_found',
      name: 'AuthApiError',
      status: 400,
    });
    getUserMock.mockResolvedValue({ data: { user: null }, error });

    await expect(getServerAccessContext()).resolves.toMatchObject({
      status: 'unauthenticated',
      email: null,
    });
    expect(deleteCookieMock).toHaveBeenCalledWith('sb-project-auth-token');
    expect(deleteCookieMock).not.toHaveBeenCalledWith('theme');
  });

  it('reconoce refresh inválido por mensaje y sesión inexistente', () => {
    expect(isUnauthenticatedError(new Error('Invalid Refresh Token'))).toBe(true);
    expect(isUnauthenticatedError({ code: 'session_not_found' })).toBe(true);
  });

  it('propaga errores reales de Supabase', async () => {
    const error = new Error('Supabase unavailable');
    getUserMock.mockResolvedValue({ data: { user: null }, error });

    await expect(getServerAccessContext()).rejects.toBe(error);
  });
});