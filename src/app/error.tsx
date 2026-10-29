'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Button, Container, Typography } from '@/components/ui';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const router = useRouter();

  useEffect(() => {
    console.error('Error en la aplicación:', error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center bg-background py-12 text-foreground">
      <Container maxWidth="md" className="text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mx-auto flex max-w-lg flex-col items-center gap-5"
        >
          <Typography variant="secondary" className="font-semibold uppercase tracking-widest text-danger">
            Algo salió mal
          </Typography>
          <Typography variant="title">No pudimos completar esta acción</Typography>
          <Typography variant="text" className="text-muted">
            Ocurrió un problema inesperado. Puedes intentarlo de nuevo o regresar al inicio.
          </Typography>
          <div className="mt-2 flex w-full flex-col justify-center gap-3 sm:flex-row">
            <Button onClick={reset}>Reintentar</Button>
            <Button variant="secondary" onClick={() => router.push('/')}>
              Volver al inicio
            </Button>
          </div>
        </motion.div>
      </Container>
    </main>
  );
}
