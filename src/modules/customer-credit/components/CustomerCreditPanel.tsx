'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { CUSTOMER_CREDIT_LABELS } from '../labels';
import { daysSinceBogotaDate } from '../date-utils';
import { customerCreditDetailSchema } from '../schemas';
import type { CustomerCreditDetail, CustomerCreditOverview } from '../types';
import { buildCustomerCreditReminderUrl } from '../whatsapp';
import type { CustomerRecord } from '@/modules/customers/types';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const paymentMethods = [
  ['efectivo', 'Efectivo'],
  ['transferencia', 'Transferencia'],
  ['nequi', 'Nequi'],
  ['tarjeta', 'Tarjeta'],
] as const;

function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPesosInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(
    Number(digits || 0),
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date(value));
}

async function responseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ApiResponse<unknown>;
    return body.error ?? 'No se pudo completar la operación.';
  } catch {
    return 'No se pudo completar la operación.';
  }
}

export function CustomerCreditPanel({
  customer,
  overview,
  onChanged,
}: {
  customer: CustomerRecord;
  overview: CustomerCreditOverview | undefined;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<CustomerCreditDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState('0');
  const [paymentMethod, setPaymentMethod] =
    useState<(typeof paymentMethods)[number][0]>('efectivo');
  const [note, setNote] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const balance = overview?.balance;
  const amountValue = Number(amount.replace(/\D/g, '') || 0);

  useEffect(() => {
    const controller = new AbortController();
    async function loadDetail() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(
          `/api/data/customer-credit?customerId=${encodeURIComponent(customer.id)}`,
          { cache: 'no-store', signal: controller.signal },
        );
        if (!response.ok) throw new Error(await responseError(response));
        const body = (await response.json()) as ApiResponse<unknown>;
        const parsed = customerCreditDetailSchema.safeParse(body.data);
        if (!parsed.success) throw new Error('El detalle de cartera no tiene un formato válido.');
        setDetail(parsed.data);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'No se pudo cargar el detalle de cartera.',
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadDetail();
    return () => controller.abort();
  }, [customer.id, refreshKey]);

  async function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    if (balance === undefined || amountValue <= 0 || amountValue > balance) {
      setError('El abono debe ser mayor que cero y no superar el saldo pendiente.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/data/customer-credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customer.id,
          amount: amountValue,
          paymentMethod,
          note: note.trim() || undefined,
          requestKey: crypto.randomUUID(),
        }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      setShowForm(false);
      setAmount('0');
      setNote('');
      setNotice('Abono registrado.');
      setRefreshKey((key) => key + 1);
      onChanged();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo registrar el abono.');
    } finally {
      setSaving(false);
    }
  }

  async function voidPayment(paymentId: number) {
    const reason = window.prompt('Escribe el motivo para anular este abono:')?.trim();
    if (!reason) return;
    if (!window.confirm('¿Confirmas la anulación? El saldo pendiente volverá a aumentar.')) return;

    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/data/customer-credit', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, reason }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      setNotice('Abono anulado; el saldo pendiente fue recalculado.');
      setRefreshKey((key) => key + 1);
      onChanged();
    } catch (voidError) {
      setError(voidError instanceof Error ? voidError.message : 'No se pudo anular el abono.');
    }
  }

  const reminder = buildCustomerCreditReminderUrl(
    customer.phone,
    customer.name,
    balance ?? 0,
  );
  const pendingDays = overview?.oldestDebtAt
    ? daysSinceBogotaDate(overview.oldestDebtAt)
    : null;

  return (
    <section className="space-y-4 rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div>
        <h3 className="text-lg font-semibold">Cartera del cliente</h3>
        <p className="mt-1 font-semibold text-warning">
          {balance === undefined
            ? 'Saldo no disponible'
            : balance > 0
              ? CUSTOMER_CREDIT_LABELS.balance(formatCOP(balance))
              : CUSTOMER_CREDIT_LABELS.paidUp}
        </p>
        {balance !== undefined && balance > 0 && pendingDays !== null && (
          <p className="text-sm text-warning">
            {CUSTOMER_CREDIT_LABELS.pendingDays(pendingDays)}
          </p>
        )}
      </div>

      {error && <p role="alert" className="rounded-md bg-danger/10 p-3 text-sm">{error}</p>}
      {notice && <p role="status" className="rounded-md bg-success/10 p-3 text-sm">{notice}</p>}

      <div className="flex flex-wrap gap-2">
        {balance !== undefined && balance > 0 && (
          <button
            type="button"
            onClick={() => setShowForm((visible) => !visible)}
            className="min-h-11 rounded-md border border-primary px-4 font-semibold text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {CUSTOMER_CREDIT_LABELS.registerPayment}
          </button>
        )}
        {balance !== undefined && balance > 0 && reminder && (
          <a
            href={reminder}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center rounded-md border border-border px-4 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {CUSTOMER_CREDIT_LABELS.sendReminder}
          </a>
        )}
        {balance !== undefined && customer.active && (
          <Link
            href={`/sales?customerId=${encodeURIComponent(customer.id)}`}
            className="inline-flex min-h-11 items-center rounded-md border border-border px-4 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {CUSTOMER_CREDIT_LABELS.newCreditSale}
          </Link>
        )}
      </div>

      {showForm && balance !== undefined && balance > 0 && (
        <form onSubmit={(event) => void submitPayment(event)} className="grid gap-3">
          <label>
            <span className="mb-1 block text-sm font-medium">Monto del abono</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              required
              value={amount}
              onChange={(event) => setAmount(formatPesosInput(event.target.value))}
              className="min-h-11 w-full rounded-md border border-border bg-background px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Medio de pago</span>
            <select
              value={paymentMethod}
              onChange={(event) =>
                setPaymentMethod(event.target.value as (typeof paymentMethods)[number][0])
              }
              className="min-h-11 w-full rounded-md border border-border bg-background px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {paymentMethods.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Nota (opcional)</span>
            <input
              value={note}
              maxLength={500}
              onChange={(event) => setNote(event.target.value)}
              className="min-h-11 w-full rounded-md border border-border bg-background px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={
                saving ||
                balance === undefined ||
                amountValue <= 0 ||
                amountValue > balance
              }
              className="min-h-11 rounded-md bg-primary px-4 font-semibold text-primary-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
            >
              {saving ? 'Registrando…' : CUSTOMER_CREDIT_LABELS.registerPayment}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="min-h-11 rounded-md border border-border px-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p role="status" className="text-sm text-muted">Cargando detalle de cartera…</p>
      ) : (
        <>
          <div>
            <h4 className="font-semibold">Ventas con saldo</h4>
            {detail?.sales.length ? (
              <ul className="mt-2 divide-y divide-border">
                {detail.sales.map((sale) => (
                  <li key={sale.id} className="py-2 text-sm">
                    <p className="font-medium">{sale.saleNumber} · {formatDate(sale.soldAt)}</p>
                    <p>Total {formatCOP(sale.total)} · Pagado {formatCOP(sale.paid)}</p>
                    <p className="font-semibold text-warning">
                      Saldo {formatCOP(sale.balance)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted">No hay ventas activas con saldo.</p>
            )}
          </div>
          <div>
            <h4 className="font-semibold">Historial de abonos</h4>
            {detail?.payments.length ? (
              <ul className="mt-2 divide-y divide-border">
                {detail.payments.map((payment) => (
                  <li key={payment.id} className="py-3 text-sm">
                    <p className="font-medium">
                      {formatCOP(payment.amount)} · {formatDate(payment.paidAt)} ·{' '}
                      {payment.paymentMethod}
                    </p>
                    {payment.note && <p className="mt-1 text-muted">{payment.note}</p>}
                    <p className="mt-1 text-muted">
                      Repartido en {payment.allocations.map((item) =>
                        `${item.saleNumber} (${formatCOP(item.amount)})`,
                      ).join(', ')}
                    </p>
                    {payment.status === 'voided' ? (
                      <p className="text-muted">Anulado: {payment.voidReason}</p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void voidPayment(payment.id)}
                        className="mt-2 min-h-11 rounded-md border border-border px-3 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      >
                        Anular
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted">Todavía no hay abonos.</p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
