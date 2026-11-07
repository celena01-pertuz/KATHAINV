'use client';

export function ReceiptPrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="min-h-11 w-full rounded-md bg-primary px-4 font-semibold text-primary-foreground"
    >
      Imprimir / Guardar PDF
    </button>
  );
}
