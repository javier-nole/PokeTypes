/**
 * Genera `src/data/pokemon.json` y `src/data/typings.json` desde PokéAPI.
 *
 * Se ejecuta a mano, no en CI: `npm run build:data`. El resultado se
 * commitea y la app nunca vuelve a llamar a PokéAPI.
 *
 *   node scripts/build-data.ts            → build normal (usa .cache/)
 *   node scripts/build-data.ts --no-cache → ignora la caché
 *
 * Requiere Node 22.6+ por el stripping nativo de TypeScript.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectExistingTypings } from '../src/lib/effectiveness.ts';
import { toPokemonType } from '../src/lib/i18n.ts';
import { normalizeTyping, type Pokemon, type PokemonType } from '../src/lib/types.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE_DIR = join(ROOT, '.cache');
const DATA_DIR = join(ROOT, 'src/data');
const PUBLIC_DIR = join(ROOT, 'public');
const API = 'https://pokeapi.co/api/v2';

const USE_CACHE = !process.argv.includes('--no-cache');
const CONCURRENCY = 16;

// ─────────────────────────────────────────────────────────────────────────
// Reglas de inclusión — ver PLAN.md §1.2
// ─────────────────────────────────────────────────────────────────────────

/**
 * Formas que no entran nunca. Gigamax y Totem no cambian typing: sólo
 * inflarían el índice de búsqueda con duplicados.
 */
const EXCLUDED_SUFFIXES = [
  '-gmax',
  '-totem',
  '-cap',
  '-cosplay',
  '-starter',
  '-own-tempo',
  '-eternamax',
  '-busted',
  '-battle-bond',
];

/**
 * Etiqueta legible para las formas que sí entran. Lo que no esté aquí cae
 * en el fallback: se pregunta a `/pokemon-form` por su nombre en español.
 */
const FORM_LABELS: Readonly<Record<string, string>> = {
  alola: 'Alola',
  galar: 'Galar',
  hisui: 'Hisui',
  paldea: 'Paldea',
  mega: 'Mega',
  'mega-x': 'Mega X',
  'mega-y': 'Mega Y',
  primal: 'Primigenio',
};

/** Formas regionales: entran aunque no cambien de tipo, porque se buscan por nombre. */
const REGIONAL = ['alola', 'galar', 'hisui', 'paldea'];

/**
 * Megas y Primigenias entran siempre, cambien o no de tipo. Filtrarlas por
 * cambio de typing dejaría fuera a Mega-Venusaur y quien la buscara no
 * encontraría nada, que es peor que una entrada redundante.
 */
const ALWAYS = ['mega', 'primal'];

// ─────────────────────────────────────────────────────────────────────────
// Utilidades de red
// ─────────────────────────────────────────────────────────────────────────

let fetched = 0;
let cacheHits = 0;

function cachePath(url: string): string {
  return join(CACHE_DIR, `${createHash('sha1').update(url).digest('hex')}.json`);
}

async function getJson<T>(url: string): Promise<T> {
  const path = cachePath(url);

  if (USE_CACHE) {
    try {
      const cached = await readFile(path, 'utf8');
      cacheHits += 1;
      return JSON.parse(cached) as T;
    } catch {
      // No estaba en caché; se pide.
    }
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(url);
    if (response.ok) {
      const text = await response.text();
      await writeFile(path, text, 'utf8');
      fetched += 1;
      if (fetched % 100 === 0) process.stdout.write(`  ${fetched} peticiones…\n`);
      return JSON.parse(text) as T;
    }
    if (response.status === 404) throw new Error(`404: ${url}`);
    // 429 o 5xx: espera creciente y reintenta.
    await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
  }

  throw new Error(`No se pudo descargar tras 4 intentos: ${url}`);
}

