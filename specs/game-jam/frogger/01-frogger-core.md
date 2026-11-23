# SPEC — Frogger (RANARIA): motor jugable sobre la maqueta `ranaria`

> **Estado:** Implementado
> **Depende de:** 05-rocas-juego-asteroides, 06-games-table-leaderboard-supabase, 09 (serpentina)
> **Fecha:** 2026-05-20 · **Adaptada:** 2026-11-04
> **Objetivo:** Convertir la maqueta `ranaria` (Frogger, ya presente en el catálogo y el leaderboard desde SPEC 06) en un juego jugable, portando un motor `GameFactory` de Frogger a `app/lib/games/ranaria/engine.ts` y registrándolo — reusando el patrón de motor de SPEC 05 / SPEC 09, sin crear un slug nuevo ni tocar Supabase.

---

## Nota de adaptación (2026-11-04)

Este spec lo generó el subagente `game-jam` asumiendo una arquitectura que **no existe en este repo** (un componente React `FroggerGame.tsx` con el game loop dentro, una ruta estática `app/games/frogger/play`, y un slug nuevo `frogger`). La arquitectura real de Arcade Vault es: motores `GameFactory` en `app/lib/games/<slug>/engine.ts` que devuelven un `GameEngine` cableado a `GameCallbacks`, registrados por slug en `app/lib/games/registry.ts` y montados por el genérico `app/components/games/CanvasGame.tsx` desde el reproductor `app/jugar/[id]`. Además el catálogo **ya tiene** una fila `ranaria` (un Frogger) sembrada por SPEC 06, con portada `.cover-rana` y 12 filas en `scores`.

Por eso este spec se reescribe para:

- Usar el slug **`ranaria` existente** (no crear `frogger`): evita duplicar el juego y respetar la unicidad del catálogo. **No toca Supabase** (ni `games` ni `scores`).
- Implementar un **motor `GameFactory`** en `app/lib/games/ranaria/engine.ts` (no un componente React con loop propio) y registrarlo; el reproductor genérico, el HUD React, el modal de fin, el guardado de score y los controles táctiles ya existen y lo recogen por `id`.
- Canvas **`800×600`**, rejilla **`16×12` de 50px** (encaja con `aspect-ratio: 4/3` del `.crt-screen`; un canvas casi cuadrado se deformaría).

Consolida el draft hermano `specs/game-jam/ranaria/01-motor-ranaria.md` (mismo objetivo), del que conserva las mecánicas ricas (tortugas que se sumergen, temporizador por cruce, reparto de puntos). **Única desviación respecto a ese draft:** no se construye un prototipo vanilla aparte en `references/started-games/06-frogger`; se porta el motor directamente al `engine.ts` (como describía el spec Frogger original).

---

## Scope

**In:**

