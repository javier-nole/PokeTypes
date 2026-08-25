# CLAUDE.md — Reglas del proyecto

Sitio estático de consulta de efectividades de tipos Pokémon, para jugadores de **nuzlocke / modo historia**. No es competitivo.

## La regla que define el producto

El sitio **responde la pregunta**, no muestra la tabla. Toda feature responde una de estas cuatro o no entra:

1. Me enfrento a esto → ¿con qué le pego? (ATAQUE)
2. Tengo esto → ¿qué me mata? (DEFENSA)
3. Tengo estos 6 → ¿qué hueco tengo? (EQUIPO)
4. Mi X contra su Y → ¿quién gana el cruce? (VS)

Si una propuesta no responde ninguna, la respuesta es no.

## Regla dura de arquitectura

**Ningún componente de React calcula un multiplicador.** Todo número sale de `src/lib/`.

**`src/lib/` no importa React ni Next.** Ni `next/*`, ni `react`, ni nada de `src/app` o `src/components`. Hay un test que falla si se rompe (`src/lib/__tests__/architecture.test.ts`).

Los componentes reciben datos ya calculados y solo deciden cómo se ven.

## Stack — fijo, no se proponen alternativas

- **Next.js App Router** con `output: 'export'`. Sitio 100% estático, cero runtime de servidor.
- **TypeScript strict.** Prohibido `any`. Prohibido `as` para silenciar el compilador; si hace falta, es que el tipo está mal.
- **Tailwind v4** con tokens en `@theme`. Componentes propios, sin librería de UI.
- **Vitest** para la lógica de dominio.
- **Cloudflare Pages.** Un solo comando: `npm run build`.
- Sin backend, sin DB, sin auth, sin analytics de pago.

## Dependencias

No se instala nada fuera del stack sin justificarlo primero en una línea. Decisiones ya tomadas:

- **Sin librería de fuzzy search.** Levenshtein propio en `src/lib/search.ts`.
- **Sin `tsx`.** Node 26 ejecuta TypeScript nativamente: `node scripts/build-data.ts`.
- **Fuentes vía `next/font/google`** (Archivo, JetBrains Mono) → auto-hospedadas en build, cero requests externos.

**Imports dentro de `src/lib` llevan extensión `.ts` explícita.** Es lo que permite que `scripts/build-data.ts` importe el dominio ejecutándose con Node a pelo, sin bundler. Fuera de `src/lib` se usan los alias `@/…` de siempre.

## Alcance V1 — cerrado

**Dentro:** tabla de tipos Gen 6+ (con Hada), búsqueda unificada Pokémon-o-tipos, vista Defensa, vista Ataque, modo VS, modo Equipo hasta 6, español primero, responsive real.

**Fuera — no implementar, no dejar hooks a medias:** habilidades (Levitación, Absorbe Fuego), Teracristal, objetos, clima, terreno, movimientos individuales y sus casos especiales, cálculo de daño con stats/EVs, cuentas, backend, DB, y tablas de Gen 1–5.

Las gens antiguas viven aisladas en `type-chart.ts` (`getChart(gen)`) para que añadirlas después sea trivial. **No se implementan ahora.**

## Datos

- PokéAPI se consume **una sola vez, en build**, desde `scripts/build-data.ts`. La app **nunca** llama a PokéAPI en runtime.
- `src/data/pokemon.json` y `src/data/typings.json` son generados y **se commitean**.
- La tabla de tipos **no** sale de la API. Va hardcodeada y tipada en `src/lib/type-chart.ts` porque es determinista y así es testeable.
- Dataset: variedades default + formas regionales + variedades con typing distinto al default + Megas y Primigenias. Fuera Gigamax y Totem.

## Convenciones

**Nombres.** Tipos de dominio en inglés en el código (`PokemonType`, `defensiveProfile`), strings de cara al usuario en español. Los tipos Pokémon se identifican internamente por su clave inglesa (`'electric'`) y se traducen en `src/lib/i18n.ts`. Nunca se compara contra un nombre en español.

**Slugs.** ASCII, minúsculas, sin tildes, guiones: `nidoran-f`, `mr-mime`, `ninetales-alola`, `gyarados-mega`. Typings: `/tipo/agua-volador`, en orden canónico (el orden del enum de tipos), no el orden en que los escriba el usuario.

**Archivos.** Componentes en `PascalCase.tsx`, módulos de lib en `kebab-case.ts`, tests en `src/lib/__tests__/*.test.ts`.

**Multiplicadores.** Solo existen `0 | 0.25 | 0.5 | 1 | 2 | 4`. Tipados así, no `number`. Se formatean con `×` (U+00D7), nunca con `x`, y con `×½` / `×¼` en vez de decimales.

## Diseño

El diseño canónico es `Efectividades de tipos.html`. Se sigue fielmente. Tokens en `src/app/globals.css`.

**El signo del multiplicador depende del contexto.** En defensa un ×4 es rojo porque te mata; en ataque es verde porque lo matas. `SEVERITY` es la paleta defensiva y `OFFENSIVE_INK` la ofensiva (`src/components/severity.tsx`); usar la que no toca hace leer "peligro" donde pone "ganas".

**La regla de accesibilidad no es negociable: el color nunca porta información solo.** Cada nivel de severidad lleva cuatro señales redundantes — número (`×4`), palabra (`LETAL`), medidor de bloques y posición. El color es refuerzo.

Los 18 colores canónicos de tipo aparecen únicamente como **barra de 4-7px** dentro del chip. El texto del chip usa la variante `--t-{tipo}-ink`, que pasa AA sobre superficie oscura.

Severidad: `LETAL` ×4 · `PELIGRO` ×2 · (sin etiqueta) ×1 · `RESISTE` ×½ · `MURO` ×¼ · `INMUNE` ×0.

En móvil Defensa abre por defecto: en combate la pregunta urgente es qué te mata.

## Presupuestos

- **< 115 KB de JS gzip** en `/pokemon/[slug]`, de los cuales ~100 KB son el suelo de React 19 + App Router y sólo ~8 KB son código nuestro. El presupuesto original de 90 KB no era alcanzable con este stack; lo que sí se vigila es que nuestra parte no crezca. La página es HTML estático; sólo el buscador y las pestañas son cliente.
- El índice de búsqueda se carga con `import()` diferido al primer foco del input. **Nunca** se importa `pokemon.json` entero en una página de detalle.
- Lighthouse móvil **≥95** en Performance, Accesibilidad y SEO. Se mide, no se asume.
- Cualquier consulta se resuelve en **≤2 interacciones** desde la home.

## SEO

Es parte del producto. Cada página estática lleva `<title>`, meta description y JSON-LD propios, **en español y con la pregunta real del usuario en el título**:

> "Qué le hace daño a Garchomp — debilidades y resistencias"

No el nombre pelado. La description contiene ya la respuesta ("Garchomp es débil ×4 a Hielo…"), que es lo que gana el click.

`/equipo` y `/vs` van con metadata genérica y `noindex`: son herramientas, no contenido.

## Legal

Los nombres y sprites de Pokémon son IP de Nintendo / Game Freak / The Pokémon Company. El footer lleva disclaimer de fan site. **Sin branding oficial y sin nada que sugiera afiliación.**
