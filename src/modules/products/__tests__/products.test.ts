import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { productCreateSchema, productRecordSchema } from '@data/_schema/product.schema';
import {
  createProduct,
  normalizeProductCode,
  removeOrDeactivateProduct,
  updateProduct,
} from '../service';
import type { ProductCreateInput, ProductInput } from '../types';

let tempRoot: string;

const validInput: ProductCreateInput = {
  name: 'Blusa',
  category: 'ropa',
  size: 'M',
  color: 'Negro',
  costPrice: 30000,
  salePrice: 55000,
  stock: 5,
  minStock: 1,
  active: true,
};

async function writeCollection(name: string, records: unknown[] = []) {
  const file = {
    _meta: {
      version: 1,
      lastModified: '2026-10-28T00:00:00.000Z',
      description: name,
    },
    records,
  };
  await fs.writeFile(path.resolve(tempRoot, 'data', `${name}.json`), JSON.stringify(file), 'utf8');
}

beforeEach(async () => {
  tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'kathainv-products-'));
  vi.spyOn(process, 'cwd').mockReturnValue(tempRoot);
  await fs.mkdir(path.resolve(tempRoot, 'data'), { recursive: true });
  await writeCollection('product');
  await writeCollection('purchase');
  await writeCollection('sale');
});

afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  await fs.rm(tempRoot, { recursive: true, force: true });
});

describe('servicio de productos', () => {
  it('genera consecutivos y no reutiliza el número después de eliminar', async () => {
    const first = await createProduct(validInput);
    expect(first.code).toBe('KAT-000001');
    await removeOrDeactivateProduct(first.id);

    const second = await createProduct(validInput);
    expect(second.code).toBe('KAT-000002');
  });

  it('normaliza códigos ignorando espacios y mayúsculas', () => {
    expect(normalizeProductCode(' kat - 000123 ')).toBe('KAT-000123');
  });

  it('rechaza códigos duplicados al crear aunque cambien espacios o mayúsculas', async () => {
    await createProduct({ ...validInput, code: 'Fábrica 01' });
    await expect(createProduct({ ...validInput, code: 'fábrica01' })).rejects.toMatchObject({
      code: 'DUPLICATE_CODE',
    });
  });

  it('rechaza códigos duplicados al editar otro producto', async () => {
    const first = await createProduct({ ...validInput, code: 'BAR-01' });
    const second = await createProduct({ ...validInput, code: 'BAR-02', size: 'L' });
    const attemptedUpdate: ProductInput = {
      code: first.code,
      codeType: first.codeType,
      variantGroupId: second.variantGroupId,
      name: second.name,
      category: second.category,
      size: second.size,
      color: second.color,
      costPrice: second.costPrice,
      salePrice: second.salePrice,
      stock: second.stock,
      minStock: second.minStock,
      active: second.active,
    };

    await expect(updateProduct(second.id, attemptedUpdate)).rejects.toMatchObject({
      code: 'DUPLICATE_CODE',
    });
  });

  it('desactiva en vez de eliminar un producto con movimientos', async () => {
    const product = await createProduct(validInput);
    await writeCollection('sale', [
      {
        id: 'sale_1',
        createdAt: '2026-10-28T00:00:00.000Z',
        updatedAt: '2026-10-28T00:00:00.000Z',
        productCode: product.code,
        quantity: 1,
        total: product.salePrice,
        date: '2026-10-28',
      },
    ]);

    await expect(removeOrDeactivateProduct(product.id)).resolves.toEqual({
      deleted: false,
      deactivated: true,
    });
  });
});

describe('esquema de producto', () => {
  it('rechaza dinero decimal', () => {
    expect(productCreateSchema.safeParse({ ...validInput, salePrice: 10.5 }).success).toBe(false);
  });

  it('requiere talla para ropa y calzado', () => {
    expect(productCreateSchema.safeParse({ ...validInput, size: '' }).success).toBe(false);
    expect(productCreateSchema.safeParse({ ...validInput, color: '' }).success).toBe(false);
    expect(
      productCreateSchema.safeParse({ ...validInput, category: 'calzado', size: '' }).success,
    ).toBe(false);
  });

  it('acepta variantes sin talla en categorías que no la usan', () => {
    expect(
      productCreateSchema.safeParse({
        ...validInput,
        category: 'bolso',
        size: '',
      }).success,
    ).toBe(true);
  });

  it('requiere códigos, precios de venta y existencias enteras no negativas en el registro', () => {
    const record = {
      id: 'product_1',
      createdAt: '2026-10-28T00:00:00.000Z',
      updatedAt: '2026-10-28T00:00:00.000Z',
      code: 'KAT-000001',
      codeType: 'internal',
      variantGroupId: 'variant_1',
      ...validInput,
    };
    expect(productRecordSchema.safeParse({ ...record, stock: -1 }).success).toBe(false);
    expect(productRecordSchema.safeParse({ ...record, costPrice: 100.25 }).success).toBe(false);
    expect(productRecordSchema.safeParse({ ...record, salePrice: 0 }).success).toBe(false);
  });
});
