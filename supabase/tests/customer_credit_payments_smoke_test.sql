BEGIN;
SET LOCAL ROLE service_role;

DO $test$
DECLARE
  v_customer_id text := pg_catalog.gen_random_uuid()::text;
  v_product_id text := pg_catalog.gen_random_uuid()::text;
  v_product_code text;
  v_first_sale record;
  v_second_sale record;
  v_payment record;
  v_repeated_payment record;
  v_receipt jsonb;
  v_balance bigint;
  v_first_allocation integer;
  v_second_allocation integer;
  v_count integer;
  v_request_key uuid := pg_catalog.gen_random_uuid();
  v_token_hash text :=
    pg_catalog.replace(pg_catalog.gen_random_uuid()::text || pg_catalog.gen_random_uuid()::text, '-', '');
BEGIN
  v_product_code := 'CREDIT-SMOKE-' || pg_catalog.replace(v_product_id, '-', '');

  INSERT INTO public.customers (
    id, name, phone, data_treatment_authorized_at,
    data_treatment_notice_version, data_treatment_authorization_source
  )
  VALUES (
    v_customer_id, 'Cliente temporal de prueba',
    '573' || pg_catalog.lpad(
      (pg_catalog.floor(pg_catalog.random() * 1000000000))::bigint::text, 9, '0'
    ),
    pg_catalog.now(), 'smoke-test', 'prueba SQL temporal'
  );

  INSERT INTO public.products (
    id, code, variant_group_id, name, category, size, color,
    cost_price, sale_price, stock, min_stock, active
  )
  VALUES (
    v_product_id, v_product_code, 'test-' || v_product_id,
    'Producto temporal de prueba', 'ropa', 'M', 'Negro',
    1000, 10000, 2, 0, true
  );

  SELECT * INTO v_first_sale
  FROM public.create_sale(
    v_customer_id,
    pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('product_id', v_product_id, 'quantity', 1)
    ),
    'credit', 0, NULL,
    'credit-smoke-first-' || v_product_id, 'smoke-test@example.invalid'
  );

  SELECT * INTO v_second_sale
  FROM public.create_sale(
    v_customer_id,
    pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('product_id', v_product_id, 'quantity', 1)
    ),
    'credit', 0, NULL,
    'credit-smoke-second-' || v_product_id, 'smoke-test@example.invalid'
  );

  PERFORM public.create_receipt_link(
    v_first_sale.sale_id, v_token_hash, 'smoke-test@example.invalid'
  );

  SELECT * INTO v_payment
  FROM public.record_customer_credit_payment(
    v_customer_id, 15000, 'efectivo', 'Abono de prueba',
    v_request_key, 'smoke-test@example.invalid'
  );

  SELECT
    COALESCE(pg_catalog.sum(allocation.amount)
      FILTER (WHERE allocation.sale_id = v_first_sale.sale_id), 0)::integer,
    COALESCE(pg_catalog.sum(allocation.amount)
      FILTER (WHERE allocation.sale_id = v_second_sale.sale_id), 0)::integer
  INTO v_first_allocation, v_second_allocation
  FROM public.customer_credit_allocations AS allocation
  WHERE allocation.payment_id = v_payment.payment_id;

  IF v_first_allocation <> 10000 OR v_second_allocation <> 5000 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'El abono no se repartió primero a la venta más antigua.';
  END IF;

  v_receipt := public.get_public_receipt(v_token_hash);
  IF (v_receipt ->> 'paid')::bigint <> 10000
    OR (v_receipt ->> 'balance')::bigint <> 0
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'El comprobante no refleja el abono activo.';
  END IF;

  SELECT * INTO v_repeated_payment
  FROM public.record_customer_credit_payment(
    v_customer_id, 15000, 'efectivo', 'Abono de prueba',
    v_request_key, 'smoke-test@example.invalid'
  );

  SELECT pg_catalog.count(*)::integer
  INTO v_count
  FROM public.customer_credit_payments AS payment
  WHERE payment.request_key = v_request_key;

  IF v_repeated_payment.payment_id <> v_payment.payment_id OR v_count <> 1 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'La clave request_key no hizo idempotente el abono.';
  END IF;

  BEGIN
    PERFORM *
    FROM public.record_customer_credit_payment(
      v_customer_id, 5001, 'efectivo', NULL,
      pg_catalog.gen_random_uuid(), 'smoke-test@example.invalid'
    );
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'Se aceptó un abono superior a la deuda pendiente.';
  EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
      IF SQLERRM <> 'El abono supera el saldo pendiente del cliente.' THEN
        RAISE;
      END IF;
  END;

  PERFORM public.void_customer_credit_payment(
    v_payment.payment_id, 'Anulación de prueba', 'smoke-test@example.invalid'
  );

  SELECT COALESCE(pg_catalog.sum(balance), 0)::bigint
  INTO v_balance
  FROM public.get_customer_credit_overview()
  WHERE customer_id = v_customer_id;

  IF v_balance <> 20000 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'Anular el abono no restauró el saldo original.';
  END IF;

  v_receipt := public.get_public_receipt(v_token_hash);
  IF (v_receipt ->> 'paid')::bigint <> 0
    OR (v_receipt ->> 'balance')::bigint <> 10000
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'El comprobante no excluyó el abono anulado.';
  END IF;

  BEGIN
    PERFORM public.void_customer_credit_payment(
      v_payment.payment_id, 'Segunda anulación de prueba', 'smoke-test@example.invalid'
    );
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'Se permitió anular dos veces el mismo abono.';
  EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
      IF SQLERRM <> 'El abono ya fue anulado.' THEN
        RAISE;
      END IF;
  END;

  BEGIN
    DELETE FROM public.customer_credit_payments
    WHERE id = v_payment.payment_id;
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'Se pudo borrar un abono.';
  EXCEPTION
    WHEN SQLSTATE '42501' OR SQLSTATE '55000' THEN
      NULL;
  END;
END;
$test$;

ROLLBACK;
