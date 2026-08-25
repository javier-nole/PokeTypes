'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { SEVERITY } from '@/components/severity';
import { SearchBox } from '@/components/SearchBox';
import { Sprite } from '@/components/Sprite';
import { TypeBars, TypeChip } from '@/components/TypeChip';
import { collectExistingTypings, teamCoverage } from '@/lib/effectiveness';
import { formatMultiplier, multiplierAria, typeName, typingName } from '@/lib/i18n';
import type { SearchEntry, SearchResult } from '@/lib/search';
import { normalizeTyping, type Multiplier, type Typing } from '@/lib/types';

/**
 * "Tengo estos 6, ¿qué hueco tengo?" — la feature diferencial.
 *
 * El equipo vive en la URL (`?p=slug1,slug2,…`) para que se comparta con
 * copiar y pegar. No hay estado de servidor ni cuentas.
 *
 * Toda la aritmética sale de `teamCoverage`; aquí sólo se pinta.
 */

const MAX_MEMBERS = 6;

interface Member {
  readonly slug: string;
  readonly name: string;
  readonly types: Typing;
  /** Ausente si el Pokémon no tiene sprite. */
  readonly spriteId: number | undefined;
}

/** Nombre corto para las cabeceras estrechas de la matriz. */
function shortName(name: string): string {
  return name.length <= 11 ? name : `${name.slice(0, 10)}…`;
}

