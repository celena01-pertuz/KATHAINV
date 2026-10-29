import type { ReactNode } from 'react';
import Link from 'next/link';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { BottomNav } from '@/components/layout/BottomNav';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-[calc(3.5rem+env(safe-area-inset-bottom))] text-foreground md:pb-0">
      <BottomNav />
      <header className="mx-auto flex w-full max-w-7xl items-center justify-end gap-3 px-5 py-3 sm:px-8 lg:px-16">
        <Link
          href="/account"
          className="min-h-10 rounded-md px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          Mi cuenta
        </Link>
        <LogoutButton />
      </header>
      {children}
    </div>
  );
}