- Crear `app/lib/games/ranaria/engine.ts` — `createRanariaGame: GameFactory` que cumple el contrato de `app/lib/games/types.ts` (`(canvas, callbacks, skin?) => GameEngine`), sin estado global de módulo: todo el estado vive en el closure y `canvas`/`ctx` llegan por parámetro.
- Registrar el motor en `app/lib/games/registry.ts`: `"ranaria": createRanariaGame`.
- Game loop con `requestAnimationFrame` (patrón de `serpentina`/`asteroids`): `rafId` cancelable, `dt` en segundos con tope `DT_CAP = 0.05`, `lastTime` reseteado al (re)arrancar/reanudar, `syncReactState()` que emite callbacks solo ante cambios y `onGameOver` una sola vez.
- Rejilla de **16 columnas × 12 filas** de **50px** sobre canvas **800×600**. De abajo arriba: fila 11 = acera de salida (segura), filas 10–7 = **carretera** (4 carriles de coches/camiones), fila 6 = **mediana** segura, filas 5–2 = **río** (4 carriles de troncos/tortugas), fila 1 = franja de **5 nenúfares** (home slots) con orilla mortal entre ellos, fila 0 = franja de HUD interno.
- Entidades de carretera: coches y camiones de distintas longitudes (1–3 celdas), velocidades y sentidos por carril; se mueven horizontalmente en loop continuo (al salir por un borde reaparecen por el opuesto); colisión con la rana es letal.
- Entidades de río: troncos (2–4 celdas) y grupos de tortugas (2–3); se mueven horizontalmente en loop. La rana solo sobrevive en el río si está sobre un tronco o tortugas **visibles**, y hereda el desplazamiento horizontal de la entidad que la soporta cada frame. Las tortugas alternan visible → sumergida → visible; sumergidas no dan soporte. Caer al agua (sin soporte) o ser arrastrada fuera de pantalla montada en un tronco = muerte.
- Movimiento de la rana: saltos discretos de 1 celda (50px) en 4 direcciones (↑↓←→) con flechas **y WASD**; `preventDefault` en las teclas del juego. Un salto por pulsación (sin auto-repeat efectivo: la pulsación se consume hasta el siguiente `keyup`). Animación de salto breve (~120ms). No puede salir por los bordes laterales (en acera/carretera/mediana).
- Nenúfares (fila 1): la rana llega a una de las 5 bocas; una boca ya ocupada o caer fuera de boca en esa fila = muerte. Al ocupar las 5 se completa la ronda y empieza la siguiente (más rápida).
- Temporizador por cruce (barra dibujada en el canvas): tiempo límite por intento; agotarlo = muerte. Se reinicia al alojar en un nenúfar.
- Vidas: arranca en 3. Cada muerte llama `onLives(lives)`; en la última, `onLives(0)` seguido de `onGameOver(score)`.
- Puntuación: **+10** por avanzar una fila hacia arriba por primera vez en el cruce actual, **+50** por nenúfar, **bonus de tiempo** = segundos restantes × 10 al alojar, **+1000** al completar la ronda de 5 nenúfares. Coherente con el `best = 18900` ya sembrado.
- HUD interno del canvas (patrón doble HUD): score, nivel, iconos de vida y barra de tiempo dibujados dentro del canvas, en coherencia con el HUD React de la plataforma.
- `pause()` detiene el loop; `resume()` lo reanuda sin salto de simulación (`lastTime` a null); `restart()` reinicia limpio; `destroy()` cancela el RAF y quita los listeners.
- Primitivas canvas (sin sprites bitmap externos): coches, camiones, troncos, tortugas y rana dibujados con formas geométricas y colores temáticos.

**Fuera de alcance:**

- Cualquier cambio en Supabase: la fila `games` de `ranaria` y sus `scores` ya existen (SPEC 06). No hay inserts ni migraciones.
- Rediseño de la portada `.cover-rana` (va en `02-portada-ranaria`).
- Prototipo vanilla aparte en `references/started-games/06-frogger` (se porta directo al `engine.ts`).
- Sistema de skins/paletas (el motor acepta el 3er parámetro `skin` pero puede ignorarlo de momento; `getAvailableSkins("ranaria")` sigue devolviendo `null` hasta que exista `ranaria/skins.ts`).
- Controles táctiles específicos (el overlay genérico ya existe; su mapa para `ranaria` puede añadirse en otra spec).
- Sonido, power-ups (mosca, cocodrilo), auth real / RLS, realtime.
- Tocar `CanvasGame.tsx`, `GamePlayer.tsx` ni los motores de los demás juegos.

---

## Data model

Esta spec **no toca Supabase**. El único contrato que introduce es el de motor (de `app/lib/games/types.ts`, no se redefine):

```ts
// app/lib/games/ranaria/engine.ts
export const createRanariaGame: GameFactory = (
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
  skin: GameSkin = "clasico",
): GameEngine => {
  /* ... */
};
```

**Mapeo de mecánicas → callbacks:**

- `onScore(score)` — acumulado (+10/fila, +50/nenúfar, bonus de tiempo ×10, +1000/ronda).
- `onLives(lives)` — arranca en 3; baja al morir; `onLives(0)` en la última muerte.
- `onLevel(level)` — arranca en 1; +1 al completar los 5 nenúfares.
- `onGameOver(finalScore)` — una sola vez, al perder la última vida.

