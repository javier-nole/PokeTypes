import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-[-.02em]">Aquí no hay nada</h1>
      <p className="text-[15px] leading-relaxed text-ink-muted">
        Ese Pokémon o esa combinación de tipos no existe. Puede que la hayas escrito de otra forma,
        o que sea una de las nueve combinaciones que ningún Pokémon lleva todavía.
      </p>
      <Link
        href="/"
        className="flex h-12 w-fit items-center rounded-[10px] border border-border bg-surface-2 px-5 text-sm font-semibold text-ink no-underline"
      >
        Volver al buscador
      </Link>
    </main>
  );
}
