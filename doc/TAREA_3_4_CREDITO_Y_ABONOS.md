# Tarea 3.4: ventas a crédito, abonos y cartera de clientes

Esta tarea reemplaza cualquier instrucción anterior sobre fiados, pagos parciales y abonos. Se hace de CORRIDO, en una sola pasada: diseño e implementación, sin esperar mi aprobación intermedia.

## Proceso

- Lee `doc/CONTEXTO-KATHAINV.md`, `doc/ESTADO_EJECUCION.md`, `doc/DICTAMEN.md`, mi plan (`plan-implementacion-fases-ts-fullstack.md`) y TODAS las migraciones de `supabase/migrations` (sobre todo ventas, `sale_payments` y comprobantes).
- Dime primero qué número de tarea le corresponde en MI plan (Tarea 3.4) y úsalo.
- Solo DETENTE y pregúntame si:
  - (a) "A crédito" no se puede mapear a los tipos que `create_sale` ya acepta sin tocarla;
  - (b) necesitas CAMBIAR una función o tabla existente (aparte de `get_public_receipt` con `CREATE OR REPLACE`);
  - (c) algo de este archivo se contradice con el código real.
- NO toques anulación de ventas, descuentos, compras ni reportes.
- NO ejecutes SQL. NO hagas commit hasta que yo escriba CONFIRMADO. NO muestres `.env.local`.
- Interfaz en español, zonas táctiles de 44 px, etiquetas y foco visibles, tokens de color existentes, temas claro y oscuro.

## ENTREGA al terminar (todo en UN solo mensaje)

1. El diseño en máximo 15 líneas: cómo guardas los abonos (¿reutilizas `sale_payments` con un grupo de abono o una tabla nueva?, ¿por qué?), el reparto, la anulación, el cálculo del saldo individual y el de toda la lista, el comprobante y la propuesta de saldo inicial con sus riesgos.
2. La migración y el smoke test COMPLETOS, en el chat y no como enlaces.
3. Resultados de `type-check`, `lint`, `test` y `build`, uno por uno con `npm.cmd` y con el servidor apagado.
4. Una lista de qué debo probar yo en pantalla.

## 1. Formas de pago en /sales (reemplazan contado, fiado y parcial)

Solo DOS opciones:
- "De contado": paga el total hoy, con su medio de pago.
- "A crédito": exige un cliente. Aparece el campo "¿Cuánto paga hoy?" (pesos enteros, empieza en $0, teclado numérico, formato es-CO, menor que el total) y el medio de pago de ese pago inicial (solo si es mayor que 0). El resumen muestra "Paga hoy", "Saldo pendiente" y el total.
- Si "Paga hoy" es igual al total, trátalo como contado con un aviso; si es mayor, recházalo con un mensaje claro.

Sin cambiar la base: mapea a los valores internos que `create_sale` ya acepta, decidiendo en el servidor: pago hoy = 0 es el tipo de crédito/fiado existente; pago hoy mayor que 0 y menor que el total es el tipo parcial existente; contado es el de contado. Verifica en la migración de ventas que `create_sale` lo permita así.

NO se editan ventas ni pagos ya registrados. Los pagos posteriores se registran como abonos; un abono equivocado se anula con motivo. No agregues botones de editar pagos.

## 2. Reglas de negocio de los abonos

1. Un abono es de un cliente y se reparte automáticamente a sus deudas, de la MÁS ANTIGUA a la más nueva (por fecha de venta y luego por id), solo en ventas activas con saldo.
2. Pesos enteros, mayor que 0, y no puede superar la deuda total del cliente.
3. El saldo SIEMPRE se calcula (total de la venta menos pagos no anulados); nunca se guarda.
4. Un abono NO se borra: se anula, con motivo obligatorio, y la deuda vuelve. Las filas no se pueden borrar ni cambiar de monto.
5. Idempotencia con `request_key`, y quién registra o anula sale de la sesión verificada (`created_by`, `voided_by`), nunca del navegador.
6. Concurrencia: dos abonos simultáneos del mismo cliente no pueden pasarse de la deuda (bloquea las filas necesarias).
7. El comprobante público ya muestra pagado y saldo: debe reflejar los abonos y excluir los anulados.

## 3. Pantalla Clientes: cartera

