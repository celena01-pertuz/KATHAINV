import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { createServerSupabaseClientMock, getServerAccessStatusMock, updateUserMock } = vi.hoisted(
  () => ({
    createServerSupabaseClientMock: vi.fn(),
    getServerAccessStatusMock: vi.fn(),
    updateUserMock: vi.fn(),
  }),
);

vi.mock('@/lib/auth/server-access', () => ({
  getServerAccessStatus: getServerAccessStatusMock,
}));
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: createServerSupabaseClientMock,
}));

import { PATCH } from '../route';

function request(body: unknown) {
  return new NextRequest('http://localhost/api/auth/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('/api/auth/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerAccessStatusMock.mockResolvedValue('authorized');
    updateUserMock.mockResolvedValue({ error: null });
    createServerSupabaseClientMock.mockResolvedValue({ auth: { updateUser: updateUserMock } });
  });

  it.each([
    ['unauthenticated', 401],
    ['forbidden', 403],
  ] as const)('requiere sesión autorizada (%s)', async (status, expectedStatus) => {
    getServerAccessStatusMock.mockResolvedValue(status);

    const response = await PATCH(request({ fullName: 'Celena' }));

    expect(response.status).toBe(expectedStatus);
    expect(createServerSupabaseClientMock).not.toHaveBeenCalled();
  });

  it('actualiza únicamente el usuario de la sesión verificada', async () => {
    const response = await PATCH(request({ fullName: ' Celena Pertuz ', userId: 'otro-usuario' }));

    expect(response.status).toBe(200);
    expect(updateUserMock).toHaveBeenCalledWith({ data: { full_name: 'Celena Pertuz' } });
    expect(updateUserMock.mock.calls[0][0]).not.toHaveProperty('userId');
  });
});
