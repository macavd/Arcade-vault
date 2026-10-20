# SPEC 08 — Motor de Arkanoid para "BLOQUE BUSTER": la maqueta `bloque-buster` pasa a jugable

> **Status:** Aprobado
> **Depends on:** SPEC 05, SPEC 06
> **Date:** 2026-10-20
> **Objective:** Portar el Arkanoid de `references/started-games/04-arkanoid` a `app/lib/games/bloque-buster/engine.ts` (con sus assets) y registrarlo, de modo que el juego `bloque-buster` (BLOQUE BUSTER), hoy maqueta pero ya presente en el catálogo y el leaderboard desde la SPEC 06, se convierta en jugable reusando el patrón de motor de la SPEC 05.

---

## Por qué existe esta spec

La SPEC 05 dejó el reproductor enchufable por `id` mediante `app/lib/games/registry.ts`: hoy `rocas` resuelve al motor de Asteroids y `caida` al de Tetris (SPEC 07); el resto de ids conservan la maqueta genérica. La SPEC 06 sembró el catálogo completo en Supabase, incluida la fila `bloque-buster` (BLOQUE BUSTER, un Arkanoid: `cat = ARCADE`, `cover = cover-bricks`, `color = cyan`, `best = 28450`, `plays = "12.4K"`, `position = 1`), su portada `.cover-bricks` en `app/globals.css` y 12 filas en `scores` para su leaderboard.

Es decir, **todo lo de catálogo, portada y leaderboard de BLOQUE BUSTER ya está implementado**. Lo único que falta para que deje de ser una maqueta es su **motor jugable**. Esta spec porta ese motor y lo registra, siguiendo el patrón que la SPEC 05 estableció para ROCAS y la SPEC 07 replicó para CAÍDA: una fábrica `GameFactory` sin estado global, que recibe el canvas por parámetro, emite su estado a React por callbacks y se limpia al desmontar.

El reto técnico de este port, frente a los dos anteriores, es doble. Primero, el `game.js` original vive de estado global de módulo, de `document.getElementById('game')` y de un HUD/overlays dibujados en el canvas (Score/Nivel/vidas, PAUSA con selector de nivel, GAME OVER, victoria); hay que encapsular todo en una instancia creada al montar y destruida al desmontar, sin fugas de `requestAnimationFrame` ni de listeners. Segundo, **es el primer motor de la plataforma con assets de bitmap y audio**: depende de `spritesheet-breakout.png` (paleta, pelota, bloques por color, 4 frames de explosión por color) y de dos efectos de sonido (`ball-bounce.mp3`, `break-sound.mp3`). A diferencia de ROCAS (vectorial) y CAÍDA (rectángulos), aquí hay que copiar esos assets a `public/` y cargarlos de forma asíncrona.

En cambio, la resolución **no** es un reto: el canvas original ya es 800×600 (4:3), que coincide con el `.crt-screen` del reproductor, así que no hay que reproyectar como en CAÍDA.

---

## Scope

**In:**

