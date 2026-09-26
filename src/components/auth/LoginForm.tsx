'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

type FieldErrors = {
  email?: string;
  password?: string;
};

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: FieldErrors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'Ingresa un correo válido.';
    }
    if (!password) {
      nextErrors.password = 'Ingresa tu contraseña.';
    }

    setErrors(nextErrors);
    setFormError('');
    if (Object.keys(nextErrors).length > 0) return;

    setIsLoading(true);
    // TODO: conectar con la API real
    await new Promise((resolve) => window.setTimeout(resolve, 450));

    if (email.trim() === 'demo@kathainv.com' && password === 'demo1234') {
      router.push('/');
      return;
    }

    setFormError('Correo o contraseña incorrectos');
    setIsLoading(false);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#101816] text-[#f2f3ee]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_18%_8%,rgba(78,128,98,0.2),transparent_38%),radial-gradient(ellipse_at_95%_92%,rgba(203,111,83,0.12),transparent_34%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:linear-gradient(to_bottom,black,transparent_78%)]" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 items-center gap-12 px-5 py-8 sm:px-8 lg:grid-cols-[1fr_0.8fr] lg:gap-20 lg:px-16">
        <section className="mx-auto w-full max-w-xl lg:mx-0">
          <a href="/" className="inline-flex items-center gap-3 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b4d2ad]">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#a7c4a0] text-lg font-semibold text-[#18251d]">K</span>
            <span className="text-xs font-semibold uppercase tracking-[0.28em] text-[#d9e2d6]">KATHAINV</span>
          </a>

          <div className="mt-12 max-w-lg sm:mt-16">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-[#b4d2ad]">Control de inventario</p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight text-[#f2f3ee] sm:text-5xl">
              Todo en su lugar.
              <span className="mt-1 block text-[#b4d2ad]">Cada venta, también.</span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-[#b5c0b8]">
              Gestiona las entradas, salidas y ventas de tu boutique desde un solo espacio.
            </p>
          </div>

          <div className="mt-10 flex max-w-lg items-center gap-4 border-t border-white/10 pt-5 sm:mt-14">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#a7c4a0]/30 text-[#b4d2ad]" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 5v14M7 5v14m3-14v14m2-14v14m4-14v14m2-14v14m2-14v14" />
              </svg>
            </div>
            <p className="text-sm leading-6 text-[#9ca9a0]">Un acceso seguro para mantener tu inventario siempre al día.</p>
          </div>
        </section>

        <section className="mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-[#19231f]/90 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.32)] sm:p-9">
          <div className="mb-8">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#b4d2ad]">Bienvenida</p>
            <h2 className="mt-2 text-2xl font-semibold">Inicia sesión</h2>
            <p className="mt-2 text-sm text-[#aebbb2]">Ingresa tus datos para continuar.</p>
          </div>

          <form aria-label="Iniciar sesión" noValidate onSubmit={handleSubmit} className="space-y-5">
            <div className="min-w-0">
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-[#e0e7e1]">Correo electrónico</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setErrors((current) => ({ ...current, email: undefined }));
                  setFormError('');
                }}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'email-error' : undefined}
                className="block w-full min-w-0 rounded-lg border border-white/15 bg-[#101816] px-4 py-3 text-base text-white outline-none transition placeholder:text-[#738078] focus:border-[#a7c4a0] focus:ring-2 focus:ring-[#a7c4a0]/20 aria-invalid:border-[#e69c84]"
                placeholder="nombre@ejemplo.com"
              />
              {errors.email && <p id="email-error" className="mt-2 text-sm text-[#f0a38d]">{errors.email}</p>}
            </div>

            <div className="min-w-0">
              <div className="mb-2 flex items-center justify-between gap-3">
                <label htmlFor="password" className="text-sm font-medium text-[#e0e7e1]">Contraseña</label>
                <a
                  href="#"
                  onClick={(event) => event.preventDefault()}
                  className="shrink-0 text-xs text-[#b4d2ad] underline decoration-[#b4d2ad]/40 underline-offset-4 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b4d2ad]"
                >
                  Olvidé mi contraseña
                </a>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setErrors((current) => ({ ...current, password: undefined }));
                  setFormError('');
                }}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? 'password-error' : undefined}
                className="block w-full min-w-0 rounded-lg border border-white/15 bg-[#101816] px-4 py-3 text-base text-white outline-none transition placeholder:text-[#738078] focus:border-[#a7c4a0] focus:ring-2 focus:ring-[#a7c4a0]/20 aria-invalid:border-[#e69c84]"
                placeholder="Tu contraseña"
              />
              {errors.password && <p id="password-error" className="mt-2 text-sm text-[#f0a38d]">{errors.password}</p>}
            </div>

            {formError && <p role="status" aria-live="polite" className="text-sm text-[#f0a38d]">{formError}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#a7c4a0] px-4 py-3 text-sm font-semibold text-[#18251d] transition hover:bg-[#bbd4b4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c1dabc] disabled:cursor-wait disabled:opacity-70"
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="mt-7 border-t border-white/10 pt-5 text-center text-xs text-[#8f9d94]">
            KATHAINV <span className="px-1 text-[#b4d2ad]">/</span> Inventario de boutique
          </p>
        </section>
      </div>
    </main>
  );
}