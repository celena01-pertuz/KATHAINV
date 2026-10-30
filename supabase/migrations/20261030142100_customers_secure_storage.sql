-- Fase 3.3A: almacenamiento seguro de clientes.
-- Revisar y ejecutar manualmente en el proyecto Supabase. Esta migración no se
-- ejecuta desde la aplicación ni importa o modifica archivos JSON locales.

-- El teléfono se guarda como 57 seguido de los diez dígitos del número
-- colombiano, sin signo +, espacios ni otros caracteres. No es único: la
-- aplicación debe avisar si ya existe, pero permitir guardar el cliente.
CREATE TABLE public.customers (
  id text PRIMARY KEY,
  name text NOT NULL CHECK (pg_catalog.btrim(name) <> ''),
  phone text NOT NULL CHECK (phone ~ '^57[0-9]{10}$'),
  document text CHECK (
    document IS NULL OR pg_catalog.btrim(document) <> ''
  ),
  data_treatment_authorized_at timestamptz NOT NULL,
  data_treatment_notice_version text NOT NULL
    CHECK (pg_catalog.btrim(data_treatment_notice_version) <> ''),
  data_treatment_authorization_source text NOT NULL
    CHECK (pg_catalog.btrim(data_treatment_authorization_source) <> ''),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now()
);

COMMENT ON TABLE public.customers IS
  'Clientes; sus datos personales solo se consultan desde el servidor autorizado.';
COMMENT ON COLUMN public.customers.phone IS
  'Teléfono colombiano normalizado: 57 seguido de diez dígitos, sin símbolos.';
COMMENT ON COLUMN public.customers.document IS
  'Documento opcional del cliente.';
COMMENT ON COLUMN public.customers.data_treatment_authorized_at IS
  'Fecha y hora en que el cliente autorizó el tratamiento de sus datos.';
COMMENT ON COLUMN public.customers.data_treatment_notice_version IS
  'Versión del aviso de tratamiento de datos que aceptó el cliente.';
COMMENT ON COLUMN public.customers.data_treatment_authorization_source IS
  'Origen en que se obtuvo la autorización, por ejemplo formulario o registro presencial.';
COMMENT ON COLUMN public.customers.active IS
  'Permite desactivar un cliente sin borrar su historial.';

-- Índices para búsquedas por nombre (sin distinguir mayúsculas), teléfono y
-- documento. El teléfono no es único para permitir avisar sin bloquear el alta.
CREATE INDEX customers_name_search_idx
  ON public.customers (pg_catalog.lower(name));
CREATE INDEX customers_phone_search_idx
  ON public.customers (phone);
CREATE INDEX customers_document_search_idx
  ON public.customers (document)
  WHERE document IS NOT NULL;

-- Conserva las fechas originales y prohíbe borrar clientes. Para retirar un
-- cliente del uso habitual, la aplicación debe cambiar active a false.
CREATE FUNCTION public.protect_customer_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'Los clientes se desactivan; no se eliminan.';
  END IF;

  NEW.id := OLD.id;
  NEW.created_at := OLD.created_at;
  NEW.updated_at := pg_catalog.now();
  RETURN NEW;
END;
$function$;

CREATE TRIGGER customers_protect_row
BEFORE UPDATE OR DELETE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.protect_customer_row();

-- Sin políticas RLS, anon y authenticated quedan denegados. El servidor
-- autorizado accede con SUPABASE_SECRET_KEY y el rol service_role.
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.customers FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.protect_customer_row() FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON TABLE public.customers TO service_role;
GRANT EXECUTE ON FUNCTION public.protect_customer_row() TO service_role;

-- Verificaciones: cada fila debe mostrar resultado = 'OK'.
-- La consulta solo devuelve el nombre de la revisión, el resultado y lo esperado.
WITH checks AS (
  SELECT
    '1. RLS habilitado y forzado'::text AS revision,
    CASE
      WHEN COALESCE(
        (
          SELECT relation.relrowsecurity AND relation.relforcerowsecurity
          FROM pg_catalog.pg_class AS relation
          JOIN pg_catalog.pg_namespace AS namespace
            ON namespace.oid = relation.relnamespace
          WHERE namespace.nspname = 'public'
            AND relation.relname = 'customers'
            AND relation.relkind = 'r'
        ),
        false
      )
        THEN 'OK'
      ELSE 'FALLO'
    END AS resultado,
    'rls_enabled = true y rls_forced = true'::text AS esperado

  UNION ALL

  SELECT
    '2. Sin políticas RLS',
    CASE
      WHEN (
        SELECT pg_catalog.count(*)
        FROM pg_catalog.pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'customers'
      ) = 0 THEN 'OK'
      ELSE 'FALLO'
    END,
    'cero políticas para customers'

  UNION ALL

  SELECT
    '3. Permisos de anon y authenticated',
    CASE
      WHEN NOT pg_catalog.has_table_privilege('anon', 'public.customers', 'SELECT')
        AND NOT pg_catalog.has_table_privilege('anon', 'public.customers', 'INSERT')
        AND NOT pg_catalog.has_table_privilege('anon', 'public.customers', 'UPDATE')
        AND NOT pg_catalog.has_table_privilege('anon', 'public.customers', 'DELETE')
        AND NOT pg_catalog.has_table_privilege('authenticated', 'public.customers', 'SELECT')
        AND NOT pg_catalog.has_table_privilege('authenticated', 'public.customers', 'INSERT')
        AND NOT pg_catalog.has_table_privilege('authenticated', 'public.customers', 'UPDATE')
        AND NOT pg_catalog.has_table_privilege('authenticated', 'public.customers', 'DELETE')
        THEN 'OK'
      ELSE 'FALLO'
    END,
    'anon y authenticated sin permisos de lectura ni escritura'

  UNION ALL

  SELECT
    '4. Permisos de service_role',
    CASE
      WHEN pg_catalog.has_table_privilege('service_role', 'public.customers', 'SELECT')
        AND pg_catalog.has_table_privilege('service_role', 'public.customers', 'INSERT')
        AND pg_catalog.has_table_privilege('service_role', 'public.customers', 'UPDATE')
        AND NOT pg_catalog.has_table_privilege('service_role', 'public.customers', 'DELETE')
        THEN 'OK'
      ELSE 'FALLO'
    END,
    'service_role puede leer, crear y actualizar, pero no borrar'

  UNION ALL

  SELECT
    '5. Función de protección',
    CASE
      WHEN pg_catalog.has_function_privilege(
        'service_role',
        'public.protect_customer_row()',
        'EXECUTE'
      )
        AND NOT pg_catalog.has_function_privilege(
          'anon',
          'public.protect_customer_row()',
          'EXECUTE'
        )
        AND NOT pg_catalog.has_function_privilege(
          'authenticated',
          'public.protect_customer_row()',
          'EXECUTE'
        )
        THEN 'OK'
      ELSE 'FALLO'
    END,
    'solo service_role puede ejecutar la función de protección'
)
SELECT revision, resultado, esperado
FROM checks
ORDER BY revision;
