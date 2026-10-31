import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { generateReceiptToken, hashReceiptToken } from '../token';

describe('token de comprobante', () => {
  it('genera 32 bytes aleatorios en base64url y devuelve su SHA-256 hexadecimal', () => {
    const { token, tokenHash } = generateReceiptToken();
    const decoded = Buffer.from(token, 'base64url');

    expect(decoded).toHaveLength(32);
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(tokenHash).toBe(createHash('sha256').update(token, 'utf8').digest('hex'));
    expect(tokenHash).toHaveLength(64);
    expect(hashReceiptToken(token)).toBe(tokenHash);
  });
});
