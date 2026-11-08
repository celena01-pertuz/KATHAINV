# Tarea: arreglar el Inicio y pedir el nombre al registrarse

Estas instrucciones reemplazan el mensaje largo que se cortó. Ejecuta las partes EN ORDEN, en este mismo chat, una tras otra.

## Reglas generales

- Antes de escribir código de cada parte, dime en 3 o 4 líneas el plan y el número de tarea que le corresponde en MI plan (`plan-implementacion-fases-ts-fullstack.md`).
- NO ejecutes SQL ni crees migraciones. Si hiciera falta SQL, DETENTE y dímelo; el SQL lo reviso yo antes de correrlo.
- Dato nuevo: la función `get_product_sales_report` SÍ existe en mi Supabase, tiene permiso para `service_role` y su smoke test pasó. Descarta que falte la migración: el fallo está en la aplicación.
- Usa solo los tokens de color existentes, en los temas claro y oscuro.
- Las pruebas existentes deben seguir pasando; ajusta solo lo necesario y avísame.
- NO muestres `.env.local` ni claves.

## PARTE 1: arreglar el Inicio

1. Mira la salida del servidor de desarrollo cuando falla "No pudimos cargar el reporte" y dime el mensaje exacto (sin claves ni `.env.local`).
2. Compara cómo el Inicio pide el reporte con cómo lo pide `/reports`. Revisa:
   - (a) que use el mismo cliente admin de servidor (la función solo la ejecuta `service_role`, no la sesión del usuario);
   - (b) que la ruta y los nombres de parámetros coincidan con la API de reportes;
   - (c) que el rango de un solo día (desde igual a hasta) pase la validación de Zod y que la respuesta cumpla el esquema.
3. Fecha: hoy sale "5 de noviembre" con Hoy y Ayer sin marcar. "Hoy" debe calcularse en `America/Bogota`, la página debe calcularse en cada visita (nada de caché ni cálculo al construir), y el botón Hoy o Ayer correspondiente debe aparecer marcado.
4. Menú: en pantalla ancha, Clientes, Escáner y Proveedores quedan siempre visibles y "MÁS" es solo una etiqueta (así lo pedí). En pantalla angosta, "Más" debe abrir y cerrar el panel. Verifica y corrige si falla.
5. Corrige lo que encuentres con su prueba de regresión y dime la causa en 2 o 3 líneas.

## PARTE 2: nombre al registrarse

Sin SQL: el nombre se guarda en los metadatos del usuario de Supabase Auth, con la clave `full_name`.

1. Registro: campo obligatorio "¿Cómo te llamamos?" en el formulario y en la ruta. Zod en el servidor: `trim`, de 2 a 40 caracteres, sin saltos de línea ni caracteres de control. Se envía en el `signUp` como `data.full_name`. No cambies la confirmación por correo ni `ALLOWED_EMAILS`.
2. Cuentas existentes sin nombre: en el Inicio aparece una tarjeta pequeña "¿Cómo te llamamos?" con campo y botón "Guardar". Al guardar se actualiza `full_name` en el servidor, con el usuario SIEMPRE tomado de la sesión verificada (nunca del cuerpo de la petición) y con 401/403 como el resto. Después la tarjeta desaparece y queda un enlace discreto "Cambiar mi nombre".
3. Función de nombre para mostrar: `user_metadata.full_name`, luego `user_metadata.name`, y si no hay ninguno, la parte del correo antes de la @ con la primera letra en mayúscula. Nunca muestra el correo completo. El saludo del Inicio la usa.
4. Seguridad: el nombre es SOLO para mostrar. No decide permisos ni acceso, no va a logs ni a errores, y se muestra como texto sin HTML.
5. Interfaz: textos en español, etiquetas en los campos, foco visible, zonas táctiles de 44 px. Error claro: "Escribe cómo quieres que te llamemos, entre 2 y 40 letras".
6. Pruebas (Vitest):
   - registro sin nombre rechazado;
   - nombre de solo espacios, de 1 o de 41 caracteres rechazado;
   - el nombre válido se envía como `full_name`;
   - la función de nombre (`full_name`, `name`, correo con mayúscula inicial, sin mostrar el correo completo);
   - guardar exige sesión (401/403) y toma el usuario de la sesión;
   - la tarjeta aparece solo si falta el nombre.

## CIERRE (al terminar las dos partes)

1. Corre uno por uno con `npm.cmd` `type-check`, `lint`, `test` y `build`, con el servidor apagado.
2. Arranca el servidor en el puerto 3000 y dame el enlace (no corras build ni tests mientras esté encendido).
3. Explícame en palabras simples qué cambiaste y cuál era la causa del error del reporte.
4. NO hagas commit hasta que yo escriba CONFIRMADO.

## CUANDO YO ESCRIBA "CONFIRMADO"

1. Apaga el servidor y muéstrame `git status`.
2. Si el menú con "Más" y "Proveedores" todavía tiene cambios sin commit (revisa `git log`), haz primero un commit APARTE solo con esos archivos:
   `feat(ui): menú con "Más" y renombrar Compras a Proveedores`
3. Luego un commit con todos los cambios de las Partes 1 y 2:
   `feat(home): inicio con reporte del día y nombre al registrarse`
4. Si `doc/` tiene cambios de documentación sin commit (incluido este archivo `doc/TAREA_INICIO_Y_NOMBRE.md`), haz un commit aparte solo con esos archivos:
   `docs: actualizar estado y decisiones de diseño`
5. No incluyas `data/product.json` ni `.env.local`. Si hay otro archivo que no encaje en ninguno, no lo incluyas y dímelo.
6. No hagas push. Muéstrame `git status` y `git log --oneline -5`.