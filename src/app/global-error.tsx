'use client';

import { motion } from 'framer-motion';
import { Button, Container, Typography } from '@/components/ui';

export default function GlobalError() {
  return (
    <html lang="es">
      <body className="antialiased bg-background text-foreground">
        <main className="flex min-h-screen items-center py-12">
          <Container maxWidth="md" className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mx-auto flex max-w-lg flex-col items-center gap-5"
            >
              <Typography variant="secondary" className="font-semibold uppercase tracking-widest text-danger">
                Error inesperado
              </Typography>
              <Typography variant="title">No pudimos cargar la aplicación</Typography>
              <Typography variant="text" className="text-muted">
                Lo sentimos. Puedes volver al inicio para intentarlo de nuevo.
              </Typography>
              <Button className="mt-2" onClick={() => window.location.assign('/')}>
                Volver al inicio
              </Button>
            </motion.div>
          </Container>
        </main>
      </body>
    </html>
  );
}