Tipos locales (no exportados): `Direction`, `Lane { row; speed; dir; entities }`, `Entity { col; width; type: "car"|"truck"|"log"|"turtle"; submerged? }`, `Frog { col; row; animating; animT; targetCol; targetRow; onLog }`, `Home { col; occupied }`.

---

## Implementation plan

Cada paso deja la app compilando y navegable. Se hace una pausa tras cada paso para revisar el diff.

1. **Esqueleto del motor + registro.** Crear `app/lib/games/ranaria/engine.ts` con la fábrica, constantes de rejilla/zonas, estado del closure, ciclo de vida (`start/pause/resume/restart/destroy`), loop RAF con `dt`/`DT_CAP`/`syncReactState`, listeners de teclado (flechas + WASD) y un `draw()` mínimo (zonas de fondo + rana) para ver algo. Registrar `"ranaria": createRanariaGame` en `registry.ts`. Verificación: `/jugar/ranaria` deja de ser maqueta y pinta las zonas y la rana en la acera.

2. **Construcción de carriles** — `buildLanes(level)`: 4 carriles de carretera (velocidades/sentidos alternos, coches/camiones precargados con huecos atravesables) y 4 de río (troncos 2–4 celdas y grupos de tortugas 2–3 con ciclo de inmersión). Cada nivel escala las velocidades ~15%. `draw()` dibuja las entidades. Verificación: coches/camiones y troncos/tortugas se mueven en loop y reaparecen por el lado opuesto.

3. **Movimiento de la rana** — salto discreto de 1 celda con animación ~120ms, un salto por pulsación, bloqueo de bordes laterales, `+10` la primera vez que avanza a una fila nueva del cruce. Verificación: la rana salta celda a celda y no sale por los lados.

4. **Colisiones y soporte** — `checkRoadCollision`, `getSupport` (tronco/tortuga visible; `null` si tortuga sumergida), arrastre horizontal de la entidad soporte, muerte por agua / arrastre fuera de pantalla. Verificación: atropello mata; caer al agua mata; montar tronco arrastra a la rana.

5. **Nenúfares, ronda y temporizador** — `checkGoal` (boca libre → `+50` + bonus de tiempo; ocupada/fuera → muerte), `completeRound` (5 nenúfares → `+1000`, `level++`, `onLevel`, reconstruir carriles, reset temporizador), temporizador por cruce con muerte al agotarse. Verificación: alojar suma puntos; completar 5 sube de nivel; agotar el tiempo mata.

6. **Vidas y fin** — `killFrog` (decrementa, `onLives`, reaparece en la acera y reinicia temporizador; a 0 → `onLives(0)` + `onGameOver`, detiene el loop). Verificación: 3 vidas; el modal React aparece al perder la última; "JUGAR DE NUEVO" reinicia limpio.

7. **HUD interno + pulido visual** — score/nivel/vidas/barra de tiempo dentro del canvas; dibujo temático de coches, camiones, troncos, tortugas (visibles/sumergidas), rana y nenúfares. Verificación: doble HUD coherente; zonas visualmente diferenciadas.

8. **Verificación final** — `npm run build` sin errores de TypeScript; ninguna ruta devuelve 500; `rocas/caida/bloque-buster/serpentina` siguen jugables y el resto de ids siguen como maqueta.

---

## Acceptance criteria

