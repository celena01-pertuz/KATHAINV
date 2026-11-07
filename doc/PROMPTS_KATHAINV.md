# KATHAINV · Prompts para GitHub Copilot

> Plan de referencia: `doc/PLAN_KATHAINV.md`
> Herramienta: GitHub Copilot Chat en modo Agente (VS Code)
> Punto de partida: proyecto ya desplegado y bastante avanzado por la estudiante, en el stack del curso

---

## Importante: este proyecto ya está avanzado

KATHAINV no se construye desde cero. La estudiante ya tiene mucho hecho y funcionando. Por eso **el primer prompt (P00) no ejecuta nada: audita y decide**. Compara lo que ya existe contra el plan técnico y escribe un dictamen de qué conservar, qué enriquecer y qué cambiar. Los prompts siguientes respetan ese dictamen: adaptan lo que haya en vez de reescribirlo. Si el código de la estudiante ya es correcto y está probado, se conserva aunque difiera del plan en la forma; el plan solo manda cuando hay una regla de negocio, una validación o la integridad de los datos en juego.

Lee el dictamen (`doc/DICTAMEN.md`) después de P00. Si un prompt propone crear algo que, según el dictamen, ya existe y está bien, ese prompt solo lo verifica y sigue.

## Nota de seguridad

El plan funcional trae una cuenta demo (`demo@kathainv.com`). Es de demostración, pero conviene no dejar credenciales escritas en la entrega final ni en archivos versionados, y confirmar que `.env.local` está en `.gitignore`.

## Cómo ejecutar estos prompts

1. Crear la carpeta `doc/` en la raíz del repositorio (si no existe) y copiar allí `PLAN_KATHAINV.md` y `PROMPTS_KATHAINV.md`.
2. Abrir el proyecto en VS Code y abrir Copilot Chat. En el selector de modo elegir **Agent**. En el selector de modelo elegir el más capaz disponible.
3. Cada prompt se ejecuta en una **conversación nueva** (botón `+` del chat).
4. Copiar el bloque gris completo del prompt, pegarlo en el chat y enviarlo. No hay datos que reemplazar.
5. Cuando Copilot pida permiso para ejecutar un comando en la terminal, leerlo y aceptarlo.
6. Al terminar cada prompt: revisar los cambios y aceptarlos (**Keep**); hacer la verificación indicada; hacer commit con el mensaje sugerido y `git push`. Vercel desplegará; si falla, usar el prompt de despliegue fallido antes de continuar.
7. No saltar prompts. Si algo falla, usar el prompt de corrección del final.

| Fase | Prompts |
|---|---|
| 0 · Auditoría y reconciliación | P00 |
| 1 · Base de datos | P01 |
| 2 · Reglas de negocio | P02 |
| 3 · Servidor | P03 |
| 4 · Datos y API | P04, P05 |
| 5 · Interfaz | P06, P07, P08 |
| 7 · Opcionales | P09 |

---

## P00 · Auditoría y reconciliación con lo ya construido

**Fase:** 0 · **Modifica código:** no · **Crea:** `doc/ESTADO_ACTUAL.md`, `doc/DICTAMEN.md`, `.github/copilot-instructions.md`, `doc/ESTADO_EJECUCION.md`, `doc/checkpoints/FASE_0_COMPLETADA.md`

````text
Actúa como ingeniero de software senior y revisor técnico, trabajando en modo agente sobre este repositorio Next.js.

Contexto IMPORTANTE: el proyecto "KATHAINV" (inventario y ventas por escaneo para un almacén de ropa) YA está desplegado y la estudiante YA avanzó bastante en su construcción. Este prompt NO implementa ni reescribe nada: audita lo que existe y lo compara contra el plan técnico (doc/PLAN_KATHAINV.md) para producir un dictamen de qué conservar, qué enriquecer y qué cambiar. Respeta el trabajo ya hecho: cuando el código existente ya es correcto y está probado, se conserva aunque difiera del plan en nombres u organización. El plan solo prevalece cuando hay una regla de negocio, una validación o la integridad de los datos en juego.

Lee completo doc/PLAN_KATHAINV.md, en especial las secciones 0, 1, 2, 5, 7 y 16.

TAREA 1. Crea doc/ESTADO_ACTUAL.md con una radiografía fiel del repositorio. No supongas: lee los archivos. Secciones:
1. Versiones (package.json): next, react, typescript, tailwindcss, pg, zod, @supabase/supabase-js, vitest, y la librería de escaneo si hay alguna.
2. Scripts de package.json.
3. Estructura real: árbol de app/, lib/, components/, supabase/ y scripts/ hasta 3 niveles. Indica si usa src/.
4. Alias de importación en tsconfig.json.
5. Autenticación: cómo está hecho el login hoy (Supabase Auth, JWT propio, u otro); archivos; la prueba del login (LoginForm.test.tsx u otra) y qué verifica; ruta de login; a dónde redirige tras entrar; archivo de middleware o proxy; cómo se cierra sesión.
6. Dónde viven los datos HOY: ¿Supabase Postgres? ¿LocalStorage? ¿memoria? ¿un JSON? ¿un mock? Sé explícito por entidad (productos, ventas, entradas).
7. Qué funcionalidades del MVP YA están construidas y en qué estado: para cada una (gestión de productos, entradas, consulta por escaneo, ventas con descuento de stock, alerta de agotado, login), indica si existe, dónde (archivos), si funciona de punta a punta, y si tiene validaciones o pruebas.
8. Escaneo: ¿hay lectura por cámara implementada? ¿con qué librería? ¿funciona?
9. Variables de entorno: solo los NOMBRES en .env.local y .env.example (NUNCA valores). Indica si existe una conexión directa a Postgres y con qué nombre, y si hay claves de Supabase.
10. Migraciones: ¿existen? ¿carpeta, numeración, tabla de control, cómo se aplican? Si las tablas se crearon a mano en Supabase, indícalo.
11. Tablas existentes en la base (si puedes consultarlas): nombres y columnas de las que correspondan a productos, ventas, inventario.
12. Estilos: versión de Tailwind, globals.css, tokens de color, fuentes, librería de íconos.
13. Pruebas: framework y qué pruebas existen hoy.
14. Compilación de base: resultado de npm run build y de npm test (TAREA 4).

