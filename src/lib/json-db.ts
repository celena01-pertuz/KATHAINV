import { promises as fs } from 'node:fs';
import path from 'node:path';
import type {
  BaseRecord,
  CollectionFile,
  CreateInput,
  QueryOptions,
  QueryResult,
  UpdateInput,
} from './types';
import { deepClone, generateId, now, safeJsonParse } from './utils';
import { getSchema } from '../../data/_schema/registry';

export type JsonDBErrorCode =
  | 'NOT_FOUND'
  | 'DUPLICATE_ID'
  | 'VALIDATION_ERROR'
  | 'IO_ERROR'
  | 'READ_ONLY';

export class JsonDBError extends Error {
  code: JsonDBErrorCode;

  constructor(code: JsonDBErrorCode, message: string) {
    super(message);
    this.name = 'JsonDBError';
    this.code = code;
  }
}

const locks = new Map<string, Promise<void>>();

function normalizeCollectionName(name: string): string {
  const cleaned = String(name || '').replace(/\.json$/i, '').trim();

  if (!cleaned) {
    throw new JsonDBError('VALIDATION_ERROR', 'El nombre de la colección es obligatorio.');
  }

  return cleaned;
}

function resolveCollectionPath(name: string): string {
  const collectionName = normalizeCollectionName(name);
  return path.resolve(process.cwd(), 'data', `${collectionName}.json`);
}

function getCollectionPrefix(name: string): string {
  const normalized = normalizeCollectionName(name)
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();

  return normalized.split('_')[0] || 'item';
}

async function ensureCollectionFile(name: string): Promise<void> {
  const filePath = resolveCollectionPath(name);
  const directory = path.dirname(filePath);
  await fs.mkdir(directory, { recursive: true });

  try {
    await fs.access(filePath);
  } catch {
    const payload: CollectionFile = {
      _meta: {
        version: 1,
        lastModified: now(),
        description: `Colección ${normalizeCollectionName(name)}`,
      },
      records: [],
    };

    await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
  }
}

async function readCollection<T extends BaseRecord>(name: string): Promise<CollectionFile<T>> {
  await ensureCollectionFile(name);
  const filePath = resolveCollectionPath(name);

  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = safeJsonParse<CollectionFile<T>>(raw);
    if (!parsed || !Array.isArray(parsed.records)) {
      throw new JsonDBError('VALIDATION_ERROR', `La colección ${name} tiene un formato inválido.`);
    }

    return parsed;
  } catch (error) {
    if (error instanceof JsonDBError) {
      throw error;
    }

    throw new JsonDBError('IO_ERROR', `No se pudo leer la colección ${name}.`);
  }
}

async function writeCollection<T extends BaseRecord>(name: string, payload: CollectionFile<T>): Promise<void> {
  const filePath = resolveCollectionPath(name);

  if (process.env.NODE_ENV === 'production') {
    throw new JsonDBError('READ_ONLY', 'No se permiten escrituras en producción.');
  }

  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.mkdir(path.resolve(process.cwd(), 'data', '_backups'), { recursive: true });

    const backupFile = path.resolve(
      process.cwd(),
      'data',
      '_backups',
      `${normalizeCollectionName(name)}_${Date.now()}.json`,
    );

    try {
      await fs.copyFile(filePath, backupFile);
    } catch {
      // Ignora backups si el archivo no existe todavía.
    }

    const nextPayload: CollectionFile<T> = {
      ...deepClone(payload),
      _meta: {
        ...payload._meta,
        lastModified: now(),
      },
    };

    await fs.writeFile(filePath, JSON.stringify(nextPayload, null, 2), 'utf8');
  } catch (error) {
    if (error instanceof JsonDBError) {
      throw error;
    }

    throw new JsonDBError('IO_ERROR', `No se pudo escribir la colección ${name}.`);
  }
}

