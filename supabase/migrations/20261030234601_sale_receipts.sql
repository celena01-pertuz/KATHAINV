-- Tarea 3.3C: enlaces seguros para consultar recibos de venta.
-- Revisar y ejecutar manualmente en el proyecto Supabase. Esta migración no se
-- ejecuta desde la aplicación ni modifica archivos JSON locales.

CREATE TABLE public.sale_receipt_tokens (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sale_id bigint NOT NULL REFERENCES public.sales(id) ON DELETE RESTRICT,
  token_hash text NOT NULL UNIQUE
    CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  created_by text NOT NULL CHECK (pg_catalog.btrim(created_by) <> ''),
  revoked_at timestamptz,
  revoked_by text,
  CONSTRAINT sale_receipt_tokens_revocation_fields_match CHECK (
    (revoked_at IS NULL AND revoked_by IS NULL)
    OR
    (revoked_at IS NOT NULL AND revoked_by IS NOT NULL
      AND pg_catalog.btrim(revoked_by) <> '')
  )
);

COMMENT ON TABLE public.sale_receipt_tokens IS
  'Hashes de enlaces de recibos; el token original nunca se almacena.';
COMMENT ON COLUMN public.sale_receipt_tokens.token_hash IS
  'Hash SHA-256 hexadecimal de 64 caracteres; no es el token original.';
COMMENT ON COLUMN public.sale_receipt_tokens.created_by IS
  'Correo de la persona autorizada que creó el enlace.';
COMMENT ON COLUMN public.sale_receipt_tokens.revoked_by IS
  'Correo de la persona autorizada que revocó el enlace, si aplica.';

-- El índice único parcial garantiza como máximo un enlace activo por venta.
CREATE UNIQUE INDEX sale_receipt_tokens_one_active_per_sale_idx
  ON public.sale_receipt_tokens (sale_id)
  WHERE revoked_at IS NULL;

-- Impide borrar los registros de auditoría de enlaces, incluso desde funciones.
CREATE FUNCTION public.prevent_sale_receipt_token_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '55000',
    MESSAGE = 'Los enlaces de recibo se revocan; no se eliminan.';
END;
$function$;

CREATE TRIGGER sale_receipt_tokens_prevent_delete
BEFORE DELETE ON public.sale_receipt_tokens
FOR EACH ROW
EXECUTE FUNCTION public.prevent_sale_receipt_token_delete();

