# SPEC 07 — Motor de Tetris para "CAÍDA": la maqueta `caida` pasa a jugable

> **Status:** Aprobado
> **Depends on:** SPEC 05, SPEC 06
> **Date:** 2026-10-20
> **Objective:** Portar el Tetris de `references/started-games/03-tetris` a `app/lib/games/caida/engine.ts` y registrarlo, de modo que el juego `caida` (CAÍDA), hoy maqueta pero ya presente en el catálogo y el leaderboard desde la SPEC 06, se convierta en jugable reusando el patrón de motor de la SPEC 05.

---

## Por qué existe esta spec

La SPEC 05 dejó el reproductor enchufable por `id` mediante `app/lib/games/registry.ts`: hoy solo `rocas` resuelve a un motor real (Asteroids) y el resto de ids conservan la maqueta genérica. La SPEC 06 sembró el catálogo completo en Supabase, incluida la fila `caida` (CAÍDA, un Tetris: `cat = PUZZLE`, `cover = cover-tetro`, `color = magenta`, `best = 184220`, `plays = "31.8K"`, `position = 2`), su portada `.cover-tetro` en `app/globals.css` y 12 filas en `scores` para su leaderboard.

Es decir, **todo lo de catálogo, portada y leaderboard de CAÍDA ya está implementado**. Lo único que falta para que CAÍDA deje de ser una maqueta es su **motor jugable**. Esta spec porta ese motor y lo registra, siguiendo exactamente el patrón que la SPEC 05 estableció para ROCAS: una fábrica `GameFactory` sin estado global, que recibe el canvas por parámetro, emite su estado a React por callbacks y se limpia al desmontar.

El reto técnico central es doble. Primero, el `game.js` original vive de estado global de módulo, de `document.getElementById` y de un HUD/overlay en el DOM; hay que encapsular todo en una instancia creada al montar y destruida al desmontar, sin fugas de `requestAnimationFrame` ni de listeners. Segundo, el tablero de Tetris es 300×600 (relación 1:2) mientras el `.crt-screen` del reproductor es 4:3; el motor debe dibujarse en una resolución 4:3 sin deformar las piezas.

---

## Scope

**In:**

- **Motor de Tetris portado** en `app/lib/games/caida/engine.ts` como `createCaidaGame: GameFactory`, sin estado global de módulo, recibiendo `canvas`/`ctx` por parámetro. Preserva las mecánicas, constantes y feel del original.
- **Registro del motor** en `app/lib/games/registry.ts`: `import { createCaidaGame }` y la entrada `caida: createCaidaGame`. El reproductor (`GamePlayer.tsx` + `CanvasGame.tsx`) lo recoge genéricamente por `id`; no se tocan.
- **Resolución interna 800×600** (4:3, coincide con el `.crt-screen` de la SPEC 05). El tablero 300×600 (10×20 celdas de 30 px) se dibuja centrado; el margen lateral dibuja, dentro del mismo canvas, la vista NEXT (120×120) y los contadores SCORE / LINES / LEVEL. Es el equivalente al HUD interno que Asteroids conserva en la SPEC 05.
- **Puente motor → React por callbacks:** `onScore(score)` y `onLevel(level)` al cambiar; `onLives(0)` una vez al arrancar; `onGameOver(finalScore)` una vez al perder.
- **Control de ciclo de vida:** `start / pause / resume / restart / destroy`. `destroy()` cancela el RAF y quita los listeners de teclado. `pause()/resume()` se conectan a los botones PAUSA/REANUDAR existentes; `resume()` resetea `lastTime` para no provocar un salto de simulación.
- **Teclado web:** `←`/`→` mover, `↑` (y `X`) rotar, `↓` soft drop, `Espacio` hard drop, con `preventDefault` en las flechas y `Espacio` para no hacer scroll de la página. Listeners añadidos en `start()` y quitados en `destroy()`.

**Out of scope (ya hecho o para futuras specs):**

