# SPEC 02 (game-jam/buscaminas) — Motor de Minesweeper para "BUSCAMINAS"

> **Status:** Draft
> **Depends on:** SPEC 05, SPEC 13, SPEC 16, 01-catalogo-leaderboard-buscaminas
> **Date:** 2026-11-27
> **Objective:** Construir un prototipo de Buscaminas clásico y portarlo a `app/lib/games/buscaminas/engine.ts` como `createBuscaminasGame: GameFactory`, registrado en `registry.ts`, de modo que `buscaminas` (dado de alta por `01-catalogo-leaderboard-buscaminas`) sea jugable con ratón, teclado y toque.

---

## Por qué existe esta spec

`01-catalogo-leaderboard-buscaminas` deja a BUSCAMINAS en el catálogo y con su leaderboard sembrado, pero sin motor. Esta spec entrega el **motor jugable** reusando el patrón de la SPEC 05 tal como lo replicaron las SPEC 07, 08 y 09: fábrica `GameFactory` sin estado global, canvas por parámetro, callbacks `onScore/onLives/onLevel/onGameOver` y ciclo `start/pause/resume/restart/destroy`.

Este motor se diferencia de los cinco existentes en dos cosas:

1. **Es dirigido por eventos, no por física.** El estado solo cambia cuando la jugadora revela o marca una casilla. El bucle RAF se mantiene por uniformidad de ciclo de vida (y para el cronómetro y las animaciones), pero se redibuja **solo si algo cambió** (dirty flag), siguiendo el espíritu de la SPEC 16.
2. **Necesita input posicional.** Hay que elegir una casilla concreta, cosa que el overlay de teclas sintéticas de la SPEC 13 no puede expresar. El motor escucha Pointer Events **sobre su propio canvas** (ratón y dedo unificados), como `bloque-buster` ya escucha `mousemove` sobre el suyo.

En `references/started-games/` solo existen `02-asteroids`, `03-tetris`, `04-arkanoid` y `05-snake` (todos portados), así que **esta spec necesita un prototipo nuevo**: se construye en `references/started-games/09-buscaminas` y se porta desde ahí, igual que la SPEC 09 construyó `05-snake` antes de portarlo. Los números `06`–`08` están reservados por las specs de jam de Frogger, Road Fighter y Moon Patrol.

---

## Scope

**In:**

- Prototipo vanilla `references/started-games/09-buscaminas/` (`index.html` + `game.js`), jugable abriendo el HTML, como fuente del port.
- Motor `app/lib/games/buscaminas/engine.ts` exportando `createBuscaminasGame: GameFactory`: campaña de tableros, primer clic seguro, relleno por inundación, banderas, *chording*, cronómetro, score ascendente y HUD interno dibujado en el canvas.
- Input: ratón (izquierdo/derecho/central), teclado (cursor de casilla) y táctil (toque/pulsación larga) mediante Pointer Events sobre el canvas, más un **modo bandera** alternable.
- Entrada `buscaminas` en `app/lib/games/touch-map.ts` (SPEC 13) con un único botón `⚑` que sintetiza `KeyM` (alternar modo bandera).
- Registro en `app/lib/games/registry.ts`: `buscaminas: createBuscaminasGame`.

**Out of scope (para futuras specs):**

- Alta en `games`, siembra de `scores` y portada `.cover-buscaminas` (van en `01-catalogo-leaderboard-buscaminas`).
- Selector de dificultad en la UI de React, marcas de interrogación (`?`), tableros personalizados.
- Skins (`neon`/`retro`): el motor acepta el parámetro `skin` del contrato y lo ignora (siempre `clasico`) hasta que `skin-designer` escriba su spec.
- Sonido, vibración/haptics, anti-cheat, auth real.
- Tocar otros motores, `CanvasGame.tsx`, `GamePlayer.tsx` o `TouchControls.tsx`.

---

## Data model

Esta spec **no toca Supabase**. Introduce el contrato del motor (tipos de `app/lib/games/types.ts`, no se redefinen) y su modelo interno.

```ts
// app/lib/games/buscaminas/engine.ts → cumple GameFactory
export const createBuscaminasGame: GameFactory = (canvas, callbacks, _skin = "clasico"): GameEngine => {
  /* todo el estado en el closure; sin globales de módulo */
};
```

### Objetivo de juego

