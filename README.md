# KathaInv

KathaInv es una aplicación web para administrar productos, existencias, compras y ventas de un almacén de ropa, calzado, bolsos y accesorios. Está diseñada para uso móvil y permite consultar productos por código escrito o escaneado.

## Funcionalidades

- Registro y edición de productos/variantes, códigos únicos, stock y desactivación.
- Consulta por código o nombre; cámara para leer códigos en dispositivos compatibles.
- Compras de contado a proveedores que aumentan existencias de forma atómica.
- Ventas de contado, a crédito o parciales con descuento de stock atómico, precio congelado y aviso de agotado.
- Registro de clientes, cartera calculada desde ventas y pagos, distribución cronológica de abonos y anulación de abonos con motivo.
- Historial y anulación de ventas con devolución de existencias, motivo y auditoría.
- Reportes de productos más y menos vendidos en un rango de fechas.
- Etiquetas Code 128 imprimibles desde el navegador.
- Enlaces de comprobantes revocables; la página pública muestra información limitada, sin datos personales.
- Autenticación con Supabase Auth y acceso restringido a las cuentas permitidas.

Los descuentos comerciales aún no están implementados: su regla debe acordarse con el profesor. KathaInv no incluye facturación electrónica, varias sucursales, tienda en línea, impuestos ni deudas con proveedores.

## Stack

- Next.js 15 App Router, React 19 y TypeScript estricto.
- Tailwind CSS 3.
- Supabase Auth y Postgres; `@supabase/ssr` y cliente Supabase para acceso desde servidor.
- Zod, Vitest, Testing Library, `@zxing/browser` y `jsbarcode`.
- Despliegue configurado para Vercel.

No usa un pool directo `pg`. La mayoría de módulos de datos acceden desde el servidor por cliente Supabase administrativo y funciones RPC. Productos mantienen además un adaptador JSON local seleccionable.

## Requisitos y ejecución local

Requiere Node.js/npm y un proyecto Supabase configurado.

1. Instala dependencias: `npm install`.
2. Crea `.env.local` localmente e incorpora solo los nombres de variables que correspondan a tu entorno:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY`
   - `ALLOWED_EMAILS`
   - `PRODUCTS_REPOSITORY`
   - `SITE_URL`
   - `NEXT_PUBLIC_APP_NAME`
   - `NEXT_PUBLIC_APP_VERSION`
3. Configura el adaptador de productos apropiado para el entorno en `PRODUCTS_REPOSITORY`. La clave `SUPABASE_SECRET_KEY` es exclusivamente del servidor; no debe tener prefijo `NEXT_PUBLIC_`.
4. Revisa y aplica manualmente, en el proyecto Supabase correcto, las migraciones necesarias de `supabase/migrations/`. La aplicación no las ejecuta.
5. Inicia el servidor de desarrollo: `npm run dev`.

No guardes credenciales ni datos de `.env.local` en el repositorio, capturas, documentación o mensajes. `.env.local` está excluido en `.gitignore`.

### Scripts disponibles

| Comando | Uso |
|---|---|
| `npm run dev` | Servidor de desarrollo. |
| `npm run build` | Compilación de producción. |
| `npm start` | Servir una compilación existente. |
| `npm run lint` | ESLint mediante el comando de Next configurado. |
| `npm run type-check` | Comprobación TypeScript sin emitir archivos. |
| `npm run test` | Pruebas Vitest de una ejecución. |
| `npm run test:watch` | Vitest en modo observación. |
| `npm run test:coverage` | Vitest con cobertura. |
| `npm run format` | Formatea los archivos TS/TSX/CSS bajo `src/`. |
| `node scripts/check-supabase-public-access.mjs` | Comprueba con la clave pública que tablas/RPC esperadas no permitan acceso público; requiere las variables públicas en `.env.local`. Selecciona la clave primaria correcta de `sale_void_audits`; no prueba funciones trigger por RPC, pues se verifican con SQL. Los estados HTTP no esperados se reportan como no concluyentes. |

No hay scripts npm de migración, carga demo ni flujo de prueba de base de datos. Las pruebas SQL se ejecutan manualmente en el editor de Supabase después de revisar la migración correspondiente.

## Estructura

```text
data/                       Colecciones JSON locales y esquemas Zod
doc/                        Plan, decisiones, avance y documentación
scripts/                    Comprobación de acceso público a Supabase
src/app/                    Páginas App Router y API
src/components/             Autenticación, navegación y componentes UI
src/config/                 Configuración del nombre de la tienda
src/lib/                    Auth, Supabase, JSON DB y utilidades
src/modules/                Productos, ventas, compras, clientes,
                            crédito, comprobantes, reportes e inicio
