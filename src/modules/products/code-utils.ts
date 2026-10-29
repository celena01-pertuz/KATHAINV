export function normalizeProductCode(code: string): string {
  return code.replace(/\s+/g, '').toLocaleUpperCase('es-CO');
}
