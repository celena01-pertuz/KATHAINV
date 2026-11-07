# KATHAINV · Instrucciones para Copilot

## Documentos rectores

- Plan de referencia: `doc/PLAN_KATHAINV.md`.
- Estado real del repositorio: `doc/ESTADO_ACTUAL.md`.
- Dictamen de reconciliación: `doc/DICTAMEN.md`. Antes de modificar una funcionalidad, revisa su veredicto y conserva lo que ya funciona.
- Avance: `doc/ESTADO_EJECUCION.md`.

## Forma de trabajo

- Trabaja una tarea a la vez; termina y verifica esa tarea antes de empezar otra.
- No hagas commit hasta que la estudiante lo confirme explícitamente.
- Usa mensajes de commit convencionales cuando ella autorice un commit.
- Para build, pruebas, tipos y lint, usa `npm.cmd`, un comando por vez y con el servidor de desarrollo apagado.
- Nunca incluyas, abras ni muestres `.env.local` o `data/product.json` en respuestas, diffs o commits.
- No muestres valores de claves ni secretos. En documentación, registra únicamente nombres de variables cuando sea necesario.
- No ejecutes SQL. La estudiante revisa y ejecuta las migraciones manualmente en Supabase.

## Arquitectura real

- Next.js App Router, TypeScript, Tailwind y Vitest; el código de aplicación vive en `src/`.
- Las rutas reales incluyen `/products`, `/sales`, `/customers`, `/purchases`, `/scan`, `/receipt/[token]` y `/reports`.
- Los módulos de dominio están en inglés bajo `src/modules/`.
- Persistencia principal con Supabase. Usa el cliente administrativo de `src/lib/supabase/admin.ts` en código de servidor y las RPC existentes, como `create_sale`, `create_purchase`, `create_receipt_link`, `revoke_receipt_links` y `get_public_receipt`, según el dominio.
- No introduzcas `pg`, conexión directa a Postgres, `lib/datos/`, `lib/reglas/`, `exigirSesion` ni rutas `/panel` sin decisión explícita de la estudiante.
- Productos conserva un selector con repositorio JSON heredado; no cambies backend ni datos de forma implícita.
- Los endpoints API verifican autorización en servidor. Respeta las comprobaciones existentes con `getServerAccessStatus`; el middleware de páginas no sustituye la autorización API.
- Las migraciones en `supabase/migrations/` son manuales. No las apliques ni ejecutes consultas.

## Reglas de integridad

- Antes de proponer una regla nueva o cambiar un esquema, verifica el estado actual y consulta `doc/DICTAMEN.md`.
- Conserva las operaciones atómicas existentes de venta y compra, la protección contra stock negativo y el precio/costo copiados a cada ítem de venta.
- Los totales de compra son pesos colombianos enteros mayores o iguales a cero en BD, RPC, Zod y formulario.
- “Agotado” se deriva del stock; no agregues un estado editable que pueda contradecirlo.
- Las decisiones de unicidad de variantes y RN-14/RN-15 ya están confirmadas por la estudiante, pero su implementación requiere tareas posteriores. La regla de descuentos todavía debe definirse; no la inventes ni la apliques unilateralmente.

## Verificación

- Ejecuta solo la verificación pertinente, secuencialmente con `npm.cmd` y el servidor apagado.
- No corrijas fallas ajenas a la tarea ni alteres dependencias/configuración sin autorización.
- Actualiza `doc/ESTADO_EJECUCION.md` al cerrar cada tarea.
