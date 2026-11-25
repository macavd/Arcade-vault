# SPEC 02 (game-jam/gemas) — Motor Match-3 clásico para "GEMAS": `gemas` pasa a jugable

> **Status:** Draft
> **Depends on:** SPEC 05, SPEC 16, 01-catalogo-leaderboard-gemas
> **Date:** 2026-11-25
> **Objective:** Construir un prototipo vanilla de Match-3 y portarlo a un núcleo reutilizable en `app/lib/games/gemas/` con la fábrica `createGemasGame: GameFactory` registrada como `gemas`, de modo que GEMAS se juegue como un Bejeweled clásico sin límite que termina cuando no quedan movimientos.

---

## Por qué existe esta spec

La spec hermana `01-catalogo-leaderboard-gemas` da de alta `gemas` (GEMAS, `cat = PUZZLE`, `color = magenta`, `cover = cover-gemas`, `best = 74350`) y su leaderboard. Hasta que exista un motor, `getGameEngine("gemas")` devuelve `null` y `/jugar/gemas` muestra la maqueta genérica. Esta spec aporta ese **motor jugable**, siguiendo el patrón que la SPEC 05 estableció para ROCAS y que las SPEC 07/08/09 replicaron: una fábrica `GameFactory` sin estado global, que recibe el canvas por parámetro, emite su estado a React por callbacks y se limpia al desmontar.

GEMAS es un **Match-3 al estilo Bejeweled (2001)**: en un tablero de 8×8, el jugador intercambia dos gemas adyacentes; si el intercambio alinea 3 o más gemas iguales en horizontal o vertical, estas desaparecen, las de arriba caen, entran gemas nuevas por arriba y, si la caída forma nuevas líneas, se resuelven en **cascada** (con multiplicador creciente) hasta que el tablero se **estabiliza**. Si el intercambio no forma ninguna línea, las gemas vuelven a su sitio. La partida no tiene reloj ni vidas: termina cuando, con el tablero estable, **no existe ningún intercambio que forme una línea**.

Frente a los motores portados hasta ahora hay tres diferencias que justifican el nivel de detalle:

1. **No hay prototipo.** En `references/started-games/` solo están `02-asteroids`, `03-tetris`, `04-arkanoid` y `05-snake` (y los números `06`–`08` están reservados por las specs de RANARIA, TURBOVÍA y PATRULLA LUNAR). Igual que se hizo con `05-snake` antes de la SPEC 09, primero se construye un **prototipo vanilla nuevo** en `references/started-games/09-match3/` y se porta desde ahí.
2. **Es un juego por turnos con animación en tiempo real.** La lógica es discreta (rejilla, intercambios, líneas), pero cada paso (intercambio, borrado, caída, cascada) se anima. Hay que separar el **estado lógico** de la rejilla del **estado visual** de cada gema y encadenar las fases con una máquina de estados, sin bucles síncronos.
3. **Es el primer motor cuyo control principal es el puntero.** Tocar/arrastrar gemas es el gesto natural en ratón y en móvil; el teclado queda como alternativa. Esto afecta a cómo encaja con el overlay táctil de la SPEC 13 y con el layout de la SPEC 15.

Además, el motor nace como **núcleo compartido**: la variante `gemas-bomba` (spec `03-motor-gemas-bomba`) reutiliza el mismo tablero, render y máquina de estados cambiando solo sus reglas. Esta spec deja ese núcleo listo y parametrizado, pero implementa únicamente las reglas clásicas.

---

## Scope

**In:**

