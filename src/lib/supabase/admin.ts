import 'server-only';

import { createClient } from '@supabase/supabase-js';

export function createAdminSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!secretKey) {
    throw new Error('Falta SUPABASE_SECRET_KEY en la configuración del servidor.');
  }
  if (!url) {
    throw new Error('Falta NEXT_PUBLIC_SUPABASE_URL en la configuración del servidor.');
  }

  try {
    return createClient(url, secretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  } catch {
    throw new Error('No fue posible configurar el cliente administrativo de Supabase.');
  }
}
