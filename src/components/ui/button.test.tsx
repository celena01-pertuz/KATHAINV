import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './button';

describe('Button', () => {
  it('no dispara onClick cuando está deshabilitado', () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Guardar
      </Button>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it('muestra el Spinner y bloquea onClick mientras carga', () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Guardar
      </Button>,
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Guardar/ }));

    expect(screen.getByRole('button', { name: /Guardar/ })).toBeDisabled();
    expect(onClick).not.toHaveBeenCalled();
  });
});
