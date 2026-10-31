# Datos privados en Supabase

La migración `migrations/20261029222200_products_secure_storage.sql` crea la
tabla de productos, el consecutivo `KAT-000001` y las restricciones de acceso.
La migración `migrations/20261030142100_customers_secure_storage.sql` crea la
tabla de clientes y sus restricciones de acceso. Revisa cada migración y
ejecútala manualmente en el panel SQL del proyecto Supabase; no se ejecutan
automáticamente desde la aplicación.

La migración `migrations/20261030224600_sales_atomic_stock.sql` crea las tablas
de ventas, sus detalles y pagos, y la función `create_sale` para registrar una
venta y descontar el stock en una sola transacción.

La migración `migrations/20261030234601_sale_receipts.sql` crea el registro de
hashes de enlaces de comprobantes y las funciones para crear, revocar y
consultar el contenido público del comprobante sin exponer datos personales.

Las tablas no tienen políticas RLS y `anon`/`authenticated` no reciben
permisos. La tabla de clientes no concede permiso de borrado: los registros se
desactivan. Las consultas de la aplicación deberán pasar por el servidor con
`SUPABASE_SECRET_KEY`, nunca con una variable `NEXT_PUBLIC_*`.

Después de aplicar las migraciones, revisa la consulta de verificación al final
de cada SQL y ejecuta `node scripts/check-supabase-public-access.mjs` desde la
raíz del repositorio. El script usa la clave pública para comprobar `products`,
`customers`, `sales`, `sale_items`, `sale_payments` y `sale_receipt_tokens`,
además de las funciones RPC `get_public_receipt`, `create_receipt_link`,
`revoke_receipt_links` y `create_sale`. Lee las variables públicas de
`.env.local` y no imprime claves, datos de respuesta ni valores de las tablas.
Para las tablas, HTTP 401 o 403 confirma que no se puede leer y HTTP 200 se
informa como fallo de seguridad. Para las funciones, HTTP 401 o 403 confirma
que la clave pública no puede ejecutarlas; HTTP 200 o 400 se informa como fallo
de seguridad porque la solicitud llegó a ejecutar la función. Errores de red,
variables faltantes, HTTP 404 y otros estados se informan como no concluyentes.
