CREATE TABLE public.customer_credit_payments (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id text NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  request_key uuid NOT NULL UNIQUE,
  amount integer NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL
    CHECK (payment_method IN ('efectivo', 'transferencia', 'nequi', 'tarjeta')),
  paid_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  note text,
  created_by text NOT NULL CHECK (pg_catalog.btrim(created_by) <> ''),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'voided')),
  voided_at timestamptz,
  voided_by text,
  void_reason text,
  CONSTRAINT customer_credit_payments_void_fields_match CHECK (
    (status = 'active' AND voided_at IS NULL AND voided_by IS NULL AND void_reason IS NULL)
    OR
    (status = 'voided' AND voided_at IS NOT NULL AND
      pg_catalog.btrim(voided_by) <> '' AND pg_catalog.btrim(void_reason) <> '')
  )
);

CREATE TABLE public.customer_credit_allocations (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  payment_id bigint NOT NULL
    REFERENCES public.customer_credit_payments(id) ON DELETE RESTRICT,
  sale_id bigint NOT NULL REFERENCES public.sales(id) ON DELETE RESTRICT,
  amount integer NOT NULL CHECK (amount > 0),
  CONSTRAINT customer_credit_allocations_one_sale_per_payment
    UNIQUE (payment_id, sale_id)
);

CREATE INDEX customer_credit_payments_customer_paid_idx
  ON public.customer_credit_payments (customer_id, paid_at DESC, id DESC);
CREATE INDEX customer_credit_allocations_sale_id_idx
  ON public.customer_credit_allocations (sale_id);

COMMENT ON TABLE public.customer_credit_payments IS
  'Abonos inmutables de clientes; su anulación restaura el saldo calculado.';
COMMENT ON TABLE public.customer_credit_allocations IS
  'Reparto inmutable de cada abono entre ventas activas, empezando por la más antigua.';
COMMENT ON COLUMN public.customer_credit_payments.request_key IS
  'Clave idempotente para evitar registrar dos veces una misma solicitud.';

CREATE FUNCTION public.protect_customer_credit_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'Los abonos se anulan; no se eliminan.';
  END IF;

  IF OLD.id IS DISTINCT FROM NEW.id
    OR OLD.customer_id IS DISTINCT FROM NEW.customer_id
    OR OLD.request_key IS DISTINCT FROM NEW.request_key
    OR OLD.amount IS DISTINCT FROM NEW.amount
    OR OLD.payment_method IS DISTINCT FROM NEW.payment_method
    OR OLD.paid_at IS DISTINCT FROM NEW.paid_at
    OR OLD.note IS DISTINCT FROM NEW.note
    OR OLD.created_by IS DISTINCT FROM NEW.created_by
    OR OLD.status <> 'active'
    OR NEW.status <> 'voided'
    OR NEW.voided_at IS NULL
    OR NEW.voided_by IS NULL
    OR pg_catalog.btrim(NEW.voided_by) = ''
    OR NEW.void_reason IS NULL
    OR pg_catalog.btrim(NEW.void_reason) = ''
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'El abono es inmutable; solo puede anularse con motivo.';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE FUNCTION public.protect_customer_credit_allocation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '55000',
    MESSAGE = 'El reparto de un abono es inmutable.';
END;
$function$;

CREATE TRIGGER customer_credit_payments_protect
BEFORE UPDATE OR DELETE ON public.customer_credit_payments
FOR EACH ROW EXECUTE FUNCTION public.protect_customer_credit_payment();

CREATE TRIGGER customer_credit_allocations_protect
BEFORE UPDATE OR DELETE ON public.customer_credit_allocations
FOR EACH ROW EXECUTE FUNCTION public.protect_customer_credit_allocation();

