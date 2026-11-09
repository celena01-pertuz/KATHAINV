import type { ReactElement, ReactNode } from 'react';

export interface PageHeaderProps {
  title: string;
  description: string;
  primaryAction?: ReactElement;
  secondaryActions?: ReactNode;
}

export function PageHeader({
  title,
  description,
  primaryAction,
  secondaryActions,
}: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      {(primaryAction || secondaryActions) && (
        <div className="flex flex-wrap items-center gap-2">
          {secondaryActions}
          {primaryAction}
        </div>
      )}
    </header>
  );
}
