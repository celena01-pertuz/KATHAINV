import type { ReactNode } from 'react';

export function EmptyState({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5 text-sm">
      <p>{children}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function LoadingState({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} aria-busy="true" className="space-y-4">
      {[0, 1].map((row) => (
        <div
          key={row}
          aria-hidden="true"
          className="animate-pulse rounded-lg border border-border bg-surface p-4"
        >
          <div className="h-4 w-2/5 rounded bg-border/70" />
          <div className="mt-3 h-3 w-4/5 rounded bg-border/50" />
          <div className="mt-2 h-3 w-3/5 rounded bg-border/50" />
        </div>
      ))}
    </div>
  );
}

export function RetryState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div role="alert" className="rounded-lg border border-border bg-surface p-5 text-sm">
      <p>{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 min-h-11 rounded-md border border-border px-4 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Reintentar
      </button>
    </div>
  );
}