- **Motor de Arkanoid portado** en `app/lib/games/bloque-buster/engine.ts` como `createBloqueBusterGame: GameFactory`, sin estado global de módulo, recibiendo `canvas`/`ctx` por parámetro. Preserva las mecánicas, constantes, niveles y feel del original.
- **Registro del motor** en `app/lib/games/registry.ts`: `import { createBloqueBusterGame }` y la entrada `"bloque-buster": createBloqueBusterGame`. El reproductor (`GamePlayer.tsx` + `CanvasGame.tsx`) lo recoge genéricamente por `id`; no se tocan.
- **Assets copiados a `public/games/bloque-buster/`:** `spritesheet-breakout.png`, `ball-bounce.mp3` y `break-sound.mp3` (desde `references/started-games/04-arkanoid/assets/`). El motor los referencia por ruta absoluta servida por Next (`/games/bloque-buster/...`).
- **Sprites portados:** `drawSprite`/`drawFrame` y las constantes `SPRITES`/`EXPLOSION_FRAMES`/`EXPLOSION_DURATION` de `assets/spritesheet.js`, como helpers internos del módulo del motor (no globales). Carga asíncrona de la imagen con guard: el loop dibuja solo cuando el spritesheet está listo.
- **Sonido portado:** reproducir `ball-bounce.mp3` al rebotar (muros/paleta) y `break-sound.mp3` al romper bloque, usando elementos `Audio` creados en la fábrica (con `cloneNode().play()` para permitir solapamiento). `destroy()` detiene cualquier audio en curso.
- **Resolución interna 800×600** (4:3, coincide con el `.crt-screen` de la SPEC 05). No requiere reproyección; el canvas se fija a `width = 800`, `height = 600`.
- **Puente motor → React por callbacks:** `onScore(score)` al cambiar (10 pts/bloque); `onLives(lives)` al cambiar (empieza en 3, reales); `onLevel(currentLevel)` al cambiar (1..5); `onGameOver(finalScore)` una vez, tanto al perder la última vida como al **completar el nivel 5** (la victoria se trata como fin de partida).
- **Control de ciclo de vida:** `start / pause / resume / restart / destroy`. `destroy()` cancela el RAF, quita los listeners de teclado/ratón y detiene el audio. `pause()/resume()` se conectan a los botones PAUSA/REANUDAR existentes; `resume()` resetea `lastTime` para no provocar un salto de simulación.
- **Controles web:** ratón sobre el canvas mueve la paleta (coordenada mapeada al rect del canvas) **y** `←`/`→` la mueven por teclado (con `preventDefault` para no hacer scroll). Listeners añadidos en `start()` y quitados en `destroy()`.

**Out of scope (ya hecho o para futuras specs):**

- **El catálogo, la portada y la siembra de scores de `bloque-buster`: ya existen (SPEC 06).** Esta spec **no** inserta ni modifica la fila de `games`, **no** re-siembra `scores` y **no** reescribe `.cover-bricks`.
- El overlay de PAUSA con selector de nivel (botones 1–5), la tecla `P`/`Escape` de pausa, el click en el canvas para saltar de nivel y los overlays de GAME OVER / victoria dibujados en el canvas: se eliminan al portar (la plataforma ya aporta pausa, modal de fin y reinicio).
- El HUD dibujado dentro del canvas (Score / Nivel / vidas en sprites): se elimina; el HUD de React (`.player-hud`) ya muestra score, vidas y nivel reales vía callbacks.
- Volumen/silencio configurable del audio, controles táctiles/móviles, anti-cheat, auth real / vincular scores a un usuario.
- Tocar el motor de ROCAS (SPEC 05), el de CAÍDA (SPEC 07), `CanvasGame.tsx`, `GamePlayer.tsx` o los contratos de la SPEC 06.

---

## Data model

Esta spec **no crea tablas ni estructuras persistentes nuevas** y **no añade datos a la BD**: la fila `games` de `bloque-buster` y sus 12 filas de `scores` ya fueron sembradas en la SPEC 06, y `.cover-bricks` ya existe en `app/globals.css`. Lo que sí añade son **archivos de asset** en `public/` y **un contrato de motor**, que cumple los tipos ya definidos en `app/lib/games/types.ts` (no se redefinen):

```ts
// app/lib/games/bloque-buster/engine.ts → cumple GameFactory
const createBloqueBusterGame: GameFactory = (canvas, callbacks): GameEngine => {
  /* estado del juego (paddle, ball, blocks, explosions, lives, score,
     currentLevel, gameState, lastTime, rafId) encapsulado en el closure,
     sin globales de módulo */
};
```

**Assets a copiar** (desde `references/started-games/04-arkanoid/assets/` → `public/games/bloque-buster/`):

| Origen                     | Destino                                               | Uso                                  |
| -------------------------- | ----------------------------------------------------- | ------------------------------------ |
| `spritesheet-breakout.png` | `public/games/bloque-buster/spritesheet-breakout.png` | Paleta, pelota, bloques, explosiones |
| `sounds/ball-bounce.mp3`   | `public/games/bloque-buster/ball-bounce.mp3`          | Rebote (muro/paleta)                 |
| `sounds/break-sound.mp3`   | `public/games/bloque-buster/break-sound.mp3`          | Rotura de bloque                     |

**Mapeo de mecánicas a callbacks:**

