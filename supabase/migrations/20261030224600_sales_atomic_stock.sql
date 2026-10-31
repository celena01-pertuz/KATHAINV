-- Tarea 3.3B: ventas atómicas con descuento seguro de existencias.
-- Revisar y ejecutar manualmente en el proyecto Supabase. Esta migración no se
-- ejecuta desde la aplicación ni modifica archivos JSON locales.

-- Consecutivo legible y no reutilizable, incluso si una operación se revierte.
CREATE SEQUENCE public.sales_number_seq
  AS bigint
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1
  NO CYCLE;

CREATE TABLE public.sales (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sale_number text NOT NULL UNIQUE
    CHECK (sale_number ~ '^V-[0-9]{6,}$'),
  request_key text NOT NULL UNIQUE
    CHECK (pg_catalog.btrim(request_key) <> ''),
  created_by text NOT NULL
    CHECK (pg_catalog.btrim(created_by) <> ''),
  customer_id text REFERENCES public.customers(id) ON DELETE RESTRICT,
  sold_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  payment_type text NOT NULL
    CHECK (payment_type IN ('cash', 'credit', 'partial')),
  total integer NOT NULL CHECK (total > 0),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'voided')),
  voided_at timestamptz,
  void_reason text,
  CONSTRAINT sales_void_fields_match_status CHECK (
    (status = 'active' AND voided_at IS NULL AND void_reason IS NULL)
    OR
    (status = 'voided' AND voided_at IS NOT NULL AND
      void_reason IS NOT NULL AND pg_catalog.btrim(void_reason) <> '')
  )
);

CREATE TABLE public.sale_items (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sale_id bigint NOT NULL REFERENCES public.sales(id) ON DELETE RESTRICT,
  product_id text NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_code text NOT NULL,
  product_name text NOT NULL,
  size text NOT NULL,
  color text NOT NULL,
  unit_price integer NOT NULL CHECK (unit_price > 0),
  unit_cost integer NOT NULL CHECK (unit_cost >= 0),
  quantity integer NOT NULL CHECK (quantity > 0),
  CONSTRAINT sale_items_one_product_per_sale UNIQUE (sale_id, product_id)
);

CREATE TABLE public.sale_payments (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sale_id bigint NOT NULL REFERENCES public.sales(id) ON DELETE RESTRICT,
  kind text NOT NULL CHECK (kind IN ('initial', 'installment')),
  amount integer NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL
    CHECK (payment_method IN ('efectivo', 'transferencia', 'nequi', 'tarjeta')),
  paid_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  note text,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'voided')),
  voided_at timestamptz,
  void_reason text,
  CONSTRAINT sale_payments_void_fields_match_status CHECK (
    (status = 'active' AND voided_at IS NULL AND void_reason IS NULL)
    OR
    (status = 'voided' AND voided_at IS NOT NULL AND
      void_reason IS NOT NULL AND pg_catalog.btrim(void_reason) <> '')
  )
);

COMMENT ON TABLE public.sales IS
  'Ventas con total en pesos enteros y datos de anulación para conservar el historial.';
COMMENT ON COLUMN public.sales.sale_number IS
  'Número visible V-000001; proviene de una secuencia que no reutiliza valores.';
COMMENT ON COLUMN public.sales.request_key IS
  'Clave única de idempotencia enviada por el servidor para evitar ventas duplicadas.';
COMMENT ON COLUMN public.sales.created_by IS
  'Correo de la persona que registra la venta.';
COMMENT ON COLUMN public.sales.total IS
  'Total de la venta en pesos colombianos enteros, sin centavos.';
COMMENT ON TABLE public.sale_items IS
  'Detalle de venta con copia de los datos y precios del producto al vender.';
COMMENT ON COLUMN public.sale_items.unit_price IS
  'Precio de venta por unidad copiado al momento de vender.';
COMMENT ON COLUMN public.sale_items.unit_cost IS
  'Costo por unidad copiado al momento de vender.';
COMMENT ON TABLE public.sale_payments IS
  'Pagos iniciales y abonos con su método, estado y datos de anulación.';

CREATE INDEX sale_items_product_id_idx ON public.sale_items (product_id);
CREATE INDEX sale_payments_sale_id_idx ON public.sale_payments (sale_id);
CREATE INDEX sales_customer_sold_at_idx
  ON public.sales (customer_id, sold_at)
  WHERE customer_id IS NOT NULL;

