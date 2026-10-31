import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSaleRequestKey } from '../request-key';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('clave de solicitud de venta', () => {
  it('genera una clave UUID nueva para una venta', () => {
    const randomUUID = vi.fn().mockReturnValue('9c77dcc1-6f9c-4581-8cde-7c75d5bc9908');
    vi.stubGlobal('crypto', { randomUUID });

    expect(createSaleRequestKey()).toBe('9c77dcc1-6f9c-4581-8cde-7c75d5bc9908');
    expect(randomUUID).toHaveBeenCalledOnce();

  });
});
