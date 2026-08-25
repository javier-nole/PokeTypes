import type { Metadata } from 'next';
import { Suspense } from 'react';

import { SiteHeader } from '@/components/SiteHeader';
import { VsPanel } from '@/components/VsPanel';

/**
 * `/vs?a=…&b=…`
 *
 * Una sola ruta estática con el estado en query params. Con `output:
 * 'export'` una ruta `/vs/[a]-vs-[b]` exigiría pre-renderizar el producto
 * cartesiano de 1200 × 1200 — ver PLAN.md §1.1.
 */
export const metadata: Metadata = {
  title: 'Comparar dos Pokémon — quién gana el intercambio de tipos',
  description:
    'Pon tu Pokémon y el de enfrente y te decimos con qué le pegas, con qué te pega y si el ' +
    'cambio te conviene.',
  robots: { index: false, follow: true },
};

export default function VsPage() {
  return (
    <>
      <SiteHeader />
      <Suspense
        fallback={
          <p className="px-4 py-10 font-mono text-[11px] tracking-[.12em] text-ink-dim sm:px-7">
            CALCULANDO CRUCE…
          </p>
        }
      >
        <VsPanel />
      </Suspense>
    </>
  );
}
