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
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute left-1/4 top-0 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-success/10 blur-3xl" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 items-center gap-12 px-5 py-8 sm:px-8 lg:grid-cols-[1fr_0.8fr] lg:gap-20 lg:px-16">
        <section className="mx-auto w-full max-w-xl lg:mx-0">
          <a href="/" className="inline-flex items-center gap-3 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-lg font-semibold text-primary-foreground">K</span>
            <span className="text-xs font-semibold uppercase tracking-[0.28em] text-muted">KATHAINV</span>
          </a>

          <div className="mt-12 max-w-lg sm:mt-16">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-primary">Control de inventario</p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
              Todo en su lugar.
              <span className="mt-1 block text-primary">Cada venta, también.</span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-muted">
              Gestiona las entradas, salidas y ventas de tu boutique desde un solo espacio.
            </p>
          </div>

          <div className="mt-10 flex max-w-lg items-center gap-4 border-t border-border pt-5 sm:mt-14">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/30 text-primary" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 5v14M7 5v14m3-14v14m2-14v14m4-14v14m2-14v14m2-14v14" />
              </svg>
            </div>
            <p className="text-sm leading-6 text-muted">Un acceso seguro para mantener tu inventario siempre al día.</p>
          </div>
        </section>

        <section className="mx-auto w-full max-w-md rounded-2xl border border-border bg-surface/90 p-6 shadow-lg sm:p-9">
          <div className="mb-8">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Bienvenida</p>
            <h2 className="mt-2 text-2xl font-semibold">Inicia sesión</h2>
            <p className="mt-2 text-sm text-muted">Ingresa tus datos para continuar.</p>
          </div>

          <form aria-label="Iniciar sesión" noValidate onSubmit={handleSubmit} className="space-y-5">
            <div className="min-w-0">
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-foreground">Correo electrónico</label>
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
                className="block w-full min-w-0 rounded-lg border border-border bg-background px-4 py-3 text-base text-foreground outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20 aria-invalid:border-danger"
                placeholder="nombre@ejemplo.com"
              />
              {errors.email && <p id="email-error" className="mt-2 text-sm text-danger">{errors.email}</p>}
            </div>

            <div className="min-w-0">
              <div className="mb-2 flex items-center justify-between gap-3">
                <label htmlFor="password" className="text-sm font-medium text-foreground">Contraseña</label>
                <a
                  href="#"
                  onClick={(event) => event.preventDefault()}
                  className="shrink-0 text-xs text-primary underline decoration-primary/40 underline-offset-4 transition hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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
                className="block w-full min-w-0 rounded-lg border border-border bg-background px-4 py-3 text-base text-foreground outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20 aria-invalid:border-danger"
                placeholder="Tu contraseña"
              />
              {errors.password && <p id="password-error" className="mt-2 text-sm text-danger">{errors.password}</p>}
            </div>

            {formError && <p role="status" aria-live="polite" className="text-sm text-danger">{formError}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-70"
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="mt-7 border-t border-border pt-5 text-center text-xs text-muted">
            KATHAINV <span className="px-1 text-primary">/</span> Inventario de boutique
          </p>
        </section>
      </div>
    </main>
  );
}