CREATE FUNCTION public.record_customer_credit_payment(
  p_customer_id text,
  p_amount integer,
  p_payment_method text,
  p_note text,
  p_request_key uuid,
  p_created_by text
)
RETURNS TABLE (payment_id bigint, paid_at timestamptz, amount integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_existing public.customer_credit_payments%ROWTYPE;
  v_customer_id text;
  v_debt bigint;
  v_remaining integer;
  v_sale record;
  v_allocation integer;
  v_payment_id bigint;
  v_paid_at timestamptz;
BEGIN
  IF p_customer_id IS NULL OR pg_catalog.btrim(p_customer_id) = ''
    OR p_amount IS NULL OR p_amount <= 0
    OR p_request_key IS NULL
    OR p_created_by IS NULL OR pg_catalog.btrim(p_created_by) = ''
    OR p_payment_method IS NULL
    OR p_payment_method NOT IN ('efectivo', 'transferencia', 'nequi', 'tarjeta')
    OR (p_note IS NOT NULL AND pg_catalog.length(p_note) > 500)
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Los datos del abono no son válidos.';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('customer-credit:' || p_customer_id, 0)
  );
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('customer-credit-request:' || p_request_key::text, 0)
  );

  SELECT payment.*
  INTO v_existing
  FROM public.customer_credit_payments AS payment
  WHERE payment.request_key = p_request_key;

  IF FOUND THEN
    IF v_existing.customer_id <> p_customer_id
      OR v_existing.amount <> p_amount
      OR v_existing.payment_method <> p_payment_method
      OR v_existing.note IS DISTINCT FROM NULLIF(pg_catalog.btrim(p_note), '')
    THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'La clave de solicitud ya fue usada con otros datos.';
    END IF;
    RETURN QUERY SELECT v_existing.id, v_existing.paid_at, v_existing.amount;
    RETURN;
  END IF;

  SELECT customer.id
  INTO v_customer_id
  FROM public.customers AS customer
  WHERE customer.id = p_customer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'El cliente indicado no existe.';
  END IF;

  PERFORM sale.id
  FROM public.sales AS sale
  WHERE sale.customer_id = p_customer_id
    AND sale.status = 'active'
  ORDER BY sale.sold_at, sale.id
  FOR UPDATE;

  SELECT COALESCE(
    pg_catalog.sum(
      GREATEST(
        sale.total::bigint
        - COALESCE((
          SELECT pg_catalog.sum(sale_payment.amount)::bigint
          FROM public.sale_payments AS sale_payment
          WHERE sale_payment.sale_id = sale.id
            AND sale_payment.status = 'active'
        ), 0)
        - COALESCE((
          SELECT pg_catalog.sum(allocation.amount)::bigint
          FROM public.customer_credit_allocations AS allocation
          JOIN public.customer_credit_payments AS payment
            ON payment.id = allocation.payment_id
          WHERE allocation.sale_id = sale.id
            AND payment.status = 'active'
        ), 0),
        0
      )
    ),
    0
  )
  INTO v_debt
  FROM public.sales AS sale
  WHERE sale.customer_id = p_customer_id
    AND sale.status = 'active';

  IF p_amount::bigint > v_debt THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'El abono supera el saldo pendiente del cliente.';
  END IF;

  INSERT INTO public.customer_credit_payments (
    customer_id, request_key, amount, payment_method, note, created_by
  )
  VALUES (
    p_customer_id, p_request_key, p_amount, p_payment_method,
    NULLIF(pg_catalog.btrim(p_note), ''), p_created_by
  )
  RETURNING id, customer_credit_payments.paid_at
  INTO v_payment_id, v_paid_at;

  v_remaining := p_amount;
  FOR v_sale IN
    SELECT
      sale.id,
      GREATEST(
        sale.total::bigint
        - COALESCE((
          SELECT pg_catalog.sum(sale_payment.amount)::bigint
          FROM public.sale_payments AS sale_payment
          WHERE sale_payment.sale_id = sale.id
            AND sale_payment.status = 'active'
        ), 0)
        - COALESCE((
          SELECT pg_catalog.sum(allocation.amount)::bigint
          FROM public.customer_credit_allocations AS allocation
          JOIN public.customer_credit_payments AS payment
            ON payment.id = allocation.payment_id
          WHERE allocation.sale_id = sale.id
            AND payment.status = 'active'
        ), 0),
        0
      ) AS balance
    FROM public.sales AS sale
    WHERE sale.customer_id = p_customer_id
      AND sale.status = 'active'
    ORDER BY sale.sold_at, sale.id
  LOOP
    EXIT WHEN v_remaining = 0;
    IF v_sale.balance > 0 THEN
      v_allocation := LEAST(v_remaining::bigint, v_sale.balance)::integer;
      INSERT INTO public.customer_credit_allocations (payment_id, sale_id, amount)
      VALUES (v_payment_id, v_sale.id, v_allocation);
      v_remaining := v_remaining - v_allocation;
    END IF;
  END LOOP;

  IF v_remaining <> 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'No se pudo repartir el abono completo.';
  END IF;

  RETURN QUERY SELECT v_payment_id, v_paid_at, p_amount;
END;
$function$;

