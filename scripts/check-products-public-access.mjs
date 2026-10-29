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

let endpoint;
try {
  endpoint = new URL('/rest/v1/products?select=id&limit=1', url);
} catch {
  console.log('NO CONCLUYENTE: NEXT_PUBLIC_SUPABASE_URL no es una URL válida.');
  process.exit(0);
}

let response;
try {
  response = await fetch(endpoint, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });
} catch {
  console.log('NO CONCLUYENTE: error de red al conectar con Supabase.');
  process.exit(0);
}

if (response.status === 401 || response.status === 403 || response.status === 404) {
  console.log(`OK: la clave pública no puede leer products (HTTP ${response.status}).`);
} else if (response.status === 200) {
  console.log('FALLO DE SEGURIDAD: la clave pública pudo leer products (HTTP 200).');
} else {
  console.log(`NO CONCLUYENTE: respuesta HTTP ${response.status}, distinta de 200, 401, 403 o 404.`);
}
