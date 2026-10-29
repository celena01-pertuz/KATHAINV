import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Input } from './input';

describe('Input', () => {
  it('muestra el error y marca el campo como inválido', () => {
    render(<Input label="Correo electrónico" error="Ingresa un correo válido." />);

    const input = screen.getByLabelText('Correo electrónico');

    expect(screen.getByText('Ingresa un correo válido.')).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input.getAttribute('aria-describedby')).toContain('error');
  });
});
