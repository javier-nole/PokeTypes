/**
 * Prefijo de ruta para cuando el sitio no cuelga de la raíz del dominio.
 *
 * GitHub Pages sirve el repo en `/PokeTypes/`. `next/link`, el bundler y
 * `next/font` ya aplican el `basePath` solos; lo que no lo hace es un
 * `fetch` a un archivo de `public/`, así que ese prefijo se pone a mano.
 *
 * Acceso con punto y no con corchetes a propósito: Next sustituye
 * literalmente la expresión `process.env.NEXT_PUBLIC_BASE_PATH` al empaquetar
 * el cliente. Con corchetes la sustitución no ocurre, el valor llega vacío al
 * navegador y el fetch se va a la raíz del dominio.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/** `/search-index.json` → `/PokeTypes/search-index.json`. */
export function withBasePath(path: string): string {
  return `${BASE_PATH}${path}`;
}
