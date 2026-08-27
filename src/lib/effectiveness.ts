/**
 * Toda la aritmética de efectividades del sitio. Funciones puras: mismas
 * entradas, mismas salidas, sin estado y sin tocar datos globales.
 *
 * Los datos (qué typings existen) entran siempre por parámetro, nunca por
 * import, para que cada función se pueda testear con un dataset de tres
 * líneas.
 */

import { CHART_GEN6, type TypeChart } from './type-chart.ts';
import {
  MULTIPLIERS,
  POKEMON_TYPES,
  typingKey,
  type ExistingTyping,
  type Multiplier,
  type PokemonType,
  type Typing,
} from './types.ts';

// ─────────────────────────────────────────────────────────────────────────
// Base
// ─────────────────────────────────────────────────────────────────────────

/**
 * Multiplicador de un tipo atacante contra un typing completo.
 *
 * Aquí es donde una inmunidad anula una debilidad: Tierra pega ×2 a Veneno
 * pero ×0 a Fantasma, y Gengar (Fantasma/Veneno) recibe 2 × 0 = ×0.
 */
export function multiplierAgainst(
  attacker: PokemonType,
  defender: Typing,
  chart: TypeChart = CHART_GEN6,
): Multiplier {
  let result = 1;
  for (const defenderType of defender) {
    result *= chart[attacker][defenderType];
  }
  // El producto de una o dos celdas de {0, .5, 1, 2} sólo puede caer en este
  // conjunto; el `as` documenta lo que el compilador no puede demostrar.
  return result as Multiplier;
}

/**
 * El mejor multiplicador que consigue quien ataca con `attackers` contra
 * `defender`. Es la pregunta "¿con qué le pego?" reducida a un número.
 */
export function bestMultiplier(
  attackers: readonly PokemonType[],
  defender: Typing,
  chart: TypeChart = CHART_GEN6,
): Multiplier {
  let best: Multiplier = 0;
  for (const attacker of attackers) {
    const value = multiplierAgainst(attacker, defender, chart);
    if (value > best) best = value;
  }
  return best;
}

/** Agrupa pares (clave, multiplicador) por multiplicador, de ×4 a ×0. */
function groupByMultiplier<T>(
  entries: readonly { readonly item: T; readonly multiplier: Multiplier }[],
): { multiplier: Multiplier; items: T[] }[] {
  return MULTIPLIERS.map((multiplier) => ({
    multiplier,
    items: entries.filter((entry) => entry.multiplier === multiplier).map((entry) => entry.item),
  })).filter((group) => group.items.length > 0);
}

// ─────────────────────────────────────────────────────────────────────────
// DEFENSA — "tengo esto, ¿qué me mata?"
// ─────────────────────────────────────────────────────────────────────────

export interface DefensiveGroup {
  readonly multiplier: Multiplier;
  readonly types: readonly PokemonType[];
}

export interface DefensiveProfile {
  readonly typing: Typing;
  /** Grupos no vacíos, de ×4 a ×0. */
  readonly groups: readonly DefensiveGroup[];
  /** Multiplicador recibido de cada uno de los 18 tipos. */
  readonly byType: Readonly<Record<PokemonType, Multiplier>>;
  /**
   * El peor caso: el multiplicador más alto que recibe y qué tipos lo
   * alcanzan. `null` si no tiene ninguna debilidad (nada le pega >1).
   * Es lo que alimenta la insignia "RIESGO ÚNICO · ×4 Eléctrico".
   */
  readonly worst: { readonly multiplier: Multiplier; readonly types: readonly PokemonType[] } | null;
}

