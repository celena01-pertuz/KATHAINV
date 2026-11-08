import type { ProductRecord } from './types';

export const PRODUCTO_CON_EXISTENCIAS_MESSAGE =
  'Este producto todavía tiene unidades. Déjalo en 0 antes de desactivarlo.';
export const REFERENCIA_DUPLICADA_MESSAGE =
  'Ya existe un producto con ese nombre, talla y color. Para sumar unidades registra una compra en Proveedores.';

type ProductReference = Pick<ProductRecord, 'name' | 'size' | 'color'>;

function normalizeReferencePart(value: string): string {
  return value.trim().toLocaleLowerCase('es-CO');
}

export function hasDuplicateProductReference(
  products: ProductRecord[],
  candidate: ProductReference,
  exceptId?: string,
): boolean {
  const name = normalizeReferencePart(candidate.name);
  const size = normalizeReferencePart(candidate.size);
  const color = normalizeReferencePart(candidate.color);

  return products.some(
    (product) =>
      product.id !== exceptId &&
      normalizeReferencePart(product.name) === name &&
      normalizeReferencePart(product.size) === size &&
      normalizeReferencePart(product.color) === color,
  );
}
