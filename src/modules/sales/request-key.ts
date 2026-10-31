export function createSaleRequestKey(): string {
  return globalThis.crypto.randomUUID();
}