-- Impide el borrado aun si otra función autorizada llegara a intentarlo.
CREATE FUNCTION public.prevent_sales_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '55000',
    MESSAGE = 'Los registros de venta se anulan; no se eliminan.';
END;
$function$;

CREATE TRIGGER sales_prevent_delete
BEFORE DELETE ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public.prevent_sales_delete();

CREATE TRIGGER sale_items_prevent_delete
BEFORE DELETE ON public.sale_items
FOR EACH ROW
EXECUTE FUNCTION public.prevent_sales_delete();

CREATE TRIGGER sale_payments_prevent_delete
BEFORE DELETE ON public.sale_payments
FOR EACH ROW
EXECUTE FUNCTION public.prevent_sales_delete();

-- Toda la escritura se concentra aquí: primero bloquea productos en orden
-- estable, valida cantidades y precios de la base, y luego escribe y descuenta.
CREATE FUNCTION public.create_sale(
  p_customer_id text,
  p_items jsonb,
  p_payment_type text,
  p_initial_payment integer,
  p_payment_method text,
  p_request_key text,
  p_created_by text
)
RETURNS TABLE (sale_id bigint, sale_number text, total integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_item record;
  v_product public.products%ROWTYPE;
  v_sale_id bigint;
  v_sale_number text;
  v_total bigint := 0;
  v_line_total bigint;
  v_payment_amount integer;
  v_existing_sale public.sales%ROWTYPE;
BEGIN
  IF p_request_key IS NULL OR pg_catalog.btrim(p_request_key) = '' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'La clave de solicitud es obligatoria.';
  END IF;

  IF p_created_by IS NULL OR pg_catalog.btrim(p_created_by) = '' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'El correo de quien registra la venta es obligatorio.';
  END IF;

  -- Serializa claves repetidas: una segunda llamada espera y luego devuelve
  -- la venta confirmada por la primera, sin volver a revisar ni descontar stock.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_request_key, 0)
  );

  SELECT existing_sale.*
  INTO v_existing_sale
  FROM public.sales AS existing_sale
  WHERE existing_sale.request_key = p_request_key;

  IF FOUND THEN
    RETURN QUERY
    SELECT v_existing_sale.id, v_existing_sale.sale_number, v_existing_sale.total;
    RETURN;
  END IF;

  IF p_payment_type IS NULL
    OR p_payment_type NOT IN ('cash', 'credit', 'partial')
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'El tipo de pago no es válido.';
  END IF;

  IF p_payment_type <> 'cash'
    AND (p_initial_payment IS NULL OR p_initial_payment < 0)
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'El pago inicial no es válido.';
  END IF;

  IF p_payment_type IN ('credit', 'partial') AND p_customer_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Se necesita un cliente registrado para fiar o pagar parcialmente.';
  END IF;

  IF p_customer_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.customers AS customer
      WHERE customer.id = p_customer_id
        AND customer.active
    )
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'El cliente no está disponible.';
  END IF;

  IF p_items IS NULL
    OR pg_catalog.jsonb_typeof(p_items) IS DISTINCT FROM 'array'
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'La venta debe incluir al menos un producto.';
  END IF;

  IF pg_catalog.jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'La venta debe incluir al menos un producto.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.jsonb_array_elements(p_items) AS item(value)
    WHERE pg_catalog.jsonb_typeof(item.value) IS DISTINCT FROM 'object'
      OR pg_catalog.jsonb_typeof(item.value -> 'product_id') IS DISTINCT FROM 'string'
      OR pg_catalog.btrim(item.value ->> 'product_id') = ''
      OR pg_catalog.jsonb_typeof(item.value -> 'quantity') IS DISTINCT FROM 'number'
      OR (item.value ->> 'quantity') !~ '^[0-9]+$'
      OR pg_catalog.length(item.value ->> 'quantity') > 10
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Los productos o sus cantidades no son válidos.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.jsonb_array_elements(p_items) AS item(value)
    WHERE (item.value ->> 'quantity')::numeric <= 0
      OR (item.value ->> 'quantity')::numeric > 2147483647
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Una cantidad supera el límite permitido.';
  END IF;

  IF EXISTS (
    SELECT item.value ->> 'product_id'
    FROM pg_catalog.jsonb_array_elements(p_items) AS item(value)
    GROUP BY item.value ->> 'product_id'
    HAVING pg_catalog.count(*) > 1
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Cada producto debe aparecer una sola vez en la venta.';
  END IF;

  -- El orden estable evita que dos ventas simultáneas bloqueen en orden opuesto.
  FOR v_item IN
    SELECT
      item.value ->> 'product_id' AS product_id,
      (item.value ->> 'quantity')::integer AS quantity
    FROM pg_catalog.jsonb_array_elements(p_items) AS item(value)
    ORDER BY item.value ->> 'product_id'
  LOOP
    SELECT product.*
    INTO v_product
    FROM public.products AS product
    WHERE product.id = v_item.product_id
    FOR UPDATE;

    IF NOT FOUND OR NOT v_product.active THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'Uno o más productos no están disponibles.';
    END IF;

    IF v_product.stock < v_item.quantity THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'Stock insuficiente para uno o más productos.';
    END IF;

    v_line_total := v_product.sale_price::bigint * v_item.quantity::bigint;
    IF v_line_total > 2147483647
      OR v_total > 2147483647 - v_line_total
    THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'El total de la venta supera el límite permitido.';
    END IF;
    v_total := v_total + v_line_total;
  END LOOP;

  IF p_payment_type = 'cash' THEN
    v_payment_amount := v_total::integer;
  ELSE
    v_payment_amount := p_initial_payment;
  END IF;

  IF p_payment_type = 'credit' AND p_initial_payment <> 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Una venta fiada no puede incluir un pago inicial.';
  END IF;

  IF p_payment_type = 'partial'
    AND (p_initial_payment = 0 OR p_initial_payment >= v_total)
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'El pago parcial debe ser mayor que cero y menor que el total.';
  END IF;

  IF p_payment_type = 'cash' OR p_payment_type = 'partial' THEN
    IF p_payment_method IS NULL
      OR p_payment_method NOT IN ('efectivo', 'transferencia', 'nequi', 'tarjeta')
    THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'El método de pago no es válido.';
    END IF;
  END IF;

  INSERT INTO public.sales AS new_sale (
    sale_number,
    request_key,
    created_by,
    customer_id,
    payment_type,
    total
  )
  VALUES (
    'V-' || pg_catalog.lpad(
      pg_catalog.nextval('public.sales_number_seq'::pg_catalog.regclass)::text,
      6,
      '0'
    ),
    p_request_key,
    p_created_by,
    p_customer_id,
    p_payment_type,
    v_total::integer
  )
  RETURNING new_sale.id, new_sale.sale_number
  INTO v_sale_id, v_sale_number;

  FOR v_item IN
    SELECT
      item.value ->> 'product_id' AS product_id,
      (item.value ->> 'quantity')::integer AS quantity
    FROM pg_catalog.jsonb_array_elements(p_items) AS item(value)
    ORDER BY item.value ->> 'product_id'
  LOOP
    SELECT product.*
    INTO v_product
    FROM public.products AS product
    WHERE product.id = v_item.product_id;

    INSERT INTO public.sale_items (
      sale_id,
      product_id,
      product_code,
      product_name,
      size,
      color,
      unit_price,
      unit_cost,
      quantity
    )
    VALUES (
      v_sale_id,
      v_product.id,
      v_product.code,
      v_product.name,
      v_product.size,
      v_product.color,
      v_product.sale_price,
      v_product.cost_price,
      v_item.quantity
    );

    UPDATE public.products AS product
    SET stock = product.stock - v_item.quantity
    WHERE product.id = v_product.id;
  END LOOP;

  IF v_payment_amount > 0 THEN
    INSERT INTO public.sale_payments (
      sale_id,
      kind,
      amount,
      payment_method
    )
    VALUES (
      v_sale_id,
      'initial',
      v_payment_amount,
      p_payment_method
    );
  END IF;

  RETURN QUERY
  SELECT v_sale_id, v_sale_number, v_total::integer;
END;
$function$;

-- RLS sin políticas: los roles de cliente no acceden directamente. service_role
-- solo consulta; las escrituras las realiza create_sale como SECURITY DEFINER.
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales FORCE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items FORCE ROW LEVEL SECURITY;
ALTER TABLE public.sale_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_payments FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.sales, public.sale_items, public.sale_payments
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON SEQUENCE public.sales_number_seq
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.prevent_sales_delete()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.create_sale(text, jsonb, text, integer, text, text, text)
  FROM PUBLIC, anon, authenticated, service_role;

GRANT SELECT ON TABLE public.sales, public.sale_items, public.sale_payments
  TO service_role;
GRANT EXECUTE ON FUNCTION public.create_sale(text, jsonb, text, integer, text, text, text)
  TO service_role;

-- Todas las filas deben mostrar resultado = 'OK'.
-- La consulta devuelve exclusivamente revisión, resultado y lo esperado.
WITH target_tables AS (
  SELECT relation.oid, relation.relname, relation.relrowsecurity, relation.relforcerowsecurity, relation.relowner, relation.relacl
  FROM pg_catalog.pg_class AS relation
  JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname IN ('sales', 'sale_items', 'sale_payments')
    AND relation.relkind = 'r'
),
checks AS (
  SELECT
    '1. RLS habilitado y forzado en las tres tablas'::text AS revision,
    CASE
      WHEN (SELECT pg_catalog.count(*) FROM target_tables) = 3
        AND NOT EXISTS (
          SELECT 1
          FROM target_tables
          WHERE NOT relrowsecurity OR NOT relforcerowsecurity
        )
        THEN 'OK'
      ELSE 'FALLO'
    END AS resultado,
    'RLS habilitado y forzado para sales, sale_items y sale_payments'::text AS esperado

  UNION ALL

  SELECT
    '2. Sin políticas RLS',
    CASE
      WHEN (
        SELECT pg_catalog.count(*)
        FROM pg_catalog.pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('sales', 'sale_items', 'sale_payments')
      ) = 0 THEN 'OK'
      ELSE 'FALLO'
    END,
    'cero políticas para las tres tablas'

  UNION ALL

  SELECT
    '3. Sin permisos para PUBLIC',
    CASE
      WHEN NOT EXISTS (
        SELECT 1
        FROM target_tables AS target
        CROSS JOIN LATERAL pg_catalog.aclexplode(
          COALESCE(target.relacl, pg_catalog.acldefault('r', target.relowner))
        ) AS privilege
        WHERE privilege.grantee = 0
      ) THEN 'OK'
      ELSE 'FALLO'
    END,
    'PUBLIC no tiene permisos en ninguna de las tres tablas'

  UNION ALL

  SELECT
    '4. anon y authenticated sin permisos',
    CASE
      WHEN NOT EXISTS (
        SELECT 1
        FROM pg_catalog.unnest(ARRAY['sales', 'sale_items', 'sale_payments']) AS table_name(name)
        WHERE pg_catalog.has_table_privilege('anon', 'public.' || table_name.name, 'SELECT')
          OR pg_catalog.has_table_privilege('anon', 'public.' || table_name.name, 'INSERT')
          OR pg_catalog.has_table_privilege('anon', 'public.' || table_name.name, 'UPDATE')
          OR pg_catalog.has_table_privilege('anon', 'public.' || table_name.name, 'DELETE')
          OR pg_catalog.has_table_privilege('anon', 'public.' || table_name.name, 'TRUNCATE')
          OR pg_catalog.has_table_privilege('anon', 'public.' || table_name.name, 'REFERENCES')
          OR pg_catalog.has_table_privilege('anon', 'public.' || table_name.name, 'TRIGGER')
          OR pg_catalog.has_table_privilege('authenticated', 'public.' || table_name.name, 'SELECT')
          OR pg_catalog.has_table_privilege('authenticated', 'public.' || table_name.name, 'INSERT')
          OR pg_catalog.has_table_privilege('authenticated', 'public.' || table_name.name, 'UPDATE')
          OR pg_catalog.has_table_privilege('authenticated', 'public.' || table_name.name, 'DELETE')
          OR pg_catalog.has_table_privilege('authenticated', 'public.' || table_name.name, 'TRUNCATE')
          OR pg_catalog.has_table_privilege('authenticated', 'public.' || table_name.name, 'REFERENCES')
          OR pg_catalog.has_table_privilege('authenticated', 'public.' || table_name.name, 'TRIGGER')
      ) THEN 'OK'
      ELSE 'FALLO'
    END,
    'anon y authenticated no pueden leer, escribir ni truncar las tablas'

  UNION ALL

  SELECT
    '5. service_role solo puede leer',
    CASE
      WHEN NOT EXISTS (
        SELECT 1
        FROM pg_catalog.unnest(ARRAY['sales', 'sale_items', 'sale_payments']) AS table_name(name)
        WHERE NOT pg_catalog.has_table_privilege('service_role', 'public.' || table_name.name, 'SELECT')
          OR pg_catalog.has_table_privilege('service_role', 'public.' || table_name.name, 'INSERT')
          OR pg_catalog.has_table_privilege('service_role', 'public.' || table_name.name, 'UPDATE')
          OR pg_catalog.has_table_privilege('service_role', 'public.' || table_name.name, 'DELETE')
          OR pg_catalog.has_table_privilege('service_role', 'public.' || table_name.name, 'TRUNCATE')
          OR pg_catalog.has_table_privilege('service_role', 'public.' || table_name.name, 'REFERENCES')
          OR pg_catalog.has_table_privilege('service_role', 'public.' || table_name.name, 'TRIGGER')
      ) THEN 'OK'
      ELSE 'FALLO'
    END,
    'service_role puede hacer SELECT, pero no INSERT, UPDATE, DELETE ni TRUNCATE'

  UNION ALL

  SELECT
    '6. Solo service_role ejecuta create_sale',
    CASE
      WHEN pg_catalog.has_function_privilege(
        'service_role',
        'public.create_sale(text,jsonb,text,integer,text,text,text)',
        'EXECUTE'
      )
        AND NOT pg_catalog.has_function_privilege(
          'anon',
          'public.create_sale(text,jsonb,text,integer,text,text,text)',
          'EXECUTE'
        )
        AND NOT pg_catalog.has_function_privilege(
          'authenticated',
          'public.create_sale(text,jsonb,text,integer,text,text,text)',
          'EXECUTE'
        )
        AND NOT EXISTS (
          SELECT 1
          FROM pg_catalog.pg_proc AS routine
          JOIN pg_catalog.pg_namespace AS namespace
            ON namespace.oid = routine.pronamespace
          CROSS JOIN LATERAL pg_catalog.aclexplode(
            COALESCE(routine.proacl, pg_catalog.acldefault('f', routine.proowner))
          ) AS privilege
          WHERE namespace.nspname = 'public'
            AND routine.oid =
              'public.create_sale(text,jsonb,text,integer,text,text,text)'::pg_catalog.regprocedure
            AND privilege.grantee NOT IN (
              routine.proowner,
              (SELECT role.oid FROM pg_catalog.pg_roles AS role WHERE role.rolname = 'service_role')
            )
            AND privilege.privilege_type = 'EXECUTE'
        )
        THEN 'OK'
      ELSE 'FALLO'
    END,
    'service_role tiene EXECUTE y PUBLIC, anon y authenticated no'

  UNION ALL

  SELECT
    '7. Función segura',
    CASE
      WHEN (
        SELECT routine.prosecdef
          AND routine.proconfig @> ARRAY['search_path=""']
        FROM pg_catalog.pg_proc AS routine
        WHERE routine.oid =
          'public.create_sale(text,jsonb,text,integer,text,text,text)'::pg_catalog.regprocedure
      ) THEN 'OK'
      ELSE 'FALLO'
    END,
    'create_sale usa SECURITY DEFINER y search_path vacío'

  UNION ALL

  SELECT
    '8. Consecutivo no reutilizable',
    CASE
      WHEN (
        SELECT seq.cycle
        FROM pg_catalog.pg_sequences AS seq
        WHERE seq.schemaname = 'public'
          AND seq.sequencename = 'sales_number_seq'
      ) IS FALSE THEN 'OK'
      ELSE 'FALLO'
    END,
    'sales_number_seq tiene cycle = false'

  UNION ALL

  SELECT
    '9. Dueño de create_sale puede omitir RLS',
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM pg_catalog.pg_proc AS routine
        JOIN pg_catalog.pg_roles AS owner_role
          ON owner_role.oid = routine.proowner
        WHERE routine.oid =
          'public.create_sale(text,jsonb,text,integer,text,text,text)'::pg_catalog.regprocedure
          AND (owner_role.rolbypassrls OR owner_role.rolsuper)
      ) THEN 'OK'
      ELSE 'FALLO'
    END,
    'el dueño tiene BYPASSRLS o es superusuario, necesario para operar con RLS forzado'
)
SELECT revision, resultado, esperado
FROM checks
ORDER BY revision;
