import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

const { usePathnameMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: usePathnameMock,
}));

import { BottomNav } from './BottomNav';

beforeEach(() => {
  usePathnameMock.mockReturnValue('/');
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('BottomNav', () => {
  it('shows the primary links and keeps every other page under Más', () => {
    render(<BottomNav />);

    expect(screen.getAllByRole('link', { name: 'Proveedores' })[0]).toHaveAttribute(
      'href',
      '/purchases',
    );
    expect(screen.queryByRole('link', { name: 'Compras' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Reportes' })).not.toBeInTheDocument();

    for (const href of ['/customers', '/scan', '/purchases']) {
      expect(screen.getAllByRole('link').some((link) => link.getAttribute('href') === href)).toBe(
        true,
      );
    }
  });

  it('opens Más, focuses its first option, and closes with Escape or an outside tap', () => {
    render(<BottomNav />);
    const moreButton = screen.getByRole('button', { name: 'Más' });

    fireEvent.click(moreButton);
    expect(moreButton).toHaveAttribute('aria-expanded', 'true');
    const panel = screen.getByRole('region', { name: 'Más opciones de navegación' });
    expect(panel).toBeInTheDocument();
    expect(within(panel).getByRole('link', { name: 'Clientes' })).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(moreButton).toHaveAttribute('aria-expanded', 'false');
    expect(moreButton).toHaveFocus();

    fireEvent.click(moreButton);
    fireEvent.pointerDown(document.body);
    expect(moreButton).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.queryByRole('region', { name: 'Más opciones de navegación' }),
    ).not.toBeInTheDocument();
  });

  it('marks Más active on routes contained in its group', () => {
    const { rerender } = render(<BottomNav />);
    for (const pathname of ['/customers', '/scan', '/purchases']) {
      usePathnameMock.mockReturnValue(pathname);
      rerender(<BottomNav />);
      expect(screen.getByRole('button', { name: 'Más' })).toHaveClass(
        'bg-primary',
        'text-primary-foreground',
      );
    }
  });

  it('closes Más after choosing a destination', () => {
    render(<BottomNav />);
    const moreButton = screen.getByRole('button', { name: 'Más' });
    fireEvent.click(moreButton);
    const scannerLink = within(
      screen.getByRole('region', { name: 'Más opciones de navegación' }),
    ).getByRole('link', { name: 'Escáner' });
    scannerLink.addEventListener('click', (event) => event.preventDefault());
    fireEvent.click(scannerLink);

    expect(moreButton).toHaveAttribute('aria-expanded', 'false');
  });
});