supabase/migrations/        Migraciones SQL manuales
supabase/tests/             Smoke tests SQL transaccionales
```

## Datos, seguridad e integridad

- Los módulos de ventas, compras, clientes, cartera, comprobantes y reportes usan Supabase desde el servidor. Productos pueden usar el repositorio Supabase o JSON según la configuración de `PRODUCTS_REPOSITORY`.
- `src/lib/json-db.ts` persiste colecciones en archivos `data/*.json` para uso local. En producción esos archivos son de solo lectura y las escrituras fallan; no uses el adaptador JSON en Vercel.
- Las rutas privadas verifican la sesión Supabase y la política de correos permitidos en el servidor. Las API distinguen falta de sesión (401) y cuenta no autorizada (403).
- Las migraciones habilitan y fuerzan RLS y revocan permisos de cliente en las tablas privadas. Las operaciones que deben cambiar stock de forma atómica (ventas y compras), abonos y anulaciones se concentran en RPC servidor `SECURITY DEFINER`; otros CRUD autorizados usan el cliente Supabase administrativo desde el servidor.
- La venta bloquea productos, valida existencias, congela precio/costo y descuenta stock en una sola operación de base de datos. Las compras también registran la compra y aumentan stock en una operación atómica.
- Los totales y precios se guardan como enteros en pesos colombianos. El estado agotado se deriva del stock.
- Los comprobantes almacenan el hash del token, permiten revocar enlaces y exponen solo datos necesarios. `/receipt/[token]` no se indexa; compartir el enlace por WhatsApp requiere acción manual.
- Los smokes SQL de `supabase/tests/` usan `BEGIN` y `ROLLBACK`; ejecutarlos manualmente solo después de comprobar el entorno y revisar el archivo.

## Migraciones y pruebas SQL

Las migraciones se aplican manualmente y en orden en Supabase; no hay migrador automático. La estudiante confirmó que las migraciones de RN-02/RN-15, créditos/abonos y anulación de ventas están aplicadas y verificadas, y que sus smoke tests fueron aprobados. Revisa el estado de cualquier otra migración antes de usar datos reales.

| Migración | Propósito |
|---|---|
| `20261029222200_products_secure_storage.sql` | Productos, códigos internos y seguridad RLS. |
| `20261030142100_customers_secure_storage.sql` | Clientes y protección de sus registros. |
| `20261030224600_sales_atomic_stock.sql` | Ventas, ítems, pagos y RPC atómica `create_sale`. |
| `20261030234601_sale_receipts.sql` | Tokens de comprobantes y funciones de creación, revocación y consulta pública. |
| `20261031100000_purchases_atomic_stock.sql` | Proveedores, compras y RPC `create_purchase`. |
| `20261107010000_products_required_attributes.sql` | Campos de producto obligatorios (RN-14). |
| `20261107120000_p09_f6_product_sales_report.sql` | Reporte de ventas por producto (F6). |
| `20261108163200_products_integrity_rn02_rn15.sql` | Referencia única y protección de borrado/desactivación. |
| `20261109010000_customer_credit_payments.sql` | Abonos, asignaciones y consultas de cartera. |
| `20261109020000_void_sales_return_stock.sql` | Anulación de venta, devolución de stock y auditoría. |

Pruebas SQL disponibles:

- `customer_credit_payments_smoke_test.sql`
- `product_sales_report_smoke_test.sql`
- `products_integrity_rn02_rn15_smoke_test.sql`
- `products_required_attributes_smoke_test.sql`
- `purchases_smoke_test.sql`
- `receipts_smoke_test.sql`
- `sales_smoke_test.sql`
- `sales_void_smoke_test.sql`

Estas pruebas revierten las filas de su transacción al terminar correctamente. No sustituyen pruebas manuales en el sitio desplegado. En la última ejecución del comprobador de acceso público hubo 22 respuestas OK, 0 no concluyentes y 0 fallos. El script excluye RPC para funciones trigger, que se verifican con SQL. Consulta [doc/AUDITORIA_FINAL.md](./doc/AUDITORIA_FINAL.md) para el detalle, el estado conocido de migraciones y las brechas. La estudiante confirmó la aplicación de RN-02/RN-15, créditos/abonos y anulación de ventas, junto con sus smoke tests aprobados.

## Despliegue en Vercel

Conecta el repositorio a Vercel y define allí los nombres de variables requeridos por Supabase, la lista de cuentas autorizadas y la selección del adaptador de productos. Mantén la clave administrativa en variables de servidor, nunca en el bundle público. Revisa que la configuración aplique a los entornos de despliegue necesarios y que las migraciones requeridas ya estén aplicadas en el proyecto Supabase asociado.

El almacenamiento JSON no es persistente/escribible en producción. Antes de registrar datos reales en Vercel, confirma que los productos y los demás módulos apuntan a Supabase y que sus migraciones están aplicadas.

## Limitaciones y decisiones pendientes

- No hay descuentos comerciales; la regla depende del acuerdo con el profesor.
- La cartera se calcula desde ventas y pagos; no existe un saldo inicial específico para deudas anteriores al sistema.
- El identificador de referencia requiere nombre+talla+color único; definir cómo distinguir dos prendas diferentes con esa misma combinación.
- Proveedores, clientes y comprobantes son ampliaciones del alcance MVP inicial; confirmar su alcance académico y tratamiento.
- Las migraciones de anulación de ventas, créditos/abonos y RN-02/RN-15 están aplicadas y verificadas en Supabase, con smoke tests aprobados según confirmó la estudiante. El comprobador público reportó 22 OK y ningún resultado no concluyente; no verifica funciones de tipo trigger por RPC.

## Documentación

- [Plan KathaInv](./doc/PLAN_KATHAINV.md)
- [Contexto del proyecto](./doc/CONTEXTO-KATHAINV.md)
- [Estado de ejecución](./doc/ESTADO_EJECUCION.md)
- [Dictamen previo](./doc/DICTAMEN.md)
- [Auditoría final](./doc/AUDITORIA_FINAL.md)
- [Criterios de aceptación](./doc/ACEPTACION.md)