TAREA 2. Crea doc/DICTAMEN.md: el corazón de este prompt. Para CADA funcionalidad del módulo mínimo del plan (sección 2.1: F1 productos, F2 entradas, F3 consulta por escaneo, F4 ventas con descuento y alerta, F5 login) y para cada regla de negocio (sección 5: RN-01 a RN-15), evalúa lo que encontraste en la TAREA 1 y emite un veredicto con esta estructura:

```markdown
## F[n] — [nombre]
- Estado actual: [qué hay construido, con archivos]
- Veredicto: CONSERVAR | ENRIQUECER | CAMBIAR
- Razón: [por qué]
- Acción concreta: [qué hará el prompt correspondiente: nada / agregar X / migrar Y / corregir Z]
- Prompt donde se trata: [P04, P08, etc.]
```

Reglas del veredicto:
- CONSERVAR: ya cumple la funcionalidad o la regla, con datos que persisten de verdad y, si aplica, con validación. Aunque los nombres o la organización difieran del plan. No se toca.
- ENRIQUECER: existe y funciona, pero le falta algo que el plan exige (una regla de negocio, una validación, una prueba, mover los datos a Postgres si hoy están en memoria o LocalStorage, o una transacción que garantice integridad). Se mantiene lo bueno y se agrega lo que falta.
- CAMBIAR: contradice una regla de negocio del plan (por ejemplo, permite vender más que el stock, o el estado "agotado" es un campo editable en vez de derivarse del stock, o el precio del ítem no se congela), o pone en riesgo la integridad (el total se acumula a mano, el stock se descuenta fuera de una transacción). Se explica qué y por qué.

Incluye al final una tabla resumen (funcionalidad/regla → veredicto → prompt) y una lista de "conflictos a resolver con la estudiante": cualquier caso donde cambiar algo podría borrar trabajo suyo que ella quizá quiera conservar por una razón que el plan no conoce. Esos NO se cambian sin su visto bueno; se marcan para preguntarle.

Un principio para todo el dictamen: si la diferencia entre su código y el plan es solo de forma y su código es correcto, el veredicto es CONSERVAR y se anota "el plan queda cumplido por el código existente".

TAREA 3. Crea .github/copilot-instructions.md reemplazando [AJUSTAR] con lo hallado:

```markdown
# KATHAINV · Instrucciones para Copilot

## Documentos rectores
- Plan técnico: doc/PLAN_KATHAINV.md (referencia, no imposición).
- Estado real: doc/ESTADO_ACTUAL.md.
- Dictamen de reconciliación: doc/DICTAMEN.md. Antes de crear algo, revisa si el dictamen dice CONSERVAR; si es así, solo verifícalo.
- Avance: doc/ESTADO_EJECUCION.md.

## Principio de reconciliación
- El proyecto ya está avanzado por la estudiante. No reescribas lo que ya funciona y está probado. Adapta y enriquece.
- Si el código existente y el plan difieren solo en forma y el código es correcto, gana el código. El plan manda cuando hay una regla de negocio, una validación o la integridad de datos en juego.
- No borres trabajo de la estudiante marcado como "conflicto a resolver" sin su visto bueno.

## Stack
- Next.js App Router + TypeScript + Tailwind. Despliegue en Vercel.
- Postgres de Supabase con pg y la variable [AJUSTAR]. (Si hoy los datos están en [AJUSTAR: memoria/LocalStorage/JSON], se migran a Postgres cuando el dictamen lo indique.)
- Validación con Zod. Pruebas con Vitest. No romper las pruebas existentes (p. ej. [AJUSTAR: LoginForm.test.tsx]).
- Login existente: [AJUSTAR]. No se reescribe. Un solo usuario, sin roles.

## Convenciones
- Identificadores, comentarios, mensajes y textos de interfaz en español.
- Reglas de negocio solo en lib/reglas/: funciones puras, sin pg, sin red, sin variables de entorno y sin reloj (excepto fechas.ts).
- El total de una venta se calcula desde los ítems; el precio del ítem se congela al vender. El estado "Agotado" se deriva de stock = 0. El stock se descuenta dentro de la transacción de la venta, con la referencia bloqueada.
- La referencia es única por Producto + Talla + Color; cada una tiene su código y su stock.
- Solo lib/datos/ importa lib/db/conexion.ts. Rutas y páginas importan datos únicamente desde lib/dataService.ts.
- Toda ruta en app/api/kathainv/ (o la ruta de API que ya use el proyecto) llama await exigirSesion() como primera instrucción.
- Montos en pesos enteros. Nunca decimales.
- La librería de escaneo se carga solo en el cliente (sin SSR).
- En rutas dinámicas params es una Promise: const { codigo } = await params.
- SQL siempre con parámetros. Nunca concatenar valores.
- Prefijo de imports para lib: [AJUSTAR]. Archivo de protección de rutas: [AJUSTAR]. Ruta de login: [AJUSTAR].

## Al terminar cada tarea
1. npm run build sin errores.
2. npm test sin fallas (incluidas las pruebas existentes).
3. Actualizar doc/ESTADO_EJECUCION.md.
4. No hacer commit: la estudiante revisa y hace el commit.
```

