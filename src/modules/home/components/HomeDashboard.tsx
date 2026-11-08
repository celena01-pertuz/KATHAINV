'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { z } from 'zod';
import { productRecordSchema } from '@data/_schema/product.schema';
import { productSalesReportSchema } from '@/modules/reports/date-range';
import { fullNameSchema } from '@/lib/auth/schemas';
import type { ProductSalesReport } from '@/modules/reports/types';
import type { ProductRecord } from '@/modules/products/types';
import { getDayDescription, getPreviousBogotaDate, getProductsToRestock } from '../home-utils';

interface HomeDashboardProps {
  greeting: string;
  greetingName: string;
  initialDisplayName?: string | null;
  today: string;
}

const apiEnvelopeSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  code: z.string().optional(),
});
const productListResponseSchema = z.object({
  data: z.array(productRecordSchema),
});

class DashboardRequestError extends Error {
  constructor(
    message: string,
    readonly endpoint: string,
    readonly status?: number,
    readonly code?: string,
    readonly issues?: Array<{ path: string; code: string }>,
  ) {
    super(message);
    this.name = 'DashboardRequestError';
  }
}

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

async function readEnvelope(
  response: Response,
  endpoint: string,
): Promise<z.infer<typeof apiEnvelopeSchema>> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new DashboardRequestError(
      'La API devolvió una respuesta que no es JSON válido.',
      endpoint,
      response.status,
    );
  }
  const parsed = apiEnvelopeSchema.safeParse(body);
  if (!parsed.success) {
    throw new DashboardRequestError(
      'La respuesta de la API no tiene la estructura esperada.',
      endpoint,
      response.status,
      undefined,
      parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        code: issue.code,
      })),
    );
  }
  if (!response.ok || !parsed.data.success) {
    const apiCode =
      typeof parsed.data.code === 'string' && /^[A-Z0-9_]{1,60}$/.test(parsed.data.code)
        ? parsed.data.code
        : undefined;
    throw new DashboardRequestError(
      parsed.data.error ?? `La API respondió con HTTP ${response.status}.`,
      endpoint,
      response.status,
      apiCode,
    );
  }
  if (parsed.data.data === undefined) {
    throw new DashboardRequestError(
      'La respuesta de la API no incluye los datos esperados.',
      endpoint,
      response.status,
      'MISSING_DATA',
    );
  }
  return parsed.data;
}

function logDashboardError(source: string, error: unknown) {
  if (error instanceof DashboardRequestError) {
    console.error(`[Inicio] No se pudo cargar ${source}.`, {
      endpoint: error.endpoint,
      status: error.status,
      code: error.code,
      message: sanitizeDiagnosticMessage(error.message),
      issues: error.issues,
    });
    return;
  }

  const message =
    error instanceof Error ? sanitizeDiagnosticMessage(error.message) : 'Error desconocido.';
  console.error(`[Inicio] No se pudo cargar ${source}.`, { message });
}

function sanitizeDiagnosticMessage(message: string): string {
  return message
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[correo]')
    .replace(/\b(?:Bearer|Basic)\s+\S+/gi, '[credencial]')
    .replace(/\b(?:sb_secret_|sbp_)[A-Za-z0-9_-]+/gi, '[credencial]')
    .replace(/([?&](?:token|key|apikey|secret|password)=)[^&\s]+/gi, '$1[redactado]')
    .replace(/[^\S\r\n]+/g, ' ')
    .slice(0, 200);
}

function ActionIcon({ kind }: { kind: 'sale' | 'scan' | 'product' }) {
  const props = {
    'aria-hidden': true as const,
    className: 'h-6 w-6 shrink-0',
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 1.8,
    viewBox: '0 0 24 24',
  };

  if (kind === 'sale') {
    return (
      <svg {...props}>
        <path d="M4 5h16l-1.5 15h-13L4 5Z" />
        <path d="M9 9a3 3 0 0 0 6 0M8 3l-2 2m10-2 2 2" />
      </svg>
    );
  }
  if (kind === 'scan') {
    return (
      <svg {...props}>
        <path d="M4 8V5a1 1 0 0 1 1-1h3m8 0h3a1 1 0 0 1 1 1v3m0 8v3a1 1 0 0 1-1 1h-3m-8 0H5a1 1 0 0 1-1-1v-3M4 12h16M8 9v6m4-6v6m4-6v6" />
      </svg>
    );
  }
  return (
    <svg {...props}>
      <path d="M12 3v18M3 12h18" />
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  );
}

