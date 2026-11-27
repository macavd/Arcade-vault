# SPEC 06 (game-jam/buscaminas) — Motor de Buscaminas hexagonal para "PANAL"

> **Status:** Draft
> **Depends on:** SPEC 05, SPEC 13, SPEC 16, 05-catalogo-leaderboard-panal
> **Date:** 2026-11-27
> **Objective:** Construir un prototipo de Buscaminas sobre rejilla hexagonal y portarlo a `app/lib/games/panal/engine.ts` como `createPanalGame: GameFactory`, registrado en `registry.ts`, de modo que `panal` (dado de alta por `05-catalogo-leaderboard-panal`) sea jugable con ratón, teclado y toque.

---

## Por qué existe esta spec

`05-catalogo-leaderboard-panal` deja a PANAL en el catálogo con su leaderboard sembrado, pero sin motor. Esta spec entrega el **motor jugable** con el patrón de la SPEC 05 (fábrica `GameFactory` sin estado global, canvas por parámetro, cuatro callbacks, ciclo `start/pause/resume/restart/destroy`), como lo replicaron las SPEC 07/08/09.

PANAL comparte con BUSCAMINAS (`02-motor-buscaminas`) el flujo de juego (campaña de tableros, primer clic seguro, inundación, banderas, *chording*, bonus de tiempo) y el esquema de input posicional (Pointer Events sobre el canvas, pulsación larga, modo bandera). Cambian dos cosas que esta spec concreta:

1. **Geometría hexagonal**: coordenadas axiales, 6 vecinas, conversión de píxel a hexágono y navegación de cursor por teclado sobre una rejilla que no es ortogonal.
2. **Vidas**: 3 por partida; una mina cuesta una vida y queda marcada como detonada; limpiar un panal sin fallos devuelve una vida (hasta 3).

No existe prototipo en `references/started-games/`: **necesita prototipo nuevo**, `references/started-games/11-panal`. Si BUSCAMINAS se implementa antes, su prototipo `09-buscaminas` es la base natural.

---

## Scope

**In:**

- Prototipo vanilla `references/started-games/11-panal/` (`index.html` + `game.js`).
- Motor `app/lib/games/panal/engine.ts` exportando `createPanalGame: GameFactory`: tableros hexagonales crecientes, primer clic seguro, inundación, banderas, *chording*, vidas, bonus de tablero perfecto y HUD interno en el canvas.
- Input: ratón, teclado (cursor hexagonal) y táctil, con Pointer Events sobre el canvas.
- Entrada `panal` en `app/lib/games/touch-map.ts` (botón `⚑` → `KeyM`).
- Registro en `app/lib/games/registry.ts`: `panal: createPanalGame`.

**Out of scope (para futuras specs):**

- Alta en `games`, siembra de `scores` y portada `.cover-panal` (spec `05`).
- Formas de tablero distintas del gran hexágono (rombo, estrella), selector de dificultad, interrogaciones.
- Skins (el parámetro `skin` se acepta y se ignora), sonido, haptics, anti-cheat, auth real.
- Tocar otros motores, `CanvasGame.tsx`, `GamePlayer.tsx` o `TouchControls.tsx`.

---

## Data model

Esta spec **no toca Supabase**. Contrato del motor (tipos de `app/lib/games/types.ts`, no se redefinen):

```ts
// app/lib/games/panal/engine.ts → cumple GameFactory
export const createPanalGame: GameFactory = (canvas, callbacks, _skin = "clasico"): GameEngine => {
  /* todo el estado en el closure; sin globales de módulo */
};
```

### Objetivo de juego

Despejar todas las celdas sin mina de cada panal. Cada panal limpio lleva al siguiente, más grande y más minado. La partida termina al perder la tercera vida.

### Geometría hexagonal

