import type { HTMLAttributes } from 'react';

export type ContainerMaxWidth = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  maxWidth?: ContainerMaxWidth;
}

const maxWidthClasses: Record<ContainerMaxWidth, string> = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
  full: 'max-w-full',
};

export function Container({ children, className = '', maxWidth = 'xl', ...props }: ContainerProps) {
  return (
    <div
      className={`mx-auto w-full px-4 sm:px-6 lg:px-8 ${maxWidthClasses[maxWidth]} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}
