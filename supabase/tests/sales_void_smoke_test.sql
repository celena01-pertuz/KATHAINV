-- Prueba manual para el SQL Editor de Supabase.
-- Ejecutar el bloque completo: BEGIN y ROLLBACK dejan sin filas de prueba.
BEGIN;
SET LOCAL ROLE service_role;

DO $test$
DECLARE
  v_customer_id text := pg_catalog.gen_random_uuid()::text;
  v_product_id text := pg_catalog.gen_random_uuid()::text;
  v_inactive_product_id text := pg_catalog.gen_random_uuid()::text;
  v_credit_product_id text := pg_catalog.gen_random_uuid()::text;
  v_sale record;
  v_inactive_sale record;
  v_credit_sale record;
  v_void_result record;
  v_receipt jsonb;
  v_stock integer;
  v_is_active boolean;
  v_sale_status text;
  v_voided_at timestamptz;
  v_void_reason text;
  v_payment_status text;
  v_token_hash text :=
    pg_catalog.replace(pg_catalog.gen_random_uuid()::text || pg_catalog.gen_random_uuid()::text, '-', '');
  v_credit_payment record;
  v_phone text;
BEGIN
  v_phone := '573' || pg_catalog.lpad(
    (pg_catalog.floor(pg_catalog.random() * 1000000000))::bigint::text,
    9,
    '0'
  );

  INSERT INTO public.customers (
    id, name, phone, data_treatment_authorized_at,
    data_treatment_notice_version, data_treatment_authorization_source
  )
  VALUES (
    v_customer_id, 'Cliente temporal de anulación', v_phone,
    pg_catalog.now(), 'smoke-test', 'prueba SQL temporal'
  );

  INSERT INTO public.products (
    id, code, variant_group_id, name, category, size, color,
    cost_price, sale_price, stock, min_stock, active
  )
  VALUES
    (
      v_product_id, 'VOID-' || pg_catalog.replace(v_product_id, '-', ''),
      'void-test-' || v_product_id, 'Producto temporal para anulación',
      'ropa', 'M', 'Negro', 5000, 12500, 3, 0, true
    ),
    (
      v_inactive_product_id, 'VOID-' || pg_catalog.replace(v_inactive_product_id, '-', ''),
      'void-test-' || v_inactive_product_id, 'Producto desactivado temporal',
      'ropa', 'M', 'Azul', 5000, 12500, 1, 0, true
    ),
    (
      v_credit_product_id, 'VOID-' || pg_catalog.replace(v_credit_product_id, '-', ''),
      'void-test-' || v_credit_product_id, 'Producto con abono temporal',
      'ropa', 'M', 'Verde', 5000, 12500, 1, 0, true
    );

  SELECT *
  INTO v_sale
  FROM public.create_sale(
    NULL,
    pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('product_id', v_product_id, 'quantity', 2)
    ),
    'cash',
    NULL,
    'efectivo',
    'void-smoke-sale-' || v_product_id,
    'smoke-test@example.invalid'
  );

  PERFORM public.create_receipt_link(
    v_sale.sale_id, v_token_hash, 'smoke-test@example.invalid'
  );

  SELECT *
  INTO v_void_result
  FROM public.void_sale(
    v_sale.sale_id, 'Devolución de prueba', 'smoke-test@example.invalid'
  );

  SELECT product.stock
  INTO v_stock
  FROM public.products AS product
  WHERE product.id = v_product_id;

  SELECT sale.status, sale.voided_at, sale.void_reason
  INTO v_sale_status, v_voided_at, v_void_reason
  FROM public.sales AS sale
  WHERE sale.id = v_sale.sale_id;

  IF v_stock <> 3 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'La anulación no devolvió el stock de la venta.';
  END IF;

  IF v_sale_status <> 'voided'
    OR v_voided_at IS NULL
    OR v_void_reason <> 'Devolución de prueba'
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'La venta no conservó el estado, fecha y motivo de anulación.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.sale_void_audits AS audit
    WHERE audit.sale_id = v_sale.sale_id
      AND audit.voided_by = 'smoke-test@example.invalid'
      AND audit.reason = 'Devolución de prueba'
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'No se conservó la identidad verificada que anuló la venta.';
  END IF;

  SELECT payment.status
  INTO v_payment_status
  FROM public.sale_payments AS payment
  WHERE payment.sale_id = v_sale.sale_id
    AND payment.kind = 'initial';

  IF v_payment_status <> 'voided' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'El pago inicial no se anuló junto con la venta.';
  END IF;

  v_receipt := public.get_public_receipt(v_token_hash);
  IF v_receipt ->> 'status' <> 'voided' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'El comprobante no conservó el estado de venta anulada.';
  END IF;

  -- Una segunda llamada falla y no devuelve el stock por segunda vez.
  BEGIN
    PERFORM *
    FROM public.void_sale(
      v_sale.sale_id, 'Segunda anulación', 'smoke-test@example.invalid'
    );
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'Se permitió anular dos veces la misma venta.';
  EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
      IF SQLERRM <> 'La venta ya fue anulada.' THEN
        RAISE;
      END IF;
  END;

  SELECT product.stock
  INTO v_stock
  FROM public.products AS product
  WHERE product.id = v_product_id;

  IF v_stock <> 3 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'La doble anulación devolvió stock por segunda vez.';
  END IF;

  -- La referencia puede quedar inactiva al agotarse; anularla la reactiva.
  SELECT *
  INTO v_inactive_sale
  FROM public.create_sale(
    NULL,
    pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('product_id', v_inactive_product_id, 'quantity', 1)
    ),
    'cash',
    NULL,
    'efectivo',
    'void-smoke-inactive-' || v_inactive_product_id,
    'smoke-test@example.invalid'
  );

  UPDATE public.products
  SET active = false
  WHERE id = v_inactive_product_id;

  SELECT *
  INTO v_void_result
  FROM public.void_sale(
    v_inactive_sale.sale_id, 'Reactivar producto de prueba', 'smoke-test@example.invalid'
  );

  SELECT product.stock, product.active
  INTO v_stock, v_is_active
  FROM public.products AS product
  WHERE product.id = v_inactive_product_id;

  IF v_stock <> 1 OR NOT v_is_active
    OR NOT (v_void_result.reactivated_products @> pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('id', v_inactive_product_id)
    ))
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'La anulación no reactivó ni informó el producto desactivado.';
  END IF;

  -- Un abono activo asignado impide anular la venta.
  SELECT *
  INTO v_credit_sale
  FROM public.create_sale(
    v_customer_id,
    pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('product_id', v_credit_product_id, 'quantity', 1)
    ),
    'credit',
    0,
    NULL,
    'void-smoke-credit-' || v_credit_product_id,
    'smoke-test@example.invalid'
  );

  SELECT *
  INTO v_credit_payment
  FROM public.record_customer_credit_payment(
    v_customer_id,
    5000,
    'efectivo',
    'Abono temporal activo',
    pg_catalog.gen_random_uuid(),
    'smoke-test@example.invalid'
  );

  BEGIN
    PERFORM *
    FROM public.void_sale(
      v_credit_sale.sale_id, 'Venta con abono', 'smoke-test@example.invalid'
    );
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'Se anuló una venta con un abono activo.';
  EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
      IF SQLERRM <>
        'Esta venta tiene abonos. Anula primero esos abonos y luego la venta.'
      THEN
        RAISE;
      END IF;
  END;

  IF NOT EXISTS (
    SELECT 1
    FROM public.sales AS sale
    JOIN public.customer_credit_allocations AS allocation
      ON allocation.sale_id = sale.id
    JOIN public.customer_credit_payments AS payment
      ON payment.id = allocation.payment_id
    WHERE sale.id = v_credit_sale.sale_id
      AND sale.status = 'active'
      AND payment.id = v_credit_payment.payment_id
      AND payment.status = 'active'
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'El rechazo no conservó activa la venta y su abono.';
  END IF;

  RAISE NOTICE 'OK: stock, idempotencia, abonos, reactivación, pago inicial y comprobante.';
END;
$test$;

ROLLBACK;
