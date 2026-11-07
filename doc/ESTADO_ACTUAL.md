# KATHAINV · Estado actual

Auditoría P00 realizada sobre el árbol de trabajo en `main`. No se inspeccionó `.env.local`, no se conectó el agente a Supabase y no se ejecutó SQL. El inventario de tablas de este documento se deduce de los archivos versionados en `supabase/migrations/`; no certifica el estado de una instancia remota. Después de P00, la estudiante informó que una consulta de solo lectura devolvió `42P01` para `public.purchases` (tabla inexistente); por autorización, el archivo de migración se corrigió localmente a total entero, pero no se aplicó.

## 1. Versiones del proyecto

Versiones declaradas en `package.json`:

| Paquete | Versión declarada |
|---|---:|
| Next.js | `^15.3.5` |
| React / React DOM | `^19.0.0` |
| TypeScript | `^5.7.2` |
| Tailwind CSS | `^3.4.17` |
| `pg` | No está declarado |
| Zod | `^3.23.8` |
| `@supabase/supabase-js` | `^2.118.0` |
| Vitest | `^2.1.8` |
| Escaneo (`@zxing/browser`) | `^0.2.1` |

## 2. Scripts disponibles

| Script | Comando |
|---|---|
| `dev` | `next dev` |
| `build` | `next build` |
| `start` | `next start` |
| `lint` | `next lint` |
| `format` | Prettier sobre `src/**/*.{ts,tsx,css}` |
| `type-check` | `tsc --noEmit` |
| `test` | `vitest run --config vitest.config.mts` |
| `test:watch` | `vitest --config vitest.config.mts` |
| `test:coverage` | Vitest con cobertura |

No hay scripts de aplicación automática de migraciones ni de conexión directa con `pg`.

## 3. Estructura real

El código de la aplicación usa `src/`. Los módulos de dominio están en inglés bajo `src/modules/`.

```text
src/
  app/
    (auth)/{login,register,forgot-password,reset-password}/
    (dashboard)/{account,customers,products,purchases,reports,sales,scan}/
    api/{auth,data,health,receipts}/
    auth/callback/
    receipt/[token]/
  components/{auth,home,layout,ui}/
  config/
  lib/{auth,supabase}/
  modules/{customers,products,purchases,receipts,sales}/
  test/
data/
  _schema/
scripts/
supabase/
  migrations/
  tests/
```

`src/lib/json-db.ts` y `src/modules/products/json-repository.ts` conservan compatibilidad con almacenamiento JSON. No existe la estructura del plan `lib/datos/`, `lib/reglas/`, ni una carpeta `/panel`.

## 4. Alias de importación

Según `tsconfig.json`:

- `@/*` apunta a `./src/*`.
- `@data/*` apunta a `./data/*`.

## 5. Autenticación

- Usa Supabase Auth con sesión/cookies de `@supabase/ssr`; el inicio de sesión se valida en `src/app/api/auth/login/route.ts` y restringe las cuentas mediante `ALLOWED_EMAILS`.
- La pantalla está en `/login` (`src/app/(auth)/login/page.tsx`). Tras autenticar, `LoginForm` redirige a `/` y actualiza la navegación.
- `src/middleware.ts` delega en `src/lib/supabase/middleware.ts`. Protege páginas, excluye rutas API de su matcher; las rutas API verifican autorización en servidor mediante `getServerAccessStatus`.
- `src/components/auth/LogoutButton.tsx` cierra la sesión con Supabase Auth y redirige a `/login`.
- `src/components/auth/LoginForm.test.tsx` tiene tres pruebas: errores locales de campos sin llamada API, error de autenticación y redirección al inicio tras éxito.
- También existen registro, recuperación y restablecimiento de contraseña.

## 6. Persistencia por entidad

La arquitectura de persistencia del proyecto es Supabase Postgres, accedido desde el servidor con el cliente administrativo de `src/lib/supabase/admin.ts` y `SUPABASE_SECRET_KEY`. Se invocan funciones RPC para operaciones atómicas y se usa el cliente Supabase para lecturas/escrituras que no requieren una RPC. No se usa un driver `pg` ni una cadena de conexión Postgres directa.

