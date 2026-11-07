import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { createServerClientMock } = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: createServerClientMock,
}));
vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>();
  return {
    ...actual,
    NextResponse: {
      ...actual.NextResponse,
      next: () => new actual.NextResponse(),
    },
  };
});

import { isPublicPagePath, updateSupabaseSession } from '../middleware';

describe('rutas públicas del middleware', () => {
  it('permite recibos sin hacer una comprobación de sesión', async () => {
    const response = await updateSupabaseSession(
      new NextRequest('https://shop.example.test/receipt/abc123'),
    );

    expect(response.headers.get('Cache-Control')).toBe('no-store, max-age=0');
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex');
    expect(response.headers.get('Referrer-Policy')).toBe('no-referrer');
    expect(createServerClientMock).not.toHaveBeenCalled();
  });

  it('mantiene pública solo la lista prevista y una única ruta de recibo', () => {
    expect(isPublicPagePath('/login')).toBe(true);
    expect(isPublicPagePath('/receipt/token')).toBe(true);
    expect(isPublicPagePath('/receipt/')).toBe(false);
    expect(isPublicPagePath('/receipt/token/extra')).toBe(false);
    expect(isPublicPagePath('/sales')).toBe(false);
    expect(isPublicPagePath('/api/receipts')).toBe(false);
  });
});