- `onScore` = `score` del juego (`+10` por bloque destruido, acumulado a través de los 5 niveles).
- `onLives` = `lives` del juego (empieza en 3; al caer la pelota se descuenta una y se reposiciona). Se emite al cambiar.
- `onLevel` = `currentLevel` del juego (`1`..`5`).
- `onGameOver(score)` una vez, en **dos** situaciones: cuando `lives` llega a 0 (derrota) o cuando se limpia el **nivel 5** (victoria). En ambos casos se detiene el loop y la plataforma abre el modal de fin con el score real.

**Resolución del canvas:** interna 800×600 (coincide con el `.crt-screen` 4:3; sin reproyección). Grilla de bloques 10×6 de 64×24 px centrada (`BLOCKS_ORIGIN_X = (800 - 10*64)/2`, `BLOCKS_ORIGIN_Y = 80`); paleta `81×14` en `y = 560`; pelota `16×16`.

**Constantes a preservar del original** (dentro del módulo del motor, sin cambiarlas): `PADDLE_SPEED = 400`; `BASE_BALL_VX = 200`, `BASE_BALL_VY = -300`; dimensiones de bloque `64×24`, grilla `10×6`; velocidades de nivel `[1.00, 1.10, 1.21, 1.33, 1.46]` (×velocidad base de la pelota); `+10` pts por bloque; `EXPLOSION_DURATION = 150` ms con 4 frames; los 5 patrones de `LEVELS` (parrilla, pirámide, ajedrez, filas con huecos, marco + cruz) portados tal cual de `levels.js`.

---

## Implementation plan

Cada paso deja la app compilando y navegable; la maqueta de los demás juegos nunca se rompe.

1. **Copiar los assets.** Crear `public/games/bloque-buster/` y copiar ahí `spritesheet-breakout.png`, `ball-bounce.mp3` y `break-sound.mp3` desde `references/started-games/04-arkanoid/assets/`. (Son archivos estáticos servidos por Next en `/games/bloque-buster/...`.)
2. **Portar sprites y niveles.** Dentro de `app/lib/games/bloque-buster/engine.ts` (o un módulo hermano `sprites.ts`/`levels.ts` del mismo directorio), portar como constantes/funciones internas: `SPRITES`, `EXPLOSION_FRAMES`, `EXPLOSION_DURATION`, `drawSprite`, `drawFrame` (de `assets/spritesheet.js`) y `LEVELS` (de `levels.js`). La carga del PNG se hace con `new Image()` apuntando a `/games/bloque-buster/spritesheet-breakout.png`, guardando un flag `spriteReady`; `drawSprite`/`drawFrame` hacen no-op hasta que esté cargada.
3. **Portar el motor.** Exportar `createBloqueBusterGame: GameFactory`. Reescribir `references/started-games/04-arkanoid/game.js` en TypeScript encapsulando **todo** el estado (antes variables globales: `paddle`, `ball`, `blocks`, `explosions`, `lives`, `score`, `gameState`, `currentLevel`, `lastTime`, `rafId`) dentro del closure. El `canvas` y el `ctx` vienen por parámetro: nada de `document.getElementById`. Fijar `canvas.width = 800`, `canvas.height = 600`. Conservar `initPaddle`, `initBall`, `loadLevel`, `collideAABB`, la física de rebotes (muros/paleta/bloques), las explosiones y la pérdida de vida/reposición, con sus constantes intactas.
4. **Audio.** Crear los `Audio` de rebote y rotura en la fábrica apuntando a las rutas de `public/`. Reproducir con `cloneNode().play()` (permite solapamiento) en los puntos del original: rebote de muro izq/der/arriba, rebote de paleta y rotura de bloque. `destroy()` detiene/pausa los audios.
5. **Callbacks y fin de partida.** Difundir `onScore`/`onLives`/`onLevel` cuando cambien (comparando con el último valor emitido para no spamear). Al limpiar todos los bloques: si `currentLevel < 5`, `loadLevel(currentLevel + 1)`; si es el 5, estado `win`. En `gameover` (vidas a 0) **y** en `win`, invocar `callbacks.onGameOver(score)` una sola vez y detener el loop. Eliminar los `drawOverlay`/`drawPauseOverlay`, el HUD dibujado en canvas y el selector de nivel: el modal, la pausa y el HUD los gestiona la plataforma.
6. **Ciclo de vida y controles.** Exponer `start / pause / resume / restart / destroy`. `start()` inicializa paddle+nivel 1, añade listeners: `mousemove` sobre el canvas (mapeando `clientX` al rect para fijar `paddle.x`) y `keydown`/`keyup` para `←/→` (con `preventDefault`); arranca el RAF guardando su id. Quitar las teclas `P`/`Escape` y el handler de `click` del selector de nivel. `pause()` cancela el RAF y marca bandera; `resume()` resetea `lastTime` y reanuda; `restart()` reinicia estado (score 0, vidas 3, nivel 1) y rearranca; `destroy()` cancela el RAF, remueve listeners y detiene el audio. El `dt` del loop se capa (p. ej. `Math.min(dt, 0.05)`) para evitar saltos tras una pausa larga.
7. **Registrar el motor.** En `app/lib/games/registry.ts`: `import { createBloqueBusterGame } from "./bloque-buster/engine";` y añadir `"bloque-buster": createBloqueBusterGame` al `REGISTRY`. No se tocan `CanvasGame.tsx` ni `GamePlayer.tsx`.
8. **Verificación manual** (ver Acceptance criteria).

