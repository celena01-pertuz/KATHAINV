# Fase 0 · Auditoría completada

## Verificación

| Comando | Resultado |
|---|---|
| `npm.cmd run build` | Correcto |
| `npm.cmd test` | Correcto: 40 archivos, 144 pruebas |
| `npm.cmd run type-check` | Correcto |
| `npm.cmd run lint` | Correcto, sin errores ni warnings de ESLint; `next lint` anuncia obsolescencia futura |

`node_modules` ya existía. No se inició un servidor. Las verificaciones se ejecutaron una por una. Durante la auditoría P00 no se modificaron código, configuración o dependencias. En el seguimiento autorizado del conflicto de compras, se corrigió localmente la migración existente y las capas de aplicación; no se aplicó SQL.

## Persistencia actual

La aplicación usa Supabase Postgres desde el cliente servidor `SUPABASE_SECRET_KEY`, con RPC transaccionales como `create_sale` y `create_purchase`, además de lecturas/escrituras Supabase por módulo. No hay conexión directa con `pg`. Los JSON presentes y el adaptador JSON heredado no se consideran prueba de cuál backend está configurado; no se inspeccionó `.env.local`. No hubo conexión a la base ni ejecución SQL; las tablas se dedujeron exclusivamente de las migraciones locales.

## Resumen del dictamen

- Funcionalidades MVP F1–F5: **3 CONSERVAR, 2 ENRIQUECER, 0 CAMBIAR**.
- Reglas RN-01–RN-15: **12 CONSERVAR, 2 ENRIQUECER, 1 CAMBIAR**.
- Se conservan también clientes, compras, proveedores, comprobantes, fiados/abonos y etiquetas.

## Conflictos pendientes con la estudiante

1. Descuentos de venta: se acordó agregarlos, pero falta definir la regla y el cálculo.

Decisiones ya confirmadas: RN-15 (sin borrado y desactivación solo con stock cero), RN-02 (nombre+talla+color normalizados; la estudiante informa sin duplicados), compras en pesos enteros no negativos (la estudiante informó `42P01` para `public.purchases`; se corrigió localmente la migración sin aplicarla), RN-14 (nombre, talla y color siempre obligatorios) y alerta al llegar a stock cero.

No se inicia el siguiente conflicto hasta que la estudiante defina los descuentos. Ningún SQL se ejecutó.
