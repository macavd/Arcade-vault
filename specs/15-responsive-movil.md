# SPEC 15 — Layout responsive y orientación en móvil

> **Status:** Draft
> **Depends on:** SPEC 13
> **Date:** 2026-11-04
> **Objective:** Que todo Arcade Vault se vea y se use bien en móvil, con foco en el reproductor del juego (`.crt`/`.crt-screen`) y el aviso de orientación horizontal que SPEC 13 dejó explícitamente diferidos, más el esquema táctil pendiente de `ranaria` y varios retoques menores de layout.

---

## Por qué existe esta spec

SPEC 13 (Implementado) resolvió el **input** táctil para jugar en móvil: un overlay de React (`app/components/games/TouchControls.tsx`) que sintetiza sobre `window` los mismos `KeyboardEvent` que ya leen los motores, con detección de dispositivo táctil vía `matchMedia("(pointer: coarse)")` (SSR-safe, con `useSyncExternalStore`) y la barrera CSS `@media (pointer: fine)` que oculta el overlay en desktop. Esa capa funciona y no se toca aquí.

Pero SPEC 13 dejó fuera de alcance **el layout**, y lo dijo por escrito en su Scope Out, sus Decisions y sus Risks: _"Reajuste responsive del `.crt-screen` para pantallas pequeñas y aviso de 'gira el teléfono a horizontal' (orientación). Queda para otra spec."_ **Esta es esa otra spec.**

El agujero principal es el **reproductor**, con geometría fija que no encoge en portrait, y la **ausencia de un `viewport` explícito** en `app/layout.tsx`. Lo secundario son retoques puntuales (leaderboard del detalle, footer). Y hay un hueco heredado del reciente alta de **`ranaria` (Frogger)**: su motor ya está registrado y se juega por el reproductor genérico, pero **no está en `TOUCH_MAP`**, así que hoy en móvil no tiene botones táctiles (a diferencia de rocas/caida/bloque-buster/serpentina).

### Estado de partida por superficie (auditoría estática, Paso 1)

- **Viewport (`app/layout.tsx`)** — No existe `export const viewport`. El sitio depende del viewport por defecto del navegador; falta `width=device-width, initial-scale=1` y `viewportFit` para el área de juego. El footer lleva `padding: "20px 32px"` inline sin reducción en móvil.
- **Reproductor (`app/globals.css`, `app/components/GamePlayer.tsx`)** — `.crt` tiene `padding: 24px`, `border-radius: 28px` y tres anillos de `box-shadow` (`0 0 0 6px`, `0 0 0 7px`, sombra proyectada) fijos. `.crt-screen` es `aspect-ratio: 4 / 3` con `border-radius: 12px / 28px`. El único override de `@media (max-width: 720px)` que toca el reproductor reduce `.av-player` a `padding: 0 16px 32px`; **no** reduce el padding ni los radios del `.crt`. En portrait estrecho el marco come ancho útil y la pantalla 4/3 puede provocar scroll o recorte. El canvas interno de los motores (incluido `ranaria`, 800×600, 4/3) se monta con `width:100%/height:100%` dentro de `.crt-screen`, así que hereda su caja: si la caja encaja bien, el canvas escala solo.
- **Overlay táctil (`app/globals.css`)** — `.touch-controls` fija `--tc-size: 58px`, `--tc-gap: 8px` e `inset: 24px`, con el comentario explícito _"mismo recuadro que el padding de .crt"_. Es decir, el overlay está **acoplado** al `padding: 24px` del `.crt`: si se reduce uno sin el otro, el d-pad y los botones de acción se descolocan respecto a la pantalla. En pantallas muy chicas, botones de 58px en cruz + acciones ocupan una fracción grande del área de juego (el propio Risk de SPEC 13).
- **Esquema táctil de `ranaria` (`app/lib/games/touch-map.ts`)** — `TOUCH_MAP` tiene `rocas`, `caida`, `bloque-buster` y `serpentina`, pero **no `ranaria`**. Su motor (`app/lib/games/ranaria/engine.ts`) lee `onKeyDown` por `e.code`: `ArrowUp/KeyW`, `ArrowDown/KeyS`, `ArrowLeft/KeyA`, `ArrowRight/KeyD` → saltos discretos en 4 direcciones (no hay `keyup`; cada pulsación es un salto). Encaja exactamente en un d-pad de 4 direcciones en modo **tap** (`hold: false`), idéntico en forma al de `serpentina`, con `code`/`key` = `Arrow*`.
- **Leaderboard del detalle (`app/globals.css`, `.lb-row`)** — `grid-template-columns: 36px 1fr 110px` con `padding: 10px 16px`, sin ningún `@media` que lo reduzca en pantallas chicas. En portrait estrecho queda apretado (columna de score fija de 110px).
- **Nav (`app/components/Nav.tsx`)** — Hamburguesa a `@media (max-width: 840px)` que oculta `.links`/`.coin-counter` y muestra `.hamburger` + panel `.av-mobile-panel` con backdrop. **Funciona; no se rediseña.**
- **Home / `/games` / Salón / About** — Cubren móvil con breakpoints existentes (`clamp()` en títulos de home; `.av-grid` auto-fill `minmax(280px,1fr)` con `padding` reducido a `≤720px`; `.hall-table` con override de columnas/fuente a `≤720px`; about con breakpoints 820/900px). No se detectan desbordes; se auditan para confirmar y se heredan tal cual.

