# Efectividades

Consulta de efectividades de tipos Pokémon para nuzlocke y modo historia. Responde la pregunta en vez de enseñarte la tabla de 18×18.

**▶ En vivo: [javier-nole.github.io/PokeTypes](https://javier-nole.github.io/PokeTypes/)**

Sitio 100% estático: sin backend, sin base de datos, sin llamadas a ninguna API en runtime.

## Comandos

```bash
npm install
npm run dev          # desarrollo en localhost:3000
npm test             # tests de la lógica de dominio
npm run build        # tsc --noEmit + export estático a out/
npm start            # sirve out/ para comprobarlo en local
npm run build:data   # regenera el dataset desde PokéAPI (a mano, no en CI)
```

## Cómo está montado

```
src/lib/type-chart.ts      matriz 18×18 Gen 6+, escrita a mano y testeada
src/lib/effectiveness.ts   defensa, ataque, VS y cobertura de equipo — funciones puras
src/lib/search.ts          normalización de tildes y fuzzy propio
src/lib/pokedex.ts         acceso al dataset generado
src/lib/seo.ts             títulos, descriptions y JSON-LD
src/data/*.json            generado por scripts/build-data.ts, commiteado
public/search-index.json   índice ligero que el buscador descarga al primer foco
src/components/*           presentación; recibe números ya calculados
src/app/*                  rutas
```

**Regla dura:** ningún componente de React calcula un multiplicador, y `src/lib` no importa React ni Next. Hay un test que lo verifica.

Las reglas completas del proyecto están en [CLAUDE.md](./CLAUDE.md); las decisiones de diseño y sus porqués, en [PLAN.md](./PLAN.md).

## Datos

`npm run build:data` baja ~2 400 recursos de PokéAPI con caché en `.cache/` y escribe `src/data/pokemon.json`, `src/data/typings.json` y `public/search-index.json`. Sólo hay que ejecutarlo cuando salgan Pokémon nuevos.

Entran las variedades por defecto, las formas regionales, las Megas y Primigenias, y cualquier variedad cuyo typing difiera del original. Quedan fuera Gigamax y Totem, que no cambian de tipo.

La tabla de tipos **no** sale de la API: va escrita a mano en `type-chart.ts` porque es determinista y así se puede testear.

## Deploy

El sitio es estático puro: vale cualquier hosting que sirva ficheros.

| Ajuste | Valor |
|---|---|
| Build command | `npm run build` |
| Output directory | `out` |
| Node version | 22 o superior |

**Variable obligatoria:** `NEXT_PUBLIC_SITE_URL` con el dominio real (`https://…`, sin barra final). De ella salen las canónicas, el sitemap y el JSON-LD. En Vercel se puede omitir — se usa su dominio de producción automáticamente. Si no hay ninguna de las dos, cae a `http://localhost:3000`, que es visible en el HTML y evita desplegar canónicas falsas sin enterarse.

```bash
# Vercel — construye en su infraestructura
vercel --prod

# Cloudflare Pages — sube out/ ya construido
npm run build
npx wrangler pages deploy out

# Netlify
npx netlify deploy --prod --dir=out
```

`public/_headers` trae el cacheado inmutable de los assets; lo leen Cloudflare Pages y Netlify. Vercel ya pone esas cabeceras por su cuenta.

## Alcance

Sólo tabla de tipos. **No** entran habilidades (Levitación, Absorbe Fuego…), Teracristal, objetos, clima, movimientos concretos ni cálculo de daño con stats. Las generaciones 1–5 tampoco: la tabla está aislada tras `getChart(gen)` para que añadirlas después sea barato, pero no están implementadas.

## Aviso legal

Sitio de fans sin ánimo de lucro y sin relación con Nintendo, Game Freak ni The Pokémon Company. Pokémon y los nombres de los personajes son marcas registradas de sus propietarios. Datos y sprites de [PokéAPI](https://pokeapi.co).
