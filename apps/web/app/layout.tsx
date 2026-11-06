import type { Metadata } from 'next';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'Visnora — AI Search Visibility & Competitive Intelligence',
  description: 'Enterprise AI Search Visibility & Marketing Intelligence SaaS Platform.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-slate-50">
      <body className="h-full flex flex-col font-sans antialiased text-slate-900 bg-slate-50">
        {children}
      </body>
    </html>
  );
}

