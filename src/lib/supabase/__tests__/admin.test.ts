import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { createAdminSupabaseClient } from '../admin';

describe('cliente administrativo de Supabase', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('falla con un mensaje claro si falta SUPABASE_SECRET_KEY', () => {
    vi.stubEnv('SUPABASE_SECRET_KEY', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');

    expect(() => createAdminSupabaseClient()).toThrow(
      'Falta SUPABASE_SECRET_KEY en la configuración del servidor.',
    );
  });
});
