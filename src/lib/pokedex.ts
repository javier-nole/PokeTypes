/**
 * Acceso al dataset generado. Sigue siendo lógica pura: importa JSON, no
 * React. Sólo lo usan componentes de servidor, así que el JSON se queda en
 * el bundle de build y nunca llega al navegador.
 */

import rawPokemon from '../data/pokemon.json' with { type: 'json' };
import rawTypings from '../data/typings.json' with { type: 'json' };

import { typingSlug } from './i18n.ts';
import {
  isPokemonType,
  normalizeTyping,
  type ExistingTyping,
  type Pokemon,
  type PokemonType,
  type Typing,
} from './types.ts';

/**
 * El JSON entra como `unknown` desde el punto de vista del dominio. Se
 * valida una vez, en build: si el script de datos alguna vez escupe algo
 * que no encaja, el build falla aquí en vez de renderizar una página rota.
 */
function parseTyping(value: readonly unknown[], context: string): Typing {
  const types: PokemonType[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string' || !isPokemonType(entry)) {
      throw new Error(`Tipo inválido en ${context}: ${JSON.stringify(entry)}`);
    }
    types.push(entry);
  }
  if (types.length < 1 || types.length > 2) {
    throw new Error(`${context} tiene ${types.length} tipos; deben ser 1 o 2.`);
  }
  return normalizeTyping(types);
}

export const ALL_POKEMON: readonly Pokemon[] = rawPokemon.map((entry) => ({
  id: entry.id,
  slug: entry.slug,
  nameEs: entry.nameEs,
  nameEn: entry.nameEn,
  types: parseTyping(entry.types, entry.slug),
  generation: entry.generation,
  sprite: entry.sprite,
}));

export const EXISTING_TYPINGS: readonly ExistingTyping[] = rawTypings.map((entry) => ({
  slug: entry.slug,
  count: entry.count,
  types: parseTyping(entry.types, entry.slug),
}));

const BY_SLUG: ReadonlyMap<string, Pokemon> = new Map(
  ALL_POKEMON.map((entry) => [entry.slug, entry] as const),
);

export function getPokemon(slug: string): Pokemon | null {
  return BY_SLUG.get(slug) ?? null;
}

/** Todos los Pokémon con exactamente este typing, en orden de Pokédex. */
export function pokemonWithTyping(typing: Typing): readonly Pokemon[] {
  const key = typing.join('-');
  return ALL_POKEMON.filter((entry) => entry.types.join('-') === key);
}

/** Cuántos Pokémon llevan un tipo, esté solo o acompañado. */
export function countWithType(type: PokemonType): number {
  return ALL_POKEMON.filter((entry) => (entry.types as readonly PokemonType[]).includes(type))
    .length;
}

/**
 * Los typings que existen, ordenados de más común a menos. Es lo que evita
 * listar las 171 combinaciones teóricas en la vista de ataque.
 */
export function existingTypings(): readonly ExistingTyping[] {
  return EXISTING_TYPINGS;
}

/** Slugs de URL de todos los typings existentes, para `generateStaticParams`. */
export function allTypingSlugs(): readonly string[] {
  return EXISTING_TYPINGS.map((entry) => typingSlug(entry.types));
}

/**
 * Un representante reconocible de un typing, para ilustrar la página del
 * tipo: el de número de Pokédex más bajo, que suele ser el más conocido.
 */
export function representativeOf(typing: Typing): Pokemon | null {
  return pokemonWithTyping(typing).find((entry) => entry.id < 10000) ?? null;
}
