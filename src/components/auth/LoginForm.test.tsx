import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginForm } from './LoginForm';

const { refresh, replace } = vi.hoisted(() => ({ refresh: vi.fn(), replace: vi.fn() }));
const fetchMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, replace }),
}));

describe('LoginForm', () => {
  beforeEach(() => {
    replace.mockClear();
    refresh.mockClear();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('muestra errores junto a los campos inválidos sin llamar a la API', () => {
    render(<LoginForm />);

    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(screen.getByText('Ingresa un correo válido.')).toBeInTheDocument();
    expect(screen.getByText('Ingresa tu contraseña.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('muestra el error genérico devuelto al fallar el inicio de sesión', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Correo o contraseña incorrectos.' }),
    });
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'otro@ejemplo.com' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'incorrecta' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Correo o contraseña incorrectos.')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('redirige al inicio cuando la API autentica correctamente', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'duena@ejemplo.com' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'contraseña-segura' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    expect(refresh).toHaveBeenCalled();
  });
});
