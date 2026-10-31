-- Prueba manual para el SQL Editor de Supabase.
-- Ejecutar el bloque completo: BEGIN y ROLLBACK dejan sin filas de prueba.
-- Las secuencias de productos y ventas pueden avanzar tras el ROLLBACK.
BEGIN;
SET LOCAL ROLE service_role;

DO $test$
DECLARE
  v_product_id text := pg_catalog.gen_random_uuid()::text;
  v_customer_id text := pg_catalog.gen_random_uuid()::text;
  v_sale record;
  v_receipt jsonb;
  v_first_hash text;
  v_second_hash text;
  v_fake_hash text := pg_catalog.repeat('0', 64);
  v_phone text;
  v_token_id bigint;
  v_item jsonb;
  v_revoked_count integer;
BEGIN
  v_phone := '573' || pg_catalog.lpad(
    (pg_catalog.floor(pg_catalog.random() * 1000000000))::bigint::text,
    9,
    '0'
  );
  v_first_hash :=
    pg_catalog.md5(v_product_id || '-receipt-one')
    || pg_catalog.md5(v_customer_id || '-receipt-one');
  v_second_hash :=
    pg_catalog.md5(v_product_id || '-receipt-two')
    || pg_catalog.md5(v_customer_id || '-receipt-two');

  INSERT INTO public.customers (
    id,
    name,
    phone,
    data_treatment_authorized_at,
    data_treatment_notice_version,
    data_treatment_authorization_source
  )
  VALUES (
    v_customer_id,
    'Cliente temporal para recibo',
    v_phone,
    pg_catalog.now(),
    'smoke-test',
    'prueba SQL temporal'
  );

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
    'RECEIPT-' || pg_catalog.replace(v_product_id, '-', ''),
    'receipt-test-' || v_product_id,
    'Producto temporal para recibo',
    'ropa',
    'M',
    'Verde',
    6000,
    15000,
    2,
    0,
    true
  );

  SELECT *
  INTO v_sale
  FROM public.create_sale(
    v_customer_id,
    pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('product_id', v_product_id, 'quantity', 1)
    ),
    'cash',
    NULL,
    'efectivo',
    'receipt-smoke-' || v_product_id,
    'smoke-test@example.invalid'
  );

  IF v_sale.total <> 15000 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'La venta temporal no produjo el total esperado.';
  END IF;

  SELECT public.create_receipt_link(
    v_sale.sale_id,
    v_first_hash,
    'smoke-test@example.invalid'
  )
  INTO v_token_id;

  IF v_token_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'No se pudo crear el primer enlace temporal.';
  END IF;

  v_receipt := public.get_public_receipt(v_fake_hash);
  IF v_receipt IS NOT NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'Un hash inexistente devolvió un recibo.';
  END IF;

  v_receipt := public.get_public_receipt(v_first_hash);
  IF v_receipt IS NULL
    OR v_receipt ->> 'sale_number' <> v_sale.sale_number
    OR v_receipt ->> 'status' <> 'active'
    OR v_receipt ->> 'payment_type' <> 'cash'
    OR (v_receipt ->> 'total')::integer <> 15000
    OR (v_receipt ->> 'paid')::integer <> 15000
    OR (v_receipt ->> 'balance')::integer <> 0
    OR pg_catalog.jsonb_array_length(v_receipt -> 'items') <> 1
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'El recibo no devolvió los datos esperados.';
  END IF;

  IF v_receipt - ARRAY[
    'sale_number',
    'sold_at',
    'status',
    'payment_type',
    'items',
    'total',
    'paid',
    'balance'
  ]::text[] <> '{}'::jsonb
    OR v_receipt ?| ARRAY[
      'customer_name',
      'customer_phone',
      'customer_document',
      'name',
      'phone',
      'document',
      'cost',
      'unit_cost',
      'created_by',
      'email',
      'customer_id',
      'sale_id',
      'id'
    ]
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'El recibo incluye campos privados o internos.';
  END IF;

  v_item := v_receipt -> 'items' -> 0;
  IF v_item ->> 'name' <> 'Producto temporal para recibo'
    OR v_item ->> 'size' <> 'M'
    OR v_item ->> 'color' <> 'Verde'
    OR (v_item ->> 'quantity')::integer <> 1
    OR (v_item ->> 'unit_price')::integer <> 15000
    OR v_item - ARRAY['name', 'size', 'color', 'quantity', 'unit_price']::text[]
      <> '{}'::jsonb
    OR v_item ?| ARRAY[
      'id',
      'sale_id',
      'product_id',
      'cost',
      'unit_cost',
      'created_by',
      'email'
    ]
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'Los ítems del recibo no coinciden o exponen campos prohibidos.';
  END IF;

  SELECT public.create_receipt_link(
    v_sale.sale_id,
    v_second_hash,
    'smoke-test@example.invalid'
  )
  INTO v_token_id;

  IF public.get_public_receipt(v_first_hash) IS NOT NULL
    OR public.get_public_receipt(v_second_hash) IS NULL
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'El enlace anterior siguió activo al crear uno nuevo.';
  END IF;

  SELECT public.revoke_receipt_links(
    v_sale.sale_id,
    'smoke-test@example.invalid'
  )
  INTO v_revoked_count;

  IF v_revoked_count <> 1
    OR public.get_public_receipt(v_second_hash) IS NOT NULL
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'La revocación no desactivó el enlace actual.';
  END IF;

  -- service_role no puede insertar directamente en la tabla de hashes.
  BEGIN
    INSERT INTO public.sale_receipt_tokens (
      sale_id,
      token_hash,
      created_by
    )
    VALUES (
      v_sale.sale_id,
      pg_catalog.repeat('f', 64),
      'smoke-test@example.invalid'
    );

    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'service_role logró insertar directamente en la tabla.';
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL;
  END;

  RAISE NOTICE 'OK: recibo, campos públicos, enlaces reemplazados y revocación.';
END;
$test$;

ROLLBACK;