- **Prototipo vanilla** en `references/started-games/09-match3/` (`index.html` + `game.js`): Match-3 clásico completo en canvas `800×600`, verificable abriendo el `index.html`, como fuente del port.
- **Lógica pura del tablero** en `app/lib/games/gemas/board.ts`, sin DOM: generación inicial sin líneas, detección de líneas, máscara de borrado, gravedad, relleno, búsqueda de movimiento válido.
- **Render** en `app/lib/games/gemas/render.ts`: caché de sprites de gemas y capa estática pre-renderizadas, dibujo por frame sin `shadowBlur`.
- **Núcleo del motor** en `app/lib/games/gemas/core.ts`: `createMatch3Engine(canvas, callbacks, rules)` con la máquina de estados, el input (puntero + teclado), el ciclo de vida y el puente de callbacks; parametrizado por `Match3Rules`.
- **Fábrica clásica** en `app/lib/games/gemas/engine.ts`: `createGemasGame: GameFactory` = núcleo + `CLASSIC_RULES`.
- **Registro** en `app/lib/games/registry.ts`: `gemas: createGemasGame`.
- **Controles:** puntero (ratón, táctil y lápiz vía Pointer Events) con toque-toque y deslizamiento; teclado con cursor (flechas/WASD + `Espacio`/`Enter` + `Escape`).
- **Rendimiento según la SPEC 16** desde el primer día: contexto `{ alpha: false }`, glow pre-renderizado y escalado por `glowScale()`, pools de partículas y textos.

**Out of scope (para futuras specs):**

- Alta en `games`, siembra de `scores` y portada `.cover-gemas`: van en `01-catalogo-leaderboard-gemas`.
- Las reglas de GEMAS BOMBA (bombas con cuenta atrás, gema nova, vidas, barajado): van en `03-motor-gemas-bomba`. Esta spec solo deja los puntos de extensión en el núcleo.
- Gemas especiales en el modo clásico (power gems, hipercubos): el clásico es el Bejeweled original, solo líneas de 3+.
- Pista con penalización, modo contrarreloj, guardar la partida a medias.
- Skins de `gemas` (selector de tema, paletas `neon`/`retro`): tarea del agente `skin-designer` en su propia spec. El motor acepta el tercer parámetro `skin` del `GameFactory` y lo ignora (siempre `clasico`).
- Sonido, entrada en `TOUCH_MAP` (ver Decisions), anti-cheat, auth real.
- Tocar los motores existentes, `CanvasGame.tsx`, `GamePlayer.tsx`, `TouchControls.tsx`, la API de scores o el esquema.

---

## Data model

Esta spec **no toca Supabase**: la fila `games` de `gemas` y sus `scores` los crea `01-catalogo-leaderboard-gemas`. No hay inserts ni migraciones. Lo que introduce es el **contrato de motor** (de `app/lib/games/types.ts`, no se redefine) y el modelo interno del tablero.

```ts
// app/lib/games/gemas/engine.ts → cumple GameFactory
export const createGemasGame: GameFactory = (canvas, callbacks) =>
  createMatch3Engine(canvas, callbacks, CLASSIC_RULES);

// app/lib/games/gemas/core.ts
export interface Match3Rules {
  lives: number | null; // null → sin vidas: onLives(0) y el HUD muestra "—"
  onNoMoves: "gameover" | "shuffle"; // clásico: "gameover"
}
export const CLASSIC_RULES: Match3Rules = { lives: null, onNoMoves: "gameover" };
export function createMatch3Engine(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
  rules: Match3Rules,
): GameEngine;
```

### Modelo del tablero (`board.ts`, lógica pura)

```ts
export const COLS = 8;
export const ROWS = 8;
export type GemKind = "normal"; // 03-motor-gemas-bomba lo amplía a "normal" | "nova" | "bomba"
export interface Gem {
  id: number; // identidad estable para animar la misma gema entre fases
  type: number; // 0..GEM_TYPES-1 (color + forma)
  kind: GemKind;
}
export type Grid = (Gem | null)[][]; // grid[row][col], row 0 arriba
export interface Run {
  cells: { row: number; col: number }[];
  dir: "h" | "v";
}
export interface Move {
  a: { row: number; col: number };
  b: { row: number; col: number };
}

export function createInitialGrid(types: number, rng: () => number): Grid; // sin líneas y con ≥1 movimiento
export function findRuns(grid: Grid): Run[]; // líneas de 3+ en h y v
export function buildClearMask(runs: Run[]): boolean[][]; // unión de celdas, cada celda una vez
export function countShapeBonuses(runs: Run[]): number; // intersecciones h×v (formas L/T/+)
export function applyGravity(grid: Grid, mask: boolean[][]): FallPlan; // compacta columnas
export function refill(grid: Grid, types: number, rng: () => number): Spawn[]; // rellena huecos por arriba
export function findValidMove(grid: Grid): Move | null; // primer intercambio que forma línea
export function swapCreatesRun(grid: Grid, move: Move): boolean;
```

