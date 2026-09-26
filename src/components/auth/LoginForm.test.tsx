import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginForm } from './LoginForm';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

describe('LoginForm', () => {
  beforeEach(() => {
    push.mockClear();
  });

  it('muestra errores junto a los campos inválidos', () => {
    render(<LoginForm />);

    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(screen.getByText('Ingresa un correo válido.')).toBeInTheDocument();
    expect(screen.getByText('Ingresa tu contraseña.')).toBeInTheDocument();
  });

  it('muestra un error si las credenciales no coinciden', async () => {
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'otro@ejemplo.com' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'incorrecta' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(screen.getByRole('button', { name: 'Entrando...' })).toBeDisabled();
    expect(await screen.findByText('Correo o contraseña incorrectos')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('redirige al inicio con las credenciales de demostración', async () => {
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'demo@kathainv.com' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'demo1234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/'));
  });
});