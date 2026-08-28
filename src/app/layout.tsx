import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProviders } from '@/components/layout/AppProviders';
import { AppShell } from '@/components/layout/AppShell';
import { ServiceWorker } from '@/components/layout/ServiceWorker';

export const metadata: Metadata = {
  title: 'minion.com',
  description: 'Ton espace pour organiser tes cours, tes révisions et tes études.',
  applicationName: 'minion.com',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'minion.com', statusBarStyle: 'default' },
  icons: {
    icon: [{ url: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffc93c' },
    { media: '(prefers-color-scheme: dark)', color: '#14130f' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

/** Applique le theme avant le premier rendu pour eviter tout clignotement. */
const THEME_SCRIPT = `(function(){try{var m=localStorage.getItem('minion.theme')||'system';var d=m==='dark'||(m==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="font-sans antialiased">
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-surface focus:px-4 focus:py-2 focus:shadow-pop"
        >
          Aller au contenu
        </a>
        <AppProviders>
          <AppShell>
            <div id="contenu">{children}</div>
          </AppShell>
        </AppProviders>
        <ServiceWorker />
      </body>
    </html>
  );
}
