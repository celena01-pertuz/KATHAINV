import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createReceiptLinkMock, revokeReceiptLinksMock, findPublicReceiptMock } = vi.hoisted(
  () => ({
    createReceiptLinkMock: vi.fn(),
    revokeReceiptLinksMock: vi.fn(),
    findPublicReceiptMock: vi.fn(),
  }),
);

vi.mock('server-only', () => ({}));
vi.mock('../supabase-repository', () => ({
  createReceiptLink: createReceiptLinkMock,
  revokeReceiptLinks: revokeReceiptLinksMock,
  findPublicReceipt: findPublicReceiptMock,
}));

import { createReceiptLink, getPublicReceipt, revokeReceiptLinks } from '../service';
import { hashReceiptToken } from '../token';

describe('servicio de comprobantes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('guarda solamente el hash y devuelve el enlace público una vez', async () => {
    const url = await createReceiptLink(18, 'owner@example.test', 'https://shop.example.test');
    const savedHash = createReceiptLinkMock.mock.calls[0][1] as string;
    const token = new URL(url).pathname.split('/').at(-1);

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(savedHash).toBe(hashReceiptToken(token!));
    expect(createReceiptLinkMock).toHaveBeenCalledWith(
      18,
      savedHash,
      'owner@example.test',
    );
    expect(url).toBe(`https://shop.example.test/receipt/${token}`);
  });

  it('calcula el hash del token antes de consultar el comprobante', async () => {
    findPublicReceiptMock.mockResolvedValue(null);

    await expect(getPublicReceipt('token-publico')).resolves.toBeNull();
    expect(findPublicReceiptMock).toHaveBeenCalledWith(hashReceiptToken('token-publico'));
  });

  it('delega la revocación con la identidad verificada del servidor', async () => {
    revokeReceiptLinksMock.mockResolvedValue(1);

    await expect(revokeReceiptLinks(18, 'owner@example.test')).resolves.toBe(1);
    expect(revokeReceiptLinksMock).toHaveBeenCalledWith(18, 'owner@example.test');
  });
});
