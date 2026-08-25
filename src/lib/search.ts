/**
 * Búsqueda unificada: un input que acepta un nombre de Pokémon o uno/dos
 * tipos. Cliente puro sobre el índice, sin dependencias.
 *
 * No usamos una librería de fuzzy: para 1200 nombres cortos, prefijo +
 * subcadena + Levenshtein con corte temprano da mejores resultados que un
 * scorer genérico, y pesa cero.
 */

import { TYPE_NAMES_EN, TYPE_NAMES_ES } from './i18n.ts';
import { POKEMON_TYPES, normalizeTyping, type PokemonType, type Typing } from './types.ts';

/** Entrada del índice que se descarga de `/search-index.json`. */
export interface SearchEntry {
  readonly slug: string;
  readonly nameEs: string;
  readonly nameEn?: string;
  readonly types: readonly PokemonType[];
  /** Ausente si el Pokémon no tiene sprite en PokéAPI. */
  readonly spriteId?: number;
}

export type SearchResult =
  | { readonly kind: 'pokemon'; readonly entry: SearchEntry; readonly score: number }
  | { readonly kind: 'typing'; readonly typing: Typing; readonly score: number };

/**
 * Normaliza para comparar: sin tildes, sin mayúsculas, sin puntuación.
 * `Nidoran♀` → `nidoranf`, `Mr. Mime` → `mrmime`, `Ninetales` → `ninetales`.
 */
export function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/♀/g, 'f')
    .replace(/♂/g, 'm')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Distancia de Levenshtein con corte: en cuanto la fila mínima supera
 * `max`, deja de calcular. Convierte el peor caso en lineal para la
 * inmensa mayoría de pares, que no se parecen en nada.
 */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  if (a === b) return 0;

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i += 1) {
    const current = [i, ...new Array<number>(b.length).fill(0)];
    let rowMin = i;

    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min(
        (current[j - 1] ?? 0) + 1,
        (previous[j] ?? 0) + 1,
        (previous[j - 1] ?? 0) + cost,
      );
      current[j] = value;
      if (value < rowMin) rowMin = value;
    }

    if (rowMin > max) return max + 1;
    previous = current;
  }

  return previous[b.length] ?? max + 1;
}

/**
 * Cuánta tolerancia a erratas damos según lo que se haya escrito.
 *
 * Generosa a propósito en nombres largos: "guiaraos" está a tres ediciones
 * de "Gyarados" y tiene que encontrarlo. El riesgo de pasarse es bajo
 * porque nunca autocorregimos — sólo ofrecemos, y el exacto siempre gana.
 */
function toleranceFor(query: string): number {
  if (query.length <= 3) return 0;
  if (query.length <= 5) return 1;
  if (query.length <= 7) return 2;
  return 3;
}

/**
 * Puntúa un candidato contra la consulta. Mayor es mejor; `null` descarta.
 * El orden de las ramas es el orden de calidad: exacto, prefijo, subcadena,
 * y sólo al final la corrección de erratas.
 */
function scoreName(query: string, candidate: string): number | null {
  if (candidate === query) return 1000;
  if (candidate.startsWith(query)) return 800 - candidate.length;
  if (candidate.includes(query)) return 500 - candidate.length;

  const tolerance = toleranceFor(query);
  if (tolerance === 0) return null;

  const distance = editDistance(query, candidate, tolerance);
  return distance <= tolerance ? 300 - distance * 60 - candidate.length : null;
}

/**
 * Coincidencia por palabras sueltas, en cualquier orden: "mega gyarados"
 * y "gyarados mega" tienen que llevar los dos a Gyarados (Mega). Se exige
 * que TODAS las palabras aparezcan, para no devolver medio índice.
 */
function scoreTokens(tokens: readonly string[], candidate: string): number | null {
  if (tokens.length < 2) return null;
  return tokens.every((token) => candidate.includes(token)) ? 450 - candidate.length : null;
}

