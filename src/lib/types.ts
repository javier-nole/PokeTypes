/**
 * Tipos de dominio. Sin dependencias — ni React, ni Next, ni datos.
 */

/**
 * Los 18 tipos, en orden canónico (el orden de la tabla oficial).
 * Este orden manda en toda la app: en los slugs de typing, en el grid de la
 * home y en el orden de las filas de la matriz de equipo.
 */
export const POKEMON_TYPES = [
  'normal',
  'fire',
  'water',
  'electric',
  'grass',
  'ice',
  'fighting',
  'poison',
  'ground',
  'flying',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dragon',
  'dark',
  'steel',
  'fairy',
] as const;

export type PokemonType = (typeof POKEMON_TYPES)[number];

/** Valor de una celda de la tabla: un tipo atacante contra un tipo defensor. */
export type CellMultiplier = 0 | 0.5 | 1 | 2;

/**
 * Multiplicador resultante contra un typing completo (uno o dos tipos).
 * Es el producto de una o dos celdas, así que el conjunto es cerrado y finito.
 */
export type Multiplier = 0 | 0.25 | 0.5 | 1 | 2 | 4;

/** Todos los multiplicadores posibles, de más peligroso a menos. */
export const MULTIPLIERS = [4, 2, 1, 0.5, 0.25, 0] as const satisfies readonly Multiplier[];

/**
 * Un typing: uno o dos tipos. Siempre en orden canónico — lo normaliza
 * `normalizeTyping`, y las funciones de `effectiveness` asumen que ya lo está
 * para poder usar la clave como identidad.
 */
export type Typing = readonly [PokemonType] | readonly [PokemonType, PokemonType];

/** Una entrada del dataset generado desde PokéAPI. */
export interface Pokemon {
  readonly id: number;
  readonly slug: string;
  readonly nameEs: string;
  readonly nameEn: string;
  readonly types: Typing;
  /** Número de generación, 1–9. */
  readonly generation: number;
  /** URL del sprite en PokéAPI. Cadena vacía si el Pokémon no tiene sprite. */
  readonly sprite: string;
}

/** Un typing existente en el juego, con cuántos Pokémon lo llevan. */
export interface ExistingTyping {
  readonly types: Typing;
  readonly slug: string;
  readonly count: number;
}

/** Comprueba en runtime que una cadena es un tipo válido. */
export function isPokemonType(value: string): value is PokemonType {
  return (POKEMON_TYPES as readonly string[]).includes(value);
}

/**
 * Ordena los tipos de un typing al orden canónico y elimina duplicados, para
 * que `['flying','water']` y `['water','flying']` sean el mismo typing.
 */
export function normalizeTyping(types: readonly PokemonType[]): Typing {
  const unique = [...new Set(types)].sort(
    (a, b) => POKEMON_TYPES.indexOf(a) - POKEMON_TYPES.indexOf(b),
  );
  const [first, second] = unique;
  if (first === undefined) {
    throw new Error('Un typing necesita al menos un tipo.');
  }
  return second === undefined ? [first] : [first, second];
}

/** Clave estable de un typing, para usar en Map/Set y en URLs. */
export function typingKey(types: Typing): string {
  return types.join('-');
}
