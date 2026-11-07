-- P09/F6: métricas de rotación por periodo para reportes.
-- Revisar y ejecutar manualmente; la aplicación nunca ejecuta esta migración.

CREATE FUNCTION public.get_product_sales_report(
  p_from date,
  p_to date
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  IF p_from IS NULL OR p_to IS NULL OR p_from > p_to THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'El rango de fechas del reporte no es válido.';
  END IF;

  WITH sales_in_range AS (
    SELECT sale.id
    FROM public.sales AS sale
    WHERE sale.status = 'active'
      AND sale.sold_at >= (p_from::timestamp AT TIME ZONE 'America/Bogota')
      AND sale.sold_at < ((p_to + 1)::timestamp AT TIME ZONE 'America/Bogota')
  ),
  product_totals AS (
    SELECT
      item.product_id,
      pg_catalog.sum(item.quantity::bigint)::bigint AS units_sold,
      pg_catalog.sum(item.quantity::bigint * item.unit_price::bigint)::bigint AS total_sold
    FROM public.sale_items AS item
    JOIN sales_in_range AS sale ON sale.id = item.sale_id
    GROUP BY item.product_id
  ),
  report_products AS (
    SELECT
      product.id,
      product.code,
      product.name,
      product.size,
      product.color,
      product.active,
      COALESCE(pg_catalog.max(totals.units_sold), 0)::bigint AS units_sold,
      COALESCE(pg_catalog.max(totals.total_sold), 0)::bigint AS total_sold
    FROM public.products AS product
    LEFT JOIN product_totals AS totals ON totals.product_id = product.id
    GROUP BY product.id
    HAVING product.active OR pg_catalog.count(totals.product_id) > 0
  ),
  sales_count AS (
    SELECT pg_catalog.count(*)::bigint AS value
    FROM sales_in_range
  )
  SELECT pg_catalog.jsonb_build_object(
    'salesCount',
    (SELECT value FROM sales_count),
    'products',
    COALESCE(
      (
        SELECT pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'id', product.id,
            'code', product.code,
            'name', product.name,
            'size', product.size,
            'color', product.color,
            'active', product.active,
            'unitsSold', product.units_sold,
            'totalSold', product.total_sold
          )
          ORDER BY product.code, product.id
        )
        FROM report_products AS product
      ),
      '[]'::jsonb
    )
  )
  INTO v_result;

  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_product_sales_report(date, date)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_product_sales_report(date, date)
  TO service_role;
