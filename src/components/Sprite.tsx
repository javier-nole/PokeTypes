import { spriteUrl } from '@/lib/sprites';

/**
 * Sprite de PokéAPI, para reconocer de un vistazo donde el nombre solo no
 * basta: sugerencias del buscador y chips de equipo.
 *
 * Es `<img>` a pelo, no `next/image`: con `output: 'export'` no hay
 * optimizador, y estos PNG ya pesan ~2 KB.
 *
 * `alt=""` a propósito. El nombre del Pokémon va siempre justo al lado, así
 * que para un lector de pantalla el sprite es decoración; ponerle el nombre
 * lo haría leerlo dos veces.
 */
export function Sprite({
  spriteId,
  size,
}: {
  readonly spriteId: number | undefined;
  readonly size: number;
}) {
  // Hueco del mismo tamaño cuando no hay sprite, para que la fila no salte.
  if (spriteId === undefined) {
    return <span aria-hidden="true" className="shrink-0" style={{ width: size, height: size }} />;
  }

  return (
    <img
      src={spriteUrl(spriteId)}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className="shrink-0"
      style={{ width: size, height: size }}
    />
  );
}
