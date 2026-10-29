'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Button, Container, Typography } from '@/components/ui';

export default function NotFound() {
  const router = useRouter();

  return (
    <main className="flex min-h-screen items-center bg-background py-12 text-foreground">
      <Container maxWidth="md" className="text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mx-auto flex max-w-lg flex-col items-center gap-5"
        >
          <svg
            aria-hidden="true"
            className="h-16 w-16 text-primary"
            viewBox="0 0 64 64"
            fill="none"
          >
            <circle cx="27" cy="27" r="18" stroke="currentColor" strokeWidth="4" />
            <path d="m40 40 14 14M20 27h14" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          </svg>
          <Typography variant="secondary" className="font-semibold uppercase tracking-widest text-primary">
            Error 404
          </Typography>
          <Typography variant="title">No encontramos esa página</Typography>
          <Typography variant="text" className="text-muted">
            Puede que la dirección haya cambiado o que el enlace no sea correcto. Volvamos al inicio.
          </Typography>
          <Button className="mt-2" onClick={() => router.push('/')}>
            Volver al inicio
          </Button>
        </motion.div>
      </Container>
    </main>
  );
}
