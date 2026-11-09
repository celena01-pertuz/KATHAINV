import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PageHeader } from './PageHeader';
import { EmptyState, LoadingState, RetryState } from './PageStates';

describe('PageHeader', () => {
  it('muestra el título, la ayuda y una acción principal opcional', () => {
    const onClick = vi.fn();
    render(
      <PageHeader
        title="Clientes"
        description="Consulta y administra tus clientes."
        primaryAction={
          <button type="button" onClick={onClick}>
            Nuevo cliente
          </button>
        }
      />,
    );

    expect(screen.getByRole('heading', { name: 'Clientes' })).toBeInTheDocument();
    expect(screen.getByText('Consulta y administra tus clientes.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo cliente' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('muestra mensajes de lista vacía y un estado de carga accesible', () => {
    const { rerender } = render(<EmptyState>Todavía no hay clientes.</EmptyState>);
    expect(screen.getByText('Todavía no hay clientes.')).toBeInTheDocument();

    rerender(<LoadingState label="Cargando clientes" />);
    expect(screen.getByRole('status', { name: 'Cargando clientes' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
  });

  it('permite reintentar después de un error', () => {
    const onRetry = vi.fn();
    render(<RetryState message="No pudimos cargar los clientes." onRetry={onRetry} />);

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
