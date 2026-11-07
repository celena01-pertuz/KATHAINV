import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { authorizeReceiptRequestMock, createReceiptLinkMock, revokeReceiptLinksMock } = vi.hoisted(
  () => ({
    authorizeReceiptRequestMock: vi.fn(),
    createReceiptLinkMock: vi.fn(),
    revokeReceiptLinksMock: vi.fn(),
  }),
);

vi.mock('../access', () => ({
  authorizeReceiptRequest: authorizeReceiptRequestMock,
}));
vi.mock('@/modules/receipts/service', () => ({
  createReceiptLink: createReceiptLinkMock,
  revokeReceiptLinks: revokeReceiptLinksMock,
}));

import { POST } from '../route';
import { DELETE } from '../[saleId]/route';

function createRequest() {
  return new NextRequest('https://shop.example.test/api/receipts', {
    method: 'POST',
    body: JSON.stringify({ saleId: 18, createdBy: 'browser@example.test' }),
  });
}

describe('/api/receipts access and identity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authorizeReceiptRequestMock.mockResolvedValue({ email: 'owner@example.test' });
  });

  it.each([
    ['unauthenticated', 401],
    ['forbidden', 403],
  ] as const)('returns %i for link creation when access is %s', async (access, status) => {
    authorizeReceiptRequestMock.mockResolvedValue({
      response: Response.json({ error: access }, { status }),
    });

    const response = await POST(createRequest());

    expect(response.status).toBe(status);
    expect(createReceiptLinkMock).not.toHaveBeenCalled();
  });

  it.each([
    ['unauthenticated', 401],
    ['forbidden', 403],
  ] as const)('returns %i for link revocation when access is %s', async (access, status) => {
    authorizeReceiptRequestMock.mockResolvedValue({
      response: Response.json({ error: access }, { status }),
    });

    const response = await DELETE(new Request('https://shop.example.test/api/receipts/18'), {
      params: Promise.resolve({ saleId: '18' }),
    });

    expect(response.status).toBe(status);
    expect(revokeReceiptLinksMock).not.toHaveBeenCalled();
  });

  it('uses the verified session email and not created_by from the request body', async () => {
    createReceiptLinkMock.mockResolvedValue('https://shop.example.test/receipt/token');

    const response = await POST(createRequest());
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.url).toBe('https://shop.example.test/receipt/token');
    expect(createReceiptLinkMock).toHaveBeenCalledWith(
      18,
      'owner@example.test',
      'https://shop.example.test',
    );
    expect(createReceiptLinkMock.mock.calls[0]).toHaveLength(3);
  });

  it('uses the verified session email for revocation', async () => {
    revokeReceiptLinksMock.mockResolvedValue(1);

    const response = await DELETE(new Request('https://shop.example.test/api/receipts/18'), {
      params: Promise.resolve({ saleId: '18' }),
    });

    expect(response.status).toBe(200);
    expect(revokeReceiptLinksMock).toHaveBeenCalledWith(18, 'owner@example.test');
  });
});
