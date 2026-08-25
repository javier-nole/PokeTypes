'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { OFFENSIVE_INK, SEVERITY } from '@/components/severity';
import { SearchBox } from '@/components/SearchBox';
import { TypeBars, TypeChip } from '@/components/TypeChip';
import { withBasePath } from '@/lib/base-path';
import { matchup, type MatchupSide, type MatchupVerdict } from '@/lib/effectiveness';
import { formatMultiplier, typeName, typingName, typingSlug } from '@/lib/i18n';
import { parseTypingSlug } from '@/lib/i18n';
import type { SearchEntry, SearchResult } from '@/lib/search';
import { normalizeTyping, type Typing } from '@/lib/types';

/**
 * "Mi X contra su Y, ¿quién gana el intercambio?"
 *
 * Estado en la URL: `?a=gyarados&b=blaziken`. Acepta indistintamente slugs
 * de Pokémon y de typing (`?a=agua-volador`), porque la pregunta es la
 * misma y el usuario no distingue.
 */

interface Combatant {
  readonly label: string;
  readonly typing: Typing;
}

const VERDICTS: Record<
  MatchupVerdict,
  { readonly title: string; readonly detail: string; readonly bar: string }
> = {
  'muy-favorable': {
    title: 'Cambio muy favorable',
    detail: 'entras con ventaja clara',
    bar: 'bg-multhalf-ink',
  },
  favorable: {
    title: 'Cambio favorable',
    detail: 'le pegas más fuerte de lo que te pega',
    bar: 'bg-multhalf-ink',
  },
  parejo: {
    title: 'Intercambio parejo',
    detail: 'lo decide todo lo que no es tipo',
    bar: 'bg-ink-muted',
  },
  desfavorable: {
    title: 'Cambio desfavorable',
    detail: 'te pega más fuerte de lo que le pegas',
    bar: 'bg-mult2-ink',
  },
  'muy-desfavorable': {
    title: 'No entres',
    detail: 'llevas todas las de perder en el cruce de tipos',
    bar: 'bg-mult4-ink',
  },
};

function resolve(value: string | null, index: readonly SearchEntry[]): Combatant | null {
  if (value === null || value === '') return null;

  const pokemon = index.find((entry) => entry.slug === value);
  if (pokemon !== undefined) {
    return { label: pokemon.nameEs, typing: normalizeTyping([...pokemon.types]) };
  }

  const typing = parseTypingSlug(value);
  return typing === null ? null : { label: typingName(typing), typing };
}

function keyFor(result: SearchResult): string {
  return result.kind === 'pokemon' ? result.entry.slug : typingSlug(result.typing);
}

export function VsPanel() {
  const router = useRouter();
  const params = useSearchParams();

  const [index, setIndex] = useState<readonly SearchEntry[] | null>(null);

  useEffect(() => {
    void fetch(withBasePath('/search-index.json'))
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('404'))))
      .then((data: SearchEntry[]) => setIndex(data))
      .catch(() => setIndex([]));
  }, []);

  const a = useMemo(() => (index === null ? null : resolve(params.get('a'), index)), [index, params]);
  const b = useMemo(() => (index === null ? null : resolve(params.get('b'), index)), [index, params]);

  const setSide = useCallback(
    (side: 'a' | 'b', value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value === null) next.delete(side);
      else next.set(side, value);
      const query = next.toString();
      router.replace(`/vs/${query === '' ? '' : `?${query}`}`, { scroll: false });
    },
    [params, router],
  );

  const result = a !== null && b !== null ? matchup(a.typing, b.typing) : null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-5 sm:px-7">
      <h1 className="text-[26px] font-extrabold tracking-[-.02em]">Mi Pokémon contra el suyo</h1>

      <div className="grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <Side side="a" combatant={a} onPick={(value) => setSide('a', value)} />
        <span className="justify-self-center font-mono text-xs tracking-[.14em] text-ink-dim">
          VS
        </span>
        <Side side="b" combatant={b} onPick={(value) => setSide('b', value)} align="end" />
      </div>

      {result === null ? (
        <p className="rounded-xl bg-surface p-5 text-sm leading-relaxed text-ink-muted">
          Elige los dos lados. Vale tanto un Pokémon como un typing suelto — si sólo sabes que
          enfrente hay algo de Agua/Volador, con eso basta.
        </p>
      ) : (
        <>
          <Exchange
            side={result.aToB}
            heading="TÚ PEGAS →"
            emphasis
            offensive
            subject={a?.label ?? ''}
            opponent={b?.label ?? ''}
          />
          <Exchange
            side={result.bToA}
            heading="← ÉL PEGA"
            subject={b?.label ?? ''}
            opponent={a?.label ?? ''}
          />

          <p className="flex items-center gap-3 rounded-xl bg-surface-2 px-4 py-3.5">
            <span
              aria-hidden="true"
              className={`h-9 w-2.5 shrink-0 rounded-[3px] ${VERDICTS[result.verdict].bar}`}
            />
            <span className="text-[15.5px] font-bold leading-snug">
              {VERDICTS[result.verdict].title}
              <br />
              <span className="text-[13.5px] font-medium text-ink-muted">
                {VERDICTS[result.verdict].detail}
              </span>
            </span>
          </p>
        </>
      )}
    </div>
  );
}

