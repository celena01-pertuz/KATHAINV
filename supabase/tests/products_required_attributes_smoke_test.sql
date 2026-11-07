-- Prueba manual para el SQL Editor de Supabase.
-- Ejecutar el bloque completo: BEGIN y ROLLBACK dejan sin filas de prueba.
BEGIN;
SET LOCAL ROLE service_role;

DO $test$
DECLARE
  v_product_id text := pg_catalog.gen_random_uuid()::text;
  v_product_code text;
  v_column_name text;
  v_invalid_value text;
  v_expected_constraint text;
  v_failed_constraint text;
BEGIN
  v_product_code := 'RN14-SMOKE-' || pg_catalog.replace(v_product_id, '-', '');

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
    'rn14-smoke-' || v_product_id,
    'Producto temporal RN-14',
    'ropa',
    'M',
    'Negro',
    5000,
    10000,
    0,
    0,
    true
  );

  FOR v_column_name, v_invalid_value, v_expected_constraint IN
    SELECT invalid_values.column_name,
           invalid_values.invalid_value,
           invalid_values.constraint_name
    FROM (
      VALUES
        ('name', '', 'products_name_not_blank_check'),
        ('name', '   ', 'products_name_not_blank_check'),
        ('size', '', 'products_size_not_blank_check'),
        ('size', '   ', 'products_size_not_blank_check'),
        ('color', '', 'products_color_not_blank_check'),
        ('color', '   ', 'products_color_not_blank_check')
    ) AS invalid_values(column_name, invalid_value, constraint_name)
  LOOP
    v_failed_constraint := NULL;

    BEGIN
      EXECUTE pg_catalog.format(
        'UPDATE public.products SET %I = $1 WHERE id = $2',
        v_column_name
      )
      USING v_invalid_value, v_product_id;
    EXCEPTION
      WHEN check_violation THEN
        GET STACKED DIAGNOSTICS v_failed_constraint = CONSTRAINT_NAME;
    END;

    IF v_failed_constraint IS DISTINCT FROM v_expected_constraint THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0002',
        MESSAGE = pg_catalog.format(
          'RN-14 no rechazó el valor inválido de %s con la restricción esperada.',
          v_column_name
        );
    END IF;
  END LOOP;
END;
$test$;

ROLLBACK;
