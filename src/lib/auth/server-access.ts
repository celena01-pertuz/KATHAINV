import { canAccessInventory } from './access-policy';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export type ServerAccessStatus = 'authorized' | 'unauthenticated' | 'forbidden';

export interface ServerAccessContext {
  status: ServerAccessStatus;
  email: string | null;
}

export function isUnauthenticatedError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === 'AuthSessionMissingError') return true;
  return 'status' in error && error.status === 401;
}

export async function getServerAccessContext(): Promise<ServerAccessContext> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    if (isUnauthenticatedError(error)) return { status: 'unauthenticated', email: null };
    throw error;
  }

  if (!user) return { status: 'unauthenticated', email: null };
  return {
    status: canAccessInventory(user) ? 'authorized' : 'forbidden',
    email: user.email ?? null,
  };
}

export async function getServerAccessStatus(): Promise<ServerAccessStatus> {
  return (await getServerAccessContext()).status;
}