---

## Scope

**In:**

- **Viewport explícito** en `app/layout.tsx`: `export const viewport` con `width=device-width, initial-scale=1` y `viewportFit` para el área de juego.
- **Rescalado del reproductor** en pantallas chicas: reducir `padding`, `border-radius` y los anillos de `box-shadow` de `.crt`, y los radios de `.crt-screen`, para que la pantalla 4/3 encaje en ancho portrait sin scroll horizontal ni recorte, conservando el look CRT.
- **Coordinación del overlay táctil** con el nuevo padding del `.crt`: `--tc-size`, `--tc-gap` e `inset` de `.touch-controls` deben moverse en sincronía con el `padding` del `.crt` para que el d-pad siga anclado a la pantalla.
- **Sizing táctil en pantallas muy chicas**: reducir `--tc-size`/`--tc-gap` para mitigar el solape del overlay con el área de juego que SPEC 13 reconoce en sus Risks.
- **Aviso de orientación**: UX de "gira el teléfono a horizontal" alrededor de `GamePlayer.tsx`, reusando la detección `pointer: coarse` existente para no mostrarlo en desktop.
- **Esquema táctil de `ranaria`**: añadir su entrada a `TOUCH_MAP` como d-pad de 4 direcciones en modo `tap` (igual forma que `serpentina`), para que tenga botones en móvil como el resto de juegos jugables.
- **Retoques menores**: override pequeño de `.lb-row` del detalle y reducción del `padding` del footer en móvil; verificar el min-column de `.av-grid` en pantallas muy estrechas.
- **Delegación del afinado visual/breakpoints a `/frontend-design`** dentro del plan.

**Out of scope (para futuras specs):**

- Cualquier cambio al **input táctil** de SPEC 13 (despachador de teclas, arrastre de pala de bloque-buster, detección `pointer: coarse`): se reutiliza intacto. `ranaria` solo añade su fila de datos a `TOUCH_MAP`; la mecánica de síntesis ya existente no se toca.
- Nuevos componentes o motores de juego.
- Pantalla completa (Fullscreen API), PWA/instalable, vibración/haptics y audio, salvo que la usuaria los pida.
- Rediseño del nav, del HUD o de los breakpoints que ya funcionan (home, /games, salón, about).

---

## Data model

**N/A.** Esta spec **no toca Supabase** ni introduce estructuras persistentes. El único dato nuevo es una entrada declarativa en `app/lib/games/touch-map.ts` (`TOUCH_MAP["ranaria"]`), que reutiliza los tipos `TouchAction`/`TouchScheme` ya definidos por SPEC 13; no hay tabla, columna ni tipo generado que cambiar.

---

## Implementation plan

Cada paso deja la app compilando y navegable.

