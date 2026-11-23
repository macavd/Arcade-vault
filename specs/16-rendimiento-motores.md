# SPEC 16 — Rendimiento de los juegos (loop de canvas y compositing CRT)

> **Status:** Implementado
> **Depends on:** SPEC 05, SPEC 07, SPEC 08, SPEC 09, (motor de ranaria)
> **Date:** 2026-11-23
> **Objective:** Recuperar 60 fps estables en los cinco juegos de canvas atacando la causa sistémica —el compositing de las capas CRT/fondo sobre un canvas que repinta cada frame— y afinando el coste por motor, con medición antes/después y degradación en móvil.

---

## Por qué existe esta spec

El síntoma reportado es "problemas de performance en el juego de frogger y posiblemente en los demás". El "y en los demás" es la pista: el motor de `ranaria` (`app/lib/games/ranaria/engine.ts`) está sano (estado en closure, `dt` con tope anti-spiral `DT_CAP`, callbacks espejados que solo emiten ante cambios). Si el problema también se percibe en otros juegos, el cuello de botella está en la **capa compartida que envuelve a todos los motores**, no en la lógica de cada uno.

El diagnóstico estático detecta tres focos:

1. **Overlays CRT sobre el canvas (`app/globals.css`).** El `<canvas>` repinta a 60 fps dentro de `.crt-screen`, y sobre él hay dos pseudo-elementos superpuestos: `.crt-screen::after` (scanlines con `mix-blend-mode: multiply`) y `.crt-screen::before` (viñeta radial). Un `mix-blend-mode` obliga al navegador a **recomponer** esa región mezclando con lo que hay debajo cada vez que el canvas cambia; es decir, en cada frame. Además el canvas se abre transparente (ver foco 3), así que compone con todas las capas inferiores.

2. **Capas de fondo globales activas durante el juego (`app/components/ArcadeBackground.tsx` + `app/globals.css`).** `ArcadeBackground` monta dos capas fijas a pantalla completa que nunca se desmontan, tampoco en `/jugar/[id]`:
   - `.av-bg::before` — rejilla en perspectiva (`transform: perspective(600px) rotateX(60deg)`, `mask-image`) con **animación infinita `gridscroll 8s linear infinite`**. Una capa `position: fixed` transformada y enmascarada que se anima de forma continua detrás del juego.
   - `.av-noise` — grano de película vía un SVG `feTurbulence` (`fractalNoise`) a pantalla completa (`opacity: 0.35`).
   - A esto se suma `body::after` (scanlines globales con `mix-blend-mode: overlay`, `opacity: 0.6`).
     Estas capas compiten por GPU/compositing con el loop del juego mientras se juega.

3. **Contexto de canvas transparente en los cinco motores.** Todos abren el contexto sin `{ alpha: false }`:
   `app/lib/games/ranaria/engine.ts:189`, `app/lib/games/caida/engine.ts:96`, `app/lib/games/serpentina/engine.ts:39`, `app/lib/games/asteroids/engine.ts:22`, `app/lib/games/bloque-buster/engine.ts:29`. Un canvas opaco (`alpha: false`) evita que el compositor tenga que mezclar el canvas con lo que hay debajo y suele bajar el coste de pintado, siempre que el motor pinte el frame completo cada vuelta.

Coste secundario, aceptable y **estético**: el glow por `shadowBlur` que se aplica por dibujo —la rana de `ranaria` (`engine.ts:545/549`) y, vía paleta de skin, `asteroids`/`serpentina`/`bloque-buster`—. `shadowBlur` es caro, pero forma parte del look y lo definen los skins; aquí solo se **condiciona/reduce en móvil**, no se elimina.

Hoy no hay forma de medir: no existe instrumentación de fps/frame-time. Sin medición, "va más fluido" no es verificable. Por eso el primer paso es instrumentar.

La usuaria cerró cuatro decisiones en la fase de preguntas: alcance = **capa compartida + los cinco motores**; foco = **ambos, priorizando móvil**; efectos CRT = **se pueden reducir/condicionar sin perder el look**; criterio = **60 fps estable + sin drops medibles**.

---

## Scope

**In:**

- **Instrumentación de rendimiento (solo desarrollo):** un overlay o log de frame-time/fps activable por flag (p. ej. `?debug=perf` o variable de entorno de dev), que no aparece en producción, para medir antes/después en cada juego.
- **Compositing de los overlays CRT:** reducir el coste de recomposición por frame de `.crt-screen::after` (scanlines `mix-blend-mode`) y `.crt-screen::before` (viñeta), p. ej. aislando el canvas en su propia capa (`isolation`/`contain`/`will-change`) o sustituyendo `mix-blend-mode` por una alternativa barata que conserve el aspecto.
- **Capas de fondo globales durante el juego:** abaratar el trabajo de `.av-bg::before` (rejilla animada `gridscroll`), `.av-noise` (SVG `feTurbulence`) y `body::after` mientras se juega — p. ej. pausar la animación de la rejilla y/o aplicar `content-visibility`, hacer el grano estático o más barato, sin tocar su aspecto en el resto del sitio.
- **Canvas opaco:** pasar `getContext("2d", { alpha: false })` en los cinco motores, **tras verificar** que cada uno pinta el fondo completo cada frame (si alguno no lo hiciera, se añade el relleno de fondo antes de activar `alpha`).
- **Degradación en móvil y `prefers-reduced-motion`:** `@media (pointer: coarse)` y `@media (prefers-reduced-motion: reduce)` que reduzcan scanlines/ruido/animaciones de fondo y el `shadowBlur` de los motores en hardware débil, conservando la identidad neón/CRT.
- **Delegación del afinado visual a `/frontend-design`:** valores exactos (qué `mix-blend-mode` se sustituye y por qué, opacidades degradadas, `shadowBlur` reducido) los fija `/frontend-design` conservando el tema CRT oscuro.
- **Medición final** con la instrumentación en desktop y en emulación móvil (y, si es posible, en móvil real).