`rng` se inyecta (por defecto `Math.random`) para poder reproducir tableros al verificar; `board.ts` no importa nada del DOM ni guarda estado de módulo.

### Constantes (dentro del módulo, preservadas del prototipo)

| Constante                | Valor                     | Uso                                                                  |
| ------------------------ | ------------------------- | -------------------------------------------------------------------- |
| `W × H`                  | `800 × 600`               | Resolución interna (4:3, igual que `.crt-screen`).                   |
| `COLS × ROWS`            | `8 × 8`                   | Tablero.                                                             |
| `CELL`                   | `68` px                   | Celda; tablero de `544 × 544`.                                       |
| `BOARD_X`, `BOARD_Y`     | `28`, `28`                | Origen del tablero (centrado en vertical: `(600 − 544) / 2`).        |
| Panel                    | `x ∈ [600, 780]`          | SCORE, NIVEL, barra de progreso, CADENA, banners.                    |
| `GEM_TYPES_EARLY`        | `6`                       | Tipos de gema en niveles 1–2.                                        |
| `GEM_TYPES`              | `7`                       | Tipos de gema desde el nivel 3 (solo afecta a gemas nuevas).        |
| `SWAP_MS`                | `140`                     | Animación de intercambio (y de vuelta si es inválido).               |
| `CLEAR_MS`               | `220`                     | Encogido + desvanecido de las gemas borradas.                        |
| `FALL_SPEED`             | `1100` px/s               | Velocidad de caída de gemas.                                         |
| `NO_MOVES_MS`            | `1200`                    | Banner "SIN MOVIMIENTOS" antes del fin.                              |
| `LEVEL_BANNER_MS`        | `900`                     | Banner "NIVEL N" (no bloquea el input).                              |
| `HINT_DELAY_MS`          | `8000`                    | Inactividad antes de resaltar una pista.                             |
| `DRAG_THRESHOLD`         | `0.35 × CELL`             | Distancia mínima de deslizamiento para intercambiar.                 |
| `DT_CAP`                 | `0.05` s                  | Tope de `dt` por frame.                                              |

### Scoring y niveles

- **Por línea:** 3 gemas → `50`; 4 → `100`; 5 o más → `250`.
- **Bonus de forma:** `+100` por cada intersección entre una línea horizontal y una vertical (formas L, T y +).
- **Cadena:** el paso provocado por el intercambio del jugador es la cadena `1`; cada cascada siguiente dentro del mismo movimiento suma `1`. Los puntos del paso se multiplican por la cadena: `puntos = (Σ por línea + bonus de forma) × cadena`.
- **Niveles:** el nivel `L` exige acumular `LEVEL_GOAL(L) = 1500 + 500 × (L − 1)` puntos **dentro de ese nivel** (barra de progreso en el panel). Al completarla se pasa al nivel `L + 1`, se suman `500 × (L + 1)` puntos de bonus y el sobrante de progreso pasa al nivel nuevo. Alcanzar el nivel 10 ronda los ~58.000 puntos, coherente con el `best = 74350` sembrado.
- Toda puntuación es **entera** (requisito de `insertScore`: entero entre `0` y `100000000`).

### Mapeo de mecánicas a callbacks

- `onScore(score)` — cada vez que el score cambia (al puntuar un paso y al sumar un bonus de nivel). Solo ante cambios.
- `onLives(0)` — una vez al arrancar y al reiniciar: GEMAS no tiene vidas y el HUD muestra "—" (mismo criterio que CAÍDA en la SPEC 07). Se deriva de `rules.lives === null`.
- `onLevel(level)` — `1` al arrancar/reiniciar y al cambiar. Si un combo completa varios niveles de golpe, se aplican todos los bonus y se emite una sola vez el nivel final.
- `onGameOver(finalScore)` — una sola vez, al terminar el banner "SIN MOVIMIENTOS" que sigue a un tablero estable sin intercambios válidos. Una bandera `gameOverEmitted` evita repetirlo; `restart()` la resetea.

