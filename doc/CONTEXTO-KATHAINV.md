# KathaInv: contexto para Copilot

Lee este archivo completo antes de hacer cualquier cambio. Es la fuente de verdad del proyecto.

## 1. Qué es KathaInv

Sistema web de inventario y ventas para un almacén de ropa, calzado, bolsos y accesorios femeninos. Lo usa **una sola persona (la dueña), principalmente desde el celular**, escaneando códigos de barras o QR con la cámara.

Hoy no existe ningún registro: todo se sabe de memoria. KathaInv debe resolver tres cosas: identificar rápido cada producto, saber qué hay disponible y avisar antes de que algo se agote sin que nadie lo note.

## 2. Reglas de trabajo para Copilot

1. Haz **solo la tarea que te pida el usuario**. No avances a otras tareas ni toques archivos que no tengan que ver.
2. Antes de escribir código, dime en 2 o 3 líneas qué vas a crear o cambiar.
3. Al terminar, explícame en palabras simples qué hiciste. Soy estudiante de Ingeniería Industrial y necesito entenderlo.
4. No inventes funciones fuera del alcance de la sección 6.
5. Después de cada tarea corre `npm run type-check`, `npm run lint` y `npm run test`, y corrige lo que falle.
6. No toques ni muestres el contenido de `.env.local`. Nunca pongas claves secretas en el código.
7. La interfaz va **en español** y se diseña **primero para pantalla de celular** (botones grandes, pocas cosas por pantalla).
8. Un commit por tarea. El mensaje nombra la tarea, por ejemplo: `Tarea 1.1: tipos base del motor`.

## 3. Tecnologías (ya instaladas)

Next.js 15 (App Router, carpeta `src/`), React 19, TypeScript en modo estricto, Tailwind CSS, Zod, Framer Motion, Vitest con Testing Library, ESLint y Prettier. Despliegue en Vercel (`https://kathainv.vercel.app`).

Alias de importación: `@/*` apunta a `src/*`.

## 4. Datos que se guardan

Los datos viven en archivos JSON dentro de `data/`, uno por colección. Cada archivo tiene `_meta` y `records`. Cada registro tiene `id`, `createdAt` y `updatedAt`.

| Colección | Archivo | Campos propios |
|---|---|---|
| Producto/variante | `data/product.json` | `code` (único, interno o de fábrica), `codeType`, `variantGroupId`, `name`, `category`, `size`, `color`, `costPrice` y `salePrice` (pesos colombianos enteros), `stock`, `minStock`, `active` |
| Proveedor | `data/supplier.json` | `name` |
| Compra | `data/purchase.json` | `productCode`, `supplierId`, `quantity` (entero), `total` (decimal), `date` |
| Venta | `data/sale.json` | `productCode`, `quantity` (entero), `total` (decimal), `date` |

Los esquemas Zod van en `data/_schema/` y se registran en `data/_schema/registry.ts`.

## 5. Reglas del negocio

- **No se puede vender más cantidad de la que hay disponible.** La venta se bloquea con un mensaje claro.
- Cuando el `stock` de un producto llega a cero, el sistema **avisa que está agotado**.
- **Cada combinación de producto, talla y color tiene su propio código y su propio stock.** El `code` es la llave única.
- Las variantes de un modelo comparten `variantGroupId`; cada una conserva su código, precio y existencias.
- Si no se entrega un código de fábrica, la aplicación genera un consecutivo interno `KAT-000001`, `KAT-000002`, etc. Los números generados no se reutilizan tras eliminar productos. Los códigos se comparan ignorando espacios y mayúsculas/minúsculas.
- Los productos con movimientos se desactivan para conservar el historial; solo se permite el borrado definitivo si nunca tuvieron movimientos.
- El costo de compra, el precio de venta y otros importes de producto se guardan como pesos colombianos enteros, sin centavos; la interfaz los presenta con formato `es-CO`.
- Si se escanea un código que no existe, **primero se registra como producto nuevo**, con el código ya llenado en el formulario. No se puede vender ni consultar antes.
- Una compra a proveedor **suma** al `stock`. Una venta **resta**.
- Todo pago a proveedores es de contado, así que no se manejan deudas.

## Fiados y abonos

Requisitos para las tareas 3.3 y 3.4:

- En cada venta se elige el tipo de pago: **contado**, **fiado** o **pago parcial**. El pago parcial registra el monto pagado. Para fiar o registrar un pago parcial, el cliente debe estar registrado.
- Un **abono** es un pago que el cliente hace después para reducir su deuda. Cada abono guarda fecha, monto y una nota opcional. El monto no puede superar el saldo pendiente. Los abonos se pueden anular, pero no borrar.
- El saldo del cliente se calcula a partir de las ventas fiadas menos los abonos; nunca se escribe ni se ajusta a mano.
- La ficha del cliente muestra **“Al día”** o **“Debe $X”**, junto con el detalle de ventas fiadas, abonos y saldo.
- Hay un listado de **“Quién me debe”**, ordenado de mayor a menor deuda.
- El botón **“Recordar por WhatsApp”** abre un enlace `wa.me` con un mensaje amable que incluye el saldo. La persona envía el mensaje manualmente; no hay envío automático.
- Los datos de clientes y deudas solo son visibles para los correos incluidos en `ALLOWED_EMAILS`.
- Antes de usar el sistema con deudas reales, los datos deben guardarse en Supabase (Fase 4), porque Vercel no permite escribir en los archivos JSON.

## 6. Alcance

**Sí incluye:**

1. Registrar productos escaneando su código.
2. Registrar compras a proveedor.
3. Consultar precio y disponibilidad escaneando.
4. Registrar ventas escaneando, con descuento automático y aviso de agotado.
5. Ver los productos más y menos vendidos en un rango de fechas.
6. Iniciar sesión, registrarse y cambiar la contraseña con Supabase Auth. Esta es una desviación explícita de la Tarea 3.3 del plan, que propone JWT y `user.json`: Supabase ya está activo en Vercel y los archivos JSON son de solo lectura en producción (sección 9), por lo que guardar usuarios ahí impediría el registro en el despliegue. El acceso a páginas y API de datos se limita en el servidor a correos confirmados incluidos en `ALLOWED_EMAILS`; la lista se compara sin espacios y sin distinguir mayúsculas.

**No incluye:** facturación electrónica, varias sucursales, ventas por internet, impuestos, deudas con proveedores, fotos de productos ni impresión de etiquetas.

La implementación de productos protege las páginas y API con la validación del usuario confirmado y `ALLOWED_EMAILS`. La API responde 401 sin sesión y 403 para cuentas no autorizadas. El acceso a datos se concentra en el módulo de productos para facilitar el cambio de JSON a Supabase en la Fase 4. En `/scan`, la pistola lectora, el ingreso manual y la cámara comparten la búsqueda por código; la cámara se apaga al salir y la búsqueda por nombre sirve como alternativa si la etiqueta está dañada.

**Pendientes por confirmar (no los implementes todavía):** descuentos o rebajas, y una cantidad mínima que avise antes de llegar a cero.

## 7. Pantallas previstas

| Ruta | Para qué sirve |
|---|---|
| `/` | Inicio con accesos rápidos |
| `/login` | Iniciar sesión |
| `/register` | Registrarse |
| `/account` | Cambiar la contraseña |
| `/products` | Lista, búsqueda, creación, edición, desactivación y eliminación permitida de productos y variantes |
| `/scan` | Consultar un producto por código manual, pistola lectora o cámara; buscar por nombre y ofrecer registrar códigos desconocidos |
| `/purchases` | Registrar compras a proveedor |
| `/sales` | Registrar ventas escaneando |
| `/reports` | Más y menos vendidos por fechas |
| `/api/health` | Estado del sistema (debe responder `status: ok`) |

## 8. Organización del código

```
src/
  app/            rutas y API (App Router)
  components/ui/  componentes base reutilizables
  lib/            motor json-db, tipos, utilidades
  modules/        un módulo por tema: products, purchases, sales, reports
    <modulo>/
      types.ts
      service.ts
      components/
      __tests__/
data/             colecciones JSON y esquemas Zod
doc/              documentación
```

Cada módulo guarda y lee datos **solo a través de `src/lib/json-db.ts`**, nunca leyendo archivos directamente.

## 9. Limitación importante de producción

En Vercel los archivos del proyecto son de solo lectura, así que escribir en `data/*.json` **no funciona en producción**. En local sí. La solución definitiva (un adaptador de almacenamiento) se hace en la Fase 4 y se elige con el profe. Mientras tanto, el motor lanza un error claro si se intenta escribir en producción.

## 10. Fases

| Fase | Qué se construye |
|---|---|
| 0 | Proyecto base, `/api/health`, despliegue y CI funcionando |
| 1 | Motor de datos: tipos, `json-db.ts`, esquemas Zod, API genérica, tests |
| 2 | Interfaz: componentes base, tema claro y oscuro, menú pensado para celular |
| 3 | Productos, escáner, compras, ventas, reportes y protección de acceso |
| 4 | Persistencia real en producción, rendimiento, documentación y versión 1.0 |

No se pasa a la siguiente fase hasta cumplir todos los criterios de la actual. La guía detallada del profe está en `guia-construccion-por-fases.md`.