Despejar todas las casillas **sin mina** de cada tablero. Al limpiar un tablero se pasa al siguiente, más grande y denso. La partida termina al revelar una mina (una sola vida) y es potencialmente infinita a partir del tablero 4.

### Modelo interno

```ts
type Cell = {
  mine: boolean;
  adj: number;        // 0..8 minas vecinas (se calcula tras colocar minas)
  revealed: boolean;
  flagged: boolean;
  scored: boolean;    // ya sumó puntos (evita doble conteo)
};
type Phase = "ready" | "playing" | "clearing" | "exploding" | "over";
```

Estado del closure: `board: Cell[]` (plano, índice `r * cols + c`), `cols`, `rows`, `mines`, `minesPlaced: boolean`, `revealedSafe`, `flags`, `boardIndex` (nivel), `score`, `elapsed` (segundos del tablero, acumulados con `dt`), `phase`, `paused`, `phaseTimer`, `cursor {c, r}`, `cursorVisible`, `flagMode`, `explodedAt`, `dirty`, `rafId`, `lastTime`, `lastSent {score, lives, level}`, `gameOverSent`, `longPress {timerId, pointerId, x, y, fired}`.

### Campaña de tableros (`onLevel`)

| Tablero (`level`) | Nombre       | Cols × filas | Minas                           | PAR (s) |
| ----------------- | ------------ | ------------ | ------------------------------- | ------- |
| 1                 | PRINCIPIANTE | 9 × 9        | 10                              | 90      |
| 2                 | INTERMEDIO   | 16 × 16      | 40                              | 240     |
| 3                 | EXPERTO      | 30 × 16      | 99                              | 600     |
| 4+                | EXPERTO+     | 30 × 16      | `min(99 + 10 × (level − 3), 130)` | 600     |

### Mecánicas

- **Primer clic seguro.** Las minas no se colocan al crear el tablero sino en la **primera revelación** de cada tablero (`minesPlaced = false` hasta entonces). Se excluyen la casilla pulsada y sus 8 vecinas (apertura garantizada, comportamiento de Windows moderno). Colocación con Fisher-Yates sobre la lista de candidatas; luego se calcula `adj` para todo el tablero. Una bandera puesta antes del primer clic no bloquea la colocación, pero esa casilla no puede revelarse mientras tenga bandera.
- **Revelar** una casilla tapada y sin bandera: si es mina → fase `exploding`. Si `adj > 0` → se descubre sola. Si `adj === 0` → **relleno por inundación iterativo** (pila explícita, nunca recursión) que descubre la región de ceros y su borde numerado; las banderas dentro de la región se respetan (no se descubren).
- **Bandera**: alterna `flagged` en una casilla tapada. No tiene efecto sobre casillas descubiertas. El contador `minas − banderas` puede ser negativo (se dibuja con signo).
- **Chording**: revelar sobre un número descubierto cuyo número de banderas vecinas es **igual** a `adj` descubre todas sus vecinas tapadas sin bandera. Si alguna era mina (bandera mal puesta) → fase `exploding`, como en el clásico. Con menos o más banderas no hace nada.
- **Victoria de tablero**: `revealedSafe === cols × rows − mines`. No exige poner banderas en las minas; al ganar, el motor marca automáticamente con bandera las minas restantes (feedback visual).
- **Cronómetro**: `elapsed` arranca en la primera revelación del tablero y solo avanza en fase `playing` y sin pausa (se acumula con `dt`, no con `Date.now()`). Se muestra hasta `999`.

### Scoring (score ascendente para el leaderboard)

- **+10 × level** por cada casilla segura descubierta por primera vez (`scored` evita el doble conteo; el relleno por inundación suma cada casilla que descubre).
- **Bonus de tablero limpio**: `+1000 × level`.
- **Bonus de tiempo** al limpiar: `max(0, PAR − floor(elapsed)) × 5 × level`.
- Las banderas no suman ni restan. El score **nunca baja**.

Referencia de calibración (coherente con la siembra de la spec 01): Principiante limpio ≈ 710 + 1 000 + 350 ≈ 2 060; Intermedio ≈ 4 320 + 2 000 + 1 500 ≈ 7 820; Experto ≈ 11 430 + 3 000 + 5 250 ≈ 19 680.

### Mapeo a callbacks

