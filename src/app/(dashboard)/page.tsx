import { getServerAccessContext } from '@/lib/auth/server-access';
import { getColombiaToday, getColombiaGreeting, getGreetingName } from '@/modules/home/home-utils';
import { HomeDashboard } from '@/modules/home/components/HomeDashboard';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  const access = await getServerAccessContext();
  if (access.status === 'unauthenticated') redirect('/login');
  if (access.status === 'forbidden') {
    return (
      <main className="mx-auto max-w-xl px-5 py-12">
        <h1 className="text-2xl font-bold">Acceso denegado</h1>
        <p role="alert" className="mt-3">
          No tienes permiso para consultar el inicio. (403)
        </p>
      </main>
    );
  }

  const now = new Date();
  return (
    <HomeDashboard
      greeting={getColombiaGreeting(now)}
      greetingName={getGreetingName(access.displayName, access.email)}
      initialDisplayName={access.displayName}
      today={getColombiaToday(now)}
    />
  );
}
