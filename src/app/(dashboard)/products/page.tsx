import { redirect } from 'next/navigation';
import { getServerAccessStatus } from '@/lib/auth/server-access';
import { ProductManager } from '@/modules/products/components/ProductManager';

export default async function ProductsPage() {
  const access = await getServerAccessStatus();
  if (access === 'unauthenticated') redirect('/login');
  if (access === 'forbidden') {
    return (
      <main className="mx-auto max-w-xl px-5 py-12">
        <h1 className="text-2xl font-bold">Acceso denegado</h1>
        <p role="alert" className="mt-3">
          No tienes permiso para consultar productos. (403)
        </p>
      </main>
    );
  }
  return <ProductManager />;
}