TAREA 4. Si no existe node_modules, ejecuta npm install. Ejecuta npm run build y npm test y registra ambos resultados en la sección 14 de ESTADO_ACTUAL.md. Si algo falla, NO lo corrijas aún: descríbelo (es parte del diagnóstico).

TAREA 5. Crea doc/ESTADO_EJECUCION.md con la tabla de prompts (P00 a P09) en estado pendiente y una sección de bitácora, como en los demás proyectos del curso.

TAREA 6. Si los datos hoy NO están en Postgres, o no hay una conexión directa a Postgres configurada, explícamelo y dime cómo obtener la cadena de conexión en Supabase (Connect, Transaction pooler, puerto 6543) y dónde ponerla. Si ya están en Postgres, confírmalo. No es necesario migrar nada en este prompt; solo diagnosticar.

RESTRICCIONES: no modifiques código, configuración ni dependencias. Solo creas los archivos de este prompt.

AL TERMINAR:
- Crea doc/checkpoints/FASE_0_COMPLETADA.md con: resultado de build y test, dónde viven los datos hoy, un resumen del dictamen (cuántas funcionalidades CONSERVAR / ENRIQUECER / CAMBIAR) y la lista de conflictos a resolver con la estudiante.
- Marca P00 en ESTADO_EJECUCION.md.
- Muéstrame el dictamen resumido y pregúntame por los conflictos a resolver antes de seguir con P01.
````

**Verificación del estudiante:** leer `doc/DICTAMEN.md` completo. Es el documento más importante: dice, para cada parte, si tu trabajo se conserva, se enriquece o se cambia, y por qué. Si hay algo marcado como "conflicto a resolver", decidir con el profesor antes de seguir. Lo que ya hiciste bien se queda.

**Commit sugerido:** `docs: auditoría y dictamen de reconciliación de KATHAINV`

---

## P01 · Base de datos: reconciliar con lo existente

**Fase:** 1 · **Crea o adapta:** migraciones, `scripts/verificar-bd.mjs`

````text
Antes de escribir código lee completos: doc/DICTAMEN.md, doc/PLAN_KATHAINV.md (secciones 5, 7 y 14), doc/ESTADO_ACTUAL.md y doc/ESTADO_EJECUCION.md.

OBJETIVO: dejar el esquema de datos en Postgres de acuerdo con el plan, PERO reconciliando con lo que ya exista. No borres datos ni tablas de la estudiante sin que el dictamen lo justifique y yo lo apruebe.

TAREA 1. Según el dictamen y ESTADO_ACTUAL.md, decide el camino y explícalo en la bitácora:
- Caso A — los datos ya están en Postgres con tablas equivalentes a las del plan: NO recrees las tablas. Escribe una migración de AJUSTE que solo agregue lo que falte para cumplir las reglas (por ejemplo: el índice único de referencia Producto+Talla+Color si no está, el CHECK de categoría, el CHECK de precio > 0, el CHECK de stock >= 0, la columna/estado derivado de agotado como vista, el subtotal generado en items_venta, o la tabla movimientos_inventario si no existe). Usa ALTER TABLE y CREATE ... IF NOT EXISTS; no DROP salvo que yo lo apruebe.
- Caso B — los datos están en memoria, LocalStorage o un JSON, o no hay tablas: crea las migraciones M1 y M2 con el SQL de las secciones 7.2 y 7.3 del plan. La migración de datos reales (pasar lo que haya en el navegador a la base) no aplica porque esos datos son locales de un dispositivo; se parte de una base limpia con el seed demo (P04).
- Caso C — mezcla (algunas tablas sí, otras no): combina; crea lo que falte, ajusta lo que esté incompleto.

TAREA 2. Aplica las migraciones con el mecanismo existente (si lo hay) o crea scripts/migrar.mjs y el script "db:migrar" (patrón estándar: lee la variable de conexión, tabla _migrations, aplica en orden en transacción, imprime aplicada/omitida). Si las tablas existentes se crearon a mano en Supabase, registra en _migrations las migraciones de ajuste que apliques, y documenta el estado.

TAREA 3. Crea o actualiza scripts/verificar-bd.mjs y "db:verificar". Debe imprimir y comprobar, contra el esquema que haya quedado:
1. Existencia de productos, ventas, items_venta, movimientos_inventario y la vista v_productos (o sus equivalentes según el dictamen; usa los nombres reales y anótalos).
2. Las restricciones clave: código único, referencia única (Producto+Talla+Color), categoría válida, precio > 0, stock >= 0.
3. Si RLS está activo y si anon/authenticated tienen permisos revocados.
4. Pruebas de integridad en UNA transacción que SIEMPRE termina en ROLLBACK, con SAVEPOINT antes de cada caso que debe fallar:
   a) Insertar un producto válido: funciona.
   b) Insertar otro con el mismo código: 23505.
   c) Insertar otro con la misma combinación nombre+talla+color: 23505 (referencia única).
   d) Insertar con categoría inválida: 23514.
   e) Insertar con precio 0: 23514.
   f) Insertar un item_venta y comprobar el subtotal generado (cantidad × precio_unitario).
   Imprime OK o FALLA por caso. Si alguna restricción no existe todavía, la TAREA 1 debió agregarla; si no se pudo, anótalo como pendiente.
5. Total de fallas; código 1 si hubo alguna.

Ejecuta npm run db:verificar y copia la salida en la bitácora.

RESTRICCIONES: no borres tablas ni datos de la estudiante sin aprobación. No modifiques el login.

