import Link from 'next/link';

import { SearchBox } from '@/components/SearchBox';

/** Cabecera de las páginas de resultado: marca, buscador compacto y accesos. */
export function SiteHeader() {
  return (
    <header className="flex items-center gap-3 border-b border-line px-4 py-3.5 sm:gap-5 sm:px-8">
      <Link
        href="/"
        className="hidden font-mono text-xs tracking-[.16em] text-ink-dim no-underline hover:text-ink sm:block"
      >
        EFECTIVIDADES
      </Link>

      <div className="min-w-0 flex-1 sm:max-w-[520px]">
        <SearchBox compact placeholder="Buscar otro…" />
      </div>

      <nav className="ml-auto flex gap-2">
        <Link
          href="/equipo/"
          className="flex h-9 items-center rounded-lg bg-surface-2 px-3.5 text-[13px] font-semibold text-ink-muted no-underline hover:text-ink"
        >
          Equipo
        </Link>
        <Link
          href="/vs/"
          className="flex h-9 items-center rounded-lg bg-surface-2 px-3.5 text-[13px] font-semibold text-ink-muted no-underline hover:text-ink"
        >
          VS
        </Link>
      </nav>
    </header>
  );
}
