import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ResultView } from '@/components/ResultView';
import { SiteHeader } from '@/components/SiteHeader';
import { defensiveProfile } from '@/lib/effectiveness';
import { typingSlug } from '@/lib/i18n';
import { ALL_POKEMON, getPokemon } from '@/lib/pokedex';
import {
  SITE_URL,
  faqFor,
  pageJsonLd,
  pokemonDescription,
  pokemonTitle,
} from '@/lib/seo';

interface Params {
  readonly params: Promise<{ readonly slug: string }>;
}

/** Una página estática por Pokémon: ~1200 rutas. */
export function generateStaticParams(): { slug: string }[] {
  return ALL_POKEMON.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const pokemon = getPokemon(slug);
  if (pokemon === null) return {};

  const title = pokemonTitle(pokemon.nameEs);
  const description = pokemonDescription(pokemon.nameEs, defensiveProfile(pokemon.types));
  const url = `${SITE_URL}/pokemon/${pokemon.slug}/`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'article' },
    twitter: { card: 'summary', title, description },
  };
}

export default async function PokemonPage({ params }: Params) {
  const { slug } = await params;
  const pokemon = getPokemon(slug);
  if (pokemon === null) notFound();

  const profile = defensiveProfile(pokemon.types);
  const url = `${SITE_URL}/pokemon/${pokemon.slug}/`;

  const jsonLd = pageJsonLd({
    url,
    title: pokemonTitle(pokemon.nameEs),
    description: pokemonDescription(pokemon.nameEs, profile),
    faq: faqFor(pokemon.nameEs, profile, pokemon.types),
  });

  return (
    <>
      <SiteHeader />
      <ResultView
        title={pokemon.nameEs}
        typing={pokemon.types}
        teamHref={`/equipo/?p=${pokemon.slug}`}
        vsHref={`/vs/?a=${pokemon.slug}`}
      />
      <script
        type="application/ld+json"
        // El contenido lo generamos nosotros a partir de datos ya validados.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <p className="mx-auto max-w-[1440px] px-4 pb-6 text-[13px] text-ink-dim sm:px-8">
        Typing{' '}
        <a href={`/tipo/${typingSlug(pokemon.types)}/`} className="text-accent">
          {pokemon.types.length === 2 ? 'doble' : 'puro'}
        </a>{' '}
        · Generación {pokemon.generation} · Nº {pokemon.id < 10000 ? pokemon.id : '—'}
      </p>
    </>
  );
}
