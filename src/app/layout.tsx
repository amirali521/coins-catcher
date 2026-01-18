import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { Toaster } from '@/components/ui/toaster';
import { APP_NAME } from '@/lib/constants';

export const metadata: Metadata = {
  title: APP_NAME,
  description: 'Claim rewards and grow your earnings!',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
        <Script src="https://pl28511611.effectivegatecpm.com/6d/4d/07/6d4d07abfc3e909a2b7da7c4af0bed48.js" strategy="afterInteractive" />
        <Script src="https://pl28511778.effectivegatecpm.com/ea/7f/71/ea7f71426ad468cbb865122537de7cbe.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
