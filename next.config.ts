import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  // El optimizador de imágenes de Next necesita runtime de servidor; con
  // `output: 'export'` no existe. Los sprites se sirven tal cual desde PokéAPI.
  images: { unoptimized: true },
  typedRoutes: false,
};

export default nextConfig;
