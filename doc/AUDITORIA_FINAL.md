# KathaInv · Auditoría final

**Referencia de tarea:** P05, fase 4 (cierre).

**Alcance:** revisión documental del plan, código, migraciones y pruebas versionadas. No se conectó con credenciales de base de datos ni se ejecutó SQL; el comprobador sí hizo solicitudes HTTP con la clave pública. La estudiante confirmó que las migraciones RN-02/RN-15, créditos/abonos y anulación de ventas están aplicadas y verificadas en Supabase, y que sus smoke tests fueron aprobados.

## Comprobador de acceso público

Se ejecutó `node scripts/check-supabase-public-access.mjs` desde la raíz de `KATHAINV`, sin servidor local.

| Resultado | Cantidad | Detalle |
|---|---:|---|
| OK | 22 | La clave pública no pudo leer las tablas o ejecutar las funciones RPC comprobadas. |
| No concluyente | 0 | No hubo errores de red, respuestas HTTP inesperadas ni variables faltantes. |
| Fallo de seguridad | 0 | No hubo respuestas que el script clasificara como acceso público exitoso. |

Se corrigió la comprobación de `sale_void_audits` para seleccionar `sale_id` en lugar de `id`. La respuesta HTTP 400 anterior contenía `column sale_void_audits.id does not exist`; `sale_id` es su clave primaria. También se retiraron de RPC `protect_customer_credit_payment` y `protect_customer_credit_allocation`: son funciones de tipo trigger y PostgREST no las expone como RPC. Sus permisos y asociación se revisan mediante SQL/migraciones, no mediante este script. Tras estos ajustes el script reportó **22 OK, 0 no concluyentes y 0 fallos de seguridad**. El total pasó de 24 a 22 comprobaciones porque se eliminaron las dos pruebas RPC no aplicables.

## Reglas de negocio RN-01 a RN-15

| Regla | Estado | Evidencia y evaluación |
|---|---|---|
| RN-01 · No vender más que el stock | Cumplido | `create_sale` bloquea productos y valida existencias en `supabase/migrations/20261030224600_sales_atomic_stock.sql`; prueba `supabase/tests/sales_smoke_test.sql`. |
| RN-02 · Referencia única por nombre, talla y color | Cumplido | Validación en `src/modules/products/product-rules.ts` y `src/modules/products/supabase-repository.ts`; índice único normalizado en `supabase/migrations/20261108163200_products_integrity_rn02_rn15.sql`. La estudiante confirmó la aplicación/verificación de la migración y la aprobación del smoke test. |
| RN-03 · Código desconocido se registra antes de operar | Cumplido | `src/modules/products/components/ProductScanner.tsx` ofrece el alta desde el escaneo; `src/modules/sales/components/SalesManager.tsx` no permite vender un producto no registrado. |
| RN-04 · Agotado derivado de stock cero | Cumplido | Estado mostrado a partir de existencias en `src/modules/products/components/ProductScanner.tsx` y `src/modules/sales/components/SalesManager.tsx`; `create_sale` actualiza stock en la transacción. |
| RN-05 · Código único normalizado | Cumplido | Columna generada e índice único en `supabase/migrations/20261029222200_products_secure_storage.sql`; normalización en `src/modules/products/code-utils.ts`. |
| RN-06 · Precios enteros positivos | Cumplido | `products.sale_price` es `integer` positivo; precios congelados y totales de venta son enteros en `supabase/migrations/20261030224600_sales_atomic_stock.sql`. El costo permite cero. |
| RN-07 · Cantidad de entrada entera positiva | Cumplido | Restricción y validación de `create_purchase` en `supabase/migrations/20261031100000_purchases_atomic_stock.sql`; `src/modules/purchases/schemas.ts`. |
| RN-08 · Cantidad vendida entera positiva | Cumplido | Validación de entrada de `create_sale` en `supabase/migrations/20261030224600_sales_atomic_stock.sql`; `src/modules/sales/schemas.ts`. |
| RN-09 · Categorías permitidas | Cumplido | Restricción en `supabase/migrations/20261029222200_products_secure_storage.sql`; esquema en `data/_schema/product.schema.ts`. |
| RN-10 · Compra suma a producto existente | Cumplido | `create_purchase` bloquea el producto, registra compra y suma existencias atómicamente en `supabase/migrations/20261031100000_purchases_atomic_stock.sql`. |
| RN-11 · Total por ítems y precio congelado | Parcial | `create_sale` calcula el total desde precio × cantidad y copia precio/costo a `sale_items` en `supabase/migrations/20261030224600_sales_atomic_stock.sql`. Los descuentos no están implementados: su regla sigue pendiente de acuerdo con el profesor. |
| RN-12 · Descuento de stock dentro de venta atómica | Cumplido | Bloqueo `FOR UPDATE`, inserción y descuento en `create_sale`, `supabase/migrations/20261030224600_sales_atomic_stock.sql`. |
| RN-13 · Solo productos activos para vender | Cumplido | `create_sale` rechaza productos inactivos; la consulta de venta filtra los productos disponibles. Evidencia: `supabase/migrations/20261030224600_sales_atomic_stock.sql` y `src/modules/sales/supabase-repository.ts`. |
| RN-14 · Nombre, talla y color no vacíos | Cumplido | Restricciones en `supabase/migrations/20261107010000_products_required_attributes.sql`; el estado de ejecución registra migración y smoke test confirmados por la estudiante; validación en `data/_schema/product.schema.ts`. |
| RN-15 · No borrar; desactivar solo con stock cero | Cumplido | `src/modules/products/supabase-repository.ts` desactiva y comprueba stock; restricciones y trigger en `supabase/migrations/20261108163200_products_integrity_rn02_rn15.sql`. La estudiante confirmó la aplicación/verificación de la migración y la aprobación del smoke test. |