/** Ejecuta `worker` sobre cada elemento con un tope de tareas en vuelo. */
async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function run(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      const item = items[index];
      if (item === undefined) continue;
      results[index] = await worker(item, index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

// ─────────────────────────────────────────────────────────────────────────
// Formas de PokéAPI que nos interesan
// ─────────────────────────────────────────────────────────────────────────

interface ApiNamed {
  readonly name: string;
  readonly url: string;
}

interface ApiSpeciesList {
  readonly count: number;
  readonly results: readonly ApiNamed[];
}

interface ApiSpecies {
  readonly id: number;
  readonly name: string;
  readonly names: readonly { readonly name: string; readonly language: ApiNamed }[];
  readonly generation: ApiNamed;
  readonly varieties: readonly { readonly is_default: boolean; readonly pokemon: ApiNamed }[];
}

interface ApiPokemon {
  readonly id: number;
  readonly name: string;
  readonly types: readonly { readonly slot: number; readonly type: ApiNamed }[];
  readonly sprites: { readonly front_default: string | null };
}

interface ApiForm {
  readonly form_names: readonly { readonly name: string; readonly language: ApiNamed }[];
  readonly names: readonly { readonly name: string; readonly language: ApiNamed }[];
}

const GENERATIONS: Readonly<Record<string, number>> = {
  'generation-i': 1,
  'generation-ii': 2,
  'generation-iii': 3,
  'generation-iv': 4,
  'generation-v': 5,
  'generation-vi': 6,
  'generation-vii': 7,
  'generation-viii': 8,
  'generation-ix': 9,
};

function localized(
  entries: readonly { readonly name: string; readonly language: ApiNamed }[],
  language: string,
): string | null {
  return entries.find((entry) => entry.language.name === language)?.name ?? null;
}

function typesOf(pokemon: ApiPokemon): PokemonType[] {
  return [...pokemon.types]
    .sort((a, b) => a.slot - b.slot)
    .map((entry) => toPokemonType(entry.type.name));
}

/** El sufijo que distingue a una forma: "ninetales-alola" → "alola". */
function formSuffix(varietyName: string, speciesName: string): string {
  return varietyName.startsWith(`${speciesName}-`)
    ? varietyName.slice(speciesName.length + 1)
    : '';
}

function titleCase(value: string): string {
  return value
    .split('-')
    .map((word) => (word.length > 0 ? word[0]?.toUpperCase() + word.slice(1) : word))
    .join(' ');
}

/** La región de una forma regional, si lo es: "galar-standard" → "galar". */
function regionOf(suffix: string): string | null {
  return REGIONAL.find((region) => suffix === region || suffix.startsWith(`${region}-`)) ?? null;
}

async function formLabel(
  varietyName: string,
  suffix: string,
  speciesNameEs: string,
): Promise<string> {
  const known = FORM_LABELS[suffix];
  if (known !== undefined) return known;

  // Regionales: "galar-standard" → "Galar", "galar-zen" → "Galar Zen".
  const region = regionOf(suffix);
  if (region !== null) {
    const label = FORM_LABELS[region] ?? titleCase(region);
    const rest = suffix.slice(region.length).replace(/^-/, '');
    return rest === '' || rest === 'standard' ? label : `${label} ${titleCase(rest)}`;
  }

  // Fallback: el nombre de forma en español, si PokéAPI lo tiene.
  try {
    const form = await getJson<ApiForm>(`${API}/pokemon-form/${varietyName}`);
    const spanish = localized(form.form_names, 'es') ?? localized(form.names, 'es');
    if (spanish !== null && spanish.length > 0) {
      // PokéAPI repite la especie en el nombre de forma ("Rotom Calor").
      // Como ya va entre paréntesis detrás del nombre, sobra.
      const prefix = `${speciesNameEs.toLowerCase()} `;
      return spanish.toLowerCase().startsWith(prefix) ? spanish.slice(prefix.length) : spanish;
    }
  } catch {
    // Sin forma en la API: se usa el sufijo tal cual.
  }

  return titleCase(suffix);
}

// ─────────────────────────────────────────────────────────────────────────
// Construcción
// ─────────────────────────────────────────────────────────────────────────

async function buildSpecies(entry: ApiNamed): Promise<Pokemon[]> {
  const species = await getJson<ApiSpecies>(entry.url);

  const nameEs = localized(species.names, 'es');
  const nameEn = localized(species.names, 'en') ?? titleCase(species.name);
  if (nameEs === null) {
    throw new Error(
      `"${species.name}" no tiene nombre en español en PokéAPI. ` +
        `Añádelo a un mapa de overrides antes de continuar.`,
    );
  }

  const generation = GENERATIONS[species.generation.name];
  if (generation === undefined) {
    throw new Error(`Generación desconocida: ${species.generation.name}`);
  }

  const defaultVariety = species.varieties.find((variety) => variety.is_default);
  if (defaultVariety === undefined) {
    throw new Error(`"${species.name}" no tiene variedad por defecto.`);
  }

  const defaultPokemon = await getJson<ApiPokemon>(`${API}/pokemon/${defaultVariety.pokemon.name}`);
  const defaultTypes = typesOf(defaultPokemon);

  const output: Pokemon[] = [
    {
      id: defaultPokemon.id,
      slug: defaultPokemon.name,
      nameEs,
      nameEn,
      types: normalizeTyping(defaultTypes),
      generation,
      sprite: defaultPokemon.sprites.front_default ?? '',
    },
  ];

  for (const variety of species.varieties) {
    if (variety.is_default) continue;

    const varietyName = variety.pokemon.name;
    if (EXCLUDED_SUFFIXES.some((suffix) => varietyName.endsWith(suffix))) continue;

    const suffix = formSuffix(varietyName, species.name);
    if (suffix === '') continue;

    const pokemon = await getJson<ApiPokemon>(`${API}/pokemon/${varietyName}`);
    const types = typesOf(pokemon);

    const isRegional = regionOf(suffix) !== null;
    const isAlways = ALWAYS.some((form) => suffix === form || suffix.startsWith(`${form}-`));
    const changesTyping = types.join('/') !== defaultTypes.join('/');
    if (!isRegional && !isAlways && !changesTyping) continue;

    output.push({
      id: pokemon.id,
      slug: pokemon.name,
      nameEs: `${nameEs} (${await formLabel(varietyName, suffix, nameEs)})`,
      nameEn: `${nameEn} (${titleCase(suffix)})`,
      types: normalizeTyping(types),
      generation,
      sprite: pokemon.sprites.front_default ?? '',
    });
  }

  return output;
}

async function main(): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
  await mkdir(DATA_DIR, { recursive: true });

  console.log('Listando especies…');
  const list = await getJson<ApiSpeciesList>(`${API}/pokemon-species?limit=100000`);
  console.log(`  ${list.count} especies.`);

  console.log(`Descargando (concurrencia ${CONCURRENCY}, caché ${USE_CACHE ? 'on' : 'off'})…`);
  const batches = await mapLimit(list.results, CONCURRENCY, buildSpecies);

  const pokemon = batches
    .flat()
    .sort((a, b) => a.id - b.id || a.slug.localeCompare(b.slug));

  const slugs = new Set<string>();
  for (const entry of pokemon) {
    if (slugs.has(entry.slug)) throw new Error(`Slug duplicado: ${entry.slug}`);
    slugs.add(entry.slug);
  }

  const typings = collectExistingTypings(pokemon);

  await writeFile(join(DATA_DIR, 'pokemon.json'), `${JSON.stringify(pokemon)}\n`, 'utf8');
  await writeFile(join(DATA_DIR, 'typings.json'), `${JSON.stringify(typings, null, 2)}\n`, 'utf8');

  /*
   * Índice de búsqueda aparte, en `public/`: se descarga con fetch al primer
   * foco del input en vez de entrar en el bundle de JS. Sin sprites y sin
   * repetir el nombre inglés cuando coincide con el español — la mitad de
   * los Pokémon se llaman igual en los dos idiomas.
   */
  const index = pokemon.map((entry) => ({
    slug: entry.slug,
    nameEs: entry.nameEs,
    ...(entry.nameEn === entry.nameEs ? {} : { nameEn: entry.nameEn }),
    types: entry.types,
    // `spriteId` sólo cuando hay sprite: su ausencia es lo que le dice a la
    // UI que dibuje el hueco en vez de una imagen rota.
    ...(entry.sprite === '' ? {} : { spriteId: entry.id }),
  }));
  await mkdir(PUBLIC_DIR, { recursive: true });
  await writeFile(join(PUBLIC_DIR, 'search-index.json'), `${JSON.stringify(index)}\n`, 'utf8');

  const forms = pokemon.filter((entry) => entry.nameEs.includes('('));
  console.log(
    [
      '',
      `Listo. ${pokemon.length} Pokémon (${pokemon.length - forms.length} base + ${forms.length} formas).`,
      `${typings.length} typings existentes de las 171 teóricas.`,
      `Peticiones: ${fetched} nuevas, ${cacheHits} desde caché.`,
    ].join('\n'),
  );
}

await main();
