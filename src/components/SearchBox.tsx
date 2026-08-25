'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState } from 'react';

import { Sprite } from '@/components/Sprite';
import { TypeBars } from '@/components/TypeChip';
import { withBasePath } from '@/lib/base-path';
import { typingSlug } from '@/lib/i18n';
import { didYouMean, search, type SearchEntry, type SearchResult } from '@/lib/search';
import { typingName } from '@/lib/i18n';

/**
 * El buscador. Un solo input que acepta un nombre de Pokémon o uno/dos
 * tipos, y resuelve la consulta en una interacción: escribir y Enter.
 *
 * El índice (~78 KB) NO entra en el bundle: se descarga con fetch al primer
 * foco del input. Hasta entonces la página pesa lo que pesa el HTML.
 */

const RECENTS_KEY = 'poketypes:recientes';
const MAX_RECENTS = 3;

interface Recent {
  readonly href: string;
  readonly label: string;
}

function readRecents(): Recent[] {
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is Recent =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Recent).href === 'string' &&
        typeof (item as Recent).label === 'string',
    );
  } catch {
    return [];
  }
}

export function rememberRecent(recent: Recent): void {
  try {
    const existing = readRecents().filter((item) => item.href !== recent.href);
    window.localStorage.setItem(
      RECENTS_KEY,
      JSON.stringify([recent, ...existing].slice(0, MAX_RECENTS)),
    );
  } catch {
    // Sin localStorage (modo privado): los recientes son un extra, no rompen nada.
  }
}

function hrefFor(result: SearchResult): string {
  return result.kind === 'pokemon'
    ? `/pokemon/${result.entry.slug}/`
    : `/tipo/${typingSlug(result.typing)}/`;
}

function labelFor(result: SearchResult): string {
  return result.kind === 'pokemon' ? result.entry.nameEs : typingName(result.typing);
}

interface SearchBoxProps {
  readonly autoFocus?: boolean;
  readonly placeholder?: string;
  readonly compact?: boolean;
  /**
   * Si se pasa, elegir un resultado NO navega: se lo entrega a quien llama.
   * Es lo que permite reutilizar el buscador para añadir al equipo.
   */
  readonly onSelect?: (result: SearchResult) => void;
}

