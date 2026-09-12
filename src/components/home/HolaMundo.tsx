'use client';

import { motion } from 'framer-motion';

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
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050816] text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.16),transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.14),transparent_30%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-950 shadow-[0_0_30px_rgba(255,255,255,0.25)]">
              K
            </div>
            <span className="text-[10px] uppercase tracking-[0.32em] text-slate-300">KATHAINV</span>
          </div>

          <nav className="hidden items-center gap-8 text-sm text-slate-400 md:flex">
            <a href="#features" className="transition hover:text-white">
              Features
            </a>
            <a href="#stack" className="transition hover:text-white">
              Stack
            </a>
          </nav>

          <button className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-slate-100 backdrop-blur-sm transition hover:border-white/30 hover:bg-white/10">
            Ver proyecto
          </button>
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
              className="mb-6 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] uppercase tracking-[0.28em] text-slate-300"
            >
              TypeScript + Next.js + JSON
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.12 }}
              className="text-5xl font-semibold tracking-[-0.09em] text-white sm:text-6xl lg:text-[5rem]"
            >
              Hola,
              <span className="mt-2 block bg-gradient-to-r from-slate-50 via-slate-200 to-slate-400 bg-clip-text text-transparent">
                Mundo
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="mt-6 max-w-xl text-base leading-8 text-slate-300 sm:text-lg"
            >
              KATHAINV ya está listo para evolucionar con una base sólida, moderna y fácil de escalar.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.28 }}
              className="mt-8 flex flex-wrap items-center gap-4"
            >
              <button className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-slate-200">
                Empezar ahora
              </button>
              <button className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-100 transition hover:border-white/30 hover:bg-white/10">
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
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">{item.label}</p>
                  <p className="mt-2 text-base font-medium text-white">{item.value}</p>
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
            <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-[0_30px_80px_rgba(15,23,42,0.8)] backdrop-blur-xl">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-white/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/40" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                </div>
                <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-[9px] uppercase tracking-[0.24em] text-emerald-200">
                  ONLINE
                </span>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0b1020]/90 p-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <p className="text-sm font-medium text-slate-300">Dashboard</p>
                  <span className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Ready</span>
                </div>

                <div className="mt-4 space-y-4">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Proyecto</p>
                    <p className="mt-2 text-2xl font-semibold text-white">KATHAINV</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Estado</p>
                      <p className="mt-2 text-base font-medium text-white">Activa</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Rutas</p>
                      <p className="mt-2 text-base font-medium text-white">/api/health</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Stack</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {stack.map((tool) => (
                        <span
                          key={tool}
                          className="rounded-full border border-white/10 bg-slate-900 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300"
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
                className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sm font-medium text-slate-200">
                  0{index + 1}
                </div>
                <h2 className="text-xl font-medium text-white">{feature.title}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-300">{feature.text}</p>
              </motion.article>
            ))}
          </div>
        </section>

        <section id="stack" className="pb-14 pt-6">
          <div className="flex flex-col items-center justify-between gap-4 rounded-[2rem] border border-white/10 bg-white/5 px-6 py-5 backdrop-blur-sm sm:flex-row">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-slate-400">Stack</p>
              <p className="mt-2 text-xl font-medium text-white">Tecnología moderna para crecer sin fricción</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {stack.map((tool) => (
                <span
                  key={tool}
                  className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] text-slate-300"
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
