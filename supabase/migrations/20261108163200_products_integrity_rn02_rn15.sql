-- Tarea 3.2: integridad de referencias y desactivación de productos (RN-02/RN-15).
-- Revisar y ejecutar manualmente en el proyecto Supabase.

ALTER TABLE public.products
  ADD CONSTRAINT products_active_requires_zero_stock_check
  CHECK (active OR stock = 0);

CREATE UNIQUE INDEX products_reference_unique_idx
  ON public.products (
    pg_catalog.lower(pg_catalog.btrim(name)),
    pg_catalog.lower(pg_catalog.btrim(size)),
    pg_catalog.lower(pg_catalog.btrim(color))
  );

CREATE FUNCTION public.prevent_product_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = 'P0001',
    MESSAGE = 'Los productos no se pueden eliminar.';
END;
$function$;

CREATE TRIGGER products_prevent_delete
BEFORE DELETE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.prevent_product_delete();

REVOKE DELETE ON TABLE public.products FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.products TO service_role;
REVOKE ALL ON FUNCTION public.prevent_product_delete() FROM PUBLIC, anon, authenticated;

COMMENT ON CONSTRAINT products_active_requires_zero_stock_check ON public.products IS
  'Solo se permite desactivar un producto cuando sus existencias son cero.';
COMMENT ON INDEX public.products_reference_unique_idx IS
  'La referencia (nombre, talla y color) es única ignorando mayúsculas y espacios exteriores.';