- `onScore(score)` — tras cada acción que cambie el score (revelado, bonus).
- `onLives(lives)` — una sola vida: `onLives(1)` al arrancar/reiniciar; `onLives(0)` al revelar una mina (mismo patrón que `serpentina`).
- `onLevel(level)` — número de tablero (1, 2, 3, 4…), al arrancar y al entrar en cada tablero nuevo.
- `onGameOver(finalScore)` — **una sola vez**, al terminar la animación de explosión (1,2 s). El modal de React siempre titula "FIN DEL JUEGO"; no hay "victoria final" porque la campaña no termina.

Todos pasan por `syncReactState()`, que solo emite si el valor cambió respecto a `lastSent`.

### Estados y ciclo de vida

| Fase        | Entra cuando                                  | Input       | Sale a                                              |
| ----------- | --------------------------------------------- | ----------- | --------------------------------------------------- |
| `ready`     | tablero nuevo creado (sin minas)               | sí          | `playing` en la primera revelación                  |
| `playing`   | primera revelación                             | sí          | `clearing` (victoria) / `exploding` (mina)          |
| `clearing`  | tablero limpio                                 | no          | `ready` del tablero `level + 1` tras 1,5 s          |
| `exploding` | mina revelada                                  | no          | `over` tras 1,2 s (se llama `onGameOver`)           |
| `over`      | fin de la animación                            | no          | `ready` del tablero 1 solo vía `restart()`          |

- `start()`: fija `canvas.width = 800`, `canvas.height = 600`, obtiene `ctx` con `getContext("2d", { alpha: false })`, crea el tablero 1, añade listeners (ver Controles), emite `onScore(0)`, `onLives(1)`, `onLevel(1)` y arranca el RAF.
- `pause()`: marca `paused`, cancela el RAF, cancela una pulsación larga en curso. El input se ignora.
- `resume()`: limpia `paused`, **resetea `lastTime`** (el cronómetro no salta) y rearranca el RAF.
- `restart()`: vuelve al tablero 1, score 0, fase `ready`, `gameOverSent = false`, cancela temporizadores, re-emite los tres callbacks y rearranca el RAF. No re-añade listeners.
- `destroy()`: cancela el RAF, el `setTimeout` de pulsación larga, quita **todos** los listeners (canvas y `window`) y restaura `canvas.style.touchAction` al valor previo.

### Controles

**Ratón** (listeners sobre el canvas):

- `pointerdown` con `button === 0` → revelar (o *chording* si es un número descubierto).
- `button === 2` → bandera. `contextmenu` con `preventDefault` para que no salga el menú del navegador.
- `button === 1` → *chording* explícito.
- El mapeo de coordenadas lee `canvas.getBoundingClientRect()` en cada evento: `x = (clientX − rect.left) × 800 / rect.width` (idem `y` con 600), porque el CSS escala el canvas dentro del `.crt-screen`.

**Táctil** (mismos Pointer Events, `pointerType === "touch"`):

- `pointerdown` arranca un temporizador de **350 ms**. Si salta antes del `pointerup` → bandera (y se marca `fired` para que el `pointerup` no revele). Si el `pointerup` llega antes → revelar (o bandera si `flagMode`).
- Un `pointermove` de más de 10 px (en coordenadas de canvas) o un `pointercancel` cancela la acción.
- Solo se atiende el puntero primario (`isPrimary`); el multitoque se ignora.
- El motor fija `canvas.style.touchAction = "none"` en `start()` (sin scroll/zoom al tocar) y lo restaura en `destroy()`.

**Teclado** (listener `keydown` en `window`, lee `e.code`, con `preventDefault` solo para estas teclas):

- `ArrowUp/Down/Left/Right` y `KeyW/A/S/D` → mueven el cursor de casilla (con tope en los bordes) y lo hacen visible.
- `Space` / `Enter` → revelar o *chording* en el cursor.
- `KeyF` / `KeyX` → bandera en el cursor.
- `KeyM` → alterna `flagMode` (con `flagMode` activo, el toque corto y el clic izquierdo ponen bandera en vez de revelar).
- Cualquier `pointerdown` oculta el cursor de teclado.

**Overlay táctil (SPEC 13)**: nueva entrada en `TOUCH_MAP`:

```ts
buscaminas: {
  buttons: [{ label: "⚑", code: "KeyM", key: "m", hold: false, slot: "action-a" }],
},
```

No se añade D-pad: en táctil se toca la casilla directamente. El botón alterna el modo bandera, alternativa accesible a la pulsación larga.

### Render (canvas 800×600)

