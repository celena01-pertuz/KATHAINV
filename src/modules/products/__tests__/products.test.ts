import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { productCreateSchema, productRecordSchema } from '@data/_schema/product.schema';
import {
  createProduct,
  getProduct,
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
  vi.stubEnv('PRODUCTS_REPOSITORY', 'json');
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
  it('genera consecutivos sin eliminar el producto desactivado', async () => {
    const first = await createProduct({ ...validInput, stock: 0 });
    expect(first.code).toBe('KAT-000001');
    await removeOrDeactivateProduct(first.id);
    await expect(getProduct(first.id)).resolves.toMatchObject({ active: false });

    const second = await createProduct({ ...validInput, name: 'Camisa' });
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

  it('rechaza referencias duplicadas al crear ignorando mayúsculas y bordes con espacios', async () => {
    await createProduct({
      ...validInput,
      code: 'REF-01',
      name: 'Blusa',
      size: 'M',
      color: 'Negro',
    });

    await expect(
      createProduct({
        ...validInput,
        code: 'REF-02',
        variantGroupId: 'otro-grupo',
        name: '  BLUSA  ',
        size: ' m ',
        color: 'NEGRO ',
      }),
    ).rejects.toMatchObject({
      code: 'REFERENCIA_DUPLICADA',
      message:
        'Ya existe un producto con ese nombre, talla y color. Para sumar unidades registra una compra en Proveedores.',
    });
  });

  it('rechaza referencias duplicadas al editar otro producto', async () => {
    await createProduct({ ...validInput, code: 'REF-11' });
    const second = await createProduct({
      ...validInput,
      code: 'REF-12',
      size: 'L',
    });

    await expect(
      updateProduct(second.id, {
        ...second,
        name: '  BLUSA ',
        size: ' M ',
        color: ' negro',
      }),
    ).rejects.toMatchObject({ code: 'REFERENCIA_DUPLICADA' });
  });

  it('no desactiva productos con existencias', async () => {
    const product = await createProduct(validInput);

    await expect(removeOrDeactivateProduct(product.id)).rejects.toMatchObject({
      code: 'PRODUCTO_CON_EXISTENCIAS',
      message: 'Este producto todavía tiene unidades. Déjalo en 0 antes de desactivarlo.',
    });
  });

  it('desactiva sin borrar un producto con movimientos cuando el stock es cero', async () => {
    const product = await createProduct({ ...validInput, stock: 0 });
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
    await expect(getProduct(product.id)).resolves.toMatchObject({ active: false, stock: 0 });
    await expect(
      updateProduct(product.id, { ...product, active: true }),
    ).resolves.toMatchObject({ active: true });
  });
});

describe('esquema de producto', () => {
  it('rechaza dinero decimal', () => {
    expect(productCreateSchema.safeParse({ ...validInput, salePrice: 10.5 }).success).toBe(false);
  });

  it.each(['name', 'size', 'color'] as const)(
    'rechaza %s vacío o con solo espacios al crear',
    (field) => {
      for (const value of ['', '   ']) {
        expect(productCreateSchema.safeParse({ ...validInput, [field]: value }).success).toBe(
          false,
        );
      }
    },
  );

  it.each(['name', 'size', 'color'] as const)(
    'rechaza %s vacío o con solo espacios al editar',
    (field) => {
      const record = {
        id: 'product_1',
        createdAt: '2026-10-28T00:00:00.000Z',
        updatedAt: '2026-10-28T00:00:00.000Z',
        code: 'KAT-000001',
        codeType: 'internal',
        variantGroupId: 'variant_1',
        ...validInput,
      };

      for (const value of ['', '   ']) {
        expect(productRecordSchema.safeParse({ ...record, [field]: value }).success).toBe(false);
      }
    },
  );

  it('acepta talla Única para bolsos y accesorios', () => {
    for (const category of ['bolso', 'accesorio'] as const) {
      expect(
        productCreateSchema.safeParse({ ...validInput, category, size: 'Única' }).success,
      ).toBe(true);
    }
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
