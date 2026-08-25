import { describe, expect, it } from 'vitest';

import { didYouMean, editDistance, normalize, parseTypingQuery, search } from '../search.ts';
import type { SearchEntry } from '../search.ts';

const INDEX: SearchEntry[] = [
  { slug: 'gyarados', nameEs: 'Gyarados', types: ['water', 'flying'] },
  { slug: 'girafarig', nameEs: 'Girafarig', types: ['normal', 'psychic'] },
  { slug: 'ninetales', nameEs: 'Ninetales', types: ['fire'] },
  { slug: 'ninetales-alola', nameEs: 'Ninetales (Alola)', types: ['ice', 'fairy'] },
  { slug: 'mr-mime', nameEs: 'Mr. Mime', types: ['psychic', 'fairy'] },
  { slug: 'nidoran-f', nameEs: 'Nidoran♀', types: ['poison'] },
  { slug: 'nidoran-m', nameEs: 'Nidoran♂', types: ['poison'] },
  { slug: 'farfetchd', nameEs: 'Farfetch’d', types: ['normal', 'flying'] },
  { slug: 'charizard', nameEs: 'Charizard', types: ['fire', 'flying'] },
];

function firstSlug(query: string): string | undefined {
  const result = search(query, INDEX)[0];
  return result?.kind === 'pokemon' ? result.entry.slug : undefined;
}

describe('normalize', () => {
  it('quita tildes, mayúsculas y puntuación', () => {
    expect(normalize('Ninetales')).toBe('ninetales');
    expect(normalize('Mr. Mime')).toBe('mrmime');
    expect(normalize('Farfetch’d')).toBe('farfetchd');
    expect(normalize('Eléctrico')).toBe('electrico');
    expect(normalize('Psíquico')).toBe('psiquico');
  });

  it('convierte los símbolos de género en letras buscables', () => {
    expect(normalize('Nidoran♀')).toBe('nidoranf');
    expect(normalize('Nidoran♂')).toBe('nidoranm');
  });
});

describe('editDistance', () => {
  it('mide lo que tiene que medir', () => {
    expect(editDistance('gyarados', 'gyarados', 2)).toBe(0);
    expect(editDistance('gyarado', 'gyarados', 2)).toBe(1);
    expect(editDistance('giarados', 'gyarados', 2)).toBe(1);
  });

  it('corta pronto cuando la distancia se pasa del máximo', () => {
    expect(editDistance('pikachu', 'gyarados', 2)).toBeGreaterThan(2);
    expect(editDistance('ab', 'abcdefgh', 2)).toBeGreaterThan(2);
  });
});

describe('search por nombre', () => {
  it('encuentra los casos que pide el brief', () => {
    expect(firstSlug('nidoran♀')).toBe('nidoran-f');
    expect(firstSlug('Ninetales')).toBe('ninetales');
    expect(firstSlug('mr. mime')).toBe('mr-mime');
  });

  it('el nombre exacto gana al que solo lo contiene', () => {
    // "Ninetales (Alola)" contiene "ninetales", pero el exacto va primero.
    expect(firstSlug('ninetales')).toBe('ninetales');
  });

  it('tolera erratas — el caso "guiaraos" del diseño', () => {
    // Tres ediciones de distancia. Es el ejemplo que el mockup usa para el
    // estado de sugerencia, así que tiene que resolverlo.
    expect(firstSlug('guiaraos')).toBe('gyarados');
    expect(firstSlug('gyarodos')).toBe('gyarados');
  });

  it('no inventa resultados para cadenas sin parecido', () => {
    expect(search('qwertyuiop', INDEX).filter((result) => result.kind === 'pokemon')).toHaveLength(
      0,
    );
  });

  it('no tolera erratas en consultas muy cortas', () => {
    // Con 3 letras, corregir sería adivinar.
    expect(search('xyz', INDEX)).toHaveLength(0);
  });

  it('respeta el límite', () => {
    expect(search('a', INDEX, { limit: 2 }).length).toBeLessThanOrEqual(3);
  });
});

describe('parseTypingQuery', () => {
  it('acepta un tipo suelto en español y en inglés', () => {
    expect(parseTypingQuery('agua')?.typing).toEqual(['water']);
    expect(parseTypingQuery('water')?.typing).toEqual(['water']);
    expect(parseTypingQuery('eléctrico')?.typing).toEqual(['electric']);
  });

  it('acepta dos tipos con varios separadores', () => {
    for (const query of ['agua volador', 'agua/volador', 'agua-volador', 'agua, volador']) {
      expect(parseTypingQuery(query)?.typing).toEqual(['water', 'flying']);
    }
  });

  it('normaliza el orden al canónico', () => {
    expect(parseTypingQuery('volador agua')?.typing).toEqual(['water', 'flying']);
  });

  it('rechaza el mismo tipo repetido', () => {
    expect(parseTypingQuery('agua agua')).toBeNull();
  });

  it('rechaza lo que no son tipos', () => {
    expect(parseTypingQuery('gyarados')).toBeNull();
    expect(parseTypingQuery('agua gyarados')).toBeNull();
    expect(parseTypingQuery('agua volador fuego')).toBeNull();
  });
});

describe('search mezclando tipos y Pokémon', () => {
  it('una consulta de tipos devuelve el typing', () => {
    const results = search('agua volador', INDEX);
    expect(results[0]).toEqual({ kind: 'typing', typing: ['water', 'flying'], score: 1000 });
  });

  it('una consulta de nombre no devuelve typings', () => {
    expect(search('gyarados', INDEX).some((result) => result.kind === 'typing')).toBe(false);
  });
});

describe('didYouMean', () => {
  it('propone la corrección cuando no fue exacto', () => {
    expect(didYouMean('gyarodos', search('gyarodos', INDEX))).toBe('Gyarados');
  });

  it('calla cuando el nombre ya era exacto', () => {
    expect(didYouMean('gyarados', search('gyarados', INDEX))).toBeNull();
    expect(didYouMean('Nidoran♀', search('Nidoran♀', INDEX))).toBeNull();
  });
});