- [ ] `app/lib/games/ranaria/engine.ts` existe, cumple `GameFactory`, sin estado global de módulo ni `document.getElementById`.
- [ ] `ranaria` resuelve a un motor en `registry.ts`; `rocas`, `caida`, `bloque-buster` y `serpentina` siguen jugables y el resto de ids siguen como maqueta.
- [ ] `/jugar/ranaria` carga sin errores de SSR ni de TypeScript y se juega el Frogger real en canvas 800×600 (no la maqueta genérica).
- [ ] El canvas renderiza las zonas diferenciadas: acera, carretera, mediana, río y franja de nenúfares.
- [ ] La rana aparece centrada en la acera de salida al cargar.
- [ ] La rana salta exactamente una celda (50px) por pulsación de flecha/WASD, con animación breve; un salto por pulsación.
- [ ] La rana no puede salir por los bordes laterales (acera/carretera/mediana).
- [ ] Coches/camiones se mueven en loop por sus carriles y reaparecen por el lado opuesto.
- [ ] Troncos y tortugas se mueven en loop; las tortugas alternan visible/sumergida.
- [ ] La rana muere por: atropello, caer al agua, tortuga que se sumerge debajo, arrastre fuera de pantalla, orilla sin nenúfar o fin de tiempo.
- [ ] Estando sobre un tronco/tortuga visible, la rana hereda su desplazamiento horizontal.
- [ ] Al llegar a un nenúfar libre: se marca, `+50` y bonus de tiempo; a uno ocupado: muerte.
- [ ] Al completar los 5 nenúfares: `+1000`, la ronda se reinicia con `level` incrementado y entidades más rápidas; `onLevel(level)` se dispara.
- [ ] `onScore` se dispara en cada cambio de puntuación; el temporizador de ronda disminuye con el nivel.
- [ ] El HUD interno del canvas (score, nivel, vidas, barra de tiempo) se dibuja; el HUD React refleja score/vidas/nivel en tiempo real.
- [ ] PAUSA congela el loop y REANUDAR lo reanuda sin salto de simulación; P/Esc no provocan una pausa independiente del canvas.
- [ ] Al llegar a `lives = 0`: `onLives(0)` y `onGameOver(score)`; aparece el modal React; guardar inserta en Supabase con `gameId: "ranaria"` y aparece en `/juego/ranaria` y `/salon` al recargar; "JUGAR DE NUEVO" reinicia desde cero.
- [ ] `destroy()` cancela el RAF y quita listeners; reentrar a la ruta no duplica el loop ni acumula velocidad.
- [ ] `npm run build` completa sin errores de TypeScript; ninguna ruta existente devuelve 500.

---

## Decisions

- **Sí: slug `ranaria` existente (motor-only), no un slug `frogger` nuevo** — RANARIA ya es un Frogger en el catálogo (SPEC 06); crear otro slug duplicaría el juego. Exactamente lo que hizo SPEC 09 con SERPENTINA. **No se toca Supabase.**
- **Sí: motor `GameFactory` + registro** (patrón SPEC 05/09), no un componente React con loop propio — un único origen de verdad para el ciclo de vida motor↔React; el reproductor, HUD, modal, guardado y táctiles ya existen.
- **Sí: canvas 800×600, rejilla 16×12 @ 50px** — encaja con el `aspect-ratio: 4/3` del `.crt-screen`; un canvas casi cuadrado (640×560) se deformaría al escalar al contenedor.
- **Sí: primitivas canvas sin sprites bitmap** — no hay assets de Frogger en el repo; dibujar por código elimina dependencias de carga.
- **Sí: salto discreto de celda con animación breve, un salto por pulsación** — mecánica canónica; simplifica colisiones y soporte comparando filas/columnas enteras.
- **Sí: doble HUD, 3 vidas, tortugas con inmersión, temporizador por cruce, 5 nenúfares** — fieles al arcade y coherentes con el resto de la plataforma.
- **Sí: reparto +10/fila, +50/nenúfar, bonus de tiempo ×10, +1000/ronda** — coherente con el `best = 18900` sembrado.
- **No: prototipo vanilla aparte** (`references/started-games/06-frogger`) — se porta directo al `engine.ts`. Desviación consciente respecto al draft `ranaria/01-motor-ranaria`.
- **No: componente genérico nuevo** — se reutiliza `CanvasGame`; no se toca.
- **No: skins, táctil específico, sonido, power-ups, RLS, realtime** — cada uno en su propia spec.
