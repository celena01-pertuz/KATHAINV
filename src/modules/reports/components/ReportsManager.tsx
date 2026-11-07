'use client';

import { useEffect, useState, type FormEvent } from 'react';
import {
  getDefaultReportDateRange,
  getQuickReportDateRange,
  productSalesReportSchema,
  reportDateRangeSchema,
} from '../date-range';
import type { ProductSalesReport, ReportDateRange, ReportProduct } from '../types';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

type ReportTab = 'most' | 'least';
type QuickPeriod = 'today' | '7days' | '30days' | 'month';

const quickPeriods: { id: QuickPeriod; label: string }[] = [
  { id: 'today', label: 'Hoy' },
  { id: '7days', label: '7 días' },
  { id: '30days', label: '30 días' },
  { id: 'month', label: 'Este mes' },
];

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

async function readResponse<T>(response: Response): Promise<ApiResponse<T>> {
  return (await response.json()) as ApiResponse<T>;
}

export function ReportsManager() {
  const [range, setRange] = useState<ReportDateRange>(getDefaultReportDateRange);
  const [draftRange, setDraftRange] = useState<ReportDateRange>(getDefaultReportDateRange);
  const [report, setReport] = useState<ProductSalesReport | null>(null);
  const [tab, setTab] = useState<ReportTab>('most');
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rangeError, setRangeError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadReport() {
      setLoading(true);
      setError('');
      setReport(null);
      try {
        const query = new URLSearchParams({ from: range.from, to: range.to });
        const response = await fetch(`/api/data/reports?${query}`, { cache: 'no-store' });
        const body = await readResponse<ProductSalesReport>(response);
        if (!response.ok) throw new Error(body.error ?? 'No se pudieron consultar los reportes.');
        if (!body.data) throw new Error('La respuesta del reporte no tiene un formato válido.');
        const parsed = productSalesReportSchema.safeParse(body.data);
        if (!parsed.success) throw new Error('La respuesta del reporte no tiene un formato válido.');
        if (active) setReport(parsed.data);
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'No se pudieron consultar los reportes.',
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadReport();
    return () => {
      active = false;
    };
  }, [range]);

  function choosePeriod(period: QuickPeriod) {
    const nextRange = getQuickReportDateRange(period);
    setDraftRange(nextRange);
    setRange(nextRange);
    setRangeError('');
  }

  function applyDateRange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = reportDateRangeSchema.safeParse(draftRange);
    if (!parsed.success) {
      setRangeError(parsed.error.issues.map((issue) => issue.message).join(' '));
      return;
    }
    setRangeError('');
    setRange(parsed.data);
  }

  const products = tab === 'most' ? report?.mostSold ?? [] : report?.leastSold ?? [];
  const visibleProducts = showAll ? products : products.slice(0, 10);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 lg:px-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">Reportes</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Productos más y menos vendidos por periodo.
        </p>
      </header>

      <section
        aria-label="Rango de fechas"
        className="mb-6 rounded-xl border border-border bg-card p-4 sm:p-5"
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {quickPeriods.map((period) => (
            <button
              key={period.id}
              type="button"
              onClick={() => choosePeriod(period.id)}
              className="min-h-11 rounded-lg border border-border px-3 text-sm font-medium hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              {period.label}
            </button>
          ))}
        </div>
        <form onSubmit={applyDateRange} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <label className="grid gap-1 text-sm font-medium">
            Desde
            <input
              type="date"
              value={draftRange.from}
              onChange={(event) =>
                setDraftRange((current) => ({ ...current, from: event.target.value }))
              }
              className="min-h-11 rounded-lg border border-border bg-background px-3"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Hasta
            <input
              type="date"
              value={draftRange.to}
              onChange={(event) =>
                setDraftRange((current) => ({ ...current, to: event.target.value }))
              }
              className="min-h-11 rounded-lg border border-border bg-background px-3"
            />
          </label>
          <button
            type="submit"
            className="min-h-11 self-end rounded-lg bg-primary px-5 font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Consultar
          </button>
        </form>
        <p className="mt-3 text-xs text-muted-foreground">Fechas en zona horaria de Colombia.</p>
        {rangeError && (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {rangeError}
          </p>
        )}
      </section>

      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-destructive/30 p-4 text-sm">
          {error}
        </p>
      )}

      <section aria-label="Resumen del periodo" className="mb-6 grid gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Unidades vendidas"
          value={numberFormatter.format(report?.summary.unitsSold ?? 0)}
        />
        <SummaryCard label="Total vendido" value={currencyFormatter.format(report?.summary.totalSold ?? 0)} />
        <SummaryCard label="Ventas" value={numberFormatter.format(report?.summary.salesCount ?? 0)} />
      </section>

      <section className="rounded-xl border border-border bg-card">
        <div
          role="tablist"
          aria-label="Orden de productos"
          className="grid grid-cols-2 border-b border-border p-2"
        >
          <TabButton
            selected={tab === 'most'}
            onClick={() => {
              setTab('most');
              setShowAll(false);
            }}
          >
            Más vendidos
          </TabButton>
          <TabButton
            selected={tab === 'least'}
            onClick={() => {
              setTab('least');
              setShowAll(false);
            }}
          >
            Menos vendidos
          </TabButton>
        </div>
        <div className="p-4 sm:p-5">
          {loading && <p role="status">Cargando reportes…</p>}
          {!loading && report?.summary.salesCount === 0 && (
            <p className="mb-4 rounded-lg bg-muted p-3 text-sm">No hay ventas en este rango</p>
          )}
          {!loading && !error && products.length === 0 && report?.summary.salesCount !== 0 && (
            <p className="text-sm text-muted-foreground">No hay productos para mostrar.</p>
          )}
          {!loading && visibleProducts.length > 0 && (
            <ul className="space-y-3">
              {visibleProducts.map((product) => (
                <li key={product.id}>
                  <ProductCard product={product} />
                </li>
              ))}
            </ul>
          )}
          {!loading && products.length > 10 && (
            <button
              type="button"
              onClick={() => setShowAll((current) => !current)}
              className="mt-4 min-h-11 w-full rounded-lg border border-border px-4 font-medium hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:w-auto"
            >
              {showAll ? 'Ver menos' : 'Ver más'}
            </button>
          )}
        </div>
      </section>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <h2 className="text-sm text-muted-foreground">{label}</h2>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </article>
  );
}

function TabButton({
  children,
  selected,
  onClick,
}: {
  children: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={`min-h-11 rounded-lg px-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
        selected ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-primary/10'
      }`}
    >
      {children}
    </button>
  );
}

function ProductCard({ product }: { product: ReportProduct }) {
  return (
    <article className="grid gap-2 rounded-lg border border-border p-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="min-w-0">
        <p className="font-semibold">{product.name}</p>
        <p className="mt-1 break-words text-sm text-muted-foreground">
          {product.code} · Talla: {product.size || '—'} · Color: {product.color || '—'}
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-4 text-sm sm:text-right">
        <div>
          <dt className="text-muted-foreground">Unidades</dt>
          <dd className="font-semibold">{numberFormatter.format(product.unitsSold)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Total vendido</dt>
          <dd className="font-semibold">{currencyFormatter.format(product.totalSold)}</dd>
        </div>
      </dl>
    </article>
  );
}
