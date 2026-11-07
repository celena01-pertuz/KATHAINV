'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import type { CustomerRecord } from '@/modules/customers/types';
import { normalizeProductCode } from '@/modules/products/code-utils';
import type { ProductRecord } from '@/modules/products/types';
import { buildWhatsAppUrl } from '@/modules/receipts/whatsapp';
import { createSaleRequestKey } from '../request-key';
import type {
  SalePaymentMethod,
  SalePaymentType,
  SaleRecord,
  SaleResult,
} from '../types';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface CartItem {
  product: ProductRecord;
  quantity: number;
}

interface ScannerControls {
  stop: () => void;
}

const paymentMethods: { value: SalePaymentMethod; label: string }[] = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'nequi', label: 'Nequi' },
  { value: 'tarjeta', label: 'Tarjeta' },
];

function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount);
}

async function responseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ApiResponse<unknown>;
    return body.error ?? 'No se pudo completar la operación.';
  } catch {
    return 'No se pudo completar la operación.';
  }
}

export function SalesManager() {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [code, setCode] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<ProductRecord[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [paymentType, setPaymentType] = useState<SalePaymentType>('cash');
  const [initialPayment, setInitialPayment] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<SalePaymentMethod | ''>('');
  const [requestKey, setRequestKey] = useState(createSaleRequestKey);
  const [loadingSales, setLoadingSales] = useState(true);
  const [searchingProduct, setSearchingProduct] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraMessage, setCameraMessage] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [receiptLinks, setReceiptLinks] = useState<Record<number, string>>({});
  const [receiptLoadingId, setReceiptLoadingId] = useState<number | null>(null);
  const [receiptError, setReceiptError] = useState('');
  const [receiptNotice, setReceiptNotice] = useState('');
  const [confirmedSale, setConfirmedSale] = useState<{
    id: number;
    saleNumber: string;
    customerPhone: string | null;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<ScannerControls | null>(null);
  const activeRef = useRef(false);
  const cameraStartingRef = useRef(false);
  const lastCameraCodeRef = useRef({ code: '', timestamp: 0 });

  const total = cart.reduce(
    (sum, item) => sum + item.product.salePrice * item.quantity,
    0,
  );
  const paidAmount = paymentType === 'cash' ? total : Number(initialPayment);
  const customerRequired = paymentType !== 'cash';
  const canSell =
    cart.length > 0 &&
    !saving &&
    (!customerRequired || Boolean(selectedCustomer)) &&
    (paymentType !== 'partial' || (paidAmount > 0 && paidAmount < total)) &&
    (paymentType !== 'cash' || Boolean(paymentMethod)) &&
    (paymentType !== 'partial' || Boolean(paymentMethod));

  const loadSales = useCallback(async () => {
    const response = await fetch('/api/data/sales?limit=20', { cache: 'no-store' });
    if (!response.ok) throw new Error(await responseError(response));
    const body = (await response.json()) as ApiResponse<{ data: SaleRecord[] }>;
    setSales(body.data?.data ?? []);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function loadRecentSales() {
      try {
        const response = await fetch('/api/data/sales?limit=20', {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(await responseError(response));
        const body = (await response.json()) as ApiResponse<{ data: SaleRecord[] }>;
        setSales(body.data?.data ?? []);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'No se pudieron cargar las ventas recientes.',
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoadingSales(false);
      }
    }

    void loadRecentSales();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    activeRef.current = true;
    inputRef.current?.focus();
    const videoElement = videoRef.current;
    return () => {
      activeRef.current = false;
      controlsRef.current?.stop();
      controlsRef.current = null;
      const stream = videoElement?.srcObject;
      if (typeof MediaStream !== 'undefined' && stream instanceof MediaStream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (!customerRequired) {
      setCustomers([]);
      setCustomerSearch('');
      setSelectedCustomer(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      async function searchCustomers() {
        try {
          const response = await fetch(
            `/api/data/customers?q=${encodeURIComponent(customerSearch.trim())}`,
            { cache: 'no-store', signal: controller.signal },
          );
          if (!response.ok) throw new Error(await responseError(response));
          const body = (await response.json()) as ApiResponse<{ data: CustomerRecord[] }>;
          setCustomers((body.data?.data ?? []).filter((customer) => customer.active));
        } catch (searchError) {
          if (!controller.signal.aborted) {
            setError(
              searchError instanceof Error
                ? searchError.message
                : 'No se pudieron buscar clientes.',
            );
          }
        }
      }

      void searchCustomers();
    }, 200);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [customerRequired, customerSearch]);

  const addProduct = useCallback((product: ProductRecord) => {
    setError('');
    if (!product.active) {
      setError('El producto está inactivo y no se puede vender.');
      return;
    }
    if (product.stock <= 0) {
      setError('El producto está agotado.');
      return;
    }
    setCart((items) => {
      const existing = items.find((item) => item.product.id === product.id);
      if (existing) {
        return items.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...items, { product, quantity: 1 }];
    });
    setProductResults([]);
    setProductSearch('');
    setCode('');
    inputRef.current?.focus();
  }, []);

  const lookupCode = useCallback(
    async (rawCode: string) => {
      const value = rawCode.trim();
      if (!value) {
        setError('Escribe o escanea un código para buscar.');
        return;
      }

      setSearchingProduct(true);
      setError('');
      try {
        const response = await fetch(
          `/api/data/products?code=${encodeURIComponent(normalizeProductCode(value))}`,
          { cache: 'no-store' },
        );
        if (response.status === 404) {
          setError('No se encontró un producto con ese código.');
          return;
        }
        if (!response.ok) throw new Error(await responseError(response));
        const body = (await response.json()) as ApiResponse<ProductRecord>;
        if (!body.data) throw new Error('No se pudo consultar el producto.');
        addProduct(body.data);
      } catch (lookupError) {
        setError(
          lookupError instanceof Error
            ? lookupError.message
            : 'No se pudo consultar el producto.',
        );
      } finally {
        setSearchingProduct(false);
        inputRef.current?.focus();
      }
    },
    [addProduct],
  );

  function stopCamera() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    const stream = videoRef.current?.srcObject;
    if (typeof MediaStream !== 'undefined' && stream instanceof MediaStream) {
      stream.getTracks().forEach((track) => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }

  async function startCamera() {
    if (cameraStartingRef.current || cameraActive) return;
    cameraStartingRef.current = true;
    setCameraMessage('');

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraMessage('Este navegador no ofrece cámara. Puedes ingresar el código manualmente.');
      cameraStartingRef.current = false;
      return;
    }

    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current ?? undefined,
        (result) => {
          if (!result || !activeRef.current) return;
          const scannedCode = result.getText();
          const normalizedCode = normalizeProductCode(scannedCode);
          const timestamp = Date.now();
          if (
            lastCameraCodeRef.current.code === normalizedCode &&
            timestamp - lastCameraCodeRef.current.timestamp < 1800
          ) {
            return;
          }
          lastCameraCodeRef.current = { code: normalizedCode, timestamp };
          setCode(scannedCode);
          void lookupCode(scannedCode);
        },
      );

      if (!activeRef.current) {
        controls.stop();
      } else {
        controlsRef.current = controls;
        setCameraActive(true);
      }
    } catch (cameraError) {
      if (cameraError instanceof Error && cameraError.name === 'NotAllowedError') {
        setCameraMessage('No se concedió permiso para usar la cámara.');
      } else if (cameraError instanceof Error && cameraError.name === 'NotFoundError') {
        setCameraMessage('No se encontró una cámara disponible.');
      } else {
        setCameraMessage('No se pudo iniciar la cámara. Puedes ingresar el código manualmente.');
      }
    } finally {
      cameraStartingRef.current = false;
    }
  }

  async function searchProducts(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!productSearch.trim()) return;

    setSearchingProduct(true);
    setError('');
    try {
      const response = await fetch(
        `/api/data/products?q=${encodeURIComponent(productSearch.trim())}`,
        { cache: 'no-store' },
      );
      if (!response.ok) throw new Error(await responseError(response));
      const body = (await response.json()) as ApiResponse<{ data: ProductRecord[] }>;
      setProductResults(
        (body.data?.data ?? []).filter((product) => product.active && product.stock > 0),
      );
    } catch (searchError) {
      setError(
        searchError instanceof Error
          ? searchError.message
          : 'No se pudieron buscar productos.',
      );
    } finally {
      setSearchingProduct(false);
    }
  }

  async function submitSale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!canSell) {
      setError('Completa los datos de la venta antes de continuar.');
      return;
    }

    setSaving(true);
    setConfirmedSale(null);
    try {
      const response = await fetch('/api/data/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer?.id ?? null,
          items: cart.map(({ product, quantity }) => ({
            productId: product.id,
            quantity,
          })),
          paymentType,
          initialPayment:
            paymentType === 'cash'
              ? null
              : paymentType === 'credit'
                ? 0
                : Number(initialPayment),
          paymentMethod: paymentMethod || null,
          requestKey,
        }),
      });

      if (!response.ok) throw new Error(await responseError(response));
      const body = (await response.json()) as ApiResponse<SaleResult>;
      if (!body.data) throw new Error('No se pudo confirmar la venta. Inténtalo más tarde.');

      setConfirmedSale({
        id: body.data.saleId,
        saleNumber: body.data.saleNumber,
        customerPhone: selectedCustomer?.phone ?? null,
      });
      setNotice(`Venta ${body.data.saleNumber} registrada correctamente.`);
      setCart([]);
      setSelectedCustomer(null);
      setCustomerSearch('');
      setPaymentType('cash');
      setInitialPayment('');
      setPaymentMethod('');
      setRequestKey(createSaleRequestKey());
      void loadSales().catch(() => {
        setError('La venta se registró, pero no se pudo actualizar la lista reciente.');
      });
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'No se pudo completar la venta. Puedes reintentar sin duplicarla.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function createReceipt(saleId: number, saleNumber: string) {
    setReceiptError('');
    setReceiptNotice('');
    if (
      !window.confirm(
        'Se generará un enlace nuevo y, si ya existe uno, se revocará el anterior. ¿Continuar?',
      )
    ) {
      return;
    }

    setReceiptLoadingId(saleId);
    try {
      const response = await fetch('/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saleId }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      const body = (await response.json()) as ApiResponse<{ url: string }>;
      const url = body.data?.url;
      if (!url) throw new Error('No se pudo crear el enlace del comprobante.');

      setReceiptLinks((current) => ({ ...current, [saleId]: url }));
      setReceiptNotice(`Enlace del comprobante para ${saleNumber} listo.`);
    } catch (receiptCreateError) {
      setReceiptError(
        receiptCreateError instanceof Error
          ? receiptCreateError.message
          : 'No se pudo crear el enlace del comprobante.',
      );
    } finally {
      setReceiptLoadingId(null);
    }
  }

  async function revokeReceipt(saleId: number) {
    setReceiptError('');
    setReceiptNotice('');
    if (!window.confirm('¿Revocar este enlace del comprobante?')) return;

    setReceiptLoadingId(saleId);
    try {
      const response = await fetch(`/api/receipts/${saleId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(await responseError(response));
      setReceiptLinks((current) => {
        const remaining = { ...current };
        delete remaining[saleId];
        return remaining;
      });
      setReceiptNotice('El enlace del comprobante fue revocado.');
    } catch (receiptRevokeError) {
      setReceiptError(
        receiptRevokeError instanceof Error
          ? receiptRevokeError.message
          : 'No se pudo revocar el enlace del comprobante.',
      );
    } finally {
      setReceiptLoadingId(null);
    }
  }

  async function copyReceiptLink(url: string) {
    setReceiptError('');
    setReceiptNotice('');
    try {
      await navigator.clipboard.writeText(url);
      setReceiptNotice('Enlace copiado.');
    } catch {
      setReceiptError('No se pudo copiar el enlace. Puedes seleccionar y copiar la dirección.');
    }
  }

  function receiptActions(saleId: number, saleNumber: string, phone: string | null) {
    const url = receiptLinks[saleId];
    const whatsappUrl = url ? buildWhatsAppUrl(phone, saleNumber, url) : null;
    const busy = receiptLoadingId === saleId;

    return (
      <div className="mt-3 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => void createReceipt(saleId, saleNumber)}
          disabled={busy}
          className="min-h-11 w-full rounded-md border border-primary px-4 font-semibold text-primary disabled:opacity-60 sm:w-auto"
        >
          {busy ? 'Procesando…' : 'Comprobante'}
        </button>
        {url && (
          <div className="flex flex-col gap-2 sm:flex-row">
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 items-center justify-center rounded-md bg-primary px-4 text-center font-semibold text-primary-foreground"
              >
                Enviar por WhatsApp
              </a>
            )}
            <button
              type="button"
              onClick={() => void copyReceiptLink(url)}
              className="min-h-11 rounded-md border border-border px-4 font-medium"
            >
              Copiar enlace
            </button>
            <button
              type="button"
              onClick={() => void revokeReceipt(saleId)}
              disabled={busy}
              className="min-h-11 rounded-md border border-danger px-4 font-medium text-danger disabled:opacity-60"
            >
              Revocar enlace
            </button>
          </div>
        )}
        {url && (
          <label className="block text-xs text-muted">
            Enlace del comprobante
            <input
              type="url"
              readOnly
              autoComplete="off"
              value={url}
              onFocus={(event) => event.currentTarget.select()}
              className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
            />
          </label>
        )}
      </div>
    );
  }

  function changeQuantity(productId: string, quantity: number) {
    setCart((items) =>
      items
        .map((item) => (item.product.id === productId ? { ...item, quantity } : item))
        .filter((item) => item.quantity > 0),
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Registrar venta</h1>
        <p className="mt-1 text-sm text-muted">
          Busca el código, usa la pistola lectora o activa la cámara.
        </p>
      </header>

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
      {receiptNotice && (
        <p role="status" className="mb-4 rounded-md bg-success/10 p-3 text-sm font-medium">
          {receiptNotice}
        </p>
      )}
      {receiptError && (
        <p role="alert" className="mb-4 rounded-md bg-danger/10 p-3 text-sm">
          {receiptError}
        </p>
      )}
      {confirmedSale && (
        <section className="mb-4 rounded-lg border border-border bg-surface p-4">
          <h2 className="font-semibold">Comprobante de {confirmedSale.saleNumber}</h2>
          {receiptActions(confirmedSale.id, confirmedSale.saleNumber, confirmedSale.customerPhone)}
        </section>
      )}

      <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void lookupCode(code);
          }}
        >
          <label htmlFor="sale-product-code" className="mb-2 block font-medium">
            Código de barras o del producto
          </label>
          <input
            ref={inputRef}
            id="sale-product-code"
            autoComplete="off"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="Escribe o escanea el código"
            className="min-h-12 w-full rounded-md border border-border bg-background px-3"
          />
          <button
            type="submit"
            disabled={searchingProduct}
            className="mt-2 min-h-11 w-full rounded-md bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-60"
          >
            {searchingProduct ? 'Buscando…' : 'Agregar por código'}
          </button>
        </form>

        <div className="mt-3">
          <button
            type="button"
            onClick={() => void startCamera()}
            disabled={cameraActive}
            className="min-h-11 w-full rounded-md border border-primary px-4 font-semibold text-primary disabled:opacity-60"
          >
            {cameraActive ? 'Cámara activa' : 'Usar cámara'}
          </button>
          {cameraActive && (
            <button
              type="button"
              onClick={stopCamera}
              className="mt-2 min-h-11 w-full rounded-md border border-border px-4"
            >
              Apagar cámara
            </button>
          )}
          {cameraMessage && <p role="status" className="mt-2 text-sm">{cameraMessage}</p>}
          <video
            ref={videoRef}
            className={`mt-3 w-full rounded-md bg-black ${cameraActive ? 'block' : 'hidden'}`}
            aria-label="Vista de la cámara para leer el código"
            muted
            playsInline
          />
        </div>

        <form onSubmit={searchProducts} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <label htmlFor="sale-product-search" className="sr-only">
            Buscar producto por nombre o código
          </label>
          <input
            id="sale-product-search"
            type="search"
            value={productSearch}
            onChange={(event) => setProductSearch(event.target.value)}
            placeholder="Buscar por nombre o código"
            className="min-h-11 min-w-0 flex-1 rounded-md border border-border bg-background px-3"
          />
          <button
            type="submit"
            disabled={searchingProduct}
            className="min-h-11 rounded-md border border-primary px-4 font-semibold text-primary disabled:opacity-60"
          >
            Buscar
          </button>
        </form>

        {productResults.length > 0 && (
          <ul className="mt-3 divide-y divide-border" aria-label="Resultados de productos">
            {productResults.map((product) => (
              <li key={product.id}>
                <button
                  type="button"
                  onClick={() => addProduct(product)}
                  className="min-h-12 w-full py-2 text-left"
                >
                  <span className="block font-medium">{product.name}</span>
                  <span className="text-sm text-muted">
                    {product.code} · {product.size || 'Sin talla'} · {product.color || 'Sin color'} ·{' '}
                    {formatCOP(product.salePrice)} · Stock informativo: {product.stock}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form onSubmit={(event) => void submitSale(event)} className="mt-5 space-y-4">
        <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Carrito</h2>
          {cart.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Agrega productos para iniciar la venta.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {cart.map(({ product, quantity }) => (
                <li key={product.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted">
                      {product.code} · {formatCOP(product.salePrice)} · Stock informativo:{' '}
                      {product.stock}
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    Cantidad
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={quantity}
                      onChange={(event) =>
                        changeQuantity(product.id, Number(event.target.value))
                      }
                      className="min-h-11 w-20 rounded-md border border-border bg-background px-2"
                    />
                  </label>
                  <span className="w-full text-right font-semibold sm:w-auto">
                    {formatCOP(product.salePrice * quantity)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 flex justify-between border-t border-border pt-4 text-lg font-bold">
            <span>Total informativo</span>
            <span>{formatCOP(total)}</span>
          </p>
          <p className="mt-1 text-xs text-muted">
            El precio y la disponibilidad finales se verifican en el servidor.
          </p>
        </section>

        <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Forma de pago</h2>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {(
              [
                ['cash', 'Contado'],
                ['credit', 'Fiado'],
                ['partial', 'Pago parcial'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={paymentType === value}
                onClick={() => {
                  setPaymentType(value as SalePaymentType);
                  setError('');
                }}
                className={`min-h-11 rounded-md border px-3 font-medium ${
                  paymentType === value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {customerRequired && (
            <div className="mt-4">
              <label htmlFor="sale-customer-search" className="mb-2 block font-medium">
                Cliente registrado (obligatorio)
              </label>
              {selectedCustomer ? (
                <div className="flex min-h-11 items-center justify-between gap-2 rounded-md border border-border px-3">
                  <span>{selectedCustomer.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(null);
                      setCustomerSearch('');
                    }}
                    className="min-h-11 px-3 font-medium text-primary"
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                <>
                  <input
                    id="sale-customer-search"
                    type="search"
                    value={customerSearch}
                    onChange={(event) => setCustomerSearch(event.target.value)}
                    placeholder="Buscar cliente activo"
                    className="min-h-11 w-full rounded-md border border-border bg-background px-3"
                  />
                  {customers.length > 0 && (
                    <ul className="mt-2 max-h-48 divide-y divide-border overflow-auto rounded-md border border-border">
                      {customers.map((customer) => (
                        <li key={customer.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setCustomerSearch('');
                              setCustomers([]);
                            }}
                            className="min-h-11 w-full px-3 text-left"
                          >
                            {customer.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {customerSearch.trim() && customers.length === 0 && (
                    <p className="mt-2 text-sm text-muted">
                      No se encontraron clientes activos.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {paymentType === 'partial' && (
            <div className="mt-4">
              <label htmlFor="sale-initial-payment" className="mb-2 block font-medium">
                Pago inicial en pesos
              </label>
              <input
                id="sale-initial-payment"
                type="number"
                min="1"
                step="1"
                value={initialPayment}
                onChange={(event) => setInitialPayment(event.target.value)}
                className="min-h-11 w-full rounded-md border border-border bg-background px-3"
              />
            </div>
          )}

          {(paymentType === 'cash' || paymentType === 'partial') && (
            <div className="mt-4">
              <label htmlFor="sale-payment-method" className="mb-2 block font-medium">
                Método de pago
              </label>
              <select
                id="sale-payment-method"
                value={paymentMethod}
                onChange={(event) =>
                  setPaymentMethod(event.target.value as SalePaymentMethod | '')
                }
                className="min-h-11 w-full rounded-md border border-border bg-background px-3"
              >
                <option value="">Selecciona un método</option>
                {paymentMethods.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </section>

        <button
          type="submit"
          disabled={!canSell}
          className="min-h-12 w-full rounded-md bg-primary px-4 font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Registrando venta…' : 'Vender'}
        </button>
      </form>

      <section className="mt-8 rounded-lg border border-border bg-surface p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Ventas recientes</h2>
        {loadingSales ? (
          <p className="mt-3 text-sm text-muted">Cargando ventas…</p>
        ) : sales.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Todavía no hay ventas registradas.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {sales.map((sale) => (
              <li key={sale.id} className="py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-semibold">{sale.saleNumber}</span>
                  <span className="font-semibold">{formatCOP(sale.total)}</span>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {new Intl.DateTimeFormat('es-CO', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(new Date(sale.soldAt))}
                  {' · '}
                  {sale.paymentType === 'cash'
                    ? 'Contado'
                    : sale.paymentType === 'credit'
                      ? 'Fiado'
                      : 'Pago parcial'}
                  {' · '}
                  {sale.customerName ?? 'Sin cliente'}
                </p>
                {receiptActions(sale.id, sale.saleNumber, sale.customerPhone)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
