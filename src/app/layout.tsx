import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME ?? 'Sistema TS',
  description: 'Sistema fullstack TypeScript con JSON Database Layer',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased bg-gray-950 text-white">{children}</body>
    </html>
  );
}
