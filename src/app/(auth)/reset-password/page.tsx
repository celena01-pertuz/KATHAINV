import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { isUnauthenticatedError } from '@/lib/auth/server-access';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const recoveryCookieName = 'kathainv-password-recovery';

export default async function ResetPasswordPage() {
  const cookieStore = await cookies();
  if (cookieStore.get(recoveryCookieName)?.value !== '1') {
    redirect('/login');
  }

  const {
    data: { user },
    error,
  } = await (await createServerSupabaseClient()).auth.getUser();
  if (error) {
    if (isUnauthenticatedError(error)) redirect('/login');
    throw error;
  }
  if (!user) {
    redirect('/login');
  }

  return <ResetPasswordForm />;
}
