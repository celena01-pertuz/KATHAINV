import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Spinner } from './spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  className?: string;
  loading?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'border border-transparent bg-primary text-primary-foreground enabled:hover:brightness-110',
  secondary: 'border border-border bg-surface text-foreground enabled:hover:bg-background',
  outline: 'border border-primary bg-transparent text-primary enabled:hover:bg-primary/10',
  danger: 'border border-transparent bg-danger text-primary-foreground enabled:hover:brightness-110',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-10 px-3 text-sm',
  md: 'min-h-12 px-4 text-base',
  lg: 'min-h-12 px-6 text-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    className = '',
    disabled = false,
    loading = false,
    size = 'md',
    type = 'button',
    variant = 'primary',
    ...props
  },
  ref,
) {
  return (
    <button
      {...props}
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60 ${sizeClasses[size]} ${variantClasses[variant]} ${className}`.trim()}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
});
