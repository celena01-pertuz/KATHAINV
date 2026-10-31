-- Prueba manual para el SQL Editor de Supabase.
-- Ejecutar el bloque completo: BEGIN y ROLLBACK dejan sin filas de prueba.
-- El consecutivo de ventas puede avanzar aunque la transacción se revierta.
BEGIN;
SET LOCAL ROLE service_role;

DO $test$
DECLARE
  v_product_id text := pg_catalog.gen_random_uuid()::text;
  v_inactive_product_id text := pg_catalog.gen_random_uuid()::text;
  v_customer_id text := pg_catalog.gen_random_uuid()::text;
  v_product_code text;
  v_sale record;
  v_repeat_sale record;
  v_stock integer;
  v_row_count integer;
  v_phone text;
BEGIN
  v_product_code := 'SMOKE-' || pg_catalog.replace(v_product_id, '-', '');
  v_phone := '573' || pg_catalog.lpad(
    (pg_catalog.floor(pg_catalog.random() * 1000000000))::bigint::text,
    9,
    '0'
  );

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
    'Cliente temporal de prueba',
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
  VALUES
    (
      v_product_id,
      v_product_code,
      'test-' || v_product_id,
      'Producto temporal de prueba',
      'ropa',
      'M',
      'Negro',
      5000,
      12500,
      3,
      0,
      true
    ),
    (
      v_inactive_product_id,
      'SMOKE-' || pg_catalog.replace(v_inactive_product_id, '-', ''),
      'test-' || v_inactive_product_id,
      'Producto inactivo temporal de prueba',
      'ropa',
      'M',
      'Azul',
      5000,
      12500,
      3,
      0,
      false
    );

  -- Contado: el pago inicial enviado se ignora y se registra el total real.
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
    'smoke-cash-' || v_product_id,
    'smoke-test@example.invalid'
  );

  IF v_sale.total <> 25000 OR v_sale.sale_number !~ '^V-[0-9]{6,}$' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'La venta de contado no produjo el total o número esperado.';
  END IF;

  SELECT product.stock
  INTO v_stock
  FROM public.products AS product
  WHERE product.id = v_product_id;

  IF v_stock <> 1 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'El stock no se descontó como se esperaba.';
  END IF;

  SELECT pg_catalog.count(*)::integer
  INTO v_row_count
  FROM public.sale_payments AS payment
  WHERE payment.sale_id = v_sale.sale_id
    AND payment.kind = 'initial'
    AND payment.amount = 25000
    AND payment.payment_method = 'efectivo'
    AND payment.status = 'active';

  IF v_row_count <> 1 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'El pago de contado no registró el total calculado.';
  END IF;

  -- Repetir la misma clave devuelve la venta original y no vuelve a descontar.
  SELECT *
  INTO v_repeat_sale
  FROM public.create_sale(
    NULL,
    pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('product_id', v_product_id, 'quantity', 2)
    ),
    'cash',
    NULL,
    'efectivo',
    'smoke-cash-' || v_product_id,
    'smoke-test@example.invalid'
  );

  SELECT product.stock
  INTO v_stock
  FROM public.products AS product
  WHERE product.id = v_product_id;

  SELECT pg_catalog.count(*)::integer
  INTO v_row_count
  FROM public.sales AS sale
  WHERE sale.request_key = 'smoke-cash-' || v_product_id;

  IF v_repeat_sale.sale_id <> v_sale.sale_id
    OR v_repeat_sale.sale_number <> v_sale.sale_number
    OR v_repeat_sale.total <> v_sale.total
    OR v_stock <> 1
    OR v_row_count <> 1
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'La clave repetida creó otra venta o descontó stock otra vez.';
  END IF;

  -- Fiado sin cliente: debe rechazarse sin crear venta.
  BEGIN
    PERFORM *
    FROM public.create_sale(
      NULL,
      pg_catalog.jsonb_build_array(
        pg_catalog.jsonb_build_object('product_id', v_product_id, 'quantity', 1)
      ),
      'credit',
      0,
      NULL,
      'smoke-credit-no-customer-' || v_product_id,
      'smoke-test@example.invalid'
    );

    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'La venta fiada sin cliente fue aceptada.';
  EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
      IF SQLERRM <> 'Se necesita un cliente registrado para fiar o pagar parcialmente.' THEN
        RAISE;
      END IF;
  END;

  -- Un pago parcial igual al total no es parcial y debe rechazarse.
  BEGIN
    PERFORM *
    FROM public.create_sale(
      v_customer_id,
      pg_catalog.jsonb_build_array(
        pg_catalog.jsonb_build_object('product_id', v_product_id, 'quantity', 1)
      ),
      'partial',
      12500,
      'efectivo',
      'smoke-partial-invalid-' || v_product_id,
      'smoke-test@example.invalid'
    );

    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'El pago parcial igual al total fue aceptado.';
  EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
      IF SQLERRM <> 'El pago parcial debe ser mayor que cero y menor que el total.' THEN
        RAISE;
      END IF;
  END;

  -- Después de la primera venta queda una unidad: solicitar dos debe fallar.
  BEGIN
    PERFORM *
    FROM public.create_sale(
      NULL,
      pg_catalog.jsonb_build_array(
        pg_catalog.jsonb_build_object('product_id', v_product_id, 'quantity', 2)
      ),
      'cash',
      NULL,
      'efectivo',
      'smoke-insufficient-stock-' || v_product_id,
      'smoke-test@example.invalid'
    );

    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'La venta con stock insuficiente fue aceptada.';
  EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
      IF SQLERRM <> 'Stock insuficiente para uno o más productos.' THEN
        RAISE;
      END IF;
  END;

  -- Un producto inactivo no se puede vender aunque tenga existencias.
  BEGIN
    PERFORM *
    FROM public.create_sale(
      NULL,
      pg_catalog.jsonb_build_array(
        pg_catalog.jsonb_build_object('product_id', v_inactive_product_id, 'quantity', 1)
      ),
      'cash',
      NULL,
      'efectivo',
      'smoke-inactive-product-' || v_product_id,
      'smoke-test@example.invalid'
    );

    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'La venta de un producto inactivo fue aceptada.';
  EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
      IF SQLERRM <> 'Uno o más productos no están disponibles.' THEN
        RAISE;
      END IF;
  END;

  -- service_role no tiene permiso para insertar directamente en sales.
  BEGIN
    INSERT INTO public.sales (
      sale_number,
      request_key,
      created_by,
      payment_type,
      total
    )
    VALUES (
      'V-999999999',
      'smoke-direct-insert-' || v_product_id,
      'smoke-test@example.invalid',
      'cash',
      1
    );

    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'service_role logró insertar directamente en sales.';
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL;
  END;

  RAISE NOTICE 'OK: contado, idempotencia, rechazos, producto inactivo y permisos directos.';
END;
$test$;

ROLLBACK;
