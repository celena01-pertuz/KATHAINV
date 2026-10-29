# Productos en Supabase

La migración `migrations/20261029222200_products_secure_storage.sql` crea la
tabla de productos, el consecutivo `KAT-000001` y las restricciones de acceso.
Revísala y ejecútala manualmente en el panel SQL del proyecto Supabase; no se
ejecuta automáticamente desde la aplicación.

La tabla no tiene políticas RLS abiertas y `anon`/`authenticated` no reciben
permisos. Las consultas de la aplicación deberán pasar por el servidor con
`SUPABASE_SECRET_KEY`, nunca con una variable `NEXT_PUBLIC_*`.

Después de aplicar la migración, revisa las consultas de verificación al final
del SQL y ejecuta `node scripts/check-products-public-access.mjs` desde la raíz
del repositorio. El script lee las variables públicas de `.env.local` y no
imprime claves ni respuestas de Supabase. El resultado es `OK` para HTTP 401,
403 o 404; HTTP 200 se informa como fallo de seguridad. Errores de red,
variables faltantes y otros estados HTTP se informan como no concluyentes.