CREATE FUNCTION public.void_customer_credit_payment(
  p_payment_id bigint,
  p_reason text,
  p_voided_by text
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_customer_id text;
BEGIN
  IF p_payment_id IS NULL OR p_payment_id <= 0
    OR p_reason IS NULL OR pg_catalog.btrim(p_reason) = ''
    OR pg_catalog.length(pg_catalog.btrim(p_reason)) > 500
    OR p_voided_by IS NULL OR pg_catalog.btrim(p_voided_by) = ''
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'El motivo de anulación es obligatorio.';
  END IF;

  SELECT payment.customer_id
  INTO v_customer_id
  FROM public.customer_credit_payments AS payment
  WHERE payment.id = p_payment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'El abono indicado no existe.';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('customer-credit:' || v_customer_id, 0)
  );

  UPDATE public.customer_credit_payments AS payment
  SET status = 'voided',
      voided_at = pg_catalog.now(),
      voided_by = p_voided_by,
      void_reason = pg_catalog.btrim(p_reason)
  WHERE payment.id = p_payment_id
    AND payment.status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'El abono ya fue anulado.';
  END IF;
  RETURN p_payment_id;
END;
$function$;

CREATE FUNCTION public.get_customer_credit_overview()
RETURNS TABLE (
  customer_id text,
  balance bigint,
  oldest_debt_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  WITH sale_balances AS (
    SELECT
      sale.customer_id,
      sale.id AS sale_id,
      sale.sold_at,
      GREATEST(
        sale.total::bigint
        - COALESCE((
          SELECT pg_catalog.sum(sale_payment.amount)::bigint
          FROM public.sale_payments AS sale_payment
          WHERE sale_payment.sale_id = sale.id
            AND sale_payment.status = 'active'
        ), 0)
        - COALESCE((
          SELECT pg_catalog.sum(allocation.amount)::bigint
          FROM public.customer_credit_allocations AS allocation
          JOIN public.customer_credit_payments AS payment
            ON payment.id = allocation.payment_id
          WHERE allocation.sale_id = sale.id
            AND payment.status = 'active'
        ), 0),
        0
      ) AS balance
    FROM public.sales AS sale
    WHERE sale.status = 'active'
      AND sale.customer_id IS NOT NULL
  )
  SELECT
    customer.id,
    COALESCE(pg_catalog.sum(sale_balance.balance), 0)::bigint,
    min(sale_balance.sold_at) FILTER (WHERE sale_balance.balance > 0)
  FROM public.customers AS customer
  LEFT JOIN sale_balances AS sale_balance
    ON sale_balance.customer_id = customer.id
  GROUP BY customer.id;
$function$;

CREATE FUNCTION public.get_customer_credit_detail(p_customer_id text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  WITH sale_balances AS (
    SELECT
      sale.id,
      sale.sale_number,
      sale.sold_at,
      sale.total,
      GREATEST(
        sale.total::bigint
        - COALESCE((
          SELECT pg_catalog.sum(sale_payment.amount)::bigint
          FROM public.sale_payments AS sale_payment
          WHERE sale_payment.sale_id = sale.id
            AND sale_payment.status = 'active'
        ), 0)
        - COALESCE((
          SELECT pg_catalog.sum(allocation.amount)::bigint
          FROM public.customer_credit_allocations AS allocation
          JOIN public.customer_credit_payments AS payment
            ON payment.id = allocation.payment_id
          WHERE allocation.sale_id = sale.id
            AND payment.status = 'active'
        ), 0),
        0
      ) AS balance,
      COALESCE((
        SELECT pg_catalog.sum(sale_payment.amount)::bigint
        FROM public.sale_payments AS sale_payment
        WHERE sale_payment.sale_id = sale.id
          AND sale_payment.status = 'active'
      ), 0)
      + COALESCE((
        SELECT pg_catalog.sum(allocation.amount)::bigint
        FROM public.customer_credit_allocations AS allocation
        JOIN public.customer_credit_payments AS payment
          ON payment.id = allocation.payment_id
        WHERE allocation.sale_id = sale.id
          AND payment.status = 'active'
      ), 0) AS paid
    FROM public.sales AS sale
    WHERE sale.customer_id = p_customer_id
      AND sale.status = 'active'
  )
  SELECT pg_catalog.jsonb_build_object(
    'sales', COALESCE((
      SELECT pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'id', sale_balance.id,
          'saleNumber', sale_balance.sale_number,
          'soldAt', sale_balance.sold_at,
          'total', sale_balance.total,
          'paid', sale_balance.paid,
          'balance', sale_balance.balance
        ) ORDER BY sale_balance.sold_at, sale_balance.id
      )
      FROM sale_balances AS sale_balance
      WHERE sale_balance.balance > 0
    ), '[]'::jsonb),
    'payments', COALESCE((
      SELECT pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'id', payment.id,
          'amount', payment.amount,
          'paymentMethod', payment.payment_method,
          'paidAt', payment.paid_at,
          'note', payment.note,
          'status', payment.status,
          'voidReason', payment.void_reason,
          'allocations', COALESCE((
            SELECT pg_catalog.jsonb_agg(
              pg_catalog.jsonb_build_object(
                'saleNumber', sale.sale_number,
                'amount', allocation.amount
              ) ORDER BY sale.sold_at, sale.id
            )
            FROM public.customer_credit_allocations AS allocation
            JOIN public.sales AS sale ON sale.id = allocation.sale_id
            WHERE allocation.payment_id = payment.id
          ), '[]'::jsonb)
        ) ORDER BY payment.paid_at DESC, payment.id DESC
      )
      FROM public.customer_credit_payments AS payment
      WHERE payment.customer_id = p_customer_id
    ), '[]'::jsonb)
  )
  WHERE EXISTS (
    SELECT 1 FROM public.customers AS customer WHERE customer.id = p_customer_id
  );
