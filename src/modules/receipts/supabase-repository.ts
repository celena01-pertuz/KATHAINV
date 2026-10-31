import 'server-only';

import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { publicReceiptSchema } from './schemas';
import type { PublicReceipt } from './types';

export async function createReceiptLink(
  saleId: number,
  tokenHash: string,
  createdBy: string,
): Promise<void> {
  const client = createAdminSupabaseClient();
  const { error } = await client.rpc('create_receipt_link', {
    p_sale_id: saleId,
    p_token_hash: tokenHash,
    p_created_by: createdBy,
  });

  if (error) throw new Error('No se pudo crear el enlace del comprobante.');
}

export async function revokeReceiptLinks(
  saleId: number,
  revokedBy: string,
): Promise<number> {
  const client = createAdminSupabaseClient();
  const { data, error } = await client.rpc('revoke_receipt_links', {
    p_sale_id: saleId,
    p_revoked_by: revokedBy,
  });

  if (error || typeof data !== 'number') {
    throw new Error('No se pudo revocar el enlace del comprobante.');
  }
  return data;
}

export async function findPublicReceipt(tokenHash: string): Promise<PublicReceipt | null> {
  const client = createAdminSupabaseClient();
  const { data, error } = await client.rpc('get_public_receipt', {
    p_token_hash: tokenHash,
  });

  if (error) throw new Error('No se pudo consultar el comprobante.');
  if (data === null) return null;

  const parsed = publicReceiptSchema.safeParse(data);
  if (!parsed.success) throw new Error('No se pudo consultar el comprobante.');
  return parsed.data;
}
