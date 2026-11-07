-- RN-14: exigir nombre, talla y color no vacíos en todos los productos.
-- Ejecutar manualmente en el proyecto Supabase después de revisar este archivo.
-- La consulta previa reportó cero productos con valores nulos o en blanco.

ALTER TABLE public.products
  ADD CONSTRAINT products_name_not_blank_check
    CHECK (pg_catalog.btrim(name) <> ''),
  ADD CONSTRAINT products_size_not_blank_check
    CHECK (pg_catalog.btrim(size) <> ''),
  ADD CONSTRAINT products_color_not_blank_check
    CHECK (pg_catalog.btrim(color) <> '');
