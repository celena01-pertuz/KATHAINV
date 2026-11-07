# KATHAINV · Dictamen P00

## Alcance

Se compara el plan con el código y las migraciones versionadas. El código que funciona y está probado se conserva; los desajustes de comportamiento o integridad se anotan sin implementar cambios en P00. La base no fue consultada y no se ejecutó SQL.

## F1 — Gestión de productos

- Estado actual: CRUD en `/products`, módulo `src/modules/products`, validación Zod, persistencia Supabase y pruebas; también existe una implementación JSON alternativa.
- Veredicto: **ENRIQUECER**
- Razón: la gestión existente se conserva, pero la base no garantiza la unicidad de la combinación variante+talla+color; además, el ciclo de desactivación no cumple RN-15.
- Acción concreta: conservar formularios y servicios existentes; resolver identidad de variante y regla de baja con la estudiante antes de modificar el esquema.
- Prompt donde se trata: P04, P05 y P07, únicamente tras resolver los conflictos.

## F2 — Entradas (compras)

- Estado actual: `/purchases` y `src/modules/purchases`; `create_purchase` valida, bloquea el producto, escribe la compra y suma existencias en una operación atómica. Hay proveedores y pruebas de esquema/repositorio.
- Veredicto: **CONSERVAR**
- Razón: persiste en Supabase y cumple la entrada a proveedor con aumento atómico del stock. La estudiante confirmó que `public.purchases` aún no existe en Supabase; se cambió localmente `total` a entero no negativo en la migración, esquema Zod y formulario.
- Acción concreta: conservar el flujo y la migración corregida; la estudiante ejecutará SQL manualmente cuando la revise.
- Prompt donde se trata: P04, P05 y P08; no duplicar el flujo existente.

## F3 — Consulta por escaneo

- Estado actual: `/scan`, consulta por código/nombre, cámara con `@zxing/browser`, entrada manual y enlace para crear un código desconocido desde `/products`.
- Veredicto: **CONSERVAR**
- Razón: el flujo de consulta y la alternativa manual están implementados; el estado mostrado distingue inactivo, agotado y disponible.
- Acción concreta: conservar. Si se amplía, reutilizar `ProductBarcodeCamera`.
- Prompt donde se trata: P06 y P08; verificación sin reconstrucción.

## F4 — Ventas con descuento de stock y alerta

- Estado actual: `/sales`, carrito y cobro de contado, parcial o fiado; `create_sale` valida y bloquea existencias, graba precio/costo por ítem y descuenta stock atómicamente. La interfaz confirma el registro.
- Veredicto: **ENRIQUECER**
- Razón: la venta transaccional y el precio congelado ya existen y se conservan. No se encontró un campo ni una operación de descuento; tampoco una alerta explícita cuando la venta deja stock en cero. La función devuelve número/total, no los códigos que se agotaron.
- Acción concreta: conservar RPC, validaciones, fiados e historial. Acordar si y cómo se desea modelar descuentos y completar la alerta de agotado antes de extender ventas.
- Prompt donde se trata: P02, P04, P05 y P08, después de resolver el conflicto de descuentos.

## F5 — Login

- Estado actual: Supabase Auth en `/login`, verificación de cuenta permitida, middleware de páginas, autorización explícita en rutas API y botón de cierre de sesión. `LoginForm.test.tsx` contiene tres pruebas.
- Veredicto: **CONSERVAR**
- Razón: el mecanismo existente está integrado y probado; el éxito redirige a `/`, no a `/panel`.
- Acción concreta: nada sobre el proveedor o la pantalla de login; respetar la ruta y las pruebas actuales.
- Prompt donde se trata: P03 solo si hace falta una integración compatible; no reescribir.

## Reglas de negocio RN-01 a RN-15

### RN-01 — No vender más que el stock

- Estado actual: `create_sale` bloquea cada producto con `FOR UPDATE`, valida el stock y rechaza la venta si es insuficiente.
- Veredicto: **CONSERVAR**
- Razón: la validación en servidor/BD protege las escrituras concurrentes.
- Acción concreta: conservar la RPC y sus pruebas.
- Prompt donde se trata: P04/P05 (verificación).

### RN-02 — Referencia única por producto + talla + color

- Estado actual: `products` tiene código normalizado único y `variant_group_id`, pero las migraciones no definen unicidad compuesta para la identidad del producto con talla/color. Las pruebas revisadas verifican códigos duplicados, no esa combinación.
- Veredicto: **ENRIQUECER**
- Razón: la integridad pedida no queda garantizada por la base actual. La identidad existente basada en grupo de variantes debe acordarse antes de imponer otra clave.
- Acción concreta: no alterar datos ni agregar constraint en P00; resolver identidad y duplicados con la estudiante.
- Prompt donde se trata: P01/P04, solo tras acuerdo.

### RN-03 — Código desconocido señalado y alta antes de operar

