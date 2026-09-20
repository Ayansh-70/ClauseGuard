import type { Metadata } from 'next';
import './globals.css';
import { GLOBAL_LEGAL_DISCLAIMER } from '@/lib/constants/disclaimers';

export const metadata: Metadata = {
  title: 'ClauseGuard — Legal Document Intelligence Workstation',
  description: 'Grounded legal document intelligence workstation with independent source verification.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col bg-slate-50 text-slate-900">
        {/* Persistent Informational Disclaimer Banner */}
        <header className="bg-slate-900 text-slate-300 text-xs px-4 py-2 border-b border-slate-800 text-center font-medium">
          <span className="font-semibold text-amber-400 mr-2">NOTICE:</span>
          {GLOBAL_LEGAL_DISCLAIMER}
        </header>
        <main className="flex-1 flex flex-col">{children}</main>
      </body>
    </html>
  );
}