AL TERMINAR:
- npm run build sin errores.
- Crea doc/checkpoints/FASE_1_COMPLETADA.md con la salida de db:verificar y el camino (A/B/C) que seguiste.
- Marca P01 en ESTADO_EJECUCION.md y agrega su sección en la bitácora.
- Muéstrame un resumen.
````

**Verificación del estudiante:** en Supabase, confirmar que tus tablas siguen ahí (si ya las tenías) y que ahora tienen las restricciones de las reglas. La salida de `npm run db:verificar` no debe tener FALLA.

**Commit sugerido:** `feat(bd): esquema reconciliado con restricciones de las reglas`

---

## P02 · Reglas de negocio y pruebas unitarias

**Fase:** 2 · **Crea o adapta:** `lib/config/kathainv.ts`, `lib/reglas/*`, `tests/reglas/*`

````text
Antes de escribir código lee completos: doc/DICTAMEN.md, doc/PLAN_KATHAINV.md (secciones 4, 5, 9.3, 9.4, 9.5, 10.2 y 15.1), doc/ESTADO_ACTUAL.md y doc/ESTADO_EJECUCION.md.

OBJETIVO: tener las reglas de negocio como funciones puras probadas. Si parte de esta lógica ya existe en el código de la estudiante (por ejemplo, el descuento de stock o el cálculo del total dentro de un componente o una ruta), NO la dupliques: extráela a lib/reglas/ y haz que el código existente la use, conservando su comportamiento correcto.

TAREA 1. Asegura Vitest configurado sin romper las pruebas que ya existen (LoginForm.test.tsx u otras). Si ya hay vitest.config, respétalo; si no, créalo (environment 'node' para las reglas; conserva el entorno de las pruebas de componentes que ya haya). Agrega "test" y "test:ver" si faltan.

TAREA 2. Crea lib/config/kathainv.ts con el contenido de la sección 9.4 (categorías, topes, periodo de métricas, zona horaria). Si ya hay constantes equivalentes dispersas, céntralas aquí y reemplaza los usos.

TAREA 3. Crea lib/reglas/ con las firmas de la sección 9.5:
- errores.ts: CodigoError, MENSAJES y ESTADO_HTTP (tabla 10.2), clase ErrorDeNegocio.
- fechas.ts: hoyBogota; inicioDeVentana.
- producto.ts: normalizarCodigo; esCategoriaValida; estaAgotado (stock === 0, RN-04); validarDatosProducto (campos no vacíos, categoría válida, precio entero > 0, stock entero >= 0); validarCantidadEntrada (entero > 0).
- venta.ts: validarVenta (al menos un ítem, cada cantidad entera > 0); subtotal; totalVenta (RN-11); hayStockSuficiente (cantidad <= stock, RN-01).
Si el código actual ya implementa alguna de estas reglas correctamente, mueve la lógica aquí tal cual (mismo comportamiento) y deja que el resto la importe.

TAREA 4. Crea tests/reglas/ayudas.ts con esperarCodigo(fn, codigo). Crea las pruebas en tests/reglas/ (producto, venta) cubriendo T-01 a T-24 de la sección 15.1. Cada caso con su ID. Verifica los valores exactos: subtotal 3×45000 = 135000; total [2×45000, 1×30000] = 120000; vender 6 con stock 5 → false; vender 5 con stock 5 → true.

TAREA 5. Ejecuta npm test hasta que pasen las 24 nuevas y sigan pasando las existentes. Si una falla, corrige la regla (no la prueba), salvo que contradiga el plan; explícalo.

RESTRICCIONES: no toques el login ni su prueba. No dupliques lógica: si ya existe, reubícala en lib/reglas/.

AL TERMINAR:
- npm run build y npm test sin errores.
- Crea doc/checkpoints/FASE_2_COMPLETADA.md con la salida de npm test.
- Marca P02 en ESTADO_EJECUCION.md y agrega su sección en la bitácora (indica qué lógica moviste desde el código existente, si fue el caso).
- Muéstrame un resumen.
````

**Verificación del estudiante:** `npm test` pasa las 24 nuevas y las que ya tenías. Si tenías el descuento de stock o el total metido en un componente, ahora vive en `lib/reglas/` y se prueba solo.

**Commit sugerido:** `feat(reglas): reglas puras de producto y venta con 24 pruebas`

---

## P03 · Servidor: sesión, conexión y utilidades

**Fase:** 3 · **Crea o adapta:** conexión, sesión, respuestas, esquemas, formato · **Modifica:** protección de rutas si hace falta

````text
Antes de escribir código lee completos: doc/DICTAMEN.md, doc/PLAN_KATHAINV.md (secciones 1.3, 7.4, 9.1, 9.3, 9.7, 10.1, 10.2, 10.4, 13 y 14), doc/ESTADO_ACTUAL.md y doc/ESTADO_EJECUCION.md.

OBJETIVO: la infraestructura del servidor, reusando lo que ya exista.

TAREA 1. lib/db/conexion.ts como la sección 9.7 (con los parsers de tipo). Si ya hay un cliente de Supabase o un pool de pg para escribir datos, revisa el dictamen: si el acceso a datos ya se hace bien con el cliente de Supabase del servidor, puedes conservarlo para las lecturas simples y usar pg solo donde haga falta una transacción (la venta). Documenta la decisión. Usa el nombre real de la variable de conexión.

TAREA 2. lib/auth/sesion.ts: obtenerSesion() y exigirSesion() envolviendo el login existente (sin romper su prueba). Si ya hay una función que da la sesión en el servidor, reúsala.

TAREA 3. Protección de rutas: si el proyecto ya protege sus rutas privadas, consérvalo y solo asegúrate de que cubre las rutas del inventario y la venta. Si no, agrega al middleware o proxy el matcher de las rutas del panel y de /api del inventario. Confirma que tras el login se llega al panel.

