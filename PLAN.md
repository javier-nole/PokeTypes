# PLAN — Consulta de efectividades de tipos

Sitio estático que **responde la pregunta**, no muestra la tabla. Cuatro preguntas, nada más:

1. Me enfrento a esto → ¿con qué le pego? (ATAQUE)
2. Tengo esto → ¿qué me mata? (DEFENSA)
3. Tengo estos 6 → ¿qué hueco tengo? (EQUIPO)
4. Mi X contra su Y → ¿quién gana el cruce? (VS)

---

## 0. Lo que ya está decidido y no se discute

Stack fijo: Next.js App Router `output: 'export'`, TypeScript strict, Tailwind, Vitest, Cloudflare Pages. Sin backend, sin DB, sin `any`. Alcance V1 cerrado: solo tabla de tipos Gen 6+. Nada de habilidades, Tera, objetos, movimientos, stats ni gens antiguas.

**Regla dura:** `src/lib/*` no importa React ni Next. Ningún componente calcula un multiplicador.

---

## 1. Decisiones que he tomado (y por qué)

Estas son las que necesitan tu visto bueno antes de que escriba nada.

### 1.1 La ruta `/vs` — contradicción en el brief

El brief pide `/vs/[slugA]-vs-[slugB]` **y** "generada bajo demanda vía query params, no pre-renderizada". Con `output: 'export'` las dos cosas son incompatibles: una ruta dinámica necesita `generateStaticParams`, y ~1000 × 1000 = un millón de páginas.

**Decisión:** una sola ruta estática `/vs`, estado en query params — `/vs?a=gyarados&b=blaziken`. Misma gramática que `/equipo?p=...`, se comparte igual de bien, cero páginas generadas. El SEO de VS no vale nada a esa escala (nadie busca "gyarados vs blaziken tipos"), mientras que `/pokemon/[slug]` y `/tipo/[...]` sí. Si prefieres la ruta con path, dímelo y pre-renderizo solo un set curado.

### 1.2 Qué Pokémon entran en el dataset

Regla mecánica, no lista a mano:

- Toda variedad **default** (~1025).
- Toda variedad **no-default cuyo typing difiera** del default — esto captura Rotom-Calor, Wormadam, Oricorio, Lycanroc, Darmanitan-Galar, etc.
- Todas las **formas regionales** (Alola/Galar/Hisui/Paldea), difieran o no en tipos, porque el jugador las busca por nombre.
- **Megas y Primigenias dentro** — cambian typing, que es justo lo que resuelve este sitio (Mega-Gyarados pasa a Agua/Siniestro y deja de ser ×4 a Eléctrico).
- **Fuera: Gigamax y Totem.** No cambian typing, solo inflan el índice de búsqueda.

Nombre en español: `pokemon-species.names[es]`. Para formas, `"Ninetales (Alola)"` — nombre de especie + etiqueta de región desde un mapa corto hardcodeado, porque la cobertura de `es` en `pokemon-form` es irregular y prefiero un nombre determinista a uno que a veces sale en inglés.

### 1.3 Sprites

El mockup **no usa sprites en ningún sitio** — la identidad visual son las barras de color de tipo. Se usan sólo donde el nombre solo no basta para reconocer: sugerencias del buscador, chips de equipo y cabeceras de la matriz. La ficha y las páginas de typing van sin sprite, como el diseño.

`pokemon.json` guarda la URL completa, como pides. El índice de búsqueda guarda sólo el `id` y la reconstruye (`src/lib/sprites.ts`): la URL es 100 % derivable del id y las 1205 completas serían 94 KB de prefijo repetido. Hotlink a `raw.githubusercontent.com/PokeAPI/sprites` (front_default, ~2 KB), `loading="lazy"`, `width`/`height` fijos y `alt=""` porque el nombre va siempre al lado. Cero impacto en LCP: no hay sprite en el above-the-fold de las páginas indexables.

### 1.4 Tokens que el mockup no define

El mockup cubre ×4, ×2, ×1, ×½ y ×0, y 16 de los 18 colores de tipo. Me faltan y los derivo:

- **×0.25** → superficie `#0C1A14`, tinta `#7FE5B7` (el verde de hover que ya existe en el mockup), etiqueta `MURO`.
- **Psíquico ink** `#FF8FAE` y **Siniestro ink** `#C4A891` — los otros 16 vienen literales del mockup. Ambos pasan AA sobre `#100F0D`.

Etiquetas de severidad, cerradas: `LETAL` ×4 · `PELIGRO` ×2 · (sin etiqueta) ×1 · `RESISTE` ×½ · `MURO` ×¼ · `INMUNE` ×0.

### 1.5 Vista ATAQUE — mockup vs. brief

El mockup muestra bloques por tipo propio listando **tipos individuales** ("Agua ×2 → Fuego, Roca, Tierra"). El brief pide **typings reales existentes**, filtrando las 171 teóricas. No se contradicen, son dos niveles:

