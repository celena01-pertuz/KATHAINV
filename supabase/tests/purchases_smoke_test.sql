-- Prueba manual para el SQL Editor de Supabase.
-- Ejecutar el bloque completo: BEGIN y ROLLBACK dejan sin filas de prueba.
-- La secuencia de purchases puede avanzar aunque la transacción se revierta.
BEGIN;
SET LOCAL ROLE service_role;

DO $test$
DECLARE
  v_product_id text := pg_catalog.gen_random_uuid()::text;
  v_supplier_id text := pg_catalog.gen_random_uuid()::text;
  v_product_code text;
  v_purchase record;
  v_stock integer;
  v_purchase_count integer;
  v_rls_enabled boolean;
  v_rls_forced boolean;
  v_product_id_type text;
  v_purchase_product_id_type text;
BEGIN
  v_product_code := 'PURCHASE-SMOKE-' || pg_catalog.replace(v_product_id, '-', '');

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'purchases'
      AND column_name = 'total'
      AND data_type = 'integer'
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'purchases.total no es integer.';
  END IF;

  IF pg_catalog.to_regprocedure(
    'public.create_purchase(text,text,integer,integer,date)'
  ) IS NULL
    OR pg_catalog.to_regprocedure(
      'public.create_purchase(text,text,integer,numeric,date)'
    ) IS NOT NULL
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'create_purchase no tiene una única firma con total integer.';
  END IF;

  IF (
    SELECT pg_catalog.count(*)
    FROM pg_catalog.pg_proc AS procedure
    JOIN pg_catalog.pg_namespace AS namespace
      ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND procedure.proname = 'create_purchase'
  ) <> 1
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'Hay más de una firma de create_purchase.';
  END IF;

  SELECT column_info.data_type
  INTO v_product_id_type
  FROM information_schema.columns AS column_info
  WHERE column_info.table_schema = 'public'
    AND column_info.table_name = 'products'
    AND column_info.column_name = 'id';

  SELECT column_info.data_type
  INTO v_purchase_product_id_type
  FROM information_schema.columns AS column_info
  WHERE column_info.table_schema = 'public'
    AND column_info.table_name = 'purchases'
    AND column_info.column_name = 'product_id';

  IF v_product_id_type IS NULL
    OR v_purchase_product_id_type IS NULL
    OR v_product_id_type <> v_purchase_product_id_type
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'products.id y purchases.product_id deben tener el mismo tipo.';
  END IF;

  IF NOT pg_catalog.has_function_privilege(
    'service_role',
    'public.create_purchase(text,text,integer,integer,date)',
    'EXECUTE'
  )
    OR pg_catalog.has_function_privilege(
      'anon',
      'public.create_purchase(text,text,integer,integer,date)',
      'EXECUTE'
    )
    OR pg_catalog.has_function_privilege(
      'authenticated',
      'public.create_purchase(text,text,integer,integer,date)',
      'EXECUTE'
    )
    OR pg_catalog.has_sequence_privilege(
      'service_role',
      'public.purchases_id_seq',
      'USAGE'
    )
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'Los permisos de create_purchase no son exclusivos de service_role.';
  END IF;

  SELECT relation.relrowsecurity, relation.relforcerowsecurity
  INTO v_rls_enabled, v_rls_forced
  FROM pg_catalog.pg_class AS relation
  JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname = 'purchases'
    AND relation.relkind = 'r';

  IF NOT COALESCE(v_rls_enabled, false) OR NOT COALESCE(v_rls_forced, false)
    OR EXISTS (
      SELECT 1
      FROM pg_catalog.pg_policies
      WHERE schemaname = 'public'
        AND tablename IN ('suppliers', 'purchases')
    )
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'RLS debe estar habilitado y forzado sin políticas.';
  END IF;

  INSERT INTO public.suppliers (id, name)
  VALUES (v_supplier_id, 'Proveedor temporal de compras');

  INSERT INTO public.products (
    id,
    code,
    variant_group_id,
    name,
    category,
    size,
    color,
    cost_price,
    sale_price,
    stock,
    min_stock,
    active
  )
  VALUES (
    v_product_id,
    v_product_code,
    'purchase-smoke-' || v_product_id,
    'Producto temporal de compras',
    'ropa',
    'M',
    'Negro',
    5000,
    10000,
    2,
    0,
    true
  );

  SELECT *
  INTO v_purchase
  FROM public.create_purchase(
    v_product_code,
    v_supplier_id,
    3,
    25000,
    CURRENT_DATE
  );

  IF v_purchase.total <> 25000 OR v_purchase.new_stock <> 5 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'La compra entera no registró el total o el stock esperado.';
  END IF;

  -- Cero es un total entero válido; la compra sigue sumando existencias.
  SELECT *
  INTO v_purchase
  FROM public.create_purchase(
    v_product_code,
    v_supplier_id,
    1,
    0,
    CURRENT_DATE
  );

  IF v_purchase.total <> 0 OR v_purchase.new_stock <> 6 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'No se aceptó correctamente una compra con total cero.';
  END IF;

  UPDATE public.products
  SET active = false
  WHERE id = v_product_id;

  BEGIN
    PERFORM *
    FROM public.create_purchase(
      v_product_code,
      v_supplier_id,
      1,
      5000,
      CURRENT_DATE
    );

    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'Se aceptó una compra para un producto desactivado.';
  EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
      IF SQLERRM <> 'El producto está desactivado. Actívalo para registrar compras.' THEN
        RAISE;
      END IF;
  END;

  -- Un total negativo se rechaza sin insertar la compra ni cambiar el stock.
  BEGIN
    PERFORM *
    FROM public.create_purchase(
      v_product_code,
      v_supplier_id,
      1,
      -1,
      CURRENT_DATE
    );

    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'Se aceptó una compra con total negativo.';
  EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
      IF SQLERRM <> 'El total debe ser un entero mayor o igual a cero.' THEN
        RAISE;
      END IF;
  END;

  SELECT product.stock
  INTO v_stock
  FROM public.products AS product
  WHERE product.id = v_product_id;

  SELECT pg_catalog.count(*)::integer
  INTO v_purchase_count
  FROM public.purchases AS purchase
  WHERE purchase.product_id = v_product_id;

  IF v_stock <> 6 OR v_purchase_count <> 2 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'La compra rechazada modificó el registro o el stock.';
  END IF;

  RAISE NOTICE 'OK: total integer no negativo, compra atómica, RLS y permisos RPC.';
END;
$test$;

ROLLBACK;
