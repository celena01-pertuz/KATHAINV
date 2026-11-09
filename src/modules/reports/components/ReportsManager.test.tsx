import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReportsManager } from './ReportsManager';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ReportsManager interfaz', () => {
  it('muestra el estado vacío en español y una sola acción principal', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            summary: { unitsSold: 0, totalSold: 0, salesCount: 0 },
            mostSold: [],
            leastSold: [],
          },
        }),
      }),
    );

    const { container } = render(<ReportsManager />);

    expect(await screen.findByText('Todavía no hay ventas en este periodo.')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-primary-action]')).toHaveLength(1);
  });
});
