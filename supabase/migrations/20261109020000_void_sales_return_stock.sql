-- Tarea 3.3D: anular ventas, devolver existencias y conservar auditoría.
-- Revisar y ejecutar manualmente en Supabase. Esta migración no se ejecuta
-- desde la aplicación ni modifica funciones o tablas existentes.

CREATE TABLE public.sale_void_audits (
  sale_id bigint PRIMARY KEY
    REFERENCES public.sales(id) ON DELETE RESTRICT,
  voided_at timestamptz NOT NULL,
  voided_by text NOT NULL CHECK (pg_catalog.btrim(voided_by) <> ''),
  reason text NOT NULL
    CHECK (pg_catalog.btrim(reason) <> '' AND pg_catalog.length(reason) <= 500)
);

COMMENT ON TABLE public.sale_void_audits IS
  'Actor verificado de la anulación; status, fecha y motivo también se conservan en sales.';
COMMENT ON COLUMN public.sale_void_audits.voided_by IS
  'Correo de la sesión verificada que anuló la venta.';

CREATE FUNCTION public.void_sale(
  p_sale_id bigint,
  p_reason text,
  p_voided_by text
)
RETURNS TABLE (
  sale_id bigint,
  voided_at timestamptz,
  voided_by text,
  void_reason text,
  reactivated_products jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_sale public.sales%ROWTYPE;
  v_voided_at timestamptz := pg_catalog.now();
  v_reactivated_products jsonb;
BEGIN
  IF p_sale_id IS NULL OR p_sale_id <= 0
    OR p_reason IS NULL
    OR pg_catalog.btrim(p_reason) = ''
    OR pg_catalog.length(pg_catalog.btrim(p_reason)) > 500
    OR p_voided_by IS NULL
    OR pg_catalog.btrim(p_voided_by) = ''
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'El motivo de anulación y la persona responsable son obligatorios.';
  END IF;

  SELECT sale.*
  INTO v_sale
  FROM public.sales AS sale
  WHERE sale.id = p_sale_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'La venta indicada no existe.';
  END IF;

  IF v_sale.status <> 'active' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'La venta ya fue anulada.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.customer_credit_allocations AS allocation
    JOIN public.customer_credit_payments AS payment
      ON payment.id = allocation.payment_id
    WHERE allocation.sale_id = p_sale_id
      AND payment.status = 'active'
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Esta venta tiene abonos. Anula primero esos abonos y luego la venta.';
  END IF;

  -- Todas las anulaciones bloquean las referencias en el mismo orden.
  PERFORM product.id
  FROM public.products AS product
  JOIN public.sale_items AS item
    ON item.product_id = product.id
  WHERE item.sale_id = p_sale_id
  ORDER BY product.id
  FOR UPDATE OF product;

  IF EXISTS (
    SELECT 1
    FROM public.products AS product
    JOIN public.sale_items AS item
      ON item.product_id = product.id
    WHERE item.sale_id = p_sale_id
      AND product.stock > 2147483647 - item.quantity
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'La devolución supera el stock máximo permitido.';
  END IF;

  SELECT COALESCE(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'id', product.id,
        'code', product.code,
        'name', product.name
      )
      ORDER BY product.code, product.id
    ),
    '[]'::jsonb
  )
  INTO v_reactivated_products
  FROM public.products AS product
  JOIN public.sale_items AS item
    ON item.product_id = product.id
  WHERE item.sale_id = p_sale_id
    AND NOT product.active;

  UPDATE public.products AS product
  SET stock = product.stock + item_totals.quantity::integer,
      active = true
  FROM (
    SELECT item.product_id, pg_catalog.sum(item.quantity)::bigint AS quantity
    FROM public.sale_items AS item
    WHERE item.sale_id = p_sale_id
    GROUP BY item.product_id
  ) AS item_totals
  WHERE product.id = item_totals.product_id;

  UPDATE public.sale_payments AS payment
  SET status = 'voided',
      voided_at = v_voided_at,
      void_reason = pg_catalog.btrim(p_reason)
  WHERE payment.sale_id = p_sale_id
    AND payment.kind = 'initial'
    AND payment.status = 'active';

  UPDATE public.sales AS sale
  SET status = 'voided',
      voided_at = v_voided_at,
      void_reason = pg_catalog.btrim(p_reason)
  WHERE sale.id = p_sale_id;

  INSERT INTO public.sale_void_audits (
    sale_id, voided_at, voided_by, reason
  )
  VALUES (
    p_sale_id, v_voided_at, pg_catalog.btrim(p_voided_by), pg_catalog.btrim(p_reason)
  );

  RETURN QUERY
  SELECT
    p_sale_id,
    v_voided_at,
    pg_catalog.btrim(p_voided_by),
    pg_catalog.btrim(p_reason),
    v_reactivated_products;
END;
$function$;

ALTER TABLE public.sale_void_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_void_audits FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.sale_void_audits
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.void_sale(bigint, text, text)
  FROM PUBLIC, anon, authenticated, service_role;

GRANT SELECT ON TABLE public.sale_void_audits TO service_role;
GRANT EXECUTE ON FUNCTION public.void_sale(bigint, text, text) TO service_role;