### Máquina de estados (`core.ts`)

```
IDLE ──swap──▶ SWAPPING ──sin línea──▶ SWAP_BACK ──▶ IDLE
                  │
                  └─con línea──▶ CLEARING ──▶ FALLING ──▶ (findRuns)
                                     ▲                       │ hay líneas: cadena+1
                                     └───────────────────────┘
                                                             │ no hay líneas
                                                             ▼
                                                          SETTLED
                                       ┌── subida de nivel (no bloquea)
                                       ├── hay movimiento válido ──▶ IDLE (cadena = 0)
                                       └── no hay ──▶ NO_MOVES ──▶ OVER (onGameOver)
```

Cada fase avanza en `update(dt)` con su temporizador o con la posición de las gemas; ninguna transición resuelve cascadas en un bucle síncrono. `SETTLED` es instantáneo (dura un frame). Solo `IDLE` acepta input de juego.

### Estado visual

Cada `Gem` tiene una entrada visual (mapa `id → { x, y, scale, alpha }`) que el render interpola hacia la posición lógica: el intercambio interpola las dos gemas, el borrado anima `scale`/`alpha`, y la caída mueve `y` a `FALL_SPEED` hasta su fila. Las gemas nuevas nacen por encima del tablero (filas negativas apiladas por columna) y caen dentro; el área del tablero se recorta con `ctx.clip()` para que no se vean fuera.

### Casos límite que el motor debe cubrir

1. **Tablero inicial sin líneas y con movimiento.** `createInitialGrid` rellena celda a celda excluyendo el tipo que formaría línea con las dos de la izquierda o las dos de arriba; si el resultado no tiene ningún `findValidMove`, se regenera (máximo 100 intentos; en la práctica uno). Una partida nunca empieza ya resuelta ni ya perdida.
2. **Doble conteo / doble borrado (L, T, +).** Una gema que pertenece a una línea horizontal y a una vertical se borra **una sola vez** (la máscara es una unión booleana); la gravedad trabaja sobre la máscara, no sobre la lista de líneas, así que no hay huecos fantasma. Los puntos sí cuentan cada línea más el bonus de forma.
3. **Un intercambio que forma dos líneas a la vez** (una por cada gema movida, o dos paralelas): se resuelven en el mismo paso, cadena `1`.
4. **Líneas de 6+** (posibles en cascada): puntúan como 5+.
5. **Cascadas largas.** El multiplicador de cadena no tiene tope; como cada cascada es una fase animada en frames distintos, una cadena larga nunca congela el hilo principal.
6. **Intercambio inválido** (no forma línea, o las dos gemas son del mismo tipo): se anima ida y vuelta (`SWAPPING` → `SWAP_BACK`) y no puntúa ni penaliza.
7. **Input durante la resolución.** Fuera de `IDLE` se ignoran clics, deslizamientos y teclas de juego (no hay cola); la selección se limpia al iniciar un intercambio.
8. **Sin movimientos.** Solo se evalúa en `SETTLED`, nunca a mitad de una cascada ni de una caída; con el tablero ya estable y sin intercambios válidos se pasa a `NO_MOVES` y luego a `OVER`.
9. **Varios niveles en un combo:** bucle `while (progreso ≥ meta)`, un bonus por nivel cruzado, un solo `onLevel` con el nivel final.
10. **Paso de 6 a 7 tipos** al llegar al nivel 3: solo afecta a las gemas generadas a partir de entonces; no se regenera el tablero.
11. **Pausa a mitad de animación:** congela la fase; `resume()` resetea `lastTime` para que no haya salto.
12. **`restart()` a mitad de cascada:** descarta fase, temporizadores, selección, partículas, textos y banners, y genera un tablero nuevo.
13. **Teclas mientras se escribe** (input de iniciales del modal de fin): si `e.target` es `INPUT`, `TEXTAREA` o `contentEditable`, el motor no consume la tecla ni llama `preventDefault`, para no impedir escribir espacios.
14. **Puntero fuera del tablero** (panel, márgenes) o `pointercancel`: se ignora o cancela el gesto sin intercambio. Solo cuenta el puntero primario (`isPrimary`); los dedos adicionales se ignoran.
15. **Canvas escalado.** Las coordenadas del puntero se mapean con `getBoundingClientRect()` usando factores separados `sx = 800 / rect.width` y `sy = 600 / rect.height`, para seguir funcionando si el layout responsive (SPEC 15) no conserva exactamente el 4:3.
16. **Pestaña oculta / pausa larga:** `dt` capado a `DT_CAP`; `lastTime` se resetea al reanudar.