$function$;

ALTER TABLE public.customer_credit_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_credit_payments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.customer_credit_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_credit_allocations FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.customer_credit_payments, public.customer_credit_allocations
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON SEQUENCE public.customer_credit_payments_id_seq,
  public.customer_credit_allocations_id_seq
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.protect_customer_credit_payment()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.protect_customer_credit_allocation()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.record_customer_credit_payment(text, integer, text, text, uuid, text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.void_customer_credit_payment(bigint, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_customer_credit_overview()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_customer_credit_detail(text)
  FROM PUBLIC, anon, authenticated, service_role;

GRANT SELECT ON TABLE public.customer_credit_payments, public.customer_credit_allocations
  TO service_role;
GRANT EXECUTE ON FUNCTION public.record_customer_credit_payment(text, integer, text, text, uuid, text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.void_customer_credit_payment(bigint, text, text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.get_customer_credit_overview()
  TO service_role;
GRANT EXECUTE ON FUNCTION public.get_customer_credit_detail(text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.protect_customer_credit_payment()
  TO service_role;
GRANT EXECUTE ON FUNCTION public.protect_customer_credit_allocation()
  TO service_role;

CREATE OR REPLACE FUNCTION public.get_public_receipt(p_token_hash text)
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
    'items', COALESCE((
      SELECT pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'name', item.product_name,
          'size', item.size,
          'color', item.color,
          'quantity', item.quantity,
          'unit_price', item.unit_price
        ) ORDER BY item.id
      )
      FROM public.sale_items AS item
      WHERE item.sale_id = sale.id
    ), '[]'::jsonb),
    'total', sale.total,
    'paid', COALESCE((
      SELECT pg_catalog.sum(payment.amount)::bigint
      FROM public.sale_payments AS payment
      WHERE payment.sale_id = sale.id
        AND payment.status = 'active'
    ), 0) + COALESCE((
      SELECT pg_catalog.sum(allocation.amount)::bigint
      FROM public.customer_credit_allocations AS allocation
      JOIN public.customer_credit_payments AS payment
        ON payment.id = allocation.payment_id
      WHERE allocation.sale_id = sale.id
        AND payment.status = 'active'
    ), 0),
    'balance', GREATEST(
      sale.total::bigint
      - COALESCE((
        SELECT pg_catalog.sum(payment.amount)::bigint
        FROM public.sale_payments AS payment
        WHERE payment.sale_id = sale.id
          AND payment.status = 'active'
      ), 0)
      - COALESCE((
        SELECT pg_catalog.sum(allocation.amount)::bigint
        FROM public.customer_credit_allocations AS allocation
        JOIN public.customer_credit_payments AS payment
          ON payment.id = allocation.payment_id
        WHERE allocation.sale_id = sale.id
          AND payment.status = 'active'
      ), 0),
      0
    )
  )
  INTO v_receipt
  FROM public.sale_receipt_tokens AS token
  JOIN public.sales AS sale ON sale.id = token.sale_id
  WHERE token.token_hash = p_token_hash
    AND token.revoked_at IS NULL;

  RETURN v_receipt;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_public_receipt(text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_public_receipt(text) TO service_role;