No hay paso de migración ni de `generate_typescript_types`: el esquema no cambia (no se insertan datos).

---

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de tipos de ruta.
- [ ] Existe `app/lib/games/bloque-buster/engine.ts` que exporta `createBloqueBusterGame` y **no** usa estado global de módulo ni `document.getElementById`; recibe el canvas por parámetro y fija su resolución a 800×600.
- [ ] `app/lib/games/registry.ts` mapea `bloque-buster` a `createBloqueBusterGame`; `getGameEngine("bloque-buster")` deja de devolver `null`.
- [ ] Existen `public/games/bloque-buster/spritesheet-breakout.png`, `ball-bounce.mp3` y `break-sound.mp3`, y el motor los carga por ruta `/games/bloque-buster/...`.
- [ ] En `/jugar/bloque-buster` se juega el Arkanoid real: la paleta se mueve con el ratón y con `←/→`; la pelota rebota en muros, paleta y bloques; cada bloque roto suma 10 y lanza su animación de explosión (4 frames); al caer la pelota se pierde una vida y se reposiciona.
- [ ] Se conservan los 5 niveles del original con sus patrones (parrilla, pirámide, ajedrez, filas con huecos, marco + cruz) y la velocidad de la pelota sube por nivel (`×1.00`→`×1.46`).
- [ ] Suena `ball-bounce.mp3` al rebotar y `break-sound.mp3` al romper un bloque; los rebotes solapados no se cortan entre sí.
- [ ] El HUD de React refleja score, vidas (3 reales, decrecientes) y nivel (1..5) reales del motor; no queda HUD dibujado dentro del canvas.
- [ ] El ratón y las flechas no provocan scroll de la página ni selección de texto durante el juego.
- [ ] PAUSA/REANUDAR congela y reanuda sin salto de simulación (`lastTime` se resetea en `resume()`); no existen las teclas `P`/`Escape` ni el overlay/selector de nivel del original.
- [ ] Al perder la última vida se abre el modal de fin con la puntuación final real; al **completar el nivel 5** también se abre el modal con el score real (victoria tratada como fin de partida); "JUGAR DE NUEVO" reinicia limpio vía `restart()` (score 0, vidas 3, nivel 1).
- [ ] Al navegar fuera de `/jugar/bloque-buster` (o desmontar) se cancela el `requestAnimationFrame`, se quitan los listeners de teclado/ratón y se detiene el audio; reentrar no duplica el loop ni los listeners (el juego no se acelera al reentrar).
- [ ] No se modifican la fila `games` de `bloque-buster`, sus filas `scores`, `.cover-bricks`, el motor de ROCAS/CAÍDA, `CanvasGame.tsx` ni `GamePlayer.tsx`; los demás juegos sin motor conservan su maqueta.
- [ ] El leaderboard de BLOQUE BUSTER (en `/salon` y en `/juego/bloque-buster`) sigue mostrando las puntuaciones sembradas en la SPEC 06; `POST /api/scores` con `{ gameId: "bloque-buster", name, score }` válido inserta una fila nueva visible al recargar.

---

## Decisions

