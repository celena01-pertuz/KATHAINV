'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export function LogoutButton() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const { error } = await createBrowserSupabaseClient().auth.signOut();
      if (error) {
        setErrorMessage('No se pudo cerrar la sesión. Inténtalo de nuevo.');
        return;
      }

      router.replace('/login');
      router.refresh();
    } catch {
      setErrorMessage('No fue posible conectar con el servicio. Inténtalo más tarde.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant="outline" size="sm" loading={isLoading} onClick={handleLogout}>
        Cerrar sesión
      </Button>
      {errorMessage && (
        <span role="alert" className="text-xs text-danger">
          {errorMessage}
        </span>
      )}
    </div>
  );
}
