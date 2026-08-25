/**
 * Nombres de cara al usuario. El código habla inglés por dentro
 * (`'electric'`), el usuario ve español por fuera ("Eléctrico"). Nunca se
 * compara contra una cadena en español: se traduce sólo al pintar.
 */

import {
  POKEMON_TYPES,
  isPokemonType,
  normalizeTyping,
  type Multiplier,
  type PokemonType,
  type Typing,
} from './types.ts';

export const TYPE_NAMES_ES: Readonly<Record<PokemonType, string>> = {
  normal: 'Normal',
  fire: 'Fuego',
  water: 'Agua',
  electric: 'Eléctrico',
  grass: 'Planta',
  ice: 'Hielo',
  fighting: 'Lucha',
  poison: 'Veneno',
  ground: 'Tierra',
  flying: 'Volador',
  psychic: 'Psíquico',
  bug: 'Bicho',
  rock: 'Roca',
  ghost: 'Fantasma',
  dragon: 'Dragón',
  dark: 'Siniestro',
  steel: 'Acero',
  fairy: 'Hada',
};

export const TYPE_NAMES_EN: Readonly<Record<PokemonType, string>> = {
  normal: 'Normal',
  fire: 'Fire',
  water: 'Water',
  electric: 'Electric',
  grass: 'Grass',
  ice: 'Ice',
  fighting: 'Fighting',
  poison: 'Poison',
  ground: 'Ground',
  flying: 'Flying',
  psychic: 'Psychic',
  bug: 'Bug',
  rock: 'Rock',
  ghost: 'Ghost',
  dragon: 'Dragon',
  dark: 'Dark',
  steel: 'Steel',
  fairy: 'Fairy',
};

/** Slug ASCII de cada tipo, para las URLs `/tipo/...`. */
export const TYPE_SLUGS_ES: Readonly<Record<PokemonType, string>> = {
  normal: 'normal',
  fire: 'fuego',
  water: 'agua',
  electric: 'electrico',
  grass: 'planta',
  ice: 'hielo',
  fighting: 'lucha',
  poison: 'veneno',
  ground: 'tierra',
  flying: 'volador',
  psychic: 'psiquico',
  bug: 'bicho',
  rock: 'roca',
  ghost: 'fantasma',
  dragon: 'dragon',
  dark: 'siniestro',
  steel: 'acero',
  fairy: 'hada',
};

const SLUG_TO_TYPE: ReadonlyMap<string, PokemonType> = new Map(
  POKEMON_TYPES.map((type) => [TYPE_SLUGS_ES[type], type] as const),
);

export function typeName(type: PokemonType, locale: 'es' | 'en' = 'es'): string {
  return locale === 'es' ? TYPE_NAMES_ES[type] : TYPE_NAMES_EN[type];
}

/** Nombre legible de un typing: "Agua / Volador". */
export function typingName(typing: Typing, locale: 'es' | 'en' = 'es'): string {
  return typing.map((type) => typeName(type, locale)).join(' / ');
}

/** Slug de URL de un typing, en orden canónico: "agua-volador". */
export function typingSlug(typing: Typing): string {
  return typing.map((type) => TYPE_SLUGS_ES[type]).join('-');
}

/**
 * Interpreta un slug de `/tipo/[...]`. Acepta uno o dos tipos y devuelve
 * `null` si el slug no corresponde a tipos reales, para que la ruta pueda
 * dar 404 en vez de renderizar basura.
 */
export function parseTypingSlug(slug: string): Typing | null {
  const parts = slug.split('-').filter((part) => part.length > 0);
  if (parts.length < 1 || parts.length > 2) return null;

  const types: PokemonType[] = [];
  for (const part of parts) {
    const type = SLUG_TO_TYPE.get(part);
    if (type === undefined) return null;
    types.push(type);
  }
  if (types.length === 2 && types[0] === types[1]) return null;

  return normalizeTyping(types);
}

/** Convierte una clave inglesa de PokéAPI en `PokemonType`, o falla. */
export function toPokemonType(apiName: string): PokemonType {
  if (!isPokemonType(apiName)) {
    throw new Error(`Tipo desconocido en los datos: "${apiName}"`);
  }
  return apiName;
}

// ─────────────────────────────────────────────────────────────────────────
// Multiplicadores
// ─────────────────────────────────────────────────────────────────────────

/** "×4", "×½", "×¼", "×0". Nunca decimales, nunca una "x" latina. */
export function formatMultiplier(multiplier: Multiplier): string {
  switch (multiplier) {
    case 4:
      return '×4';
    case 2:
      return '×2';
    case 1:
      return '×1';
    case 0.5:
      return '×½';
    case 0.25:
      return '×¼';
    case 0:
      return '×0';
  }
}

/**
 * La palabra que acompaña al número. Es una de las cuatro señales
 * redundantes del diseño: el color nunca porta el significado solo.
 */
export function severityLabel(multiplier: Multiplier): string | null {
  switch (multiplier) {
    case 4:
      return 'LETAL';
    case 2:
      return 'PELIGRO';
    case 1:
      return null;
    case 0.5:
      return 'RESISTE';
    case 0.25:
      return 'MURO';
    case 0:
      return 'INMUNE';
  }
}

/** Etiqueta equivalente en la vista de ataque, donde el signo se invierte. */
export function offensiveLabel(multiplier: Multiplier): string | null {
  switch (multiplier) {
    case 4:
      return 'DEMOLEDOR';
    case 2:
      return 'SÚPER EFECTIVO';
    case 1:
      return null;
    case 0.5:
      return 'TE RESISTE';
    case 0.25:
      return 'CASI NADA';
    case 0:
      return 'NO LE HACE NADA';
  }
}

/** Sufijo del token CSS de severidad: `--mult-4`, `--mult-half`… */
export function multiplierToken(multiplier: Multiplier): string {
  switch (multiplier) {
    case 4:
      return '4';
    case 2:
      return '2';
    case 1:
      return '1';
    case 0.5:
      return 'half';
    case 0.25:
      return 'quarter';
    case 0:
      return '0';
  }
}

/** Texto accesible para lectores de pantalla. */
export function multiplierAria(multiplier: Multiplier): string {
  switch (multiplier) {
    case 4:
      return 'daño cuádruple';
    case 2:
      return 'daño doble';
    case 1:
      return 'daño normal';
    case 0.5:
      return 'daño reducido a la mitad';
    case 0.25:
      return 'daño reducido a un cuarto';
    case 0:
      return 'sin daño';
  }
}
