import { canAccessInventory } from './access-policy';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export type ServerAccessStatus = 'authorized' | 'unauthenticated' | 'forbidden';

export function isUnauthenticatedError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === 'AuthSessionMissingError') return true;
  return 'status' in error && error.status === 401;
}

export async function getServerAccessStatus(): Promise<ServerAccessStatus> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    if (isUnauthenticatedError(error)) return 'unauthenticated';
    throw error;
  }

  if (!user) return 'unauthenticated';
  return canAccessInventory(user) ? 'authorized' : 'forbidden';
}
