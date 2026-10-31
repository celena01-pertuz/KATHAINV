'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navigationItems, type NavigationIcon } from './navigation-items';

function NavigationIconView({ icon }: { icon: NavigationIcon }) {
  const sharedProps = {
    'aria-hidden': true as const,
    className: 'h-5 w-5 shrink-0',
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 1.8,
    viewBox: '0 0 24 24',
  };

  switch (icon) {
    case 'home':
      return (
        <svg {...sharedProps}>
          <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
        </svg>
      );
    case 'products':
      return (
        <svg {...sharedProps}>
          <path d="m12 3 9 5-9 5-9-5 9-5Z" />
          <path d="m3 12 9 5 9-5M3 16l9 5 9-5M12 13v8" />
        </svg>
      );
    case 'customers':
      return (
        <svg {...sharedProps}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="10" cy="7" r="4" />
          <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'scanner':
      return (
        <svg {...sharedProps}>
          <path d="M4 8V5a1 1 0 0 1 1-1h3m8 0h3a1 1 0 0 1 1 1v3m0 8v3a1 1 0 0 1-1 1h-3m-8 0H5a1 1 0 0 1-1-1v-3M4 12h16M8 9v6m4-6v6m4-6v6" />
        </svg>
      );
    case 'sales':
      return (
        <svg {...sharedProps}>
          <path d="M4 5h16l-1.5 15h-13L4 5Z" />
          <path d="M9 9a3 3 0 0 0 6 0M8 3l-2 2m10-2 2 2" />
        </svg>
      );
    case 'purchases':
      return (
        <svg {...sharedProps}>
          <path d="M4 5h16l-1.5 15h-13L4 5Z" />
          <path d="M12 8v7m-3.5-3.5h7" />
        </svg>
      );
    case 'reports':
      return (
        <svg {...sharedProps}>
          <path d="M4 20V10m5 10V4m5 16v-7m5 7V7M2 20h20" />
        </svg>
      );
  }
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] shadow-md md:sticky md:top-0 md:bottom-auto md:border-b md:border-t-0"
    >
      <div className="mx-auto w-full max-w-7xl px-1 sm:px-4">
        <ul className="grid grid-cols-7 md:flex md:justify-center md:gap-2">
          {navigationItems.map((item) => {
            const isActive =
              pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`));

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-center text-xs font-medium focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary md:min-h-16 md:flex-row md:gap-2 md:px-4 md:text-sm ${
                    isActive
                      ? 'text-primary'
                      : 'text-muted transition-colors hover:bg-background hover:text-foreground'
                  }`}
                >
                  <NavigationIconView icon={item.icon} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