---

## Implementation plan

Cada paso deja la app compilando y navegable; los demás juegos nunca se rompen.

1. **Prototipo vanilla.** Crear `references/started-games/09-match3/` con `index.html` + `game.js`: Match-3 clásico en canvas `800×600` con el tablero 8×8, las constantes, el scoring y la máquina de estados del Data model, controles de ratón (toque-toque y arrastre) y teclado, y el fin por "sin movimientos". Dejar en `game.js` una constante `MODE = "clasico"` (la spec 03 añadirá `"bomba"`). Verificable abriendo el `index.html`.
2. **Lógica pura.** Crear `app/lib/games/gemas/board.ts` con los tipos `Gem`/`Grid`/`Run`/`Move` y las funciones `createInitialGrid`, `findRuns`, `buildClearMask`, `countShapeBonuses`, `applyGravity`, `refill`, `findValidMove`, `swapCreatesRun`, portadas del prototipo. Sin DOM ni estado de módulo; `rng` inyectable. Compila aunque nadie lo importe todavía.
3. **Render.** Crear `app/lib/games/gemas/render.ts`: `buildGemSprites(glow)` pre-renderiza en canvas auxiliares (`document.createElement("canvas")`, `CELL × CELL`) una gema por tipo, con forma propia por tipo (rombo, círculo, cuadrado, triángulo, hexágono, estrella, pentágono) para no depender solo del color, facetas y glow con `shadowBlur` multiplicado por `glowScale()` **una sola vez**; `buildStaticLayer()` pre-renderiza fondo, marco del tablero, casillas en damero y rótulos fijos del panel; y funciones `drawFrame(ctx, view)` que pintan cada frame: capa estática, gemas recortadas al tablero (`drawImage` con `scale`/`globalAlpha`), anillo de selección, cursor de teclado, pista, partículas, textos flotantes, panel dinámico (SCORE, NIVEL, barra de progreso, CADENA ×n) y banners. Ningún `shadowBlur` por frame. La paleta vive en una constante `PALETTE` (colores exactos fijados con `/frontend-design`, legibles sobre el CRT oscuro).
4. **Núcleo.** Crear `app/lib/games/gemas/core.ts` con `Match3Rules`, `CLASSIC_RULES` y `createMatch3Engine`, SIN estado global de módulo: todo el estado (`grid`, mapa visual, `phase`, `phaseTimer`, `selected`, `cursor`, `grabbing`, `chain`, `score`, `level`, `levelProgress`, `idleTime`, `hint`, pools, `paused`, `gameOverEmitted`, `lastTime`, `rafId`) en el closure. `ctx = canvas.getContext("2d", { alpha: false })` y `canvas.width/height = 800/600`. La máquina de estados del Data model en `update(dt)`; `draw()` rellena el frame completo. `syncReactState()` difunde `onScore/onLives/onLevel` solo ante cambios. RAF cancelable (`rafId` nullable, `startLoop`/`stopLoop`), `dt` capado, `lastTime` reseteado al (re)arrancar.
5. **Input.** En el núcleo, listeners añadidos en `start()` y quitados en `destroy()`:
   - **Puntero** sobre el canvas (`pointerdown`/`pointermove`/`pointerup`/`pointercancel`): `pointerdown` en una gema la selecciona y hace `setPointerCapture`; si el puntero se desplaza más de `DRAG_THRESHOLD` en el eje dominante, intercambia con la vecina en esa dirección (deslizar); si se suelta sin arrastrar, actúa como toque: sin selección previa selecciona, sobre la misma gema deselecciona, sobre una adyacente intercambia, sobre una no adyacente cambia la selección. En `start()` se guarda y fija `canvas.style.touchAction = "none"` (sin scroll ni zoom al tocar el tablero); `destroy()` lo restaura.
   - **Teclado** (`keydown` en `window`, por `e.code`): flechas/WASD mueven el cursor; `Space`/`Enter` agarran la gema bajo el cursor; con una gema agarrada, una flecha intercambia en esa dirección; `Escape` suelta. `preventDefault` solo para esas teclas y solo si el foco no está en un campo editable (caso límite 13). El cursor se muestra tras la primera tecla y se oculta al usar el puntero.
