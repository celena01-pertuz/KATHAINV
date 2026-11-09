'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ProductBarcodeCamera } from '@/modules/products/components/ProductBarcodeCamera';
import type { ProductRecord } from '@/modules/products/types';
import type { PurchaseResult, RecentPurchase, SupplierRecord } from '../types';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, LoadingState, RetryState } from '@/components/ui/PageStates';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

function todayDate(): string {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
}

function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount);
}

async function readResponse<T>(response: Response): Promise<ApiResponse<T>> {
  return (await response.json()) as ApiResponse<T>;
}

async function readError(response: Response): Promise<string> {
  try {
    const body = await readResponse<unknown>(response);
    return body.error ?? 'No se pudo completar la operación.';
  } catch {
    return 'No se pudo completar la operación.';
  }
}

export function PurchaseManager() {
  const [purchases, setPurchases] = useState<RecentPurchase[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [productCode, setProductCode] = useState('');
  const [product, setProduct] = useState<ProductRecord | null>(null);
  const [notFoundCode, setNotFoundCode] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [total, setTotal] = useState('');
  const [date, setDate] = useState(todayDate);
  const [supplierFormOpen, setSupplierFormOpen] = useState(false);
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [savingPurchase, setSavingPurchase] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadData = useCallback(async () => {
    const [purchaseResponse, supplierResponse] = await Promise.all([
      fetch('/api/data/purchases?limit=20', { cache: 'no-store' }),
      fetch('/api/data/suppliers', { cache: 'no-store' }),
    ]);

    if (!purchaseResponse.ok) throw new Error(await readError(purchaseResponse));
    if (!supplierResponse.ok) throw new Error(await readError(supplierResponse));

    const [purchaseBody, supplierBody] = await Promise.all([
      readResponse<{ data: RecentPurchase[] }>(purchaseResponse),
      readResponse<{ data: SupplierRecord[] }>(supplierResponse),
    ]);
    setPurchases(purchaseBody.data?.data ?? []);
    setSuppliers(supplierBody.data?.data ?? []);
  }, []);

  useEffect(() => {
    async function initialize() {
      setLoading(true);
      setLoadError('');
      try {
        await loadData();
      } catch {
        setLoadError('No pudimos cargar las compras y proveedores. Inténtalo de nuevo.');
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, [loadData, loadAttempt]);

  async function lookupProduct(code: string) {
    const enteredCode = code.trim();
    setError('');
    setNotice('');
    setProduct(null);
    setNotFoundCode('');
    if (!enteredCode) {
      setError('Escribe o escanea el código del producto.');
      return;
    }

    try {
      const response = await fetch(
        `/api/data/products?code=${encodeURIComponent(enteredCode)}`,
        { cache: 'no-store' },
      );
      if (response.status === 404) {
        setNotFoundCode(enteredCode);
        return;
      }
      if (!response.ok) throw new Error(await readError(response));

      const body = await readResponse<ProductRecord>(response);
      if (!body.data) throw new Error('No se pudo consultar el producto.');
      setProduct(body.data);
      setProductCode(body.data.code);
    } catch (lookupError) {
      setError(
        lookupError instanceof Error
          ? lookupError.message
          : 'No se pudo consultar el producto.',
      );
    }
  }

  async function submitProductCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await lookupProduct(productCode);
  }

  async function submitSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    setSavingSupplier(true);
    try {
      const response = await fetch('/api/data/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: supplierName }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const body = await readResponse<SupplierRecord>(response);
      if (!body.data) throw new Error('No se pudo crear el proveedor.');

      const newSupplier = body.data;
      setSuppliers((current) =>
        [...current, newSupplier].sort((left, right) =>
          left.name.localeCompare(right.name, 'es'),
        ),
      );
      setSupplierId(newSupplier.id);
      setSupplierName('');
      setSupplierFormOpen(false);
      setNotice(`Proveedor "${newSupplier.name}" creado.`);
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : 'No se pudo crear el proveedor.',
      );
    } finally {
      setSavingSupplier(false);
    }
  }

  async function submitPurchase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!product) {
      setError('Busca primero un producto existente por su código.');
      return;
    }
    if (!supplierId) {
      setError('Selecciona un proveedor.');
      return;
    }

    setSavingPurchase(true);
    try {
      const response = await fetch('/api/data/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productCode: product.code,
          supplierId,
          quantity: Number(quantity),
          total: Number(total),
          date,
        }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const body = await readResponse<PurchaseResult>(response);
      const result = body.data;
      if (!result) throw new Error('No se pudo registrar la compra.');

      setProduct((current) =>
        current ? { ...current, stock: result.newStock } : current,
      );
      setNotice(
        `Se sumaron ${result.quantity} unidades de ${result.productName}. Nuevo stock: ${result.newStock}.`,
      );
      setQuantity('');
      setTotal('');
      try {
        await loadData();
      } catch {
        setError('La compra se guardó, pero no pudimos actualizar la lista reciente.');
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : 'No se pudo registrar la compra.',
      );
    } finally {
      setSavingPurchase(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-16">
      <PageHeader
        title="Proveedores"
        description="Registra compras y mantén a mano tus proveedores."
      />

      {notice && (
        <p role="status" className="mb-4 rounded-md bg-success/10 p-3 font-medium">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="mb-4 rounded-md bg-danger/10 p-3 text-sm">
          {error}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4">
          <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Producto</h2>
            <form onSubmit={(event) => void submitProductCode(event)} className="mt-3">
              <label htmlFor="purchase-product-code" className="mb-2 block font-medium">
                Código de barras o del producto
              </label>
              <input
                id="purchase-product-code"
                autoComplete="off"
                value={productCode}
                onChange={(event) => {
                  setProductCode(event.target.value);
                  setProduct(null);
                  setNotFoundCode('');
                }}
                placeholder="Escribe o escanea el código"
                className="min-h-11 w-full rounded-md border border-border bg-background px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              />
              <button
                type="submit"
                className="mt-2 min-h-11 w-full rounded-md border border-border px-4 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Buscar producto
              </button>
            </form>

            <ProductBarcodeCamera
              onCodeScanned={(code) => {
                setProductCode(code);
                void lookupProduct(code);
              }}
            />

            {notFoundCode && (
              <div role="status" className="mt-3 rounded-md border border-border p-3">
                <p>No se encontró un producto con ese código.</p>
                <Link
                  href={`/products?newCode=${encodeURIComponent(notFoundCode)}`}
                  className="mt-2 inline-flex min-h-11 items-center rounded-md border border-border px-4 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Crear producto con este código
                </Link>
              </div>
            )}

            {product && (
              <div className="mt-3 rounded-md border border-border p-3">
                <p className="font-semibold">{product.name}</p>
                <p className="text-sm text-muted">
                  {product.code} · Talla {product.size || 'No aplica'} · Color{' '}
                  {product.color || 'No aplica'}
                </p>
                <p className="mt-1 text-sm">Stock actual: {product.stock}</p>
              </div>
            )}
          </section>

          <form
            id="purchase-form"
            onSubmit={(event) => void submitPurchase(event)}
            className="rounded-lg border border-border bg-surface p-4 shadow-sm"
          >
            <h2 className="text-lg font-semibold">Compra a proveedor</h2>
            <label htmlFor="purchase-supplier" className="mb-2 mt-3 block font-medium">
              Proveedor
            </label>
            <select
              id="purchase-supplier"
              value={supplierId}
              onChange={(event) => setSupplierId(event.target.value)}
              className="min-h-11 w-full rounded-md border border-border bg-background px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <option value="">Selecciona un proveedor</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
            <label htmlFor="purchase-quantity" className="mb-2 mt-3 block font-medium">
              Cantidad
            </label>
            <input
              id="purchase-quantity"
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              required
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className="min-h-11 w-full rounded-md border border-border bg-background px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            />
            <label htmlFor="purchase-total" className="mb-2 mt-3 block font-medium">
              Total pagado (COP, pesos enteros)
            </label>
            <input
              id="purchase-total"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              required
              value={total}
              onChange={(event) => setTotal(event.target.value)}
              className="min-h-11 w-full rounded-md border border-border bg-background px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            />
            <label htmlFor="purchase-date" className="mb-2 mt-3 block font-medium">
              Fecha
            </label>
            <input
              id="purchase-date"
              type="date"
              required
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="min-h-11 w-full rounded-md border border-border bg-background px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            />
            <button
              type="submit"
              data-primary-action
              disabled={savingPurchase || !product || !supplierId}
              className="mt-4 min-h-11 w-full rounded-md bg-primary px-4 font-semibold text-primary-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingPurchase ? 'Guardando compra…' : 'Guardar compra'}
            </button>
          </form>
        </div>

        <aside className="space-y-4">
          <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Proveedor</h2>
              <button
                type="button"
                onClick={() => setSupplierFormOpen((current) => !current)}
                className="min-h-11 rounded-md border border-border px-4 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {supplierFormOpen ? 'Elegir existente' : 'Nuevo proveedor'}
              </button>
            </div>

            {supplierFormOpen && (
              <form onSubmit={(event) => void submitSupplier(event)} className="mt-3">
                <h3 className="mb-3 text-base font-semibold">Nuevo proveedor</h3>
                <label htmlFor="supplier-name" className="mb-2 block font-medium">
                  Nombre del proveedor
                </label>
                <input
                  id="supplier-name"
                  value={supplierName}
                  onChange={(event) => setSupplierName(event.target.value)}
                  required
                  className="min-h-11 w-full rounded-md border border-border bg-background px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                />
                <button
                  type="submit"
                  disabled={savingSupplier}
                  className="mt-2 min-h-11 w-full rounded-md border border-border px-4 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
                >
                  Guardar proveedor
                </button>
              </form>
            )}
          </section>

          <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Compras recientes</h2>
            <div className="mt-3">
              {loadError ? (
                <RetryState
                  message={loadError}
                  onRetry={() => setLoadAttempt((attempt) => attempt + 1)}
                />
              ) : loading ? (
                <LoadingState label="Cargando compras recientes" />
              ) : purchases.length === 0 ? (
                <EmptyState
                  action={
                    <a
                      href="#purchase-form"
                      className="inline-flex min-h-11 items-center rounded-md border border-border px-4 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      Registrar una compra
                    </a>
                  }
                >
                  Todavía no hay compras.
                </EmptyState>
              ) : (
                <ul className="divide-y divide-border">
                  {purchases.map((purchase) => (
                    <li key={purchase.id} className="py-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">{purchase.productName}</p>
                          <p className="text-sm text-muted">{purchase.productCode}</p>
                        </div>
                        <p className="font-semibold">{formatCOP(purchase.total)}</p>
                      </div>
                      <p className="mt-1 text-sm text-muted">
                        {purchase.quantity} unidades · {purchase.supplierName} ·{' '}
                        {new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(
                          new Date(`${purchase.date}T12:00:00`),
                        )}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
