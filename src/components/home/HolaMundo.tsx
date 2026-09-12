'use client';

import { motion } from 'framer-motion';

export function HolaMundo() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 text-white">
      <div
        className="absolute inset-0 opacity-90"
        style={{
          background:
            'linear-gradient(120deg, #0f0c29 0%, #302b63 35%, #24243e 100%)',
          backgroundSize: '200% 200%',
        }}
      />

      <motion.div
        className="absolute inset-0"
        animate={{ backgroundPosition: ['0% 50%', '100% 50%'] }}
        transition={{ duration: 8, repeat: Infinity, repeatType: 'reverse', ease: 'linear' }}
        style={{
          background:
            'radial-gradient(circle at 20% 20%, rgba(59,130,246,0.35), transparent 30%), radial-gradient(circle at 80% 30%, rgba(139,92,246,0.45), transparent 32%), linear-gradient(120deg, #0f0c29 0%, #302b63 35%, #24243e 100%)',
          backgroundSize: '200% 200%',
        }}
      />

      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-4 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-mono tracking-[0.2em] text-blue-200 backdrop-blur"
        >
          TypeScript + Next.js
        </motion.div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <motion.h1
            initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
            className="text-7xl font-extrabold tracking-tighter sm:text-8xl md:text-9xl"
          >
            Hola
          </motion.h1>
          <motion.h1
            initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.8, delay: 0.5, ease: 'easeOut' }}
            className="text-7xl font-extrabold tracking-tighter text-blue-400 sm:text-8xl md:text-9xl"
          >
            Mundo
          </motion.h1>
        </div>

        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, delay: 1.0, ease: 'easeInOut' }}
          className="my-6 h-px w-48 origin-left bg-gradient-to-r from-transparent via-white/70 to-transparent"
        />

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.3 }}
          className="max-w-2xl text-lg font-light tracking-wide text-white/70 sm:text-xl"
        >
          KATHAINV ya está inicializado con una base sólida en TypeScript, Next.js y Layer de datos JSON.
        </motion.p>
      </div>
    </div>
  );
}
