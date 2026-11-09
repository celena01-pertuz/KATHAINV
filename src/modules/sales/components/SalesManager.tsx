'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import {
  CUSTOMER_DATA_NOTICE,
  CUSTOMER_DATA_NOTICE_VERSION,
} from '@/modules/customers/consent-notice';
import { normalizeColombianPhone } from '@/modules/customers/phone-utils';
import type { CustomerRecord, CustomerSaveResult } from '@/modules/customers/types';
import { normalizeProductCode } from '@/modules/products/code-utils';
import type { ProductRecord } from '@/modules/products/types';
import { buildWhatsAppUrl } from '@/modules/receipts/whatsapp';
import { createSaleRequestKey } from '../request-key';
import { saleResultSchema } from '../schemas';
import type { SalePaymentMethod, SalePaymentType, SaleRecord, SaleResult } from '../types';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, LoadingState, RetryState } from '@/components/ui/PageStates';

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
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [customerFormError, setCustomerFormError] = useState('');
  const [customerFormNotice, setCustomerFormNotice] = useState('');
  const [paymentType, setPaymentType] = useState<SalePaymentType>('cash');
  const [initialPayment, setInitialPayment] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<SalePaymentMethod | ''>('');
  const [requestKey, setRequestKey] = useState(createSaleRequestKey);
  const [loadingSales, setLoadingSales] = useState(true);
  const [salesLoadError, setSalesLoadError] = useState('');
  const [salesRetryKey, setSalesRetryKey] = useState(0);
  const [searchingProduct, setSearchingProduct] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraMessage, setCameraMessage] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [outOfStockProducts, setOutOfStockProducts] = useState<SaleResult['outOfStock']>([]);
  const [receiptLinks, setReceiptLinks] = useState<Record<number, string>>({});
  const [receiptLoadingId, setReceiptLoadingId] = useState<number | null>(null);
  const [receiptError, setReceiptError] = useState('');
  const [receiptNotice, setReceiptNotice] = useState('');
  const [confirmedSale, setConfirmedSale] = useState<{
    id: number;
    saleNumber: string;
    customerPhone: string | null;
    customerName: string | null;
    paymentType: SalePaymentType;
    total: number;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<ScannerControls | null>(null);
  const activeRef = useRef(false);
  const cameraStartingRef = useRef(false);
  const lastCameraCodeRef = useRef({ code: '', timestamp: 0 });

  const total = cart.reduce((sum, item) => sum + item.product.salePrice * item.quantity, 0);
  const summaryTotal = confirmedSale?.total ?? total;
  const summaryPaymentType = confirmedSale?.paymentType ?? paymentType;
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
      setLoadingSales(true);
      setSalesLoadError('');
      try {
        const response = await fetch('/api/data/sales?limit=20', {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(await responseError(response));
        const body = (await response.json()) as ApiResponse<{ data: SaleRecord[] }>;
        setSales(body.data?.data ?? []);
      } catch {
        if (!controller.signal.aborted) {
          setSalesLoadError('No pudimos cargar las ventas recientes. Inténtalo de nuevo.');
        }
      } finally {
        if (!controller.signal.aborted) setLoadingSales(false);
      }
    }

    void loadRecentSales();
    return () => controller.abort();
  }, [salesRetryKey]);

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
    const query = customerSearch.trim();
    if (!query) {
      setCustomers([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      async function searchCustomers() {
        try {
          const response = await fetch(`/api/data/customers?q=${encodeURIComponent(query)}`, {
            cache: 'no-store',
            signal: controller.signal,
          });
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
  }, [customerSearch]);

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
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
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
          lookupError instanceof Error ? lookupError.message : 'No se pudo consultar el producto.',
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
        searchError instanceof Error ? searchError.message : 'No se pudieron buscar productos.',
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
            paymentType === 'cash' ? null : paymentType === 'credit' ? 0 : Number(initialPayment),
          paymentMethod: paymentMethod || null,
          requestKey,
        }),
      });

      if (!response.ok) throw new Error(await responseError(response));
      const body = (await response.json()) as ApiResponse<unknown>;
      const parsedResult = saleResultSchema.safeParse(body.data);
      if (!parsedResult.success) {
        throw new Error('No se pudo confirmar la venta. Inténtalo más tarde.');
      }
      const result = parsedResult.data;

      setConfirmedSale({
        id: result.saleId,
        saleNumber: result.saleNumber,
        customerPhone: selectedCustomer?.phone ?? null,
        customerName: selectedCustomer?.name ?? null,
        paymentType,
        total: result.total,
      });
      setOutOfStockProducts(result.outOfStock);
      setNotice(`Venta ${result.saleNumber} registrada correctamente.`);
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
                className="flex min-h-11 items-center justify-center rounded-md border border-border px-4 text-center font-semibold"
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

  function startNewSale() {
    setCart([]);
    setCode('');
    setProductSearch('');
    setProductResults([]);
    setCustomerSearch('');
    setCustomers([]);
    setSelectedCustomer(null);
    setPaymentType('cash');
    setInitialPayment('');
    setPaymentMethod('');
    setRequestKey(createSaleRequestKey());
    setConfirmedSale(null);
    setOutOfStockProducts([]);
    setReceiptError('');
    setReceiptNotice('');
    setNotice('');
    setError('');
    inputRef.current?.focus();
  }

  async function saveNewCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCustomerFormError('');
    setCustomerFormNotice('');

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get('name') ?? '').trim();
    const normalizedPhone = normalizeColombianPhone(newCustomerPhone);
    const authorizationAccepted = formData.get('authorizationAccepted') === 'on';

    if (!name) {
      setCustomerFormError('El nombre es obligatorio.');
      return;
    }
    if (!normalizedPhone || newCustomerPhone.length !== 10) {
      setCustomerFormError('Ingresa un celular colombiano válido de 10 dígitos.');
      return;
    }
    if (!authorizationAccepted) {
      setCustomerFormError('Debes registrar la autorización de tratamiento de datos.');
      return;
    }

    setSavingCustomer(true);
    try {
      const duplicateResponse = await fetch(
        `/api/data/customers?phone=${encodeURIComponent(normalizedPhone)}`,
        { cache: 'no-store' },
      );
      if (!duplicateResponse.ok) throw new Error(await responseError(duplicateResponse));
      const duplicateBody = (await duplicateResponse.json()) as ApiResponse<{
        duplicatePhone: boolean;
      }>;

      if (duplicateBody.data?.duplicatePhone) {
        const searchResponse = await fetch(
          `/api/data/customers?q=${encodeURIComponent(normalizedPhone)}`,
          { cache: 'no-store' },
        );
        if (!searchResponse.ok) throw new Error(await responseError(searchResponse));
        const searchBody = (await searchResponse.json()) as ApiResponse<{
          data: CustomerRecord[];
        }>;
        const matchingCustomers = (searchBody.data?.data ?? []).filter(
          (customer) => customer.phone === normalizedPhone,
        );
        const existingCustomer = matchingCustomers.find((customer) => customer.active);

        if (existingCustomer) {
          setSelectedCustomer(existingCustomer);
          setCustomerSearch('');
          setCustomers([]);
          setShowNewCustomerForm(false);
          setNewCustomerName('');
          setNewCustomerPhone('');
          setCustomerFormNotice(
            'Ese teléfono ya estaba registrado. Seleccionamos el cliente existente.',
          );
          return;
        }

        if (matchingCustomers.length > 0) {
          throw new Error(
            'Ese teléfono pertenece a un cliente inactivo. Actívalo en Clientes para usarlo en esta venta.',
          );
        }
        throw new Error(
          'Ese teléfono ya está registrado. Busca el cliente en la lista antes de continuar.',
        );
      }

      const response = await fetch('/api/data/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone: normalizedPhone,
          document: '',
          authorization: {
            accepted: authorizationAccepted,
            noticeVersion: CUSTOMER_DATA_NOTICE_VERSION,
            source: 'formulario',
          },
        }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      const body = (await response.json()) as ApiResponse<CustomerSaveResult>;
      if (!body.data?.customer) {
        throw new Error('No se pudo confirmar el registro del cliente.');
      }

      setSelectedCustomer(body.data.customer);
      setCustomerSearch('');
      setCustomers([]);
      setShowNewCustomerForm(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
      setCustomerFormNotice(
        body.data.duplicatePhone
          ? 'El cliente se guardó y quedó seleccionado, pero ya existe otro registro con ese teléfono.'
          : 'Cliente guardado y seleccionado para esta venta.',
      );
    } catch (saveError) {
      setCustomerFormError(
        saveError instanceof Error ? saveError.message : 'No se pudo guardar el cliente.',
      );
    } finally {
      setSavingCustomer(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 pb-[calc(10rem+env(safe-area-inset-bottom))] sm:px-8 lg:px-16 md:pb-8">
      <PageHeader
        title="Registrar venta"
        description="Sigue los pasos para registrar una venta."
      />

      {error && (
        <p role="alert" className="mb-4 rounded-md bg-danger/10 p-3 text-sm">
          {error}
        </p>
      )}

      <div
        className={
          confirmedSale
            ? 'mx-auto max-w-xl'
            : 'grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]'
        }
      >
        {!confirmedSale && (
          <div className="space-y-4">
            <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
              <h2 className="text-lg font-semibold">
                <span className="mr-2 text-muted">1.</span>Cliente
              </h2>
              <p className="mt-1 text-sm text-muted">
                Busca por nombre o teléfono. Es opcional para ventas de contado.
              </p>
              {selectedCustomer ? (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3">
                  <span className="min-h-11 content-center font-medium">
                    {selectedCustomer.name} · {selectedCustomer.phone}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(null);
                      setCustomerSearch('');
                    }}
                    className="min-h-11 px-3 font-medium underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                <>
                  <label htmlFor="sale-customer-search" className="sr-only">
                    Buscar cliente por nombre o teléfono
                  </label>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input
                      id="sale-customer-search"
                      type="search"
                      value={customerSearch}
                      onChange={(event) => setCustomerSearch(event.target.value)}
                      placeholder="Nombre o teléfono"
                      autoComplete="off"
                      className="min-h-11 w-full min-w-0 flex-1 rounded-md border border-border bg-background px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewCustomerForm((show) => !show);
                        setCustomerFormError('');
                        setCustomerFormNotice('');
                      }}
                      aria-expanded={showNewCustomerForm}
                      className="min-h-11 shrink-0 rounded-md border border-border px-3 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      {showNewCustomerForm ? 'Cerrar formulario' : 'Nuevo cliente'}
                    </button>
                  </div>
                  {customers.length > 0 && (
                    <ul
                      className="mt-2 max-h-48 divide-y divide-border overflow-auto rounded-md border border-border"
                      aria-label="Resultados de clientes"
                    >
                      {customers.map((customer) => (
                        <li key={customer.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setCustomerSearch('');
                              setCustomers([]);
                            }}
                            className="min-h-12 w-full px-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-primary"
                          >
                            <span className="block font-medium">{customer.name}</span>
                            <span className="text-sm text-muted">{customer.phone}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {customerSearch.trim() && customers.length === 0 && (
                    <p className="mt-2 text-sm text-muted">No se encontraron clientes activos.</p>
                  )}
                  {showNewCustomerForm && (
                    <form
                      data-testid="new-customer-form"
                      onSubmit={(event) => void saveNewCustomer(event)}
                      className="mt-4 grid gap-3 rounded-md border border-border bg-background p-3"
                    >
                      <h3 className="font-semibold">Registrar un cliente</h3>
                      <label htmlFor="sale-new-customer-name" className="block font-medium">
                        Nombre
                        <input
                          id="sale-new-customer-name"
                          name="name"
                          required
                          autoComplete="name"
                          value={newCustomerName}
                          onChange={(event) => setNewCustomerName(event.target.value)}
                          className="mt-1 min-h-11 w-full rounded-md border border-border bg-surface px-3 font-normal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        />
                      </label>
                      <label htmlFor="sale-new-customer-phone" className="block font-medium">
                        Teléfono
                        <input
                          id="sale-new-customer-phone"
                          name="phone"
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel-national"
                          required
                          maxLength={10}
                          pattern="[0-9]{10}"
                          value={newCustomerPhone}
                          onChange={(event) =>
                            setNewCustomerPhone(event.target.value.replace(/\D/g, '').slice(0, 10))
                          }
                          aria-describedby="sale-new-customer-phone-help"
                          className="mt-1 min-h-11 w-full rounded-md border border-border bg-surface px-3 font-normal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        />
                        <span
                          id="sale-new-customer-phone-help"
                          className="mt-1 block text-sm text-muted"
                        >
                          Escribe los 10 dígitos del celular.
                        </span>
                      </label>
                      <fieldset className="grid gap-2 rounded-md border border-border p-3">
                        <legend className="px-1 text-sm font-semibold">
                          Autorización de tratamiento de datos
                        </legend>
                        <p className="text-sm">{CUSTOMER_DATA_NOTICE}</p>
                        <p className="text-xs text-muted">
                          Versión del aviso: {CUSTOMER_DATA_NOTICE_VERSION}
                        </p>
                        <label className="flex min-h-11 items-center gap-3 py-2 text-sm">
                          <input
                            name="authorizationAccepted"
                            type="checkbox"
                            required
                            className="h-5 w-5 shrink-0"
                          />
                          <span>El cliente leyó y autorizó el tratamiento de sus datos.</span>
                        </label>
                      </fieldset>
                      {customerFormError && (
                        <p role="alert" className="text-sm text-danger">
                          {customerFormError}
                        </p>
                      )}
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                          type="submit"
                          disabled={savingCustomer}
                          className="min-h-11 rounded-md border border-border px-4 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
                        >
                          {savingCustomer ? 'Guardando…' : 'Guardar y usar en esta venta'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowNewCustomerForm(false);
                            setNewCustomerName('');
                            setNewCustomerPhone('');
                            setCustomerFormError('');
                          }}
                          className="min-h-11 rounded-md border border-border px-4 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(null);
                      setCustomerSearch('');
                      setCustomers([]);
                      setPaymentType('cash');
                      setInitialPayment('');
                    }}
                    aria-pressed={paymentType === 'cash' && !selectedCustomer}
                    className="mt-3 min-h-11 w-full rounded-md border border-border px-3 text-left font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    Venta de contado sin cliente
                  </button>
                </>
              )}
              {customerFormNotice && (
                <p role="status" className="mt-2 text-sm text-success">
                  {customerFormNotice}
                </p>
              )}
              <Link
                href="/customers"
                className="mt-3 inline-flex min-h-11 items-center font-medium underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Ir a clientes
              </Link>
              {customerRequired && !selectedCustomer && (
                <p className="mt-2 text-sm text-danger">
                  Elige un cliente para vender fiado o a pago parcial.
                </p>
              )}
            </section>

            <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
              <h2 className="text-lg font-semibold">
                <span className="mr-2 text-muted">2.</span>Producto
              </h2>
              <p className="mt-1 text-sm text-muted">
                Escanea con la cámara, escribe un código o busca por nombre.
              </p>
              <form
                className="mt-3"
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
                  className="min-h-11 w-full rounded-md border border-border bg-background px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                />
                <button
                  type="submit"
                  disabled={searchingProduct}
                  className="mt-2 min-h-11 w-full rounded-md border border-border px-4 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
                >
                  {searchingProduct ? 'Buscando…' : 'Agregar por código'}
                </button>
              </form>

              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => void startCamera()}
                  disabled={cameraActive}
                  className="min-h-11 w-full rounded-md border border-primary px-4 font-semibold text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
                >
                  {cameraActive ? 'Cámara activa' : 'Usar cámara'}
                </button>
                {cameraActive && (
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="mt-2 min-h-11 w-full rounded-md border border-border px-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    Apagar cámara
                  </button>
                )}
                {cameraMessage && (
                  <p role="status" className="mt-2 text-sm">
                    {cameraMessage}
                  </p>
                )}
                <video
                  ref={videoRef}
                  className={`mt-3 w-full rounded-md bg-background ${cameraActive ? 'block' : 'hidden'}`}
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
                  className="min-h-11 min-w-0 flex-1 rounded-md border border-border bg-background px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                />
                <button
                  type="submit"
                  disabled={searchingProduct}
                  className="min-h-11 rounded-md border border-primary px-4 font-semibold text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
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
                        className="min-h-12 w-full py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-primary"
                      >
                        <span className="block font-medium">{product.name}</span>
                        <span className="text-sm text-muted">
                          {product.code} · {product.size || 'Sin talla'} ·{' '}
                          {product.color || 'Sin color'} · {formatCOP(product.salePrice)} · Stock
                          informativo: {product.stock}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
              <h2 className="text-lg font-semibold">
                <span className="mr-2 text-muted">3.</span>Forma de pago
              </h2>
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
                    className={`min-h-11 rounded-md border px-3 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                      paymentType === value
                        ? 'border-primary bg-primary/10 text-primary dark:bg-primary dark:text-primary-foreground'
                        : 'border-border'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

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
                    className="min-h-11 w-full rounded-md border border-border bg-background px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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
                    className="min-h-11 w-full rounded-md border border-border bg-background px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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
          </div>
        )}

        <aside className={confirmedSale ? '' : 'md:sticky md:top-20 md:self-start'}>
          <form
            id="sale-form"
            data-testid="sale-form"
            onSubmit={(event) => void submitSale(event)}
            className="rounded-lg border border-border bg-surface p-4 shadow-sm"
          >
            <h2 className="text-lg font-semibold">4. Resumen de la venta</h2>
            <div className="mt-3 border-b border-border pb-3">
              <p className="text-sm text-muted">Cliente</p>
              <p className="font-medium">
                {confirmedSale
                  ? (confirmedSale.customerName ?? 'Sin cliente')
                  : (selectedCustomer?.name ??
                    (customerRequired ? 'Elige un cliente' : 'Sin cliente'))}
              </p>
            </div>
            <div className="mt-3 border-b border-border pb-3">
              <p className="text-sm text-muted">Forma de pago</p>
              <p className="font-medium">
                {summaryPaymentType === 'cash'
                  ? 'Contado'
                  : summaryPaymentType === 'credit'
                    ? 'Fiado'
                    : 'Pago parcial'}
              </p>
            </div>

            {cart.length === 0 ? (
              <p className="mt-3 text-sm text-muted">Agrega productos para iniciar la venta.</p>
            ) : (
              <ul className="mt-2 divide-y divide-border">
                {cart.map(({ product, quantity }) => (
                  <li key={product.id} className="py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted">
                          {product.code} · {formatCOP(product.salePrice)} c/u
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label={`Quitar ${product.name}`}
                        onClick={() => changeQuantity(product.id, 0)}
                        className="min-h-11 min-w-11 rounded-md px-2 text-sm font-medium underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      >
                        Quitar
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <label htmlFor={`sale-quantity-${product.id}`} className="text-sm">
                        Cantidad
                      </label>
                      <input
                        id={`sale-quantity-${product.id}`}
                        aria-label={`Cantidad de ${product.name}`}
                        type="number"
                        min="0"
                        step="1"
                        value={quantity}
                        onChange={(event) => changeQuantity(product.id, Number(event.target.value))}
                        className="min-h-11 w-24 rounded-md border border-border bg-background px-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      />
                      <span className="font-semibold">
                        {formatCOP(product.salePrice * quantity)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 border-t border-border pt-4">
              <p className="text-sm text-muted">Total</p>
              <p data-testid="sale-total" className="text-3xl font-bold tracking-tight">
                {formatCOP(summaryTotal)}
              </p>
              <p className="mt-1 text-xs text-muted">
                El precio final se confirma al registrar la venta.
              </p>
            </div>

            {confirmedSale && (
              <section
                aria-label="Comprobante de venta"
                className="mt-4 rounded-md border border-border bg-background p-3"
              >
                <h3 className="font-semibold">5. Comprobante de {confirmedSale.saleNumber}</h3>
                {confirmedSale.customerName && (
                  <p className="mt-1 text-sm text-muted">Cliente: {confirmedSale.customerName}</p>
                )}
                {notice && (
                  <p
                    role="status"
                    className="mt-2 rounded-md bg-success/10 p-3 text-sm font-medium"
                  >
                    {notice}
                  </p>
                )}
                {outOfStockProducts.length > 0 && (
                  <div
                    className="mt-3 rounded-md border border-warning/30 bg-warning/10 p-3 text-warning"
                  >
                    <p role="status" className="text-sm font-semibold">
                      {outOfStockProducts.length === 1 ? 'Se agotó: ' : 'Se agotaron: '}
                      {outOfStockProducts
                        .map(
                          (product) =>
                            `${product.name}, talla ${product.size}, color ${product.color}`,
                        )
                        .join('; ')}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        href="/purchases"
                        className="inline-flex min-h-11 items-center justify-center rounded-md border border-warning/50 px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      >
                        Reponer
                      </Link>
                      <button
                        type="button"
                        onClick={() => setOutOfStockProducts([])}
                        className="min-h-11 rounded-md px-4 text-sm font-semibold underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      >
                        Entendido
                      </button>
                    </div>
                  </div>
                )}
                {receiptNotice && (
                  <p
                    role="status"
                    className="mt-2 rounded-md bg-success/10 p-3 text-sm font-medium"
                  >
                    {receiptNotice}
                  </p>
                )}
                {receiptError && (
                  <p role="alert" className="mt-2 rounded-md bg-danger/10 p-3 text-sm">
                    {receiptError}
                  </p>
                )}
                {receiptActions(
                  confirmedSale.id,
                  confirmedSale.saleNumber,
                  confirmedSale.customerPhone,
                )}
                <button
                  type="button"
                  onClick={startNewSale}
                  className="mt-3 min-h-11 w-full rounded-md border border-border px-4 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Nueva venta
                </button>
              </section>
            )}
          </form>
          {!confirmedSale && (
            <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-40 border-t border-border bg-surface px-4 py-2 shadow-lg md:static md:mt-4 md:border-0 md:bg-transparent md:px-0 md:py-0 md:shadow-none">
              <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 md:block">
                <div className="min-w-0 md:hidden">
                  <p className="text-xs text-muted">Total</p>
                  <p className="truncate text-lg font-bold">{formatCOP(total)}</p>
                </div>
                <button
                  type="submit"
                  form="sale-form"
                  data-primary-action
                  disabled={!canSell}
                  className="min-h-11 shrink-0 rounded-md bg-primary px-4 font-semibold text-primary-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60 md:w-full"
                >
                  {saving ? 'Registrando venta…' : 'Registrar venta'}
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>

      <section className="mt-4 rounded-lg border border-border bg-surface p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Ventas recientes</h2>
        {salesLoadError ? (
          <div className="mt-3">
            <RetryState
              message={salesLoadError}
              onRetry={() => setSalesRetryKey((key) => key + 1)}
            />
          </div>
        ) : loadingSales ? (
          <div className="mt-3">
            <LoadingState label="Cargando ventas recientes" />
          </div>
        ) : sales.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              action={
                <a
                  href="#sale-form"
                  className="inline-flex min-h-11 items-center rounded-md border border-border px-4 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Registrar una venta
                </a>
              }
            >
              Todavía no hay ventas.
            </EmptyState>
          </div>
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
