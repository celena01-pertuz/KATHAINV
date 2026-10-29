import Link from 'next/link';
import type { ReactNode } from 'react';

export function AuthPageShell({
  children,
  description,
  eyebrow,
  title,
}: {
  children: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute left-1/4 top-0 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-success/10 blur-3xl" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 items-center gap-10 px-5 py-8 sm:px-8 lg:grid-cols-[1fr_0.8fr] lg:gap-20 lg:px-16">
        <section className="mx-auto w-full max-w-xl lg:mx-0">
          <Link
            href="/login"
            className="inline-flex items-center gap-3 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-lg font-semibold text-primary-foreground">
              K
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.28em] text-muted">
              KATHAINV
            </span>
          </Link>

          <div className="mt-12 max-w-lg sm:mt-16">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-primary">
              Control de inventario
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
              Todo en su lugar.
              <span className="mt-1 block text-primary">Cada venta, también.</span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-muted">
              Gestiona las entradas, salidas y ventas de tu boutique desde un solo espacio.
            </p>
          </div>
        </section>

        <section className="mx-auto w-full max-w-md rounded-2xl border border-border bg-surface/90 p-6 shadow-lg sm:p-9">
          <div className="mb-8">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
            <h2 className="mt-2 text-2xl font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-muted">{description}</p>
          </div>
          {children}
          <p className="mt-7 border-t border-border pt-5 text-center text-xs text-muted">
            KATHAINV <span className="px-1 text-primary">/</span> Inventario de boutique
          </p>
        </section>
      </div>
    </main>
  );
}
