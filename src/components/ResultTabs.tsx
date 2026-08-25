'use client';

import { useState, type ReactNode } from 'react';

/**
 * En escritorio Defensa y Ataque caben en paralelo y no hay pestañas.
 * En móvil se turnan, y **Defensa abre por defecto**: en combate la
 * pregunta urgente es qué te mata.
 *
 * La pestaña activa se marca con relleno claro y peso 700, nunca sólo con
 * tono — el color no porta información por sí solo en ningún sitio.
 */

type Tab = 'defensa' | 'ataque';

interface ResultTabsProps {
  readonly defense: ReactNode;
  readonly attack: ReactNode;
}

export function ResultTabs({ defense, attack }: ResultTabsProps) {
  const [active, setActive] = useState<Tab>('defensa');

  return (
    <>
      <div className="flex justify-center px-4 pb-4 md:hidden">
        <div role="tablist" aria-label="Vista" className="flex gap-0.5 rounded-full bg-surface-2 p-[3px]">
          {(['defensa', 'ataque'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              id={`tab-${tab}`}
              aria-selected={active === tab}
              aria-controls={`panel-${tab}`}
              onClick={() => setActive(tab)}
              className={`rounded-full px-4 py-2 text-[12.5px] capitalize transition-colors ${
                active === tab ? 'bg-ink font-bold text-panel' : 'font-semibold text-ink-muted'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-px bg-line md:grid-cols-2">
        <div
          role="tabpanel"
          id="panel-defensa"
          aria-labelledby="tab-defensa"
          className={`bg-panel px-4 pb-8 md:block md:px-8 md:pt-6 ${
            active === 'defensa' ? 'block' : 'hidden'
          }`}
        >
          {defense}
        </div>
        <div
          role="tabpanel"
          id="panel-ataque"
          aria-labelledby="tab-ataque"
          className={`bg-panel px-4 pb-8 md:block md:px-8 md:pt-6 ${
            active === 'ataque' ? 'block' : 'hidden'
          }`}
        >
          {attack}
        </div>
      </div>
    </>
  );
}