- Estado actual: `/scan` presenta el código no encontrado y enlaza a crear producto con ese código. En `/sales`, una búsqueda sin resultado informa que no existe producto y no agrega un ítem al carrito.
- Veredicto: **CONSERVAR**
- Razón: no se puede vender un producto no registrado y la pantalla de consulta ofrece el alta.
- Acción concreta: nada; conservar el enlace y la validación.
- Prompt donde se trata: P06/P08 (verificación).

### RN-04 — “Agotado” derivado de stock cero

- Estado actual: `products` no tiene estado agotado; `ProductScanner` lo deriva de `stock === 0`.
- Veredicto: **CONSERVAR**
- Razón: el estado no puede discrepar de las existencias mediante una columna editable.
- Acción concreta: mantener el cálculo derivado.
- Prompt donde se trata: P06/P08 (verificación).

### RN-05 — Código único

- Estado actual: `products.normalized_code` se genera normalizado y tiene restricción única; hay validación en la aplicación.
- Veredicto: **CONSERVAR**
- Razón: la base evita duplicados aun con diferencias de espacios o mayúsculas.
- Acción concreta: nada.
- Prompt donde se trata: P01/P04 (verificación).

### RN-06 — Precio de producto entero y positivo

- Estado actual: `sale_price` es `integer` con CHECK positivo; los esquemas validan precio entero positivo.
- Veredicto: **CONSERVAR**
- Razón: producto y ventas satisfacen este formato actualmente.
- Acción concreta: conservar; el total de compras también queda acordado como entero no negativo.
- Prompt donde se trata: P02/P04 (verificación).

### RN-07 — Cantidad de entrada entera positiva

- Estado actual: `create_purchase` exige cantidad positiva entera, bloquea la fila y suma stock.
- Veredicto: **CONSERVAR**
- Razón: la operación de compra valida e incrementa stock en la misma transacción.
- Acción concreta: nada.
- Prompt donde se trata: P04/P05 (verificación).

### RN-08 — Cantidad vendida entera positiva

- Estado actual: el esquema Zod y `create_sale` exigen cantidad entera mayor que cero.
- Veredicto: **CONSERVAR**
- Razón: las validaciones están en interfaz/API y RPC.
- Acción concreta: nada.
- Prompt donde se trata: P02/P05 (verificación).

### RN-09 — Categorías válidas

- Estado actual: migración y esquema restringen a ropa, calzado, bolso y accesorio; el código usa etiquetas en minúscula.
- Veredicto: **CONSERVAR**
- Razón: es la misma lista semántica; la diferencia de capitalización es de representación.
- Acción concreta: preservar los valores existentes.
- Prompt donde se trata: P02/P04 (verificación).

### RN-10 — Entrada suma a referencia existente

- Estado actual: `create_purchase` busca y bloquea el producto identificado por código; aumenta su stock, sin crear otra fila de producto.
- Veredicto: **CONSERVAR**
- Razón: cumple la entrada acumulativa y atómica.
- Acción concreta: nada.
- Prompt donde se trata: P04/P05 (verificación).

### RN-11 — Total por ítems y precio congelado

- Estado actual: `create_sale` calcula el total desde precio vigente × cantidad, copia `sale_price` a `sale_items.unit_price` y conserva `unit_cost`.
- Veredicto: **CONSERVAR**
- Razón: el precio queda registrado como dato del ítem y el total no depende de recalcular el historial desde el producto actual.
- Acción concreta: preservar. El modelo de descuentos requiere acuerdo previo porque cambiaría el cálculo actual.
- Prompt donde se trata: P04/P05 (verificación).

### RN-12 — Descuento de stock dentro de la venta atómica

- Estado actual: `create_sale` valida y bloquea productos, inserta venta/ítems/pago y actualiza stock dentro de una función de base transaccional.
- Veredicto: **CONSERVAR**
- Razón: la operación de escritura se revierte completa si falla.
- Acción concreta: conservar el RPC; no trasladar el descuento a código de página o cliente.
- Prompt donde se trata: P04/P05 (verificación).

### RN-13 — Solo productos activos para vender/disponibilidad

- Estado actual: `create_sale` rechaza productos inactivos; la interfaz de ventas filtra productos activos con stock positivo. La consulta puede mostrar explícitamente “Inactivo”, no como disponible.
- Veredicto: **CONSERVAR**
- Razón: productos inactivos no se venden ni se presentan como disponibles.
- Acción concreta: preservar los filtros y la validación de servidor.
- Prompt donde se trata: P04/P06 (verificación).

### RN-14 — Nombre, talla y color no vacíos

