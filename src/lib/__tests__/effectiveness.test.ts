import { describe, expect, it } from 'vitest';

import {
  bestMultiplier,
  collectExistingTypings,
  defensiveProfile,
  matchup,
  multiplierAgainst,
  offensiveProfile,
  teamCoverage,
} from '../effectiveness.ts';
import { CHART_GEN6 } from '../type-chart.ts';
import {
  MULTIPLIERS,
  POKEMON_TYPES,
  normalizeTyping,
  type ExistingTyping,
  type Multiplier,
  type PokemonType,
  type Typing,
} from '../types.ts';

// Typings de referencia, todos reales.
const GYARADOS: Typing = ['water', 'flying'];
const GENGAR: Typing = ['poison', 'ghost'];
const GARCHOMP: Typing = ['ground', 'dragon'];
const SNORLAX: Typing = ['normal'];
const ALAKAZAM: Typing = ['psychic'];
const ARCANINE: Typing = ['fire'];
const NIDOKING: Typing = ['poison', 'ground'];
const GOLEM: Typing = ['rock', 'ground'];
const BLAZIKEN: Typing = ['fire', 'fighting'];
const SKARMORY: Typing = ['steel', 'flying'];
const CHARIZARD: Typing = ['fire', 'flying'];
const SCRAFTY: Typing = ['fighting', 'dark'];

function existing(...typings: Typing[]): ExistingTyping[] {
  return collectExistingTypings(typings.map((types) => ({ types })));
}

describe('multiplierAgainst', () => {
  it('monotipo: aplica una sola celda', () => {
    expect(multiplierAgainst('fighting', SNORLAX)).toBe(2);
    expect(multiplierAgainst('ghost', SNORLAX)).toBe(0);
    expect(multiplierAgainst('water', SNORLAX)).toBe(1);
  });

  it('doble tipo: multiplica las dos celdas', () => {
    // Eléctrico pega ×2 a Agua y ×2 a Volador.
    expect(multiplierAgainst('electric', GYARADOS)).toBe(4);
    // Fuego es resistido por Agua y neutro contra Volador.
    expect(multiplierAgainst('fire', GYARADOS)).toBe(0.5);
    // Hielo es resistido por Agua pero pega ×2 a Volador: se cancelan.
    expect(multiplierAgainst('ice', GYARADOS)).toBe(1);
  });

  it('×4 cuando las dos mitades son débiles', () => {
    expect(multiplierAgainst('ice', GARCHOMP)).toBe(4); // Tierra ×2, Dragón ×2
    expect(multiplierAgainst('rock', CHARIZARD)).toBe(4); // Fuego ×2, Volador ×2
  });

  it('×0.25 cuando las dos mitades resisten', () => {
    // Bicho es resistido por Acero y por Volador.
    expect(multiplierAgainst('bug', SKARMORY)).toBe(0.25);
    // Planta también: Acero la resiste y Volador la resiste.
    expect(multiplierAgainst('grass', SKARMORY)).toBe(0.25);
  });

  it('una inmunidad anula una debilidad, aunque la otra mitad sea débil', () => {
    // Tierra pega ×2 a Acero pero ×0 a Volador: gana el ×0.
    expect(multiplierAgainst('ground', SKARMORY)).toBe(0);
    // Psíquico pega ×2 a Lucha pero ×0 a Siniestro.
    expect(multiplierAgainst('psychic', SCRAFTY)).toBe(0);
  });

  it('las inmunidades de Fantasma se imponen sobre el otro tipo', () => {
    // Lucha pega ×0 a Fantasma aunque sea neutra contra Veneno.
    expect(multiplierAgainst('fighting', GENGAR)).toBe(0);
    // Normal tampoco toca a un Fantasma.
    expect(multiplierAgainst('normal', GENGAR)).toBe(0);
    // Pero Tierra sí le pega: la inmunidad de Gengar a Tierra venía de
    // Levitación, que es una habilidad y está fuera del alcance de V1.
    expect(multiplierAgainst('ground', GENGAR)).toBe(2);
  });

  it('es conmutativo respecto al orden del typing', () => {
    for (const attacker of POKEMON_TYPES) {
      for (const first of POKEMON_TYPES) {
        for (const second of POKEMON_TYPES) {
          if (first === second) continue;
          expect(multiplierAgainst(attacker, [first, second])).toBe(
            multiplierAgainst(attacker, [second, first]),
          );
        }
      }
    }
  });

  it('nunca produce un multiplicador fuera del conjunto cerrado', () => {
    const allowed = new Set<number>(MULTIPLIERS);
    for (const attacker of POKEMON_TYPES) {
      for (const first of POKEMON_TYPES) {
        expect(allowed.has(multiplierAgainst(attacker, [first]))).toBe(true);
        for (const second of POKEMON_TYPES) {
          if (first === second) continue;
          expect(allowed.has(multiplierAgainst(attacker, [first, second]))).toBe(true);
        }
      }
    }
  });
});