- **Nivel 1 (el mocked, primario):** un bloque por tipo propio, contra los 18 tipos simples. Es la lectura rápida.
- **Nivel 2 (debajo, plegable):** contra qué *typings reales* (los ~155 que existen con al menos un Pokémon) tu mejor tipo pega ×4/×2/×1/×½/×¼/×0.

Ambos salen de las mismas funciones puras. `SIN COBERTURA` = tipos que **resisten o ignoran todo** lo que llevas (corte en `< 1`, no en `< 2`): con el corte en ×2 entrarían los quince tipos que reciben daño neutro, que no son un problema. El mockup lista ahí Acero y Hada para Gyarados, pero ninguna regla los produce — es copy ilustrativo.

### 1.6 Dependencias

Solo el stack. Dos notas:

- **Sin librería de fuzzy** (fuse.js etc.): normalización de tildes + prefijo/substring + Levenshtein con corte temprano en ≤80 líneas. Un dataset de 1000 nombres no justifica 15 KB de dependencia.
- **Sin `tsx`**: tienes Node 26, que ejecuta TypeScript nativamente. `node scripts/build-data.ts` y ya.
- Tailwind v4 (`@tailwindcss/postcss`): los tokens del mockup mapean directo a `@theme`.
- Fuentes vía `next/font/google` → se auto-hospedan en build. Cero requests externos, que es la mitad del Lighthouse.

---

## 2. Arquitectura

```
scripts/build-data.ts          → PokéAPI una vez, en build. No se ejecuta en CI.
src/data/pokemon.json          → generado, commiteado
src/data/typings.json          → generado: combos que existen + nº de Pokémon
src/lib/types.ts               → PokemonType, Multiplier, Pokemon, Typing
src/lib/type-chart.ts          → matriz 18×18, pura, cero imports
src/lib/effectiveness.ts       → defensiva, ofensiva, vs, equipo
src/lib/search.ts              → normalización + fuzzy
src/lib/i18n.ts                → nombres es/en de tipos, slugs
src/lib/seo.ts                 → títulos, descriptions, JSON-LD
src/components/*               → presentación pura, recibe números ya calculados
src/app/*                      → rutas
```

`src/lib` no importa nada de `src/app` ni de `src/components`. Test de arquitectura que lo verifica.

**Aislamiento de generaciones:** `type-chart.ts` exporta `CHART_GEN6` y un `getChart(gen)` que hoy solo devuelve esa. Añadir Gen 1 mañana = una constante más, sin tocar `effectiveness.ts`. **No implemento Gen 1–5 ahora.**

---

## 3. Fases

### F1 — Lógica de dominio (primero, y con tests antes que UI)

`type-chart.ts`: matriz tipada `Record<PokemonType, Record<PokemonType, 0 | 0.5 | 1 | 2>>`.

`effectiveness.ts`, todo puro:

| Función | Responde |
|---|---|
| `defensiveProfile(types)` | qué le pega, agrupado por multiplicador |
| `offensiveProfile(types, typings)` | contra qué typings reales pega bien |
| `matchup(a, b)` | intercambio en ambas direcciones + veredicto |
| `teamCoverage(members, typings)` | matriz defensiva + huecos ofensivos |

**Tests (criterio de aceptación 1):** monotipo, doble tipo, ×4, ×0.25, inmunidad que anula debilidad (Tierra → Skarmory Acero/Volador = ×0; **no** Tierra → Gengar, ver §7), Lucha y Normal → Gengar = ×0, y los 18 tipos como atacante contra un caso conocido cada uno. Más: propiedad de conmutatividad del doble tipo, y que ninguna combinación produzca un multiplicador fuera de {0, .25, .5, 1, 2, 4}.

Salida: verde en `npm test` sin una línea de UI escrita.

### F2 — Datos

`build-data.ts`: `pokemon-species` + `pokemon` con concurrencia limitada y caché en disco (`.cache/`, gitignored) para poder re-ejecutar sin martillear la API. Valida contra los tipos de `src/lib/types.ts` y falla ruidosamente si un Pokémon sale sin nombre en español. Genera también `typings.json` ordenado por popularidad.

Presupuesto: JSON ~130 KB crudo / ~35 KB gzip. **No se importa entero en ninguna página**: `/pokemon/[slug]` recibe solo su entrada, y el índice de búsqueda se carga en `import()` diferido al primer foco del input.

### F3 — Sistema de diseño

`tokens.css` con las variables del mockup (superficies, severidad, 18 × 2 colores de tipo) expuestas a Tailwind vía `@theme`. Primitivos: `TypeChip` (3 tamaños), `MultiplierBand`, `BlockMeter`, `SeverityLabel`, `TypeBar`.

Regla de accesibilidad del mockup, que respeto al pie: **el color nunca porta información solo**. Cada banda lleva número + palabra + medidor + posición. Esto es lo que sostiene el Lighthouse de accesibilidad, no un `aria-label` puesto después.

### F4 — Rutas y UI

Orden deliberado: **EQUIPO va antes del pulido de las demás**, como pediste.