| Entidad | Persistencia observada en el código |
|---|---|
| Productos | Supabase (`products`) mediante `src/modules/products/supabase-repository.ts`; el selector `PRODUCTS_REPOSITORY` conserva además una implementación JSON alternativa. No se inspeccionó `.env.local` para determinar su valor actual. |
| Ventas e ítems | Supabase mediante `create_sale`; el repositorio también lee ventas recientes. |
| Clientes | Supabase mediante `src/modules/customers/supabase-repository.ts`. |
| Proveedores y compras | Supabase; `create_purchase` registra la compra y suma existencias en la misma operación. |
| Comprobantes | Supabase mediante `create_receipt_link`, `revoke_receipt_links` y `get_public_receipt`; los archivos JSON no son su almacenamiento. |
| Archivo JSON local | Existen `data/product.json`, `purchase.json`, `sale.json` y `supplier.json` y una base JSON heredada. Su presencia no demuestra que sean la fuente de persistencia activa. |

## 7. Funcionalidades del MVP construidas

| Funcionalidad | Estado y evidencia |
|---|---|
| Productos | CRUD en `/products`, validación con esquemas Zod y repositorio Supabase. Hay pruebas de esquemas y repositorio. La desactivación y unicidad de la combinación nombre/talla/color requieren atención (RN-02 y RN-15). |
| Entradas/compras | `/purchases`; selección de proveedor y producto. `create_purchase` bloquea la fila del producto, crea la compra y aumenta stock atómicamente. Hay pruebas del repositorio y esquemas. |
| Consulta por código | `/scan`; búsqueda manual, por nombre y cámara. Los códigos no encontrados permiten abrir `/products` con el código precargado. |
| Venta | `/sales`; carrito, pagos de contado/parciales/fiados, asociación de cliente, historial reciente y comprobante. `create_sale` verifica existencias y descuenta stock en una función transaccional. No hay descuento aplicado en el esquema ni en el RPC revisados, y la pantalla no emite una alerta específica al quedar stock en cero. |
| Login | `/login` con Supabase Auth, control de correo permitido y prueba existente. |

Rutas de aplicación observadas: `/products`, `/sales`, `/customers`, `/purchases`, `/scan`, `/receipt/[token]`, `/reports`, `/account` y `/`. El contenido de `/reports` todavía muestra “En construcción”.

## 8. Escaneo

La cámara está implementada mediante `@zxing/browser` en `src/modules/products/components/ProductBarcodeCamera.tsx` y `src/modules/sales/components/SalesManager.tsx`. Es código cliente (`'use client'`) y carga ZXing con `import()` al iniciar la cámara; si no hay permiso/cámara, se conserva la entrada manual. Existe también búsqueda de productos por nombre.

## 9. Variables de entorno (solo nombres)

Nombres encontrados en `.env.example`:

`NODE_ENV`, `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_VERSION`, `SITE_URL`, `ALLOWED_EMAILS`, `DATA_DIR`, `PRODUCTS_REPOSITORY`, `SUPABASE_SECRET_KEY`.

