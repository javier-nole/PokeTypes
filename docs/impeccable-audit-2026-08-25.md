# Impeccable audit — PokeTypes

Fecha: 2026-08-25  
Alcance: auditoría técnica de la interfaz web existente.  
Modo: audit-only; no se modificaron archivos funcionales.

> Este documento registra una auditoría estática de código. No incluye verificación visual ni pruebas de rutas en navegador.

## Resultado

| Dimensión | Puntuación | Hallazgo principal |
|---|---:|---|
| Accesibilidad | 2/4 | Faltan landmarks `<main>` en varias superficies y el combobox no anuncia el resultado activo. |
| Rendimiento | 3/4 | Arquitectura estática y sprites diferidos; `/equipo` y `/vs` descargan el índice al montar. |
| Theming | 4/4 | Tokens centralizados y paleta oscura coherente. |
| Responsive | 3/4 | Hay variantes móviles, pero varios controles son menores de 44 px. |
| Integridad de implementación | 3/4 | Sistema específico y detector limpio; el build de producción falla. |
| **Total** | **15/20** | **Bueno; atender los puntos débiles antes de publicar.** |

## Veredicto de integridad

**Pasa en coherencia del producto.** La implementación expresa el propósito de PokeTypes: responde preguntas concretas de ataque, defensa, equipo y VS. El detector mecánico de Impeccable no encontró hallazgos (`[]`). La arquitectura mantiene la lógica de dominio fuera de React y los tests de dominio pasan.

El estado no es publicable todavía porque `npm run build` termina con `PageNotFoundError` para `/_error` o `/_document`, después de compilar y generar 1.376 páginas.

## Hallazgos por severidad

### P0 — Bloqueante

#### El build de exportación estática falla

- **Ubicación:** `npm run build`; `next.config.ts:3-8` (`output: 'export'`).
- **Categoría:** Integridad de implementación.
- **Evidencia:** TypeScript compila y Next genera 1.376 páginas, pero el comando termina con código 1 y `PageNotFoundError` para `/_error` o `/_document`.
- **Impacto:** no existe una salida de producción validada para desplegar.
- **Recomendación:** aislar el fallo de exportación de Next, revisar la generación de páginas de error y agregar un smoke test de build en CI.
- **Comando sugerido:** `$impeccable harden`.

### P1 — Mayores

#### Faltan landmarks `<main>` en rutas de resultados y herramientas

- **Ubicación:** `src/components/ResultView.tsx:34`, `src/components/TeamBuilder.tsx:113`, `src/components/VsPanel.tsx:105`.
- **Categoría:** Accesibilidad.
- **Impacto:** la navegación por landmarks queda incompleta; el skip link aterriza en un `div` genérico en vez del contenido principal.
- **Estándar:** WCAG 1.3.1 y 2.4.1.
- **Recomendación:** usar un `<main>` por superficie y convertirlo en destino de “Saltar al contenido”.
- **Comando sugerido:** `$impeccable harden`.

#### El combobox no expone el resultado activo ni los estados de carga

- **Ubicación:** `src/components/SearchBox.tsx:136-219`.
- **Categoría:** Accesibilidad.
- **Impacto:** las flechas cambian el resaltado visual, pero un lector de pantalla no recibe `aria-activedescendant`; tampoco se anuncian carga, cantidad de resultados o “sin coincidencias”.
- **Estándar:** WCAG 4.1.2 y 4.1.3.
- **Recomendación:** añadir IDs a las opciones, `aria-activedescendant`, `aria-busy` y una región viva para estados del buscador.
- **Comando sugerido:** `$impeccable harden`.

### P2 — Menores

#### Objetivos táctiles inferiores a 44 px

- **Ubicación:** `src/components/SiteHeader.tsx:23`, `src/components/ResultTabs.tsx:29`, `src/components/TypeChip.tsx:16`, botones de borrar/cambiar en `SearchBox`, `TeamBuilder` y `VsPanel`.
- **Categoría:** Responsive / Accesibilidad.
- **Impacto:** controles más difíciles de accionar en pantallas táctiles pequeñas.
- **Estándar:** buena práctica de target táctil; WCAG 2.5.8 permite excepciones desde 24 px, pero 44 px sigue siendo el objetivo operativo recomendado.
- **Recomendación:** ampliar el área interactiva a 44 px manteniendo el contenido visual compacto.
- **Comando sugerido:** `$impeccable adapt`.

#### El índice de búsqueda se descarga inmediatamente en `/equipo` y `/vs`

- **Ubicación:** `src/components/TeamBuilder.tsx:47`, `src/components/VsPanel.tsx:82`.
- **Categoría:** Rendimiento.
- **Impacto:** se descarga aproximadamente el índice de 78 KB aunque el usuario aún no haya interactuado.
- **Recomendación:** compartir una carga diferida con `SearchBox` o solicitar el índice sólo al existir query/interacción.
- **Comando sugerido:** `$impeccable optimize`.

#### El comando de lint no es automatizable en un checkout limpio

- **Ubicación:** `package.json:10` (`next lint`).
- **Categoría:** Integridad de implementación.
- **Impacto:** `npm run lint` abre el asistente de configuración de ESLint y termina con código 1; además, `next lint` está deprecated.
- **Recomendación:** migrar a ESLint CLI con configuración versionada.
- **Comando sugerido:** `$impeccable harden`.

### P3 — Pulido

#### Reducción de movimiento demasiado global

- **Ubicación:** `src/app/globals.css:160-168`.
- **Categoría:** Accesibilidad / Motion.
- **Impacto:** fuerza todas las transiciones a `0.01ms`; actualmente afecta sobre todo el feedback de color.
- **Recomendación:** limitar la regla a animaciones concretas y conservar estados visuales claros.
- **Comando sugerido:** `$impeccable animate`.

## Patrones sistémicos

- El sistema de color está bien centralizado; no se detectó deriva de colores en componentes.
- Los controles pequeños se repiten en header, tabs, chips y acciones compactas.
- La carga del índice tiene dos estrategias distintas: diferida en `SearchBox`, inmediata en las herramientas.
- Las superficies comparten header/footer, pero no comparten un landmark principal consistente.

## Hallazgos positivos

- Detector Impeccable: sin hallazgos.
- Tests: 80/80 pasan en 3 archivos.
- `:focus-visible`, skip link, labels ARIA, botones semánticos y `<details>` nativos están presentes.
- Sprites decorativos correctamente ocultos para lectores de pantalla, con dimensiones fijas, `loading="lazy"` y `decoding="async"`.
- La matriz de equipo tiene una adaptación móvil específica y las pestañas de resultados evitan comprimir dos vistas complejas.
- La paleta usa tokens, `color-scheme: dark` y contrastes muestreados por encima de AA para textos y severidades principales.

## Acciones recomendadas

1. **P0 — `$impeccable harden`:** resolver el fallo de exportación estática y validar `npm run build`.
2. **P1 — `$impeccable harden`:** añadir landmarks `<main>` y corregir el skip link.
3. **P1 — `$impeccable harden`:** completar la semántica accesible del combobox.
4. **P2 — `$impeccable adapt`:** ampliar objetivos táctiles.
5. **P2 — `$impeccable optimize`:** unificar y diferir la carga del índice.
6. **P2 — `$impeccable harden`:** migrar el lint a una configuración no interactiva.
7. **P3 — `$impeccable animate`:** ajustar `prefers-reduced-motion`.
8. **Final — `$impeccable polish`:** pasada de calidad después de los fixes.

Repetir `$impeccable audit` después de corregir los hallazgos.