1. **Viewport explícito.** En `app/layout.tsx`, añadir `export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" }` (importando `Viewport` de `next`), sin tocar `metadata`. Confirma el comportamiento de zoom/escala en móvil. El `viewportFit` prepara el área de juego para pantallas con notch.
2. **Rescalado del reproductor.** En `app/globals.css`, dentro de un breakpoint de pantalla chica (valor exacto a afinar por `/frontend-design`), reducir `padding`, `border-radius` y los anillos de `box-shadow` de `.crt`, y los radios de `.crt-screen`, para que la pantalla 4/3 encaje en el ancho portrait sin scroll horizontal ni recorte. Conservar las capas `::before`/`::after` (scanlines, viñeta, glow) del look CRT. No cambiar el `aspect-ratio: 4/3` (el canvas de los motores lo hereda).
3. **Coordinar el overlay táctil.** En el mismo breakpoint, ajustar `--tc-size`, `--tc-gap` e `inset` de `.touch-controls` en sincronía con el nuevo `padding` del `.crt`, de modo que el d-pad y los botones de acción sigan anclados al borde de la pantalla y no se descoloquen. Mantener el área táctil usable (objetivo ≥44px salvo en las pantallas más estrechas, donde prime no tapar el juego). No se toca `TouchControls.tsx` para esto; es puramente CSS.
4. **Esquema táctil de `ranaria`.** En `app/lib/games/touch-map.ts`, añadir `TOUCH_MAP["ranaria"]` con cuatro botones en `tap` (`hold: false`), slots `dpad-up/down/left/right`, `code` y `key` = `ArrowUp/ArrowDown/ArrowLeft/ArrowRight` (el motor lee `e.code`; fijar también `key` por consistencia con el resto). Mismo patrón exacto que `serpentina`. Sin tocar `TouchControls.tsx` ni el engine: el overlay ya renderiza cualquier entrada de `TOUCH_MAP`.
5. **Aviso de orientación.** En `app/components/GamePlayer.tsx`, mostrar un aviso "gira el teléfono a horizontal" cuando el dispositivo sea táctil (`pointer: coarse`, reusando la misma detección SSR-safe de SPEC 13 — extraer un hook compartido `useCoarsePointer` si conviene, sin alterar su semántica) **y** esté en portrait (`matchMedia("(orientation: portrait)")`). En desktop (`pointer: fine`) nunca aparece. El aviso debe poder descartarse o desaparecer al rotar, sin bloquear permanentemente el juego (ver Decisions). Estilo CRT oscuro, afinado por `/frontend-design`.
6. **Retoques menores.** En `app/globals.css`, añadir un override pequeño de `.lb-row` del detalle (reducir la columna de score fija y/o el padding en portrait) y reducir el `padding` del footer en móvil (hoy inline en `app/layout.tsx`: moverlo a una clase si hace falta para poder aplicar el breakpoint). Verificar el `minmax(280px,1fr)` de `.av-grid` en pantallas <300px.
7. **Afinado visual con `/frontend-design`.** Delegar a `/frontend-design` los valores exactos: breakpoint(s) de pantalla chica, `padding`/`border-radius`/anillos del `.crt` reducidos, `--tc-size`/`--tc-gap`/`inset` coordinados, y el acabado neón del aviso de orientación — todo conservando el tema CRT oscuro (único tema del sitio).
8. **Verificación** en emulación móvil del navegador (portrait y landscape, varios anchos) y, si es posible, en un teléfono real (ver Acceptance criteria).

> No se regenera `database.types.ts` ni se corre `get_advisors`: esta spec no toca Supabase.

---

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de tipos de ruta.
- [ ] En viewport móvil portrait, el reproductor (`.crt`/`.crt-screen`) cabe en ancho sin scroll horizontal ni recorte; el marco CRT y sus scanlines/glow siguen visibles.
- [ ] El `export const viewport` existe en `app/layout.tsx` y el sitio escala correctamente (sin zoom-out involuntario) en un teléfono.
- [ ] En `pointer: coarse` + portrait aparece el aviso "gira a horizontal"; al rotar a landscape desaparece y se puede jugar. En desktop (`pointer: fine`) el aviso **no** aparece nunca.
- [ ] En un dispositivo táctil, `/jugar/ranaria` muestra un d-pad de 4 direcciones y la rana salta arriba/abajo/izquierda/derecha solo con la pantalla (como `serpentina`).
- [ ] El overlay táctil queda anclado al borde de la pantalla tras el rescalado (d-pad y acciones alineados, sin descolocarse) y, en pantallas muy chicas, no tapa de forma injugable el área de juego.
- [ ] El teclado físico y el desktop siguen intactos en `pointer: fine`: reproductor, HUD, selector de tema y modales se ven y funcionan como hoy.
- [ ] El leaderboard del detalle (`.lb-row`) y el footer se leen sin desbordes en portrait estrecho.
- [ ] Ningún archivo bajo `app/lib/games/<slug>/engine.ts` aparece modificado en el diff; `TouchControls.tsx` solo cambia si se extrae el hook `useCoarsePointer` (sin alterar su semántica).