El código referencia además `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, pero esos nombres no aparecen en `.env.example`. No se leyó ni se enumeró `.env.local`. `.env.local` está ignorado por Git.

No hay una variable ni dependencia de conexión directa PostgreSQL en el proyecto; no es necesaria para el diseño actual basado en Supabase y RPC. Si la estudiante decidiera migrar deliberadamente a un driver directo en otra tarea, Supabase ofrece los datos desde **Connect → Transaction pooler** (puerto `6543`); la cadena sería una configuración local fuera del repositorio, no una credencial para documentar aquí. No se obtiene ni se configura en P00.

## 10. Migraciones y despliegue de esquema

Existen cinco archivos SQL en `supabase/migrations/`, listados al final. Sus encabezados indican revisión y ejecución manual en Supabase; no se encontró un ejecutor local ni una tabla de control de migraciones en el repositorio. Esta auditoría no se conectó a la base ni ejecutó las consultas de verificación incluidas en los archivos.

## 11. Tablas y columnas deducidas de las migraciones

La lista siguiente se deduce de los `CREATE TABLE` versionados; no es una consulta a la base remota:

| Tabla | Columnas |
|---|---|
| `products` | `id`, `code`, `normalized_code` (generada), `code_type`, `variant_group_id`, `name`, `category`, `size`, `color`, `cost_price`, `sale_price`, `stock`, `min_stock`, `active`, `created_at`, `updated_at` |
| `customers` | `id`, `name`, `phone`, `document`, `data_treatment_authorized_at`, `data_treatment_notice_version`, `data_treatment_authorization_source`, `active`, `created_at`, `updated_at` |
| `sales` | `id`, `sale_number`, `request_key`, `created_by`, `customer_id`, `sold_at`, `payment_type`, `total`, `status`, `voided_at`, `void_reason` |
| `sale_items` | `id`, `sale_id`, `product_id`, `product_code`, `product_name`, `size`, `color`, `unit_price`, `unit_cost`, `quantity` |
| `sale_payments` | `id`, `sale_id`, `kind`, `amount`, `payment_method`, `paid_at`, `note`, `status`, `voided_at`, `void_reason` |
| `sale_receipt_tokens` | `id`, `sale_id`, `token_hash`, `created_at`, `created_by`, `revoked_at`, `revoked_by` |
| `suppliers` | `id`, `name`, `normalized_name` (generada), `created_at`, `updated_at` |
| `purchases` | `id`, `product_id`, `product_code`, `supplier_id`, `quantity`, `total` (`integer`, `CHECK total >= 0`), `date`, `created_at`, `updated_at` |

Las funciones RPC incluidas abarcan `create_sale`, `create_purchase` (parámetro y retorno `total integer`), `create_receipt_link`, `revoke_receipt_links` y `get_public_receipt`. No hay una tabla de movimientos de inventario en estas migraciones: las existencias actuales están en `products.stock`.

Verificaciones puntuales solicitadas:

- **RN-15, desactivar solo con stock 0:** no se cumple todavía. La ruta DELETE delega en `removeOrDeactivateProduct`; el repositorio Supabase actualiza `active: false` solo por `id`, sin condición `stock = 0`. La pantalla de edición también acepta cambiar `active` mediante un checkbox. La rama JSON puede eliminar productos sin movimientos. No se debe cambiar hasta resolver el alcance con la estudiante.
- **Unicidad de producto + talla + color:** no está garantizada por la migración. `products` tiene unicidad de `normalized_code`, pero no una restricción/índice único de `variant_group_id` (o identidad del producto) + `size` + `color`. El código probado valida la unicidad del código, no la combinación de variante.
- **Precio congelado por ítem:** sí está implementado. `create_sale` copia el precio vigente a `sale_items.unit_price` (y el costo a `unit_cost`) en la misma operación; la migración documenta esa copia.
- **“Agotado” derivado del stock:** sí está derivado en pantalla (`stock === 0`); `products` no tiene una columna de estado “agotado”.
- **Variables públicas de Supabase en `.env.example`:** faltan los nombres `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Se registra el hallazgo sin modificar configuración.

La migración de compras revisada localmente usa `integer` para `purchases.total` y para el parámetro/retorno de `create_purchase`; mantiene RLS forzado sin políticas, RPC `SECURITY DEFINER` con `search_path` vacío, permisos solo para `service_role` y bloqueo del producto. La estudiante no la ha aplicado.

## 12. Estilos

Tailwind CSS 3.4.17; los tokens HSL de tema, superficie, colores semánticos, radios, espaciado, tipografía y sombras están en `src/app/globals.css` y `tailwind.config.ts`. La fuente sans es Arial/Helvetica Neue con fallback sans-serif. No se declara una librería de iconos en `package.json`.

## 13. Pruebas existentes

Vitest 2.x y Testing Library. Hay 40 archivos de pruebas con un total de 144 pruebas aprobadas en la verificación final; cubren autenticación, APIs, módulos de productos, compras, ventas, clientes, comprobantes, Supabase y componentes UI. Hay una prueba específica de impresión de etiquetas y tres de `LoginForm`.

## 14. Verificaciones ejecutadas

Se comprobó que no había un proceso de servidor Next activo antes de correr los comandos. `node_modules` ya existía, por lo que no se instaló nada. Cada comando se ejecutó con `npm.cmd`, de forma secuencial y con el servidor apagado:

| Verificación | Resultado |
|---|---|
| `npm.cmd run build` | Correcto; compilación, tipos y 26 páginas generadas. |
| `npm.cmd test` | Correcto; 40 archivos y 144 pruebas aprobadas. |
| `npm.cmd run type-check` | Correcto; `tsc --noEmit` sin errores. |
| `npm.cmd run lint` | Correcto; sin warnings ni errores de ESLint. Next advierte que `next lint` está obsoleto y se eliminará en Next.js 16. |

No se corrigió código, configuración o dependencias durante el diagnóstico.

