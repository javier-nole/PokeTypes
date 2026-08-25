import type { MetadataRoute } from 'next';

import { allTypingSlugs, ALL_POKEMON } from '@/lib/pokedex';
import { SITE_URL } from '@/lib/seo';

// Con `output: 'export'` estas rutas tienen que declararse estáticas.
export const dynamic = 'force-static';

/** Sólo entra lo indexable: la home, los Pokémon y los typings. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, priority: 1 },
    ...ALL_POKEMON.map((entry) => ({
      url: `${SITE_URL}/pokemon/${entry.slug}/`,
      priority: 0.8,
    })),
    ...allTypingSlugs().map((slug) => ({
      url: `${SITE_URL}/tipo/${slug}/`,
      priority: 0.6,
    })),
  ];
}