- **El catálogo, la portada y la siembra de scores de `caida`: ya existen (SPEC 06).** Esta spec **no** inserta ni modifica la fila de `games`, **no** re-siembra `scores` y **no** reescribe `.cover-tetro`.
- La tecla `P` de pausa, el overlay propio del original, el botón "Reiniciar", el toggle de tema claro/oscuro y el uso de `localStorage`: se eliminan al portar (la plataforma ya aporta pausa, modal de fin y reinicio).
- Sonido, controles táctiles/móviles, anti-cheat, auth real / vincular scores a un usuario.
- Tocar el motor de ROCAS (SPEC 05), `CanvasGame.tsx`, `GamePlayer.tsx` o los contratos de la SPEC 06.

---

## Data model

Esta spec **no crea tablas ni estructuras persistentes nuevas** y **no añade datos**: la fila `games` de `caida` y sus 12 filas de `scores` ya fueron sembradas en la SPEC 06, y `.cover-tetro` ya existe en `app/globals.css`. El único contrato nuevo es la instancia de motor, que cumple los tipos ya definidos en `app/lib/games/types.ts` (no se redefinen):

```ts
// app/lib/games/caida/engine.ts → cumple GameFactory
const createCaidaGame: GameFactory = (canvas, callbacks): GameEngine => {
  /* estado del tablero encapsulado en el closure, sin globales de módulo */
};
```

**Mapeo de mecánicas a callbacks:**

- `onScore` = `score` del juego (puntuación Tetris: `LINE_SCORES[cleared] * level`, hard drop `+2`/celda, soft drop `+1`/fila).
- `onLevel` = `level` del juego (`Math.floor(lines / 10) + 1`).
- `onLives(0)` una sola vez al arrancar: Tetris no tiene vidas, y el HUD de la plataforma renderiza `0` como "—". Las LÍNEAS no van al HUD de React (que no tiene ese contador); se muestran en el panel dibujado dentro del canvas.
- `onGameOver(score)` una vez, cuando una pieza nueva colisiona al aparecer.

**Resolución y layout del canvas:** interna 800×600. Tablero 300×600 centrado (`COLS=10`, `ROWS=20`, `BLOCK=30`). Panel lateral dentro del canvas con la vista NEXT (previsualización 120×120) y los textos SCORE / LINES / LEVEL.

**Constantes a preservar del original** (dentro del módulo del motor, sin cambiarlas): `COLORS` y `PIECES` con **8 tipos**, incluida la pieza "tuerca" (tipo 8); `LINE_SCORES = [0, 100, 300, 500, 800]`; `dropInterval = Math.max(100, 1000 - (level - 1) * 90)`; wall kicks de rotación `[0, -1, 1, -2, 2]`; pieza fantasma (ghost) a `globalAlpha` 0.2.

---

## Implementation plan

Cada paso deja la app compilando y navegable; la maqueta de los demás juegos nunca se rompe.

