/**
 * La tabla de tipos. Módulo aislado, puro, sin una sola dependencia.
 *
 * Está escrita a mano en vez de sacarse de PokéAPI a propósito: es
 * determinista, no cambia, y así se puede testear contra casos conocidos.
 *
 * Las tablas se declaran como listas de excepciones (lo que NO es ×1) porque
 * la mayoría de las 324 celdas son ×1 y una matriz completa a mano es un
 * campo de minas de erratas. La matriz densa se construye una vez al cargar
 * el módulo.
 */

import {
  POKEMON_TYPES,
  type CellMultiplier,
  type PokemonType,
} from './types.ts';

/** Generaciones cuya tabla está implementada. */
export type ChartGeneration = 6;

interface Exceptions {
  /** Contra estos pega ×2. */
  readonly strong?: readonly PokemonType[];
  /** Contra estos pega ×0.5. */
  readonly weak?: readonly PokemonType[];
  /** Contra estos no hace nada. */
  readonly none?: readonly PokemonType[];
}

/**
 * Gen 6+ (con Hada). Cada entrada es el tipo ATACANTE.
 * Todo lo que no aparezca es ×1.
 */
const GEN6_EXCEPTIONS: Readonly<Record<PokemonType, Exceptions>> = {
  normal: { weak: ['rock', 'steel'], none: ['ghost'] },
  fire: {
    strong: ['grass', 'ice', 'bug', 'steel'],
    weak: ['fire', 'water', 'rock', 'dragon'],
  },
  water: { strong: ['fire', 'ground', 'rock'], weak: ['water', 'grass', 'dragon'] },
  electric: {
    strong: ['water', 'flying'],
    weak: ['electric', 'grass', 'dragon'],
    none: ['ground'],
  },
  grass: {
    strong: ['water', 'ground', 'rock'],
    weak: ['fire', 'grass', 'poison', 'flying', 'bug', 'dragon', 'steel'],
  },
  ice: {
    strong: ['grass', 'ground', 'flying', 'dragon'],
    weak: ['fire', 'water', 'ice', 'steel'],
  },
  fighting: {
    strong: ['normal', 'ice', 'rock', 'dark', 'steel'],
    weak: ['poison', 'flying', 'psychic', 'bug', 'fairy'],
    none: ['ghost'],
  },
  poison: {
    strong: ['grass', 'fairy'],
    weak: ['poison', 'ground', 'rock', 'ghost'],
    none: ['steel'],
  },
  ground: {
    strong: ['fire', 'electric', 'poison', 'rock', 'steel'],
    weak: ['grass', 'bug'],
    none: ['flying'],
  },
  flying: {
    strong: ['grass', 'fighting', 'bug'],
    weak: ['electric', 'rock', 'steel'],
  },
  psychic: { strong: ['fighting', 'poison'], weak: ['psychic', 'steel'], none: ['dark'] },
  bug: {
    strong: ['grass', 'psychic', 'dark'],
    weak: ['fire', 'fighting', 'poison', 'flying', 'ghost', 'steel', 'fairy'],
  },
  rock: {
    strong: ['fire', 'ice', 'flying', 'bug'],
    weak: ['fighting', 'ground', 'steel'],
  },
  ghost: { strong: ['psychic', 'ghost'], weak: ['dark'], none: ['normal'] },
  dragon: { strong: ['dragon'], weak: ['steel'], none: ['fairy'] },
  dark: { strong: ['psychic', 'ghost'], weak: ['fighting', 'dark', 'fairy'] },
  steel: {
    strong: ['ice', 'rock', 'fairy'],
    weak: ['fire', 'water', 'electric', 'steel'],
  },
  fairy: { strong: ['fighting', 'dragon', 'dark'], weak: ['fire', 'poison', 'steel'] },
};

/** Matriz densa: `chart[atacante][defensor]`. */
export type TypeChart = Readonly<Record<PokemonType, Readonly<Record<PokemonType, CellMultiplier>>>>;

function buildChart(exceptions: Readonly<Record<PokemonType, Exceptions>>): TypeChart {
  const chart = {} as Record<PokemonType, Record<PokemonType, CellMultiplier>>;

  for (const attacker of POKEMON_TYPES) {
    const row = {} as Record<PokemonType, CellMultiplier>;
    for (const defender of POKEMON_TYPES) {
      row[defender] = 1;
    }

    const rules = exceptions[attacker];
    for (const defender of rules.strong ?? []) row[defender] = 2;
    for (const defender of rules.weak ?? []) row[defender] = 0.5;
    for (const defender of rules.none ?? []) row[defender] = 0;

    chart[attacker] = row;
  }

  return chart;
}

export const CHART_GEN6: TypeChart = buildChart(GEN6_EXCEPTIONS);

/**
 * Punto de extensión para generaciones antiguas. Hoy solo existe Gen 6+;
 * añadir Gen 1 mañana es declarar sus excepciones y una rama aquí, sin tocar
 * `effectiveness.ts`.
 */
export function getChart(generation: ChartGeneration = 6): TypeChart {
  switch (generation) {
    case 6:
      return CHART_GEN6;
  }
}

/** Multiplicador de un tipo atacante contra un único tipo defensor. */
export function cellMultiplier(
  attacker: PokemonType,
  defender: PokemonType,
  chart: TypeChart = CHART_GEN6,
): CellMultiplier {
  return chart[attacker][defender];
}
