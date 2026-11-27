# SPEC 04 (game-jam/buscaminas) — Motor de Buscaminas de scroll infinito para "ZAPADOR"

> **Status:** Draft
> **Depends on:** SPEC 05, SPEC 13, SPEC 16, 03-catalogo-leaderboard-zapador
> **Date:** 2026-11-27
> **Objective:** Construir un prototipo de Buscaminas con campo descendente infinito y portarlo a `app/lib/games/zapador/engine.ts` como `createZapadorGame: GameFactory`, registrado en `registry.ts`, de modo que `zapador` (dado de alta por `03-catalogo-leaderboard-zapador`) sea jugable con ratón, teclado y toque.

---

## Por qué existe esta spec

`03-catalogo-leaderboard-zapador` deja a ZAPADOR en el catálogo con su leaderboard sembrado, pero sin motor. Esta spec entrega el **motor jugable** con el patrón de la SPEC 05 (fábrica `GameFactory` sin estado global, canvas por parámetro, cuatro callbacks, ciclo `start/pause/resume/restart/destroy`), como lo replicaron las SPEC 07/08/09.

ZAPADOR comparte con BUSCAMINAS (`02-motor-buscaminas`) las reglas de deducción (números de 0 a 8, banderas, *chording*, relleno por inundación) y el esquema de input posicional (Pointer Events sobre el canvas, cursor de teclado, pulsación larga, modo bandera). Cambia el eje temporal: la rejilla **no es fija**, es una columna de 12 casillas que **desciende sin parar** y se genera sin fin por arriba. Cada fila que cruza la **línea de detonación** con casillas seguras sin descubrir cuesta una vida. Esto obliga a resolver dos problemas que el clásico no tiene, y que esta spec concreta: números **definitivos** en un campo que aún no existe por arriba y relleno por inundación que llega al borde superior.

No existe prototipo en `references/started-games/`: **necesita prototipo nuevo**, `references/started-games/10-zapador`. Si BUSCAMINAS se implementa antes, su prototipo `09-buscaminas` sirve de base para el render de casillas y el input.

---

## Scope

**In:**

- Prototipo vanilla `references/started-games/10-zapador/` (`index.html` + `game.js`).
- Motor `app/lib/games/zapador/engine.ts` exportando `createZapadorGame: GameFactory`: generación infinita de filas, scroll continuo, línea de detonación, vidas, rachas, turbo, niveles de velocidad y densidad, HUD lateral en el canvas.
- Input: ratón, teclado (cursor de casilla anclado a la fila) y táctil, con Pointer Events sobre el canvas.
- Entrada `zapador` en `app/lib/games/touch-map.ts`: botón `⚑` (`KeyM`, toque) y botón `»` (`KeyT`, mantenido) para el turbo.
- Registro en `app/lib/games/registry.ts`: `zapador: createZapadorGame`.

**Out of scope (para futuras specs):**

- Alta en `games`, siembra de `scores` y portada `.cover-zapador` (spec `03`).
- Garantizar filas sin adivinanzas (requeriría un solucionador): las 3 vidas absorben esos casos.
- Skins (el parámetro `skin` se acepta y se ignora), sonido, haptics, anti-cheat, auth real.
- Tocar otros motores, `CanvasGame.tsx`, `GamePlayer.tsx` o `TouchControls.tsx`.

---

## Data model

Esta spec **no toca Supabase**. Contrato del motor (tipos de `app/lib/games/types.ts`, no se redefinen):

```ts
// app/lib/games/zapador/engine.ts → cumple GameFactory
export const createZapadorGame: GameFactory = (canvas, callbacks, _skin = "clasico"): GameEngine => {
  /* todo el estado en el closure; sin globales de módulo */
};
```

### Objetivo de juego

Sobrevivir el mayor número de filas posible: descubrir **todas las casillas seguras** de cada fila antes de que cruce la línea de detonación, sin pisar minas. La partida termina al perder la tercera vida.

