import 'server-only';

import {
  findPublicReceipt,
  createReceiptLink as createReceiptLinkRpc,
  revokeReceiptLinks as revokeReceiptLinksRpc,
} from './supabase-repository';
import { generateReceiptToken, hashReceiptToken } from './token';
import type { PublicReceipt } from './types';

function resolveOrigin(requestOrigin: string): string {
  try {
    return new URL(requestOrigin).origin;
  } catch {
    const siteUrl = process.env.SITE_URL;
    if (!siteUrl) throw new Error('No se pudo determinar el origen del comprobante.');
    try {
      return new URL(siteUrl).origin;
    } catch {
      throw new Error('No se pudo determinar el origen del comprobante.');
    }
  }
}

export async function createReceiptLink(
  saleId: number,
  createdBy: string,
  requestOrigin: string,
): Promise<string> {
  const { token, tokenHash } = generateReceiptToken();
  await createReceiptLinkRpc(saleId, tokenHash, createdBy);
  return new URL(`/receipt/${token}`, resolveOrigin(requestOrigin)).toString();
}

export async function revokeReceiptLinks(saleId: number, revokedBy: string): Promise<number> {
  return revokeReceiptLinksRpc(saleId, revokedBy);
}

export async function getPublicReceipt(token: string): Promise<PublicReceipt | null> {
  return findPublicReceipt(hashReceiptToken(token));
}
