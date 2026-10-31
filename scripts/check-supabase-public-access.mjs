import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(projectRoot, '.env.local');

function parseEnv(contents) {
  const variables = new Map();
  for (const line of contents.split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match) continue;

    let value = match[2];
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, '');
    }

    variables.set(match[1], value);
  }
  return variables;
}

let contents;
try {
  contents = await readFile(envPath, 'utf8');
} catch {
  console.log('NO CONCLUYENTE: no se pudo leer .env.local.');
  process.exit(0);
}

const variables = parseEnv(contents);
const url = variables.get('NEXT_PUBLIC_SUPABASE_URL');
const key = variables.get('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');

if (!url || !key) {
  console.log(
    'NO CONCLUYENTE: falta NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en .env.local.',
  );
  process.exit(0);
}

let baseUrl;
try {
  baseUrl = new URL(url);
} catch {
  console.log('NO CONCLUYENTE: NEXT_PUBLIC_SUPABASE_URL no es una URL válida.');
  process.exit(0);
}

for (const table of [
  'products',
  'customers',
  'sales',
  'sale_items',
  'sale_payments',
  'sale_receipt_tokens',
]) {
  let response;
  try {
    const endpoint = new URL(`/rest/v1/${table}?select=id&limit=1`, baseUrl);
    response = await fetch(endpoint, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });
  } catch {
    console.log(`NO CONCLUYENTE: ${table}, error de red al conectar con Supabase.`);
    continue;
  }

  if (response.status === 401 || response.status === 403) {
    console.log(`OK: la clave pública no puede leer ${table} (HTTP ${response.status}).`);
  } else if (response.status === 200) {
    console.log(`FALLO DE SEGURIDAD: la clave pública pudo leer ${table} (HTTP 200).`);
  } else {
    console.log(`NO CONCLUYENTE: ${table}, respuesta HTTP ${response.status}.`);
  }
}

const rpcChecks = [
  {
    name: 'get_public_receipt',
    payload: { p_token_hash: '0'.repeat(64) },
  },
  {
    name: 'create_receipt_link',
    payload: {
      p_sale_id: -1,
      p_token_hash: '0'.repeat(64),
      p_created_by: 'x@x.invalid',
    },
  },
  {
    name: 'revoke_receipt_links',
    payload: { p_sale_id: -1, p_revoked_by: 'x@x.invalid' },
  },
  {
    name: 'create_sale',
    payload: {
      p_customer_id: null,
      p_items: [],
      p_payment_type: 'cash',
      p_initial_payment: null,
      p_payment_method: 'efectivo',
      p_request_key: `public-access-check-${Date.now()}`,
      p_created_by: 'x@x.invalid',
    },
  },
];

for (const { name, payload } of rpcChecks) {
  let response;
  try {
    const endpoint = new URL(`/rest/v1/rpc/${name}`, baseUrl);
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    console.log(`NO CONCLUYENTE: ${name}, error de red al conectar con Supabase.`);
    continue;
  }

  if (response.status === 401 || response.status === 403) {
    console.log(`OK: la clave pública no puede ejecutar ${name} (HTTP ${response.status}).`);
  } else if (response.status === 200 || response.status === 400) {
    console.log(`FALLO DE SEGURIDAD: la clave pública ejecutó ${name} (HTTP ${response.status}).`);
  } else {
    console.log(`NO CONCLUYENTE: ${name}, respuesta HTTP ${response.status}.`);
  }
}