export function TeamBuilder() {
  const router = useRouter();
  const params = useSearchParams();

  const [index, setIndex] = useState<readonly SearchEntry[] | null>(null);

  useEffect(() => {
    void fetch('/search-index.json')
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('404'))))
      .then((data: SearchEntry[]) => setIndex(data))
      .catch(() => setIndex([]));
  }, []);

  const slugs = useMemo(() => {
    const raw = params.get('p');
    if (raw === null || raw === '') return [];
    return [...new Set(raw.split(',').filter((slug) => slug !== ''))].slice(0, MAX_MEMBERS);
  }, [params]);

  const members: Member[] = useMemo(() => {
    if (index === null) return [];
    const bySlug = new Map(index.map((entry) => [entry.slug, entry] as const));
    return slugs.flatMap((slug) => {
      const entry = bySlug.get(slug);
      if (entry === undefined) return [];
      return [
        {
          slug,
          name: entry.nameEs,
          types: normalizeTyping([...entry.types]),
          spriteId: entry.spriteId,
        },
      ];
    });
  }, [index, slugs]);

  const setSlugs = useCallback(
    (next: readonly string[]) => {
      const query = next.length > 0 ? `?p=${next.join(',')}` : '';
      router.replace(`/equipo/${query}`, { scroll: false });
    },
    [router],
  );

  function add(result: SearchResult): void {
    if (result.kind !== 'pokemon' || slugs.length >= MAX_MEMBERS) return;
    if (slugs.includes(result.entry.slug)) return;
    setSlugs([...slugs, result.entry.slug]);
  }

  function remove(slug: string): void {
    setSlugs(slugs.filter((current) => current !== slug));
  }

  // El catálogo de typings reales lo derivamos del índice ya descargado, en
  // vez de bajar otro fichero sólo para esto.
  const existing = useMemo(
    () =>
      index === null
        ? []
        : collectExistingTypings(index.map((entry) => ({ types: normalizeTyping([...entry.types]) }))),
    [index],
  );

  const coverage = useMemo(
    () => teamCoverage(members.map((member) => member.types), existing),
    [members, existing],
  );

  const threats = coverage.rows.filter((row) => row.weakCount > 0);
  const loading = index === null && slugs.length > 0;

  return (
    <div className="mx-auto max-w-[1440px]">
      <div className="flex flex-col gap-3 px-4 pb-4 pt-5 sm:px-7 md:flex-row md:items-baseline md:gap-4">
        <h1 className="text-[26px] font-extrabold tracking-[-.02em]">Equipo</h1>
        <p className="font-mono text-xs tracking-[.14em] text-ink-dim">
          {members.length} / {MAX_MEMBERS} · COBERTURA
        </p>

        {coverage.topThreat !== null ? (
          <p className="flex items-center gap-2.5 self-start rounded-[10px] border border-mult4-border bg-mult4-bg px-3.5 py-2 md:ml-auto">
            <span className="font-mono text-[11px] tracking-[.12em] text-mult4-ink">AMENAZA #1</span>
            <span className="text-sm font-bold text-ink">
              {typeName(coverage.topThreat.attacker)} — {coverage.topThreat.weakCount}{' '}
              {coverage.topThreat.weakCount === 1 ? 'cae' : 'caen'}
            </span>
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 px-4 pb-5 sm:px-7">
        {members.length < MAX_MEMBERS ? (
          <SearchBox compact placeholder="Añadir un Pokémon al equipo…" onSelect={add} />
        ) : null}

        {members.length > 0 ? (
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {members.map((member) => (
              <li key={member.slug}>
                <span className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-border bg-surface pl-1.5 pr-1.5 text-[14.5px] font-semibold">
                  <Sprite spriteId={member.spriteId} size={32} />
                  <Link href={`/pokemon/${member.slug}/`} className="text-ink no-underline">
                    {member.name}
                  </Link>
                  <TypeBars types={member.types} />
                  <button
                    type="button"
                    onClick={() => remove(member.slug)}
                    aria-label={`Quitar a ${member.name} del equipo`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-ink-dim hover:bg-surface-2 hover:text-ink"
                  >
                    ×
                  </button>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {loading ? (
        <p className="px-4 py-10 font-mono text-[11px] tracking-[.12em] text-ink-dim sm:px-7">
          CALCULANDO CRUCE…
        </p>
      ) : members.length === 0 ? (
        <EmptyTeam />
      ) : (
        <>
          <ThreatMatrix members={members} threats={threats} />
          <OffensiveGaps
            gaps={coverage.offensiveGaps}
            uncovered={coverage.uncoveredTypings.slice(0, 6)}
          />
        </>
      )}
    </div>
  );
}

function EmptyTeam() {
  return (
    <div className="mx-4 mb-8 flex flex-col gap-2 rounded-xl bg-surface p-5 sm:mx-7">
      <p className="text-lg font-bold">Aún no hay nadie en el equipo</p>
      <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
        Añade hasta seis y te decimos qué tipo tumba a más miembros a la vez y contra qué typings
        no tienes con qué pegar. El equipo se guarda en la dirección: cópiala para compartirla.
      </p>
    </div>
  );
}

interface MatrixProps {
  readonly members: readonly Member[];
  readonly threats: readonly {
    readonly attacker: import('@/lib/types').PokemonType;
    readonly cells: readonly Multiplier[];
    readonly weakCount: number;
    readonly quadCount: number;
  }[];
}

function ThreatMatrix({ members, threats }: MatrixProps) {
  if (threats.length === 0) {
    return (
      <p className="mx-4 mb-8 rounded-xl bg-multhalf-bg p-5 text-[15px] font-semibold text-multhalf-ink sm:mx-7">
        Ningún tipo hace daño aumentado a este equipo.
      </p>
    );
  }

  return (
    <section aria-labelledby="amenazas">
      <h2 id="amenazas" className="sr-only">
        Amenazas defensivas del equipo
      </h2>

      {/*
       * Escritorio: la matriz completa del diseño.
       */}
      <div
        className="hidden gap-px bg-line md:grid"
        style={{ gridTemplateColumns: `232px repeat(${members.length}, minmax(0, 1fr))` }}
      >
        <div className="flex items-end bg-panel px-5 py-3.5 font-mono text-[11px] tracking-[.14em] text-ink-dim">
          TIPO ATACANTE
        </div>
        {members.map((member) => (
          <div key={member.slug} className="flex flex-col items-center gap-1 bg-panel px-2.5 py-2">
            <Sprite spriteId={member.spriteId} size={40} />
            <span className="text-center text-sm font-bold">{shortName(member.name)}</span>
            <TypeBars types={member.types} />
          </div>
        ))}

        {threats.map((row, position) => (
          <Row key={row.attacker} row={row} members={members} first={position === 0} />
        ))}
      </div>

      {/*
       * Móvil: la matriz no cabe sin scroll horizontal, así que se invierte
       * la pregunta. Una tarjeta por amenaza que responde directamente
       * "quién cae", en vez de una cuadrícula encogida que hay que descifrar.
       */}
      <ul className="m-0 flex list-none flex-col gap-2 px-4 pb-6 md:hidden">
        {threats.map((row) => {
          const fallen = members
            .map((member, position) => ({ member, multiplier: row.cells[position] ?? 1 }))
            .filter((entry) => entry.multiplier > 1)
            .sort((a, b) => b.multiplier - a.multiplier);
          const safe = members.length - fallen.length;

          return (
            <li
              key={row.attacker}
              className={`flex flex-col gap-2.5 rounded-xl p-3.5 ${
                row.quadCount > 0 ? SEVERITY[4].surface : SEVERITY[2].surface
              }`}
            >
              <div className="flex items-center gap-2.5">
                <TypeChip type={row.attacker} size="sm" tone="flat" />
                <span
                  className={`ml-auto font-mono text-xs font-bold ${
                    row.quadCount > 0 ? SEVERITY[4].ink : SEVERITY[2].ink
                  }`}
                >
                  {row.weakCount} {row.weakCount === 1 ? 'CAE' : 'CAEN'}
                </span>
              </div>

              <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                {fallen.map(({ member, multiplier }) => (
                  <li key={member.slug}>
                    <span
                      className={`inline-flex h-9 items-center gap-2 rounded-lg bg-surface-2 px-2.5 text-[13.5px] font-semibold ${SEVERITY[multiplier].ink}`}
                    >
                      <span className="font-mono font-bold">{formatMultiplier(multiplier)}</span>
                      <span className="text-ink">{shortName(member.name)}</span>
                    </span>
                  </li>
                ))}
              </ul>

              {safe > 0 ? (
                <p className="text-[12.5px] text-ink-dim">
                  {safe} {safe === 1 ? 'aguanta' : 'aguantan'} sin daño aumentado
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>

      <p className="hidden items-center gap-3.5 border-t border-line px-7 py-4 md:flex">
        <span className="font-mono text-[11px] tracking-[.14em] text-ink-dim">
          {18 - threats.length} TIPOS RESTANTES · NO TUMBAN A NADIE
        </span>
      </p>
    </section>
  );
}

function Row({
  row,
  members,
  first,
}: {
  readonly row: MatrixProps['threats'][number];
  readonly members: readonly Member[];
  readonly first: boolean;
}) {
  return (
    <>
      <div
        className={`flex items-center gap-3 px-5 py-3.5 ${first ? 'bg-threat-top' : 'bg-threat'}`}
      >
        <TypeChip type={row.attacker} size="xs" tone="flat" />
        <span
          className={`ml-auto font-mono text-xs font-bold ${
            row.quadCount > 0 ? SEVERITY[4].ink : SEVERITY[2].ink
          }`}
        >
          {row.weakCount} {row.weakCount === 1 ? 'CAE' : 'CAEN'}
          {row.quadCount > 0 ? ' ×4' : ''}
        </span>
      </div>

      {members.map((member, position) => {
        const multiplier = row.cells[position] ?? 1;
        return (
          <div
            key={member.slug}
            className={`flex items-center justify-center py-4 font-mono font-bold ${
              SEVERITY[multiplier].cell
            } ${multiplier === 4 ? 'text-2xl' : multiplier === 2 ? 'text-[19px]' : 'text-[17px]'} ${
              multiplier === 1 ? 'font-normal text-[15px]' : ''
            }`}
          >
            {formatMultiplier(multiplier)}
            <span className="sr-only">
              {' '}
              — {member.name} recibe {multiplierAria(multiplier)} de {typeName(row.attacker)}
            </span>
          </div>
        );
      })}
    </>
  );
}

function OffensiveGaps({
  gaps,
  uncovered,
}: {
  readonly gaps: readonly import('@/lib/types').PokemonType[];
  readonly uncovered: readonly import('@/lib/types').ExistingTyping[];
}) {
  if (gaps.length === 0 && uncovered.length === 0) {
    return (
      <p className="border-t border-line bg-surface px-4 py-4 text-sm font-semibold text-multhalf-ink sm:px-7">
        Tu equipo pega súper efectivo a los 18 tipos. No hay huecos ofensivos.
      </p>
    );
  }

  return (
    <section
      aria-labelledby="huecos"
      className="flex flex-col gap-3 border-t border-line bg-surface px-4 py-4 sm:px-7"
    >
      <h2 id="huecos" className="font-mono text-[11px] font-bold tracking-[.14em] text-ink-muted">
        HUECOS OFENSIVOS
      </h2>

      {gaps.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2.5">
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {gaps.map((type) => (
              <li key={type}>
                <TypeChip type={type} size="sm" tone="raised" />
              </li>
            ))}
          </ul>
          <span className="text-sm text-ink-muted">nadie del equipo les pega súper efectivo</span>
        </div>
      ) : null}

      {uncovered.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-[13px] text-ink-dim">
            Los typings más comunes contra los que no tienes nada que llegue a ×2:
          </p>
          <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
            {uncovered.map((entry) => (
              <li
                key={entry.slug}
                className="inline-flex h-8 items-center gap-2 rounded-lg bg-surface-2 px-2.5 text-[13px]"
              >
                <span className="font-medium text-ink">{typingName(entry.types)}</span>
                <span className="font-mono text-[11px] text-ink-dim">{entry.count}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