- Hexágonos **pointy-top** en **coordenadas axiales** `(q, r)`. Un panal de radio `R` contiene las celdas con `max(|q|, |r|, |q + r|) ≤ R`, es decir `3R(R + 1) + 1` celdas.
- **Vecinas** (6): `(+1, 0)`, `(−1, 0)`, `(+1, −1)`, `(0, −1)`, `(0, +1)`, `(−1, +1)`. Los números van de 0 a 6.
- **Almacenamiento**: `Map<string, Cell>` con clave `` `${q},${r}` `` (o un array plano indexado por `(q + R) × (2R + 1) + (r + R)` con huecos): lo que sea más simple en el prototipo, preservado en el port.
- **Centro del tablero** `(400, 327)` (centro del área `y = 64..590`). Tamaño de hexágono (radio en px): `s = min(floor(520 / (3R + 2)), floor(760 / (√3 × (2R + 1))), 40)` → 37 px con `R = 4`, 22 px con `R = 7`.
- **Hex → píxel**: `x = cx + s × √3 × (q + r / 2)`, `y = cy + s × 1,5 × r`.
- **Píxel → hex**: `qf = (√3/3 × dx − 1/3 × dy) / s`, `rf = (2/3 × dy) / s`, seguido de **redondeo cúbico** (`x = qf`, `z = rf`, `y = −x − z`; redondear los tres y corregir el componente con mayor error). Si la celda resultante está fuera del panal, el clic se ignora.

### Campaña de panales (`onLevel`)

| Panal (`level`) | Radio `R` | Celdas | Minas                                | PAR (s) |
| --------------- | --------- | ------ | ------------------------------------ | ------- |
| 1               | 4         | 61     | 9                                    | 90      |
| 2               | 5         | 91     | 16                                   | 135     |
| 3               | 6         | 127    | 25                                   | 190     |
| 4               | 7         | 169    | 36                                   | 250     |
| 5+              | 7         | 169    | `min(36 + 4 × (level − 4), 50)`      | 250     |

### Modelo interno

```ts
type Cell = { q: number; r: number; mine: boolean; adj: number; revealed: boolean; flagged: boolean; detonated: boolean; scored: boolean };
type Phase = "ready" | "playing" | "clearing" | "exploding" | "over";
```

Estado del closure: `cells`, `R`, `mines`, `minesPlaced`, `revealedSafe`, `flags`, `level`, `lives`, `livesLostThisBoard`, `score`, `elapsed`, `phase`, `paused`, `phaseTimer`, `cursor {q, r}`, `cursorVisible`, `zigzag` (alternancia del cursor vertical), `flagMode`, `dirty`, `rafId`, `lastTime`, `lastSent`, `gameOverSent`, `longPress`.

### Mecánicas

- **Primer clic seguro**: las minas se colocan en la primera revelación de cada panal, excluyendo la celda pulsada y sus 6 vecinas (apertura garantizada). Fisher-Yates sobre las candidatas; después se calcula `adj`.
- **Revelar**: igual que el clásico, con inundación iterativa (pila) sobre 6 vecinas.
- **Mina pisada** (por revelado directo o por *chording* con una bandera mal puesta): `lives − 1`, `livesLostThisBoard + 1`, la celda queda `detonated` (visible como mina, no se puede volver a tocar) y el juego **continúa**. Si es un *chording*, se detonan todas las minas que destape esa acción, pero solo cuesta **una** vida por acción. Si `lives === 0` → fase `exploding`.
- **Bandera** y **contador** `minas − banderas − detonadas` como en el clásico.
- ***Chording***: sobre un número revelado, si `banderas + detonadas` vecinas `=== adj`, revela las vecinas tapadas sin bandera.
- **Victoria de panal**: `revealedSafe === celdas − minas`. Las minas restantes se marcan con bandera automáticamente.
- **Panal perfecto**: si `livesLostThisBoard === 0` al limpiarlo, bonus de perfecto y **+1 vida** (máximo 3).
- **Cronómetro**: `elapsed` arranca en la primera revelación del panal, avanza con `dt` solo en `playing` y sin pausa.

### Scoring (score ascendente para el leaderboard)

- **+15 × level** por celda segura revelada por primera vez.
- **Bonus de panal limpio**: `+1500 × level`.
- **Bonus de perfecto** (sin vidas perdidas en ese panal): `+750 × level` (y +1 vida, hasta 3).
- **Bonus de tiempo**: `max(0, PAR − floor(elapsed)) × 5 × level`.
- Minas y banderas no restan. Score entero y **nunca decreciente**.

Calibración (coherente con la siembra de la spec `05`): panal 1 perfecto ≈ 780 + 1 500 + 750 + 250 ≈ 3 280; panal 2 ≈ 7 400; panal 3 ≈ 12 540; panal 4 ≈ 18 580.

### Mapeo a callbacks

