/**
 * Títulos, descripciones y JSON-LD. Cadenas puras: esto no sabe qué es
 * Next, sólo construye texto en español.
 *
 * Regla del proyecto: el título lleva la PREGUNTA REAL del usuario, no el
 * nombre pelado. Y la descripción ya contiene la respuesta — es lo que gana
 * el click en la SERP.
 */

import { typeName, typingName } from './i18n.ts';
import type { DefensiveProfile } from './effectiveness.ts';
import type { Multiplier, PokemonType, Typing } from './types.ts';

export const SITE_NAME = 'Efectividades';

/**
 * Dominio del sitio. De aquí salen las URLs canónicas, el sitemap y el
 * JSON-LD, así que si es incorrecto el SEO se despliega roto en silencio.
 *
 * Se resuelve en build, por orden:
 *   1. `NEXT_PUBLIC_SITE_URL` — ponla en el panel del hosting o en `.env`.
 *   2. El dominio de producción que inyecta Vercel automáticamente.
 *   3. Localhost, para que en desarrollo no mienta.
 *
 * Leer `process.env` aquí no rompe la regla de pureza: sigue sin haber ni
 * React ni Next, y el valor queda congelado en el HTML estático.
 */
function resolveSiteUrl(): string {
  const explicit = process.env['NEXT_PUBLIC_SITE_URL'];
  if (explicit !== undefined && explicit !== '') return explicit.replace(/\/$/, '');

  const vercel = process.env['VERCEL_PROJECT_PRODUCTION_URL'];
  if (vercel !== undefined && vercel !== '') return `https://${vercel}`;

  return 'http://localhost:3000';
}

export const SITE_URL = resolveSiteUrl();

function list(types: readonly PokemonType[]): string {
  const names = types.map((type) => typeName(type));
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}

function groupOf(profile: DefensiveProfile, multiplier: Multiplier): readonly PokemonType[] {
  return profile.groups.find((group) => group.multiplier === multiplier)?.types ?? [];
}

/** "Qué le hace daño a Garchomp — debilidades y resistencias" */
export function pokemonTitle(name: string): string {
  return `Qué le hace daño a ${name} — debilidades y resistencias`;
}

/**
 * Una frase que ya responde: quien la lea en Google sabe el ×4 antes de
 * entrar. Ese es el objetivo, no atraer el click a ciegas.
 */
export function pokemonDescription(name: string, profile: DefensiveProfile): string {
  const quad = groupOf(profile, 4);
  const double = groupOf(profile, 2);
  const immune = groupOf(profile, 0);
  const resists = [...groupOf(profile, 0.5), ...groupOf(profile, 0.25)];

  const parts: string[] = [];

  if (quad.length > 0) {
    parts.push(`${name} recibe ×4 de ${list(quad)}`);
    if (double.length > 0) parts.push(`y ×2 de ${list(double)}`);
  } else if (double.length > 0) {
    parts.push(`${name} es débil a ${list(double)}`);
  } else {
    parts.push(`${name} no tiene debilidades de tipo`);
  }

  const tail: string[] = [];
  if (resists.length > 0) tail.push(`resiste ${resists.length} tipos`);
  if (immune.length > 0) tail.push(`es inmune a ${list(immune)}`);

  const sentence = `${parts.join(' ')}${tail.length > 0 ? `. Además ${tail.join(' y ')}` : ''}.`;
  return `${sentence} Mira también con qué atacarlo y cómo encaja en tu equipo.`;
}

/** "Agua / Volador: debilidades, resistencias y con qué atacar" */
export function typingTitle(typing: Typing): string {
  return `${typingName(typing)}: debilidades, resistencias y con qué atacar`;
}

export function typingDescription(
  typing: Typing,
  profile: DefensiveProfile,
  count: number,
): string {
  const quad = groupOf(profile, 4);
  const double = groupOf(profile, 2);
  const immune = groupOf(profile, 0);

  const weakness =
    quad.length > 0
      ? `Recibe ×4 de ${list(quad)}`
      : double.length > 0
        ? `Es débil a ${list(double)}`
        : 'No tiene debilidades de tipo';

  const immunity = immune.length > 0 ? ` Es inmune a ${list(immune)}.` : '';
  const many = `${count} Pokémon ${count === 1 ? 'tiene' : 'tienen'} este typing.`;

  return `Todo sobre el typing ${typingName(typing)}. ${weakness}.${immunity} ${many}`;
}

interface JsonLdOptions {
  readonly url: string;
  readonly title: string;
  readonly description: string;
  /** Pares pregunta/respuesta que se publican como FAQ. */
  readonly faq: readonly { readonly question: string; readonly answer: string }[];
}

/**
 * `WebPage` + `FAQPage` con las dos preguntas literales que responde la
 * página. Se devuelve como objeto: la ruta lo serializa.
 */
export function pageJsonLd({ url, title, description, faq }: JsonLdOptions): unknown {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': url,
        url,
        name: title,
        description,
        inLanguage: 'es',
        isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
      },
      {
        '@type': 'FAQPage',
        mainEntity: faq.map((entry) => ({
          '@type': 'Question',
          name: entry.question,
          acceptedAnswer: { '@type': 'Answer', text: entry.answer },
        })),
      },
    ],
  };
}

/** Las dos preguntas reales, con su respuesta ya resuelta. */
export function faqFor(
  name: string,
  profile: DefensiveProfile,
  attackers: readonly PokemonType[],
): { question: string; answer: string }[] {
  const quad = groupOf(profile, 4);
  const double = groupOf(profile, 2);
  const weaknesses = [...quad, ...double];

  return [
    {
      question: `¿Qué le hace daño a ${name}?`,
      answer:
        weaknesses.length > 0
          ? `${name} es débil a ${list(weaknesses)}${
              quad.length > 0 ? `, y los ataques de ${list(quad)} le hacen daño cuádruple` : ''
            }.`
          : `Ningún tipo le hace daño aumentado a ${name}.`,
    },
    {
      question: `¿Con qué se ataca a ${name}?`,
      answer:
        weaknesses.length > 0
          ? `Usa movimientos de ${list(weaknesses)}. ${
              attackers.length > 0
                ? `Sus propios tipos, ${list(attackers)}, indican además contra qué es fuerte él.`
                : ''
            }`.trim()
          : `No hay ningún tipo súper efectivo contra ${name}.`,
    },
  ];
}