async function withWriteLock<T>(name: string, operation: () => Promise<T>): Promise<T> {
  const normalized = normalizeCollectionName(name);
  const previous = locks.get(normalized) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });

  locks.set(normalized, previous.then(() => current));

  try {
    await previous;
    return await operation();
  } finally {
    release();
    if (locks.get(normalized) === current) {
      locks.delete(normalized);
    }
  }
}

function validateRecord<T extends BaseRecord>(name: string, record: Partial<T>): void {
  const schema = getSchema(name);
  if (!schema) {
    return;
  }

  const result = schema.safeParse(record);
  if (!result.success) {
    throw new JsonDBError('VALIDATION_ERROR', result.error.issues.map((issue) => issue.message).join(', '));
  }
}

export async function getAll<T extends BaseRecord>(
  name: string,
  options: QueryOptions = {},
): Promise<QueryResult<T>> {
  const collection = await readCollection<T>(name);
  const { limit, offset = 0, sortBy, sortOrder = 'asc' } = options;
  const records = [...collection.records];

  if (sortBy) {
    records.sort((a, b) => {
      const left = a[sortBy as keyof T] as string | number | boolean | undefined;
      const right = b[sortBy as keyof T] as string | number | boolean | undefined;
      const value = String(left ?? '').localeCompare(String(right ?? ''));
      return sortOrder === 'desc' ? value * -1 : value;
    });
  }

  const total = records.length;
  const safeLimit = typeof limit === 'number' ? Math.max(0, limit) : total;
  const start = Math.max(0, offset);
  const end = safeLimit === 0 ? start : start + safeLimit;
  const paginated = records.slice(start, end);

  return {
    data: paginated,
    total,
    limit: safeLimit,
    offset: start,
    records: paginated,
  };
}

export async function getById<T extends BaseRecord>(name: string, id: string): Promise<T | null> {
  const collection = await readCollection<T>(name);
  return collection.records.find((record) => record.id === id) ?? null;
}

export async function create<T extends BaseRecord>(
  name: string,
  input: CreateInput<T>,
): Promise<T> {
  return withWriteLock(name, async () => {
    const collection = await readCollection<T>(name);
    const baseInput = input as Record<string, unknown>;
    const record = {
      ...(baseInput as T),
      id: generateId(getCollectionPrefix(name)),
      createdAt: now(),
      updatedAt: now(),
    } as T;

    validateRecord(name, record);

    if (collection.records.some((item) => item.id === record.id)) {
      throw new JsonDBError('DUPLICATE_ID', `El registro ${record.id} ya existe.`);
    }

    collection.records.push(record);
    collection._meta.lastModified = now();

    await writeCollection(name, collection);
    return record;
  });
}

export async function update<T extends BaseRecord>(
  name: string,
  id: string,
  partial: UpdateInput<T>,
): Promise<T | null> {
  return withWriteLock(name, async () => {
    const collection = await readCollection<T>(name);
    const index = collection.records.findIndex((record) => record.id === id);

    if (index === -1) {
      return null;
    }

    const updatedRecord = {
      ...collection.records[index],
      ...partial,
      updatedAt: now(),
    } as T;

    validateRecord(name, updatedRecord);
    collection.records[index] = updatedRecord;
    collection._meta.lastModified = now();

    await writeCollection(name, collection);
    return updatedRecord;
  });
}

export async function remove(name: string, id: string): Promise<boolean> {
  return withWriteLock(name, async () => {
    const collection = await readCollection(name);
    const initialLength = collection.records.length;
    collection.records = collection.records.filter((record) => record.id !== id);

    if (collection.records.length === initialLength) {
      return false;
    }

    collection._meta.lastModified = now();
    await writeCollection(name, collection);
    return true;
  });
}

export async function query<T extends BaseRecord>(
  name: string,
  predicate: (record: T) => boolean,
): Promise<T[]> {
  const collection = await readCollection<T>(name);
  return collection.records.filter(predicate);
}

export async function count(name: string): Promise<number> {
  const collection = await readCollection(name);
  return collection.records.length;
}
