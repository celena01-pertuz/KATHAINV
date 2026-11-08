import { canAccessInventory } from './access-policy';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export type ServerAccessStatus = 'authorized' | 'unauthenticated' | 'forbidden';

export interface ServerAccessContext {
  status: ServerAccessStatus;
  email: string | null;
  displayName: string | null;
}

function getDisplayName(userMetadata: unknown): string | null {
  if (!userMetadata || typeof userMetadata !== 'object') return null;

  const metadata = userMetadata as Record<string, unknown>;
  for (const key of ['full_name', 'name']) {
    const value = metadata[key];
    if (typeof value === 'string' && value.trim() && !value.trim().includes('@')) {
      return value.trim();
    }
  }
  return null;
}

function isSupabaseAuthCookie(name: string): boolean {
  return /^sb-.*-auth-token$/.test(name);
}

async function clearSupabaseAuthCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore
    .getAll()
    .filter(({ name }) => isSupabaseAuthCookie(name))
    .forEach(({ name }) => {
      try {
        cookieStore.delete(name);
      } catch {
        // Server components cannot mutate cookies; middleware clears them on page requests.
      }
    });
}

export function isUnauthenticatedError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const authError = error as {
    code?: unknown;
    message?: unknown;
    name?: unknown;
    status?: unknown;
  };
  const code = typeof authError.code === 'string' ? authError.code.toLowerCase() : '';
  const name = typeof authError.name === 'string' ? authError.name.toLowerCase() : '';
  const message = typeof authError.message === 'string' ? authError.message.toLowerCase() : '';

  return (
    authError.status === 401 ||
    name === 'authsessionmissingerror' ||
    code === 'refresh_token_not_found' ||
    code === 'session_not_found' ||
    code === 'session_missing' ||
    message.includes('invalid refresh token') ||
    message.includes('refresh_token_not_found') ||
    message.includes('session not found') ||
    message.includes('session missing')
  );
}

export async function getServerAccessContext(): Promise<ServerAccessContext> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    if (isUnauthenticatedError(error)) {
      await clearSupabaseAuthCookies();
      return { status: 'unauthenticated', email: null, displayName: null };
    }
    throw error;
  }

  if (!user) {
    await clearSupabaseAuthCookies();
    return { status: 'unauthenticated', email: null, displayName: null };
  }
  return {
    status: canAccessInventory(user) ? 'authorized' : 'forbidden',
    email: user.email ?? null,
    displayName: getDisplayName(user.user_metadata),
  };
}

export async function getServerAccessStatus(): Promise<ServerAccessStatus> {
  return (await getServerAccessContext()).status;
}