- **Banda HUD** superior (`y = 0..64`), dibujada en el propio canvas: `MINAS nnn` (minas − banderas) a la izquierda, `TABLERO n · NOMBRE` al centro, `TIEMPO nnn` a la derecha, e indicador `⚑ MODO BANDERA` resaltado cuando `flagMode` está activo.
- **Tablero** centrado en el área `y = 72..590`. Tamaño de casilla: `cell = min(floor(760 / cols), floor(510 / rows), 44)` → 44 px (9×9), 31 px (16×16), 25 px (30×16).
- **Casilla tapada**: bloque en relieve con borde neón verde tenue. **Descubierta**: fondo casi negro con rejilla fina. **Números** en colores neón fijos por valor (1 cian, 2 verde, 3 magenta, 4 amarillo, 5–8 tonos cálidos), fuente pixel del sitio con fallback monoespaciado.
- **Bandera**: triángulo verde con mástil. **Mina**: núcleo con púas y glow. **Mina detonada**: fondo magenta. **Bandera errónea** (al perder): mina tachada con una X.
- **Cursor de teclado**: contorno amarillo parpadeante, solo si `cursorVisible`.
- **Transiciones**: en `clearing`, rótulo `TABLERO LIMPIO +<bonus>` sobre el tablero; en `exploding`, onda expansiva desde la mina detonada y aparición escalonada del resto de minas.
- **Glow**: todos los `shadowBlur` se multiplican por `glowScale()` de `app/lib/games/perf.ts` (calculado una vez al instanciar), según la SPEC 16.
- **Redibujo**: el RAF dibuja solo si `dirty` es `true` (lo activan input, cambio de segundo del cronómetro, parpadeo del cursor y las animaciones). Cada `draw()` rellena el frame completo (requisito del canvas opaco).

### Integración con Supabase (`scores`)

El motor no habla con Supabase. Al llamar `onGameOver(score)`, `GamePlayer.tsx` abre el modal y, al guardar, hace `POST /api/scores` con `{ gameId: "buscaminas", name, score }`; la ruta llama a `insertScore` (`app/lib/db/scores.ts`), que exige `score` entero en `0..100000000`, y el leaderboard (`getTopScores`) lo ordena de forma descendente. El motor garantiza que `score` siempre es **entero, no negativo y no decreciente**, así que el valor del modal (tanto por `onGameOver` como por el botón FIN de React a mitad de partida) siempre es válido. La fila `games` (`id = 'buscaminas'`) la crea la spec 01.

---

## Edge cases

- **Primer clic sobre una casilla con bandera**: no revela ni coloca minas; hay que quitar la bandera primero.
- **Revelar dos veces la misma casilla** o una ya descubierta (que no sea *chording* válido): no hace nada ni suma.
- **Relleno por inundación grande** (Experto con apertura amplia): pila explícita; nunca desborda la pila de llamadas.
- **Clic fuera del tablero** (márgenes o banda HUD): se ignora.
- **Input durante `clearing`, `exploding` u `over`**: se ignora (sin acciones en cola para el tablero siguiente).
- **Pausa con pulsación larga en curso**: `pause()` cancela el temporizador; al reanudar no se pone una bandera fantasma.
- **Cambio de pestaña o pausa larga**: `resume()` resetea `lastTime` y `dt` tiene tope de 0,05 s, así que el cronómetro no da saltos.
- **Pulsar FIN en React durante `ready`**: el score emitido es 0, que `insertScore` acepta.
- **Botón derecho manteniendo el izquierdo** (doble botón clásico): se trata como *chording*.
- **Redimensionar la ventana o girar el móvil**: el `rect` se lee en cada evento, así que el mapeo de coordenadas sigue siendo correcto.
- **Contador de minas negativo** por exceso de banderas: se dibuja con signo, sin `clamp`.
- **Tablero 4+ con 130 minas** (densidad 27 %): sigue siendo jugable; el tope evita tableros imposibles.
- **Reentrada en `/jugar/buscaminas`**: `destroy()` deja el canvas sin listeners; la nueva instancia no duplica loop ni listeners.

---

## Implementation plan

Cada paso deja la app compilando y navegable.