- Cada cliente muestra una etiqueta calculada (nunca guardada): "Saldo pendiente $X" con "Pendiente hace N días" (de la deuda más antigua) o "Al día".
- Filtros: Todos, Con saldo, Al día. Arriba, el "Total por cobrar".
- El saldo de toda la lista se calcula con UNA sola consulta o función agregada, sin una consulta por cliente.
- Un cliente inactivo con saldo sigue apareciendo en "Con saldo", con una etiqueta de inactivo, y se le puede abonar.
- Detalle del cliente: resumen "Saldo pendiente $X" o "Al día"; ventas con saldo (número, fecha, total, pagado y saldo); historial de abonos con "Anular" (pide motivo y confirmación); y botones:
  - "Registrar abono" (solo si hay saldo): monto con teclado numérico y formato es-CO, medio de pago, nota opcional.
  - "Nueva venta a crédito": lleva a /sales con el cliente ya elegido y "A crédito" seleccionado, mediante un parámetro de URL (por ejemplo `?customerId=`). La pantalla de ventas debe validarlo: el cliente debe existir y estar activo; si no, lo ignora sin error. Nunca uses el parámetro para decidir permisos.
  - "Enviar recordatorio" (solo si hay saldo y teléfono válido): enlace `wa.me` manual con 57 + 10 dígitos y el mensaje "Hola [nombre], te escribimos de Katha Store. Tu saldo pendiente es de $X. ¡Gracias por tu pago!". Sin envío automático.
- NO crees una marca manual de "debe/no debe" ni deudas sin venta: el estado se deriva SIEMPRE de ventas y abonos.
- Desde pantallas medianas: lista a la izquierda y detalle a la derecha; en celular, una columna. "Saldo pendiente" usa el color de advertencia, no el de error.

## 4. Vocabulario (solo textos visibles; no cambies valores internos, funciones, columnas ni rutas)

Aplícalo en pantallas, errores, pruebas, comprobante y WhatsApp, centralizado en UN solo archivo de constantes:
- "Debe $X" pasa a "Saldo pendiente $X"; "No debe" pasa a "Al día".
- "Quién me debe" pasa a "Cartera"; "Total por cobrar" se queda.
- "Venta fiada" y "Fiado" pasan a "Venta a crédito" y "A crédito". "Pago parcial" desaparece como opción.
- "Abonar" pasa a "Registrar abono"; "Recordar por WhatsApp" pasa a "Enviar recordatorio".
- "Días de atraso" pasa a "Pendiente hace N días" (no existen fechas de vencimiento).
- Nunca uses las palabras "deudor", "deudora" ni "moroso".
- El comprobante público ya dice "Al día" y "Saldo pendiente $X": no lo cambies si es así.
- Las pruebas existentes de ventas y comprobantes deben seguir pasando; ajusta solo textos y avísame cuáles cambiaste.

## 5. Saldo inicial (solo propuesta)

Evalúa, SIN implementar, una opción de "saldo inicial / deuda anterior" para clientas con deuda previa al sistema: cómo se modelaría sin romper la regla de que el saldo se calcula, y qué riesgos tiene.

## 6. Base de datos (migración NUEVA)

- No edites migraciones ya aplicadas.
- Funciones `SECURITY DEFINER` con `search_path` vacío, `REVOKE` a PUBLIC, anon y authenticated, y `EXECUTE` solo para `service_role`.
- RLS activo y forzado sin políticas; `service_role` solo SELECT en las tablas.
- Triggers que impidan borrar y cambiar montos.
- Si cambias `get_public_receipt`, usa `CREATE OR REPLACE`, repite `REVOKE`/`GRANT` y muéstrame el diff.
- Smoke test en `supabase/tests` (`BEGIN` ... `ROLLBACK`): reparto a la deuda más antigua en dos ventas, rechazo si se pasa de la deuda, anular devuelve la deuda, idempotencia por `request_key`, y que no se puede borrar.
- Agrega las tablas y funciones nuevas a `scripts/check-supabase-public-access.mjs`.

## 7. App y pruebas

Servicio, API con 401/403 y Zod, y pruebas Vitest: crédito sin cliente rechazado; paga hoy 0, parcial, igual al total y mayor que el total; el resumen muestra el saldo; el mapeo a los tipos internos; el comprobante muestra pagado y saldo correctos; la cartera y sus filtros; el recordatorio de WhatsApp con 57 + 10 dígitos; y el parámetro `customerId` validado.

## CUANDO YO ESCRIBA "APLICADA"

Significa que la migración ya está en Supabase y su smoke test pasó. Haz, en este orden:
1. Ejecuta `scripts/check-supabase-public-access.mjs` con el servidor apagado y dime cuántas comprobaciones salen OK, sin mostrar claves.
2. Arranca el servidor en el puerto 3000 y dame el enlace.

## CUANDO YO ESCRIBA "CONFIRMADO"

1. Apaga el servidor y muéstrame `git status`.
2. Haz UN commit con todos los archivos de esta tarea (incluido este archivo `doc/TAREA_3_4_CREDITO_Y_ABONOS.md` y los documentos actualizados), sin `data/product.json` ni `.env.local`. Mensaje: `feat(customers): ventas a crédito, abonos y cartera de clientes (3.4)`
3. No hagas push. Muéstrame `git status` y `git log --oneline -3`.