import type { ReactNode } from 'react';
import { BottomNav } from '@/components/layout/BottomNav';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-[calc(3.5rem+env(safe-area-inset-bottom))] text-foreground md:pb-0">
      <BottomNav />
      {children}
    </div>
  );
}
