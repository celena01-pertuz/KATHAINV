'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { resetPasswordSchema } from '@/lib/auth/schemas';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { AuthPageShell } from './AuthPageShell';

export function ResetPasswordForm() {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});
  const [formError, setFormError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const parsed = resetPasswordSchema.safeParse({
      password: formData.get('password'),
      confirmPassword: formData.get('confirmPassword'),
    });

    setFieldErrors({});
    setFormError('');
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        password: errors.password?.[0],
        confirmPassword: errors.confirmPassword?.[0],
      });
      return;
    }

    setIsLoading(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password: parsed.data.password,
      });
      if (updateError) {
        setFormError('No se pudo cambiar la contraseña. Solicita un nuevo enlace e inténtalo otra vez.');
        return;
      }

      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        setFormError(
          'La contraseña se cambió, pero no se pudo cerrar la sesión. Cierra sesión e inicia de nuevo.',
        );
        return;
      }

      const cleanupResponse = await fetch('/api/auth/recovery-session', { method: 'POST' });
      if (!cleanupResponse.ok) {
        setFormError(
          'La contraseña se cambió, pero no se pudo finalizar el proceso. Inicia sesión con la nueva contraseña.',
        );
        return;
      }

      router.replace('/login?passwordReset=success');
      router.refresh();
    } catch {
      setFormError('No fue posible completar el cambio. Solicita un nuevo enlace e inténtalo otra vez.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthPageShell
      eyebrow="Nueva contraseña"
      title="Crea una contraseña nueva"
      description="Elige una contraseña segura de al menos 8 caracteres."
    >
      <form
        aria-label="Restablecer contraseña"
        noValidate
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        <Input
          label="Nueva contraseña"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          error={fieldErrors.password}
          onChange={() => {
            setFieldErrors({});
            setFormError('');
          }}
        />
        <Input
          label="Confirmar nueva contraseña"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Repite la contraseña"
          error={fieldErrors.confirmPassword}
          onChange={() => {
            setFieldErrors({});
            setFormError('');
          }}
        />
        {formError && (
          <p role="alert" className="text-sm text-danger">
            {formError}
          </p>
        )}
        <Button type="submit" loading={isLoading} className="w-full">
          {isLoading ? 'Guardando...' : 'Guardar nueva contraseña'}
        </Button>
      </form>
    </AuthPageShell>
  );
}