### Geometría (canvas 800×600)

- `COLS = 12`, `CELL = 40` px. Campo en `x = 160..640` (480 px), centrado.
- **Línea de detonación** `LINE_Y = 560`. La franja `560..600` es la **zona roja**.
- Las filas se identifican por un índice creciente `n` (fila 0 = la primera de abajo). Con un desplazamiento acumulado `scroll` (px, float), el borde superior de la fila `n` está en `top(n) = LINE_Y − CELL × (n + 1) + scroll`.
- Por encima del borde visible se mantiene un **búfer de 2 filas generadas** que no se ven (`top < −40`).
- Paneles laterales dentro del canvas: izquierda `x = 0..150`, derecha `x = 650..800`.

### Modelo interno

```ts
type Cell = { mine: boolean; adj: number | null; revealed: boolean; flagged: boolean; scored: boolean; pending: boolean };
type Row = { n: number; cells: Cell[]; evaluated: boolean; free: boolean };
type Phase = "ready" | "playing" | "exploding" | "over";
```

Estado del closure: `rows: Row[]` (ordenadas por `n`), `nextRow`, `scroll`, `rowsEvaluated`, `level`, `lives`, `score`, `streak`, `turboHeld`, `flagMode`, `cursor {n, c}`, `cursorVisible`, `phase`, `paused`, `phaseTimer`, `flashes[]` (animaciones cortas), `rafId`, `lastTime`, `lastSent`, `gameOverSent`, `longPress`.

### Mecánicas

- **Generación de filas.** Mientras la fila más alta tenga `top > −80`, se genera la fila `nextRow++`. Cada casilla es mina con probabilidad `density(level) = min(0.12 + 0.015 × (level − 1), 0.24)`, usando el nivel vigente al generarla.
- **Números definitivos.** El `adj` de la fila `n` se calcula **en el momento en que se genera la fila `n + 1`**: entonces ya existen `n − 1`, `n` y `n + 1`, que son todas sus vecinas. Para la fila 0, la fila `−1` cuenta como sin minas. Como las filas que se descartan por abajo ya tenían su `adj` calculado, eliminarlas no altera ningún número. Una casilla con `adj === null` (solo la fila más alta del búfer, siempre fuera de pantalla) no puede revelarse.
- **Apertura inicial (sustituye al "primer clic seguro").** Las filas 0–3 se generan **sin minas** y, al crear la partida, se revelan por inundación desde la fila 0, lo que también descubre los ceros y el borde numerado por encima. Esas filas se marcan `free`: no puntúan y no dan bonus de fila. Así la partida siempre empieza con información.
- **Inundación al borde superior.** Si el relleno de un 0 alcanza una casilla vecina con `adj === null`, esta se marca `pending`. Al calcular su `adj` (cuando se genera la fila de encima), toda casilla `pending` se revela y, si es 0, la inundación continúa. Resultado: abrir un 0 arriba sigue siendo coherente con el clásico.
- **Scroll.** Arranca con la **primera acción** de la jugadora (revelar o bandera), en fase `ready`. Velocidad `speed(level) = min(10 + 3 × (level − 1), 40)` px/s (de 4 s a 1 s por fila). Con el **turbo** pulsado, ×4.
- **Revelar / bandera / *chording*.** Igual que en `02-motor-buscaminas` (inundación iterativa con pila; *chording* solo con número de banderas exactamente igual a `adj`). Solo se puede actuar sobre filas no evaluadas cuyo borde superior esté por encima de `LINE_Y`.
- **Mina pisada.** No termina la partida: `lives − 1`, `streak = 0`, la casilla queda como **mina detonada** (cuenta como resuelta a efectos de su fila). Destello corto (0,4 s) sin detener el scroll. Si `lives === 0` → fase `exploding`.
- **Evaluación de fila.** Cuando `top(n) ≥ LINE_Y` (la fila ha pasado entera por debajo de la línea), la fila se evalúa **una sola vez**:
  - **Resuelta** si todas sus casillas sin mina están reveladas: `streak + 1` y bonus de fila (salvo filas `free`).
  - **Fallida** en otro caso: `lives − 1`, `streak = 0`, las casillas seguras no reveladas destellan en magenta. Si `lives === 0` → `exploding`.
  - `rowsEvaluated + 1`; `level = 1 + floor(rowsEvaluated / 15)`.
  - Las filas con `top ≥ 600` se descartan del array.