6. **Ciclo de vida.** `start()` genera el tablero, emite `onScore(0)`, `onLives(0)`, `onLevel(1)`, añade listeners y arranca el loop. `pause()` cancela el RAF y marca `paused` (el input se ignora). `resume()` resetea `lastTime` y reanuda. `restart()` reinicia todo el estado (caso límite 12), reemite los callbacks iniciales y rearranca. `destroy()` cancela el RAF, quita todos los listeners y restaura `touchAction`. En `OVER` el loop dibuja un último frame y se detiene.
7. **Fábrica y registro.** Crear `app/lib/games/gemas/engine.ts` exportando `createGemasGame: GameFactory` (núcleo + `CLASSIC_RULES`; ignora el parámetro `skin`). En `app/lib/games/registry.ts`: `import { createGemasGame } from "./gemas/engine";` y la entrada `gemas: createGemasGame`, actualizando el comentario de cabecera. No se tocan `CanvasGame.tsx`, `GamePlayer.tsx` ni `TouchControls.tsx`.
8. **Referencia rápida.** Añadir la fila de `gemas` a `references/implemented-games.md` (ID, título, PUZZLE, descripción breve, `app/lib/games/gemas/engine.ts`).
9. **Verificación manual** (ver Acceptance criteria), incluida la instrumentación `?debug=perf` de la SPEC 16.

> No se regenera `database.types.ts` (no cambia el esquema) ni se corre `get_advisors` (no se toca Supabase).

---

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de tipos de ruta; `npm run lint` pasa.
- [ ] Existe `references/started-games/09-match3/` con un Match-3 vanilla jugable abriendo su `index.html`.
- [ ] `app/lib/games/gemas/board.ts` no importa nada del DOM ni tiene estado de módulo; `core.ts`/`engine.ts` no usan estado global ni `document.getElementById`, reciben el canvas por parámetro y fijan `800×600`.
- [ ] `registry.ts` mapea `gemas` a `createGemasGame`; `getGameEngine("gemas")` deja de devolver `null`; `rocas`, `caida`, `bloque-buster`, `serpentina` y `ranaria` siguen jugables y las maquetas siguen como maqueta.
- [ ] En `/jugar/gemas` se juega el Match-3: el tablero 8×8 aparece sin líneas hechas y con al menos un movimiento; intercambiar dos gemas adyacentes que forman línea las borra, las de arriba caen y entran nuevas; un intercambio que no forma línea se deshace con animación.
- [ ] Las cascadas se resuelven solas hasta estabilizar, con el texto "CADENA ×n" y puntos multiplicados por la cadena; una L/T borra su gema compartida una sola vez y suma el bonus de forma.
- [ ] Puntuación: 3 → 50, 4 → 100, 5+ → 250 (× cadena), +100 por forma; la barra de nivel avanza y al llenarse sube el nivel con bonus `500 × nivel`.
- [ ] El HUD de React refleja score y nivel reales; "Vidas" muestra "—" (el motor llama `onLives(0)`).
- [ ] Se puede jugar con ratón (toque-toque y arrastre), con teclado (flechas/WASD + `Espacio`/`Enter` + `Escape`) y, en emulación táctil, tocando y deslizando sobre el tablero sin que la página haga scroll ni zoom.
- [ ] Escribir las iniciales en el modal de fin (incluidos espacios) no se ve bloqueado por el motor.
- [ ] Tras ~8 s sin jugar, se resalta un intercambio válido; desaparece al interactuar.
- [ ] Cuando el tablero estable no tiene movimientos, aparece "SIN MOVIMIENTOS" y luego se abre el modal de fin con la puntuación real; nunca se declara fin a mitad de una cascada.
- [ ] PAUSA/REANUDAR congela y reanuda sin salto (también a mitad de una caída); en pausa el tablero no acepta input. "JUGAR DE NUEVO" reinicia limpio (score 0, nivel 1, tablero nuevo) aunque se pulse a mitad de una cascada.
- [ ] Al navegar fuera de `/jugar/gemas` se cancela el RAF, se quitan los listeners de puntero/teclado y se restaura `touchAction`; reentrar no duplica el loop ni los listeners.
- [ ] Con `?debug=perf` (SPEC 16) el juego mantiene ~16 ms/frame en desktop durante cascadas largas; el contexto se abre con `{ alpha: false }` sin artefactos; no hay `shadowBlur` por frame (el glow está pre-renderizado y se atenúa con `glowScale()` en `pointer: coarse` / `prefers-reduced-motion`).
- [ ] `POST /api/scores` con `{ gameId: "gemas", name, score }` tras una partida real inserta y la marca aparece en el leaderboard de `/juego/gemas` y `/salon` (no en el de `gemas-bomba`).
- [ ] No se modifican `CanvasGame.tsx`, `GamePlayer.tsx`, `TouchControls.tsx`, `touch-map.ts`, otros `engine.ts`, `app/lib/db/`, `app/api/` ni `database.types.ts`.