- `onScore(score)` — al revelar y al cobrar bonus.
- `onLives(lives)` — `3` al arrancar/reiniciar; baja con cada mina; sube con cada panal perfecto (tope 3).
- `onLevel(level)` — número de panal.
- `onGameOver(finalScore)` — **una vez**, al terminar la animación de 1,2 s de `exploding`.

Todos pasan por `syncReactState()` (solo emite cambios).

### Estados y ciclo de vida

| Fase        | Entra cuando                     | Input | Sale a                                         |
| ----------- | -------------------------------- | ----- | ---------------------------------------------- |
| `ready`     | panal nuevo (sin minas)          | sí    | `playing` en la primera revelación             |
| `playing`   | primera revelación               | sí    | `clearing` (limpio) / `exploding` (0 vidas)    |
| `clearing`  | panal limpio                     | no    | `ready` del panal `level + 1` tras 1,5 s       |
| `exploding` | `lives === 0`                    | no    | `over` tras 1,2 s (`onGameOver`)               |
| `over`      | fin de la animación              | no    | `ready` del panal 1 solo vía `restart()`       |

- `start()`: `canvas.width = 800`, `canvas.height = 600`, `getContext("2d", { alpha: false })`, panal 1, listeners, emite `onScore(0)`, `onLives(3)`, `onLevel(1)`, arranca el RAF.
- `pause()` / `resume()` / `restart()` / `destroy()`: idénticos a `02-motor-buscaminas` (pausa que cancela RAF y pulsación larga; `resume()` resetea `lastTime`; `restart()` vuelve al panal 1 con 3 vidas y `gameOverSent = false`; `destroy()` cancela RAF y temporizador, quita listeners y restaura `touchAction`).

### Controles

**Ratón y táctil**: idénticos a `02-motor-buscaminas` (Pointer Events sobre el canvas, izquierdo/derecho/central, `contextmenu` bloqueado, toque corto y pulsación larga de 350 ms, cancelación por movimiento > 10 px, solo `isPrimary`, `touch-action: none`). El punto se convierte a hexágono con la fórmula de píxel → hex tras escalar por `getBoundingClientRect()`.

**Teclado** (`keydown` en `window`, por `e.code`, `preventDefault` solo para estas teclas):

- `ArrowLeft`/`KeyA` y `ArrowRight`/`KeyD` → vecina oeste/este (`q ∓ 1`).
- `ArrowUp`/`KeyW` → sube una fila alternando NO `(0, −1)` y NE `(+1, −1)` según `zigzag`, para que pulsaciones repetidas suban en línea visual recta. `ArrowDown`/`KeyS` → baja alternando SE `(0, +1)` y SO `(−1, +1)`. Cualquier movimiento horizontal reinicia `zigzag`.
- `KeyQ` / `KeyE` / `KeyZ` / `KeyC` → diagonales directas NO / NE / SO / SE.
- Un movimiento que saldría del panal se ignora (el cursor no se mueve).
- `Space` / `Enter` → revelar o *chording*; `KeyF` / `KeyX` → bandera; `KeyM` → modo bandera.

**Overlay táctil (SPEC 13)**:

```ts
panal: {
  buttons: [{ label: "⚑", code: "KeyM", key: "m", hold: false, slot: "action-a" }],
},
```

### Render

- **Banda HUD** superior (`y = 0..64`): `MINAS nnn` (minas − banderas − detonadas), `PANAL n`, `TIEMPO nnn`, vidas como pequeños hexágonos llenos/vacíos e indicador `⚑ MODO BANDERA`.
- **Celdas**: hexágono trazado con `moveTo/lineTo` de 6 vértices (pointy-top, vértice `i` en ángulo `60° × i − 30°`), con un margen de 1–2 px entre celdas. Tapada: relleno ámbar oscuro con borde amarillo neón tenue y brillo interior. Revelada: casi negra con borde fino. Números con el código de color neón de BUSCAMINAS (1–6). Bandera triangular; mina con glow; **mina detonada** con fondo magenta y grieta (permanece visible el resto del panal).
- **Cursor**: contorno amarillo brillante parpadeante sobre el hexágono, solo si `cursorVisible`.
- **Transiciones**: `PANAL LIMPIO +bonus` (y `PERFECTO +1 ♥` si aplica) en `clearing`; onda expansiva hexagonal en `exploding`; destello corto al perder una vida sin terminar la partida.
- **Rendimiento**: los trazados de los hexágonos (`Path2D`) se precalculan al crear el panal y se reutilizan; redibujo con dirty flag como en el clásico; `shadowBlur × glowScale()` (SPEC 16).