function Side({
  side,
  combatant,
  onPick,
  align = 'start',
}: {
  readonly side: 'a' | 'b';
  readonly combatant: Combatant | null;
  readonly onPick: (value: string | null) => void;
  readonly align?: 'start' | 'end';
}) {
  if (combatant === null) {
    return (
      <div className="min-w-0">
        <SearchBox
          compact
          placeholder={side === 'a' ? 'Tu Pokémon o tipo…' : 'El suyo…'}
          onSelect={(result) => onPick(keyFor(result))}
        />
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2 ${align === 'end' ? 'sm:items-end' : ''}`}>
      <div className="flex items-center gap-2">
        <span className="text-[19px] font-extrabold tracking-[-.01em]">{combatant.label}</span>
        <button
          type="button"
          onClick={() => onPick(null)}
          aria-label={`Cambiar ${combatant.label}`}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-base text-ink-dim hover:bg-surface-2 hover:text-ink"
        >
          ×
        </button>
      </div>
      <TypeBars types={combatant.typing} />
    </div>
  );
}

function Exchange({
  side,
  heading,
  subject,
  opponent,
  emphasis = false,
  offensive = false,
}: {
  readonly side: MatchupSide;
  readonly heading: string;
  readonly subject: string;
  readonly opponent: string;
  readonly emphasis?: boolean;
  /**
   * `true` cuando el multiplicador describe lo que hace el sujeto. Invierte
   * la paleta: ahí un ×2 es una buena noticia.
   */
  readonly offensive?: boolean;
}) {
  // Desde el punto de vista del lector (el dueño de A), lo que A hace se lee
  // en clave ofensiva y lo que B hace, en clave defensiva.
  const inkFor = (multiplier: Parameters<typeof formatMultiplier>[0]): string =>
    offensive ? OFFENSIVE_INK[multiplier] : SEVERITY[multiplier].ink;
  const threat = side.coverageThreats[0];

  return (
    <section
      className={`flex flex-col gap-2.5 rounded-xl p-4 ${
        emphasis ? 'bg-multhalf-bg border border-multhalf-border' : 'bg-surface'
      }`}
    >
      <h2 className="font-mono text-[10.5px] font-bold tracking-[.14em] text-multhalf-ink">
        {heading}
      </h2>

      <div className="flex items-baseline gap-3">
        <span className={`font-mono text-[38px] font-bold leading-[.9] ${inkFor(side.best)}`}>
          {formatMultiplier(side.best)}
        </span>
        <span className="text-[15px] font-semibold leading-snug">
          con {side.bestTypes.map((type) => typeName(type)).join(' o ')}
          <br />
          <span className="font-medium text-ink-muted">
            {subject} contra {opponent}
          </span>
        </span>
      </div>

      <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
        {side.byOwnType.map((entry) => (
          <li key={entry.type} className="flex items-center gap-1.5">
            <TypeChip type={entry.type} size="xs" />
            <span className={`font-mono text-[13px] font-bold ${inkFor(entry.multiplier)}`}>
              {formatMultiplier(entry.multiplier)}
            </span>
          </li>
        ))}
      </ul>

      {/*
       * El rival puede llevar un movimiento fuera de su STAB. Sigue siendo
       * pura tabla de tipos, así que entra en el alcance y avisa de la
       * sorpresa que se lleva la partida por delante.
       */}
      {threat !== undefined ? (
        <p className="border-t border-line pt-2.5 text-[13px] text-ink-muted">
          Cuidado con cobertura de{' '}
          <strong className="font-bold text-ink">{typeName(threat.type)}</strong> (
          {formatMultiplier(threat.multiplier)})
        </p>
      ) : null}
    </section>
  );
}