TAREA 4. lib/http/respuestas.ts: responderOk, responderError (ErrorDeNegocio → ESTADO_HTTP; ZodError → 400; pg 23505/23503/23514 → tabla 7.4; otro → console.error y 500 ERROR_INTERNO), conManejoDeErrores, leerCuerpo; todas con Cache-Control: no-store. Si ya hay un formato de respuesta en el proyecto, respétalo y adapta estas utilidades a ese formato para no romper el frontend existente; documenta cuál se usa.

TAREA 5. lib/validacion/esquemas.ts con los esquemas de la sección 10.4. Si ya hay validaciones, conviértelas a estos esquemas y reemplaza los usos.

TAREA 6. lib/formato.ts: formatearPesos (Intl es-CO, COP, sin decimales), formatearFecha. Si ya existen, reúsalos.

TAREA 7. Ruta de sesión del inventario (GET que devuelve { email }), con exigirSesion() como primera instrucción, en la convención de rutas que ya use el proyecto (por ejemplo app/api/kathainv/sesion o la que corresponda; anótalo).

VERIFICACIÓN: npm run build y npm test (las existentes siguen pasando). Sin sesión, la ruta de sesión da 401; con sesión, 200. El login sigue funcionando y llega al panel.

AL TERMINAR:
- Crea doc/checkpoints/FASE_3_COMPLETADA.md con los resultados y qué reusaste del código existente.
- Marca P03 en ESTADO_EJECUCION.md y agrega su sección en la bitácora.
- Muéstrame un resumen.
````

**Verificación del estudiante:** el login sigue igual y su prueba pasa; la ruta de sesión responde 401 sin sesión y 200 con sesión.

**Commit sugerido:** `feat(servidor): conexión, sesión y utilidades reconciliadas`

---

## P04 · Datos: productos y ventas

**Fase:** 4 (primera parte) · **Crea o adapta:** `lib/datos/*`, `lib/dataService.ts`, scripts de prueba y demo

````text
Antes de escribir código lee completos: doc/DICTAMEN.md, doc/PLAN_KATHAINV.md (secciones 4, 5, 6, 6.1, 7.4, 9.5, 9.6 y 15.2), doc/ESTADO_ACTUAL.md y doc/ESTADO_EJECUCION.md. Revisa lib/reglas/, lib/db/conexion.ts y lib/validacion/esquemas.ts.

OBJETIVO: la capa de datos y los casos de uso del MVP contra Postgres, reusando lo que ya funcione y corrigiendo lo que el dictamen marque como CAMBIAR (sobre todo: venta con descuento de stock en transacción, precio congelado, estado agotado derivado).

TAREA 1. lib/datos/tipos.ts con los tipos de la sección 9.6. Reutiliza tipos existentes si los hay.

TAREA 2. lib/datos/productos.ts:
- listarProductos({ categoria, busqueda, soloDisponibles, incluirInactivos }): desde v_productos; búsqueda por nombre o código; soloDisponibles → stock > 0.
- obtenerProductoPorCodigo(codigo): si existe, la ficha; si no, { encontrado: false } (RN-03, no es error).
- crearProducto(d): validarDatosProducto; inserta; CODIGO_DUPLICADO o REFERENCIA_DUPLICADA según el caso.
- editarProducto(codigo, d): nombre, categoría, precio (no la combinación ni el código).
- registrarEntrada(codigo, cantidad): validarCantidadEntrada; suma al stock en transacción; registra un movimiento 'entrada' (RN-10); devuelve el nuevo stock.
- desactivarProducto(codigo): solo con stock 0 (PRODUCTO_CON_EXISTENCIAS).
Si ya existen funciones equivalentes, adáptalas a estas firmas conservando lo correcto.

TAREA 3. lib/datos/ventas.ts:
- registrarVenta(items): la secuencia EXACTA de la sección 6.1 dentro de conTransaccion: bloquear cada referencia (FOR UPDATE), rechazar con STOCK_INSUFICIENTE si una cantidad supera su stock (revierte toda la venta, RN-01), insertar la venta y sus ítems con precio congelado (RN-11), descontar stock (RN-12), registrar movimientos 'venta', calcular el total, devolver { ventaId, total, agotados }. Esta función es la más importante del proyecto: si hoy el descuento de stock se hace sin transacción o permite stock negativo, ESTA es la corrección central.
- listarVentas({ desde, hasta }): ventas con sus ítems y total.

TAREA 4. lib/datos/metricas.ts: créalo preparado para la opcional (F6); en el MVP no se usa.

TAREA 5. lib/dataService.ts como fachada: reexporta las funciones públicas del MVP y los tipos. Verifica que ningún archivo fuera de lib/datos importe lib/db/conexion.ts. Si el frontend existente llamaba a otras funciones, haz que apunten a dataService sin cambiar su comportamiento visible.

TAREA 6. scripts/limpiar-prueba.mjs ("db:limpiar"): borra productos con código 'KT-TEST-%' o 'KT-DEMO-%' y sus ventas e ítems. scripts/cargar-demo.ts ("db:demo"): crea ~8 productos demo (ropa, calzado, bolsos, accesorios) con varias tallas y colores, algún stock bajo; registra un par de ventas. Limpia los demo antes.

TAREA 7. Instala tsx si falta. scripts/probar-flujo.ts ("probar:flujo") con los 15 pasos de la sección 15.2 usando solo dataService. Imprime OK/FALLA por paso; los que esperan error verifican el código; limpia antes y en finally; cierra el pool; código 1 si hay fallas. CRÍTICO: el paso 11 debe comprobar que una venta multiproducto con un ítem sin stock se revierte ENTERA, y el paso 9 que vender todo el stock deja la referencia agotada. Ejecuta y corrige hasta 0 fallas.

