'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui';

const highlights = [
  { label: 'Framework', value: 'Next.js 15' },
  { label: 'Lenguaje', value: 'TypeScript' },
  { label: 'Datos', value: 'JSON + API' },
];

const features = [
  {
    title: 'Arquitectura',
    text: 'Base ordenada y clara para crecer sin perder control.',
  },
  {
    title: 'Diseño',
    text: 'Visual limpio, elegante y pensado para comunicar confianza.',
  },
  {
    title: 'Escalabilidad',
    text: 'Estructura lista para extender funcionalidades sin reescribirlo.',
  },
];

const stack = ['Next.js', 'React', 'TypeScript', 'Tailwind', 'Vitest'];

export function HolaMundo() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const colorScheme = window.matchMedia('(prefers-color-scheme: dark)');

    function syncSystemTheme() {
      let savedTheme: string | null = null;
      try {
        savedTheme = localStorage.getItem('kathainv-theme');
      } catch (error) {
        console.error('No se pudo leer la preferencia de tema:', error);
      }

      if (savedTheme === 'dark' || savedTheme === 'light') return;

      document.documentElement.classList.toggle('dark', colorScheme.matches);
      setIsDark(colorScheme.matches);
    }

    syncSystemTheme();
    colorScheme.addEventListener('change', syncSystemTheme);

    return () => colorScheme.removeEventListener('change', syncSystemTheme);
  }, []);

  function toggleTheme() {
    const nextIsDark = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', nextIsDark);
    setIsDark(nextIsDark);

    try {
      localStorage.setItem('kathainv-theme', nextIsDark ? 'dark' : 'light');
    } catch (error) {
      console.error('No se pudo guardar la preferencia de tema:', error);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="absolute left-1/4 top-0 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-success/10 blur-3xl" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between border-b border-border pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-md">
              K
            </div>
            <span className="text-xs uppercase tracking-[0.32em] text-muted">KATHAINV</span>
          </div>

          <nav className="hidden items-center gap-8 text-sm text-muted md:flex">
            <a href="#features" className="transition hover:text-foreground">
              Features
            </a>
            <a href="#stack" className="transition hover:text-foreground">
              Stack
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={toggleTheme}
              aria-label={`Cambiar a tema ${isDark ? 'claro' : 'oscuro'}`}
              className="backdrop-blur-sm"
            >
              Tema {isDark ? 'oscuro' : 'claro'}
            </Button>
            <button className="rounded-full border border-border bg-surface/70 px-4 py-2 text-sm text-foreground backdrop-blur-sm transition hover:bg-surface">
            Ver proyecto
            </button>
          </div>
        </header>

        <main className="grid flex-1 items-center gap-10 py-14 lg:grid-cols-[1.2fr_0.8fr] lg:py-16">
          <motion.section
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-2xl"
          >
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mb-6 inline-flex rounded-full border border-border bg-surface/70 px-3 py-1.5 text-xs uppercase tracking-[0.28em] text-muted"
            >
              TypeScript + Next.js + JSON
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.12 }}
              className="text-5xl font-semibold tracking-[-0.09em] text-foreground sm:text-6xl lg:text-7xl"
            >
              Hola,
              <span className="mt-2 block bg-gradient-to-r from-primary via-foreground to-muted bg-clip-text text-transparent">
                Mundo
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="mt-6 max-w-xl text-base leading-8 text-muted sm:text-lg"
            >
              KATHAINV ya está listo para evolucionar con una base sólida, moderna y fácil de escalar.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.28 }}
              className="mt-8 flex flex-wrap items-center gap-4"
            >
              <button className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:brightness-110">
                Empezar ahora
              </button>
              <button className="rounded-full border border-border bg-surface/70 px-5 py-2.5 text-sm font-medium text-foreground transition hover:bg-surface">
                Ver documentación
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.36 }}
              className="mt-10 grid gap-4 sm:grid-cols-3"
            >
              {highlights.map((item) => (
                <div key={item.label} className="rounded-2xl border border-border bg-surface/70 p-4 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted">{item.label}</p>
                  <p className="mt-2 text-base font-medium text-foreground">{item.value}</p>
                </div>
              ))}
            </motion.div>
          </motion.section>

          <motion.aside
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.16 }}
            className="flex justify-center"
          >
            <div className="w-full max-w-md rounded-[2rem] border border-border bg-surface/80 p-5 shadow-lg backdrop-blur-xl">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-muted" />
                  <span className="h-2.5 w-2.5 rounded-full bg-muted/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-muted/30" />
                </div>
                <span className="rounded-full border border-success/40 bg-success/10 px-2 py-1 text-xs uppercase tracking-[0.24em] text-success">
                  ONLINE
                </span>
              </div>

              <div className="rounded-2xl border border-border bg-background/90 p-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <p className="text-sm font-medium text-foreground">Dashboard</p>
                  <span className="text-xs uppercase tracking-[0.24em] text-muted">Ready</span>
                </div>

                <div className="mt-4 space-y-4">
                  <div className="rounded-xl border border-border bg-surface p-3">
                    <p className="text-xs uppercase tracking-[0.24em] text-muted">Proyecto</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">KATHAINV</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-border bg-surface p-3">
                      <p className="text-xs uppercase tracking-[0.24em] text-muted">Estado</p>
                      <p className="mt-2 text-base font-medium text-foreground">Activa</p>
                    </div>
                    <div className="rounded-xl border border-border bg-surface p-3">
                      <p className="text-xs uppercase tracking-[0.24em] text-muted">Rutas</p>
                      <p className="mt-2 text-base font-medium text-foreground">/api/health</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-surface p-3">
                    <p className="text-xs uppercase tracking-[0.24em] text-muted">Stack</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {stack.map((tool) => (
                        <span
                          key={tool}
                          className="rounded-full border border-border bg-background px-2.5 py-1 text-xs uppercase tracking-[0.2em] text-muted"
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.aside>
        </main>

        <section id="features" className="pb-10">
          <div className="grid gap-4 md:grid-cols-3">
            {features.map((feature, index) => (
              <motion.article
                key={feature.title}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 + index * 0.08 }}
                className="rounded-3xl border border-border bg-surface/70 p-5 backdrop-blur-sm"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-sm font-medium text-foreground">
                  0{index + 1}
                </div>
                <h2 className="text-xl font-medium text-foreground">{feature.title}</h2>
                <p className="mt-3 text-sm leading-6 text-muted">{feature.text}</p>
              </motion.article>
            ))}
          </div>
        </section>

        <section id="stack" className="pb-14 pt-6">
          <div className="flex flex-col items-center justify-between gap-4 rounded-[2rem] border border-border bg-surface/70 px-6 py-5 backdrop-blur-sm sm:flex-row">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-muted">Stack</p>
              <p className="mt-2 text-xl font-medium text-foreground">Tecnología moderna para crecer sin fricción</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {stack.map((tool) => (
                <span
                  key={tool}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-xs uppercase tracking-[0.22em] text-muted"
                >
                  {tool}
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
