'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { CUSTOMER_DATA_NOTICE, CUSTOMER_DATA_NOTICE_VERSION } from '../consent-notice';
import { normalizeColombianPhone } from '../phone-utils';
import type { CustomerRecord, CustomerSaveResult } from '../types';
import { CUSTOMER_CREDIT_LABELS } from '@/modules/customer-credit/labels';
import { daysSinceBogotaDate } from '@/modules/customer-credit/date-utils';
import { CustomerCreditPanel } from '@/modules/customer-credit/components/CustomerCreditPanel';
import { customerCreditOverviewResponseSchema } from '@/modules/customer-credit/schemas';
import type { CustomerCreditOverview } from '@/modules/customer-credit/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, LoadingState, RetryState } from '@/components/ui/PageStates';

type ApiResponse<T> = {
  data: T;
  success: boolean;
  error?: string;
};

async function readApiError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? 'No se pudo completar la operación.';
  } catch {
    return 'No se pudo completar la operación.';
  }
}

function formatAuthorizationDate(value: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function CustomerManager() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<CustomerRecord | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [duplicatePhone, setDuplicatePhone] = useState<boolean | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [creditOverview, setCreditOverview] = useState<CustomerCreditOverview[]>([]);
  const [creditLoading, setCreditLoading] = useState(true);
  const [creditLoadError, setCreditLoadError] = useState('');
  const [creditFilter, setCreditFilter] = useState<'all' | 'balance' | 'paid'>('all');

  const creditByCustomer = new Map(creditOverview.map((entry) => [entry.customerId, entry]));
  const totalReceivable = creditOverview.reduce((sum, entry) => sum + entry.balance, 0);
  const visibleCustomers = customers.filter((customer) => {
    if (creditLoading || creditLoadError) return true;
    const balance = creditByCustomer.get(customer.id)?.balance;
    if (balance === undefined) return true;
    return creditFilter === 'all' || (creditFilter === 'balance' ? balance > 0 : balance === 0);
  });

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      async function loadCustomers() {
        setLoading(true);
        setLoadError('');
        try {
          const response = await fetch(
            `/api/data/customers?q=${encodeURIComponent(search.trim())}`,
            { cache: 'no-store', signal: controller.signal },
          );
          if (!response.ok) throw new Error(await readApiError(response));
          const body = (await response.json()) as ApiResponse<{
            data: CustomerRecord[];
            total: number;
          }>;
          setCustomers(body.data.data);
        } catch {
          if (controller.signal.aborted) return;
          setLoadError('No pudimos cargar los clientes. Revisa tu conexión e inténtalo de nuevo.');
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      }

      void loadCustomers();
    }, 200);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [search, refreshKey]);

  useEffect(() => {
    const controller = new AbortController();
    async function loadCreditOverview() {
      setCreditLoading(true);
      setCreditLoadError('');
      try {
        const response = await fetch('/api/data/customer-credit', {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(await readApiError(response));
        const body = (await response.json()) as ApiResponse<unknown>;
        const parsed = customerCreditOverviewResponseSchema.safeParse(body.data);
        if (!parsed.success) throw new Error('La cartera recibida no tiene un formato válido.');
        setCreditOverview(parsed.data);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setCreditLoadError(
            loadError instanceof Error
              ? loadError.message
              : 'No se pudo cargar la cartera de clientes.',
          );
        }
      } finally {
        if (!controller.signal.aborted) setCreditLoading(false);
      }
    }

    void loadCreditOverview();
    return () => controller.abort();
  }, [refreshKey]);

  function startCreate() {
    setSelectedCustomer(null);
    setEditingCustomer(null);
    setDuplicatePhone(null);
    setShowForm(true);
    setNotice('');
    setError('');
  }

  function startEdit(customer: CustomerRecord) {
    setSelectedCustomer(customer);
    setEditingCustomer(customer);
    setDuplicatePhone(null);
    setShowForm(true);
    setNotice('');
    setError('');
  }

  async function checkDuplicatePhone(phone: string) {
    setDuplicatePhone(null);
    if (!normalizeColombianPhone(phone)) return;
    try {
      const params = new URLSearchParams({ phone });
      if (editingCustomer) params.set('excludeId', editingCustomer.id);
      const response = await fetch(`/api/data/customers?${params}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(await readApiError(response));
      const body = (await response.json()) as ApiResponse<{ duplicatePhone: boolean }>;
      setDuplicatePhone(body.data.duplicatePhone);
    } catch (phoneError) {
      setError(
        phoneError instanceof Error ? phoneError.message : 'No se pudo revisar el teléfono.',
      );
    }
  }

  async function saveCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    const formData = new FormData(event.currentTarget);
    const editing = Boolean(editingCustomer);
    const payload = {
      ...(editingCustomer ? { id: editingCustomer.id } : {}),
      name: String(formData.get('name') ?? ''),
      phone: String(formData.get('phone') ?? ''),
      document: String(formData.get('document') ?? ''),
      ...(!editing
        ? {
            authorization: {
              accepted: formData.get('authorizationAccepted') === 'on',
              noticeVersion: CUSTOMER_DATA_NOTICE_VERSION,
              source: String(formData.get('authorizationSource') ?? ''),
            },
          }
        : {}),
    };

    try {
      const response = await fetch('/api/data/customers', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(await readApiError(response));
      const body = (await response.json()) as ApiResponse<CustomerSaveResult>;
      setShowForm(false);
      setEditingCustomer(null);
      setSelectedCustomer(body.data.customer);
      setDuplicatePhone(null);
      setNotice(
        body.data.duplicatePhone
          ? `${editing ? 'Cliente actualizado' : 'Cliente registrado'}, pero ya existe otro cliente con ese teléfono.`
          : editing
            ? 'Cliente actualizado.'
            : 'Cliente registrado.',
      );
      setRefreshKey((key) => key + 1);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el cliente.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleCustomer(customer: CustomerRecord) {
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/data/customers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: customer.id, active: !customer.active }),
      });
      if (!response.ok) throw new Error(await readApiError(response));
      setSelectedCustomer((current) =>
        current?.id === customer.id ? { ...current, active: !customer.active } : current,
      );
      setNotice(customer.active ? 'Cliente desactivado.' : 'Cliente reactivado.');
      setRefreshKey((key) => key + 1);
    } catch (statusError) {
      setError(
        statusError instanceof Error
          ? statusError.message
          : 'No se pudo cambiar el estado del cliente.',
      );
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-16">
      <PageHeader
        title="Clientes"
        description="Consulta y administra tus clientes y sus datos."
        secondaryActions={
          <button
            type="button"
            onClick={startCreate}
            className="min-h-11 rounded-md border border-border px-4 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Nuevo cliente
          </button>
        }
      />

      {notice && <p className="mb-4 rounded-md bg-success/10 p-3 text-sm">{notice}</p>}
      {error && (
        <p role="alert" className="mb-4 rounded-md bg-danger/10 p-3 text-sm">
          {error}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
        <section aria-label="Buscar clientes" className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Buscar por nombre o teléfono</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="min-h-11 w-full rounded-md border border-border bg-surface px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              placeholder="Escribe un nombre o teléfono"
            />
          </label>

          <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
            <h2 className="font-semibold">{CUSTOMER_CREDIT_LABELS.portfolio}</h2>
            <p className="mt-1 text-warning">
              {CUSTOMER_CREDIT_LABELS.totalReceivable}:{' '}
              {creditLoading
                ? 'Cargando…'
                : creditLoadError
                  ? 'No disponible'
                  : formatCOP(totalReceivable)}
            </p>
            {creditLoadError && (
              <p role="alert" className="mt-2 text-sm text-danger">
                {creditLoadError}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2" aria-label="Filtros de cartera">
              {(
                [
                  ['all', 'Todos'],
                  ['balance', 'Con saldo'],
                  ['paid', 'Al día'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={creditFilter === value}
                  onClick={() => setCreditFilter(value)}
                  className={`min-h-11 rounded-md border px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    creditFilter === value
                      ? 'border-primary font-semibold text-primary'
                      : 'border-border'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          {loadError ? (
            <RetryState message={loadError} onRetry={() => setRefreshKey((key) => key + 1)} />
          ) : loading ? (
            <LoadingState label="Cargando clientes" />
          ) : visibleCustomers.length === 0 ? (
            <EmptyState>
              {search.trim()
                ? 'No encontramos clientes con esa búsqueda.'
                : customers.length === 0
                  ? 'Todavía no hay clientes. Usa “Nuevo cliente” para registrar el primero.'
                  : 'No hay clientes que coincidan con este filtro de cartera.'}
            </EmptyState>
          ) : (
            <ul className="space-y-4">
              {visibleCustomers.map((customer) => {
                const balance = creditByCustomer.get(customer.id)?.balance;
                const oldestDebtAt = creditByCustomer.get(customer.id)?.oldestDebtAt;
                const pendingDays =
                  balance !== undefined && balance > 0 && oldestDebtAt
                    ? daysSinceBogotaDate(oldestDebtAt)
                    : null;
                return (
                  <li
                    key={customer.id}
                    className="rounded-lg border border-border bg-surface p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="break-words font-semibold">{customer.name}</h2>
                        <p className="mt-1 break-all text-sm text-muted">{customer.phone}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${
                          customer.active
                            ? 'bg-success/10 text-success'
                            : 'bg-background text-muted'
                        }`}
                      >
                        {customer.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <p
                      className={`mt-2 text-sm font-semibold ${balance ? 'text-warning' : 'text-muted'}`}
                    >
                      {balance === undefined
                        ? 'Saldo no disponible'
                        : balance > 0
                          ? CUSTOMER_CREDIT_LABELS.balance(formatCOP(balance))
                          : CUSTOMER_CREDIT_LABELS.paidUp}
                      {!customer.active && balance !== undefined && balance > 0 && (
                        <span className="ml-2 font-normal text-muted">(Inactivo)</span>
                      )}
                    </p>
                    {balance !== undefined && balance > 0 && pendingDays !== null && (
                      <p className="mt-1 text-sm text-warning">
                        {CUSTOMER_CREDIT_LABELS.pendingDays(pendingDays)}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="min-h-11 rounded-md border border-border px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        onClick={() => setSelectedCustomer(customer)}
                      >
                        Ver detalle
                      </button>
                      <button
                        type="button"
                        className="min-h-11 rounded-md border border-border px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        onClick={() => startEdit(customer)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="min-h-11 rounded-md border border-border px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        onClick={() => void toggleCustomer(customer)}
                      >
                        {customer.active ? 'Desactivar' : 'Reactivar'}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside className="space-y-4">
          {showForm ? (
            <CustomerForm
              customer={editingCustomer}
              duplicatePhone={duplicatePhone}
              saving={saving}
              onCancel={() => {
                setShowForm(false);
                setDuplicatePhone(null);
              }}
              onPhoneBlur={(phone) => void checkDuplicatePhone(phone)}
              onPhoneChange={() => setDuplicatePhone(null)}
              onSubmit={saveCustomer}
            />
          ) : selectedCustomer ? (
            <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
              <h2 className="text-lg font-semibold">Detalle del cliente</h2>
              <dl className="mt-3 space-y-3 text-sm">
                <div>
                  <dt className="text-muted">Nombre</dt>
                  <dd className="font-medium">{selectedCustomer.name}</dd>
                </div>
                <div>
                  <dt className="text-muted">Teléfono</dt>
                  <dd>{selectedCustomer.phone}</dd>
                </div>
                {selectedCustomer.document && (
                  <div>
                    <dt className="text-muted">Documento</dt>
                    <dd>{selectedCustomer.document}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-muted">Autorización</dt>
                  <dd>
                    {selectedCustomer.dataTreatmentNoticeVersion} ·{' '}
                    {formatAuthorizationDate(selectedCustomer.dataTreatmentAuthorizedAt)} ·{' '}
                    {selectedCustomer.dataTreatmentAuthorizationSource}
                  </dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="min-h-11 rounded-md border border-border px-4 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  onClick={() => startEdit(selectedCustomer)}
                >
                  Editar cliente
                </button>
                <button
                  type="button"
                  className="min-h-11 rounded-md border border-border px-4 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  onClick={() => void toggleCustomer(selectedCustomer)}
                >
                  {selectedCustomer.active ? 'Desactivar' : 'Reactivar'}
                </button>
              </div>
              <div className="mt-4">
                <CustomerCreditPanel
                  customer={selectedCustomer}
                  overview={creditByCustomer.get(selectedCustomer.id)}
                  onChanged={() => setRefreshKey((key) => key + 1)}
                />
              </div>
            </section>
          ) : (
            <EmptyState>
              Elige un cliente de la lista para ver su información o selecciona “Nuevo cliente”.
            </EmptyState>
          )}
        </aside>
      </div>
    </main>
  );
}

function CustomerForm({
  customer,
  duplicatePhone,
  saving,
  onCancel,
  onPhoneBlur,
  onPhoneChange,
  onSubmit,
}: {
  customer: CustomerRecord | null;
  duplicatePhone: boolean | null;
  saving: boolean;
  onCancel: () => void;
  onPhoneBlur: (phone: string) => void;
  onPhoneChange: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const editing = Boolean(customer);

  return (
    <form
      onSubmit={onSubmit}
      className="mb-6 grid gap-4 rounded-lg border border-border bg-surface p-4 sm:grid-cols-2"
    >
      <h2 className="text-lg font-semibold sm:col-span-2">
        {editing ? 'Editar cliente' : 'Registrar cliente'}
      </h2>
      <label>
        <span className="mb-1 block text-sm font-medium">Nombre</span>
        <input
          name="name"
          required
          maxLength={120}
          defaultValue={customer?.name ?? ''}
          autoComplete="name"
          className="min-h-11 w-full rounded-md border border-border bg-background px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        />
      </label>
      <label>
        <span className="mb-1 block text-sm font-medium">Teléfono celular</span>
        <input
          name="phone"
          required
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          defaultValue={customer?.phone ?? ''}
          onChange={onPhoneChange}
          onBlur={(event) => onPhoneBlur(event.currentTarget.value)}
          placeholder="300 123 4567"
          className="min-h-11 w-full rounded-md border border-border bg-background px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        />
        <span className="mt-1 block text-xs text-muted">Se guardará con indicativo +57.</span>
        {duplicatePhone && (
          <span role="status" className="mt-1 block text-sm text-danger">
            Ya existe otro cliente con este teléfono. Puedes guardar de todas formas.
          </span>
        )}
      </label>
      <label className="sm:col-span-2">
        <span className="mb-1 block text-sm font-medium">Documento (opcional)</span>
        <input
          name="document"
          maxLength={80}
          defaultValue={customer?.document ?? ''}
          className="min-h-11 w-full rounded-md border border-border bg-background px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        />
      </label>

      {!editing && (
        <fieldset className="grid gap-3 rounded-md border border-border p-3 sm:col-span-2">
          <legend className="px-1 text-sm font-semibold">
            Autorización de tratamiento de datos
          </legend>
          <p className="text-sm">{CUSTOMER_DATA_NOTICE}</p>
          <p className="text-xs text-muted">Versión del aviso: {CUSTOMER_DATA_NOTICE_VERSION}</p>
          <label className="flex min-h-11 items-center gap-3 py-2 text-sm">
            <input
              name="authorizationAccepted"
              type="checkbox"
              required
              className="h-5 w-5 shrink-0"
            />
            <span>El cliente leyó y autorizó el tratamiento de sus datos.</span>
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Origen de la autorización</span>
            <select
              name="authorizationSource"
              required
              defaultValue="formulario"
              className="min-h-11 w-full rounded-md border border-border bg-background px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <option value="formulario">Formulario</option>
              <option value="registro presencial">Registro presencial</option>
            </select>
          </label>
        </fieldset>
      )}

      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <button
          type="submit"
          data-primary-action
          disabled={saving}
          className="min-h-11 rounded-md bg-primary px-4 font-semibold text-primary-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
        >
          {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Registrar cliente'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-md border border-border px-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
