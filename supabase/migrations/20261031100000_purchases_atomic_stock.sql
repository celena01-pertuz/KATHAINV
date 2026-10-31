-- Tarea Fase 3: compras de contado y aumento atómico de existencias.
-- Revisar y ejecutar manualmente en el proyecto Supabase.

CREATE TABLE public.suppliers (
  id text PRIMARY KEY,
  name text NOT NULL CHECK (pg_catalog.btrim(name) <> ''),
  normalized_name text GENERATED ALWAYS AS (pg_catalog.lower(pg_catalog.btrim(name))) STORED,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT suppliers_normalized_name_unique UNIQUE (normalized_name)
);

CREATE TABLE public.purchases (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id text NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_code text NOT NULL CHECK (pg_catalog.btrim(product_code) <> ''),
  supplier_id text NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  total numeric NOT NULL CHECK (total >= 0),
  date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now()
);

COMMENT ON TABLE public.suppliers IS
  'Proveedores de mercancía; sus nombres no se pueden duplicar ignorando mayúsculas.';
COMMENT ON TABLE public.purchases IS
  'Compras pagadas de contado. El alta y el aumento de stock ocurren juntos.';
COMMENT ON COLUMN public.purchases.total IS
  'Total pagado al proveedor en pesos; puede incluir decimales.';

CREATE INDEX purchases_created_at_idx ON public.purchases (created_at DESC);
CREATE INDEX purchases_supplier_id_idx ON public.purchases (supplier_id);
CREATE INDEX purchases_product_id_idx ON public.purchases (product_id);

CREATE FUNCTION public.create_purchase(
  p_product_code text,
  p_supplier_id text,
  p_quantity integer,
  p_total numeric,
  p_date date
)
RETURNS TABLE (
  purchase_id bigint,
  product_code text,
  product_name text,
  supplier_id text,
  quantity integer,
  total numeric,
  date date,
  new_stock integer,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_product public.products%ROWTYPE;
  v_purchase public.purchases%ROWTYPE;
BEGIN
  IF p_product_code IS NULL OR pg_catalog.btrim(p_product_code) = '' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'El código del producto es obligatorio.';
  END IF;

  IF p_supplier_id IS NULL OR pg_catalog.btrim(p_supplier_id) = '' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Selecciona un proveedor.';
  END IF;

  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'La cantidad debe ser un entero mayor que cero.';
  END IF;

  IF p_total IS NULL OR p_total < 0 OR p_total::text IN ('NaN', 'Infinity', '-Infinity') THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'El total debe ser un número igual o mayor que cero.';
  END IF;

  IF p_date IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'La fecha de compra es obligatoria.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.suppliers AS supplier
    WHERE supplier.id = p_supplier_id
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'El proveedor no existe.';
  END IF;

  SELECT product.*
  INTO v_product
  FROM public.products AS product
  WHERE product.normalized_code =
    pg_catalog.upper(
      pg_catalog.regexp_replace(pg_catalog.btrim(p_product_code), '[[:space:]]+', '', 'g')
    )
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'No se encontró un producto con ese código.';
  END IF;

  IF v_product.stock > 2147483647 - p_quantity THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'La cantidad supera el stock máximo permitido.';
  END IF;

  INSERT INTO public.purchases (
    product_id,
    product_code,
    supplier_id,
    quantity,
    total,
    date
  )
  VALUES (
    v_product.id,
    v_product.code,
    p_supplier_id,
    p_quantity,
    p_total,
    p_date
  )
  RETURNING * INTO v_purchase;

  UPDATE public.products AS product
  SET stock = product.stock + p_quantity
  WHERE product.id = v_product.id
  RETURNING product.stock INTO new_stock;

  purchase_id := v_purchase.id;
  product_code := v_purchase.product_code;
  product_name := v_product.name;
  supplier_id := v_purchase.supplier_id;
  quantity := v_purchase.quantity;
  total := v_purchase.total;
  date := v_purchase.date;
  created_at := v_purchase.created_at;
  updated_at := v_purchase.updated_at;
  RETURN NEXT;
END;
$function$;

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers FORCE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.suppliers, public.purchases
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON SEQUENCE public.purchases_id_seq
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.create_purchase(text, text, integer, numeric, date)
  FROM PUBLIC, anon, authenticated, service_role;

GRANT SELECT, INSERT ON TABLE public.suppliers TO service_role;
GRANT SELECT ON TABLE public.purchases TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.purchases_id_seq TO service_role;
GRANT EXECUTE ON FUNCTION public.create_purchase(text, text, integer, numeric, date)
  TO service_role;