function SkeletonCard() {
  return (
    <div
      aria-hidden="true"
      className="animate-pulse rounded-xl border border-border bg-surface p-5"
    >
      <div className="h-4 w-28 rounded bg-muted/20" />
      <div className="mt-4 h-8 w-36 rounded bg-muted/20" />
      <div className="mt-3 h-3 w-48 max-w-full rounded bg-muted/20" />
    </div>
  );
}

function QuickAction({
  href,
  kind,
  label,
  primary = false,
}: {
  href: string;
  kind: 'sale' | 'scan' | 'product';
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex min-h-14 items-center gap-3 rounded-xl border px-4 py-3 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        primary
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-surface text-foreground hover:bg-primary/10'
      }`}
    >
      <ActionIcon kind={kind} />
      <span>{label}</span>
    </Link>
  );
}

export function HomeDashboard({
  greeting,
  greetingName: fallbackGreetingName,
  initialDisplayName,
  today,
}: HomeDashboardProps) {
  const [selectedDate, setSelectedDate] = useState(today);
  const [report, setReport] = useState<ProductSalesReport | null>(null);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [displayName, setDisplayName] = useState(initialDisplayName ?? '');
  const [nameDraft, setNameDraft] = useState(initialDisplayName ?? '');
  const [nameFormOpen, setNameFormOpen] = useState(!initialDisplayName);
  const [nameError, setNameError] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [inventoryError, setInventoryError] = useState(false);
  const [retry, setRetry] = useState(0);
  const yesterday = getPreviousBogotaDate(today);
  const restockProducts = getProductsToRestock(products);

  useEffect(() => {
    let active = true;

    async function loadDay() {
      setLoading(true);
      setError(false);
      setInventoryError(false);
      setReport(null);
      setProducts([]);

      const query = new URLSearchParams({ from: selectedDate, to: selectedDate });
      const reportEndpoint = `/api/data/reports?${query}`;
      const reportRequest = (async () => {
        try {
          const response = await fetch(reportEndpoint, { cache: 'no-store' });
          const body = await readEnvelope(response, '/api/data/reports');
          const parsed = productSalesReportSchema.safeParse(body.data);
          if (!parsed.success) {
            throw new DashboardRequestError(
              'La respuesta del reporte no coincide con su esquema.',
              '/api/data/reports',
              response.status,
              'REPORT_SCHEMA_MISMATCH',
              parsed.error.issues.map((issue) => ({
                path: issue.path.join('.'),
                code: issue.code,
              })),
            );
          }
          if (active) setReport(parsed.data);
        } catch (loadError) {
          logDashboardError('el reporte diario', loadError);
          if (active) setError(true);
        }
      })();
      const inventoryRequest = (async () => {
        try {
          const response = await fetch('/api/data/products', { cache: 'no-store' });
          const body = await readEnvelope(response, '/api/data/products');
          const parsed = productListResponseSchema.safeParse(body.data);
          if (!parsed.success) {
            throw new DashboardRequestError(
              'La respuesta de productos no coincide con su esquema.',
              '/api/data/products',
              response.status,
              'PRODUCTS_SCHEMA_MISMATCH',
              parsed.error.issues.map((issue) => ({
                path: issue.path.join('.'),
                code: issue.code,
              })),
            );
          }
          if (active) setProducts(parsed.data.data);
        } catch (loadError) {
          logDashboardError('el inventario para reponer', loadError);
          if (active) setInventoryError(true);
        }
      })();

      await Promise.all([reportRequest, inventoryRequest]);
      if (active) setLoading(false);
    }

    void loadDay();
    return () => {
      active = false;
    };
  }, [selectedDate, retry]);

  function chooseDate(date: string) {
    if (date && date <= today) setSelectedDate(date);
  }

  const isToday = selectedDate === today;
  const isYesterday = selectedDate === yesterday;
  const dateDescription = getDayDescription(selectedDate, today);
  const noSalesMessage = isToday ? 'Hoy todavía no hay ventas.' : 'Ese día no hubo ventas.';
  const topProducts = report?.mostSold.slice(0, 3) ?? [];

  async function saveDisplayName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedName = fullNameSchema.safeParse(nameDraft);
    if (!parsedName.success) {
      setNameError(parsedName.error.issues[0]?.message ?? 'El nombre no es válido.');
      return;
    }

    setNameError('');
    setNameSaving(true);
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: parsedName.data }),
      });
      const body: unknown = await response.json();
      const result = body && typeof body === 'object' && 'data' in body ? body.data : undefined;
      const savedName =
        result && typeof result === 'object' && 'fullName' in result ? result.fullName : undefined;
      const validatedName = fullNameSchema.safeParse(savedName);
      if (!response.ok || !validatedName.success) {
        throw new Error('No se pudo guardar.');
      }

      setDisplayName(validatedName.data);
      setNameDraft(validatedName.data);
      setNameFormOpen(false);
    } catch {
      setNameError('No pudimos guardar tu nombre. Intenta de nuevo.');
    } finally {
      setNameSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-6 pt-2 sm:px-8 lg:px-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">
          {greeting}
          {displayName || fallbackGreetingName ? `, ${displayName || fallbackGreetingName}` : ''}
        </h1>
        <p className="mt-1 text-sm text-muted">{dateDescription}.</p>
      </header>

      {nameFormOpen ? (
        <section
          aria-label="Completar nombre"
          className="mb-6 rounded-xl border border-border bg-surface p-4 sm:p-5"
        >
          <h2 className="text-lg font-semibold">¿Cómo te llamamos?</h2>
          <p className="mt-1 text-sm text-muted">Agrega tu nombre para personalizar el saludo.</p>
          <form
            onSubmit={saveDisplayName}
            className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <label className="grid flex-1 gap-1 text-sm font-medium">
              ¿Cómo te llamamos?
              <input
                type="text"
                name="fullName"
                autoComplete="name"
                minLength={2}
                maxLength={40}
                required
                value={nameDraft}
                onChange={(event) => {
                  setNameDraft(event.target.value);
                  setNameError('');
                }}
                aria-invalid={Boolean(nameError)}
                aria-describedby={nameError ? 'display-name-error' : undefined}
                className="min-h-11 rounded-lg border border-border bg-background px-3 text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              />
              {nameError && (
                <span id="display-name-error" role="alert" className="text-sm text-danger">
                  {nameError}
                </span>
              )}
            </label>
            <button
              type="submit"
              disabled={nameSaving}
              className="min-h-11 rounded-lg border border-border bg-surface px-5 font-semibold text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary hover:bg-background disabled:opacity-60"
            >
              {nameSaving ? 'Guardando...' : 'Guardar'}
            </button>
            {displayName && (
              <button
                type="button"
                onClick={() => {
                  setNameDraft(displayName);
                  setNameError('');
                  setNameFormOpen(false);
                }}
                className="min-h-11 rounded-lg px-4 font-medium text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary hover:text-foreground"
              >
                Cancelar
              </button>
            )}
          </form>
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setNameFormOpen(true)}
          className="mb-6 min-h-11 font-medium text-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Cambiar mi nombre
        </button>
      )}

      <section aria-label="Elegir día del reporte" className="mb-6 flex flex-wrap items-end gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            aria-pressed={isToday}
            onClick={() => chooseDate(today)}
            className={`min-h-11 rounded-lg border px-4 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              isToday
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-surface hover:bg-primary/10'
            }`}
          >
            Hoy
          </button>
          <button
            type="button"
            aria-pressed={isYesterday}
            onClick={() => chooseDate(yesterday)}
            className={`min-h-11 rounded-lg border px-4 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              isYesterday
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-surface hover:bg-primary/10'
            }`}
          >
            Ayer
          </button>
        </div>
        <label className="grid gap-1 text-sm font-medium">
          Elegir fecha
          <input
            aria-label="Elegir fecha"
            type="date"
            value={selectedDate}
            max={today}
            onChange={(event) => chooseDate(event.target.value)}
            className="min-h-11 rounded-lg border border-border bg-surface px-3"
          />
        </label>
      </section>

      {loading ? (
        <section role="status" aria-label="Cargando reporte" className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </section>
      ) : error ? (
        <section role="alert" className="rounded-xl border border-danger/30 bg-surface p-5">
          <p>No pudimos cargar el reporte. Intenta de nuevo.</p>
          <button
            type="button"
            onClick={() => setRetry((current) => current + 1)}
            className="mt-4 min-h-11 rounded-lg bg-primary px-5 font-semibold text-primary-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Reintentar
          </button>
        </section>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-6">
            <section aria-label="Resumen del día" className="grid grid-cols-2 gap-3">
              <article className="rounded-xl border border-border bg-surface p-4 sm:p-5">
                <h2 className="text-sm font-medium text-muted">Ventas</h2>
                <p className="mt-2 text-2xl font-bold">
                  {numberFormatter.format(report?.summary.salesCount ?? 0)}
                </p>
              </article>
              <article className="rounded-xl border border-border bg-surface p-4 sm:p-5">
                <h2 className="text-sm font-medium text-muted">Total vendido</h2>
                <p className="mt-2 text-xl font-bold sm:text-2xl">
                  {currencyFormatter.format(report?.summary.totalSold ?? 0)}
                </p>
              </article>
            </section>

            <section aria-label="Accesos rápidos" className="space-y-3">
              <h2 className="text-lg font-semibold">Accesos rápidos</h2>
              <QuickAction href="/sales" kind="sale" label="Nueva venta" primary />
              <QuickAction href="/scan" kind="scan" label="Escanear" />
              <QuickAction href="/products" kind="product" label="Registrar producto" />
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
              <h2 className="text-lg font-semibold">Lo más vendido</h2>
              {report?.summary.salesCount === 0 ? (
                <p className="mt-3 text-sm text-muted">{noSalesMessage}</p>
              ) : topProducts.length === 0 ? (
                <p className="mt-3 text-sm text-muted">No hubo productos vendidos ese día.</p>
              ) : (
                <ol className="mt-3 divide-y divide-border">
                  {topProducts.map((product) => (
                    <li
                      key={product.id}
                      className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div>
                        <p className="font-semibold">{product.name}</p>
                        <p className="text-sm text-muted">
                          Talla {product.size} · Color {product.color}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold">
                        {numberFormatter.format(product.unitsSold)}{' '}
                        {product.unitsSold === 1 ? 'unidad' : 'unidades'}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Por reponer</h2>
                <Link
                  href="/products"
                  className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Ver productos
                </Link>
              </div>
              {restockProducts.length === 0 ? (
                <p className="mt-3 text-sm text-muted">
                  {inventoryError
                    ? 'No pudimos cargar el inventario.'
                    : 'Todo el inventario está al día.'}
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-border">
                  {restockProducts.map((product) => (
                    <li
                      key={product.id}
                      className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div>
                        <p className="font-semibold">{product.name}</p>
                        <p className="text-sm text-muted">
                          Talla {product.size} · Color {product.color}
                        </p>
                      </div>
                      <p className="shrink-0 text-right text-sm font-semibold">
                        {product.stock === 0
                          ? 'Agotado'
                          : `${numberFormatter.format(product.stock)} en stock`}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}
      <div className="mt-6">
        <Link
          href="/reports"
          className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Ver reporte completo
        </Link>
      </div>
    </main>
  );
}
