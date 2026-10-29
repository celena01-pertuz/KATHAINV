'use client';

import { useEffect, useState, type FormEvent } from 'react';
import type { ProductRecord } from '../types';

type ProductFormValues = Partial<ProductRecord> & { variantGroupId?: string };

const categories = ['ropa', 'calzado', 'bolso', 'accesorio'] as const;

function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount);
}

async function readApiError(response: Response): Promise<string> {
  const body = (await response.json()) as { error?: string };
  return body.error ?? 'No se pudo completar la operación.';
}

export function ProductManager() {
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sizeFilter, setSizeFilter] = useState('');
  const [colorFilter, setColorFilter] = useState('');
  const [formProduct, setFormProduct] = useState<ProductFormValues | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadProducts() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/data/products', { cache: 'no-store' });
      if (!response.ok) throw new Error(await readApiError(response));
      const body = (await response.json()) as { data: { data: ProductRecord[] } };
      setProducts(body.data.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los productos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProducts();
  }, []);

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const editing = Boolean(formProduct?.id);
    const payload = {
      ...(editing ? formProduct : {}),
      ...(formProduct?.variantGroupId ? { variantGroupId: formProduct.variantGroupId } : {}),
      code: String(formData.get('code') ?? ''),
      name: String(formData.get('name') ?? ''),
      category: String(formData.get('category') ?? ''),
      size: String(formData.get('size') ?? ''),
      color: String(formData.get('color') ?? ''),
      costPrice: Number(formData.get('costPrice')),
      salePrice: Number(formData.get('salePrice')),
      stock: Number(formData.get('stock')),
      minStock: Number(formData.get('minStock')),
      active: formData.get('active') === 'on',
    };

    try {
      const response = await fetch('/api/data/products', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(await readApiError(response));
      setFormProduct(null);
      setNotice(editing ? 'Producto actualizado.' : 'Producto creado.');
      await loadProducts();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el producto.');
    }
  }

  async function deleteProduct(product: ProductRecord) {
    if (!window.confirm(`¿Eliminar o desactivar "${product.name}" (${product.code})?`)) return;
    setError('');
    try {
      const response = await fetch(`/api/data/products?id=${encodeURIComponent(product.id)}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error(await readApiError(response));
      const body = (await response.json()) as {
        data: { deleted: boolean; deactivated: boolean };
      };
      setNotice(
        body.data.deactivated
          ? 'El producto tenía movimientos y se desactivó; su historial se conserva.'
          : 'Producto eliminado definitivamente.',
      );
      await loadProducts();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar el producto.');
    }
  }

  const visibleProducts = products.filter((product) => {
    const needle = search.trim().toLocaleLowerCase('es-CO');
    return (
      (!needle ||
        product.name.toLocaleLowerCase('es-CO').includes(needle) ||
        product.code
          .replace(/\s+/g, '')
          .toLocaleLowerCase('es-CO')
          .includes(needle.replace(/\s+/g, ''))) &&
      (!categoryFilter || product.category === categoryFilter) &&
      (!sizeFilter || product.size === sizeFilter) &&
      (!colorFilter || product.color === colorFilter)
    );
  });
  const sizes = [...new Set(products.map((product) => product.size).filter(Boolean))].sort();
  const colors = [...new Set(products.map((product) => product.color).filter(Boolean))].sort();

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-16">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Productos</h1>
          <p className="mt-1 text-sm text-muted">Administra productos y variantes de inventario.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setNotice('');
            setFormProduct({});
          }}
          className="min-h-12 rounded-md bg-primary px-4 font-semibold text-primary-foreground"
        >
          Nuevo producto
        </button>
      </header>

      {notice && <p className="mb-4 rounded-md bg-success/10 p-3 text-sm">{notice}</p>}
      {error && (
        <p role="alert" className="mb-4 rounded-md bg-danger/10 p-3 text-sm">
          {error}
        </p>
      )}

      {formProduct && (
        <ProductForm
          product={formProduct}
          onCancel={() => setFormProduct(null)}
          onSubmit={saveProduct}
        />
      )}

      <label className="mb-4 block">
        <span className="mb-1 block text-sm font-medium">Buscar por nombre o código</span>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="min-h-12 w-full rounded-md border border-border bg-surface px-3"
          placeholder="Ej. Blusa o KAT-000123"
        />
      </label>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <label>
          <span className="mb-1 block text-sm font-medium">Categoría</span>
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="min-h-11 w-full rounded-md border border-border bg-surface px-3"
          >
            <option value="">Todas las categorías</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category[0]?.toUpperCase()}{category.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium">Talla</span>
          <select
            value={sizeFilter}
            onChange={(event) => setSizeFilter(event.target.value)}
            className="min-h-11 w-full rounded-md border border-border bg-surface px-3"
          >
            <option value="">Todas las tallas</option>
            {sizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium">Color</span>
          <select
            value={colorFilter}
            onChange={(event) => setColorFilter(event.target.value)}
            className="min-h-11 w-full rounded-md border border-border bg-surface px-3"
          >
            <option value="">Todos los colores</option>
            {colors.map((color) => (
              <option key={color} value={color}>
                {color}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <p role="status">Cargando productos…</p>
      ) : visibleProducts.length === 0 ? (
        <p className="rounded-md border border-border bg-surface p-5 text-sm">
          No hay productos que coincidan con la búsqueda.
        </p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {visibleProducts.map((product) => (
            <li
              key={product.id}
              className="rounded-lg border border-border bg-surface p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{product.name}</h2>
                  <p className="text-sm text-muted">
                    {product.code} · {product.category}
                    {product.size ? ` · Talla ${product.size}` : ''}
                    {product.color ? ` · ${product.color}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {products.filter((item) => item.variantGroupId === product.variantGroupId).length}{' '}
                    variante(s) en este producto
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    product.active ? 'bg-success/10 text-success' : 'bg-background text-muted'
                  }`}
                >
                  {product.active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-muted">Costo</dt>
                  <dd>{formatCOP(product.costPrice)}</dd>
                </div>
                <div>
                  <dt className="text-muted">Venta</dt>
                  <dd>{formatCOP(product.salePrice)}</dd>
                </div>
                <div>
                  <dt className="text-muted">Stock</dt>
                  <dd>
                    {product.stock} (mínimo {product.minStock})
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Código</dt>
                  <dd>{product.codeType === 'internal' ? 'Interno' : 'Fábrica'}</dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="min-h-10 rounded-md border border-border px-3 text-sm"
                  onClick={() => {
                    setNotice('');
                    setFormProduct(product);
                  }}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="min-h-10 rounded-md border border-border px-3 text-sm"
                  onClick={() => {
                    setNotice('');
                    setFormProduct({
                      ...product,
                      id: undefined,
                      code: '',
                      size: '',
                      color: '',
                      stock: 0,
                    });
                  }}
                >
                  Agregar variante
                </button>
                <button
                  type="button"
                  className="min-h-10 rounded-md border border-danger px-3 text-sm text-danger"
                  onClick={() => void deleteProduct(product)}
                >
                  Eliminar / desactivar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function ProductForm({
  product,
  onCancel,
  onSubmit,
}: {
  product: ProductFormValues;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const editing = Boolean(product.id);
  return (
    <form
      onSubmit={onSubmit}
      className="mb-6 grid gap-3 rounded-lg border border-border bg-surface p-4 sm:grid-cols-2"
    >
      <h2 className="text-lg font-semibold sm:col-span-2">
        {editing ? 'Editar producto o variante' : 'Crear producto o variante'}
      </h2>
      {product.variantGroupId && (
        <input type="hidden" name="variantGroupId" value={product.variantGroupId} />
      )}
      <label className="sm:col-span-2">
        <span className="mb-1 block text-sm">
          Código del producto{editing ? '' : ' (de fábrica, opcional)'}
        </span>
        <input
          name="code"
          defaultValue={product.code ?? ''}
          className="min-h-11 w-full rounded-md border border-border bg-background px-3"
          placeholder={editing ? undefined : 'Vacío = generar KAT consecutivo'}
        />
      </label>
      <label>
        <span className="mb-1 block text-sm">Nombre del producto</span>
        <input
          name="name"
          required
          defaultValue={product.name ?? ''}
          className="min-h-11 w-full rounded-md border border-border bg-background px-3"
        />
      </label>
      <label>
        <span className="mb-1 block text-sm">Categoría</span>
        <select
          name="category"
          required
          defaultValue={product.category ?? 'ropa'}
          className="min-h-11 w-full rounded-md border border-border bg-background px-3"
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {category[0]?.toUpperCase()}{category.slice(1)}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="mb-1 block text-sm">Talla</span>
        <input
          name="size"
          defaultValue={product.size ?? ''}
          className="min-h-11 w-full rounded-md border border-border bg-background px-3"
          placeholder="Ej. S, M, 38"
        />
      </label>
      <label>
        <span className="mb-1 block text-sm">Color</span>
        <input
          name="color"
          defaultValue={product.color ?? ''}
          className="min-h-11 w-full rounded-md border border-border bg-background px-3"
        />
      </label>
      <label>
        <span className="mb-1 block text-sm">Costo de compra (COP, pesos enteros)</span>
        <input
          name="costPrice"
          type="number"
          min="0"
          step="1"
          required
          defaultValue={product.costPrice ?? 0}
          className="min-h-11 w-full rounded-md border border-border bg-background px-3"
        />
      </label>
      <label>
        <span className="mb-1 block text-sm">Precio de venta (COP, pesos enteros)</span>
        <input
          name="salePrice"
          type="number"
          min="1"
          step="1"
          required
          defaultValue={product.salePrice ?? ''}
          className="min-h-11 w-full rounded-md border border-border bg-background px-3"
        />
      </label>
      <label>
        <span className="mb-1 block text-sm">Stock</span>
        <input
          name="stock"
          type="number"
          min="0"
          step="1"
          required
          defaultValue={product.stock ?? 0}
          className="min-h-11 w-full rounded-md border border-border bg-background px-3"
        />
      </label>
      <label>
        <span className="mb-1 block text-sm">Stock mínimo</span>
        <input
          name="minStock"
          type="number"
          min="0"
          step="1"
          required
          defaultValue={product.minStock ?? 0}
          className="min-h-11 w-full rounded-md border border-border bg-background px-3"
        />
      </label>
      <label className="flex min-h-11 items-center gap-2 sm:col-span-2">
        <input type="checkbox" name="active" defaultChecked={product.active ?? true} />
        Producto activo
      </label>
      <div className="flex gap-2 sm:col-span-2">
        <button
          type="submit"
          className="min-h-12 rounded-md bg-primary px-4 font-semibold text-primary-foreground"
        >
          {editing ? 'Guardar cambios' : 'Crear producto'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-12 rounded-md border border-border px-4"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