- Estado actual: nombre es obligatorio; talla/color pueden no aplicar en ciertas variantes y las columnas de base permiten cadenas vacías. Hay pruebas explícitas de talla vacía para categorías que no la usan.
- Veredicto: **ENRIQUECER**
- Razón: la regla textual del plan es más estricta que el modelo actual de productos y puede invalidar variantes que el formulario/pruebas consideran válidas.
- Acción concreta: no imponerla automáticamente; decidir si talla vacía es válida para bolso/accesorio y si color siempre debe ser obligatorio.
- Prompt donde se trata: P02/P04, pendiente de decisión.

### RN-15 — No borrar productos; desactivar solo con stock cero

- Estado actual: la rama Supabase desactiva sin condición de stock; la edición permite cambiar `active`; la ruta/el botón permiten borrar definitivamente productos sin movimientos.
- Veredicto: **CAMBIAR**
- Razón: contradice las dos partes de la regla: stock cero como requisito de desactivación y conservación histórica sin borrado.
- Acción concreta: acordar y luego aplicar una protección coherente en interfaz, servicio/API y base. No se cambia en P00.
- Prompt donde se trata: P04/P05/P07, después de confirmación de la estudiante.

## Funcionalidades construidas que se conservan

Estas áreas ya están construidas y cuentan con código/pruebas; quedan fuera de cualquier propuesta de reescritura:

| Área | Estado / evidencia |
|---|---|
| Clientes | CRUD Supabase, autorización de tratamiento, búsqueda y pruebas de esquemas/repositorio. |
| Proveedores | Gestión y persistencia Supabase; se conserva junto con las compras. |
| Comprobantes | Tokens almacenados como hash, enlaces revocables, consulta pública limitada, impresión y envío por WhatsApp; RPC y pruebas. |
| Compras | Entrada atómica por RPC y tests; se conserva. |
| Fiados/abonos | Tipos `cash`/`credit`/`partial`, clientes obligatorios cuando aplica y tabla `sale_payments`; se conserva. |
| Etiquetas | `ProductLabelPrint`, código Code 128 e impresión, con prueba; se conserva. |

Reportes/métricas (`/reports`) está todavía en construcción; es una ampliación pendiente, no motivo para sustituir los módulos existentes.

## Resumen

| Elemento | Veredicto | Prompt / tratamiento |
|---|---|---|
| F1 Productos | ENRIQUECER | P04/P05/P07, sujeto a decisiones RN-02/RN-15 |
| F2 Compras/entradas | CONSERVAR | P04/P05/P08: verificar y reutilizar |
| F3 Consulta por escaneo | CONSERVAR | P06/P08: verificar y reutilizar |
| F4 Ventas | ENRIQUECER | P02/P04/P05/P08: acordar descuento y alerta |
| F5 Login | CONSERVAR | P03 solo adaptación compatible |
| RN-01 | CONSERVAR | P04/P05 |
| RN-02 | ENRIQUECER | P01/P04, sujeto a decisión |
| RN-03 | CONSERVAR | P06/P08 |
| RN-04 | CONSERVAR | P06/P08 |
| RN-05 | CONSERVAR | P01/P04 |
| RN-06 | CONSERVAR | P02/P04 |
| RN-07 | CONSERVAR | P04/P05 |
| RN-08 | CONSERVAR | P02/P05 |
| RN-09 | CONSERVAR | P02/P04 |
| RN-10 | CONSERVAR | P04/P05 |
| RN-11 | CONSERVAR | P04/P05; descuentos pendientes |
| RN-12 | CONSERVAR | P04/P05 |
| RN-13 | CONSERVAR | P04/P06 |
| RN-14 | ENRIQUECER | P02/P04, sujeto a decisión |
| RN-15 | CAMBIAR | P04/P05/P07, sujeto a confirmación |

## Decisiones acordadas después de P00

1. **RN-15:** no borrar productos; desactivar solamente con stock cero. Si hay existencias, el servidor y la base deben rechazar con `PRODUCTO_CON_EXISTENCIAS` (409); el campo activo no se edita libremente.
2. **RN-02:** la clave es nombre normalizado + talla normalizada + color normalizado; los códigos siguen siendo únicos por separado. La estudiante informa que la consulta de solo lectura no encontró combinaciones repetidas. La regla aún no está implementada.
3. **Dinero de compras:** `purchases.total` es entero mayor o igual a cero en todas las capas. La tabla remota no existe según el error `42P01`; la migración existente se corrigió localmente y no se ejecutó.
4. **RN-14:** nombre, talla y color obligatorios siempre; la regla aún no está implementada en la validación/base.
5. **Alerta de agotado:** añadir alerta cuando una venta deje stock en cero.

## Conflictos aún pendientes con la estudiante antes de P01

1. **Descuentos en ventas:** se acordó agregarlos, pero falta definir regla y cálculo antes de modificar el flujo o esquema; actualmente no están modelados.

Las decisiones anteriores no autorizan aplicar SQL. Los módulos de clientes, compras, proveedores, comprobantes, fiados y etiquetas se conservan independientemente del plan.
