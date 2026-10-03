export function generateId(prefix: string): string {
  const safePrefix = prefix.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase();
  const value = globalThis.crypto?.randomUUID?.().split('-')[0] ?? `${Date.now()}`;
  return `${safePrefix || 'item'}_${value}`;
}

export function now(): string {
  return new Date().toISOString();
}

export function deepClone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

export function safeJsonParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
