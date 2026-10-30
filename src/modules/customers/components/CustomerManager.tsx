'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { CUSTOMER_DATA_NOTICE, CUSTOMER_DATA_NOTICE_VERSION } from '../consent-notice';
import { normalizeColombianPhone } from '../phone-utils';
import type { CustomerRecord, CustomerSaveResult } from '../types';

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

export function CustomerManager() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [search, setSearch] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<CustomerRecord | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [duplicatePhone, setDuplicatePhone] = useState<boolean | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      async function loadCustomers() {
        setLoading(true);
        setError('');
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
        } catch (loadError) {
          if (controller.signal.aborted) return;
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'No se pudieron cargar los clientes.',
          );
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

  function startCreate() {
    setEditingCustomer(null);
    setDuplicatePhone(null);
    setShowForm(true);
    setNotice('');
    setError('');
  }

  function startEdit(customer: CustomerRecord) {
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
        phoneError instanceof Error
          ? phoneError.message
          : 'No se pudo revisar el teléfono.',
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
      setError(
        saveError instanceof Error ? saveError.message : 'No se pudo guardar el cliente.',
      );
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
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="mt-1 text-sm text-muted">Administra los datos y la autorización de tus clientes.</p>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="min-h-11 rounded-md bg-primary px-4 font-semibold text-primary-foreground"
        >
          Nuevo cliente
        </button>
      </header>

      {notice && <p className="mb-4 rounded-md bg-success/10 p-3 text-sm">{notice}</p>}
      {error && (
        <p role="alert" className="mb-4 rounded-md bg-danger/10 p-3 text-sm">
          {error}
        </p>
      )}

      {showForm && (
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
      )}

      <label className="mb-4 block">
        <span className="mb-1 block text-sm font-medium">
          Buscar por nombre, teléfono o documento
        </span>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="min-h-11 w-full rounded-md border border-border bg-surface px-3"
          placeholder="Escribe un nombre, teléfono o documento"
        />
      </label>

      {loading ? (
        <p role="status">Cargando clientes…</p>
      ) : customers.length === 0 ? (
        <p className="rounded-md border border-border bg-surface p-5 text-sm">
          No hay clientes que coincidan con la búsqueda.
        </p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {customers.map((customer) => (
            <li
              key={customer.id}
              className="rounded-lg border border-border bg-surface p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="break-words font-semibold">{customer.name}</h2>
                  <p className="mt-1 break-all text-sm text-muted">{customer.phone}</p>
                  {customer.document && (
                    <p className="text-sm text-muted">Documento: {customer.document}</p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${
                    customer.active ? 'bg-success/10 text-success' : 'bg-background text-muted'
                  }`}
                >
                  {customer.active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <p className="mt-3 text-xs text-muted">
                Autorización {customer.dataTreatmentNoticeVersion} ·{' '}
                {formatAuthorizationDate(customer.dataTreatmentAuthorizedAt)} ·{' '}
                {customer.dataTreatmentAuthorizationSource}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="min-h-11 rounded-md border border-border px-3 text-sm"
                  onClick={() => startEdit(customer)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="min-h-11 rounded-md border border-border px-3 text-sm"
                  onClick={() => void toggleCustomer(customer)}
                >
                  {customer.active ? 'Desactivar' : 'Reactivar'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
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
          className="min-h-11 w-full rounded-md border border-border bg-background px-3"
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
          className="min-h-11 w-full rounded-md border border-border bg-background px-3"
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
          className="min-h-11 w-full rounded-md border border-border bg-background px-3"
        />
      </label>

      {!editing && (
        <fieldset className="grid gap-3 rounded-md border border-border p-3 sm:col-span-2">
          <legend className="px-1 text-sm font-semibold">Autorización de tratamiento de datos</legend>
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
              className="min-h-11 w-full rounded-md border border-border bg-background px-3"
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
          disabled={saving}
          className="min-h-11 rounded-md bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-60"
        >
          {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Registrar cliente'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-md border border-border px-4"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
