import { LoginForm } from '@/components/auth/LoginForm';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ passwordReset?: string }>;
}) {
  const params = await searchParams;
  return <LoginForm passwordReset={params.passwordReset === 'success'} />;
}
