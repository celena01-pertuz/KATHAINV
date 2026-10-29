import { ChangePasswordForm } from '@/components/auth/ChangePasswordForm';

export default function AccountPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-16">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Cuenta</p>
      <h1 className="mt-2 text-3xl font-semibold">Cambiar contraseña</h1>
      <p className="mb-8 mt-2 max-w-xl text-sm leading-6 text-muted">
        Elige una contraseña nueva de al menos 8 caracteres.
      </p>
      <ChangePasswordForm />
    </main>
  );
}