-- Bloquea la venta antes de reemplazar el enlace para serializar solicitudes
-- simultáneas y mantener un solo enlace activo por venta.
CREATE FUNCTION public.create_receipt_link(
  p_sale_id bigint,
  p_token_hash text,
  p_created_by text
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_token_id bigint;
BEGIN
  IF p_sale_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'La venta indicada no es válida.';
  END IF;

  IF p_token_hash IS NULL OR p_token_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'El hash del enlace no tiene un formato válido.';
  END IF;

  IF p_created_by IS NULL OR pg_catalog.btrim(p_created_by) = '' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'El correo de quien crea el enlace es obligatorio.';
  END IF;

  PERFORM 1
  FROM public.sales AS sale
  WHERE sale.id = p_sale_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'La venta indicada no existe.';
  END IF;

  UPDATE public.sale_receipt_tokens AS token
  SET revoked_at = pg_catalog.now(),
      revoked_by = p_created_by
  WHERE token.sale_id = p_sale_id
    AND token.revoked_at IS NULL;

  INSERT INTO public.sale_receipt_tokens (
    sale_id,
    token_hash,
    created_by
  )
  VALUES (
    p_sale_id,
    p_token_hash,
    p_created_by
  )
  RETURNING id INTO v_token_id;

  RETURN v_token_id;
END;
$function$;

-- Revoca todos los enlaces vigentes de la venta sin borrar su historial.
CREATE FUNCTION public.revoke_receipt_links(
  p_sale_id bigint,
  p_revoked_by text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_revoked_count integer;
BEGIN
  IF p_sale_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'La venta indicada no es válida.';
  END IF;

  IF p_revoked_by IS NULL OR pg_catalog.btrim(p_revoked_by) = '' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'El correo de quien revoca el enlace es obligatorio.';
  END IF;

  PERFORM 1
  FROM public.sales AS sale
  WHERE sale.id = p_sale_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'La venta indicada no existe.';
  END IF;

  UPDATE public.sale_receipt_tokens AS token
  SET revoked_at = pg_catalog.now(),
      revoked_by = p_revoked_by
  WHERE token.sale_id = p_sale_id
    AND token.revoked_at IS NULL;

  GET DIAGNOSTICS v_revoked_count = ROW_COUNT;
  RETURN v_revoked_count;
END;
$function$;

-- Devuelve solo la información necesaria para mostrar el recibo; no incluye
-- datos del cliente, costos, correos ni identificadores internos.
CREATE FUNCTION public.get_public_receipt(p_token_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_receipt jsonb;
BEGIN
  IF p_token_hash IS NULL OR p_token_hash !~ '^[0-9a-f]{64}$' THEN
    RETURN NULL;
  END IF;

  SELECT pg_catalog.jsonb_build_object(
    'sale_number', sale.sale_number,
    'sold_at', sale.sold_at,
    'status', sale.status,
    'payment_type', sale.payment_type,
    'items', COALESCE(
      (
        SELECT pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'name', item.product_name,
            'size', item.size,
            'color', item.color,
            'quantity', item.quantity,
            'unit_price', item.unit_price
          )
          ORDER BY item.id
        )
        FROM public.sale_items AS item
        WHERE item.sale_id = sale.id
      ),
      '[]'::jsonb
    ),
    'total', sale.total,
    'paid', COALESCE(
      (
        SELECT pg_catalog.sum(payment.amount)
        FROM public.sale_payments AS payment
        WHERE payment.sale_id = sale.id
          AND payment.status = 'active'
      ),
      0
    ),
    'balance', CASE
      WHEN sale.total::bigint - COALESCE(
        (
          SELECT pg_catalog.sum(payment.amount)
          FROM public.sale_payments AS payment
          WHERE payment.sale_id = sale.id
            AND payment.status = 'active'
        ),
        0
      ) < 0 THEN 0
      ELSE sale.total::bigint - COALESCE(
        (
          SELECT pg_catalog.sum(payment.amount)
          FROM public.sale_payments AS payment
          WHERE payment.sale_id = sale.id
            AND payment.status = 'active'
        ),
        0
      )
    END
  )
  INTO v_receipt
  FROM public.sale_receipt_tokens AS token
  JOIN public.sales AS sale
    ON sale.id = token.sale_id
  WHERE token.token_hash = p_token_hash
    AND token.revoked_at IS NULL;

  RETURN v_receipt;
END;
$function$;

-- Sin políticas RLS: service_role solo consulta la tabla. Las funciones
-- SECURITY DEFINER realizan las escrituras y solo service_role puede llamarlas.
ALTER TABLE public.sale_receipt_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_receipt_tokens FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.sale_receipt_tokens
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.prevent_sale_receipt_token_delete()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.create_receipt_link(bigint, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.revoke_receipt_links(bigint, text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_public_receipt(text)
  FROM PUBLIC, anon, authenticated, service_role;

GRANT SELECT ON TABLE public.sale_receipt_tokens TO service_role;
GRANT EXECUTE ON FUNCTION public.create_receipt_link(bigint, text, text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.revoke_receipt_links(bigint, text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.get_public_receipt(text)
  TO service_role;

-- Todas las filas deben mostrar resultado = 'OK'.
-- La consulta devuelve exclusivamente revisión, resultado y lo esperado.
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
            AND relation.relname = 'sale_receipt_tokens'
            AND relation.relkind = 'r'
        ),
        false
      ) THEN 'OK'
      ELSE 'FALLO'
    END AS resultado,
    'sale_receipt_tokens tiene RLS habilitado y forzado'::text AS esperado

  UNION ALL

  SELECT
    '2. Sin políticas RLS',
    CASE
      WHEN (
        SELECT pg_catalog.count(*)
        FROM pg_catalog.pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'sale_receipt_tokens'
      ) = 0 THEN 'OK'
      ELSE 'FALLO'
    END,
    'cero políticas para sale_receipt_tokens'

  UNION ALL

  SELECT
    '3. Sin permisos para PUBLIC, anon y authenticated',
    CASE
      WHEN NOT pg_catalog.has_table_privilege('anon', 'public.sale_receipt_tokens', 'SELECT')
        AND NOT pg_catalog.has_table_privilege('anon', 'public.sale_receipt_tokens', 'INSERT')
        AND NOT pg_catalog.has_table_privilege('anon', 'public.sale_receipt_tokens', 'UPDATE')
        AND NOT pg_catalog.has_table_privilege('anon', 'public.sale_receipt_tokens', 'DELETE')
        AND NOT pg_catalog.has_table_privilege('anon', 'public.sale_receipt_tokens', 'TRUNCATE')
        AND NOT pg_catalog.has_table_privilege('anon', 'public.sale_receipt_tokens', 'REFERENCES')
        AND NOT pg_catalog.has_table_privilege('anon', 'public.sale_receipt_tokens', 'TRIGGER')
        AND NOT pg_catalog.has_table_privilege('authenticated', 'public.sale_receipt_tokens', 'SELECT')
        AND NOT pg_catalog.has_table_privilege('authenticated', 'public.sale_receipt_tokens', 'INSERT')
        AND NOT pg_catalog.has_table_privilege('authenticated', 'public.sale_receipt_tokens', 'UPDATE')
        AND NOT pg_catalog.has_table_privilege('authenticated', 'public.sale_receipt_tokens', 'DELETE')
        AND NOT pg_catalog.has_table_privilege('authenticated', 'public.sale_receipt_tokens', 'TRUNCATE')
        AND NOT pg_catalog.has_table_privilege('authenticated', 'public.sale_receipt_tokens', 'REFERENCES')
        AND NOT pg_catalog.has_table_privilege('authenticated', 'public.sale_receipt_tokens', 'TRIGGER')
        AND NOT EXISTS (
          SELECT 1
          FROM pg_catalog.pg_class AS relation
          JOIN pg_catalog.pg_namespace AS namespace
            ON namespace.oid = relation.relnamespace
          CROSS JOIN LATERAL pg_catalog.aclexplode(
            COALESCE(
              relation.relacl,
              pg_catalog.acldefault('r', relation.relowner)
            )
          ) AS privilege
          WHERE namespace.nspname = 'public'
            AND relation.relname = 'sale_receipt_tokens'
            AND privilege.grantee = 0
        )
        THEN 'OK'
      ELSE 'FALLO'
    END,
    'PUBLIC, anon y authenticated no tienen permisos sobre la tabla'

  UNION ALL

  SELECT
    '4. service_role solo puede leer',
    CASE
      WHEN pg_catalog.has_table_privilege(
        'service_role',
        'public.sale_receipt_tokens',
        'SELECT'
      )
        AND NOT pg_catalog.has_table_privilege('service_role', 'public.sale_receipt_tokens', 'INSERT')
        AND NOT pg_catalog.has_table_privilege('service_role', 'public.sale_receipt_tokens', 'UPDATE')
        AND NOT pg_catalog.has_table_privilege('service_role', 'public.sale_receipt_tokens', 'DELETE')
        AND NOT pg_catalog.has_table_privilege('service_role', 'public.sale_receipt_tokens', 'TRUNCATE')
        AND NOT pg_catalog.has_table_privilege('service_role', 'public.sale_receipt_tokens', 'REFERENCES')
        AND NOT pg_catalog.has_table_privilege('service_role', 'public.sale_receipt_tokens', 'TRIGGER')
        THEN 'OK'
      ELSE 'FALLO'
    END,
    'service_role tiene SELECT y no puede insertar, actualizar, borrar ni truncar'

  UNION ALL

  SELECT
    '5. Solo service_role ejecuta las funciones',
    CASE
      WHEN pg_catalog.has_function_privilege(
        'service_role',
        'public.create_receipt_link(bigint,text,text)',
        'EXECUTE'
      )
        AND pg_catalog.has_function_privilege(
          'service_role',
          'public.revoke_receipt_links(bigint,text)',
          'EXECUTE'
        )
        AND pg_catalog.has_function_privilege(
          'service_role',
          'public.get_public_receipt(text)',
          'EXECUTE'
        )
        AND NOT pg_catalog.has_function_privilege(
          'anon',
          'public.create_receipt_link(bigint,text,text)',
          'EXECUTE'
        )
        AND NOT pg_catalog.has_function_privilege(
          'anon',
          'public.revoke_receipt_links(bigint,text)',
          'EXECUTE'
        )
        AND NOT pg_catalog.has_function_privilege(
          'anon',
          'public.get_public_receipt(text)',
          'EXECUTE'
        )
        AND NOT pg_catalog.has_function_privilege(
          'authenticated',
          'public.create_receipt_link(bigint,text,text)',
          'EXECUTE'
        )
        AND NOT pg_catalog.has_function_privilege(
          'authenticated',
          'public.revoke_receipt_links(bigint,text)',
          'EXECUTE'
        )
        AND NOT pg_catalog.has_function_privilege(
          'authenticated',
          'public.get_public_receipt(text)',
          'EXECUTE'
        )
        AND NOT EXISTS (
          SELECT 1
          FROM pg_catalog.pg_proc AS routine
          CROSS JOIN LATERAL pg_catalog.aclexplode(
            COALESCE(
              routine.proacl,
              pg_catalog.acldefault('f', routine.proowner)
            )
          ) AS privilege
          WHERE routine.oid IN (
            'public.create_receipt_link(bigint,text,text)'::pg_catalog.regprocedure,
            'public.revoke_receipt_links(bigint,text)'::pg_catalog.regprocedure,
            'public.get_public_receipt(text)'::pg_catalog.regprocedure
          )
            AND privilege.grantee = 0
            AND privilege.privilege_type = 'EXECUTE'
        )
        THEN 'OK'
      ELSE 'FALLO'
    END,
    'solo service_role puede ejecutar las tres funciones y PUBLIC no puede hacerlo'

  UNION ALL

  SELECT
    '6. Funciones SECURITY DEFINER con search_path vacío',
    CASE
      WHEN (
        SELECT pg_catalog.count(*)
        FROM pg_catalog.pg_proc AS routine
        WHERE routine.oid IN (
          'public.create_receipt_link(bigint,text,text)'::pg_catalog.regprocedure,
          'public.revoke_receipt_links(bigint,text)'::pg_catalog.regprocedure,
          'public.get_public_receipt(text)'::pg_catalog.regprocedure
        )
          AND routine.prosecdef
          AND routine.proconfig @> ARRAY['search_path=""']
      ) = 3 THEN 'OK'
      ELSE 'FALLO'
    END,
    'las tres funciones usan SECURITY DEFINER y search_path vacío'

  UNION ALL

  SELECT
    '7. Dueños de funciones pueden omitir RLS',
    CASE
      WHEN (
        SELECT pg_catalog.count(*)
        FROM pg_catalog.pg_proc AS routine
        JOIN pg_catalog.pg_roles AS owner_role
          ON owner_role.oid = routine.proowner
        WHERE routine.oid IN (
          'public.create_receipt_link(bigint,text,text)'::pg_catalog.regprocedure,
          'public.revoke_receipt_links(bigint,text)'::pg_catalog.regprocedure,
          'public.get_public_receipt(text)'::pg_catalog.regprocedure
        )
          AND (owner_role.rolbypassrls OR owner_role.rolsuper)
      ) = 3 THEN 'OK'
      ELSE 'FALLO'
    END,
    'el dueño de cada función tiene BYPASSRLS o es superusuario'

  UNION ALL

  SELECT
    '8. Índice garantiza un solo enlace activo',
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM pg_catalog.pg_indexes AS index_row
        WHERE index_row.schemaname = 'public'
          AND index_row.tablename = 'sale_receipt_tokens'
          AND index_row.indexname = 'sale_receipt_tokens_one_active_per_sale_idx'
          AND index_row.indexdef LIKE '%UNIQUE INDEX%'
          AND index_row.indexdef LIKE '%WHERE (revoked_at IS NULL)%'
      ) THEN 'OK'
      ELSE 'FALLO'
    END,
    'hay un índice único parcial para sale_id con enlaces no revocados'
)
SELECT revision, resultado, esperado
FROM checks
ORDER BY revision;
