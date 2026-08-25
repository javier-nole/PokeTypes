import type { MetadataRoute } from 'next';

import { SITE_URL } from '@/lib/seo';

// Con `output: 'export'` estas rutas tienen que declararse estáticas.
export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/equipo/', '/vs/'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