---

## Decisions

- **Sí:** reusar el patrón SPEC 05/09 (motor por `GameFactory` + registro), con el canvas por parámetro, estado en closure y limpieza en `destroy()`.
- **Sí:** construir primero el prototipo `references/started-games/09-match3` (no existía) y portar desde ahí, como se hizo con `05-snake` (SPEC 09) y se plantea con `06-frogger`. Numeración `09` porque `06`–`08` ya están reservados por otras specs.
- **Sí: núcleo compartido parametrizado por reglas** (`createMatch3Engine` + `Match3Rules`) y fábricas finas por variante. La variante `gemas-bomba` reutiliza tablero, render, input y ciclo de vida sin duplicar código; se descarta copiar el motor entero por variante (dos sitios que mantener) y se descarta un único `GameFactory` con modo (el registry resuelve por slug y el leaderboard va por slug; ver spec 01).
- **Sí: lógica pura separada (`board.ts`) del motor.** Las reglas del Match-3 son la parte delicada (dobles conteos, gravedad, detección de movimientos); aisladas y sin DOM, se pueden razonar y verificar con `rng` fijo.
- **Sí: máquina de estados con fases animadas**, sin resolver cascadas en un bucle síncrono. Es lo que permite ver cada cascada, aplicar el multiplicador y garantizar que una cadena larga no bloquea el hilo.
- **Sí (supuesto documentado):** tablero 8×8, celda 68 px, 6 tipos en niveles 1–2 y 7 desde el 3. Es el tamaño del Bejeweled original; empezar con 6 tipos hace el arranque más amable (más cascadas) y subir a 7 aumenta la probabilidad de quedarse sin movimientos, que es la presión natural del modo clásico.
- **Sí (supuesto documentado):** fin de partida por "sin movimientos" (como pidió el planteamiento de la jam) y sin reloj ni vidas: `onLives(0)` → "—", igual que CAÍDA.
- **Sí (supuesto documentado):** scoring 50/100/250 por línea, +100 por forma, × cadena, metas de nivel `1500 + 500·(L−1)` y bonus `500·L`, calibrado para el `best = 74350` sembrado.
- **Sí (supuesto documentado):** pista automática tras 8 s sin penalización. Evita que un jugador nuevo se atasque sin saber si quedan movimientos; penalizarla añadiría una regla más sin aportar al clásico.
- **Sí: control nativo por Pointer Events dentro del motor** (ratón, táctil y lápiz con un único camino de código), con `touch-action: none` sobre el canvas mientras el motor vive. El gesto de un Match-3 es tocar la gema, no pulsar un d-pad.
- **No: entrada en `TOUCH_MAP` (SPEC 13).** El overlay de botones taparía parte del tablero y duplicaría lo que el puntero ya resuelve; sin entrada, `TouchControls` no renderiza nada para `gemas`. El principio de la SPEC 13 ("no tocar motores existentes") no se viola: es un motor nuevo, igual que `bloque-buster` ya escucha `mousemove` por su cuenta.
- **Sí: rendimiento SPEC 16 desde el diseño:** `{ alpha: false }` con relleno completo del frame, sprites de gema y capa estática pre-renderizados (el glow se paga una vez, multiplicado por `glowScale()`), pools fijos de partículas (96) y textos flotantes (12). Se descartan dirty-rects o `OffscreenCanvas`: con ~64 `drawImage` por frame no hacen falta.
- **Sí:** el teclado no consume teclas cuando el foco está en un campo editable. Evita que `Espacio` quede bloqueado al escribir iniciales en el modal de fin.
- **No:** gemas especiales en el clásico, sonido, skins, anti-cheat, auth real: cada uno en su propia spec (las especiales viven en la variante bomba).

