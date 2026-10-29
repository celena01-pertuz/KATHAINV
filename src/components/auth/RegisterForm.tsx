'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { registerSchema } from '@/lib/auth/schemas';
import { AuthPageShell } from './AuthPageShell';

export function RegisterForm() {
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const parsed = registerSchema.safeParse({
      email: formData.get('email'),
      password: formData.get('password'),
    });

    setFormError('');
    setSuccessMessage('');
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      setFieldErrors({ email: errors.email?.[0], password: errors.password?.[0] });
      return;
    }

    setFieldErrors({});
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const result: { error?: string; message?: string } = await response.json();

      if (!response.ok) {
        setFormError(result.error ?? 'No se pudo completar el registro. Inténtalo de nuevo.');
        return;
      }

      setSuccessMessage(
        result.message ??
          'Si el correo está autorizado, recibirás un mensaje para confirmar tu cuenta.',
      );
      form.reset();
    } catch {
      setFormError('No fue posible conectar con el servicio. Inténtalo más tarde.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthPageShell
      eyebrow="Crear cuenta"
      title="Regístrate"
      description="Solo las direcciones autorizadas podrán acceder al inventario."
    >
      <form aria-label="Crear cuenta" noValidate onSubmit={handleSubmit} className="space-y-5">
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
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
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
        {successMessage && (
          <p role="status" className="text-sm text-success">
            {successMessage}
          </p>
        )}
        <Button type="submit" loading={isLoading} className="w-full">
          {isLoading ? 'Creando cuenta...' : 'Crear cuenta'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="font-medium text-primary underline underline-offset-4">
          Inicia sesión
        </Link>
      </p>
    </AuthPageShell>
  );
}
