import 'server-only';

import { generateId } from '@/lib/utils';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import type { CustomerRecord } from './types';

interface CustomerRow {
  id: string;
  name: string;
  phone: string;
  document: string | null;
  data_treatment_authorized_at: string;
  data_treatment_notice_version: string;
  data_treatment_authorization_source: CustomerRecord['dataTreatmentAuthorizationSource'];
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface DatabaseError {
  code?: string;
}

type DatabaseResult<T> =
  | {
      data: T;
      error: null;
    }
  | {
      data: null;
      error: DatabaseError;
    };

function mapCustomer(row: CustomerRow): CustomerRecord {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    document: row.document,
    dataTreatmentAuthorizedAt: row.data_treatment_authorized_at,
    dataTreatmentNoticeVersion: row.data_treatment_notice_version,
    dataTreatmentAuthorizationSource: row.data_treatment_authorization_source,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function databaseOperation<T>(
  operation: () => PromiseLike<DatabaseResult<T>>,
): Promise<T> {
  try {
    const result = await operation();
    if (result.error) throw new Error();
    return result.data;
  } catch {
    throw new Error('No se pudo completar la operación de clientes.');
  }
}

function normalizeOptionalDocument(document: string | null): string | null {
  const normalized = document?.trim();
  return normalized || null;
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

export async function listCustomers(search = ''): Promise<CustomerRecord[]> {
  const client = createAdminSupabaseClient();
  const query = search.trim();

  if (!query) {
    const rows = await databaseOperation<CustomerRow[]>(() =>
      client.from('customers').select('*').order('name', { ascending: true }),
    );
    return rows.map(mapCustomer);
  }

  const pattern = `%${escapeLikePattern(query)}%`;
  const phoneNeedle = query.replace(/\D/g, '');
  const phonePattern = `%${escapeLikePattern(phoneNeedle)}%`;
  const [nameRows, phoneRows, documentRows] = await Promise.all([
    databaseOperation<CustomerRow[]>(() =>
      client.from('customers').select('*').ilike('name', pattern),
    ),
    phoneNeedle
      ? databaseOperation<CustomerRow[]>(() =>
          client.from('customers').select('*').ilike('phone', phonePattern),
        )
      : Promise.resolve([]),
    databaseOperation<CustomerRow[]>(() =>
      client.from('customers').select('*').ilike('document', pattern),
    ),
  ]);
  const uniqueRows = new Map<string, CustomerRow>();
  for (const row of [...nameRows, ...phoneRows, ...documentRows]) {
    uniqueRows.set(row.id, row);
  }

  return [...uniqueRows.values()]
    .map(mapCustomer)
    .sort((left, right) => left.name.localeCompare(right.name, 'es-CO'));
}

export async function hasDuplicateCustomerPhone(
  phone: string,
  excludeId?: string,
): Promise<boolean> {
  const client = createAdminSupabaseClient();
  const duplicate = await databaseOperation<CustomerRow | null>(() => {
    let query = client.from('customers').select('id').eq('phone', phone);
    if (excludeId) query = query.neq('id', excludeId);
    return query.limit(1).maybeSingle();
  });
  return duplicate !== null;
}

export async function createCustomer(input: {
  name: string;
  phone: string;
  document: string | null;
  authorizedAt: string;
  noticeVersion: string;
  authorizationSource: CustomerRecord['dataTreatmentAuthorizationSource'];
}): Promise<CustomerRecord> {
  const client = createAdminSupabaseClient();
  const row = await databaseOperation<CustomerRow | null>(() =>
    client
      .from('customers')
      .insert({
        id: generateId('customer'),
        name: input.name,
        phone: input.phone,
        document: normalizeOptionalDocument(input.document),
        data_treatment_authorized_at: input.authorizedAt,
        data_treatment_notice_version: input.noticeVersion,
        data_treatment_authorization_source: input.authorizationSource,
      })
      .select('*')
      .single(),
  );
  if (!row) throw new Error('No se pudo completar la operación de clientes.');
  return mapCustomer(row);
}

export async function updateCustomer(
  id: string,
  input: { name: string; phone: string; document: string | null },
): Promise<CustomerRecord | null> {
  const client = createAdminSupabaseClient();
  const row = await databaseOperation<CustomerRow | null>(() =>
    client
      .from('customers')
      .update({ ...input, document: normalizeOptionalDocument(input.document) })
      .eq('id', id)
      .select('*')
      .maybeSingle(),
  );
  return row ? mapCustomer(row) : null;
}

export async function setCustomerActive(
  id: string,
  active: boolean,
): Promise<CustomerRecord | null> {
  const client = createAdminSupabaseClient();
  const row = await databaseOperation<CustomerRow | null>(() =>
    client
      .from('customers')
      .update({ active })
      .eq('id', id)
      .select('*')
      .maybeSingle(),
  );
  return row ? mapCustomer(row) : null;
}
