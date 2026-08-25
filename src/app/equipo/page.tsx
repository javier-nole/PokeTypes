import type { Metadata } from 'next';
import { Suspense } from 'react';

import { SiteHeader } from '@/components/SiteHeader';
import { TeamBuilder } from '@/components/TeamBuilder';

/**
 * `/equipo?p=slug1,slug2,…`
 *
 * Shell estático: el equipo va en la URL y se resuelve en cliente, así que
 * no hay contenido indexable. `noindex` a propósito — esto es una
 * herramienta, no una página de contenido.
 */
export const metadata: Metadata = {
  title: 'Cobertura de equipo — qué tipo tumba a más miembros',
  description:
    'Mete hasta seis Pokémon y descubre a qué tipo cae medio equipo y contra qué typings ' +
    'no tienes con qué pegar.',
  robots: { index: false, follow: true },
};

export default function TeamPage() {
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
        <TeamBuilder />
      </Suspense>
    </>
  );
}
