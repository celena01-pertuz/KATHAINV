import type { Metadata } from 'next';
import { STORE_NAME } from '@/config/store';
import { ReceiptPrintButton } from '@/modules/receipts/components/ReceiptPrintButton';
import { getPublicReceipt } from '@/modules/receipts/service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: `Comprobante | ${STORE_NAME}`,
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

const currency = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

interface ReceiptPageProps {
  params: Promise<{ token: string }>;
}

export default async function ReceiptPage({ params }: ReceiptPageProps) {
  const { token } = await params;
  const receipt = await getPublicReceipt(token);

  if (!receipt) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-5 py-10">
        <p role="status" className="text-center text-lg font-semibold">
          Este comprobante no está disponible
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl px-4 py-6 sm:px-8">
      <article className="receipt-print-area rounded-xl border border-border bg-surface p-5 shadow-sm sm:p-8">
        <header className="border-b border-border pb-5 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted">{STORE_NAME}</p>
          <h1 className="mt-2 text-2xl font-bold">Comprobante de venta</h1>
          <p className="mt-2 text-lg font-semibold">{receipt.sale_number}</p>
          <p className="mt-1 text-sm text-muted">
            {new Intl.DateTimeFormat('es-CO', {
              dateStyle: 'medium',
              timeStyle: 'short',
            }).format(new Date(receipt.sold_at))}
          </p>
        </header>

        {receipt.status === 'voided' && (
          <p className="mt-5 rounded-md bg-danger/10 p-3 text-center font-bold text-danger">
            Venta anulada
          </p>
        )}

        <section className="mt-5" aria-label="Productos de la venta">
          <h2 className="text-lg font-semibold">Productos</h2>
          <ul className="mt-2 divide-y divide-border">
            {receipt.items.map((item, index) => (
              <li key={`${item.name}-${index}`} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted">
                      Talla: {item.size || 'Sin talla'} · Color: {item.color || 'Sin color'} ·
                      {' '}Cantidad: {item.quantity} · Precio unitario:{' '}
                      {currency.format(item.unit_price)}
                    </p>
                  </div>
                  <p className="shrink-0 text-right font-medium">
                    {currency.format(item.unit_price * item.quantity)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <dl className="mt-4 space-y-2 border-t border-border pt-4">
          <div className="flex justify-between gap-3 text-lg font-bold">
            <dt>Total</dt>
            <dd>{currency.format(receipt.total)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Pagado</dt>
            <dd>{currency.format(receipt.paid)}</dd>
          </div>
          <div className="flex justify-between gap-3 font-semibold">
            <dt>{receipt.balance === 0 ? 'Estado' : 'Saldo'}</dt>
            <dd>
              {receipt.balance === 0
                ? 'Al día'
                : `Saldo pendiente ${currency.format(receipt.balance)}`}
            </dd>
          </div>
        </dl>
      </article>

      <div className="receipt-controls mt-5">
        <ReceiptPrintButton />
      </div>
    </main>
  );
}
