import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ResultView } from '@/components/ResultView';
import { SiteHeader } from '@/components/SiteHeader';
import { TypeBars } from '@/components/TypeChip';
import { defensiveProfile } from '@/lib/effectiveness';
import { parseTypingSlug, typingName, typingSlug } from '@/lib/i18n';
import { allTypingSlugs, pokemonWithTyping } from '@/lib/pokedex';
import { SITE_URL, faqFor, pageJsonLd, typingDescription, typingTitle } from '@/lib/seo';

interface Params {
  readonly params: Promise<{ readonly typing: string }>;
}

/**
 * Una página por typing que EXISTE — 162, no las 171 teóricas. Cubre tanto
 * `/tipo/agua` como `/tipo/agua-volador` con la misma ruta.
 */
export function generateStaticParams(): { typing: string }[] {
  return allTypingSlugs().map((slug) => ({ typing: slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { typing: slug } = await params;
  const typing = parseTypingSlug(slug);
  if (typing === null) return {};

  const title = typingTitle(typing);
  const description = typingDescription(
    typing,
    defensiveProfile(typing),
    pokemonWithTyping(typing).length,
  );
  const url = `${SITE_URL}/tipo/${typingSlug(typing)}/`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'article' },
    twitter: { card: 'summary', title, description },
  };
}

export default async function TypingPage({ params }: Params) {
  const { typing: slug } = await params;
  const typing = parseTypingSlug(slug);
  if (typing === null) notFound();

  const members = pokemonWithTyping(typing);
  if (members.length === 0) notFound();

  const profile = defensiveProfile(typing);
  const name = typingName(typing);
  const url = `${SITE_URL}/tipo/${typingSlug(typing)}/`;

  const jsonLd = pageJsonLd({
    url,
    title: typingTitle(typing),
    description: typingDescription(typing, profile, members.length),
    faq: faqFor(`un Pokémon ${name}`, profile, typing),
  });

  return (
    <>
      <SiteHeader />
      <ResultView
        title={name}
        typing={typing}
        teamHref="/equipo/"
        vsHref="/vs/"
        subtitle={`${members.length} Pokémon ${members.length === 1 ? 'tiene' : 'tienen'} este typing. Todo lo de abajo vale para cualquiera de ellos.`}
      />

      <section className="mx-auto max-w-[1440px] px-4 pb-10 sm:px-8">
        <h2 className="pb-3 font-mono text-xs font-bold tracking-[.16em] text-ink-dim">
          QUIÉN LO LLEVA
        </h2>
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2 p-0">
          {members.map((pokemon) => (
            <li key={pokemon.slug}>
              <Link
                href={`/pokemon/${pokemon.slug}/`}
                className="flex h-12 items-center justify-between rounded-[10px] bg-surface px-3.5 text-[14.5px] font-semibold text-ink no-underline hover:bg-surface-2"
              >
                <span className="truncate">{pokemon.nameEs}</span>
                <TypeBars types={pokemon.types} />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