export function SearchBox({
  autoFocus = false,
  placeholder = 'Pokémon o tipos…',
  compact = false,
  onSelect,
}: SearchBoxProps) {
  const router = useRouter();
  const listId = useId();

  const [query, setQuery] = useState('');
  const [index, setIndex] = useState<readonly SearchEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [recents, setRecents] = useState<Recent[]>([]);
  const [highlighted, setHighlighted] = useState(0);
  const [open, setOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRecents(readRecents());
  }, []);

  /** Descarga diferida: sólo la primera vez que el usuario muestra intención. */
  const loadIndex = useCallback(() => {
    if (index !== null || loading) return;
    setLoading(true);
    void fetch(withBasePath('/search-index.json'))
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('404'))))
      .then((data: SearchEntry[]) => setIndex(data))
      .catch(() => setIndex([]))
      .finally(() => setLoading(false));
  }, [index, loading]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent): void {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const results = index === null || query.trim() === '' ? [] : search(query, index);
  const suggestion = query.trim() === '' ? null : didYouMean(query, results);
  const showResults = open && query.trim() !== '';

  function go(result: SearchResult): void {
    if (onSelect !== undefined) {
      onSelect(result);
      setQuery('');
      setOpen(false);
      return;
    }
    rememberRecent({ href: hrefFor(result), label: labelFor(result) });
    router.push(hrefFor(result));
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      const chosen = results[highlighted] ?? results[0];
      if (chosen !== undefined) go(chosen);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlighted((current) => Math.min(current + 1, results.length - 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlighted((current) => Math.max(current - 1, 0));
      return;
    }
    if (event.key === 'Escape') setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative flex flex-col gap-4">
      <div
        className={`flex items-center gap-2.5 rounded-xl bg-surface px-4 ${
          compact ? 'h-11 border border-border' : 'h-14 border-[1.5px] border-ink'
        }`}
      >
        <span aria-hidden="true" className="text-ink-dim">
          ⌕
        </span>
        <input
          type="search"
          value={query}
          autoFocus={autoFocus}
          placeholder={placeholder}
          aria-label="Buscar un Pokémon o uno o dos tipos"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={showResults}
          role="combobox"
          enterKeyHint="search"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className={`min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-ink-dim ${
            compact ? 'text-[14.5px] font-semibold' : 'text-base'
          }`}
          onFocus={() => {
            loadIndex();
            setOpen(true);
          }}
          onChange={(event) => {
            loadIndex();
            setQuery(event.target.value);
            setHighlighted(0);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
        {query !== '' ? (
          <button
            type="button"
            aria-label="Borrar la búsqueda"
            className="text-lg text-ink-dim"
            onClick={() => {
              setQuery('');
              setHighlighted(0);
            }}
          >
            ×
          </button>
        ) : null}
      </div>

      {showResults ? (
        <div className="absolute inset-x-0 top-full z-20 mt-2 flex flex-col gap-1.5 rounded-xl border border-border bg-panel p-2 shadow-2xl">
          {/* Nunca se autocorrige en silencio: se ofrece y decide el usuario. */}
          {suggestion !== null ? (
            <p className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2.5 text-[14px] text-ink-muted">
              ¿Querías decir <strong className="font-bold text-ink">{suggestion}</strong>?
            </p>
          ) : null}

          <ul id={listId} role="listbox" aria-label="Resultados" className="m-0 flex list-none flex-col gap-1 p-0">
            {results.map((result, position) => {
              const href = hrefFor(result);
              const inner = (
                <>
                  {result.kind === 'pokemon' ? (
                    <Sprite spriteId={result.entry.spriteId} size={40} />
                  ) : null}
                  <span
                    className={`flex-1 truncate text-base ${
                      position === highlighted ? 'font-bold text-ink' : 'font-semibold text-ink-muted'
                    }`}
                  >
                    {labelFor(result)}
                  </span>
                  <TypeBars types={result.kind === 'pokemon' ? result.entry.types : result.typing} />
                </>
              );
              const shared = `flex h-14 w-full items-center gap-2.5 rounded-[10px] pl-2 pr-3.5 text-left no-underline ${
                position === highlighted ? 'bg-surface-2' : 'bg-surface'
              }`;

              return (
                <li key={href}>
                  {onSelect !== undefined ? (
                    <button
                      type="button"
                      role="option"
                      aria-selected={position === highlighted}
                      onMouseEnter={() => setHighlighted(position)}
                      onClick={() => go(result)}
                      className={shared}
                    >
                      {inner}
                    </button>
                  ) : (
                    <Link
                      href={href}
                      role="option"
                      aria-selected={position === highlighted}
                      onMouseEnter={() => setHighlighted(position)}
                      onClick={() => rememberRecent({ href, label: labelFor(result) })}
                      className={shared}
                    >
                      {inner}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>

          {results.length === 0 ? (
            <div className="flex flex-col gap-2 px-3.5 py-4">
              <p className="text-lg font-bold">
                {loading ? 'Cargando…' : 'Sin coincidencias'}
              </p>
              {!loading ? (
                <p className="text-sm leading-relaxed text-ink-muted">
                  No hay ningún Pokémon ni combinación de tipos con ese nombre.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {!compact && recents.length > 0 && !showResults ? (
        <div className="flex flex-col gap-2.5">
          <span className="font-mono text-[10.5px] tracking-[.14em] text-ink-dim">RECIENTES</span>
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {recents.map((recent) => (
              <li key={recent.href}>
                <Link
                  href={recent.href}
                  className="inline-flex h-11 items-center rounded-[10px] border border-border bg-surface px-3.5 text-[14.5px] font-semibold text-ink no-underline"
                >
                  {recent.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
