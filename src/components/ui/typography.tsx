import type { ReactNode } from 'react';

export type TypographyVariant = 'title' | 'subtitle' | 'text' | 'secondary';

export interface TypographyProps {
  children: ReactNode;
  className?: string;
  variant?: TypographyVariant;
}

const variantClasses: Record<TypographyVariant, string> = {
  title: 'text-3xl font-semibold text-foreground',
  subtitle: 'text-xl font-medium text-foreground',
  text: 'text-base text-foreground',
  secondary: 'text-sm text-muted',
};

export function Typography({ children, className = '', variant = 'text' }: TypographyProps) {
  const classes = `${variantClasses[variant]} ${className}`.trim();

  switch (variant) {
    case 'title':
      return <h1 className={classes}>{children}</h1>;
    case 'subtitle':
      return <h2 className={classes}>{children}</h2>;
    case 'secondary':
      return <p className={classes}>{children}</p>;
    case 'text':
      return <p className={classes}>{children}</p>;
  }
}
