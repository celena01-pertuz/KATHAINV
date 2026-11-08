import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { createServerSupabaseClientMock, isEmailAllowedMock, signUpMock } = vi.hoisted(() => ({
  createServerSupabaseClientMock: vi.fn(),
  isEmailAllowedMock: vi.fn(),
  signUpMock: vi.fn(),
}));

vi.mock('@/lib/auth/access-policy', () => ({
  isEmailAllowed: isEmailAllowedMock,
}));
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: createServerSupabaseClientMock,
}));

import { POST } from '../route';

function request(body: unknown) {
  return new NextRequest('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('/api/auth/register nombre requerido', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isEmailAllowedMock.mockReturnValue(true);
    signUpMock.mockResolvedValue({ error: null });
    createServerSupabaseClientMock.mockResolvedValue({ auth: { signUp: signUpMock } });
  });

  it.each([
    ['sin nombre', { email: 'celena@example.com', password: 'contraseña-segura' }],
    [
      'solo espacios',
      { email: 'celena@example.com', password: 'contraseña-segura', fullName: '   ' },
    ],
    ['un carácter', { email: 'celena@example.com', password: 'contraseña-segura', fullName: 'A' }],
    [
      '41 caracteres',
      { email: 'celena@example.com', password: 'contraseña-segura', fullName: 'A'.repeat(41) },
    ],
    [
      'salto de línea',
      { email: 'celena@example.com', password: 'contraseña-segura', fullName: 'Celena\nPertuz' },
    ],
  ])('rechaza un nombre inválido (%s)', async (_label, body) => {
    const response = await POST(request(body));

    expect(response.status).toBe(400);
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it('envía el nombre validado en user_metadata.full_name', async () => {
    const response = await POST(
      request({
        email: 'celena@example.com',
        password: 'contraseña-segura',
        fullName: '  Celena Pertuz  ',
      }),
    );

    expect(response.status).toBe(200);
    expect(signUpMock).toHaveBeenCalledWith({
      email: 'celena@example.com',
      password: 'contraseña-segura',
      options: {
        data: { full_name: 'Celena Pertuz' },
        emailRedirectTo: 'http://localhost/auth/callback',
      },
    });
  });
});