1. `/pokemon/[slug]` — desktop dos columnas (Defensa | Ataque), móvil dos pestañas con Defensa por defecto. Es la página que valida todos los primitivos.
2. Home `/` — input único, recientes en `localStorage`, grid de tipos. Estados: vacío, cargando, sin resultados, sugerencia de typo ("¿Querías decir Gyarados?", Enter acepta, **nunca autocorrige en silencio**).
3. **`/equipo`** — matriz 6 columnas × tipos atacantes, ordenada por amenaza descendente, con "AMENAZA #1" arriba y huecos ofensivos abajo. En móvil la matriz rota: una fila por tipo amenazante con contador, expandible. Estado en `?p=`, sin scroll horizontal.
4. `/tipo/[tipo]` y `/tipo/[a]-[b]` — misma vista que Pokémon + lista de quién tiene ese typing.
5. `/vs` — resumen bidireccional y veredicto.

**Criterio 2 (≤2 interacciones):** escribir y Enter = 1. Cambiar de pestaña = 2. Se cumple por construcción.

### F5 — SEO

`generateMetadata` por ruta, con la pregunta real en el título:

- `/pokemon/garchomp` → *"Qué le hace daño a Garchomp — debilidades y resistencias"*
- `/tipo/agua-volador` → *"Agua / Volador: debilidades, resistencias y con qué atacar"*

Description que **contiene ya la respuesta** ("Garchomp es débil ×4 a Hielo…") — es lo que gana el click. JSON-LD `WebPage` + `FAQPage` con las dos preguntas literales. `sitemap.xml` y `robots.txt` generados. `/equipo` y `/vs` con metadata genérica y `noindex` — son herramientas, no contenido.

### F6 — Rendimiento, a11y y deploy

Presupuesto: **< 115 KB JS gzip** en `/pokemon/[slug]` (medido: ~108 KB, de los que ~100 KB son el suelo de React 19 + App Router y ~8 KB código propio). La página es server-rendered a HTML estático; lo único cliente es el buscador y las pestañas. Índice de búsqueda diferido.

`useSearchParams` bajo `<Suspense>` (obligatorio con `output: 'export'`). Lighthouse móvil ≥95 en las tres métricas, medido, no asumido. Deploy: `npm run build` → `out/` → Cloudflare Pages. `_headers` con cache inmutable para assets.

Footer: disclaimer de fan site, sin branding oficial, sin sugerir afiliación.

---

## 4. Criterios de aceptación — cómo los verifico

| # | Criterio | Verificación |
|---|---|---|
| 1 | Tests de `effectiveness.ts` | `npm test`, casos listados en F1 |
| 2 | Consulta en ≤2 interacciones | Recorrido manual de las 4 preguntas |
| 3 | Lighthouse ≥95 móvil (Perf/A11y/SEO) | Ejecutado contra `out/` servido |
| 4 | Dominio sin React/Next | Test que falla si `src/lib` importa react/next |
| 5 | `npm run build` sin errores de tipos | `tsc --noEmit` en el build |

---

## 5. Correcciones sobre el brief

Tres cosas del enunciado o del mockup no cuadran con la tabla de tipos, y he implementado la versión correcta:

1. **Tierra → Gengar no es ×0.** El criterio de aceptación 1 lo pone como ejemplo de "inmunidad que anula debilidad", pero Fantasma no es inmune a Tierra: la inmunidad de Gengar venía de **Levitación**, una habilidad, que está explícitamente fuera del alcance. Tierra → Gengar (Fantasma/Veneno) es **×2**. El caso sí se cubre con Tierra → Skarmory (Acero/Volador) = ×2 × ×0 = **×0**, y con Psíquico → Scrafty (Lucha/Siniestro) = **×0**.
2. **La matriz de equipo del mockup tiene mal la columna de Nidoking.** Muestra ×1 donde Tierra y Lucha dan ×2 y ×½. Los números del sitio se calculan, así que salen bien.
3. **`SIN COBERTURA` y `HUECOS OFENSIVOS` del mockup son ilustrativos**, no derivables de ninguna regla. Ver §1.5.

---

## 6. Riesgos

- **PokéAPI incompleta en español** para algún Pokémon reciente → el script falla ruidoso y añado el nombre a un mapa de overrides. Prefiero eso a un nombre en inglés colándose en silencio.
- **~1200 páginas × build** — tiempo aceptable en Cloudflare Pages. Si se dispara, `/tipo/*` es lo primero que reduzco (sigue siendo estático, solo menos rutas).
- **Matriz de equipo en móvil sin scroll horizontal** es el problema de diseño real de la V1. El mockup solo la resuelve en desktop; la rotación por filas es propuesta mía y puede necesitar una iteración contigo.

---

## 7. Qué necesito de ti

1. ¿OK con `/vs?a=&b=` en vez de `/vs/[a]-vs-[b]`? (§1.1)
2. ¿Megas y Gigamax fuera? (§1.2)
3. ¿OK con los tokens que he derivado — ×0.25 y los dos inks? (§1.4)
4. ¿OK con los dos niveles de la vista ATAQUE? (§1.5)

Con tu OK escribo `CLAUDE.md` y arranco por F1.
