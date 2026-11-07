# KATHAINV · Plan técnico de implementación

> Sistema de Control de Inventario y Ventas por escaneo · versión técnica 1.0, derivada del plan funcional de Celena Charith Pertuz Bustamante (versión 2)
> Asignatura: Lógica y Programación (SIST0200) · Universidad Sergio Arboleda, Santa Marta · Docente: Jhonatan Castro Polo
> Stack: Next.js (App Router) + TypeScript + Tailwind CSS + Supabase Postgres · Despliegue en Vercel
> Ejecución: GitHub Copilot en modo Agente, con los prompts de `doc/PROMPTS_KATHAINV.md`

---

## Índice

0. [Cómo se usa este documento](#0-cómo-se-usa-este-documento)
1. [Punto de partida](#1-punto-de-partida)
2. [Alcance](#2-alcance)
3. [Acceso](#3-acceso)
4. [Estados del producto](#4-estados-del-producto)
5. [Reglas de negocio](#5-reglas-de-negocio)
6. [Casos de uso](#6-casos-de-uso)
7. [Modelo de datos](#7-modelo-de-datos)
8. [El escaneo por cámara](#8-el-escaneo-por-cámara)
9. [Arquitectura del código](#9-arquitectura-del-código)
10. [Contratos de API](#10-contratos-de-api)
11. [Pantallas](#11-pantallas)
12. [Identidad visual](#12-identidad-visual)
13. [Dinero, fechas y zona horaria](#13-dinero-fechas-y-zona-horaria)
14. [Seguridad e integridad](#14-seguridad-e-integridad)
15. [Pruebas](#15-pruebas)
16. [Plan de ejecución](#16-plan-de-ejecución)
17. [Funcionalidades opcionales](#17-funcionalidades-opcionales)
18. [Glosario](#18-glosario)

---

## 0. Cómo se usa este documento

Este plan es el documento rector del proyecto. Copilot lo lee antes de cada tarea y los prompts remiten a sus secciones por número. Si un prompt y este plan no coinciden, prevalece el plan.

El proyecto KATHAINV **ya está desplegado y funcionando**, y la estudiante ya avanzó bastante construyéndolo (con ayuda de un asistente). Por eso este plan **no se impone**: es una referencia contra la cual medir lo ya hecho. P00 es un prompt de **auditoría y reconciliación**: Copilot compara el código real del repositorio contra este plan y produce un dictamen razonado, funcionalidad por funcionalidad, de qué **conservar** tal cual (lo que ya cumple), qué **enriquecer** (lo que está pero le falta una regla, una prueba o una validación) y qué **cambiar** (lo que contradice una regla de negocio o la integridad de los datos). Ese dictamen, no este plan a ciegas, es lo que guía los prompts siguientes: cada uno empieza releyendo `doc/ESTADO_ACTUAL.md` y la decisión de P00, y adapta lo que exista en vez de reescribirlo. Cuando el código de la estudiante y el plan difieren solo en forma (nombres, organización) y el código ya es correcto y probado, **gana el código de la estudiante** y el plan se anota como cumplido. El plan solo prevalece cuando hay una regla de negocio, una validación o una garantía de integridad en juego.

| Archivo en el repositorio | Función |
|---|---|
| `doc/PLAN_KATHAINV.md` | Este documento |
| `doc/PROMPTS_KATHAINV.md` | Prompts en orden de ejecución |
| `doc/ESTADO_ACTUAL.md` | Radiografía del repositorio antes de empezar (lo crea P00) |
| `doc/DICTAMEN.md` | Veredicto de P00 por funcionalidad: conservar, enriquecer o cambiar, con su razón |
| `doc/ESTADO_EJECUCION.md` | Avance prompt por prompt |
| `doc/checkpoints/FASE_N_COMPLETADA.md` | Evidencia del cierre de cada fase |
| `.github/copilot-instructions.md` | Reglas permanentes que Copilot aplica en todas las conversaciones |

---

## 1. Punto de partida

### 1.1 Lo que ya existe (según el plan funcional) y no se reconstruye desde cero

- Proyecto Next.js 15 (App Router) con TypeScript y Tailwind, desplegado en Vercel.
- Login funcionando en `/login`, con una prueba (`LoginForm.test.tsx`) y Vitest configurado.
- Despliegue continuo desde GitHub (rama `main`).

El trabajo de estos prompts es: llevar los datos a Supabase Postgres (si hoy están en memoria o en el navegador), separar la lógica en capas probables, formalizar las reglas de negocio con pruebas, y cerrar las funcionalidades del MVP (productos, entradas, escaneo, ventas) con una aceptación. Lo ya hecho se adapta, no se bota.

### 1.2 Lo que se verifica en P00 antes de escribir código

| Aspecto | Por qué importa |
|---|---|
| Dónde viven hoy los datos (Supabase, LocalStorage, memoria, un JSON) | Define cuánto hay que migrar a Postgres en P01 y P04 |
| Mecanismo del login (Supabase Auth, JWT propio, u otro) y el test existente | El adaptador `lib/auth/sesion.ts` lo envuelve sin romper `LoginForm.test.tsx` |
| Ruta a la que redirige el login | Debe llevar al panel (se confirma su nombre; este plan usa `/panel`) |
| Si ya existen tablas, componentes o rutas de productos y ventas | Para adaptarlos en vez de duplicarlos |
| Variable de conexión directa a Postgres | Las ventas y entradas usan transacciones con `pg`; si no existe, se obtiene en P00 |
| Mecanismo de migraciones existente | Las tablas se aplican con ese mecanismo; si no existe, se crea `npm run db:migrar` |
| Versión de Tailwind | Define dónde se declaran los colores (sección 12) |
| Librería de escaneo ya usada (si hay) | Para reutilizarla en vez de agregar otra |

### 1.3 Regla sobre el login

El login existente no se reescribe ni se rompe su prueba. Solo se agrega el adaptador `lib/auth/sesion.ts` (`obtenerSesion`, `exigirSesion`), la protección de las rutas del panel y de `/api/*` del inventario, y se confirma que la redirección posterior al login lleva al panel. El sistema es de un solo usuario (la administradora), sin roles; cualquier sesión válida tiene acceso completo, como define el plan funcional (los roles quedan en el roadmap).

---

## 2. Alcance

### 2.1 Módulo mínimo (el MVP del plan funcional)

| ID | Funcionalidad (plan funcional) | Casos de uso | Prompts |
|---|---|---|---|
| F1 | Gestión de productos (alta con categoría, talla, color, precio, stock y código) | CU-01, CU-02 | P04, P05, P07 |
| F2 | Registro de entradas (compras): suma unidades al inventario | CU-03 | P04, P05, P08 |
| F3 | Consulta rápida por escaneo (muestra nombre, talla, color, precio, stock) | CU-04 | P06, P08 |
| F4 | Registro de ventas por escaneo: descuenta inventario y alerta al llegar a 0 | CU-05, CU-06 | P02, P04, P05, P08 |
| F5 | Autenticación de la administradora (`/login`) | CU-07 | ya existe; P03 lo envuelve |

### 2.2 Funcionalidades opcionales (del roadmap del plan)

| ID | Funcionalidad | Prompts |
|---|---|---|
| F6 | Métricas de rotación: productos más y menos vendidos en un periodo | P09 |
| F7 | Generación e impresión de etiquetas con código del producto | P09 |

Del roadmap del plan, las métricas de rotación (resuelve el problema 3 del diagnóstico: "no se identifican los productos de alta y baja rotación") y las etiquetas son las más cercanas al MVP y las que mejor cierran el ciclo. Múltiples sucursales, roles y tienda virtual quedan fuera (sección 2.3). Se construyen solo con la fase 5 cerrada.

### 2.3 Fuera de alcance

Se mantiene el roadmap del plan como trabajo futuro, no incluido: gestión de múltiples sucursales, usuarios concurrentes con roles (cajero, bodega), y tienda virtual / e-commerce.

### 2.4 Decisiones de alcance de esta versión técnica

| Decisión | Motivo |
|---|---|
| Los datos viven en Supabase Postgres | Para que persistan de verdad en producción, no en el navegador; es el estándar del curso |
| Precios y montos en pesos enteros | El peso colombiano no usa centavos; evita errores de redondeo en el total de la venta |
| La referencia única es Producto + Talla + Color, con su propio código y su propio stock | Regla 2 del plan: cada combinación es una referencia independiente |
| El estado "Agotado" se deriva del stock (stock = 0), no es un campo que se edite a mano | Regla 4 del plan; evita que estado y stock se contradigan |
| El escaneo es una comodidad de entrada: siempre hay alternativa de teclear o buscar el código | La cámara puede no estar disponible; el cálculo no depende de ella |
| Una venta puede incluir varios ítems (un carrito de venta) o ser de un solo producto | El plan describe "escanear el producto vendido"; se soporta vender varias unidades y, opcionalmente, varios productos en una venta |
| Un producto no se elimina; se puede desactivar | Un producto con ventas debe seguir en el historial y en las métricas |

---

## 3. Acceso

| Actor | Acceso | Puede hacer |
|---|---|---|
| Administradora | Login existente | Registrar productos, registrar entradas, consultar por escaneo, registrar ventas, (opcional) ver métricas y generar etiquetas |
| Sistema | Interno | Valida entradas, suma y descuenta stock, deriva el estado Agotado, calcula el total de la venta y las métricas |

| Ruta | Sin sesión | Con sesión |
|---|:-:|:-:|
| `/`, `/login` | login | login / panel |
| `/panel/*` | redirige al login | Sí |
| `/api/kathainv/*` | 401 | Sí |

Al ser de un solo usuario, no hay separación por dispositivo ni por cuenta: el inventario es uno solo, el del almacén.

---

## 4. Estados del producto

El producto no tiene máquina de estados; su disponibilidad se deriva del stock.

| Condición | Estado mostrado |
|---|---|
| `stock > 0` | Disponible |
| `stock = 0` | Agotado (RN-04) |
| `activo = false` | Inactivo (no aparece en consulta ni en venta) |

El estado "Agotado" no se guarda como columna editable: la vista y las consultas lo derivan de `stock = 0` (regla 4 del plan). Un producto inactivo se conserva para el historial y las métricas, pero no se puede vender ni consultar como disponible.

---

## 5. Reglas de negocio

| ID | Regla | Origen | Dónde se aplica |
|---|---|---|---|
| RN-01 | No se puede vender una cantidad mayor al stock disponible | Regla 1 del plan | `lib/reglas/venta.ts`; transacción con bloqueo |
| RN-02 | La referencia es única por Producto + Talla + Color; cada una tiene su código y su propio stock | Regla 2 del plan | BD índice único; `lib/reglas/producto.ts` |
| RN-03 | Si se escanea un código no registrado, el sistema exige registrar el producto antes de vender o consultar | Regla 3 del plan | Servicio: consulta por código devuelve "no registrado" con señal de alta |
| RN-04 | Al llegar el stock a 0, el estado de la referencia pasa a Agotado | Regla 4 del plan | Estado derivado (columna/vista) |
| RN-05 | El código del producto es único en todo el inventario | Sección 3 del plan (código por referencia) | BD UNIQUE |
| RN-06 | El precio es un entero mayor que 0 | Agregada (enteros) | BD CHECK; Zod |
| RN-07 | La cantidad de una entrada es un entero mayor que 0; suma al stock existente | Sección 3.2 del plan | Servicio `registrarEntrada` |
| RN-08 | La cantidad vendida de un ítem es un entero mayor que 0 | Sección 3.4 del plan | `lib/reglas/venta.ts`; Zod |
| RN-09 | La categoría es una de: Ropa, Calzado, Bolso, Accesorio | Sección 3.1 del plan | BD CHECK; enum |
| RN-10 | Registrar una entrada de una referencia existente suma al stock; no crea otra referencia | Sección 3.2 del plan | Servicio `registrarEntrada` |
| RN-11 | El total de una venta es la suma de (cantidad × precio_unitario) de sus ítems; el precio se congela al vender | Agregada (coherencia con una venta) | `lib/reglas/venta.ts`; servicio |
| RN-12 | El stock se descuenta dentro de la misma transacción de la venta, con la referencia bloqueada | Agregada (integridad) | Servicio `registrarVenta` |
| RN-13 | Solo se opera sobre productos activos; un inactivo no se vende ni se consulta como disponible | Agregada | Servicio; filtro en consultas |
| RN-14 | El nombre, la talla y el color no pueden estar vacíos | Agregada | BD CHECK; Zod |
| RN-15 | Un producto no se elimina; se desactiva (y solo si su stock es 0) | Agregada | Servicio; BD `ON DELETE RESTRICT` |

### 5.1 Casos límite

| Caso | Resultado |
|---|---|
| Vender una cantidad mayor al stock | Rechazo (`STOCK_INSUFICIENTE`); el inventario no cambia |
| Vender exactamente todo el stock | Venta válida; el stock queda en 0 y la referencia pasa a Agotado |
| Vender una unidad con stock 0 | Rechazo (`STOCK_INSUFICIENTE`) |
| Escanear un código no registrado | Señal "no registrado": la interfaz ofrece registrarlo (RN-03) |
| Registrar una entrada de una referencia existente | Suma al stock (RN-10) |
| Registrar un producto con una combinación Producto+Talla+Color ya existente | Rechazo (`REFERENCIA_DUPLICADA`): es la misma referencia, se usa entrada para sumar |

---

## 6. Casos de uso

| ID | Entrada | Precondición | Efecto | Errores posibles |
|---|---|---|---|---|
| CU-01 Registrar producto | nombre, categoría, talla, color, precio, código, stock inicial | código y combinación no repetidos | Referencia creada con su stock inicial | `DATOS_INVALIDOS`, `CODIGO_DUPLICADO`, `REFERENCIA_DUPLICADA` |
| CU-02 Editar producto | nombre, categoría, precio (no la combinación ni el código) | el producto existe | Datos actualizados | `PRODUCTO_NO_ENCONTRADO`, `DATOS_INVALIDOS` |
| CU-03 Registrar entrada | código (o referencia), cantidad | la referencia existe | Stock aumentado | `PRODUCTO_NO_ENCONTRADO`, `DATOS_INVALIDOS` |
| CU-04 Consultar por escaneo o código | código | — | Ficha (nombre, talla, color, precio, stock, estado) o "no registrado" (RN-03) | `DATOS_INVALIDOS` |
| CU-05 Registrar venta | ítems (código + cantidad) | las referencias existen y hay stock | Venta creada; stock descontado; total calculado | `PRODUCTO_NO_ENCONTRADO`, `STOCK_INSUFICIENTE`, `DATOS_INVALIDOS` |
| CU-06 Alerta de agotado | — (tras una venta) | — | Si una referencia quedó en 0, la respuesta la marca Agotada | — |
| CU-07 Iniciar sesión | credenciales | — | Acceso al panel | manejados por el login |
| CU-08 Desactivar producto | código | stock 0 | Producto inactivo | `PRODUCTO_NO_ENCONTRADO`, `PRODUCTO_CON_EXISTENCIAS` |

### 6.1 Secuencia de CU-05 (registrar venta)

Todo ocurre dentro de `conTransaccion`:

1. `validarVenta(items)` (al menos un ítem; cada cantidad entera mayor que 0).
2. Para cada ítem, bloquear la referencia por código (`SELECT ... FOR UPDATE`); si no existe o está inactiva, `PRODUCTO_NO_ENCONTRADO`.
3. Si la cantidad de algún ítem supera su stock, `STOCK_INSUFICIENTE` y se revierte toda la venta (RN-01).
4. Insertar la venta y sus ítems, congelando `precio_unitario = producto.precio` (RN-11).
5. Descontar el stock de cada referencia (RN-12). El estado Agotado se deriva solo.
6. Calcular el total (suma de subtotales) y guardarlo en la venta.
7. Confirmar y devolver la venta con su total y qué referencias quedaron agotadas (RN-04, CU-06).

```ts
export async function registrarVenta(items: ItemVentaEntrada[]): Promise<ResultadoVenta> {
  validarVenta(items);
  return conTransaccion(async (tx) => {
    const lineas = [];
    for (const item of items) {
      const prod = await bloquearProductoPorCodigo(tx, item.codigo);   // PRODUCTO_NO_ENCONTRADO
      if (item.cantidad > prod.stock) {
        throw new ErrorDeNegocio('STOCK_INSUFICIENTE', undefined, { codigo: prod.codigo, disponible: prod.stock });
      }
      lineas.push({ productoId: prod.id, codigo: prod.codigo, cantidad: item.cantidad, precioUnitario: prod.precio });
    }
    const ventaId = await insertarVenta(tx, lineas);                   // RN-11
    const agotados = [];
    for (const l of lineas) {
      const nuevo = await descontarStock(tx, l.productoId, l.cantidad); // RN-12
      if (nuevo === 0) agotados.push(l.codigo);                         // RN-04
    }
    const total = lineas.reduce((s, l) => s + l.cantidad * l.precioUnitario, 0);
    await fijarTotalVenta(tx, ventaId, total);
    return { ventaId, total, agotados };
  });
}
```

---

## 7. Modelo de datos

### 7.1 Relaciones

```text
productos 1 ──── N items_venta
ventas    1 ──── N items_venta
productos 1 ──── N movimientos_inventario   (entradas y salidas, para trazabilidad y métricas)

v_productos = productos + estado derivado (Disponible / Agotado) a partir del stock
```

Las migraciones se guardan en `supabase/migrations/` y continúan la numeración existente (P00 la identifica). En este documento se nombran M1 y M2.

### 7.2 M1 · Tablas

```sql
-- M1: tablas de KATHAINV

CREATE TABLE IF NOT EXISTS productos (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo        VARCHAR(64)   NOT NULL,                 -- código de barras o QR (RN-05)
  nombre        VARCHAR(160)  NOT NULL,
  categoria     VARCHAR(12)   NOT NULL,
  talla         VARCHAR(20)   NOT NULL,
  color         VARCHAR(40)   NOT NULL,
  precio        INTEGER       NOT NULL,                 -- pesos enteros (RN-06)
  stock         INTEGER       NOT NULL DEFAULT 0,
  activo        BOOLEAN       NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT productos_codigo_unico     UNIQUE (codigo),                               -- RN-05
  CONSTRAINT productos_nombre_minimo    CHECK (char_length(btrim(nombre)) >= 1),       -- RN-14
  CONSTRAINT productos_talla_minima     CHECK (char_length(btrim(talla)) >= 1),
  CONSTRAINT productos_color_minimo     CHECK (char_length(btrim(color)) >= 1),
  CONSTRAINT productos_precio_positivo  CHECK (precio > 0),                            -- RN-06
  CONSTRAINT productos_stock_no_negativo CHECK (stock >= 0),
  CONSTRAINT productos_categoria_valida CHECK (categoria IN ('Ropa', 'Calzado', 'Bolso', 'Accesorio'))  -- RN-09
);
-- Referencia única por Producto + Talla + Color (RN-02), sin distinguir mayúsculas:
CREATE UNIQUE INDEX IF NOT EXISTS ux_productos_referencia
  ON productos (lower(btrim(nombre)), lower(btrim(talla)), lower(btrim(color)));
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos (categoria);
CREATE INDEX IF NOT EXISTS idx_productos_stock     ON productos (stock);

CREATE TABLE IF NOT EXISTS ventas (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  total        INTEGER       NOT NULL DEFAULT 0,
  fecha        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT ventas_total_no_negativo CHECK (total >= 0)
);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas (fecha DESC);

CREATE TABLE IF NOT EXISTS items_venta (
  id              BIGSERIAL     PRIMARY KEY,
  venta_id        UUID          NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  producto_id     UUID          NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,  -- RN-15
  codigo          VARCHAR(64)   NOT NULL,                 -- copia al momento de la venta
  cantidad        INTEGER       NOT NULL,
  precio_unitario INTEGER       NOT NULL,                 -- congelado (RN-11)
  subtotal        INTEGER       GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
  CONSTRAINT items_cantidad_positiva CHECK (cantidad > 0),   -- RN-08
  CONSTRAINT items_precio_positivo   CHECK (precio_unitario > 0)
);
CREATE INDEX IF NOT EXISTS idx_items_venta_venta    ON items_venta (venta_id);
CREATE INDEX IF NOT EXISTS idx_items_venta_producto ON items_venta (producto_id);

-- Trazabilidad de entradas y salidas (apoya las métricas de rotación, F6)
CREATE TABLE IF NOT EXISTS movimientos_inventario (
  id           BIGSERIAL     PRIMARY KEY,
  producto_id  UUID          NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  tipo         VARCHAR(8)    NOT NULL,                     -- 'entrada' | 'venta'
  cantidad     INTEGER       NOT NULL,                     -- positivo; el tipo da el signo
  venta_id     UUID          REFERENCES ventas(id) ON DELETE SET NULL,
  fecha        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT mov_tipo_valido      CHECK (tipo IN ('entrada', 'venta')),
  CONSTRAINT mov_cantidad_positiva CHECK (cantidad > 0)
);
CREATE INDEX IF NOT EXISTS idx_mov_producto ON movimientos_inventario (producto_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_mov_tipo     ON movimientos_inventario (tipo, fecha);

CREATE OR REPLACE FUNCTION kathainv_actualizar_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_productos_updated_at ON productos;
CREATE TRIGGER trg_productos_updated_at BEFORE UPDATE ON productos
  FOR EACH ROW EXECUTE FUNCTION kathainv_actualizar_updated_at();
```

### 7.3 M2 · Vista de productos y seguridad

```sql
-- M2: vista con estado derivado y cierre de acceso público

CREATE OR REPLACE VIEW v_productos
WITH (security_invoker = true) AS
SELECT
  p.*,
  (p.stock = 0) AS agotado   -- RN-04: estado derivado
FROM productos p;

ALTER TABLE productos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE items_venta            ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_inventario ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON productos, ventas, items_venta, movimientos_inventario FROM anon, authenticated;
REVOKE ALL ON v_productos FROM anon, authenticated;
```

Las tablas quedan sin políticas: la clave pública de Supabase no puede leerlas ni escribirlas. Todo el acceso ocurre en el servidor mediante la conexión directa a Postgres.

### 7.4 Traducción de errores de la base de datos

| Código Postgres | Restricción | Código de negocio |
|---|---|---|
| `23505` | `productos_codigo_unico` | `CODIGO_DUPLICADO` |
| `23505` | `ux_productos_referencia` | `REFERENCIA_DUPLICADA` |
| `23503` | llaves foráneas (`ON DELETE RESTRICT`) | `PRODUCTO_CON_VENTAS` |
| `23514` | cualquier CHECK | `DATOS_INVALIDOS` |
| Otro | | `ERROR_INTERNO` (se registra en consola, no se muestra al usuario) |

---

## 8. El escaneo por cámara

El escaneo es central en la experiencia del plan (consultar y vender escaneando), pero no en el cálculo: siempre hay una vía manual.

- **Lectura:** una librería de escaneo de códigos de barras/QR del lado del cliente usa la cámara del dispositivo. Al leer un código, la interfaz lo trata igual que si se hubiera tecleado.
- **Permiso:** la primera vez se pide permiso de cámara; si se niega o no hay cámara, la interfaz muestra un campo para escribir el código y un buscador, sin bloquear nada.
- **Consulta (CU-04):** el código leído se consulta con `obtenerProductoPorCodigo`. Si no existe, se muestra "código no registrado" con un botón para registrarlo (RN-03).
- **Venta (CU-05):** cada código leído agrega una unidad de esa referencia al carrito de venta (o incrementa su cantidad); al confirmar, se registra la venta.
- **Móvil primero:** la pantalla de escaneo está pensada para el celular (el plan es Mobile-First), con la cámara y el carrito en una sola vista.

La librería de escaneo se carga solo en el cliente (sin SSR) y se elige una que funcione como script del lado del navegador, sin servicios externos.

---

## 9. Arquitectura del código

### 9.1 Capas

```text
Pantallas (app/panel/*) ────┐
                            ├──► Rutas API (app/api/kathainv/*) ──► lib/dataService.ts ──► lib/datos/* ──► Postgres
Componentes (components/*) ─┘          │                              │
                                       └──── lib/validacion (Zod)     └──── lib/reglas/* (funciones puras)
```

- `lib/reglas/`: reglas puras (validación de producto y venta, cálculo del total, estado derivado). No importan `pg`, ni red, ni el reloj (salvo `fechas.ts`). Se prueban con Vitest, junto al `LoginForm.test.tsx` que ya existe.
- `lib/datos/`: consultas SQL y casos de uso con transacciones. Solo este directorio importa `lib/db/conexion.ts`.
- `lib/dataService.ts`: fachada única. Las rutas y páginas importan datos solo desde aquí.
- Rutas API: validan con Zod, verifican sesión, llaman a `dataService` y responden con `lib/http/respuestas.ts`.

### 9.2 Árbol de archivos nuevos

```text
.github/copilot-instructions.md
doc/ESTADO_ACTUAL.md
doc/ESTADO_EJECUCION.md
doc/checkpoints/FASE_N_COMPLETADA.md

supabase/migrations/NNNN_kathainv_tablas.sql
supabase/migrations/NNNN_kathainv_vista_seguridad.sql

scripts/migrar.mjs                 (solo si no existe mecanismo de migraciones)
scripts/verificar-bd.mjs
scripts/probar-flujo.ts
scripts/limpiar-prueba.mjs
scripts/cargar-demo.ts

lib/config/kathainv.ts
lib/reglas/errores.ts
lib/reglas/fechas.ts
lib/reglas/producto.ts
lib/reglas/venta.ts
lib/validacion/esquemas.ts
lib/db/conexion.ts
lib/auth/sesion.ts
lib/http/respuestas.ts
lib/formato.ts
lib/datos/tipos.ts
lib/datos/productos.ts
lib/datos/ventas.ts
lib/datos/metricas.ts              (opcional, F6)
lib/dataService.ts

tests/reglas/ayudas.ts
tests/reglas/producto.test.ts
tests/reglas/venta.test.ts
vitest.config.ts                   (si no existe ya; si existe, se respeta)

app/panel/layout.tsx
app/panel/page.tsx                 (inventario)
app/panel/productos/nuevo/page.tsx
app/panel/productos/[codigo]/page.tsx
app/panel/escanear/page.tsx        (consulta y venta por cámara)
app/panel/ventas/page.tsx          (historial de ventas)
app/panel/metricas/page.tsx        (opcional, F6)
app/panel/etiquetas/page.tsx       (opcional, F7)

app/api/kathainv/sesion/route.ts
app/api/kathainv/productos/route.ts
app/api/kathainv/productos/[codigo]/route.ts
app/api/kathainv/productos/[codigo]/entrada/route.ts
app/api/kathainv/productos/[codigo]/desactivar/route.ts
app/api/kathainv/ventas/route.ts
app/api/kathainv/metricas/route.ts (opcional, F6)

components/ui/Boton.tsx
components/ui/Campo.tsx
components/ui/Selector.tsx
components/ui/Tarjeta.tsx
components/ui/Insignia.tsx
components/ui/Aviso.tsx
components/ui/Modal.tsx
components/ui/EstadoVacio.tsx
components/kathainv/NavegacionPanel.tsx
components/kathainv/InsigniaEstado.tsx
components/kathainv/TablaProductos.tsx
components/kathainv/FiltrosProductos.tsx
components/kathainv/FormularioProducto.tsx
components/kathainv/FormularioEntrada.tsx
components/kathainv/Escaner.tsx
components/kathainv/FichaProducto.tsx
components/kathainv/CarritoVenta.tsx
components/kathainv/TablaVentas.tsx
components/kathainv/TablaMetricas.tsx     (opcional)
```

### 9.3 Responsabilidades y prohibiciones

| Regla de código | Motivo |
|---|---|
| Identificadores, comentarios y mensajes en español | Coherencia con el dominio |
| Las reglas puras viven en `lib/reglas/` y no tocan la base ni la red | Se prueban con Vitest |
| No romper `LoginForm.test.tsx` ni la configuración de pruebas existente | El login ya funciona y tiene su prueba |
| El total se calcula desde los ítems; el precio se congela al vender | RN-11, sección 6.1 |
| El estado Agotado se deriva del stock, no se edita | RN-04 |
| El stock se descuenta dentro de la transacción de la venta, con bloqueo | RN-12 |
| Montos como `number` entero en pesos; nunca decimales | Sección 13 |
| Solo `lib/datos/` importa `lib/db/conexion.ts` | Las rutas no escriben SQL |
| Las rutas solo importan datos desde `lib/dataService.ts` | Fachada única |
| Las rutas `/api/kathainv/*` llaman `exigirSesion()` como primera instrucción | Sección 1.3 |
| La librería de escaneo se carga solo en el cliente (sin SSR) | Usa la cámara del navegador |
| `params` de rutas dinámicas se obtiene con `await params` | Next.js 15 entrega `params` como Promise |
| No modificar archivos del login salvo la redirección indicada en P03 | Sección 1.3 |

### 9.4 Configuración

```ts
// lib/config/kathainv.ts
export const CATEGORIAS = ['Ropa', 'Calzado', 'Bolso', 'Accesorio'] as const;
export const CANTIDAD_MAXIMA = 9999;        // tope razonable por ítem o entrada
export const LIMITE_LISTADO = 500;
export const DIAS_METRICAS = 30;            // periodo por defecto de rotación (F6)
export const ZONA_HORARIA = 'America/Bogota';
```

### 9.5 Firmas de las reglas puras

```ts
// lib/reglas/errores.ts
export type CodigoError =
  | 'DATOS_INVALIDOS' | 'NO_AUTORIZADO'
  | 'PRODUCTO_NO_ENCONTRADO' | 'CODIGO_DUPLICADO' | 'REFERENCIA_DUPLICADA'
  | 'STOCK_INSUFICIENTE' | 'PRODUCTO_CON_EXISTENCIAS' | 'PRODUCTO_CON_VENTAS'
  | 'ERROR_INTERNO';
export const MENSAJES: Record<CodigoError, string>;     // sección 10.2
export const ESTADO_HTTP: Record<CodigoError, number>;  // sección 10.2
export class ErrorDeNegocio extends Error {
  constructor(public codigo: CodigoError, mensaje?: string, public detalles?: unknown);
}

// lib/reglas/fechas.ts
export function hoyBogota(reloj?: Date): string;                  // 'YYYY-MM-DD'
export function inicioDeVentana(hoy: string, dias: number): string;  // hoy - dias, para métricas

// lib/reglas/producto.ts
export type Categoria = 'Ropa' | 'Calzado' | 'Bolso' | 'Accesorio';
export function normalizarCodigo(codigo: string): string;        // recorta; conserva el valor
export function esCategoriaValida(c: string): c is Categoria;
export function estaAgotado(stock: number): boolean;             // stock === 0 (RN-04)
export function validarDatosProducto(d: {
  codigo: string; nombre: string; categoria: string; talla: string; color: string; precio: number; stock: number;
}): void;  // campos no vacíos; categoría válida; precio entero > 0; stock entero >= 0
export function validarCantidadEntrada(cantidad: number): void;  // entero > 0 (RN-07)

// lib/reglas/venta.ts
export interface ItemVentaEntrada { codigo: string; cantidad: number }
export function validarVenta(items: ItemVentaEntrada[]): void;   // al menos 1 ítem; cada cantidad entera > 0 (RN-08)
export function subtotal(cantidad: number, precioUnitario: number): number;
export function totalVenta(lineas: Array<{ cantidad: number; precioUnitario: number }>): number;  // RN-11
export function hayStockSuficiente(cantidad: number, stock: number): boolean;  // cantidad <= stock (RN-01)
```

### 9.6 Firmas de `dataService`

```ts
// Sesión
obtenerSesion(): Promise<{ email: string } | null>

// Productos
listarProductos(f?: { categoria?: Categoria; busqueda?: string; soloDisponibles?: boolean; incluirInactivos?: boolean }): Promise<FilaProducto[]>
obtenerProductoPorCodigo(codigo: string): Promise<ProductoConsulta>   // incluye "no registrado" si no existe (RN-03)
crearProducto(d: DatosProducto): Promise<{ id: string; codigo: string }>
editarProducto(codigo: string, d: CambiosProducto): Promise<void>
registrarEntrada(codigo: string, cantidad: number): Promise<{ stock: number }>   // RN-10
desactivarProducto(codigo: string): Promise<void>                    // PRODUCTO_CON_EXISTENCIAS

// Ventas
registrarVenta(items: ItemVentaEntrada[]): Promise<ResultadoVenta>   // RN-01, RN-11, RN-12
listarVentas(f?: { desde?: string; hasta?: string }): Promise<FilaVenta[]>

// Métricas (opcional, F6)
obtenerMetricasRotacion(desde: string, hasta: string): Promise<MetricasRotacion>
```

Tipos (`lib/datos/tipos.ts`): `FilaProducto { codigo, nombre, categoria, talla, color, precio, stock, agotado }`; `ProductoConsulta { encontrado: boolean; producto?: FilaProducto }`; `DatosProducto`, `CambiosProducto`; `ResultadoVenta { ventaId, total, agotados: string[] }`; `FilaVenta { id, fecha, total, items: Array<{ codigo, nombre, cantidad, precioUnitario, subtotal }> }`; `MetricasRotacion { masVendidos: Array<{ codigo, nombre, unidades }>, menosVendidos: Array<{...}>, sinVentas: Array<{...}> }`.

### 9.7 Conexión y transacciones

```ts
// lib/db/conexion.ts
import { Pool, types, type PoolClient } from 'pg';

types.setTypeParser(1082, (v) => v);                 // DATE → texto
types.setTypeParser(1114, (v) => v);                 // TIMESTAMP → texto
types.setTypeParser(1184, (v) => v);                 // TIMESTAMPTZ → texto
types.setTypeParser(20, (v) => parseInt(v, 10));     // BIGINT (ids, COUNT, SUM) → number

const globalParaPool = globalThis as unknown as { poolKathainv?: Pool };

export const pool = globalParaPool.poolKathainv ?? new Pool({
  connectionString: process.env.DATABASE_URL,        // el nombre real lo confirma P00
  ssl: { rejectUnauthorized: false },
  max: 3,
  idleTimeoutMillis: 10_000,
});
if (process.env.NODE_ENV !== 'production') globalParaPool.poolKathainv = pool;

export async function consultar<T>(sql: string, valores: unknown[] = []): Promise<T[]> { /* pool.query */ }
export async function conTransaccion<T>(trabajo: (tx: PoolClient) => Promise<T>): Promise<T> { /* BEGIN/COMMIT/ROLLBACK */ }
```

---

## 10. Contratos de API

### 10.1 Formato de respuesta

```json
{ "ok": true, "datos": { } }
```

```json
{ "ok": false, "error": { "codigo": "STOCK_INSUFICIENTE", "mensaje": "No hay suficiente stock para la venta.", "detalles": { "codigo": "ABC123", "disponible": 2 } } }
```

Todas las respuestas llevan `Cache-Control: no-store`.

### 10.2 Códigos de error

| Código | HTTP | Mensaje para el usuario |
|---|---|---|
| `DATOS_INVALIDOS` | 400 | Revise los datos ingresados. |
| `NO_AUTORIZADO` | 401 | Debe iniciar sesión. |
| `PRODUCTO_NO_ENCONTRADO` | 404 | No existe un producto con ese código. |
| `CODIGO_DUPLICADO` | 409 | Ya existe un producto con ese código. |
| `REFERENCIA_DUPLICADA` | 409 | Ya existe esa combinación de producto, talla y color. Use una entrada para sumar stock. |
| `STOCK_INSUFICIENTE` | 409 | No hay suficiente stock para la venta. |
| `PRODUCTO_CON_EXISTENCIAS` | 409 | El producto tiene stock y no se puede desactivar. |
| `PRODUCTO_CON_VENTAS` | 409 | El producto tiene ventas registradas y no se puede eliminar. |
| `ERROR_INTERNO` | 500 | Ocurrió un error inesperado. Intente de nuevo. |

### 10.3 Endpoints (todos requieren sesión)

| Método y ruta | Cuerpo o parámetros | Respuesta `datos` |
|---|---|---|
| `GET /api/kathainv/sesion` | | `{ email }` |
| `GET /api/kathainv/productos?categoria=&busqueda=&soloDisponibles=` | | `FilaProducto[]` |
| `POST /api/kathainv/productos` | `{ codigo, nombre, categoria, talla, color, precio, stock }` | `{ id, codigo }` (201) |
| `GET /api/kathainv/productos/[codigo]` | | `ProductoConsulta` (RN-03: `encontrado: false` si no existe) |
| `PATCH /api/kathainv/productos/[codigo]` | `{ nombre?, categoria?, precio? }` | `{ actualizado: true }` |
| `POST /api/kathainv/productos/[codigo]/entrada` | `{ cantidad }` | `{ stock }` (201) |
| `POST /api/kathainv/productos/[codigo]/desactivar` | | `{ desactivado: true }` |
| `POST /api/kathainv/ventas` | `{ items: [{ codigo, cantidad }] }` | `ResultadoVenta` (201) |
| `GET /api/kathainv/ventas?desde=&hasta=` | | `FilaVenta[]` |
| `GET /api/kathainv/metricas?desde=&hasta=` | | `MetricasRotacion` (opcional, F6) |

`GET /api/kathainv/productos/[codigo]` responde 200 con `{ encontrado: false }` cuando el código no está registrado (no es un error: es la señal de RN-03 para ofrecer el alta).

### 10.4 Esquemas Zod (`lib/validacion/esquemas.ts`)

| Esquema | Reglas |
|---|---|
| `esquemaCodigo` | recortado, 1 a 64 |
| `esquemaProducto` | codigo, nombre (1 a 160), categoria (enum), talla (1 a 20), color (1 a 40), precio entero ≥ 1, stock entero ≥ 0 |
| `esquemaCambiosProducto` | nombre, categoria, precio opcionales; al menos uno |
| `esquemaEntrada` | cantidad entero 1 a 9999 |
| `esquemaVenta` | items: arreglo no vacío de { codigo, cantidad entero 1 a 9999 } |
| `esquemaFiltrosProductos` | categoria, busqueda, soloDisponibles, incluirInactivos opcionales |
| `esquemaFiltrosVentas` | desde, hasta opcionales (fechas) |

---

## 11. Pantallas

Mobile-First, como pide el plan: el escaneo y la venta están pensados para el celular.

| Ruta | Contenido |
|---|---|
| `/login` | La existente. Tras entrar, redirige al panel. |
| Layout `/panel` | Verifica la sesión; sin sesión redirige al login. Barra con "KATHAINV", navegación (Inventario, Escanear, Ventas; Métricas y Etiquetas cuando estén activos), correo y cerrar sesión. Menú para móvil. |
| `/panel` · Inventario | `FiltrosProductos` (categoría, búsqueda por nombre o código, "solo disponibles"). `TablaProductos`: código, nombre, categoría, talla, color, precio, stock, estado (`InsigniaEstado`: Disponible / Agotado). Botón "Registrar producto". `EstadoVacio` si no hay o la búsqueda no encuentra. En móvil, tarjetas apiladas. |
| `/panel/productos/nuevo` · Registrar producto | `FormularioProducto`: nombre, categoría (selector), talla, color, precio, stock inicial, código (con botón "Escanear" para leerlo con la cámara). Referencia o código duplicados muestran su mensaje. |
| `/panel/productos/[codigo]` · Detalle | Datos de la referencia y estado. `FormularioEntrada` para registrar una compra (suma al stock). Edición de nombre, categoría y precio (no de la combinación ni el código). Acción "Desactivar" solo con stock 0. Movimientos recientes de la referencia (entradas y ventas). |
| `/panel/escanear` · Escanear | `Escaner` con la cámara (y entrada manual del código). Al leer: si el código existe, `FichaProducto` (nombre, talla, color, precio, stock, estado) y un botón "Agregar a la venta"; si no existe, aviso "código no registrado" con botón "Registrar" (RN-03). `CarritoVenta` con los ítems acumulados, el total en tiempo real y el botón "Registrar venta"; al vender, avisa qué referencias quedaron agotadas. |
| `/panel/ventas` · Ventas | `TablaVentas`: fecha, número de ítems, total; al abrir una, sus ítems. Filtro por rango de fechas. |
| `/panel/metricas` · Métricas (opcional) | Más vendidos, menos vendidos y sin ventas en el periodo. |
| `/panel/etiquetas` · Etiquetas (opcional) | Generar e imprimir la etiqueta (código) de un producto. |

### 11.1 Textos fijos

Código no registrado (escaneo):

> El código {codigo} no está registrado. Regístralo para poder consultarlo o venderlo.

Aviso de agotado tras una venta:

> La referencia {codigo} quedó agotada (0 unidades).

---

## 12. Identidad visual

| Token | Valor | Uso |
|---|---|---|
| `--color-primario` | `#B4457E` | Rosa maduro: botones principales, barra superior (almacén de moda femenina) |
| `--color-primario-suave` | `#F6E6EF` | Fondos de selección, hover |
| `--color-disponible` | `#2F7D4F` | Estado disponible |
| `--color-agotado` | `#B83232` | Estado agotado, errores |
| `--color-inactivo` | `#5B6770` | Producto inactivo |
| `--color-total` | `#B4457E` | El total de la venta, destacado |
| `--color-fondo` | `#F7F5F6` | Fondo de página |
| `--color-superficie` | `#FFFFFF` | Tarjetas, tablas |
| `--color-texto` | `#1F2933` | Texto principal |
| `--color-texto-suave` | `#52606D` | Texto secundario |
| `--color-borde` | `#E2DADF` | Bordes y divisores |

Los tokens se agregan a `app/globals.css` sin borrar estilos existentes. Con Tailwind 4 se declaran en `@theme`; con Tailwind 3, en `tailwind.config`. Si el proyecto ya tiene una paleta propia, se respeta la suya y estos valores son solo una sugerencia.

Criterios: Mobile-First (la vista de escaneo y venta cómoda en el celular); el total de la venta grande y con fuente tabular (`tabular-nums`); precios con `Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })`; el estado nunca se comunica solo con color (la insignia lleva texto); botones de cantidad grandes y fáciles de tocar; sin emojis; tablas convertidas en tarjetas apiladas bajo 640 px.

---

## 13. Dinero, fechas y zona horaria

| Regla | Implementación |
|---|---|
| Montos | Pesos enteros (`INTEGER` en la base, `number` entero en el código); sin centavos |
| Presentación | `Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })` → "$ 45.000" |
| Fecha de la venta y de los movimientos | `TIMESTAMPTZ`; se muestra en zona `America/Bogota` |
| "Hoy" y las ventanas de métricas | Con `hoyBogota()` e `inicioDeVentana()` |
| Lectura desde BD | Parsers de `pg` devuelven texto para marcas de tiempo (sección 9.7) |

El cálculo de una venta no depende de fechas; la zona solo afecta la presentación y el periodo de las métricas (F6).

---

## 14. Seguridad e integridad

| Medida | Detalle |
|---|---|
| Credenciales fuera del repositorio | La cuenta demo del plan es de demostración; aun así, no se dejan credenciales en archivos de la entrega y `.env.local` va en `.gitignore` |
| Acceso solo con sesión | Middleware o proxy existente y `exigirSesion()` en cada ruta de `/api/kathainv` |
| Base de datos cerrada al público | RLS activo sin políticas y permisos revocados a `anon` y `authenticated` |
| Integridad de la venta | La venta, sus ítems y el descuento de stock ocurren en una transacción con la referencia bloqueada (`FOR UPDATE`); `stock >= 0` en la base impide stock negativo (RN-01, RN-12) |
| Precio congelado | El `precio_unitario` del ítem se guarda al vender; no se recalcula desde el producto al leer (RN-11) |
| Estado derivado | Agotado se calcula de `stock = 0`; no hay un campo que pueda contradecir al stock |
| Validación en tres puntos | Formulario (Zod y reglas), API (Zod y reglas) y base (CHECK, UNIQUE, llaves foráneas) |
| SQL parametrizado | Ningún valor se concatena |
| Errores internos | Se registran con `console.error`; el usuario recibe `ERROR_INTERNO` sin detalles técnicos |

---

## 15. Pruebas

### 15.1 Pruebas unitarias de reglas (Vitest)

Se suman a las pruebas que ya existen (como `LoginForm.test.tsx`), sin alterarlas.

| ID | Función | Entrada | Resultado esperado |
|---|---|---|---|
| T-01 | `estaAgotado` | 0 | `true` |
| T-02 | `estaAgotado` | 1 | `false` |
| T-03 | `esCategoriaValida` | "Ropa" / "Calzado" / "Bolso" / "Accesorio" | `true` en los cuatro |
| T-04 | `esCategoriaValida` | "Juguete" | `false` |
| T-05 | `validarDatosProducto` | precio 0 | `DATOS_INVALIDOS` |
| T-06 | `validarDatosProducto` | stock -1 | `DATOS_INVALIDOS` |
| T-07 | `validarDatosProducto` | nombre " " | `DATOS_INVALIDOS` |
| T-08 | `validarDatosProducto` | talla " " | `DATOS_INVALIDOS` |
| T-09 | `validarDatosProducto` | categoria "Otro" | `DATOS_INVALIDOS` |
| T-10 | `validarDatosProducto` | precio 2.5 | `DATOS_INVALIDOS` |
| T-11 | `validarDatosProducto` | datos válidos (Ropa, talla M, color Rojo, precio 45000, stock 10) | sin error |
| T-12 | `validarCantidadEntrada` | 0 | `DATOS_INVALIDOS` |
| T-13 | `validarCantidadEntrada` | 5 | sin error |
| T-14 | `validarVenta` | [] (sin ítems) | `DATOS_INVALIDOS` |
| T-15 | `validarVenta` | [{codigo, cantidad: 0}] | `DATOS_INVALIDOS` |
| T-16 | `validarVenta` | [{codigo, cantidad: 2}] | sin error |
| T-17 | `hayStockSuficiente` | cantidad 3, stock 5 | `true` |
| T-18 | `hayStockSuficiente` | cantidad 5, stock 5 | `true` |
| T-19 | `hayStockSuficiente` | cantidad 6, stock 5 | `false` |
| T-20 | `hayStockSuficiente` | cantidad 1, stock 0 | `false` |
| T-21 | `subtotal` | 3, 45000 | 135000 |
| T-22 | `totalVenta` | [{2, 45000}, {1, 30000}] | 120000 |
| T-23 | `totalVenta` | [] | 0 |
| T-24 | `normalizarCodigo` | " ABC-123 " | "ABC-123" |

Comando: `npm test`. Las 24 pruebas nuevas, más las existentes, deben pasar antes de continuar con la fase 3.

### 15.2 Prueba de flujo contra la base de datos

`scripts/probar-flujo.ts` (`npm run probar:flujo`) usa `dataService` con códigos `KT-TEST-*`. Imprime `OK` o `FALLA` por paso y limpia al final.

| Paso | Operación | Esperado |
|---|---|---|
| 1 | Crear "Blusa" Ropa talla M color Rojo, precio 45000, stock 10, código KT-TEST-1 | Creado |
| 2 | Crear otra con la misma combinación Blusa/M/Rojo | `REFERENCIA_DUPLICADA` |
| 3 | Crear otra con el mismo código KT-TEST-1 | `CODIGO_DUPLICADO` |
| 4 | Crear con categoría "Otro" | `DATOS_INVALIDOS` |
| 5 | Consultar KT-TEST-1 | encontrado; stock 10, no agotado |
| 6 | Consultar un código inexistente | `encontrado: false` (RN-03), sin error |
| 7 | Registrar entrada de 5 a KT-TEST-1 | stock 15 (RN-10) |
| 8 | Vender 20 de KT-TEST-1 | `STOCK_INSUFICIENTE`; stock sigue 15 |
| 9 | Vender 15 de KT-TEST-1 | Venta registrada; total 675000; KT-TEST-1 agotado |
| 10 | Vender 1 de KT-TEST-1 | `STOCK_INSUFICIENTE` (stock 0) |
| 11 | Crear "Tenis" KT-TEST-2 (Calzado, 38, Blanco, 120000, 3) y vender 2 de KT-TEST-1 y 1 de KT-TEST-2 en una sola venta | KT-TEST-1 sin stock la rechaza: la venta entera se revierte con `STOCK_INSUFICIENTE` |
| 12 | Vender 2 de KT-TEST-2 en una venta | Venta registrada; total 240000; stock de KT-TEST-2 queda en 1 |
| 13 | Desactivar KT-TEST-2 (stock 1) | `PRODUCTO_CON_EXISTENCIAS` |
| 14 | Listar productos con soloDisponibles | No incluye KT-TEST-1 (agotado); incluye KT-TEST-2 |
| 15 | Listar ventas | Las ventas registradas con sus ítems y totales |

### 15.3 Aceptación (criterio de terminado)

Se ejecuta en el despliegue de Vercel y se documenta en `doc/ACEPTACION.md`.

| ID | Acción | Resultado esperado |
|---|---|---|
| A-01 | Abrir el panel sin sesión | Redirección al login |
| A-02 | Iniciar sesión | Acceso al panel de inventario |
| A-03 | Registrar "Blusa" Ropa / M / Rojo / $45.000 / 10 unidades, con su código | Aparece en el inventario como Disponible |
| A-04 | Registrar la misma combinación Blusa / M / Rojo | Rechazo: referencia duplicada |
| A-05 | Registrar otra "Blusa" Ropa / L / Rojo (otra talla) | Se permite: es otra referencia con su propio stock |
| A-06 | Escanear (o teclear) el código de la Blusa M | Muestra nombre, talla, color, precio y stock |
| A-07 | Escanear un código no registrado | Aviso de "no registrado" con opción de registrarlo |
| A-08 | Registrar una entrada de 5 unidades a la Blusa M | El stock sube a 15 |
| A-09 | Vender 20 de la Blusa M | Rechazo por stock insuficiente; sigue en 15 |
| A-10 | Vender 15 de la Blusa M | Venta registrada; la referencia queda Agotada y avisa |
| A-11 | Intentar vender 1 de la Blusa M | Rechazo por stock |
| A-12 | Filtrar inventario por "solo disponibles" | La Blusa M (agotada) no aparece |
| A-13 | Ver el historial de ventas | La venta aparece con su total |
| A-14 | Cerrar el navegador y volver a entrar | Los datos persisten |
| A-15 | (Opcional) Ver métricas de rotación del periodo | Más vendidos y menos vendidos |

A-15 corresponde a las funcionalidades opcionales; se verifica tras P09.

---

## 16. Plan de ejecución

| Fase | Prompt | Resultado | Cierre |
|---|---|---|---|
| 0 · Auditoría y reconciliación | P00 | `ESTADO_ACTUAL.md`, `DICTAMEN.md` (conservar / enriquecer / cambiar, por funcionalidad), `copilot-instructions.md`, `ESTADO_EJECUCION.md`; compilación de base | `FASE_0_COMPLETADA.md` |
| 1 · Base de datos | P01 | M1 y M2 aplicadas; `npm run db:verificar` sin fallas | `FASE_1_COMPLETADA.md` |
| 2 · Reglas | P02 | `lib/config`, `lib/reglas`, 24 pruebas en verde (más las existentes) | `FASE_2_COMPLETADA.md` |
| 3 · Servidor | P03 | Conexión, sesión (envolviendo el login existente), respuestas, esquemas, formato; `/api/kathainv/sesion` protegido | `FASE_3_COMPLETADA.md` |
| 4 · Datos y API | P04, P05 | `lib/datos/*`, `dataService`, rutas; `npm run probar:flujo` sin fallas | `FASE_4_COMPLETADA.md` |
| 5 · Interfaz | P06, P07, P08 | Componentes base, inventario, registro y entradas, escaneo y venta | `FASE_5_COMPLETADA.md` |
| 6 · Aceptación | (en P08) | `ACEPTACION.md` con A-01 a A-14; README | `FASE_6_COMPLETADA.md` |
| 7 · Opcionales | P09 | Métricas de rotación y etiquetas | `FASE_7_COMPLETADA.md` |

Condiciones entre fases: no se inicia una fase sin el archivo de cierre de la anterior; `npm run build` sin errores al final de cada prompt; `npm test` en verde desde P02 (incluidas las pruebas que ya existían); cada prompt termina con commit y push, y un fallo de despliegue en Vercel se corrige antes del siguiente prompt.

---

## 17. Funcionalidades opcionales

Se construyen solo con la fase 6 cerrada.

| Prompt | Funcionalidad | Implementación |
|---|---|---|
| P09 | F6 · Métricas de rotación | `lib/datos/metricas.ts` `obtenerMetricasRotacion(desde, hasta)`: a partir de `items_venta` (o `movimientos_inventario` de tipo venta), suma las unidades vendidas por producto en el periodo; devuelve los más vendidos, los menos vendidos y los que no tuvieron ventas (productos activos sin ventas en el periodo). `GET /api/kathainv/metricas`; `/panel/metricas` con `TablaMetricas` y un selector de periodo (por defecto 30 días). Resuelve el problema 3 del diagnóstico del plan |
| P09 | F7 · Etiquetas | `/panel/etiquetas`: para un producto, genera su etiqueta con el código como código de barras o QR (una librería del lado del cliente que dibuje el código) y un botón de imprimir (la impresión del navegador). Si un producto no tiene código asignado, se puede generar uno único. No requiere servicios externos |

Del roadmap del plan, las múltiples sucursales, los roles y la tienda virtual quedan fuera de este alcance.

---

## 18. Glosario

| Término | Definición |
|---|---|
| Referencia | Combinación única de producto, talla y color, con su propio código y su propio stock |
| Código | Identificador del producto (código de barras o QR), único en el inventario |
| Entrada | Registro de una compra a proveedor; suma unidades al stock |
| Venta | Salida de unidades; descuenta stock y guarda el precio del momento |
| Agotado | Estado derivado cuando el stock llega a 0 |
| Escaneo | Lectura del código con la cámara del dispositivo para consultar o vender |
| Rotación | Qué tanto se vende un producto en un periodo (métrica opcional) |
| Precio congelado | El `precio_unitario` guardado en el ítem de la venta; no cambia después |
| Regla pura | Función de `lib/reglas/` que solo depende de sus parámetros |
| Transacción | Conjunto de escrituras que se confirma completo o se revierte completo |
| Copilot en modo Agente | Modo de GitHub Copilot Chat que lee el repositorio, edita varios archivos y ejecuta comandos de terminal con aprobación |
