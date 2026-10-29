export type SpinnerSize = 'sm' | 'md' | 'lg';

export interface SpinnerProps {
  className?: string;
  label?: string;
  size?: SpinnerSize;
}

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

export function Spinner({ className = '', label = 'Cargando...', size = 'md' }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={`inline-flex shrink-0 ${className}`.trim()}
    >
      <svg
        aria-hidden="true"
        className={`animate-spin ${sizeClasses[size]}`}
        viewBox="0 0 24 24"
        fill="none"
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
        <path
          d="M12 2a10 10 0 0 1 10 10"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}