## Funcionalidades F1 a F7

| Funcionalidad | Estado | Evidencia y evaluación |
|---|---|---|
| F1 · Gestión de productos | Cumplido | Alta, edición, búsqueda, códigos, variantes y desactivación en `src/modules/products/`; persistencia Supabase y alternativa JSON. Las reglas RN-02/RN-15 están aplicadas y verificadas en Supabase, con smoke tests aprobados según confirmó la estudiante. |
| F2 · Entradas/compras | Cumplido | Proveedores y compras de contado; RPC atómica y aumento de stock en `src/modules/purchases/` y `supabase/migrations/20261031100000_purchases_atomic_stock.sql`. La estudiante confirmó migración y smoke test. |
| F3 · Consulta por escaneo | Cumplido | Cámara y entrada manual con `@zxing/browser` en `src/modules/products/components/ProductScanner.tsx`; consulta por nombre/código y alta del código desconocido. |
| F4 · Ventas, descuento de stock y aviso de agotado | Parcial | Venta atómica, alerta posterior y anulación/devolución de stock implementadas en `src/modules/sales/`; la estudiante confirmó la aplicación/verificación en Supabase de `20261109020000_void_sales_return_stock.sql` y aprobó su smoke test. El único pendiente funcional es acordar descuentos con el profesor. |
| F5 · Autenticación | Difiere | Se usa Supabase Auth y autorización del lado servidor con `ALLOWED_EMAILS`, en lugar del adaptador de sesión descrito en el plan. Es una decisión documentada en `doc/CONTEXTO-KATHAINV.md`; páginas y API verifican acceso. |
| F6 · Métricas de rotación | Cumplido | Reporte por rango de fechas en `src/modules/reports/` y RPC `get_product_sales_report` de `supabase/migrations/20261107120000_p09_f6_product_sales_report.sql`. La estudiante confirmó la migración y su smoke test. |
| F7 · Etiquetas | Cumplido | Impresión de etiquetas Code 128 en `src/modules/products/components/ProductLabelPrint.tsx`; prueba `src/modules/products/__tests__/ProductLabelPrint.test.tsx`. Tamaño inicial 50 × 30 mm, ajustable. |