- **Racha.** Número de filas resueltas seguidas. Se reinicia con una mina o una fila fallida.
- **Turbo.** Mientras se mantiene, ×4 de velocidad y ×1,5 al bonus de las filas evaluadas durante el turbo. Es una apuesta: más puntos y menos tiempo para leer.

### Scoring (score ascendente para el leaderboard)

- **+10** por cada casilla segura revelada por primera vez fuera de las filas `free` (incluidas las de la inundación y las `pending` que se revelan después).
- **Bonus de fila resuelta**: `Math.round(50 × level × (1 + min(streak, 10) / 10) × (turbo ? 1.5 : 1))`, donde `streak` ya incluye la fila actual (multiplicador de ×1,1 a ×2).
- Minas pisadas y filas fallidas **no restan**: cuestan vidas, no puntos. El score es entero y **nunca baja**.

### Mapeo a callbacks

- `onScore(score)` — al revelar casillas y al cobrar bonus de fila.
- `onLives(lives)` — `3` al arrancar/reiniciar; baja con cada mina pisada o fila fallida.
- `onLevel(level)` — tramo de velocidad y densidad (`1 + floor(rowsEvaluated / 15)`).
- `onGameOver(finalScore)` — **una vez**, al terminar la animación de 1,2 s de la fase `exploding`.

Todos pasan por `syncReactState()` (solo emite cambios).

### Estados y ciclo de vida

| Fase        | Entra cuando                            | Scroll | Input | Sale a                                 |
| ----------- | --------------------------------------- | ------ | ----- | -------------------------------------- |
| `ready`     | partida creada (apertura ya revelada)   | no     | sí    | `playing` en la primera acción         |
| `playing`   | primera acción                          | sí     | sí    | `exploding` al llegar a 0 vidas        |
| `exploding` | `lives === 0`                           | no     | no    | `over` tras 1,2 s (`onGameOver`)       |
| `over`      | fin de la animación                     | no     | no    | `ready` solo vía `restart()`           |

- `start()`: `canvas.width = 800`, `canvas.height = 600`, `getContext("2d", { alpha: false })`, crea la partida (filas 0–3 libres + búfer), añade listeners, emite `onScore(0)`, `onLives(3)`, `onLevel(1)` y arranca el RAF.
- `pause()`: `paused = true`, cancela el RAF, suelta el turbo (`turboHeld = false`) y cancela una pulsación larga en curso.
- `resume()`: resetea `lastTime` (el campo no da un salto) y rearranca el RAF.
- `restart()`: recrea la partida desde cero, `gameOverSent = false`, re-emite los tres callbacks, rearranca el RAF; no re-añade listeners.
- `destroy()`: cancela el RAF y el temporizador de pulsación larga, quita todos los listeners (canvas y `window`, incluido `blur`) y restaura `canvas.style.touchAction`.

### Controles

