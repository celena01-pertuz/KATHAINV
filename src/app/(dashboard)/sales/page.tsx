import { redirect } from 'next/navigation';
import { getServerAccessStatus } from '@/lib/auth/server-access';
import { SalesManager } from '@/modules/sales/components/SalesManager';

export default async function SalesPage() {
  const access = await getServerAccessStatus();
  if (access === 'unauthenticated') redirect('/login');
  if (access === 'forbidden') {
    return (
      <main className="mx-auto max-w-xl px-5 py-12">
        <h1 className="text-2xl font-bold">Acceso denegado</h1>
        <p role="alert" className="mt-3">
          No tienes permiso para registrar ventas. (403)
        </p>
      </main>
    );
  }
  return <SalesManager />;
}