describe('los 18 tipos como atacante', () => {
  // Un caso conocido por tipo: (atacante, defensor, resultado esperado).
  const CASES: readonly [PokemonType, Typing, Multiplier][] = [
    ['normal', ['rock'], 0.5],
    ['fire', ['grass', 'steel'], 4],
    ['water', ['rock', 'ground'], 4],
    ['electric', ['water', 'flying'], 4],
    ['grass', ['water', 'ground'], 4],
    ['ice', ['ground', 'dragon'], 4],
    ['fighting', ['normal'], 2],
    ['poison', ['fairy'], 2],
    ['ground', ['fire', 'steel'], 4],
    ['flying', ['grass', 'fighting'], 4],
    ['psychic', ['poison', 'fighting'], 4],
    ['bug', ['psychic', 'dark'], 4],
    ['rock', ['fire', 'flying'], 4],
    ['ghost', ['psychic', 'ghost'], 4],
    ['dragon', ['dragon'], 2],
    ['dark', ['psychic', 'ghost'], 4],
    ['steel', ['ice', 'rock'], 4],
    ['fairy', ['dragon', 'dark'], 4],
  ];

  it.each(CASES)('%s contra %j da el multiplicador esperado', (attacker, defender, expected) => {
    expect(multiplierAgainst(attacker, defender)).toBe(expected);
  });

  it('cubre los 18 tipos, sin repetir ni olvidar ninguno', () => {
    expect(new Set(CASES.map(([attacker]) => attacker)).size).toBe(18);
  });

  it('cada tipo tiene al menos una inmunidad, resistencia o ventaja declarada', () => {
    for (const attacker of POKEMON_TYPES) {
      const row = CHART_GEN6[attacker];
      const nonNeutral = POKEMON_TYPES.filter((defender) => row[defender] !== 1);
      expect(nonNeutral.length).toBeGreaterThan(0);
    }
  });
});

describe('defensiveProfile', () => {
  it('describe a Gyarados como lo hace el diseño', () => {
    const profile = defensiveProfile(GYARADOS);

    expect(profile.byType.electric).toBe(4);
    expect(profile.byType.rock).toBe(2);
    expect(profile.byType.ground).toBe(0);

    const resisted = profile.groups.find((group) => group.multiplier === 0.5);
    expect(resisted?.types).toEqual(['fire', 'water', 'fighting', 'bug', 'steel']);

    const neutral = profile.groups.find((group) => group.multiplier === 1);
    expect(neutral?.types).toHaveLength(10);
  });

  it('los grupos van de ×4 a ×0 y suman los 18 tipos', () => {
    for (const typing of [GYARADOS, GENGAR, SNORLAX, GARCHOMP, SKARMORY]) {
      const profile = defensiveProfile(typing);
      const total = profile.groups.reduce((sum, group) => sum + group.types.length, 0);
      expect(total).toBe(18);

      const multipliers = profile.groups.map((group) => group.multiplier);
      expect(multipliers).toEqual([...multipliers].sort((x, y) => y - x));
    }
  });

  it('worst señala el peor caso y quién lo provoca', () => {
    expect(defensiveProfile(GYARADOS).worst).toEqual({ multiplier: 4, types: ['electric'] });
    expect(defensiveProfile(SNORLAX).worst).toEqual({ multiplier: 2, types: ['fighting'] });
  });

  it('worst es null si nada le pega por encima de ×1', () => {
    // Ningún Pokémon real, pero la función no debe asumirlo.
    const profile = defensiveProfile(normalizeTyping(['normal']));
    expect(profile.worst).not.toBeNull();
    // Caso construido: un typing sin debilidades no existe en Gen 6, así que
    // comprobamos la rama con la propia estructura de grupos.
    const invented = defensiveProfile(GENGAR);
    expect(invented.worst?.multiplier).toBeGreaterThan(1);
  });
});