## Prompts P01 a P09

El estado formal previo a esta tarea figura como pendiente en `doc/ESTADO_EJECUCION.md`. La tabla distingue ese cierre formal del avance visible en el código.

| Prompt | Estado | Evidencia |
|---|---|---|
| P01 · Base de datos | Parcial | Diez migraciones en `supabase/migrations/`; aplicación manual. RN-02/RN-15, créditos/abonos y anulación de ventas están aplicadas y verificadas en Supabase, con smoke tests aprobados según confirmó la estudiante. |
| P02 · Reglas | Difiere | Las reglas y pruebas están organizadas por módulo (`src/modules/*`) y esquema (`data/_schema/`), no bajo el `lib/reglas/` propuesto. El comportamiento principal está implementado; descuentos pendientes. |
| P03 · Servidor y sesión | Difiere | Supabase SSR/Auth y cliente administrativo con `SUPABASE_SECRET_KEY` en `src/lib/supabase/`; no se usa un pool `pg` ni el adaptador `lib/auth/sesion.ts` del plan. |
| P04 · Datos y API (productos/ventas) | Parcial | Repositorios Supabase por módulo y RPC transaccionales en `src/modules/` y `supabase/migrations/`. No existen los scripts de flujo/demo descritos en el prompt. |
| P05 · API, cierre de Fase 4 | Parcial | API protegida en `src/app/api/data/`, pero no con el prefijo del plan; la verificación remota integral descrita en P05 no queda acreditada en la bitácora. |
| P06 · Interfaz e inventario | Parcial | Pantallas adaptables en `src/app/(dashboard)/`; `doc/CONTEXTO-KATHAINV.md` todavía enumera revisión de vistas pendientes. |
| P07 · Productos y entradas | Parcial | Formularios de productos, escaneo y compras existentes en `src/modules/products/` y `src/modules/purchases/`; falta cierre formal/aceptación manual. |
| P08 · Venta, aceptación y README | Parcial | Flujo de venta está implementado; antes de esta auditoría faltaban `doc/ACEPTACION.md` y un README fiel al estado Supabase. Esta tarea crea esos documentos, pero no ejecuta aceptación en Vercel. |
| P09 · Opcionales | Parcial | F6 y F7 existen y sus migraciones/pruebas están versionadas; P09 sigue pendiente formalmente y no se registra aceptación manual de A-15. |

## Brechas priorizadas

### Alta · acciones pendientes

1. **Decidir con el profesor los descuentos.** Definir el tipo, alcance y efecto antes de cambiar ventas, saldos, pagos, comprobantes o reportes.
2. **Ejecutar tus pruebas A-01 a A-14 en Vercel** y completar la columna Resultado de `doc/ACEPTACION.md`. No se marcaron criterios como aprobados en esta auditoría.

### Media

3. **Saldo inicial para deudas anteriores.** No hay saldo inicial independiente; decidir con el profesor si entran al sistema y cómo se respaldan, sin ajustar saldos manualmente.
4. **Prendas físicamente distintas con igual nombre, talla y color.** RN-02 las considera una referencia. Acordar cómo identificarlas, posiblemente con un atributo adicional o una regla de identidad.
5. **Alcance académico de pesos enteros, etiquetas, clientes, comprobantes y proveedores.** Confirmar con el profesor si estos detalles y ampliaciones corresponden a la entrega.
6. **Limpieza de datos.** No se consultaron filas ni se ejecutó SQL; no se puede afirmar qué filas de prueba persisten actualmente.
7. **Cierre formal de P01–P09.** Hay avances y confirmaciones de la estudiante registrados, pero faltan cierres formales.

### Baja

8. **Diferencias de arquitectura.** El código usa repositorios por módulo y Supabase SSR/cliente administrativo, en lugar de `dataService`, `lib/datos/` y `pg` del plan. No se propone reescribirlos: las rutas actuales están protegidas y las RPC concentran las escrituras atómicas.
9. **Convención de API.** El código usa `/api/data/*`, `/api/receipts/*` y `/api/auth/*`, no `/api/kathainv/*`; documentar el mapeo es suficiente mientras los contratos y la autorización sean correctos.

