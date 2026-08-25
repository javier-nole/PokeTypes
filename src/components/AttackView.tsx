import Link from 'next/link';

import { OFFENSIVE_INK } from '@/components/severity';
import { TypeChip } from '@/components/TypeChip';
import type { OffensiveProfile } from '@/lib/effectiveness';
import { formatMultiplier, typeName, typingName, typingSlug } from '@/lib/i18n';
import type { Multiplier } from '@/lib/types';

/**
 * "¿Con qué le pego?" — misma gramática que Defensa (número, chip,
 * jerarquía) pero con el signo invertido: aquí el verde significa "pega",
 * no "aguantas".
 *
 * Dos niveles, como acordamos en PLAN.md §1.5:
 *   1. Un bloque por tipo propio contra los 18 tipos simples — lectura rápida.
 *   2. Contra los typings que existen de verdad — el detalle, plegado.
 */

const LEVEL_TWO_LABEL: Record<Multiplier, string> = {
  4: 'Los arrasas',
  2: 'Les pegas súper efectivo',
  1: 'Daño normal',
  0.5: 'Te resisten',
  0.25: 'Casi ni los despeinas',
  0: 'No les haces nada',
};

export function AttackView({ profile }: { readonly profile: OffensiveProfile }) {
  const { perAttacker, groups, bestAttacker, uncoveredTypes } = profile;

  return (
    <section className="flex flex-col gap-3" aria-labelledby="ataque-titulo">
      <h2
        id="ataque-titulo"
        className="pb-1.5 font-mono text-xs font-bold tracking-[.16em] text-ink-dim"
      >
        ATAQUE · CONTRA QUÉ PEGA BIEN
      </h2>

      {perAttacker.map((summary) => (
        <div
          key={summary.attacker}
          className={`flex flex-col gap-3 rounded-xl p-4 sm:gap-3.5 sm:rounded-[14px] sm:p-5 ${
            summary.attacker === bestAttacker
              ? 'bg-multhalf-bg border border-multhalf-border'
              : 'bg-surface border border-border'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <TypeChip type={summary.attacker} size="xs" tone="raised" />
            <span className="font-mono text-[26px] font-bold leading-[.9] text-multhalf-ink">
              ×2
            </span>
            <span className="ml-auto font-mono text-[10px] font-bold tracking-[.14em] text-ink-dim sm:text-[11px]">
              {summary.attacker === bestAttacker ? (
                <span className="text-multhalf-ink">TU MEJOR OPCIÓN</span>
              ) : (
                `${summary.superEffective.length} TIPOS`
              )}
            </span>
          </div>

          {summary.superEffective.length > 0 ? (
            <ul className="flex list-none flex-wrap gap-2 p-0">
              {summary.superEffective.map((type) => (
                <li key={type}>
                  <TypeChip type={type} size="md" tone="raised" />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13.5px] text-ink-muted">
              {typeName(summary.attacker)} no es súper efectivo contra ningún tipo.
            </p>
          )}

          {summary.resisted.length > 0 || summary.immune.length > 0 ? (
            <div className="flex flex-col gap-1 border-t border-line pt-2.5">
              {summary.resisted.length > 0 ? (
                <p className="flex items-baseline gap-2 text-[13px] text-ink-muted sm:text-[13.5px]">
                  <span className="font-mono font-bold">×½</span>
                  <span>{summary.resisted.map((type) => typeName(type)).join(' · ')}</span>
                </p>
              ) : null}
              {summary.immune.length > 0 ? (
                <p className="flex items-baseline gap-2 text-[13px] text-ink-muted sm:text-[13.5px]">
                  <span className="font-mono font-bold">×0</span>
                  <span>{summary.immune.map((type) => typeName(type)).join(' · ')}</span>
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ))}

      <div className="flex flex-col gap-2.5 rounded-xl bg-surface-2 p-3.5 sm:flex-row sm:items-center sm:gap-3.5 sm:px-5 sm:py-4">
        <span className="font-mono text-[10px] font-bold tracking-[.14em] text-ink-muted sm:text-[11px]">
          SIN COBERTURA
        </span>
        {uncoveredTypes.length > 0 ? (
          <>
            <ul className="flex list-none flex-wrap items-center gap-[7px] p-0">
              {uncoveredTypes.map((type) => (
                <li key={type}>
                  <TypeChip type={type} size="xs" />
                </li>
              ))}
            </ul>
            <span className="text-[12.5px] text-ink-dim sm:ml-auto sm:text-[13px]">
              resisten todo lo tuyo
            </span>
          </>
        ) : (
          <span className="text-[13px] text-ink-muted">
            Ninguno: no hay tipo que resista a la vez todo lo que llevas.
          </span>
        )}
      </div>

      {/* Nivel 2: sólo typings que llevan al menos un Pokémon. */}
      <details className="group rounded-xl bg-surface">
        <summary className="flex cursor-pointer list-none items-center gap-3 p-4 sm:px-5">
          <span className="flex-1 text-[13.5px] font-semibold">
            Contra los {groups.reduce((sum, group) => sum + group.typings.length, 0)} typings que
            existen en el juego
          </span>
          <span aria-hidden="true" className="text-xl text-ink-dim">
            <span className="group-open:hidden">+</span>
            <span className="hidden group-open:inline">−</span>
          </span>
        </summary>

        <div className="flex flex-col gap-3 px-4 pb-4 sm:px-5">
          {groups.map((group) => (
            <div key={group.multiplier} className="flex flex-col gap-2">
              <p className="flex items-baseline gap-2.5">
                <span
                  className={`font-mono text-lg font-bold ${OFFENSIVE_INK[group.multiplier]}`}
                >
                  {formatMultiplier(group.multiplier)}
                </span>
                <span className="text-[13px] font-semibold text-ink-muted">
                  {LEVEL_TWO_LABEL[group.multiplier]} · {group.typings.length}
                </span>
              </p>
              {/*
                * Sólo los grupos accionables (×4 y ×2) van como enlaces: son
                * los que el jugador quiere abrir. Los otros cuatro grupos
                * suman más de cien typings, y como cadena de texto pesan una
                * fracción y se leen mejor que cien chips iguales.
                */}
              {group.multiplier >= 2 ? (
                <ul className="flex list-none flex-wrap gap-1.5 p-0">
                  {group.typings.map((existing) => (
                    <li key={existing.slug}>
                      <Link
                        href={`/tipo/${typingSlug(existing.types)}/`}
                        className="inline-flex h-8 items-center rounded-lg bg-surface-2 px-2.5 text-[13px] font-medium text-ink no-underline hover:bg-surface-3"
                      >
                        {typingName(existing.types)}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] leading-relaxed text-ink-muted">
                  {group.typings.map((existing) => typingName(existing.types)).join(' · ')}
                </p>
              )}
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}