Como seguimiento autorizado para resolver el conflicto del total de compras, se cambiaron localmente la migración existente, el esquema Zod, el formulario y sus pruebas. No se ejecutó SQL ni se aplicó la migración. El resultado actual incluye esos cambios.

## 15. Migraciones encontradas

1. `supabase/migrations/20261029222200_products_secure_storage.sql`
2. `supabase/migrations/20261030142100_customers_secure_storage.sql`
3. `supabase/migrations/20261030224600_sales_atomic_stock.sql`
4. `supabase/migrations/20261030234601_sale_receipts.sql`
5. `supabase/migrations/20261031100000_purchases_atomic_stock.sql`

## 16. Historial Git completo observado

Salida de `git log --oneline --decorate --all` al auditar:

```text
4cfbc2d (HEAD -> main, origin/main, origin/HEAD) docs: plan y prompts del profesor
5f60897 merge: traer compras y comprobantes de origin/main
9ce1176 (refs/stash) On main: product.json local
e467d17 index on main: 2da3513 fix(auth): tratar un refresh token inexistente como sin sesión
2da3513 fix(auth): tratar un refresh token inexistente como sin sesión
988a63f feat(purchases): registro de compras a proveedor
0dece4a feat(receipts): comprobante público y envío por WhatsApp
868ad57 feat(db): comprobantes de venta con enlaces seguros
1f515fc feat(sales): registro de ventas con descuento de stock
33156f1 feat(db): ventas atómicas con descuento de stock
6270a0a feat(customers): clientes con autorización de datos
21b6bdb feat(db): esquema seguro de clientes en Supabase
4d9aa18 feat(products): repositorio Supabase intercambiable
ecc1c3a fix(db): prueba de acceso público en Node
2435421 feat(db): esquema seguro de productos en Supabase
b28df09 feat(labels): etiquetas imprimibles con código de barras Code 128
33075c9 feat(scan): consulta de productos por código y cámara
e84bf76 feat(products): productos con variantes y códigos internos únicos
e82f3af feat(auth): Supabase Auth, lista de correos autorizados y recuperación de contraseña
90ecf4a feat(auth): Supabase Auth con lista de correos autorizados
566ea14 feat(ui): layout con menú inferior y Route Groups
8760ae1 feat(ui): páginas de error personalizadas
5f4b102 feat(ui): componentes Badge Input y Card
047d2aa feat(ui): componentes base parte A
cd4c102 feat(ui): tokens de diseño y tema claro/oscuro
7449fbb Merge pull request #1 from celena01-pertuz/feature/json-db-engine
b7e6e9d (origin/feature/json-db-engine, feature/json-db-engine) Tarea 1.8: documentar capa de datos
40f4c72 Tarea 1.6: completar tests del motor
acbd7e0 Tarea 1.5: corregir API y agregar tests
6a3549c Tarea 1.4: esquemas de producto, proveedor, compra y venta
236a442 Actualizar alcance de autenticación
9fc824f Tarea 0.2: completar corrección de lint
76ad8f5 Tarea 0.2: corregir lint y tests
d54592f feat: add JSON DB engine and API
45257ba Create project documentation for KATHAINV
b83a79a Delete PERTUZ_KATHAINV_v2
04ac41d Add project documentation for KATHAINV
d772ef3 feat: agregar inicio de sesion
6c8cf11 Subida inicial
82c9258 Inicializar proyecto KATHAINV
685f3eb Initial commit from workspace
```

## 17. Actualización posterior de avance · 2026-11-07

La sección 7 anterior conserva la radiografía histórica de P00. Según la actualización de la estudiante, desde esa auditoría quedaron completados los reportes, RN-14, la paleta beige y rosa (modo oscuro neutro con rosa y blanco) y la vista de ventas en dos columnas con alta rápida de clientes. La estudiante confirmó que `20261107010000_products_required_attributes.sql` (RN-14) está aplicada y verificada en Supabase: existen los tres `CHECK` y pasó el smoke test. También confirmó que `20261107120000_p09_f6_product_sales_report.sql` está aplicada y su smoke test pasó. Son verificaciones reportadas por la estudiante, no una conexión o comprobación independiente desde esta auditoría.

El estado pendiente vigente y las decisiones de diseño aún no implementadas se registran en `doc/ESTADO_EJECUCION.md`; incluye la alerta de agotado, las vistas de productos y clientes en dos columnas, ajustes al inicio y menú, la revisión contra el plan, fiados, anulación de ventas, Fase 4 y la regla de descuentos por acordar con el profesor.