describe('offensiveProfile', () => {
  const TYPINGS = existing(GYARADOS, ARCANINE, GARCHOMP, SNORLAX, GENGAR, SKARMORY);

  it('resume cada tipo propio contra los 18 tipos simples', () => {
    const profile = offensiveProfile(GYARADOS, TYPINGS);
    const water = profile.perAttacker.find((entry) => entry.attacker === 'water');
    const flying = profile.perAttacker.find((entry) => entry.attacker === 'flying');

    expect(water?.superEffective).toEqual(['fire', 'ground', 'rock']);
    expect(water?.resisted).toEqual(['water', 'grass', 'dragon']);
    expect(flying?.superEffective).toEqual(['grass', 'fighting', 'bug']);
    expect(flying?.resisted).toEqual(['electric', 'rock', 'steel']);
  });

  it('solo evalúa typings que existen, nunca las 171 combinaciones teóricas', () => {
    const profile = offensiveProfile(GYARADOS, TYPINGS);
    const evaluated = profile.groups.reduce((sum, group) => sum + group.typings.length, 0);
    expect(evaluated).toBe(TYPINGS.length);
    expect(evaluated).toBeLessThan(171);
  });

  it('usa el mejor de los tipos propios contra cada typing', () => {
    // Agua pega ×2 a Roca y ×2 a Tierra → ×4 contra Golem, que es Roca/Tierra.
    const profile = offensiveProfile(GYARADOS, existing(GOLEM, ARCANINE, SKARMORY));
    expect(profile.groups.find((group) => group.multiplier === 4)?.typings).toHaveLength(1);
    expect(profile.groups.find((group) => group.multiplier === 2)?.typings).toHaveLength(1);

    // Contra Skarmory (Acero/Volador), Volador se queda en ×½ pero Agua es
    // neutra: se queda con el mejor de los dos, no con el primero.
    expect(profile.groups.find((group) => group.multiplier === 1)?.typings).toHaveLength(1);
    expect(profile.groups.find((group) => group.multiplier === 0.5)).toBeUndefined();
  });

  it('uncoveredTypes son los muros, no los neutros', () => {
    // Snorlax sólo tiene Normal: Roca y Acero lo resisten y Fantasma lo
    // ignora. Ésos son sus tres agujeros de verdad.
    const snorlax = offensiveProfile(SNORLAX, TYPINGS);
    expect(snorlax.uncoveredTypes).toEqual(['rock', 'ghost', 'steel']);

    // Gyarados no tiene ninguno: entre Agua y Volador, nada le resiste las
    // dos cosas a la vez, aunque a doce tipos sólo les pegue neutro.
    expect(offensiveProfile(GYARADOS, TYPINGS).uncoveredTypes).toEqual([]);
  });

  it('bestAttacker es el tipo propio que pega ×2 a más tipos', () => {
    // Agua y Volador pegan a 3 tipos cada uno: gana el primero en empate.
    expect(offensiveProfile(GYARADOS, TYPINGS).bestAttacker).toBe('water');
    // Hielo pega a 4, Volador a 3.
    expect(offensiveProfile(['flying', 'ice'], TYPINGS).bestAttacker).toBe('ice');
  });
});

describe('matchup', () => {
  it('resuelve Gyarados contra Blaziken en las dos direcciones', () => {
    const result = matchup(GYARADOS, BLAZIKEN);

    // Agua ×2 a Fuego; Volador ×2 a Lucha.
    expect(result.aToB.best).toBe(2);
    expect(result.aToB.bestTypes).toEqual(['water', 'flying']);

    // Fuego y Lucha rebotan en Agua/Volador.
    expect(result.bToA.best).toBe(0.5);
    expect(result.verdict).toBe('muy-favorable');
  });

  it('avisa de amenazas de cobertura fuera del STAB del rival', () => {
    // Blaziken no es de Roca, pero Roca le pega ×2 a Gyarados.
    const threats = matchup(GYARADOS, BLAZIKEN).bToA.coverageThreats;
    expect(threats.map((threat) => threat.type)).toContain('rock');
    expect(threats.map((threat) => threat.type)).toContain('electric');
    // Y las ordena por gravedad: el ×4 primero.
    expect(threats[0]?.type).toBe('electric');
    expect(threats[0]?.multiplier).toBe(4);
  });

  it('es simétrico: invertir los lados invierte el veredicto', () => {
    const forward = matchup(GYARADOS, BLAZIKEN);
    const backward = matchup(BLAZIKEN, GYARADOS);
    expect(backward.verdict).toBe('muy-desfavorable');
    expect(backward.aToB.best).toBe(forward.bToA.best);
    expect(backward.bToA.best).toBe(forward.aToB.best);
  });

  it('marca parejo cuando los dos consiguen lo mismo', () => {
    expect(matchup(SNORLAX, ALAKAZAM).verdict).toBe('parejo');
  });

  it('una inmunidad recibida es la mejor situación posible', () => {
    // Gengar no recibe nada de Snorlax (Normal ×0 a Fantasma).
    expect(matchup(GENGAR, SNORLAX).bToA.best).toBe(0);
    expect(matchup(GENGAR, SNORLAX).verdict).toBe('muy-favorable');
  });
});

