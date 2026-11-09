# KATHAINV · Estado de ejecución

Los prompts P01–P09 permanecen pendientes. P00 queda completado con la auditoría y artefactos indicados abajo.

| Prompt | Fase                       | Estado     | Evidencia                                                                                                                                       |
| ------ | -------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| P00    | Auditoría y reconciliación | Completado | `ESTADO_ACTUAL.md`, `DICTAMEN.md`, instrucciones Copilot y cierre de fase; build, test (40 archivos, 144 pruebas), type-check y lint correctos. |
| P01    | Base de datos              | Pendiente  | —                                                                                                                                               |
| P02    | Reglas                     | Pendiente  | —                                                                                                                                               |
| P03    | Servidor y sesión          | Pendiente  | —                                                                                                                                               |
| P04    | Datos y API                | Pendiente  | —                                                                                                                                               |
| P05    | Datos y API                | Pendiente  | —                                                                                                                                               |
| P06    | Interfaz                   | Pendiente  | —                                                                                                                                               |
| P07    | Interfaz                   | Pendiente  | —                                                                                                                                               |
| P08    | Interfaz y aceptación      | Pendiente  | —                                                                                                                                               |
| P09    | Opcionales                 | Pendiente  | —                                                                                                                                               |

## Bitácora

### Actualización de avance · 2026-11-07

Estado informado por la estudiante y sincronizado en el seguimiento. Las verificaciones remotas de migraciones anotadas abajo fueron confirmadas por la estudiante.

**Completado:**

- Reportes.
- Compras con total en pesos enteros no negativos.
- Etiquetas de productos y variantes.
- Inicio con saludo y reporte diario.
- Nombre de presentación de la cuenta.
- RN-14.
- Paleta beige y rosa; modo oscuro neutro con rosa y blanco.
- Vista de ventas en dos columnas y alta rápida de clientes.

**Pendiente:**

- Revisión general de la vista de productos.
- Revisión general contra el plan.
- Fiados y anulación de ventas.
- Fase 4.
- Acordar con el profesor la regla de descuentos antes de implementarla.

**Decisión de diseño resuelta:**

- Encabezados y espacios parejos, una sola acción principal opcional, mensajes amables y estados de carga/error accesibles en las pantallas de Productos, Clientes, Proveedores, Reportes y Ventas.

Los prompts P01–P09 conservan su estado formal hasta completar y verificar todos sus criterios; estos avances parciales no cierran por sí solos una fase.

### Mejora de interfaz Fase 2 · Tarea 2.2 (pruebas relacionadas con Tarea 2.7)

- Se creó un encabezado compartido y estados reutilizables para listas vacías, carga y errores con reintento.
- Clientes prioriza la búsqueda y la lista; muestra detalle o formulario al lado desde `md`. Proveedores ubica la compra a la izquierda y proveedores/compras recientes a la derecha.
- Productos, Reportes y Ventas comparten el mismo tamaño de título, márgenes y escala de separación. El total fijo de Ventas conserva su posición sobre el menú inferior.
- Pruebas actualizadas o agregadas para el encabezado, mensajes vacíos, columnas adaptables y una sola acción principal.
- Verificación individual, con el servidor apagado: type-check ✅, lint ✅, test (55 archivos, 238 pruebas) ✅, build ✅. No se ejecutó SQL ni se consultó la base.

### Tarea 3.2 · Integridad de productos (RN-02 y RN-15)

- Se agregó una migración nueva con `CHECK` para impedir la desactivación con stock positivo, índice único por nombre+talla+color normalizados y protección contra borrado de productos.
- El servicio/API devuelve 409 `PRODUCTO_CON_EXISTENCIAS` al intentar desactivar con stock y 409 `REFERENCIA_DUPLICADA` al crear o editar una referencia repetida; también traduce el error 23505 del índice a ese mismo conflicto.
- La interfaz deshabilita la desactivación mientras hay existencias, explica cómo resolverlo y permite reactivar productos inactivos.
- `/scan` y `/purchases` enlazan al mismo formulario `/products`; ambos usan la validación compartida de la API al crear productos nuevos.
- Se preparó el smoke test transaccional en `supabase/tests/`; se ajustaron los smoke tests existentes cuya preparación necesitaba representar productos inactivos con stock cero.
- No se ejecutó SQL ni se consultó la base. La estudiante correrá primero su consulta de solo lectura para detectar productos inactivos con stock y referencias duplicadas.
- En el plan `plan-implementacion-fases-ts-fullstack.md`, el encaje más cercano es Tarea 3.2 (módulo funcional); el documento no define una tarea específica para estas reglas del dominio.

### Tarea 3.5 · Inicio con saludo y reporte del día

- Se reemplazó “Hola mundo” por un inicio con saludo basado en la hora de Colombia y el nombre disponible en la sesión verificada (o solo el prefijo del correo).
- El selector Hoy / Ayer / fecha consulta un rango de un día en la API de reportes ya existente; los productos por reponer se leen desde la API existente de productos y se ordenan con agotados primero.
- Se retiró Reportes del menú; `/reports` sigue disponible desde “Ver reporte completo”.
- Sin SQL ni migraciones: se reutilizaron las rutas/API actuales, que mantienen la verificación de acceso 401/403.
- La página del Inicio se fuerza dinámica para calcular Hoy en cada visita; pruebas cubren la selección de Hoy/Ayer.
- En los registros revisados no se reprodujo un fallo de `/api/data/reports` (las solicitudes visibles respondieron 200). Sí apareció `Invalid Refresh Token: Refresh Token Not Found` (400, `refresh_token_not_found`), que indica una sesión Supabase obsoleta; no se atribuye al RPC del reporte.

