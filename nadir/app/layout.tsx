import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AudioProvider } from '@/components/game/AudioProvider';

export const metadata: Metadata = {
  title: { default: 'NADIR', template: '%s · NADIR' },
  description: 'NADIR: the quiz where the rarest right answer wins. Find the answer nobody else knew.',
  applicationName: 'NADIR',
  icons: { icon: '/icon.svg' },
};

export const viewport: Viewport = { themeColor: '#05070f', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT@9..144,300..800,0..100&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen antialiased">
        <AudioProvider>{children}</AudioProvider>
      </body>
    </html>
  );
}
