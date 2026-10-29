'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { loginSchema } from '@/lib/auth/schemas';
import { AuthPageShell } from './AuthPageShell';

export function LoginForm({ passwordReset = false }: { passwordReset?: boolean }) {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const parsed = loginSchema.safeParse({
      email: formData.get('email'),
      password: formData.get('password'),
    });

    setFormError('');
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      setFieldErrors({ email: errors.email?.[0], password: errors.password?.[0] });
      return;
    }

    setFieldErrors({});
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const result: { error?: string } = await response.json();

      if (!response.ok) {
        setFormError(result.error ?? 'No se pudo iniciar sesión. Inténtalo de nuevo.');
        return;
      }

      router.replace('/');
      router.refresh();
    } catch {
      setFormError('No fue posible conectar con el servicio. Inténtalo más tarde.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthPageShell
      eyebrow="Bienvenida"
      title="Inicia sesión"
      description="Ingresa tus datos para continuar."
    >
      <form aria-label="Iniciar sesión" noValidate onSubmit={handleSubmit} className="space-y-5">
        {passwordReset && (
          <p role="status" className="text-sm text-success">
            Tu contraseña se cambió correctamente. Inicia sesión con la nueva contraseña.
          </p>
        )}
        <Input
          label="Correo electrónico"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="nombre@ejemplo.com"
          error={fieldErrors.email}
          onChange={() => {
            setFieldErrors((current) => ({ ...current, email: undefined }));
            setFormError('');
          }}
        />
        <Input
          label="Contraseña"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Tu contraseña"
          error={fieldErrors.password}
          onChange={() => {
            setFieldErrors((current) => ({ ...current, password: undefined }));
            setFormError('');
          }}
        />
        {formError && (
          <p role="alert" className="text-sm text-danger">
            {formError}
          </p>
        )}
        <Button type="submit" loading={isLoading} className="w-full">
          {isLoading ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm">
        <Link
          href="/forgot-password"
          className="font-medium text-primary underline underline-offset-4"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </p>

      <p className="mt-6 text-center text-sm text-muted">
        ¿No tienes cuenta?{' '}
        <Link href="/register" className="font-medium text-primary underline underline-offset-4">
          Regístrate
        </Link>
      </p>
    </AuthPageShell>
  );
}
