/**
 * Sprites de PokéAPI. Módulo puro: sólo construye una URL.
 *
 * En el índice de búsqueda guardamos el `id`, no la URL entera: las 1205
 * URLs completas son 94 KB de prefijo repetido, y el prefijo es constante
 * para todo el set `front_default`.
 */

const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';

/** Tamaño nativo de los sprites `front_default`. */
export const SPRITE_NATIVE_SIZE = 96;

export function spriteUrl(id: number): string {
  return `${SPRITE_BASE}/${id}.png`;
}
