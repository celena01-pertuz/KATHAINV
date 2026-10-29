-- Fase 4.1: almacenamiento seguro de productos.
-- Ejecutar manualmente en el proyecto Supabase, una sola vez, después de revisar
-- este archivo. La migración no importa ni modifica los archivos JSON locales.

-- Consecutivo de códigos internos. NO CYCLE evita volver al inicio; los valores
-- consumidos no se reutilizan aunque la inserción se cancele o el producto se borre.
CREATE SEQUENCE public.product_internal_code_seq
  AS bigint
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1
  NO CYCLE;

-- Una fila representa una variante vendible. Las variantes del mismo modelo
-- comparten variant_group_id, pero tienen código y existencias propios.
CREATE TABLE public.products (
  id text PRIMARY KEY,
  code text NOT NULL,
  normalized_code text GENERATED ALWAYS AS (
    pg_catalog.upper(pg_catalog.regexp_replace(code, '[[:space:]]+', '', 'g'))
  ) STORED,
  code_type text NOT NULL DEFAULT 'factory'
    CHECK (code_type IN ('internal', 'factory')),
  variant_group_id text NOT NULL CHECK (pg_catalog.btrim(variant_group_id) <> ''),
  name text NOT NULL CHECK (pg_catalog.btrim(name) <> ''),
  category text NOT NULL CHECK (category IN ('ropa', 'calzado', 'bolso', 'accesorio')),
  size text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT '',
  cost_price integer NOT NULL CHECK (cost_price >= 0),
  sale_price integer NOT NULL CHECK (sale_price > 0),
  stock integer NOT NULL CHECK (stock >= 0),
  min_stock integer NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT products_normalized_code_not_empty CHECK (normalized_code <> ''),
  CONSTRAINT products_normalized_code_unique UNIQUE (normalized_code)
);

-- Los nombres de columnas conservan la correspondencia con los campos
-- existentes del módulo, en snake_case para PostgreSQL.
COMMENT ON TABLE public.products IS
  'Productos vendibles; cada variante tiene código y stock propios.';
COMMENT ON COLUMN public.products.normalized_code IS
  'Código sin espacios y en mayúsculas; su unicidad evita duplicados de escritura concurrente.';
COMMENT ON COLUMN public.products.variant_group_id IS
  'Identificador compartido por las variantes del mismo modelo.';
COMMENT ON COLUMN public.products.cost_price IS
  'Costo en pesos colombianos enteros, sin centavos.';
COMMENT ON COLUMN public.products.sale_price IS
  'Precio de venta en pesos colombianos enteros, sin centavos.';
COMMENT ON COLUMN public.products.stock IS
  'Existencias actuales de esta variante.';
COMMENT ON COLUMN public.products.min_stock IS
  'Nivel mínimo de existencias configurado para esta variante.';

-- Si el servidor omite el código al crear un producto, la base de datos consume
-- la secuencia y forma KAT-000001, KAT-000002, etc. Los códigos escritos por la
-- persona se conservan. En actualizaciones, created_at no cambia y updated_at
-- se actualiza en la base de datos.
CREATE FUNCTION public.prepare_product_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  generated_code text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.code IS NULL OR pg_catalog.btrim(NEW.code) = '' THEN
      LOOP
        generated_code :=
          'KAT-' || pg_catalog.lpad(
            pg_catalog.nextval('public.product_internal_code_seq'::pg_catalog.regclass)::text,
            6,
            '0'
          );
        EXIT WHEN NOT EXISTS (
          SELECT 1
          FROM public.products AS existing
          WHERE existing.normalized_code =
            pg_catalog.upper(pg_catalog.regexp_replace(generated_code, '[[:space:]]+', '', 'g'))
        );
      END LOOP;
      NEW.code := generated_code;
      NEW.code_type := 'internal';
    ELSE
      NEW.code_type := COALESCE(NEW.code_type, 'factory');
    END IF;
  ELSE
    NEW.created_at := OLD.created_at;
    NEW.updated_at := pg_catalog.now();
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER products_prepare_row
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.prepare_product_row();

-- La tabla no tiene políticas RLS: anon y authenticated quedan denegados por
-- defecto. El servidor autorizado usará SUPABASE_SECRET_KEY con el rol service_role.
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.products FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.product_internal_code_seq FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prepare_product_row() FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.products TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.product_internal_code_seq TO service_role;
GRANT EXECUTE ON FUNCTION public.prepare_product_row() TO service_role;

-- Verificación 1: rls_enabled y rls_forced deben ser true.
SELECT
  namespace.nspname AS schema_name,
  relation.relname AS table_name,
  relation.relrowsecurity AS rls_enabled,
  relation.relforcerowsecurity AS rls_forced
FROM pg_catalog.pg_class AS relation
JOIN pg_catalog.pg_namespace AS namespace
  ON namespace.oid = relation.relnamespace
WHERE namespace.nspname = 'public'
  AND relation.relname = 'products'
  AND relation.relkind = 'r';

-- Verificación 2: todas las columnas deben ser false para anon y authenticated.
SELECT
  pg_catalog.has_table_privilege('anon', 'public.products', 'SELECT') AS anon_can_select,
  pg_catalog.has_table_privilege('anon', 'public.products', 'INSERT') AS anon_can_insert,
  pg_catalog.has_table_privilege('anon', 'public.products', 'UPDATE') AS anon_can_update,
  pg_catalog.has_table_privilege('anon', 'public.products', 'DELETE') AS anon_can_delete,
  pg_catalog.has_table_privilege('authenticated', 'public.products', 'SELECT') AS authenticated_can_select,
  pg_catalog.has_table_privilege('authenticated', 'public.products', 'INSERT') AS authenticated_can_insert,
  pg_catalog.has_table_privilege('authenticated', 'public.products', 'UPDATE') AS authenticated_can_update,
  pg_catalog.has_table_privilege('authenticated', 'public.products', 'DELETE') AS authenticated_can_delete;

-- Verificación 3: anon y authenticated deben tener false en los tres permisos.
SELECT
  pg_catalog.has_sequence_privilege('anon', 'public.product_internal_code_seq', 'USAGE') AS anon_can_use_sequence,
  pg_catalog.has_sequence_privilege('anon', 'public.product_internal_code_seq', 'SELECT') AS anon_can_read_sequence,
  pg_catalog.has_sequence_privilege('anon', 'public.product_internal_code_seq', 'UPDATE') AS anon_can_update_sequence,
  pg_catalog.has_sequence_privilege('authenticated', 'public.product_internal_code_seq', 'USAGE') AS authenticated_can_use_sequence,
  pg_catalog.has_sequence_privilege('authenticated', 'public.product_internal_code_seq', 'SELECT') AS authenticated_can_read_sequence,
  pg_catalog.has_sequence_privilege('authenticated', 'public.product_internal_code_seq', 'UPDATE') AS authenticated_can_update_sequence;

-- Verificación 4a: debe aparecer una fila con cycle = false.
SELECT
  sequencename,
  start_value,
  increment_by,
  cycle
FROM pg_catalog.pg_sequences
WHERE schemaname = 'public'
  AND sequencename = 'product_internal_code_seq';

-- Verificación 4b: antes del primer producto debe devolver last_value = 1 e
-- is_called = false. Consultar el estado no consume ni avanza la secuencia.
SELECT last_value, is_called
FROM public.product_internal_code_seq;

-- Verificación 5: debe devolver cero políticas para products.
SELECT pg_catalog.count(*) AS products_policy_count
FROM pg_catalog.pg_policies
WHERE schemaname = 'public'
  AND tablename = 'products';