---

## Risks

| Riesgo                                                                                                    | Mitigación                                                                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No hay prototipo: el feel del Match-3 (tiempos de swap/caída, sensación de cascada) puede quedar torpe.  | Construir `09-match3` y ajustar `SWAP_MS`/`CLEAR_MS`/`FALL_SPEED` jugándolo antes de portar; preservar esas constantes 1:1 en el port.                                                     |
| Desincronización entre rejilla lógica y posiciones visuales (gemas que "saltan" o se solapan).           | Identidad estable `Gem.id` y mapa visual por id; la lógica avanza de fase solo cuando todas las gemas visuales han llegado a su destino.                                                   |
| Doble borrado en L/T deja huecos fantasma o columnas mal compactadas.                                     | Máscara booleana única por paso; la gravedad trabaja sobre la máscara. Verificación manual forzando L/T con `rng` fijo en el prototipo.                                                   |
| Falso "sin movimientos" (fin injusto) o fin a mitad de cascada.                                           | `findValidMove` prueba todos los intercambios derecha/abajo con `swapCreatesRun`; solo se evalúa en `SETTLED`. Verificación con un tablero construido a mano sin movimientos.              |
| Celdas pequeñas en móvil portrait (≈26–30 px CSS a 320 px de ancho) dificultan tocar la gema correcta.   | El gesto de deslizar no requiere precisión de destino; el hit-test usa la celda entera; la SPEC 15 agranda el `.crt-screen` en portrait. Revisión en emulación móvil.                     |
| `touch-action: none` queda pegado al canvas tras salir del juego.                                         | Guardar el valor previo en `start()` y restaurarlo en `destroy()`; criterio de aceptación de reentrada.                                                                                   |
| `shadowBlur` por gema en cada frame hunde los fps en móvil.                                               | Glow pre-renderizado en la caché de sprites y escalado por `glowScale()`; ningún `shadowBlur` en el loop.                                                                                  |
| Fugas de RAF/listeners al montar/desmontar en el App Router.                                              | `destroy()` cancela el RAF y quita listeners; el `useEffect` de `CanvasGame` retorna ese cleanup.                                                                                           |
| `INSERT` público en `scores` permite spam.                                                                | `check` de rango/longitud ya vigente (SPEC 06); sin `UPDATE/DELETE`. Endurecer con auth + anti-cheat en otra spec.                                                                         |

---

## Qué **no** está en esta spec

- Alta de la fila `games`, siembra de `scores` y portada `.cover-gemas` (van en `01-catalogo-leaderboard-gemas`).
- Las reglas de GEMAS BOMBA: bombas, gema nova, vidas y barajado (van en `03-motor-gemas-bomba`).
- Gemas especiales en el clásico, modo contrarreloj, pista con penalización.
- Skins de `gemas` y selector de tema.
- Sonido y efectos de audio.
- Entrada en `TOUCH_MAP` / overlay de botones táctiles.
- Anti-cheat / verificación server-side de puntuaciones.
- Auth real y vincular scores a un usuario.
- Cambios a `CanvasGame.tsx`, `GamePlayer.tsx`, `TouchControls.tsx`, a otros motores o a los contratos de la SPEC 06.

Cada uno de esos, si llega, va en su propia spec.
