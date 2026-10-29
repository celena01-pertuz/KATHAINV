import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME ?? 'Sistema TS',
  description: 'Sistema fullstack TypeScript con JSON Database Layer',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try {
              const savedTheme = localStorage.getItem('kathainv-theme');
              const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              const shouldUseDark = savedTheme === 'dark' || (savedTheme !== 'light' && systemPrefersDark);
              document.documentElement.classList.toggle('dark', shouldUseDark);
            } catch (error) {
              console.error('No se pudo leer el tema guardado:', error);
              document.documentElement.classList.toggle('dark', window.matchMedia('(prefers-color-scheme: dark)').matches);
            }`,
          }}
        />
      </head>
      <body className="antialiased bg-background text-foreground">{children}</body>
    </html>
  );
}