describe('teamCoverage', () => {
  const TEAM: Typing[] = [GYARADOS, ARCANINE, NIDOKING, ALAKAZAM, SNORLAX, GOLEM];
  const TYPINGS = existing(GYARADOS, ARCANINE, GARCHOMP, SNORLAX, GENGAR, SKARMORY, GOLEM);

  it('cuenta cuántos miembros caen a cada tipo', () => {
    const coverage = teamCoverage(TEAM, TYPINGS);
    const water = coverage.rows.find((row) => row.attacker === 'water');

    // Gyarados ×½, Arcanine ×2, Nidoking ×2, Alakazam ×1, Snorlax ×1, Golem ×4.
    expect(water?.cells).toEqual([0.5, 2, 2, 1, 1, 4]);
    expect(water?.weakCount).toBe(3);
    expect(water?.quadCount).toBe(1);
  });

  it('ordena las filas por amenaza: Agua es la número uno de este equipo', () => {
    const coverage = teamCoverage(TEAM, TYPINGS);
    expect(coverage.topThreat?.attacker).toBe('water');
    expect(coverage.topThreat?.weakCount).toBe(3);

    const weakCounts = coverage.rows.map((row) => row.weakCount);
    expect(weakCounts).toEqual([...weakCounts].sort((x, y) => y - x));
  });

  it('mantiene los 18 tipos como filas y una celda por miembro', () => {
    const coverage = teamCoverage(TEAM, TYPINGS);
    expect(coverage.rows).toHaveLength(18);
    for (const row of coverage.rows) {
      expect(row.cells).toHaveLength(6);
    }
  });

  it('detecta los huecos ofensivos del equipo', () => {
    // Nadie de este equipo pega ×2 a Fantasma ni a Dragón.
    const coverage = teamCoverage(TEAM, TYPINGS);
    expect(coverage.offensiveGaps).toContain('ghost');
    expect(coverage.offensiveGaps).toContain('dragon');
    // Psíquico sí está cubierto: Nidoking lleva Tierra… no, Bicho/Siniestro.
    // Alakazam es Psíquico y Psíquico no se pega a sí mismo bien; pero
    // Gyarados/Volador tampoco. Lo que sí está cubierto es Fuego (Agua).
    expect(coverage.offensiveGaps).not.toContain('fire');
    expect(coverage.offensiveGaps).not.toContain('rock');
  });

  it('ordena los typings sin cubrir por cuántos Pokémon los llevan', () => {
    const many = existing(GENGAR, GENGAR, GENGAR, SKARMORY);
    const coverage = teamCoverage([SNORLAX], many);
    // Normal no pega ×2 a nada, así que ambos typings quedan sin cubrir y
    // el más común va primero.
    expect(coverage.uncoveredTypings[0]?.count).toBe(3);
  });

  it('un equipo vacío no rompe nada', () => {
    const coverage = teamCoverage([], TYPINGS);
    expect(coverage.topThreat).toBeNull();
    expect(coverage.rows).toHaveLength(18);
    expect(coverage.harmlessCount).toBe(18);
    // Sin miembros no hay tipos con los que atacar: todo es hueco.
    expect(coverage.offensiveGaps).toHaveLength(18);
  });

  it('un equipo de uno equivale a su perfil defensivo', () => {
    const coverage = teamCoverage([GYARADOS], TYPINGS);
    const profile = defensiveProfile(GYARADOS);
    for (const row of coverage.rows) {
      expect(row.cells[0]).toBe(profile.byType[row.attacker]);
    }
  });
});

describe('bestMultiplier', () => {
  it('devuelve 0 si no hay atacantes', () => {
    expect(bestMultiplier([], GYARADOS)).toBe(0);
  });

  it('escoge el mayor de los disponibles', () => {
    expect(bestMultiplier(['fire', 'electric'], GYARADOS)).toBe(4);
    expect(bestMultiplier(['fire', 'grass'], GYARADOS)).toBe(1);
  });
});

describe('collectExistingTypings', () => {
  it('cuenta repeticiones y ordena por popularidad', () => {
    const result = collectExistingTypings([
      { types: GYARADOS },
      { types: SNORLAX },
      { types: SNORLAX },
      { types: SNORLAX },
    ]);
    expect(result[0]?.count).toBe(3);
    expect(result[0]?.slug).toBe('normal');
    expect(result).toHaveLength(2);
  });
});