### Integración con Supabase (`scores`)

El motor no habla con Supabase. `onGameOver(score)` abre el modal de `GamePlayer.tsx`, que hace `POST /api/scores` con `{ gameId: "panal", name, score }`; `insertScore` exige entero en `0..100000000` y `getTopScores` ordena descendente. El score del motor es siempre entero, no negativo y no decreciente (válido también si se pulsa FIN a mitad de partida). La fila `games` la crea la spec `05`.

---

## Edge cases

- **Clic en el hueco entre hexágonos o fuera del gran hexágono**: el redondeo cúbico da la celda más cercana; si queda fuera del panal, se ignora.
- **Clic sobre una mina detonada**: no hace nada (no cuesta otra vida).
- ***Chording* que destapa varias minas**: una sola vida por acción, todas quedan detonadas.
- **Panal perfecto con 3 vidas**: se cobra el bonus de perfecto, las vidas se quedan en 3 (sin exceder).
- **Pierde la última vida en la misma acción que completaría el panal**: imposible por construcción (una acción que detona no puede completar el panal, porque la victoria solo cuenta celdas seguras y la acción se resuelve antes de comprobarla); si las vidas llegan a 0, prevalece `exploding`.
- **Cursor de teclado al cambiar de panal**: se recoloca en `(0, 0)` y se oculta hasta la siguiente tecla.
- **Primer clic con bandera**, **input durante `clearing`/`exploding`/`over`**, **pausa con pulsación larga en curso**, **redimensionado**, **FIN en `ready`** y **reentrada**: igual que en `02-motor-buscaminas`.

---

## Implementation plan

Cada paso deja la app compilando y navegable.

1. **Prototipo vanilla.** Crear `references/started-games/11-panal/` con `index.html` (canvas 800×600) y `game.js`: geometría axial, conversiones hex↔píxel con redondeo cúbico, campaña de panales, primer clic seguro (exclusión de 7 celdas), inundación, banderas, *chording*, vidas con perfecto, scoring de la spec, HUD en el canvas, ratón + teclado (zigzag) + pulsación larga. Verificable abriendo el `index.html`.
2. **Portar el motor.** Crear `app/lib/games/panal/engine.ts` con `createPanalGame: GameFactory`, sin estado global, canvas por parámetro, `800×600`, `alpha: false`, RAF cancelable con dirty flag, `dt` con tope de 0,05, `lastTime` reseteado al (re)arrancar, `syncReactState()`, listeners en `start()`/`destroy()`, `Path2D` precalculados. Sin "pulsa para reiniciar". Constantes del prototipo 1:1.
3. **Glow.** `glowScale()` de `app/lib/games/perf.ts` aplicado a todos los `shadowBlur`.
4. **Overlay táctil.** Entrada `panal` en `TOUCH_MAP` (`⚑` → `KeyM`) y comentario de cabecera actualizado.
5. **Registrar.** `import { createPanalGame } from "./panal/engine";` + `panal: createPanalGame` en `app/lib/games/registry.ts`, comentario actualizado.
6. **Referencia rápida.** Fila de `panal` en `references/implemented-games.md`.

> No se regenera `database.types.ts` ni se corre `get_advisors`.

