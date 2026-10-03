import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
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
import type { BaseRecord } from '../types';

type TmpRecord = BaseRecord & {
  name: string;
  active: boolean;
};

const COLLECTION = 'tmp_example';
const collectionPath = path.resolve(process.cwd(), 'data', `${COLLECTION}.json`);

beforeEach(async () => {
  await fs.mkdir(path.resolve(process.cwd(), 'data'), { recursive: true });
  await fs.writeFile(
    collectionPath,
    JSON.stringify(
      {
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
      },
      null,
      2,
    ),
    'utf8',
  );
});

afterEach(async () => {
  await fs.rm(collectionPath, { force: true });
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
});