1. **Prototipo vanilla.** Crear `references/started-games/09-buscaminas/` con `index.html` (canvas 800×600) y `game.js`: campaña de tableros de la tabla, primer clic seguro con exclusión 3×3, relleno por inundación iterativo, banderas, *chording*, cronómetro con `dt`, scoring de la spec, HUD dibujado en el canvas, ratón + teclado + pulsación larga con Pointer Events. Verificable abriendo el `index.html`.
2. **Portar el motor.** Crear `app/lib/games/buscaminas/engine.ts` con `createBuscaminasGame: GameFactory`, sin estado global de módulo (todo en el closure), sin `document.getElementById`, canvas por parámetro, `800×600`, `getContext("2d", { alpha: false })`. RAF cancelable (`rafId` nullable, `startLoop`/`stopLoop`), `dt` con tope de 0,05, `lastTime` reseteado al (re)arrancar, redibujo con dirty flag. `syncReactState()` difunde `onScore/onLives/onLevel` solo ante cambios y `onGameOver` una vez. Listeners de canvas (`pointerdown/up/move/cancel`, `contextmenu`) y de `window` (`keydown`) añadidos en `start()` y quitados en `destroy()`. Quitar cualquier "pulsa para reiniciar" del prototipo: el reinicio lo gobierna el modal de React vía `restart()`. Preservar las constantes del prototipo 1:1.
3. **Glow.** Importar `glowScale` de `app/lib/games/perf.ts` y aplicarlo a todos los `shadowBlur`.
4. **Overlay táctil.** Añadir la entrada `buscaminas` (botón `⚑` → `KeyM`, `tap`, `action-a`) a `TOUCH_MAP` en `app/lib/games/touch-map.ts` y actualizar su comentario de cabecera. No se toca `TouchControls.tsx`.
5. **Registrar.** En `app/lib/games/registry.ts`: `import { createBuscaminasGame } from "./buscaminas/engine";` + `buscaminas: createBuscaminasGame`, actualizando el comentario de cabecera. No se tocan `CanvasGame.tsx` ni `GamePlayer.tsx`.
6. **Referencia rápida.** Añadir la fila de `buscaminas` a `references/implemented-games.md`.

> No se regenera `database.types.ts` ni se corre `get_advisors`: esta spec no toca Supabase.