## Decisiones que dependen del profesor

| Tema | Estado observado | Decisión que falta |
|---|---|---|
| Descuentos | No implementados. | Porcentaje o valor fijo; por artículo o por venta; efecto en total, comprobante, cartera y reportes. |
| Saldo inicial de deudas anteriores | No hay un mecanismo separado de saldos iniciales. | Si se incluirán deudas preexistentes y cómo documentar su fecha, monto y respaldo. |
| Pesos enteros | El esquema usa importes enteros COP, sin centavos. | Confirmar que esta representación es la regla de entrega. |
| Etiquetas | Code 128, impresión del navegador, tamaño predeterminado 50 × 30 mm ajustable. | Confirmar si formato, tamaño y presentación cumplen el requisito académico. |
| Clientes | Gestión de clientes, autorización de tratamiento y cartera están implementadas, fuera del MVP técnico original. | Confirmar si forman parte de la entrega y los datos personales que se permite conservar. |
| Comprobantes | Enlaces revocables con token almacenado como hash y vista pública limitada; fuera del MVP original. | Confirmar su alcance y contenido permitido. |
| Proveedores | Gestión y compras asociadas a proveedor están implementadas como ampliación del flujo de entradas. | Confirmar si proveedores son obligatorios para la entrega o solo un detalle operativo. |
| Prendas con igual nombre, talla y color | RN-02 las considera una sola referencia. | Definir cómo distinguir dos prendas realmente diferentes sin duplicar la clave actual. |

## Limpieza de datos de prueba · diseño solamente

**No se consultaron filas ni se preparó/ejecutó SQL de limpieza.** Las ocho pruebas de `supabase/tests/` declaran `BEGIN` y `ROLLBACK`; si se ejecutan completas en una transacción, las filas insertadas por ellas no deberían persistir. Las secuencias pueden avanzar aun cuando la transacción se revierta. Por ello, las tablas siguientes son tablas **usadas por los escenarios de prueba**, no una afirmación de que contengan filas de prueba actualmente.

| Tablas que los smoke tests utilizan | Evidencia |
|---|---|
| `products` | Todas las pruebas de flujo/productos, compras, ventas, reportes, crédito y anulación. |
| `customers` | `sales_smoke_test.sql`, `receipts_smoke_test.sql`, `customer_credit_payments_smoke_test.sql` y `sales_void_smoke_test.sql`. |
| `suppliers`, `purchases` | `purchases_smoke_test.sql`. |
| `sales`, `sale_items`, `sale_payments` | Pruebas de ventas, comprobantes, reportes, créditos y anulación. |
| `sale_receipt_tokens` | `receipts_smoke_test.sql` y `sales_void_smoke_test.sql`. |
| `customer_credit_payments`, `customer_credit_allocations` | Pruebas de abonos y anulación de ventas. |
| `sale_void_audits` | `sales_void_smoke_test.sql`. |

Si una limpieza futura aprobada requiere borrar filas protegidas, habría que evaluar temporalmente, en un procedimiento controlado, los triggers:

- `products_prevent_delete` sobre `products`.
- `customers_protect_row` sobre `customers` (protege actualizaciones y borrados).
- `sales_prevent_delete`, `sale_items_prevent_delete` y `sale_payments_prevent_delete` sobre sus respectivas tablas.
- `sale_receipt_tokens_prevent_delete` sobre `sale_receipt_tokens`.
- `customer_credit_payments_protect` y `customer_credit_allocations_protect` sobre las tablas de abonos.

`suppliers`, `purchases` y `sale_void_audits` no tienen un trigger de protección de borrado en las migraciones revisadas, aunque sus claves foráneas pueden impedir borrar filas relacionadas. La auditoría no prescribe el orden, la consulta ni el SQL de limpieza; el SQL queda pendiente de revisión y aprobación de la estudiante.
