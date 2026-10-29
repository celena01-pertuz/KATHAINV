'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { changePasswordSchema } from '@/lib/auth/schemas';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export function ChangePasswordForm() {
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirmPassword?: string }>(
    {},
  );
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const parsed = changePasswordSchema.safeParse({
      password: formData.get('password'),
      confirmPassword: formData.get('confirmPassword'),
    });

    setFieldErrors({});
    setFormError('');
    setSuccessMessage('');
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
      const { error } = await createBrowserSupabaseClient().auth.updateUser({
        password: parsed.data.password,
      });

      if (error) {
        setFormError('No se pudo cambiar la contraseña. Inténtalo de nuevo.');
        return;
      }

      form.reset();
      setSuccessMessage('Tu contraseña se cambió correctamente.');
    } catch {
      setFormError('No fue posible conectar con el servicio. Inténtalo más tarde.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form
      aria-label="Cambiar contraseña"
      noValidate
      onSubmit={handleSubmit}
      className="max-w-md space-y-5"
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
          setSuccessMessage('');
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
          setSuccessMessage('');
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
        {isLoading ? 'Guardando...' : 'Cambiar contraseña'}
      </Button>
    </form>
  );
}
