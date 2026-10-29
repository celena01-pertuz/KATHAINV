import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BarcodeSvg } from '../components/ProductLabelPrint';

afterEach(cleanup);

describe('BarcodeSvg', () => {
  it('dibuja barras Code 128 y el valor visible coincide con el código recibido', async () => {
    const onError = vi.fn();
    const { container } = render(
      <BarcodeSvg code="KAT-000123" widthMm={50} onError={onError} />,
    );
    const svg = container.querySelector('svg');

    expect(svg).not.toBeNull();
    await waitFor(() => {
      expect(svg?.querySelector('text')?.textContent).toBe('KAT-000123');
      expect(svg?.querySelectorAll('g rect').length).toBeGreaterThan(0);
    });
    expect(svg?.getAttribute('aria-label')).toBe('Código de barras Code 128: KAT-000123');
    expect(onError).not.toHaveBeenCalled();
  });
});
