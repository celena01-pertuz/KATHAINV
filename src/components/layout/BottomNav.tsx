'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  moreNavigationItems,
  primaryNavigationItems,
  type NavigationIcon,
  type NavigationItem,
} from './navigation-items';

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
    case 'more':
      return (
        <svg {...sharedProps}>
          <circle cx="5" cy="12" r="1" />
          <circle cx="12" cy="12" r="1" />
          <circle cx="19" cy="12" r="1" />
        </svg>
      );
  }
}

export function BottomNav() {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const firstMoreLinkRef = useRef<HTMLAnchorElement>(null);
  const isMorePage = moreNavigationItems.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  const isSalesPage = pathname === '/sales' || pathname.startsWith('/sales/');

  useEffect(() => {
    if (!isMoreOpen) return;

    firstMoreLinkRef.current?.focus();

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !navRef.current?.contains(event.target)) {
        setIsMoreOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMoreOpen(false);
        moreButtonRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMoreOpen]);

  const isItemActive = (item: NavigationItem) =>
    pathname === item.href || pathname.startsWith(`${item.href}/`);

  const linkClassName = (isActive: boolean, desktop = false) =>
    `flex min-h-14 items-center justify-center gap-2 rounded-md px-3 text-center font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary md:min-h-11 ${
      desktop ? 'text-sm' : 'flex-col gap-1 px-1 text-xs'
    } ${
      isActive
        ? 'bg-primary text-primary-foreground'
        : 'text-muted transition-colors hover:bg-background hover:text-foreground'
    }`;

  return (
    <nav
      ref={navRef}
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] shadow-md md:sticky md:top-0 md:bottom-auto md:border-b md:border-t-0 md:pb-0"
    >
      <div className="relative mx-auto w-full max-w-7xl px-1 sm:px-4">
        <div
          id="more-navigation-panel"
          role="region"
          aria-label="Más opciones de navegación"
          hidden={!isMoreOpen}
          className={`absolute inset-x-3 z-50 max-h-[min(60dvh,28rem)] overflow-y-auto rounded-lg border border-border bg-surface p-2 shadow-lg md:hidden ${
            isSalesPage
              ? 'bottom-[calc(100%+5rem+env(safe-area-inset-bottom))]'
              : 'bottom-[calc(100%+0.5rem)]'
          }`}
        >
          <ul className="grid gap-1">
            {moreNavigationItems.map((item, index) => {
              const isActive = isItemActive(item);
              return (
                <li key={item.href}>
                  <Link
                    ref={index === 0 ? firstMoreLinkRef : undefined}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => setIsMoreOpen(false)}
                    className={`min-h-11 justify-start ${linkClassName(isActive, true)}`}
                  >
                    <NavigationIconView icon={item.icon} />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <ul className="grid grid-cols-4 gap-1 md:flex md:justify-center md:gap-2">
          {primaryNavigationItems.map((item) => {
            const isActive = isItemActive(item);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => setIsMoreOpen(false)}
                  className={linkClassName(isActive)}
                >
                  <NavigationIconView icon={item.icon} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
          <li className="md:hidden">
            <button
              ref={moreButtonRef}
              type="button"
              aria-expanded={isMoreOpen}
              aria-controls="more-navigation-panel"
              aria-haspopup="true"
              onClick={() => setIsMoreOpen((open) => !open)}
              className={`w-full ${linkClassName(isMorePage)}`}
            >
              <NavigationIconView icon="more" />
              <span>Más</span>
            </button>
          </li>
        </ul>

        <div className="hidden border-t border-border/70 py-2 md:block">
          <div className="flex items-center justify-center gap-2">
            <span className="px-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Más
            </span>
            <ul className="flex flex-wrap justify-center gap-1">
              {moreNavigationItems.map((item) => {
                const isActive = isItemActive(item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={isActive ? 'page' : undefined}
                      className={`min-w-11 ${linkClassName(isActive, true)}`}
                    >
                      <NavigationIconView icon={item.icon} />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </nav>
  );
}
