import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  count,
  create,
  getAll,
  getById,
  query,
  remove,
  update,
} from '../json-db';
import type { ProductRecord } from '../../../data/_schema/product.schema';
import type { BaseRecord } from '../types';

type TmpRecord = BaseRecord & {
  name: string;
  active: boolean;
};

const COLLECTION = 'tmp_example';
const FIXTURE = {
  _meta: {
    version: 1,
    lastModified: '2026-10-03T00:00:00.000Z',
    description: 'fixture temporal',
  },
  records: [
    {
      id: 'tmp_001',
      createdAt: '2026-10-03T00:00:00.000Z',
      updatedAt: '2026-10-03T00:00:00.000Z',
      name: 'Alpha',
      active: true,
    },
    {
      id: 'tmp_002',
      createdAt: '2026-10-03T00:00:00.000Z',
      updatedAt: '2026-10-03T00:00:00.000Z',
      name: 'Bravo',
      active: false,
    },
  ],
};

let tempRoot: string;

beforeEach(async () => {
  tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'kathainv-json-db-'));
  vi.spyOn(process, 'cwd').mockReturnValue(tempRoot);
  const dataDirectory = path.resolve(tempRoot, 'data');
  await fs.mkdir(dataDirectory, { recursive: true });
  await fs.writeFile(path.resolve(dataDirectory, `${COLLECTION}.json`), JSON.stringify(FIXTURE, null, 2), 'utf8');
});

afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  await fs.rm(tempRoot, { recursive: true, force: true });
});

describe('json-db', () => {
  it('getAll devuelve todos los registros', async () => {
    const result = await getAll<TmpRecord>(COLLECTION);

    expect(result.total).toBe(2);
    expect(result.data).toHaveLength(2);
  });

  it('getById devuelve el registro correcto', async () => {
    const record = await getById<TmpRecord>(COLLECTION, 'tmp_001');

    expect(record?.name).toBe('Alpha');
  });

  it('getById devuelve null si el ID no existe', async () => {
    await expect(getById<TmpRecord>(COLLECTION, 'missing')).resolves.toBeNull();
  });

  it('create inserta un nuevo registro', async () => {
    const record = await create<TmpRecord>(COLLECTION, {
      name: 'Charlie',
      active: true,
    });

    expect(record.id).toMatch(/^tmp_[a-z0-9]+$/i);
    expect(record.createdAt).toBeDefined();
    expect(record.updatedAt).toBeDefined();
  });

  it('update modifica campos parciales', async () => {
    const updated = await update<TmpRecord>(COLLECTION, 'tmp_001', { name: 'Gamma' });

    expect(updated?.name).toBe('Gamma');
    expect(updated?.updatedAt).not.toBe('2026-10-03T00:00:00.000Z');
  });

  it('remove elimina el registro y query filtra', async () => {
    await remove(COLLECTION, 'tmp_002');
    const activeItems = await query<TmpRecord>(COLLECTION, (item) => item.active === true);

    expect(activeItems).toHaveLength(1);
    expect(await getById<TmpRecord>(COLLECTION, 'tmp_002')).toBeNull();
  });

  it('count devuelve la cantidad correcta', async () => {
    expect(await count(COLLECTION)).toBe(2);
  });

  it('count refleja una creación y una eliminación', async () => {
    const created = await create<TmpRecord>(COLLECTION, {
      name: 'Charlie',
      active: true,
    });

    expect(await count(COLLECTION)).toBe(3);

    await remove(COLLECTION, created.id);

    expect(await count(COLLECTION)).toBe(2);
  });

  it('genera un backup por cada escritura', async () => {
    vi.spyOn(Date, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(2000);
    const created = await create<TmpRecord>(COLLECTION, {
      name: 'Charlie',
      active: true,
    });
    await update<TmpRecord>(COLLECTION, created.id, { name: 'Delta' });

    const backupDirectory = path.resolve(tempRoot, 'data', '_backups');
    const backupFiles = await fs.readdir(backupDirectory);

    expect(backupFiles).toHaveLength(2);
    expect(backupFiles).toEqual(expect.arrayContaining(['tmp_example_1000.json', 'tmp_example_2000.json']));

    const firstBackup = JSON.parse(
      await fs.readFile(path.resolve(backupDirectory, 'tmp_example_1000.json'), 'utf8'),
    );
    const secondBackup = JSON.parse(
      await fs.readFile(path.resolve(backupDirectory, 'tmp_example_2000.json'), 'utf8'),
    );

    expect(firstBackup.records).toHaveLength(2);
    expect(secondBackup.records).toHaveLength(3);
  });

  it('rechaza datos de producto inválidos según el esquema Zod', async () => {
    await expect(
      create<ProductRecord>('product', {
        code: 'KAT-001',
        name: 'Blusa',
        category: 'ropa',
        size: 'M',
        color: 'Negro',
        price: -1,
        stock: 5,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('bloquea escrituras cuando NODE_ENV es production', async () => {
    const collectionPath = path.resolve(tempRoot, 'data', `${COLLECTION}.json`);
    const originalContent = await fs.readFile(collectionPath, 'utf8');
    vi.stubEnv('NODE_ENV', 'production');

    await expect(
      create<TmpRecord>(COLLECTION, {
        name: 'Charlie',
        active: true,
      }),
    ).rejects.toMatchObject({ code: 'READ_ONLY' });

    expect(await fs.readFile(collectionPath, 'utf8')).toBe(originalContent);
    await expect(fs.access(path.resolve(tempRoot, 'data', '_backups'))).rejects.toThrow();
  });
});