- **Sí:** esta spec es **motor + registro + assets**, no catálogo. La fila `games`, la portada `.cover-bricks` y la siembra de `scores` de `bloque-buster` ya se implementaron en la SPEC 06; re-tocarlas duplicaría y arriesgaría trabajo hecho. Mismo criterio que la SPEC 07 con CAÍDA.
- **Sí:** portar el **sonido** ahora (copiar los `.mp3` a `public/` y reproducirlos al rebotar/romper). Es parte del feel de este Arkanoid y el usuario lo pidió explícitamente, aunque ROCAS/CAÍDA se portaron mudos. Se acota a reproducción simple con `cloneNode().play()` y stop en `destroy()`; el volumen/silencio configurable queda para una spec de audio de plataforma.
- **Sí:** copiar el **PNG del spritesheet** a `public/` y portar `drawSprite`/`drawFrame` + `SPRITES`/`EXPLOSION_FRAMES`, con carga asíncrona y guard. Preserva el arte y la animación de explosión 1:1. Se descarta redibujar con vectores (cambiaría el look y perdería la explosión del spritesheet).
- **Sí:** mantener **ratón + flechas** como en el original. El ratón es el control natural de Arkanoid; las flechas dan alternativa de teclado consistente con ROCAS/CAÍDA. El `mousemove` se mapea al rect del canvas (como el original).
- **Sí:** tratar la **victoria** (completar el nivel 5) como fin de partida llamando `onGameOver(score)`. La plataforma solo expone `onGameOver`; es la lectura honesta sin tocar `GamePlayer.tsx`. Se descarta un bucle infinito de niveles (cambiaría la mecánica de 5 niveles finitos del original).
- **Sí:** la pausa, el reinicio y el HUD los maneja la plataforma. Se eliminan las teclas `P`/`Escape`, el overlay de pausa con selector de nivel, el handler de `click` y los textos GAME OVER / victoria y el HUD dibujados en canvas. Unifica el flujo con el resto del reproductor; mismo criterio que SPEC 05/07.
- **Sí:** resolución interna 800×600 sin reproyección (ya es 4:3 como el `.crt-screen`). A diferencia de CAÍDA (300×600), no hay que centrar ni escalar.
- **No:** volumen/silencio, táctil, anti-cheat, auth real — cada uno en su propia spec.

---

## Risks

| Riesgo                                                                                                     | Mitigación                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El port a TS introduce regresiones de feel (velocidades por nivel, rebotes, patrones de los 5 niveles).    | Portar preservando constantes y mecánica 1:1 (`PADDLE_SPEED`, `BASE_BALL_VX/VY`, speeds `1.00`→`1.46`, `+10`/bloque, `LEVELS`); verificación manual jugando `/jugar/bloque-buster`. |
| Fugas de `requestAnimationFrame`, listeners de teclado/ratón o audio al montar/desmontar en el App Router. | `destroy()` cancela el RAF, quita listeners y detiene el audio; el `useEffect` de `CanvasGame` retorna ese cleanup. Un criterio de aceptación verifica la reentrada.                |
| El spritesheet carga asíncrono: dibujar antes de que esté listo rompe el render o muestra el canvas vacío. | Flag `spriteReady`; `drawSprite`/`drawFrame` hacen no-op hasta que la imagen carga. El loop puede arrancar; solo se ve el fondo hasta que el PNG está listo.                        |
| El autoplay del audio puede bloquearse si no hay gesto de usuario previo.                                  | El juego arranca tras un click del usuario (botón JUGAR); los `Audio` se crean en la fábrica y se reproducen dentro del gameplay. No se reproduce audio antes de interacción.       |
| `lastTime`/`dt` gigante tras una pausa larga o cambio de pestaña provoca un salto de simulación.           | Resetear `lastTime` en `resume()` y capar `dt` (`Math.min(dt, 0.05)`) para que el primer frame tras reanudar sea normal.                                                            |

---

## Qué **no** está en esta spec

- El alta del catálogo, la portada `.cover-bricks` y la siembra de `scores` de `bloque-buster`: ya existen desde la SPEC 06.
- Volumen/silencio configurable del audio (la spec solo reproduce los efectos).
- Controles táctiles / móviles.
- Anti-cheat / verificación server-side de puntuaciones.
- Auth real y vincular scores a un usuario.
- Cambios a `CanvasGame.tsx`, `GamePlayer.tsx`, al motor de ROCAS (SPEC 05), al de CAÍDA (SPEC 07) o a los contratos de la SPEC 06.

Cada uno de esos, si llega, va en su propia spec.
