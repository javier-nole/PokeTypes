import Link from 'next/link';

import { AttackView } from '@/components/AttackView';
import { DefenseView } from '@/components/DefenseView';
import { ResultTabs } from '@/components/ResultTabs';
import { SEVERITY } from '@/components/severity';
import { TypeChip } from '@/components/TypeChip';
import { defensiveProfile, offensiveProfile } from '@/lib/effectiveness';
import { formatMultiplier, severityLabel, typeName } from '@/lib/i18n';
import { existingTypings } from '@/lib/pokedex';
import type { Typing } from '@/lib/types';

/**
 * La página de resultado, compartida por `/pokemon/[slug]` y `/tipo/[...]`.
 * Toda la aritmética se resuelve aquí arriba, en servidor, y baja a los
 * componentes como datos ya calculados.
 */

interface ResultViewProps {
  readonly title: string;
  readonly typing: Typing;
  /** Enlaces de acción del pie, ya construidos por la ruta. */
  readonly teamHref: string;
  readonly vsHref: string;
  readonly subtitle?: string;
}

export function ResultView({ title, typing, teamHref, vsHref, subtitle }: ResultViewProps) {
  const defense = defensiveProfile(typing);
  const attack = offensiveProfile(typing, existingTypings());
  const worst = defense.worst;

  return (
    <article className="mx-auto max-w-[1440px]">
      <div className="flex flex-col gap-4 px-4 pb-5 pt-5 sm:px-8 md:flex-row md:items-end md:justify-between md:gap-6 md:pt-7">
        <div className="flex flex-col gap-2.5 md:flex-row md:items-end md:gap-5">
          <h1 className="text-[30px] font-extrabold leading-[1.05] tracking-[-.02em] md:text-[52px] md:leading-[.95] md:tracking-[-.03em]">
            {title}
          </h1>
          <ul className="m-0 flex list-none gap-2 p-0 md:pb-2">
            {typing.map((type) => (
              <li key={type}>
                <TypeChip type={type} size="sm" tone="muted" />
              </li>
            ))}
          </ul>
        </div>

        {/*
         * El titular de riesgo: lo primero que busca el ojo. Lleva palabra,
         * número y nombre del tipo, nunca sólo el color de fondo.
         */}
        {worst !== null ? (
          <p
            className={`flex items-center gap-3 rounded-xl px-4 py-3 ${SEVERITY[worst.multiplier].surface}`}
          >
            <span
              className={`font-mono text-xs font-bold tracking-[.14em] ${SEVERITY[worst.multiplier].ink}`}
            >
              {worst.types.length === 1 ? 'RIESGO ÚNICO' : severityLabel(worst.multiplier)}
            </span>
            <span className="text-base font-bold text-ink">
              {formatMultiplier(worst.multiplier)}{' '}
              {worst.types.map((type) => typeName(type)).join(' · ')}
            </span>
          </p>
        ) : null}
      </div>

      {subtitle !== undefined ? (
        <p className="px-4 pb-5 text-[14.5px] leading-relaxed text-ink-muted sm:px-8">{subtitle}</p>
      ) : null}

      <ResultTabs
        defense={<DefenseView profile={defense} />}
        attack={<AttackView profile={attack} />}
      />

      <div className="flex gap-2.5 border-t border-line px-4 py-4 sm:px-8">
        <Link
          href={vsHref}
          className="flex h-12 flex-1 items-center justify-center rounded-[10px] border border-border bg-surface-2 text-sm font-semibold text-ink no-underline hover:border-border-strong"
        >
          Comparar VS
        </Link>
        <Link
          href={teamHref}
          className="flex h-12 flex-1 items-center justify-center rounded-[10px] border border-border bg-surface-2 text-sm font-semibold text-ink no-underline hover:border-border-strong"
        >
          Añadir al equipo
        </Link>
      </div>
    </article>
  );
}
