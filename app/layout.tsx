import type { Metadata } from 'next';
import './globals.css';
import { SessionProvider } from '@/components/SessionProvider';
import TopNav from '@/components/TopNav';

export const metadata: Metadata = {
  title: 'Obsidian Range - Cyber Operations CTF',
  description: 'A hands-on cybersecurity competition platform. Investigate, exploit and report using real tooling.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-signal focus:px-3 focus:py-1 focus:text-ink-950">
          Skip to content
        </a>
        <SessionProvider>
          <div className="flex min-h-[100svh] flex-col">
            <TopNav />
            <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
              {children}
            </main>
            <footer className="mx-auto w-full max-w-7xl px-4 pb-10 pt-4 font-mono text-[11px] uppercase tracking-widest text-ink-400">
              Obsidian Range · isolated training environment · all targets are synthetic
            </footer>
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