**Ratón y táctil**: idénticos a `02-motor-buscaminas` (Pointer Events sobre el canvas; izquierdo = revelar/*chording*; derecho = bandera con `contextmenu` bloqueado; central = *chording*; toque corto = revelar; pulsación larga de 350 ms = bandera; movimiento > 10 px o `pointercancel` = cancela; solo `isPrimary`; `touch-action: none` en el canvas). El mapeo de coordenadas usa `getBoundingClientRect()` y **el `scroll` actual** para traducir `y` a fila: `n = floor((LINE_Y + scroll − y) / CELL)`.

**Teclado** (`keydown`/`keyup` en `window`, por `e.code`, `preventDefault` solo para estas teclas):

- `Arrow*` / `KeyW/A/S/D` → mueven el cursor. El cursor está **anclado a una fila** (`cursor.n`), así que baja con el scroll; si su fila se evalúa, sube a `n + 1`.
- `Space` / `Enter` → revelar o *chording*. `KeyF` / `KeyX` → bandera. `KeyM` → modo bandera.
- `KeyT` o `ShiftLeft`/`ShiftRight` **mantenidos** → turbo (se suelta en `keyup` y en `blur` de la ventana).

**Overlay táctil (SPEC 13)**:

```ts
zapador: {
  buttons: [
    { label: "⚑", code: "KeyM", key: "m", hold: false, slot: "action-a" },
    { label: "»", code: "KeyT", key: "t", hold: true, slot: "action-b" },
  ],
},
```

### Render

- **Campo**: casillas tapadas en relieve con borde cian tenue; reveladas casi negras; números neón por valor (mismo código de color que BUSCAMINAS); banderas y minas detonadas como en el clásico.
- **Línea de detonación** en `y = 560`, magenta, con glow pulsante. La **zona roja** `560..600` tiñe en rojo las filas que la atraviesan (ya evaluadas, no interactivas).
- **Aviso de proximidad**: las filas no resueltas a ≤ 2 filas de la línea parpadean con un borde de aviso.
- **Evaluación**: destello verde y texto flotante `+bonus` en la fila resuelta; destello magenta en las casillas que faltaban en una fila fallida.
- **Panel izquierdo**: `FILAS`, `NIVEL`, `VEL` (filas/s). **Panel derecho**: vidas (iconos), `RACHA ×m`, indicador `TURBO` cuando está activo e indicador `⚑ MODO BANDERA`.
- **Cursor de teclado**: contorno amarillo, solo si `cursorVisible`.
- En fase `ready`: rótulo `DESPEJA PARA EMPEZAR` sobre el campo.
- Glow multiplicado por `glowScale()` (SPEC 16). Aquí el redibujo es a 60 fps (el campo se mueve siempre), pero cada `draw()` solo dibuja las filas visibles (unas 16).

### Integración con Supabase (`scores`)

El motor no habla con Supabase. `onGameOver(score)` abre el modal de `GamePlayer.tsx`, que hace `POST /api/scores` con `{ gameId: "zapador", name, score }`; `insertScore` exige entero en `0..100000000` y `getTopScores` ordena descendente. El score del motor es siempre entero, no negativo y no decreciente, así que también es válido si la jugadora pulsa FIN a mitad de partida. La fila `games` la crea la spec `03`.

---

## Edge cases

- **Varias filas evaluadas en el mismo frame** (turbo con `dt` alto): se evalúan en orden ascendente de `n`; si las vidas llegan a 0 a mitad, se detiene la evaluación y se entra en `exploding`.
- **Fila sin casillas seguras** (todo minas, muy improbable): se considera resuelta en cuanto se evalúa.
- **Clic sobre una fila en la zona roja o en el búfer**: se ignora.
- **Clic justo en el borde entre dos filas mientras el campo se mueve**: la fila se calcula con el `scroll` del instante del `pointerdown` (no del `pointerup`), y la casilla se guarda en el `pointerdown`.
- **Pulsación larga cuya fila cruza la línea antes de los 350 ms**: al dispararse, si la fila ya está evaluada, no hace nada.
- **Turbo mantenido al pausar, cambiar de pestaña o perder el foco**: `pause()` y `blur` lo sueltan; no se reanuda solo.
- **`resume()` tras pausa larga**: `lastTime` reseteado y `dt` con tope de 0,05 s; con turbo el desplazamiento máximo por frame es de 8 px (menos de una casilla), así que no hay "túneles".
- **Inundación que alcanza el búfer**: casillas `pending`, reveladas en cuanto su número es definitivo.
- **Crecimiento del array**: las filas con `top ≥ 600` se descartan; en memoria nunca hay más de ~18 filas.
- **Bandera sobre una mina que cruza la línea**: es indiferente para la evaluación (solo cuentan las casillas seguras).
- **FIN en React durante `ready`**: score 0, válido para `insertScore`.
- **Reentrada en `/jugar/zapador`**: sin loops ni listeners duplicados.

---

## Implementation plan

Cada paso deja la app compilando y navegable.

1. **Prototipo vanilla.** Crear `references/started-games/10-zapador/` con `index.html` (canvas 800×600) y `game.js`: generación infinita con búfer, `adj` diferido, apertura inicial, inundación con `pending`, scroll por niveles, línea de detonación, evaluación de filas, vidas, racha, turbo, scoring de la spec, paneles laterales, ratón + teclado + pulsación larga. Verificable abriendo el `index.html`; calibrar `speed`/`density` jugando.
2. **Portar el motor.** Crear `app/lib/games/zapador/engine.ts` con `createZapadorGame: GameFactory`, sin estado global de módulo, canvas por parámetro, `800×600`, `alpha: false`, RAF cancelable, `dt` con tope de 0,05, `lastTime` reseteado al (re)arrancar, `syncReactState()`, listeners añadidos en `start()` y quitados en `destroy()`. Sin "pulsa para reiniciar". Constantes del prototipo 1:1.
3. **Glow.** Aplicar `glowScale()` de `app/lib/games/perf.ts` a todos los `shadowBlur`.
4. **Overlay táctil.** Añadir la entrada `zapador` a `TOUCH_MAP` (`⚑` → `KeyM` toque; `»` → `KeyT` mantenido) y actualizar el comentario de cabecera.
5. **Registrar.** `import { createZapadorGame } from "./zapador/engine";` + `zapador: createZapadorGame` en `app/lib/games/registry.ts`, actualizando el comentario.
6. **Referencia rápida.** Añadir la fila de `zapador` a `references/implemented-games.md`.

> No se regenera `database.types.ts` ni se corre `get_advisors`.

---

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` pasan sin errores.
- [ ] Existe `references/started-games/10-zapador/` jugable abriendo su `index.html`.
- [ ] `getGameEngine("zapador")` devuelve `createZapadorGame`; los motores existentes siguen jugables y las maquetas siguen como maqueta.
- [ ] Al entrar en `/jugar/zapador` las 4 filas inferiores aparecen despejadas con números en su borde, y el campo **no se mueve** hasta la primera acción.
- [ ] El campo desciende de forma continua; los números de las casillas visibles **nunca cambian** después de mostrarse (incluido al descartar filas por abajo).
- [ ] Abrir un 0 cerca del borde superior revela, cuando entran en pantalla, las casillas contiguas de la fila siguiente (inundación diferida).
- [ ] Una fila que cruza la línea con todas sus casillas seguras abiertas suma bonus (texto `+N`) y sube la racha; una fila con alguna sin abrir quita una vida y reinicia la racha.
- [ ] Pisar una mina quita una vida sin terminar la partida mientras queden vidas; con la tercera vida perdida se ve la explosión y, tras ~1,2 s, el modal con la puntuación real. `onGameOver` se llama exactamente una vez.
- [ ] El HUD de React muestra un score entero que **nunca disminuye**, vidas 3→0 y un nivel que sube cada 15 filas, con un aumento visible de velocidad.
- [ ] Mantener `T`/`Shift` (o el botón `»` en táctil) acelera el campo ×4 y se suelta al soltar la tecla, al pausar o al cambiar de pestaña.
- [ ] El cursor de teclado baja con su fila y salta a la de encima cuando su fila se evalúa; con teclado solo se puede jugar.
- [ ] PAUSA congela el campo y el input; REANUDAR no hace saltar el campo.
- [ ] En emulación táctil aparecen `⚑` y `»`; tocar el canvas revela, la pulsación larga pone bandera, no hay scroll ni zoom de página.
- [ ] `engine.ts` sin estado global ni `document.getElementById`; `destroy()` cancela RAF y temporizadores y quita listeners; reentrar no duplica el loop.
- [ ] `POST /api/scores` con `{ gameId: "zapador", name, score }` del modal inserta y aparece en `/salon` y `/juego/zapador`.

---

## Decisions

- **Sí:** patrón SPEC 05 (fábrica + registro), como SPEC 07/08/09.
- **Sí:** prototipo nuevo `10-zapador` antes del port.
- **Sí:** input posicional por Pointer Events sobre el canvas (mismo criterio que `02-motor-buscaminas` y `00-jam.md`).
- **Sí (supuesto documentado):** `adj` **diferido** (se calcula cuando existe la fila de encima) más un búfer de 2 filas ocultas: es la forma más simple de garantizar que ningún número visible cambie en un campo infinito.
- **Sí (supuesto documentado):** **apertura inicial** de 4 filas sin minas en vez de "primer clic seguro" por reubicación: reubicar una mina en un campo con números ya visibles cambiaría números a la vista.
- **Sí (supuesto documentado):** 3 vidas; mina pisada y fila fallida cuestan una vida cada una y no restan puntos, para que el score sea siempre no decreciente.
- **Sí (supuesto documentado):** la fila se evalúa cuando ha pasado **entera** bajo la línea (no al tocarla), para que se pueda actuar sobre ella mientras cualquier parte siga por encima: más legible en pantallas pequeñas.
- **Sí (supuesto documentado):** turbo como apuesta de riesgo/recompensa (×4 de velocidad, ×1,5 de bonus): da al jugador experto un acelerador y a la variante una identidad arcade.
- **Sí:** `cat = ARCADE` (ver spec `03`).
- **No:** generar filas sin adivinanzas (coste de solucionador); las vidas absorben esos casos.
- **No:** skins, sonido, haptics, anti-cheat ni auth real.

---

## Risks

| Riesgo                                                                                     | Mitigación                                                                                                                         |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Clics "a destiempo": la casilla bajo el dedo se mueve entre `pointerdown` y `pointerup`.   | Resolver la casilla en el `pointerdown` con el `scroll` de ese instante; velocidad base baja (4 s por fila).                       |
| Números incoherentes al generar o descartar filas.                                         | `adj` diferido + búfer de 2 filas; criterio de aceptación explícito ("los números nunca cambian").                                 |
| Dificultad mal calibrada (demasiado lenta al principio o imposible a partir del nivel 6). | Calibrar `speed`/`density` en el prototipo antes del port; topes de 40 px/s y densidad 0,24.                                       |
| Coste de render a 60 fps en móvil.                                                          | Solo ~16 filas visibles × 12 casillas; `alpha: false` y `glowScale()` (SPEC 16).                                                   |
| Turbo "pegado" si se pierde el `keyup` (cambio de pestaña o botón táctil).                 | Soltar en `blur`, `pause()` y `destroy()`; el overlay de la SPEC 13 ya emite `keyup` en `pointercancel`/`pointerleave`.            |
| Mismo riesgo de capas CRT y menú contextual que en BUSCAMINAS.                              | Mismas mitigaciones que `02-motor-buscaminas`.                                                                                     |
| `INSERT` público en `scores` permite spam.                                                 | `check` de rango/longitud (SPEC 06); endurecer en otra spec.                                                                       |

---

## Qué **no** está en esta spec

- Alta de la fila `games`, siembra de `scores` y portada `.cover-zapador` (spec `03`).
- Las variantes `buscaminas` y `panal`.
- Filas garantizadas sin adivinanzas.
- Skins, sonido, haptics, anti-cheat y auth real.

Cada uno de esos, si llega, va en su propia spec.
