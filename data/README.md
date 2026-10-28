# Capa de datos JSON de KathaInv

Cada archivo `.json` de esta carpeta representa una colección. Los archivos tienen
metadatos en `_meta` y los registros en `records`. Cada registro incluye `id`,
`createdAt` y `updatedAt`, además de los campos propios de su colección.

## Cómo funciona el motor

El motor de `src/lib/json-db.ts` realiza las operaciones sobre estos archivos:

- **Leer:** `getAll` lista y permite paginar/ordenar; `getById` busca por ID;
  `query` filtra con un predicado y `count` devuelve el total. Si el archivo de
  colección no existe, el motor lo inicializa vacío.
- **Crear:** `create` genera el ID y las fechas, valida el registro con el
  esquema Zod registrado y lo agrega a la colección.
- **Actualizar:** `update` mezcla los campos recibidos con el registro existente
  y renueva `updatedAt`.
- **Eliminar:** `remove` elimina el registro que coincide con el ID.
- **Backups:** antes de escribir, el motor copia el archivo actual a
  `data/_backups/<coleccion>_<timestamp>.json`. Si todavía no hay un archivo
  previo que copiar, la escritura continúa sin backup.

Las escrituras se serializan por colección. Todas las operaciones de persistencia
deben pasar por este motor; no se deben leer ni modificar los archivos de datos
directamente desde los módulos.

## Colecciones de KathaInv

Todos los registros tienen también `id`, `createdAt` y `updatedAt`.

| Colección | Archivo | Campos propios |
|---|---|---|
| `product` | `product.json` | `code` (texto no vacío), `name`, `category` (`ropa`, `calzado`, `bolso` o `accesorio`), `size`, `color`, `price` (número positivo), `stock` (entero desde 0) |
| `supplier` | `supplier.json` | `name` |
| `purchase` | `purchase.json` | `productCode`, `supplierId`, `quantity` (entero positivo), `total`, `date` (fecha ISO `YYYY-MM-DD`) |
| `sale` | `sale.json` | `productCode`, `quantity` (entero positivo), `total`, `date` (fecha ISO `YYYY-MM-DD`) |

## Crear una colección nueva

1. Crea `data/<coleccion>.json` con `_meta` (`version`, `lastModified` y
   `description`) y `records: []`.
2. Crea `data/_schema/<coleccion>.schema.ts`. Importa `baseRecordSchema` desde
   `base.schema.ts`, extiéndelo con los campos y validaciones de la colección y,
   si es útil, exporta el tipo inferido con `z.infer`.
3. Importa el esquema en `data/_schema/registry.ts` y agrégalo a
   `schemaRegistry` con la misma clave que el nombre del archivo, sin `.json`.
4. Verifica que las operaciones que escriben y la API usen el esquema registrado.
5. Agrega pruebas para las validaciones y operaciones de la colección.

## Códigos de error

El motor define `JsonDBErrorCode` en `src/lib/json-db.ts`:

| Código | Significado |
|---|---|
| `NOT_FOUND` | Código previsto para un recurso inexistente. En el motor actual, `getById` y `update` devuelven `null`, y `remove` devuelve `false`, en vez de lanzar este error. |
| `DUPLICATE_ID` | El ID generado ya existe en la colección. |
| `VALIDATION_ERROR` | El nombre, el formato de la colección o un registro no pasa la validación correspondiente. |
| `IO_ERROR` | No se pudo leer o escribir un archivo de colección. |
| `READ_ONLY` | Se intentó escribir cuando `NODE_ENV` es `production`. |

## Limitaciones conocidas

En Vercel, los archivos del proyecto son de solo lectura. Por eso no se pueden
guardar cambios en los JSON de datos durante producción: las operaciones de
escritura lanzan el error `READ_ONLY`. El almacenamiento persistente para
producción queda pendiente de una solución alternativa.
