# KATHAINV · Estado de ejecución

Los prompts P01–P09 permanecen pendientes. P00 queda completado con la auditoría y artefactos indicados abajo.

| Prompt | Fase | Estado | Evidencia |
|---|---|---|---|
| P00 | Auditoría y reconciliación | Completado | `ESTADO_ACTUAL.md`, `DICTAMEN.md`, instrucciones Copilot y cierre de fase; build, test (40 archivos, 144 pruebas), type-check y lint correctos. |
| P01 | Base de datos | Pendiente | — |
| P02 | Reglas | Pendiente | — |
| P03 | Servidor y sesión | Pendiente | — |
| P04 | Datos y API | Pendiente | — |
| P05 | Datos y API | Pendiente | — |
| P06 | Interfaz | Pendiente | — |
| P07 | Interfaz | Pendiente | — |
| P08 | Interfaz y aceptación | Pendiente | — |
| P09 | Opcionales | Pendiente | — |

## Bitácora

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

- RN-14: implementación local en `20261107010000_products_required_attributes.sql`, Zod para creación/edición, formulario, pruebas Vitest y `supabase/tests/products_required_attributes_smoke_test.sql`. El formulario exige talla/color y ofrece **“Única”** para bolsos y accesorios. La consulta de solo lectura devolvió cero filas. No se ejecutó SQL ni se aplicó la migración.
- Alerta de agotado (CU-06): al registrar una venta, la respuesta identificará las referencias que quedaron en cero y la pantalla lo avisará. Se implementará con la tarea de ventas, no ahora.
- Descuentos: se agregarán; regla pendiente de definir con el profesor. No modificar `create_sale`, comprobantes, fiados ni reportes antes de acordarla.
- La estudiante confirmó que la migración de compras ya está aplicada y verificada en Supabase, y que pasó el smoke test. El script de acceso público se amplió para revisar `suppliers`, `purchases` y `create_purchase`; su ejecución dio 13 comprobaciones OK y ninguna fallida.
- El último type-check, lint, test y build finalizaron correctamente; Vitest reportó 153 pruebas en 41 archivos.
