import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RegisterForm } from './RegisterForm';

const fetchMock = vi.fn();

describe('RegisterForm', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('exige nombre, correo y contraseña antes de llamar a la API', () => {
    render(<RegisterForm />);

    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(
      screen.getByText('Escribe cómo quieres que te llamemos, entre 2 y 40 letras.'),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('incluye el nombre validado al crear la cuenta', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, message: 'Revisa tu correo.' }),
    });
    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText('¿Cómo te llamamos?'), {
      target: { value: 'Celena Pertuz' },
    });
    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'celena@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'contraseña-segura' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await screen.findByText('Revisa tu correo.');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/register',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          email: 'celena@example.com',
          password: 'contraseña-segura',
          fullName: 'Celena Pertuz',
        }),
      }),
    );
  });
});