---

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` pasan sin errores.
- [ ] Existe `references/started-games/11-panal/` jugable abriendo su `index.html`.
- [ ] `getGameEngine("panal")` devuelve `createPanalGame`; los motores existentes siguen jugables y las maquetas siguen como maqueta.
- [ ] En `/jugar/panal` el panal 1 es un gran hexágono de 61 celdas con 9 minas; el primer clic nunca es mina y siempre abre región.
- [ ] Los números van de 0 a 6 y cuentan exactamente las 6 vecinas hexagonales (verificable revelando el panal al perder).
- [ ] Clic, toque y cursor de teclado seleccionan siempre la celda bajo el puntero o el cursor, también cerca de los bordes entre hexágonos y con la ventana redimensionada.
- [ ] Pisar una mina quita una vida, deja la mina detonada visible y la partida continúa; con 0 vidas se ve la explosión y, tras ~1,2 s, el modal con la puntuación real. `onGameOver` se llama exactamente una vez.
- [ ] Limpiar un panal sin perder vidas muestra `PERFECTO +1 ♥` y sube una vida (sin pasar de 3); después se carga el panal siguiente de la tabla.
- [ ] El HUD de React muestra un score entero que **nunca disminuye**, las vidas reales (3 al inicio) y el número de panal como nivel.
- [ ] Con teclado solo (flechas/WASD/QEZC + `Space` + `F`) se puede jugar un panal completo; ↑ repetido sube en zigzag recto.
- [ ] PAUSA congela el cronómetro y el input; REANUDAR no lo hace saltar. "JUGAR DE NUEVO" reinicia limpio (panal 1, 3 vidas, score 0).
- [ ] En emulación táctil aparece `⚑`; toque corto revela, pulsación larga pone bandera, sin scroll ni zoom.
- [ ] `engine.ts` sin estado global ni `document.getElementById`; `destroy()` cancela RAF y temporizadores y quita listeners; reentrar no duplica el loop.
- [ ] `POST /api/scores` con `{ gameId: "panal", name, score }` del modal inserta y aparece en `/salon` y `/juego/panal`.

---

## Decisions

- **Sí:** patrón SPEC 05 (fábrica + registro), como SPEC 07/08/09.
- **Sí:** prototipo nuevo `11-panal` antes del port.
- **Sí:** input posicional por Pointer Events sobre el canvas (criterio de `00-jam.md`).
- **Sí (supuesto documentado):** hexágonos **pointy-top** con coordenadas **axiales** y redondeo cúbico (técnica estándar documentada por Red Blob Games): conversión y vecindad triviales y sin casos especiales por fila par/impar.
- **Sí (supuesto documentado):** panal con forma de **gran hexágono** (simétrico, sin esquinas de 2 vecinas como en un rombo), y radios 4→7 para que la celda más pequeña (22 px) siga siendo tocable en móvil junto con el escalado del CRT.
- **Sí (supuesto documentado):** **3 vidas** con mina detonada visible y +1 vida por panal perfecto. Es el twist de curva respecto al clásico (que tiene una vida) y compensa que el hexágono obliga más a menudo a adivinar.
- **Sí (supuesto documentado):** *chording* que cuenta minas detonadas como banderas, porque son minas conocidas.
- **Sí (supuesto documentado):** cursor vertical en **zigzag** (NO/NE alternos), porque en una rejilla hexagonal no existe "arriba" puro; QEZC para quien prefiera diagonales explícitas.
- **No:** otras formas de tablero, selector de dificultad, interrogaciones.
- **No:** skins, sonido, haptics, anti-cheat ni auth real.

---

## Risks

| Riesgo                                                                                | Mitigación                                                                                                                         |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Errores de redondeo en píxel → hex (clic en la celda vecina equivocada).              | Redondeo cúbico con corrección del componente de mayor error; criterio de aceptación sobre clics cerca de los bordes entre celdas. |
| Celdas demasiado pequeñas para el dedo en móvil con `R = 7`.                          | Tope de `R = 7` (22 px internos); la pulsación larga y el cursor ayudan; el layout móvil del CRT es de la SPEC 15.                 |
| Navegación de cursor confusa en hexágonos.                                            | Zigzag automático + diagonales QEZC + movimientos fuera del panal ignorados; probar con teclado solo.                               |
| La regla de vidas desequilibra la puntuación (farmear el bonus de perfecto).          | El perfecto solo se cobra una vez por panal y no hay forma de repetir un panal; vidas con tope de 3.                               |
| Mismos riesgos de capas CRT, menú contextual y fugas de listeners que en BUSCAMINAS. | Mismas mitigaciones que `02-motor-buscaminas`.                                                                                     |
| `INSERT` público en `scores` permite spam.                                            | `check` de rango/longitud (SPEC 06); endurecer en otra spec.                                                                       |

---

## Qué **no** está en esta spec

- Alta de la fila `games`, siembra de `scores` y portada `.cover-panal` (spec `05`).
- Las variantes `buscaminas` y `zapador`.
- Otras formas de tablero y selector de dificultad.
- Skins, sonido, haptics, anti-cheat y auth real.

Cada uno de esos, si llega, va en su propia spec.