---

## Decisions

- **Sí:** reutilizar intacta la capa de input táctil de SPEC 13; esta spec es solo layout + orientación + la fila de datos de `ranaria`.
- **Sí:** `ranaria` recibe un d-pad de 4 direcciones en `tap` (`hold: false`), idéntico en forma a `serpentina`, porque su motor hace saltos discretos por pulsación (`onKeyDown`, sin `keyup`).
- **Sí:** coordinar `--tc-size`/`--tc-gap`/`inset` del overlay con el `padding` del `.crt` en el mismo breakpoint, porque hoy están acoplados por diseño ("mismo recuadro que el padding de .crt").
- **Sí:** reusar la detección `pointer: coarse` de SPEC 13 para que el aviso de orientación nunca salga en desktop; combinarla con `matchMedia("(orientation: portrait)")`.
- **No:** bloquear el juego de forma permanente con el aviso de orientación; debe ceder al rotar o poder descartarse, para no ser molesto (algunos juegos 4/3 son jugables en portrait).
- **No:** forzar landscape por API (Screen Orientation lock) ni pantalla completa; se queda como aviso suave. Si se quiere lock/fullscreen, va en otra spec.
- **No:** rediseñar nav, HUD ni los breakpoints que ya funcionan (home, /games, salón, about); se heredan.
- **No:** tocar Supabase, catálogo, leaderboard (datos) ni el sistema de skins.
- **Supuesto:** el `aspect-ratio: 4/3` del `.crt-screen` se mantiene en todos los tamaños; el rescalado actúa sobre el marco (padding/radios/sombras), no sobre la proporción de la pantalla, para que el canvas de los motores no se deforme.

---

## Risks

| Riesgo                                                                                      | Mitigación                                                                                                                                                     |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Regresión en desktop: tocar `.crt`/`.touch-controls` rompe el layout en `pointer: fine`.    | Encerrar los cambios en breakpoints de ancho chico; la barrera `@media (pointer: fine)` sigue ocultando el overlay; criterio de aceptación de desktop intacto. |
| Overlay táctil desacoplado del nuevo padding: el d-pad se descoloca respecto a la pantalla. | Mover `--tc-size`/`--tc-gap`/`inset` en el mismo breakpoint que el `padding` del `.crt`; verificar anclaje en el criterio de aceptación.                       |
| Canvas deformado al rescalar el reproductor.                                                | No tocar el `aspect-ratio: 4/3`; el rescalado solo afecta marco/radios/sombras; el canvas sigue a `width/height:100%` de la caja.                              |
| Aviso de orientación molesto o que impide jugar.                                            | Cede al rotar / descartable, nunca bloqueo permanente; solo en `pointer: coarse` + portrait; nunca en desktop.                                                 |
| Desajuste de hidratación al leer orientación/pointer (no existen en SSR).                   | Reusar el patrón SSR-safe de SPEC 13 (`useSyncExternalStore` con snapshot de servidor `false`); el aviso aparece solo tras el montaje.                         |
| `ranaria` sin `keyup`: un `tap` que emita `keyup` podría no hacer nada o interferir.        | El overlay ya emite keydown+keyup en `tap`; el motor ignora `keyup` (solo tiene `onKeyDown`), así que es inocuo. Igual que `serpentina`.                       |

---

## Qué **no** está en esta spec

- Cualquier cambio al despachador de teclas, al arrastre de pala de bloque-buster o a la detección táctil de SPEC 13 (se reutilizan).
- Modificar cualquier `engine.ts`, incluido `ranaria` (solo se añade su fila a `TOUCH_MAP`).
- Pantalla completa, bloqueo de orientación por API, PWA, vibración/haptics y audio.
- Rediseño del nav, del HUD, del selector de tema o de los breakpoints de home/ /games/salón/about.
- Nuevos juegos, skins o cualquier cambio en Supabase, catálogo o leaderboard (datos).

Cada uno de esos, si llega, va en su propia spec.
</content>