---

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` pasan sin errores.
- [ ] Existe `references/started-games/09-buscaminas/` con un Buscaminas vanilla jugable abriendo su `index.html`.
- [ ] `getGameEngine("buscaminas")` devuelve `createBuscaminasGame`; `rocas`, `caida`, `bloque-buster`, `serpentina` y `ranaria` siguen jugables y las maquetas siguen como maqueta.
- [ ] En `/jugar/buscaminas` el tablero 1 es 9×9 con 10 minas; el **primer clic nunca es mina** y siempre abre una región (la casilla pulsada tiene `adj = 0`).
- [ ] Revelar un 0 abre toda la región conectada de ceros y su borde numerado; las banderas dentro de la región se respetan.
- [ ] Clic derecho / `F` / pulsación larga de 350 ms ponen y quitan banderas; el menú contextual del navegador no aparece sobre el canvas.
- [ ] El *chording* sobre un número con exactamente `adj` banderas vecinas descubre las vecinas; con un número distinto de banderas no hace nada.
- [ ] Al limpiar un tablero aparece `TABLERO LIMPIO +bonus`, el HUD de React sube el nivel y se carga el siguiente tablero de la tabla (16×16/40, después 30×16/99, después Experto+).
- [ ] El HUD de React muestra un score entero que **nunca disminuye**, vidas `1` en juego y `0` al perder, y el número de tablero como nivel.
- [ ] Revelar una mina muestra la explosión, todas las minas y las banderas erróneas; tras ~1,2 s se abre el modal con la puntuación real. `onGameOver` se llama exactamente una vez.
- [ ] "JUGAR DE NUEVO" reinicia limpio: tablero 1, score 0, cronómetro 0, sin minas colocadas.
- [ ] PAUSA congela el cronómetro y bloquea el input; REANUDAR no hace saltar el cronómetro.
- [ ] Con el teclado solo (flechas/WASD + `Space` + `F`) se puede jugar un tablero completo; las flechas y `Space` no hacen scroll de la página.
- [ ] En emulación táctil (`pointer: coarse`) aparece el botón `⚑`, que alterna el modo bandera (indicado en la banda HUD); tocar el canvas no hace scroll ni zoom.
- [ ] `engine.ts` no usa estado global ni `document.getElementById`; al navegar fuera, `destroy()` cancela el RAF y el temporizador de pulsación larga y quita todos los listeners; reentrar no duplica el loop.
- [ ] `POST /api/scores` con `{ gameId: "buscaminas", name, score }` del modal inserta y la fila aparece en `/salon` y en `/juego/buscaminas`.

---

## Decisions

- **Sí:** patrón SPEC 05 (fábrica + registro), igual que SPEC 07/08/09; un único origen de verdad del ciclo de vida motor↔React.
- **Sí:** construir primero el prototipo `09-buscaminas` (no existía) y portarlo, para tener una referencia vanilla verificable como el resto de juegos.
- **Sí:** input posicional por **Pointer Events sobre el canvas** dentro del motor. El overlay de la SPEC 13 solo sintetiza teclas y no puede indicar una casilla; los Pointer Events unifican ratón y dedo sin listeners `touch*` duplicados. No contradice la SPEC 13, que prohibía reabrir motores **existentes**.
- **Sí:** pulsación larga de 350 ms + botón `⚑` de modo bandera, para que en móvil se pueda marcar sin depender solo del gesto largo.
- **Sí (supuesto documentado):** **campaña de tableros** en vez de selector de dificultad: la plataforma no tiene UI previa al juego y `onLevel` necesita un significado; el tablero es el nivel natural.
- **Sí (supuesto documentado):** **una sola vida**, fiel al clásico (`onLives 1→0`, como `serpentina`). Se descarta dar 3 vidas aquí porque ese es precisamente el twist de la variante `panal`.
- **Sí (supuesto documentado):** el tiempo entra como **bonus** (`PAR − segundos`) y no como score, porque el leaderboard ordena descendente y el score no puede bajar.
- **Sí:** primer clic seguro con exclusión 3×3 (apertura garantizada), comportamiento moderno que evita arranques a ciegas.
- **Sí:** RAF + dirty flag: ciclo de vida uniforme con el resto de motores, pero sin redibujar a 60 fps un tablero estático (SPEC 16).
- **No:** marcas de interrogación, tableros personalizados, selector de dificultad en React.
- **No:** skins, sonido, haptics, anti-cheat ni auth real: cada uno en su propia spec.

---

## Risks

| Riesgo                                                                                           | Mitigación                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mapeo de coordenadas incorrecto por el escalado CSS del canvas (clic en la casilla equivocada). | Convertir con `getBoundingClientRect()` en cada evento; criterio de aceptación con ventana estrecha y emulación móvil.                                         |
| Las capas CRT (`.crt-screen` y pseudo-elementos) interceptan los clics sobre el canvas.          | Verificar `pointer-events: none` en las capas superpuestas (ya funciona el `mousemove` de `bloque-buster`); si no, añadirlo en `globals.css` en este mismo PR. |
| En móvil la pulsación larga abre el menú contextual o selecciona texto.                         | `contextmenu` con `preventDefault`, `touch-action: none` en el canvas y `-webkit-touch-callout: none` / `user-select: none` en el `.crt-screen`.              |
| Los botones del overlay táctil tapan casillas del borde del tablero en pantallas pequeñas.       | Un único botón `⚑` en `action-a`; el tablero deja márgenes laterales; el ajuste fino del layout es de la spec responsive (SPEC 15).                           |
| Tableros de Experto+ que exigen adivinar provocan partidas que se sienten injustas.              | Tope de 130 minas; primer clic con apertura 3×3. Generar tableros sin adivinanzas se descarta por coste (solucionador) y queda para otra spec.              |
| Fugas de RAF, listeners o del `setTimeout` de pulsación larga al desmontar.                      | `destroy()` cancela los tres y restaura `touchAction`; criterio de reentrada.                                                                                 |
| `INSERT` público en `scores` permite spam.                                                       | `check` de rango/longitud (SPEC 06); sin `UPDATE/DELETE`. Endurecer con auth + anti-cheat en otra spec.                                                       |

---

## Qué **no** está en esta spec

- Alta de la fila `games`, siembra de `scores` y portada `.cover-buscaminas` (van en `01-catalogo-leaderboard-buscaminas`).
- Las variantes `zapador` y `panal`.
- Skins del juego, sonido, vibración.
- Selector de dificultad, interrogaciones y tableros sin adivinanzas.
- Anti-cheat / verificación server-side de puntuaciones.
- Auth real y vincular scores a un usuario.

Cada uno de esos, si llega, va en su propia spec.
