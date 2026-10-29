'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { loginSchema } from '@/lib/auth/schemas';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { AuthPageShell } from './AuthPageShell';

const genericMessage = 'Si el correo está registrado, recibirás un enlace.';

export function ForgotPasswordForm() {
  const [emailError, setEmailError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const parsed = loginSchema.shape.email.safeParse(new FormData(form).get('email'));

    setEmailError('');
    setMessage('');
    if (!parsed.success) {
      setEmailError(parsed.error.issues[0]?.message ?? 'Ingresa un correo válido.');
      return;
    }

    setIsLoading(true);
    try {
      const redirectTo = new URL('/auth/callback', window.location.origin);
      redirectTo.searchParams.set('next', '/reset-password');

      const { error } = await createBrowserSupabaseClient().auth.resetPasswordForEmail(
        parsed.data,
        { redirectTo: redirectTo.toString() },
      );
      if (error) {
        console.error('No se pudo solicitar la recuperación de contraseña.', {
          status: error.status,
          code: error.code,
        });
      }
    } catch (error) {
      console.error('No se pudo completar la solicitud de recuperación de contraseña.', error);
    } finally {
      setMessage(genericMessage);
      setIsLoading(false);
    }
  }

  return (
    <AuthPageShell
      eyebrow="Recuperar acceso"
      title="¿Olvidaste tu contraseña?"
      description="Ingresa el correo asociado a tu cuenta y te enviaremos un enlace."
    >
      <form
        aria-label="Recuperar contraseña"
        noValidate
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        <Input
          label="Correo electrónico"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="nombre@ejemplo.com"
          error={emailError}
          onChange={() => {
            setEmailError('');
            setMessage('');
          }}
        />
        {message && (
          <p role="status" className="text-sm text-success">
            {message}
          </p>
        )}
        <Button type="submit" loading={isLoading} className="w-full">
          {isLoading ? 'Enviando...' : 'Enviar enlace'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="font-medium text-primary underline underline-offset-4">
          Volver a iniciar sesión
        </Link>
      </p>
    </AuthPageShell>
  );
}
