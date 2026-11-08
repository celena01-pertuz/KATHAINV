-- Prueba manual para el SQL Editor de Supabase.
-- Ejecutar el bloque completo: BEGIN y ROLLBACK dejan sin filas de prueba.
BEGIN;
SET LOCAL ROLE service_role;

DO $test$
DECLARE
  v_product_id text := pg_catalog.gen_random_uuid()::text;
  v_product_code text;
  v_product_name text;
  v_failed_constraint text;
  v_delete_rejected boolean := false;
  v_duplicate_product_id text := pg_catalog.gen_random_uuid()::text;
BEGIN
  v_product_code := 'RN02-RN15-SMOKE-' || pg_catalog.replace(v_product_id, '-', '');
  v_product_name := 'Smoke RN02 ' || pg_catalog.replace(v_product_id, '-', '');

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
    'rn02-rn15-smoke-' || v_product_id,
    v_product_name,
    'ropa',
    'M',
    'Negro',
    5000,
    10000,
    0,
    0,
    true
  );

  UPDATE public.products
  SET active = false
  WHERE id = v_product_id
    AND stock = 0;

  IF NOT FOUND OR (SELECT product.active FROM public.products AS product WHERE product.id = v_product_id) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'No se pudo desactivar un producto con stock cero.';
  END IF;

  UPDATE public.products
  SET active = true,
      stock = 2
  WHERE id = v_product_id;

  v_failed_constraint := NULL;
  BEGIN
    UPDATE public.products
    SET active = false
    WHERE id = v_product_id;
  EXCEPTION
    WHEN check_violation THEN
      GET STACKED DIAGNOSTICS v_failed_constraint = CONSTRAINT_NAME;
  END;

  IF v_failed_constraint IS DISTINCT FROM 'products_active_requires_zero_stock_check' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'La desactivación con stock positivo no fue rechazada por el CHECK esperado.';
  END IF;

  BEGIN
    DELETE FROM public.products
    WHERE id = v_product_id;
  EXCEPTION
    WHEN insufficient_privilege OR raise_exception THEN
      v_delete_rejected := true;
  END;

  IF NOT v_delete_rejected THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'service_role pudo borrar un producto.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.products AS product
    WHERE product.id = v_product_id
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'El producto de prueba no existe después del intento de borrado.';
  END IF;

  v_failed_constraint := NULL;
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
    VALUES (
      v_duplicate_product_id,
      'RN02-DUPLICATE-' || pg_catalog.replace(v_duplicate_product_id, '-', ''),
      'rn02-other-group-' || v_duplicate_product_id,
      '  ' || pg_catalog.upper(v_product_name) || '  ',
      'ropa',
      ' m ',
      'NEGRO ',
      5000,
      10000,
      0,
      0,
      true
    );
  EXCEPTION
    WHEN unique_violation THEN
      GET STACKED DIAGNOSTICS v_failed_constraint = CONSTRAINT_NAME;
  END;

  IF v_failed_constraint IS DISTINCT FROM 'products_reference_unique_idx' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'La referencia duplicada no fue rechazada por el índice esperado.';
  END IF;
END;
$test$;

ROLLBACK;
