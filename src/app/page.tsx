import type { Metadata } from 'next';
import Link from 'next/link';

import { SearchBox } from '@/components/SearchBox';
import { TypeChip } from '@/components/TypeChip';
import { TYPE_SLUGS_ES } from '@/lib/i18n';
import { POKEMON_TYPES } from '@/lib/types';
import { SITE_URL } from '@/lib/seo';

const TITLE = 'Efectividades de tipos Pokémon — qué le hace daño y con qué atacar';
const DESCRIPTION =
  'Busca un Pokémon o un typing y te decimos directamente qué le hace daño, con qué ' +
  'atacarlo y qué huecos tiene tu equipo. Sin tablas de 18×18 que descifrar.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/` },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${SITE_URL}/` },
};

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-7 px-4 py-8 sm:px-6 sm:py-14">
      <h1 className="max-w-md text-[32px] font-extrabold leading-[1.1] tracking-[-.02em] sm:text-5xl">
        ¿Qué tienes
        <br />
        enfrente?
      </h1>

      <SearchBox autoFocus />

      <section className="flex flex-col gap-2.5">
        <h2 className="font-mono text-[10.5px] tracking-[.14em] text-ink-dim">O ELIGE TIPOS</h2>
        <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
          {POKEMON_TYPES.map((type) => (
            <li key={type}>
              <Link
                href={`/tipo/${TYPE_SLUGS_ES[type]}/`}
                className="block no-underline"
                aria-label={`Ver efectividades del tipo ${type}`}
              >
                <TypeChip type={type} size="sm" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2.5">
        <h2 className="font-mono text-[10.5px] tracking-[.14em] text-ink-dim">
          O RESUELVE OTRA COSA
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <Link
            href="/equipo/"
            className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-4 no-underline hover:border-border-strong"
          >
            <span className="text-base font-bold text-ink">Mi equipo de 6</span>
            <span className="text-[13.5px] leading-snug text-ink-muted">
              Qué tipo tumba a más miembros y a qué no sabes pegar.
            </span>
          </Link>
          <Link
            href="/vs/"
            className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-4 no-underline hover:border-border-strong"
          >
            <span className="text-base font-bold text-ink">Mi X contra su Y</span>
            <span className="text-[13.5px] leading-snug text-ink-muted">
              Quién gana el intercambio, en las dos direcciones.
            </span>
          </Link>
        </div>
      </section>

      <p className="text-[13px] leading-relaxed text-ink-dim">
        Cálculos con la tabla de tipos de sexta generación en adelante, con Hada. No se tienen en
        cuenta habilidades, objetos ni Teracristal.
      </p>
    </main>
  );
}