RESTRICCIONES: no romper el login. No dupliques lógica de reglas (vive en lib/reglas/). No borres datos reales de la estudiante; los scripts de prueba usan códigos KT-TEST / KT-DEMO.

AL TERMINAR:
- npm run build y npm test sin errores.
- Marca P04 en ESTADO_EJECUCION.md y agrega la salida de probar:flujo y db:demo en la bitácora. La fase 4 sigue abierta hasta P05.
- Muéstrame un resumen, señalando qué correcciones de las marcadas CAMBIAR aplicaste.
````

**Verificación del estudiante:** `npm run probar:flujo` (15 OK, 0 fallas). El paso 11 confirma que una venta con un producto sin stock no deja el inventario a medias; el 9, que vender todo deja la referencia agotada.

**Commit sugerido:** `feat(datos): productos y ventas con venta transaccional y precio congelado`

---

## P05 · API

**Fase:** 4 (cierre) · **Crea o adapta:** rutas de API del inventario

````text
Antes de escribir código lee completos: doc/DICTAMEN.md, doc/PLAN_KATHAINV.md (secciones 10.1 a 10.4), doc/ESTADO_EJECUCION.md, lib/dataService.ts, lib/http/respuestas.ts, lib/validacion/esquemas.ts y lib/auth/sesion.ts.

OBJETIVO: exponer las operaciones del MVP por API, reusando las rutas que ya existan y protegiéndolas.

