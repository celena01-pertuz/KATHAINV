-- P09/F6: smoke test manual en SQL Editor. BEGIN y ROLLBACK no dejan datos.
BEGIN;

SET LOCAL ROLE postgres;

CREATE TEMP TABLE report_smoke_ids (
  sold_product_id text NOT NULL,
  zero_product_id text NOT NULL,
  void_only_product_id text NOT NULL
);
GRANT SELECT ON TABLE report_smoke_ids TO service_role;

DO $setup$
DECLARE
  v_group_id text := pg_catalog.gen_random_uuid()::text;
  v_sold_product_id text := pg_catalog.gen_random_uuid()::text;
  v_zero_product_id text := pg_catalog.gen_random_uuid()::text;
  v_void_only_product_id text := pg_catalog.gen_random_uuid()::text;
  v_voided_request_key text := pg_catalog.gen_random_uuid()::text;
  v_active_request_key text := pg_catalog.gen_random_uuid()::text;
  v_void_only_request_key text := pg_catalog.gen_random_uuid()::text;
  v_updated_sales integer;
BEGIN
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
  VALUES
    (
      v_sold_product_id,
      'RN-P09-SOLD-' || pg_catalog.replace(v_sold_product_id, '-', ''),
      v_group_id,
      'Reporte smoke vendido activo',
      'ropa',
      'M',
      'Azul',
      5000,
      14000,
      10,
      0,
      true
    ),
    (
      v_zero_product_id,
      'RN-P09-ZERO-' || pg_catalog.replace(v_zero_product_id, '-', ''),
      v_group_id,
      'Reporte smoke sin ventas',
      'ropa',
      'S',
      'Rojo',
      5000,
      12000,
      10,
      0,
      true
    ),
    (
      v_void_only_product_id,
      'RN-P09-VOID-' || pg_catalog.replace(v_void_only_product_id, '-', ''),
      v_group_id,
      'Reporte smoke solo venta anulada',
      'ropa',
      'L',
      'Negro',
      5000,
      14000,
      10,
      0,
      true
    );

  INSERT INTO pg_temp.report_smoke_ids (
    sold_product_id,
    zero_product_id,
    void_only_product_id
  )
  VALUES (
    v_sold_product_id,
    v_zero_product_id,
    v_void_only_product_id
  );

  PERFORM *
  FROM public.create_sale(
    NULL,
    pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('product_id', v_sold_product_id, 'quantity', 3)
    ),
    'cash',
    NULL,
    'efectivo',
    v_voided_request_key,
    'reports-smoke-test'
  );

  PERFORM *
  FROM public.create_sale(
    NULL,
    pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('product_id', v_sold_product_id, 'quantity', 2)
    ),
    'cash',
    NULL,
    'efectivo',
    v_active_request_key,
    'reports-smoke-test'
  );

  PERFORM *
  FROM public.create_sale(
    NULL,
    pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('product_id', v_void_only_product_id, 'quantity', 4)
    ),
    'cash',
    NULL,
    'efectivo',
    v_void_only_request_key,
    'reports-smoke-test'
  );

  UPDATE public.sales
  SET status = 'voided',
      voided_at = pg_catalog.now(),
      void_reason = 'Prueba de reportes: anulación'
  WHERE request_key IN (v_voided_request_key, v_void_only_request_key);
  GET DIAGNOSTICS v_updated_sales = ROW_COUNT;

  IF v_updated_sales <> 2 THEN
    RAISE EXCEPTION 'No se pudieron anular las dos ventas temporales esperadas.';
  END IF;

  UPDATE public.products
  SET stock = 0,
      active = false
  WHERE id = v_void_only_product_id;
END;
$setup$;

SET LOCAL ROLE service_role;

DO $test$
DECLARE
  v_report jsonb;
  v_zero_product_id text;
  v_sold_product_id text;
  v_void_only_product_id text;
  v_report_date date := (pg_catalog.now() AT TIME ZONE 'America/Bogota')::date;
  v_expected_sales_count bigint;
BEGIN
  SELECT
    product.sold_product_id,
    product.zero_product_id,
    product.void_only_product_id
  INTO
    v_sold_product_id,
    v_zero_product_id,
    v_void_only_product_id
  FROM pg_temp.report_smoke_ids AS product;

  SELECT pg_catalog.count(*)
  INTO v_expected_sales_count
  FROM public.sales AS sale
  WHERE sale.status = 'active'
    AND sale.sold_at >= (
      v_report_date::timestamp AT TIME ZONE 'America/Bogota'
    )
    AND sale.sold_at < (
      ((v_report_date + 1)::timestamp) AT TIME ZONE 'America/Bogota'
    );

  v_report := public.get_product_sales_report(v_report_date, v_report_date);

  IF (v_report #>> '{salesCount}')::bigint IS DISTINCT FROM v_expected_sales_count THEN
    RAISE EXCEPTION 'El número de ventas activas del reporte no coincide con la base.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.jsonb_array_elements(v_report -> 'products') AS product(value)
    WHERE product.value ->> 'id' = v_sold_product_id
      AND product.value ->> 'unitsSold' = '2'
      AND product.value ->> 'totalSold' = '28000'
  ) THEN
    RAISE EXCEPTION 'El reporte no sumó solo las dos unidades de la venta activa.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.jsonb_array_elements(v_report -> 'products') AS product(value)
    WHERE product.value ->> 'id' = v_zero_product_id
      AND product.value ->> 'unitsSold' = '0'
      AND product.value ->> 'totalSold' = '0'
  ) THEN
    RAISE EXCEPTION 'El reporte no incluyó el producto activo sin ventas.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.jsonb_array_elements(v_report -> 'products') AS product(value)
    WHERE product.value ->> 'id' = v_void_only_product_id
  ) THEN
    RAISE EXCEPTION 'El reporte incluyó un producto desactivado sin ventas activas.';
  END IF;
END;
$test$;

ROLLBACK;