1. **Portar el motor.** Crear `app/lib/games/caida/engine.ts` exportando `createCaidaGame: GameFactory`. Reescribir `references/started-games/03-tetris/game.js` en TypeScript encapsulando **todo** el estado (antes variables globales: `board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `lastTime`, `dropAccum`, `dropInterval`, `animId`) dentro del closure. El `canvas` y el `ctx` vienen por parámetro: nada de `document.getElementById`. Fijar `canvas.width = 800`, `canvas.height = 600`. Conservar `createBoard`, `randomPiece` (8 tipos), `collide`, `rotateCW`, `tryRotate` (wall kicks), `merge`, `clearLines`, `ghostY`, `hardDrop`, `softDrop`, `lockPiece`, `spawn` con su lógica y constantes intactas.
2. **Dibujo adaptado a 800×600.** Reescribir `draw`/`drawGrid`/`drawBlock`/`drawNext` para pintar el tablero 300×600 con un desplazamiento horizontal que lo centre, y dibujar en el margen lateral el panel NEXT + SCORE / LINES / LEVEL dentro del mismo canvas (sustituye a `updateHUD`, que escribía en el DOM). Sustituir `getComputedStyle(document.body)` de `drawGrid` por un color de rejilla fijo (constante del motor), ya que no hay variables CSS de `document.body` en este contexto.
3. **Callbacks y fin de partida.** Cuando cambien `score` o `level`, invocar `callbacks.onScore` / `callbacks.onLevel`. Llamar `callbacks.onLives(0)` una vez en el arranque. En `endGame`, invocar `callbacks.onGameOver(score)` (además de dejar de pedir frames); el modal de fin lo gestiona la plataforma. Quitar el overlay en DOM, el botón "Reiniciar", el toggle de tema y el `localStorage` del original.
4. **Ciclo de vida y teclado.** Exponer `start / pause / resume / restart / destroy`. `start()` inicializa el tablero y añade el listener `keydown` (con `preventDefault` para `ArrowLeft/Right/Up/Down` y `Space`), mapeando `←/→` mover, `↑`/`KeyX` rotar, `↓` soft drop, `Space` hard drop; arranca el RAF guardando su id. Quitar la tecla `KeyP`: la pausa la maneja React. `pause()` cancela el RAF y marca bandera; `resume()` resetea `lastTime` y reanuda. `restart()` reinicia el estado y rearranca. `destroy()` cancela el RAF y remueve el listener de teclado.
5. **Registrar el motor.** En `app/lib/games/registry.ts`: `import { createCaidaGame } from "./caida/engine";` y añadir `caida: createCaidaGame` al `REGISTRY`. No se tocan `CanvasGame.tsx` ni `GamePlayer.tsx`.
6. **Verificación manual** (ver Acceptance criteria).

No hay paso de migración ni de `generate_typescript_types`: el esquema no cambia (no se insertan datos).

---

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de tipos de ruta.
- [ ] Existe `app/lib/games/caida/engine.ts` que exporta `createCaidaGame` y **no** usa estado global de módulo ni `document.getElementById`; recibe el canvas por parámetro y fija su resolución a 800×600.
- [ ] `app/lib/games/registry.ts` mapea `caida` a `createCaidaGame`; `getGameEngine("caida")` deja de devolver `null`.
- [ ] En `/jugar/caida` se juega el Tetris real: `←/→` mueven, `↑`/`X` rotan con wall kicks, `↓` baja (soft drop), `Espacio` hace hard drop; las líneas completas se limpian y la velocidad sube cada 10 líneas; aparece la pieza fantasma.
- [ ] Se conservan las 8 piezas del original, incluida la pieza "tuerca" (tipo 8).
- [ ] El canvas muestra el tablero 300×600 centrado, sin deformar las piezas, con el panel NEXT + SCORE / LINES / LEVEL dibujado dentro del propio canvas.
- [ ] El HUD de React refleja la puntuación y el nivel reales del motor; el contador "Vidas" muestra "—" (el motor llama `onLives(0)`).
- [ ] Las flechas y `Espacio` no hacen scroll de la página durante el juego.
- [ ] PAUSA/REANUDAR congela y reanuda sin salto de simulación (`lastTime` se resetea en `resume()`); no existe la tecla `P`.
- [ ] Al perder (una pieza nueva colisiona al aparecer) se abre el modal de fin con la puntuación final real; "JUGAR DE NUEVO" reinicia limpio vía `restart()`.
- [ ] Al navegar fuera de `/jugar/caida` (o desmontar) se cancela el `requestAnimationFrame` y se quita el listener de teclado; reentrar no duplica el loop ni los listeners (el juego no se acelera al reentrar).
- [ ] No se modifican la fila `games` de `caida`, sus filas `scores`, `.cover-tetro`, el motor de ROCAS, `CanvasGame.tsx` ni `GamePlayer.tsx`; los demás juegos sin motor conservan su maqueta.
- [ ] El leaderboard de CAÍDA (en `/salon` y en `/juego/caida`) sigue mostrando las puntuaciones sembradas en la SPEC 06; `POST /api/scores` con `{ gameId: "caida", name, score }` válido inserta una fila nueva visible al recargar.

---

## Decisions

- **Sí:** esta spec es **solo motor + registro**. El catálogo, la portada y la siembra de scores de `caida` ya se implementaron en la SPEC 06; re-tocarlos duplicaría y arriesgaría trabajo ya hecho. Se descarta ajustar la fila `games` o re-sembrar `scores` por no estar en el objetivo.
- **Sí:** `onLives(0)` → el HUD muestra "—". Es la lectura honesta para un juego sin vidas, usando el fallback que ya tiene el HUD, sin tocar `GamePlayer.tsx`. Se descarta dejar `onLives` sin llamar (el HUD se quedaría en 3 ♥ engañosos) y se descarta mapear líneas a `onLives` (mostraría decenas de corazones). Las LÍNEAS se ven en el panel dentro del canvas.
- **Sí:** resolución interna 800×600 con el tablero 300×600 centrado y el panel (NEXT + SCORE/LINES/LEVEL) dibujado en el margen, dentro del canvas. Respeta el 4:3 del `.crt-screen` sin deformar las piezas y mantiene el motor autocontenido, igual que el HUD interno que conserva Asteroids en la SPEC 05. Se descarta fijar 300×600 y dejar que el CSS lo estire al 4:3 (piezas deformadas) y se descarta tocar `CanvasGame.tsx` para un segundo canvas.
- **Sí:** la pausa y el reinicio los maneja la plataforma (`pause()/resume()` y `restart()` vía el modal). Se eliminan la tecla `P`, el overlay propio, el botón "Reiniciar", el toggle de tema y el `localStorage` del original. Unifica el flujo con el resto del reproductor y evita desincronizar el estado de pausa; mismo criterio que la SPEC 05 (Asteroids quitó su "Space para reiniciar").
- **Sí:** preservar las 8 piezas del original, incluida la "tuerca" (tipo 8). Es parte del feel de este Tetris concreto; portar 1:1 evita regresiones.
- **No:** sonido, táctil, anti-cheat, auth real — cada uno en su propia spec.

---

## Risks

| Riesgo                                                                                                   | Mitigación                                                                                                                                                 |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El port a TS introduce regresiones de feel (velocidad de caída, puntuación, wall kicks, pieza "tuerca"). | Portar preservando constantes y mecánica 1:1 (`LINE_SCORES`, `dropInterval`, kicks `[0,-1,1,-2,2]`, 8 piezas); verificación manual jugando `/jugar/caida`. |
| Fugas de `requestAnimationFrame` o del listener de teclado al montar/desmontar en el App Router.         | `destroy()` cancela el RAF y quita el listener; el `useEffect` de `CanvasGame` retorna ese cleanup. Un criterio de aceptación verifica la reentrada.       |
| `dropAccum` gigante tras una pausa larga o cambio de pestaña provoca un salto de simulación.             | Resetear `lastTime` en `resume()` para que el primer frame tras reanudar tenga un `dt` normal.                                                             |
| El tablero 1:2 se deforma al estirarse sobre el `.crt-screen` 4:3.                                       | Resolución interna 800×600 con el tablero 300×600 centrado; el CSS escala un 4:3 a 4:3, sin deformación.                                                   |

---

## Qué **no** está en esta spec

- El alta del catálogo, la portada `.cover-tetro` y la siembra de `scores` de `caida`: ya existen desde la SPEC 06.
- Sonido y efectos de audio.
- Controles táctiles / móviles.
- Anti-cheat / verificación server-side de puntuaciones.
- Auth real y vincular scores a un usuario.
- Cambios a `CanvasGame.tsx`, `GamePlayer.tsx`, al motor de ROCAS (SPEC 05) o a los contratos de la SPEC 06.

Cada uno de esos, si llega, va en su propia spec.
