import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="border-t border-line px-4 py-8 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-3">
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-[13.5px]">
          <Link href="/" className="text-ink-muted no-underline hover:text-ink">
            Buscador
          </Link>
          <Link href="/equipo/" className="text-ink-muted no-underline hover:text-ink">
            Equipo
          </Link>
          <Link href="/vs/" className="text-ink-muted no-underline hover:text-ink">
            VS
          </Link>
        </nav>
        <p className="max-w-2xl text-[12.5px] leading-relaxed text-ink-dim">
          Sitio de fans sin ánimo de lucro y sin relación con Nintendo, Game Freak ni The Pokémon
          Company. Pokémon y los nombres de los personajes son marcas registradas de sus
          propietarios. Los datos y sprites proceden de{' '}
          <a
            href="https://pokeapi.co"
            rel="noopener noreferrer nofollow"
            target="_blank"
            className="text-accent"
          >
            PokéAPI
          </a>
          . Los cálculos usan sólo la tabla de tipos de sexta generación en adelante: no tienen en
          cuenta habilidades, objetos ni Teracristal.
        </p>
      </div>
    </footer>
  );
}
