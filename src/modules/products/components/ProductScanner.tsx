'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { ProductBarcodeCamera } from './ProductBarcodeCamera';
import {
  buscarProductoPorCodigo,
  buscarProductosPorNombre,
} from '../client-service';
import type { ProductRecord } from '../types';

function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function ProductScanner() {
  const [code, setCode] = useState('');
  const [product, setProduct] = useState<ProductRecord | null>(null);
  const [notFoundCode, setNotFoundCode] = useState('');
  const [nameSearch, setNameSearch] = useState('');
  const [nameResults, setNameResults] = useState<ProductRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const lookupCode = useCallback(async (value: string) => {
    const enteredCode = value.trim();
    if (!enteredCode) {
      setErrorMessage('Escribe o escanea un código para buscar.');
      setProduct(null);
      setNotFoundCode('');
      inputRef.current?.focus();
      return;
    }

    setBusy(true);
    setErrorMessage('');
    setProduct(null);
    setNotFoundCode('');
    setNameResults([]);
    try {
      const found = await buscarProductoPorCodigo(enteredCode);
      if (found) {
        setProduct(found);
      } else {
        setNotFoundCode(enteredCode);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'No se pudo consultar el producto.',
      );
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await lookupCode(code);
  }

  async function submitName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    setNameResults([]);
    try {
      const results = await buscarProductosPorNombre(nameSearch);
      setNameResults(results);
      if (results.length === 0) setErrorMessage('No se encontraron productos con ese nombre.');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'No se pudieron buscar productos.',
      );
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Buscar producto</h1>
        <p className="mt-1 text-sm text-muted">
          Escribe un código, usa la pistola lectora o activa la cámara.
        </p>
      </header>

      <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
        <form onSubmit={submitCode}>
          <label htmlFor="product-code" className="mb-2 block font-medium">
            Código de barras o código del producto
          </label>
          <input
            ref={inputRef}
            id="product-code"
            name="code"
            type="text"
            autoComplete="off"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="min-h-14 w-full rounded-md border border-border bg-background px-4 text-lg"
            placeholder="Escribe el código o escanéalo"
          />
          <button
            type="submit"
            disabled={busy}
            className="mt-3 min-h-12 w-full rounded-md bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-60"
          >
            {busy ? 'Buscando…' : 'Buscar'}
          </button>
        </form>

        <ProductBarcodeCamera
          onCodeScanned={(scannedCode) => {
            setCode(scannedCode);
            void lookupCode(scannedCode);
          }}
        />
      </section>

      {errorMessage && (
        <p role="alert" className="mt-4 rounded-md bg-danger/10 p-3 text-sm">
          {errorMessage}
        </p>
      )}

      {product && (
        <section
          aria-live="polite"
          className="mt-4 rounded-lg border border-border bg-surface p-4 shadow-sm"
        >
          <p className="text-sm text-muted">Código: {product.code}</p>
          <h2 className="mt-1 text-xl font-bold">{product.name}</h2>
          <dl className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <dt className="text-sm text-muted">Talla</dt>
              <dd>{product.size || 'No aplica'}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Color</dt>
              <dd>{product.color || 'No aplica'}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Precio de venta</dt>
              <dd className="font-semibold">{formatCOP(product.salePrice)}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Stock</dt>
              <dd>{product.stock}</dd>
            </div>
          </dl>
          <p className="mt-4 rounded-md bg-background p-3 font-medium">
            Estado: {!product.active ? 'Inactivo' : product.stock === 0 ? 'Agotado' : 'Disponible'}
          </p>
        </section>
      )}

      {notFoundCode && (
        <section role="status" className="mt-4 rounded-lg border border-border bg-surface p-4">
          <p>No se encontró un producto con el código “{notFoundCode}”.</p>
          <Link
            href={`/products?newCode=${encodeURIComponent(notFoundCode)}`}
            className="mt-3 inline-flex min-h-11 items-center rounded-md bg-primary px-4 font-semibold text-primary-foreground"
          >
            Crear producto con este código
          </Link>
        </section>
      )}

      <section className="mt-6 rounded-lg border border-border bg-surface p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Buscar por nombre</h2>
        <p className="mb-3 mt-1 text-sm text-muted">
          Úsalo si la etiqueta está dañada o no se puede leer.
        </p>
        <form onSubmit={submitName} className="flex flex-col gap-2 sm:flex-row">
          <input
            type="search"
            value={nameSearch}
            onChange={(event) => setNameSearch(event.target.value)}
            className="min-h-12 min-w-0 flex-1 rounded-md border border-border bg-background px-3"
            placeholder="Nombre del producto"
            aria-label="Buscar producto por nombre"
          />
          <button
            type="submit"
            className="min-h-12 rounded-md border border-primary px-4 font-semibold text-primary"
          >
            Buscar por nombre
          </button>
        </form>
        {nameResults.length > 0 && (
          <ul className="mt-3 divide-y divide-border">
            {nameResults.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    setCode(item.code);
                    void lookupCode(item.code);
                  }}
                  className="min-h-12 w-full py-2 text-left"
                >
                  <span className="block font-medium">{item.name}</span>
                  <span className="text-sm text-muted">
                    {item.code} · {item.size || 'Sin talla'} · {item.color || 'Sin color'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