**Out of scope (para futuras specs):**

- Reescribir la **lógica** de cualquier motor (física, colisiones, reglas de juego). Solo se tocan el modo del contexto y, acotado, el `shadowBlur`.
- Técnicas de dibujo mayores: dirty-rects, dobles canvas (fondo estático + capa dinámica), `OffscreenCanvas`, WebGL. Si tras esta spec se necesita más, van en otra.
- Escalado por `devicePixelRatio` del canvas (hoy se renderiza a resolución interna fija 800×600 y se escala por CSS; subir la resolución sería más coste, no menos).
- Cualquier cambio a Supabase, catálogo, leaderboard, skins (sistema) o al input táctil de SPEC 13.
- Rediseño del layout responsive (eso es SPEC 15).

---

## Data model

**N/A.** Esta spec **no toca Supabase** ni introduce estructuras persistentes. No cambia `database.types.ts`. El único "dato" nuevo es un flag de desarrollo para activar la instrumentación de fps; no se persiste.

---

## Implementation plan

Cada paso deja la app compilando y navegable. Los valores visuales exactos se delegan a `/frontend-design` (paso 7); los pasos describen el cambio, no los números finales.

1. **Instrumentar.** Añadir una medición de frame-time/fps activable solo en desarrollo (flag `?debug=perf` o equivalente, nunca visible en producción). Debe mostrar el frame-time medio y los picos. Medir y anotar el estado de partida de los cinco juegos (desktop y emulación móvil) **antes** de optimizar. Esta línea base es la referencia del criterio de aceptación.
2. **Canvas opaco.** En cada motor (`ranaria`, `caida`, `serpentina`, `asteroids`, `bloque-buster`), verificar que `draw` pinta el fondo completo del canvas cada frame; donde lo haga, cambiar `getContext("2d")` por `getContext("2d", { alpha: false })`. Si algún motor no rellena el fondo, añadir ese relleno antes de activar `alpha`. Medir el delta con la instrumentación.
3. **Aislar el canvas del compositing CRT.** En `app/globals.css`, promover el canvas (o `.crt-screen`) a su propia capa de compositing (`isolation: isolate` / `contain: paint` / `will-change` según mida mejor) de modo que el repintado del canvas no fuerce recomponer `.crt-screen::after`/`::before` cada frame. Si el aislamiento no basta, sustituir el `mix-blend-mode: multiply` de las scanlines por una alternativa barata (p. ej. un degradado con opacidad) que conserve el aspecto. No cambiar el `aspect-ratio: 4/3`.
4. **Abaratar las capas de fondo durante el juego.** Reducir el coste de `.av-bg::before` (pausar `gridscroll` y/o `content-visibility` cuando no aporta), `.av-noise` (grano estático o más barato) y `body::after`, sin alterar su aspecto fuera del reproductor. Priorizar que, mientras se juega, el fondo no compita con el loop.
5. **Degradación móvil y reduced-motion.** Añadir `@media (pointer: coarse)` y `@media (prefers-reduced-motion: reduce)` que reduzcan scanlines/ruido/animaciones de fondo y el `shadowBlur` de los motores (exponer el glow como algo atenuable en móvil, sin eliminar el look). En `pointer: fine` sin reduced-motion, el aspecto de desktop se mantiene.
6. **Acotar el glow de los motores.** Donde el `shadowBlur` por dibujo pese en la medición (rana de `ranaria`; glow de skin en `asteroids`/`serpentina`/`bloque-buster`), reducirlo o condicionarlo en móvil. Es un ajuste de valor/condición, no una reescritura de la lógica de dibujo.
7. **Afinado visual con `/frontend-design`.** Delegar los valores exactos: qué `mix-blend-mode` se sustituye y por qué, opacidades y animaciones degradadas en móvil/reduced-motion, y `shadowBlur` reducido — todo conservando el tema CRT oscuro (único tema del sitio).
8. **Medición final y verificación.** Con la instrumentación, comparar contra la línea base del paso 1 en los cinco juegos, en desktop y emulación móvil (portrait y landscape) y, si es posible, en un móvil real.

> No se regenera `database.types.ts` ni se corre `get_advisors`: esta spec no toca Supabase.

