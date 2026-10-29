import { forwardRef, useId, type InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  helperText?: string;
  label: string;
  wrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    className = '',
    error,
    'aria-describedby': ariaDescribedBy,
    helperText,
    id,
    label,
    wrapperClassName = '',
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;
  const describedBy = [ariaDescribedBy, error ? errorId : undefined, helperText ? helperId : undefined]
    .filter(Boolean)
    .join(' ') || undefined;

  return (
    <div className={`w-full ${wrapperClassName}`.trim()}>
      <label htmlFor={inputId} className="mb-2 block text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        {...props}
        ref={ref}
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={`min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-base text-foreground outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${error ? 'border-danger' : ''} ${className}`.trim()}
      />
      {error && (
        <p id={errorId} className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
      {helperText && (
        <p id={helperId} className="mt-1 text-sm text-muted">
          {helperText}
        </p>
      )}
    </div>
  );
});
