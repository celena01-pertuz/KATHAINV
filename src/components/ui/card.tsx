import { forwardRef, type HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className = '', ...props },
  ref,
) {
  return (
    <div
      {...props}
      ref={ref}
      className={`rounded-lg border border-border bg-surface text-foreground shadow-sm ${className}`.trim()}
    />
  );
});

export function CardHeader({ className = '', ...props }: CardHeaderProps) {
  return <div {...props} className={`border-b border-border p-4 sm:p-6 ${className}`.trim()} />;
}

export function CardContent({ className = '', ...props }: CardContentProps) {
  return <div {...props} className={`p-4 sm:p-6 ${className}`.trim()} />;
}

export function CardFooter({ className = '', ...props }: CardFooterProps) {
  return (
    <div
      {...props}
      className={`border-t border-border p-4 sm:p-6 ${className}`.trim()}
    />
  );
}
