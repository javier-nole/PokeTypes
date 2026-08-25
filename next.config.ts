import type { NextConfig } from 'next';

/*
 * Vacío en local y en un dominio propio a la raíz; `/PokeTypes` cuando quien
 * sirve es GitHub Pages, que nos cuelga del nombre del repo. Sale de una
 * variable de entorno para que el mismo árbol compile para los dos destinos
 * sin tocar este archivo.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath,
  assetPrefix: basePath,
  // El optimizador de imágenes de Next necesita runtime de servidor; con
  // `output: 'export'` no existe. Los sprites se sirven tal cual desde PokéAPI.
  images: { unoptimized: true },
  typedRoutes: false,
};

export default nextConfig;