export function defensiveProfile(
  typing: Typing,
  chart: TypeChart = CHART_GEN6,
): DefensiveProfile {
  const byType = {} as Record<PokemonType, Multiplier>;
  const entries = POKEMON_TYPES.map((attacker) => {
    const multiplier = multiplierAgainst(attacker, typing, chart);
    byType[attacker] = multiplier;
    return { item: attacker, multiplier };
  });

  const groups = groupByMultiplier(entries).map(({ multiplier, items }) => ({
    multiplier,
    types: items,
  }));

  const worstGroup = groups.find((group) => group.multiplier > 1) ?? null;

  return {
    typing,
    groups,
    byType,
    worst: worstGroup ? { multiplier: worstGroup.multiplier, types: worstGroup.types } : null,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// ATAQUE — "me enfrento a esto, ¿con qué le pego?"
// ─────────────────────────────────────────────────────────────────────────

/**
 * Nivel 1: qué hace UN tipo atacante contra los 18 tipos simples.
 * Es la lectura rápida del mockup ("Agua ×2 → Fuego, Roca, Tierra").
 */
export interface AttackerSummary {
  readonly attacker: PokemonType;
  readonly superEffective: readonly PokemonType[];
  readonly resisted: readonly PokemonType[];
  readonly immune: readonly PokemonType[];
  readonly neutral: readonly PokemonType[];
}

export function attackerSummary(
  attacker: PokemonType,
  chart: TypeChart = CHART_GEN6,
): AttackerSummary {
  const superEffective: PokemonType[] = [];
  const resisted: PokemonType[] = [];
  const immune: PokemonType[] = [];
  const neutral: PokemonType[] = [];

  for (const defender of POKEMON_TYPES) {
    const value = chart[attacker][defender];
    if (value === 2) superEffective.push(defender);
    else if (value === 0.5) resisted.push(defender);
    else if (value === 0) immune.push(defender);
    else neutral.push(defender);
  }

  return { attacker, superEffective, resisted, immune, neutral };
}

/** Nivel 2: contra typings que existen de verdad en el juego. */
export interface OffensiveGroup {
  readonly multiplier: Multiplier;
  readonly typings: readonly ExistingTyping[];
}

export interface OffensiveProfile {
  readonly typing: Typing;
  /** Un resumen por cada tipo propio, en el orden del typing. */
  readonly perAttacker: readonly AttackerSummary[];
  /**
   * Contra cada typing real, el mejor multiplicador que consigue este
   * Pokémon con sus propios tipos, agrupado de ×4 a ×0.
   */
  readonly groups: readonly OffensiveGroup[];
  /** El tipo propio que pega ×2 a más tipos simples. */
  readonly bestAttacker: PokemonType | null;
  /**
   * Los muros: tipos que resisten o ignoran TODO lo que este Pokémon tiene.
   *
   * El corte está en `< 1`, no en `< 2`. Con `< 2` entrarían los quince
   * tipos que simplemente reciben daño neutro, que no son un problema —
   * les pegas de todas formas. El agujero real es el tipo contra el que no
   * tienes ni un ataque que entre limpio.
   */
  readonly uncoveredTypes: readonly PokemonType[];
}

export function offensiveProfile(
  typing: Typing,
  existingTypings: readonly ExistingTyping[],
  chart: TypeChart = CHART_GEN6,
): OffensiveProfile {
  const perAttacker = typing.map((attacker) => attackerSummary(attacker, chart));

  const groups = groupByMultiplier(
    existingTypings.map((existing) => ({
      item: existing,
      multiplier: bestMultiplier(typing, existing.types, chart),
    })),
  ).map(({ multiplier, items }) => ({ multiplier, typings: items }));

  const bestAttacker =
    perAttacker.reduce<AttackerSummary | null>(
      (best, current) =>
        best === null || current.superEffective.length > best.superEffective.length
          ? current
          : best,
      null,
    )?.attacker ?? null;

  const uncoveredTypes = POKEMON_TYPES.filter(
    (defender) => bestMultiplier(typing, [defender], chart) < 1,
  );

  return { typing, perAttacker, groups, bestAttacker, uncoveredTypes };
}

// ─────────────────────────────────────────────────────────────────────────
// VS — "mi X contra su Y, ¿quién gana el intercambio?"
// ─────────────────────────────────────────────────────────────────────────

export interface MatchupSide {
  readonly attacker: Typing;
  readonly defender: Typing;
  /** Mejor multiplicador que consigue el atacante con sus propios tipos. */
  readonly best: Multiplier;
  /** Qué tipos propios logran ese mejor multiplicador. */
  readonly bestTypes: readonly PokemonType[];
  /** Multiplicador de cada tipo propio, en el orden del typing. */
  readonly byOwnType: readonly { readonly type: PokemonType; readonly multiplier: Multiplier }[];
  /**
   * Tipos que NO son propios del atacante pero que aun así pegan ≥×2 al
   * defensor. Es el "cuidado: Roca (×2)" del mockup: el rival puede llevar
   * un movimiento de cobertura, y eso sigue siendo pura tabla de tipos.
   */
  readonly coverageThreats: readonly { readonly type: PokemonType; readonly multiplier: Multiplier }[];
}

export type MatchupVerdict =
  | 'muy-favorable'
  | 'favorable'
  | 'parejo'
  | 'desfavorable'
  | 'muy-desfavorable';

export interface Matchup {
  readonly a: Typing;
  readonly b: Typing;
  /** Lo que A le hace a B. */
  readonly aToB: MatchupSide;
  /** Lo que B le hace a A. */
  readonly bToA: MatchupSide;
  /** Veredicto desde el punto de vista de A. */
  readonly verdict: MatchupVerdict;
}

function matchupSide(attacker: Typing, defender: Typing, chart: TypeChart): MatchupSide {
  const byOwnType = attacker.map((type) => ({
    type,
    multiplier: multiplierAgainst(type, defender, chart),
  }));

  const best = byOwnType.reduce<Multiplier>(
    (max, entry) => (entry.multiplier > max ? entry.multiplier : max),
    0,
  );

  const own = new Set<PokemonType>(attacker);
  const coverageThreats = POKEMON_TYPES.filter((type) => !own.has(type))
    .map((type) => ({ type, multiplier: multiplierAgainst(type, defender, chart) }))
    .filter((entry) => entry.multiplier >= 2)
    .sort((x, y) => y.multiplier - x.multiplier);

  return {
    attacker,
    defender,
    best,
    bestTypes: byOwnType.filter((entry) => entry.multiplier === best).map((entry) => entry.type),
    byOwnType,
    coverageThreats,
  };
}

function verdictFor(yours: Multiplier, theirs: Multiplier): MatchupVerdict {
  if (yours === theirs) return 'parejo';
  // Un ×0 recibido es la mejor situación posible: ellos no te tocan.
  if (theirs === 0) return 'muy-favorable';
  if (yours === 0) return 'muy-desfavorable';

  const ratio = yours / theirs;
  if (ratio >= 4) return 'muy-favorable';
  if (ratio > 1) return 'favorable';
  if (ratio <= 0.25) return 'muy-desfavorable';
  return 'desfavorable';
}

export function matchup(a: Typing, b: Typing, chart: TypeChart = CHART_GEN6): Matchup {
  const aToB = matchupSide(a, b, chart);
  const bToA = matchupSide(b, a, chart);
  return { a, b, aToB, bToA, verdict: verdictFor(aToB.best, bToA.best) };
}

// ─────────────────────────────────────────────────────────────────────────
// EQUIPO — "tengo estos 6, ¿qué hueco tengo?"
// ─────────────────────────────────────────────────────────────────────────

export interface TeamThreatRow {
  readonly attacker: PokemonType;
  /** Multiplicador contra cada miembro, en el orden en que llegaron. */
  readonly cells: readonly Multiplier[];
  /** Miembros que reciben más de ×1. */
  readonly weakCount: number;
  /** Miembros que reciben ×4. */
  readonly quadCount: number;
  /** Miembros que resisten o son inmunes. */
  readonly resistCount: number;
}

export interface TeamOffenseRow {
  readonly defender: PokemonType;
  /** El mejor multiplicador que saca cada miembro, en el orden en que llegaron. */
  readonly cells: readonly Multiplier[];
  /** Miembros que le pegan súper efectivo. */
  readonly superCount: number;
  /** Miembros que le pegan ×4. */
  readonly quadCount: number;
  /** Miembros cuyo mejor golpe ni siquiera entra neutro. */
  readonly wallCount: number;
}

export interface TeamCoverage {
  readonly members: readonly Typing[];
  /** Los 18 tipos como fila, ordenados por amenaza descendente. */
  readonly rows: readonly TeamThreatRow[];
  /** La fila más peligrosa. `null` si el equipo está vacío. */
  readonly topThreat: TeamThreatRow | null;
  /** Filas a las que no cae nadie: el resto de la tabla, plegado. */
  readonly harmlessCount: number;
  /** Los 18 tipos como víctima, ordenados por hueco descendente. */
  readonly offense: readonly TeamOffenseRow[];
  /** Tipos simples a los que nadie del equipo pega ≥×2. */
  readonly offensiveGaps: readonly PokemonType[];
  /**
   * Typings reales que nadie del equipo golpea ≥×2, ordenados por cuántos
   * Pokémon los llevan: los huecos que más te vas a encontrar van primero.
   */
  readonly uncoveredTypings: readonly ExistingTyping[];
}

/**
 * Ordena las amenazas como las lee un jugador: primero por cuántos miembros
 * caen, luego por cuántos caen a ×4, luego por cuántos aguantan, y en último
 * término por el orden canónico para que el resultado sea estable.
 */
function compareThreat(x: TeamThreatRow, y: TeamThreatRow): number {
  if (x.weakCount !== y.weakCount) return y.weakCount - x.weakCount;
  if (x.quadCount !== y.quadCount) return y.quadCount - x.quadCount;
  if (x.resistCount !== y.resistCount) return x.resistCount - y.resistCount;
  return POKEMON_TYPES.indexOf(x.attacker) - POKEMON_TYPES.indexOf(y.attacker);
}

/**
 * Ordena la cobertura por el hueco que deja: primero los tipos a los que no
 * le pega nadie, luego aquellos a los que además el equipo ni roza, y en
 * último término el orden canónico para que el resultado sea estable.
 */
function compareCoverage(x: TeamOffenseRow, y: TeamOffenseRow): number {
  if (x.superCount !== y.superCount) return x.superCount - y.superCount;
  if (x.wallCount !== y.wallCount) return y.wallCount - x.wallCount;
  if (x.quadCount !== y.quadCount) return x.quadCount - y.quadCount;
  return POKEMON_TYPES.indexOf(x.defender) - POKEMON_TYPES.indexOf(y.defender);
}

export function teamCoverage(
  members: readonly Typing[],
  existingTypings: readonly ExistingTyping[] = [],
  chart: TypeChart = CHART_GEN6,
): TeamCoverage {
  const rows = POKEMON_TYPES.map((attacker) => {
    const cells = members.map((member) => multiplierAgainst(attacker, member, chart));
    return {
      attacker,
      cells,
      weakCount: cells.filter((cell) => cell > 1).length,
      quadCount: cells.filter((cell) => cell === 4).length,
      resistCount: cells.filter((cell) => cell < 1).length,
    };
  }).sort(compareThreat);

  /*
   * El espejo de `rows`: mismo cuadro, invertida la pregunta. Cada celda es
   * lo mejor que ese miembro consigue con sus propios tipos, que es el mismo
   * criterio con el que ya se calculan los huecos.
   */
  const offense = POKEMON_TYPES.map((defender) => {
    const cells = members.map((member) => bestMultiplier(member, [defender], chart));
    return {
      defender,
      cells,
      superCount: cells.filter((cell) => cell >= 2).length,
      quadCount: cells.filter((cell) => cell === 4).length,
      wallCount: cells.filter((cell) => cell < 1).length,
    };
  }).sort(compareCoverage);

  // El equipo ataca con la unión de los tipos de sus miembros.
  const teamTypes = [...new Set(members.flat())];

  const offensiveGaps = POKEMON_TYPES.filter(
    (defender) => bestMultiplier(teamTypes, [defender], chart) < 2,
  );

  const uncoveredTypings = existingTypings
    .filter((existing) => bestMultiplier(teamTypes, existing.types, chart) < 2)
    .toSorted((x, y) => y.count - x.count);

  const topThreat = rows[0] !== undefined && rows[0].weakCount > 0 ? rows[0] : null;

  return {
    members,
    rows,
    topThreat,
    harmlessCount: rows.filter((row) => row.weakCount === 0).length,
    offense,
    offensiveGaps,
    uncoveredTypings,
  };
}

/** Deriva la lista de typings existentes a partir de un conjunto de Pokémon. */
export function collectExistingTypings(
  pokemon: readonly { readonly types: Typing }[],
): ExistingTyping[] {
  const counts = new Map<string, { types: Typing; count: number }>();

  for (const entry of pokemon) {
    const key = typingKey(entry.types);
    const found = counts.get(key);
    if (found) found.count += 1;
    else counts.set(key, { types: entry.types, count: 1 });
  }

  return [...counts.entries()]
    .map(([slug, { types, count }]) => ({ slug, types, count }))
    .sort((x, y) => y.count - x.count);
}