TAREA 1. Para cada endpoint de la tabla 10.3 (productos: listar, crear, consultar por código, editar, entrada, desactivar; ventas: registrar, listar; sesión), revisa si ya existe una ruta equivalente en el proyecto. Si existe y funciona, adáptala para que use dataService y conManejoDeErrores, con exigirSesion() como primera instrucción, sin cambiar su contrato visible para el frontend si el dictamen no lo exige. Si no existe, créala. Usa la convención de rutas del proyecto (anótala); el plan usa /api/kathainv/*, pero si el proyecto ya usa otra base, consérvala y documsenta el mapeo.
Reglas comunes: cuerpos validados con leerCuerpo y los esquemas de 10.4; [codigo] con await params; export const dynamic = 'force-dynamic'; POST de crear/entrada/venta responden 201. GET de producto por código responde 200 con { encontrado: false } si no existe (RN-03).

TAREA 2. Verificación sin sesión: las rutas del inventario deben dar 401.

TAREA 3. Verificación con sesión: pídeme que inicie sesión. Crea un producto por API; consúltalo por código; registra una entrada; registra una venta que deje una referencia en 0 (comprueba que la respuesta la marca agotada); intenta vender más que el stock (409 STOCK_INSUFICIENTE); consulta un código inexistente (200 con encontrado:false). Documenta.

AL TERMINAR:
- npm run build y npm test sin errores.
- Crea doc/checkpoints/FASE_4_COMPLETADA.md con probar:flujo (P04) y las verificaciones.
- Marca P05 en ESTADO_EJECUCION.md y agrega su sección en la bitácora (incluye el mapeo de rutas existentes a las del plan, si difieren).
- Muéstrame un resumen.
````

**Verificación del estudiante:** las rutas del inventario piden sesión; registrar una venta por API descuenta el stock y avisa si algo quedó agotado; un código inexistente responde "no registrado" sin error.

**Commit sugerido:** `feat(api): rutas del inventario reconciliadas y protegidas`

---

## P06 · Interfaz base e inventario

**Fase:** 5 · **Crea o adapta:** `components/ui/*`, layout del panel, inventario

````text
Antes de escribir código lee completos: doc/DICTAMEN.md, doc/PLAN_KATHAINV.md (secciones 4, 5, 11, 12 y 13), doc/ESTADO_ACTUAL.md y doc/ESTADO_EJECUCION.md.

OBJETIVO: la estructura del panel y la vista de inventario, reusando los componentes y estilos que la estudiante ya tenga. No rehagas pantallas que ya funcionan; adáptalas para que usen dataService y muestren el estado derivado (Agotado) correctamente.

TAREA 1. components/ui/: si ya hay componentes base, reúsalos. Si faltan, crea Boton, Campo, Selector, Tarjeta, Insignia, Aviso, Modal, EstadoVacio con foco visible y contraste. Respeta la paleta existente del proyecto; los tokens de la sección 12 son solo sugerencia si no hay una.

TAREA 2. Layout del panel: verifica sesión (obtenerSesion), redirige al login si no hay. Navegación: Inventario, Escanear, Ventas (y Métricas/Etiquetas cuando existan). Si ya hay un layout del panel, consérvalo y solo asegúrate de la navegación y la protección. Mobile-First.

TAREA 3. InsigniaEstado (Disponible / Agotado / Inactivo, con texto además de color). Si ya hay un indicador de estado, ajústalo para que derive de stock = 0 (RN-04), no de un campo editable.

TAREA 4. Inventario (la página principal del panel): FiltrosProductos (categoría, búsqueda por nombre o código, "solo disponibles") y TablaProductos (código, nombre, categoría, talla, color, precio, stock, estado) desde listarProductos. Si la estudiante ya tiene una tabla de inventario, adáptala para leer de dataService y mostrar el estado derivado; no la reescribas si ya está bien. Botón "Registrar producto". EstadoVacio. En móvil, tarjetas apiladas.

VERIFICACIÓN: pídeme que inicie sesión si lo necesitas. Con los datos demo: ver el inventario; filtrar por categoría y por "solo disponibles"; comprobar que un producto con stock 0 se muestra como Agotado. Revisa en móvil. Confirma que lo que ya funcionaba sigue funcionando.

AL TERMINAR:
- npm run build y npm test sin errores.
- Marca P06 en ESTADO_EJECUCION.md y agrega su sección en la bitácora (qué reusaste y qué creaste).
- Muéstrame un resumen.
````

**Verificación del estudiante:** ver el inventario con los filtros; un producto sin stock aparece como Agotado. Lo que ya tenías sigue igual o mejor.

**Commit sugerido:** `feat(interfaz): panel e inventario reconciliados`

---

## P07 · Registro de producto y entradas

**Fase:** 5 · **Crea o adapta:** formulario de producto, detalle con entradas

````text
Antes de escribir código lee completos: doc/DICTAMEN.md, doc/PLAN_KATHAINV.md (secciones 5, 6, 8, 10.3, 11), doc/ESTADO_EJECUCION.md y los componentes existentes.

OBJETIVO: registrar productos (con lectura del código por cámara disponible) y registrar entradas que suman stock.

TAREA 1. FormularioProducto (crear y editar): nombre, categoría (selector de las cuatro), talla, color, precio, stock inicial, código. Botón "Escanear" que lee el código con la cámara (ver TAREA 3). Validación con esquemaProducto y las reglas; REFERENCIA_DUPLICADA y CODIGO_DUPLICADO muestran su mensaje. Si ya hay un formulario de alta, adáptalo a estas reglas y a dataService.

TAREA 2. Detalle del producto (/panel/productos/[codigo] o la ruta que use el proyecto): datos de la referencia, estado derivado, FormularioEntrada (suma al stock vía registrarEntrada), edición de nombre/categoría/precio, y "Desactivar" solo con stock 0. Movimientos recientes de la referencia (entradas y ventas) si están disponibles.

TAREA 3. Escaneo en el campo de código: un componente de cámara (la librería que ya use el proyecto, o una del lado del cliente si no hay) cargado solo en el cliente (sin SSR). Al leer, rellena el campo de código. Si no hay cámara o permiso, el campo manual queda disponible. Reusa el escáner que la estudiante ya tenga si existe.

VERIFICACIÓN: pídeme que inicie sesión si lo necesitas. Registrar un producto (probando el escaneo del código si hay cámara, o tecleándolo); intentar la misma combinación nombre+talla+color (error de referencia duplicada); registrar una entrada y ver subir el stock; intentar desactivar un producto con stock (error). Documenta.

AL TERMINAR:
- npm run build y npm test sin errores.
- Marca P07 en ESTADO_EJECUCION.md y agrega su sección en la bitácora.
- Muéstrame un resumen.
````

**Verificación del estudiante:** registrar un producto y una entrada; ver subir el stock; comprobar el rechazo de una referencia repetida.

**Commit sugerido:** `feat(interfaz): registro de productos y entradas`

---

## P08 · Escaneo, venta y aceptación del MVP

**Fase:** 5 y 6 · **Crea o adapta:** pantalla de escaneo y venta, historial de ventas, `doc/ACEPTACION.md` · **Modifica:** `README.md`

````text
Antes de escribir código lee completos: doc/DICTAMEN.md, doc/PLAN_KATHAINV.md (secciones 5, 6.1, 8, 10.3, 11, 14, 15 y 16), doc/ESTADO_EJECUCION.md y los componentes existentes.

OBJETIVO: la experiencia central del plan (consultar y vender por escaneo), el historial de ventas, y el cierre del MVP con la aceptación.

TAREA 1. Pantalla de escaneo y venta (/panel/escanear o la que use el proyecto), Mobile-First:
- Escaner con la cámara (y entrada manual del código), solo en el cliente.
- Al leer un código: si existe, FichaProducto (nombre, talla, color, precio, stock, estado) con botón "Agregar a la venta"; si no existe, aviso "código no registrado" con botón "Registrar" (RN-03).
- CarritoVenta: ítems acumulados (cada escaneo suma una unidad de esa referencia o incrementa su cantidad), total en tiempo real, y botón "Registrar venta" que llama a registrarVenta. Al vender, muestra el total y avisa qué referencias quedaron agotadas (RN-04, CU-06). Si el servidor responde STOCK_INSUFICIENTE, muestra el mensaje con la referencia y el disponible.
Si la estudiante ya tiene una pantalla de venta por escaneo, adáptala para que use registrarVenta (transaccional, con precio congelado y descuento de stock) en vez de cualquier descuento manual previo; conserva su interfaz si ya es buena.

TAREA 2. Historial de ventas (/panel/ventas): TablaVentas (fecha, número de ítems, total; al abrir una, sus ítems) desde listarVentas; filtro por rango de fechas.

TAREA 3. Revisa el código contra las secciones 5, 6.1 y 14, y contra el dictamen. Reporta y corrige en la bitácora cualquier punto marcado CAMBIAR que siga pendiente: venta sin transacción, stock que pueda quedar negativo, estado agotado como campo editable, total acumulado a mano, precio no congelado, montos con decimales, rutas sin exigirSesion, SQL concatenado, estado comunicado solo con color.

TAREA 4. Ejecuta npm test y npm run probar:flujo; corrige fallas en el código. Prepara la aceptación: db:limpiar.

TAREA 5. Crea doc/ACEPTACION.md con la tabla A-01 a A-15 de la sección 15.3 (columnas: ID, acción, resultado esperado, resultado obtenido, evidencia, observación; las tres últimas vacías) y una nota de que A-15 es de la opcional (P09).

TAREA 6. Actualiza README.md: descripción; funcionalidades; requisitos; cómo correr en local (npm install, .env.local con los NOMBRES de las variables, db:migrar, db:demo, dev); scripts; estructura; una nota de que los datos viven en Postgres y de las garantías clave (venta transaccional, precio congelado, estado agotado derivado); nota de que las credenciales no van en el repositorio; enlace a doc/PLAN_KATHAINV.md y a doc/DICTAMEN.md.

TAREA 7. Verifica que .env.local esté en .gitignore y que ningún archivo versionado tenga credenciales.

AL TERMINAR:
- npm run build y npm test sin errores.
- Crea doc/checkpoints/FASE_5_COMPLETADA.md (interfaz) y doc/checkpoints/FASE_6_COMPLETADA.md (correcciones del dictamen aplicadas y pruebas).
- Marca P08 en ESTADO_EJECUCION.md y agrega su sección en la bitácora.
- Muéstrame un resumen y recuérdame que A-01 a A-14 se ejecutan en el despliegue de Vercel.
````

**Verificación del estudiante:** vender escaneando (o tecleando) y ver el total y el descuento de stock; vender todo un producto y verlo quedar agotado; intentar vender de más y ver el rechazo. Hacer push y ejecutar A-01 a A-14 en Vercel.

**Commit sugerido:** `feat(interfaz): escaneo, venta transaccional y aceptación del MVP`

---

## P09 · Opcionales: métricas de rotación y etiquetas

**Fase:** 7 · **Requisito:** `doc/checkpoints/FASE_6_COMPLETADA.md` existe y `doc/ACEPTACION.md` está diligenciado

````text
Antes de escribir código lee completos: doc/DICTAMEN.md, doc/PLAN_KATHAINV.md (secciones 2.2, 8, 10.3, 15.3 (A-15) y 17), doc/ESTADO_EJECUCION.md y doc/checkpoints/FASE_6_COMPLETADA.md. Si FASE_6_COMPLETADA.md no existe, detente y avísame.

OBJETIVO: métricas de rotación (F6) y generación de etiquetas (F7), del roadmap del plan.

TAREA 1. F6 · Métricas de rotación:
- lib/datos/metricas.ts: obtenerMetricasRotacion(desde, hasta): a partir de items_venta (o movimientos_inventario de tipo venta) suma las unidades vendidas por producto en el periodo; devuelve masVendidos, menosVendidos y sinVentas (productos activos sin ventas en el periodo). Reexporta en dataService.
- Ruta GET de métricas (en la convención del proyecto); pantalla /panel/metricas con TablaMetricas y un selector de periodo (por defecto DIAS_METRICAS). Resuelve el problema 3 del diagnóstico del plan (identificar alta y baja rotación).

TAREA 2. F7 · Etiquetas:
- /panel/etiquetas: para un producto elegido, genera su etiqueta con el código como código de barras o QR (una librería del lado del cliente que dibuje el código) y un botón de imprimir (ventana de impresión del navegador). Si un producto no tiene código, permite generar uno único. Sin servicios externos.

VERIFICACIÓN: pídeme que inicie sesión si lo necesitas. Con ventas demo en el periodo: ver las métricas (más y menos vendidos, y sin ventas); generar la etiqueta de un producto y previsualizar la impresión. Documenta.

AL TERMINAR:
- npm run build y npm test sin errores.
- Agrega a doc/ACEPTACION.md el resultado de A-15.
- Crea doc/checkpoints/FASE_7_COMPLETADA.md.
- Marca P09 en ESTADO_EJECUCION.md y agrega su sección en la bitácora.
- Muéstrame un resumen.
````

**Verificación del estudiante:** ver las métricas de rotación del periodo y generar la etiqueta de un producto.

**Commit sugerido:** `feat(opcional): métricas de rotación y etiquetas`

---

## Prompts auxiliares

### Corrección de un error

Reemplazar `[NN]` por el número del prompt y pegar el error completo donde se indica.

````text
Durante la ejecución del prompt P[NN] apareció este error:

[PEGAR AQUÍ EL ERROR COMPLETO]

Lee doc/DICTAMEN.md, doc/PLAN_KATHAINV.md, doc/ESTADO_ACTUAL.md y doc/ESTADO_EJECUCION.md. Encuentra la causa y corrígela sin salir del alcance de P[NN] y sin romper lo que el dictamen marcó como CONSERVAR. No modifiques pruebas ni scripts de prueba para que pasen; corrige el código que prueban. Ejecuta npm run build y npm test. Registra en la bitácora la causa, la corrección y los archivos modificados. Muéstrame un resumen.
````

### Reanudación de un prompt interrumpido

````text
La ejecución anterior del prompt P[NN] se interrumpió. Lee doc/ESTADO_EJECUCION.md, doc/DICTAMEN.md, doc/PLAN_KATHAINV.md y doc/PROMPTS_KATHAINV.md (sección P[NN]). Revisa qué archivos de P[NN] ya existen y cuáles faltan, y continúa desde la primera tarea incompleta sin rehacer lo terminado ni tocar lo marcado CONSERVAR. Al final ejecuta npm run build y npm test, y actualiza la bitácora.
````

### Despliegue fallido en Vercel

````text
El despliegue en Vercel falló con este registro:

[PEGAR AQUÍ EL REGISTRO DEL BUILD DE VERCEL]

Lee doc/ESTADO_ACTUAL.md y doc/ESTADO_EJECUCION.md. Identifica la causa (error de compilación, variable de entorno faltante en Vercel, o diferencia entre local y producción). Si es de código, corrígelo y verifica con npm run build. Si es una variable de entorno, dime exactamente qué NOMBRE de variable falta y en qué entornos de Vercel agregarla, sin pedir ni mostrar valores. Registra la causa y la solución en la bitácora.
````