### Tarea 3.3 · Nombre visible con Supabase Auth

- El registro exige el nombre y lo guarda en `user_metadata.full_name`; para cuentas existentes, el Inicio permite guardarlo o cambiarlo mediante una ruta protegida que toma la sesión del servidor.
- El nombre se usa solo para mostrar: primero `full_name`, luego `name` y, si falta, el prefijo del correo. No se guarda en la base de datos ni se usa para autorizar.
- Validación con Zod: texto recortado de 2 a 40 caracteres, sin saltos de línea ni caracteres de control. Sin SQL ni migraciones.

### P00 · Auditoría y reconciliación

- Se contrastaron el plan y el código existente sin modificar código de aplicación, configuración o dependencias.
- No se leyó `.env.local`, no se consultó la base remota y no se ejecutó SQL.
- Se dedujeron las tablas de las migraciones versionadas en `supabase/migrations/`.
- Verificaciones, cada una ejecutada individualmente con `npm.cmd` y el servidor apagado: build ✅; test (40 archivos, 144 pruebas) ✅; type-check ✅; lint ✅ (con aviso de obsolescencia de `next lint`).
- P00 se marca completado; no se inicia P01 hasta resolver los conflictos anotados en `doc/DICTAMEN.md`.

#### Resolución acordada del total de compras (registro histórico de P00)

- En ese momento, la estudiante informó que Supabase respondió `42P01` al consultar `public.purchases`; no había tabla aplicada ni filas a convertir.
- Por autorización explícita, se corrigió localmente la migración existente para `integer >= 0`, junto con Zod, formulario, pruebas y contexto. En ese punto, la migración no se había ejecutado.
- En ese punto, `scripts/check-supabase-public-access.mjs` conservaba diez comprobaciones en el código (seis tablas y cuatro RPC) y no se había ejecutado.

#### Decisiones y verificación posteriores

- RN-14: implementación en `20261107010000_products_required_attributes.sql`, Zod para creación/edición, formulario, pruebas Vitest y `supabase/tests/products_required_attributes_smoke_test.sql`. La estudiante confirmó que la migración está aplicada y verificada en Supabase: existen los tres `CHECK` y el smoke test pasó. El formulario exige talla/color y ofrece **“Única”** para bolsos y accesorios.
- Reportes de productos más y menos vendidos: la estudiante confirmó que `20261107120000_p09_f6_product_sales_report.sql` está aplicada en Supabase y que su smoke test pasó.
- Alerta de agotado (CU-06), extensión de la Tarea 3.3B de ventas: completada. La API lee el stock actual después del RPC `create_sale` y devuelve `outOfStock`, también en reintentos. Si falla la lectura, la venta sigue exitosa con una lista vacía y un registro técnico sin datos personales ni claves. `/sales` muestra el aviso accesible con opciones para reponer o cerrar. Sin cambios al RPC, migraciones o base de datos; no se ejecutó SQL.
- Descuentos: se agregarán; regla pendiente de definir con el profesor. No modificar `create_sale`, comprobantes, fiados ni reportes antes de acordarla.
- La estudiante confirmó que la migración de compras ya está aplicada y verificada en Supabase, y que pasó el smoke test. El script de acceso público se amplió para revisar `suppliers`, `purchases` y `create_purchase`; su ejecución dio 13 comprobaciones OK y ninguna fallida.
- El último type-check, lint, test y build finalizaron correctamente; Vitest reportó 153 pruebas en 41 archivos.

### Tarea 3.4 · Ventas a crédito, abonos y cartera de clientes · 2026-11-09

- Se conservan las opciones visibles **“De contado”** y **“A crédito”**. El servidor resuelve el pago inicial y lo mapea a los tipos internos ya admitidos por `create_sale`; esa función no se modificó.
- Los abonos se guardan en tablas nuevas (`customer_credit_payments` y `customer_credit_allocations`) para no cambiar `sale_payments`. Su reparto y saldo son transaccionales y calculados; el historial no permite editar ni borrar abonos y una anulación exige motivo.
- Se agregó una consulta agregada de cartera, detalle por cliente, filtros, pagos y enlace manual de WhatsApp. `get_public_receipt` se reemplaza con `CREATE OR REPLACE` para incluir solo abonos activos.
- La migración fue aplicada y verificada por la estudiante; su smoke test inicial pasó. Se amplió `customer_credit_payments_smoke_test.sql` con aserciones de doble anulación y comprobante, sin ejecutar el smoke test mejorado ni modificar la migración.
- El comprobador de acceso público se ejecutó con el servidor apagado: 20 comprobaciones OK; 2 RPC de funciones trigger (`protect_customer_credit_payment` y `protect_customer_credit_allocation`) no concluyentes por respuesta HTTP 404. Incluye las dos tablas de abonos y las cuatro RPC de negocio de crédito.
- El encargo asigna esta funcionalidad como Tarea 3.4. Nota: en `plan-implementacion-fases-ts-fullstack.md`, el encabezado existente “Tarea 3.4” corresponde a roles y permisos; no se renumeró ni alteró ese plan.
- Verificación local con el servidor apagado: `npm.cmd run type-check` OK; `npm.cmd run lint` OK (aviso de obsolescencia de `next lint`, sin errores); `npm.cmd test` OK (60 archivos, 258 pruebas); `npm.cmd run build` OK. No se ejecutó SQL; no se hizo commit.