const TYPE_TERMS: readonly { readonly type: PokemonType; readonly terms: readonly string[] }[] =
  POKEMON_TYPES.map((type) => ({
    type,
    terms: [...new Set([normalize(TYPE_NAMES_ES[type]), normalize(TYPE_NAMES_EN[type])])],
  }));

/** Busca un único tipo por nombre, en español o inglés, con tolerancia. */
function matchType(token: string): { type: PokemonType; score: number } | null {
  let best: { type: PokemonType; score: number } | null = null;

  for (const { type, terms } of TYPE_TERMS) {
    for (const term of terms) {
      const score = scoreName(token, term);
      if (score !== null && (best === null || score > best.score)) {
        best = { type, score };
      }
    }
  }

  return best;
}

/**
 * Interpreta la consulta como uno o dos tipos: "agua volador",
 * "agua/volador", "fuego-lucha", "water flying". Devuelve `null` si alguna
 * de las palabras no es un tipo, para no competir con la búsqueda por
 * nombre.
 */
export function parseTypingQuery(query: string): { typing: Typing; score: number } | null {
  const tokens = query
    .split(/[\s/,+·-]+/)
    .map((token) => normalize(token))
    .filter((token) => token.length > 0);

  if (tokens.length < 1 || tokens.length > 2) return null;

  const matches = tokens.map((token) => matchType(token));
  if (matches.some((match) => match === null)) return null;

  const found = matches.filter((match) => match !== null);
  const types = found.map((match) => match.type);
  if (types.length === 2 && types[0] === types[1]) return null;

  const score = Math.min(...found.map((match) => match.score));
  return { typing: normalizeTyping(types), score };
}

export interface SearchOptions {
  /** Cuántos Pokémon devolver como mucho. */
  readonly limit?: number;
}

/**
 * La búsqueda del sitio. Devuelve typings y Pokémon mezclados y ordenados
 * por calidad de coincidencia, para que el primer resultado sea siempre el
 * que se acepta con Enter.
 */
export function search(
  query: string,
  index: readonly SearchEntry[],
  options: SearchOptions = {},
): SearchResult[] {
  const normalized = normalize(query);
  if (normalized.length === 0) return [];

  const limit = options.limit ?? 8;
  const results: SearchResult[] = [];

  const asTyping = parseTypingQuery(query);
  if (asTyping !== null) {
    results.push({ kind: 'typing', typing: asTyping.typing, score: asTyping.score });
  }

  const tokens = query
    .split(/[\s/,.·-]+/)
    .map((token) => normalize(token))
    .filter((token) => token.length > 0);

  const scored: { entry: SearchEntry; score: number }[] = [];
  for (const entry of index) {
    const candidates = [entry.nameEs, entry.nameEn ?? entry.nameEs, entry.slug];
    let best: number | null = null;

    for (const candidate of candidates) {
      const normalizedCandidate = normalize(candidate);
      for (const score of [
        scoreName(normalized, normalizedCandidate),
        scoreTokens(tokens, normalizedCandidate),
      ]) {
        if (score !== null && (best === null || score > best)) best = score;
      }
    }

    if (best !== null) scored.push({ entry, score: best });
  }

  scored.sort((a, b) => b.score - a.score || a.entry.slug.localeCompare(b.entry.slug));
  for (const { entry, score } of scored.slice(0, limit)) {
    results.push({ kind: 'pokemon', entry, score });
  }

  return results.sort((a, b) => b.score - a.score);
}

/**
 * ¿Hay una errata evidente? Se usa para el "¿Querías decir Gyarados?" —
 * nunca se autocorrige en silencio, sólo se ofrece.
 */
export function didYouMean(query: string, results: readonly SearchResult[]): string | null {
  const normalized = normalize(query);
  const first = results[0];
  if (first === undefined || first.kind !== 'pokemon') return null;

  const exact = normalize(first.entry.nameEs) === normalized;
  return exact ? null : first.entry.nameEs;
}