---

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de tipos de ruta; `npm run lint` pasa.
- [ ] Existe una medición de fps/frame-time activable solo en desarrollo y **no visible en producción**.
- [ ] Con la instrumentación, los cinco juegos (`ranaria`, `caida`, `serpentina`, `rocas`/asteroids, `bloque-buster`) mantienen ~16 ms/frame (≈60 fps) en desktop durante el juego, sin drops sostenidos, y mejoran de forma medible respecto a la línea base del paso 1.
- [ ] Los cinco motores abren el contexto con `{ alpha: false }` y no aparecen artefactos visuales (ni "estelas" ni fondo transparente) en ninguno.
- [ ] En emulación móvil (y móvil real si está disponible), el juego es claramente más fluido que la línea base; con hardware débil nunca baja de forma sostenida de 30 fps.
- [ ] Con `prefers-reduced-motion: reduce` y en `pointer: coarse`, scanlines/ruido/animaciones de fondo y glow están atenuados; en `pointer: fine` sin reduced-motion el aspecto de desktop se conserva.
- [ ] El marco CRT, scanlines, viñeta y glow siguen reconocibles (no se pierde la identidad neón/CRT) en desktop.
- [ ] No hay cambios en la **lógica** de ningún motor: el diff de cada `engine.ts` se limita al modo del contexto y, como mucho, al valor/condición del `shadowBlur`.
- [ ] Ningún archivo bajo `app/lib/db/`, `app/api/` ni `database.types.ts` aparece modificado.

---

## Decisions

- **Sí:** instrumentar primero. Sin frame-time medido, "va más fluido" no es un criterio verificable; la línea base del paso 1 es la referencia del 60 fps.
- **Sí:** alcance = capa compartida + los cinco motores (decisión de la usuaria). El "y posiblemente los demás" apunta a la capa común, no a la lógica de cada juego.
- **Sí:** `getContext("2d", { alpha: false })` en los cinco motores, porque el canvas es opaco (pinta el frame completo) y así el compositor no lo mezcla con las capas inferiores.
- **Sí:** reducir/condicionar los efectos CRT sin perder el look (decisión de la usuaria): se permite aislar el canvas y sustituir `mix-blend-mode` por alternativas baratas, y degradar en móvil/reduced-motion.
- **Sí:** degradación con foco en móvil, porque el compositing CRT pesa mucho más en GPUs móviles (es el peor caso).
- **No:** reescribir la lógica de los motores. `ranaria` ya está sano; el problema es sistémico. Solo se tocan contexto y glow.
- **No:** dirty-rects, doble canvas, `OffscreenCanvas` o WebGL en esta spec. Son el siguiente escalón si tras medir no basta; irían en su propia spec para no sobredimensionar este trabajo.
- **No:** escalar el canvas por `devicePixelRatio`. Subir la resolución interna añade coste; el objetivo aquí es quitarlo.
- **No:** tocar Supabase, catálogo, leaderboard, el sistema de skins o el input táctil de SPEC 13.
- **Supuesto:** el aspecto neón/CRT es identidad del sitio; cualquier sustitución de efecto debe conservarlo en desktop y solo degradarse visiblemente en móvil/reduced-motion.

---

## Risks

| Riesgo                                                                            | Mitigación                                                                                                                                               |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `alpha: false` en un motor que no rellene todo el frame → artefactos o "estelas". | Verificar en el paso 2 que cada motor pinta el fondo completo cada frame; si no, añadir el relleno antes de activar `alpha`.                             |
| Sustituir `mix-blend-mode` cambia visiblemente las scanlines/viñeta en desktop.   | Preferir primero aislar el canvas (el blend se queda); solo sustituir si hace falta, y afinar el reemplazo con `/frontend-design` para igualar el look.  |
| Pausar `gridscroll` o tocar el fondo se nota en el resto del sitio.               | Degradar solo donde paga (durante el juego / móvil / reduced-motion); conservar el aspecto en desktop fuera del reproductor.                             |
| La optimización no alcanza 60 fps en móvil de gama baja.                          | Criterio de móvil acotado a "nunca por debajo de 30 fps sostenido"; si falta, documentar el siguiente escalón (dirty-rects/doble canvas) para otra spec. |
| La instrumentación se filtra a producción.                                        | Activable solo por flag de desarrollo; criterio de aceptación exige que no sea visible en producción.                                                    |
| Reducir `shadowBlur` apaga demasiado el glow.                                     | Condicionarlo por media query (móvil/reduced-motion); en desktop se conserva el valor actual de cada skin.                                               |

---

## Qué **no** está en esta spec

- Reescritura de la lógica de los motores (física, colisiones, reglas).
- Dirty-rects, doble canvas (fondo + dinámico), `OffscreenCanvas`, WebGL, escalado por `devicePixelRatio`.
- Cambios en Supabase, catálogo, leaderboard, sistema de skins o input táctil de SPEC 13.
- Rediseño del layout responsive/orientación (eso es SPEC 15).

Cada uno de esos, si llega, va en su propia spec.
