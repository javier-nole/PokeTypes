import type { Metadata, Viewport } from 'next';
import { Archivo, JetBrains_Mono } from 'next/font/google';

import { SiteFooter } from '@/components/SiteFooter';
import { SITE_NAME, SITE_URL } from '@/lib/seo';

import './globals.css';

/*
 * Las fuentes se auto-hospedan en build: cero peticiones a Google en
 * runtime, que es media puntuación de Lighthouse.
 */
const archivo = Archivo({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-archivo',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — debilidades y resistencias Pokémon`,
    template: `%s · ${SITE_NAME}`,
  },
  description:
    'Resuelve el cruce de tipos sin mirar la tabla: qué le hace daño a cada Pokémon, ' +
    'con qué atacarlo, y qué huecos tiene tu equipo.',
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  openGraph: { type: 'website', locale: 'es_ES', siteName: SITE_NAME },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#0A0908',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <html lang="es" className={`${archivo.variable} ${jetbrains.variable}`}>
      <body className="flex min-h-screen flex-col">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:font-semibold focus:text-panel"
        >
          Saltar al contenido
        </a>
        <div id="contenido" className="flex-1">
          {children}
        </div>
        <SiteFooter />
      </body>
    </html>
  );
}
