# SPEC 01 (game-jam/detonix) — "DETONIX": Bomberman en modo campaña 1P (catálogo + leaderboard + motor)

> **Status:** Draft
> **Depends on:** SPEC 05, SPEC 06, SPEC 13, SPEC 16
> **Date:** 2026-11-24
> **Objective:** Añadir `detonix` (DETONIX, un Bomberman de campaña para un jugador contra IA) al catálogo y al leaderboard de Arcade Vault y hacerlo jugable con un motor `createDetonixGame: GameFactory` registrado en `app/lib/games/registry.ts`, con controles de teclado y táctiles.

---

## Por qué existe esta spec

`detonix` está en `references/game-suggestions-todo.md` (tanda 2026-10-21, carril laberinto/persecución) como **Bomberman SOLO, modo campaña 1P contra IA**: bombas, laberinto destructible y propagación de la explosión en cruz. Es un arquetipo ausente del catálogo: ningún juego actual combina **terreno destructible por el propio jugador** con **daño en área diferido** (la bomba explota segundos después de soltarla, y el jugador puede morir por su propia bomba). No solapa con `gloton` (laberinto fijo, sin destrucción) ni con `cavador` (excava con el cuerpo, no con explosiones).

Esta jam toma `detonix` como **juego base** y produce **variantes jugables distintas** en `specs/game-jam/detonix/`. Esta es la **variante clásica**: campaña por fases (*stages*) con la salida oculta bajo un bloque, enemigos con IA graduada y power-ups. La variante hermana `02-detonix-frenesi` usa el mismo núcleo con otra forma de jugar y de puntuar (supervivencia por oleadas con multiplicador por cadenas).

A diferencia de las jams anteriores, que separaban catálogo (`01-catalogo-leaderboard-*`) y motor (`02-motor-*`), **cada spec de esta carpeta es completa por sí sola**: incluye el alta en catálogo y leaderboard (patrón SPEC 06), el motor (patrón SPEC 05/09), su fila de controles táctiles (patrón SPEC 13/15) y las convenciones de rendimiento (SPEC 16). Así la usuaria puede aprobar e implementar una sola variante sin depender de la otra.

En `references/started-games/` solo hay `02-asteroids`, `03-tetris`, `04-arkanoid` y `05-snake` (todos portados), y los números `06`, `07` y `08` ya los reservan los drafts de `ranaria`, `turbovia` y `patrulla-lunar`. **No existe prototipo de Bomberman**: esta spec **necesita un prototipo nuevo** en `references/started-games/09-bomberman`, que se construye y se porta igual que la SPEC 09 hizo con `05-snake`.

---

## Scope

**In:**

- Alta de `detonix` en la tabla `games` de Supabase vía migración, respetando los `check` de `cat`/`color`.
- Siembra de 12 filas en `scores` para `game_id = 'detonix'`.
- Portada `.cover-detonix` en `app/globals.css`, diseñada con `/frontend-design`.
- Prototipo vanilla en `references/started-games/09-bomberman/` (`index.html` + `core.js` + `game.js`), verificable fuera de React.
- Núcleo puro compartido `app/lib/games/detonix/core.ts` (rejilla, bombas, propagación en cruz, cadenas, movimiento por rejilla, IA de enemigos). También lo usa la variante `02-detonix-frenesi`.
- Motor `app/lib/games/detonix/engine.ts` como `createDetonixGame: GameFactory` y paleta centralizada `app/lib/games/detonix/palette.ts`.
- Registro en `app/lib/games/registry.ts`: `detonix: createDetonixGame`.
- Fila `detonix` en `TOUCH_MAP` (`app/lib/games/touch-map.ts`): d-pad mantenido + botón de bomba + botón de detonador.
- Convenciones de SPEC 16 en el motor: `getContext("2d", { alpha: false })`, frame completo pintado y `shadowBlur × glowScale()`.

**Out of scope (para futuras specs):**

- La variante de supervivencia (`detonix-frenesi`): va en `02-detonix-frenesi`.
- Sistema de skins (`clasico`/`neon`/`retro`): el motor ignora el parámetro `skin` y no se registra en `app/lib/games/skins.ts`. Lo diseñará el agente `skin-designer` en su propia spec, apoyándose en `palette.ts`.
- Sonido, guardado de partida, modo versus o cooperativo, editor de niveles, jefes finales.
- Anti-cheat, auth real y vincular scores a un usuario.
- Cambios en `TouchControls.tsx`, `CanvasGame.tsx`, `GamePlayer.tsx` o en el layout responsive (SPEC 15).

---

## Data model

No se crean tablas: se usan `games` y `scores` de la SPEC 06. Esta spec añade **datos**, una **portada**, un **contrato de motor** y una **fila de `TOUCH_MAP`**.

### Catálogo (fila en `games`)

`position` = siguiente libre: se calcula en la migración con `MAX(position) + 1` (no se fija a mano).

```sql
insert into public.games (id, title, short, long, cat, cover, color, best, plays, position)
values (
  'detonix',
  'DETONIX',
  'Abre camino a bombazos y encuentra la salida antes que ellos a ti.',
  'Un laberinto de bloques de neón y una bomba en el bolsillo. Revienta muros en cruz, atrapa a los bichos en la onda expansiva y destapa la salida oculta bajo algún bloque. Recoge más bombas, más alcance y el detonador remoto para encadenar explosiones, pero cuidado: tu propio fuego también quema. Diez fases que se vuelven más listas y más rápidas.',
  'ARCADE',
  'cover-detonix',
  'green',
  48600,
  '5.2K',
  (select coalesce(max(position), 0) + 1 from public.games)
);
```

### Siembra de `scores`

Doce filas con nombres de 1 a 10 caracteres y puntuaciones decrecientes, coherentes con `best = 48600`. Un jugador experto llega a la fase 11 o 12 a unos 4.000 puntos por fase.

```sql
insert into public.scores (game_id, name, score) values
  ('detonix', 'PX_KAI',    48600),
  ('detonix', 'NEONFOX',   44150),
  ('detonix', 'VECTORX',   40320),
  ('detonix', 'Z3R0COOL',  36900),
  ('detonix', 'SCANLINE',  32480),
  ('detonix', 'CYBER_LU',  28750),
  ('detonix', 'M00NRYU',   24600),
  ('detonix', 'BIT_LORD',  21300),
  ('detonix', 'RGB_QUEEN', 17850),
  ('detonix', 'JOY_STK',   14200),
  ('detonix', 'ATARI_KID', 10950),
  ('detonix', 'PIXEL_DAD',  7400);
```

Las partidas reales se guardan con el flujo existente: el modal de fin de `/jugar/detonix` hace `POST /api/scores` con `{ gameId: "detonix", name, score }`, y el route handler de la SPEC 06 valida (nombre 1–10 tras `trim().toUpperCase()`, score entero 0..100000000) e inserta mediante `insertScore`. Esta spec no toca ni la API ni la capa `app/lib/db/`.

### Portada `.cover-detonix`

En `app/globals.css`, sobre la base `.cover-bg` con `::before`/`::after` y el neón `var(--green)`. Motivo: una rejilla de pilares en perspectiva plana, una bomba redonda con la mecha encendida en primer plano y una explosión en cruz que ilumina dos pasillos. El diseño real lo hace `/frontend-design`, probando en los tamaños de tarjeta de `/`, `/games` y `/juego/detonix`.

### Contrato de motor

Se usa `app/lib/games/types.ts` tal cual, sin redefinirlo:

```ts
// app/lib/games/detonix/engine.ts → cumple GameFactory
export const createDetonixGame: GameFactory = (canvas, callbacks): GameEngine => {
  /* todo el estado en el closure; el parámetro skin se ignora */
};
```

### Núcleo compartido `app/lib/games/detonix/core.ts`

Funciones puras, sin DOM ni estado de módulo mutable. Las comparten esta variante y `02-detonix-frenesi`. La firma es orientativa y se fija al implementar la primera de las dos:

```ts
export const COLS = 19, ROWS = 13, CELL = 40, ORIGIN_X = 20, ORIGIN_Y = 80;
export type Tile = "empty" | "pillar" | "block";
export type Dir = "up" | "down" | "left" | "right";
export interface Bomb { col: number; row: number; fuse: number; range: number; remote: boolean; passableBy: "player" | null; }
export interface FlameCell { col: number; row: number; ttl: number; chainId: number; }
export interface ChainResult { chainId: number; bombs: Bomb[]; flames: FlameCell[]; blocksHit: Array<[number, number]>; }

export function buildArena(density: number, rng: () => number, keepClear: Array<[number, number]>): Tile[];
export function resolveDetonations(grid: Tile[], bombs: Bomb[], triggered: Bomb[], nextChainId: number): ChainResult[];
export function canEnter(grid: Tile[], bombs: Bomb[], col: number, row: number, ghost: boolean): boolean;
export function bfsNextDir(grid: Tile[], bombs: Bomb[], from: [number, number], to: [number, number], ghost: boolean): Dir | null;
```

### Arena y resolución

- El canvas interno es de `800×600`. El motor fija `canvas.width/height` y no lee el DOM.
- **Franja HUD** de `0..80px` dentro del canvas: temporizador de fase, bombas máximas, alcance, icono de detonador, patines y enemigos restantes. Score, vidas y fase van al HUD de React (`.player-hud`) por callbacks.
- **Tablero** de `19×13` celdas de `40px` (`760×520`), con origen en `(20, 80)`.
  - El **perímetro** es de pilares indestructibles.
  - Hay **pilares interiores** en las celdas con columna y fila pares (de `2` a `16` y de `2` a `10`), el patrón clásico de cuadrícula.
- **Bloques destructibles** al azar en el resto de celdas, con densidad `0.35 + 0.02 × (fase − 1)` (tope `0.55`).
- Se deja libre la "L" de salida del jugador: `(1,1)`, `(2,1)` y `(1,2)`.
- La rejilla de pilares es siempre conexa, así que cualquier celda es alcanzable reventando bloques. No hace falta validar la resolubilidad.

### Mecánicas

**Jugador**

- Arranca en `(1,1)` y se mueve de forma continua por los pasillos a `3.5` celdas/s (`+0.6` por cada PATINES, hasta 3).
- **Asistencia en esquinas:** si pide girar y su centro está a `≤ 14px` (35 % de la celda) del eje del pasillo perpendicular, el motor lo desliza hacia ese eje en vez de bloquearlo.
- La caja de colisión es de `28×28px`.

**Bombas**

- `Espacio` suelta una bomba en la celda del centro del jugador si no supera su máximo (empieza con `1`, tope `8`) y la celda no tiene ya una bomba.
- La mecha dura `2.5s`.
- La bomba es **sólida** para todos. La única excepción es el jugador que la acaba de soltar, que puede salir de ella (`passableBy = "player"` hasta que la abandona; después ya no puede volver a entrar).

**Explosión en cruz**

- Desde el centro se propaga `alcance` celdas en las cuatro direcciones (alcance inicial `2`, tope `8`).
- Se corta al llegar a un pilar.
- Al tocar un bloque, lo destruye y se detiene en él: no lo atraviesa.
- Las llamas duran `0.5s`.

**Cadena**

- Una llama que alcanza otra bomba la detona **en el mismo tick**.
- `resolveDetonations` hace un BFS sobre las bombas alcanzadas y devuelve un `ChainResult` con un `chainId` por cada componente conexo. Así, todas las bajas de una cadena se atribuyen a ella.

**Muerte del jugador**

- Muere si una llama ocupa la celda de su centro.
- También muere si la distancia entre su centro y el de un enemigo es `< 26px`.

**Detonador** (power-up)

- Con él, las bombas nuevas son `remote` y no tienen mecha.
- `KeyX` detona la más antigua.
- Se pierde al morir.

**Salida**

- Está oculta bajo un bloque al azar y aparece al destruirlo.
- Se **abre** cuando no queda ningún enemigo vivo (cambia de color y parpadea).
- Pisarla abierta completa la fase.

**Power-up de fase**

Exactamente uno por fase, oculto bajo otro bloque distinto del de la salida:

| Fase | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Power-up | FUEGO+ | BOMBA+ | FUEGO+ | PATINES | DETONADOR | BOMBA+ | FUEGO+ | BOMBA+ | PATINES | FUEGO+ |

A partir de la fase 11 se alternan BOMBA+ y FUEGO+. Si el jugador ya está en el tope, el power-up solo da los puntos de recogida.

**Temporizador de fase**

- Cada fase dura `180s`.
- Al llegar a 0 entra el **pánico**: aparecen 4 CAZADORES en las esquinas más alejadas del jugador, que valen `0` puntos para que no se puedan *farmear*.
- No mata al jugador directamente.

**Al morir**

- Se pierde una vida y la fase se **reinicia** con una disposición de bloques nueva, la misma composición de enemigos, el temporizador a `180s` y el jugador en `(1,1)`.
- Se conservan el score, las bombas, el alcance y los patines; se pierde el detonador.

### Enemigos e IA

| Tipo | Vel. (celdas/s) | Atraviesa bloques | IA | Puntos |
|---|---|---|---|---|
| GLOBO | 1.5 | No | Paseo aleatorio: en cada cruce elige una salida libre al azar (no da media vuelta salvo en callejón). | 100 |
| GOTA | 2.5 | No | Como GLOBO, pero si el jugador está en su misma fila o columna a ≤ 5 celdas con línea de visión libre, va hacia él. | 200 |
| ESPECTRO | 1.2 | Sí (no pilares ni bombas) | Rumbo directo: en cada celda elige la dirección que más reduce la distancia Manhattan al jugador. | 400 |
| CAZADOR | 3.2 | No | `bfsNextDir` hacia el jugador, recalculado cada `0.5s`; si no hay ruta, paseo aleatorio. | 800 |

- Los enemigos nunca entran en celdas con bomba.
- Nacen sobre celdas libres a **distancia Manhattan ≥ 6** de `(1,1)`.

Composición por fase:

| Fase | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| GLOBO | 4 | 3 | 2 | 2 | – | 2 | – | – | – | – |
| GOTA | – | 2 | 3 | 2 | 3 | 2 | 3 | 2 | – | 2 |
| ESPECTRO | – | – | – | 1 | 2 | 1 | 2 | 2 | 3 | 3 |
| CAZADOR | – | – | – | – | – | 1 | 1 | 2 | 3 | 3 |

**Bucle:** la fase `s > 10` usa la composición de la fase `6 + ((s − 11) mod 5)`, con velocidad de enemigos `× (1 + 0.1 × ceil((s − 10) / 5))` (tope `× 1.5`).

### Puntuación → `onScore`

- **Bloque destruido:** `+10`.
- **Enemigo:** sus puntos base. Si una misma cadena (`chainId`) mata a varios, el k-ésimo vale `base × 2^(k−1)` (tope `× 8`): el clásico multi-kill.
- **Power-up recogido:** `+100`.
- **Fase completada:** `+1000 + 10 × segundosRestantes` (entero).
- Las muertes por el **propio jugador** no restan puntos.

### Callbacks

- `onScore(score)`: se emite solo cuando el score cambia.
- `onLives(lives)`:
  - `3` al arrancar y al reiniciar.
  - Baja en 1 en el instante de cada muerte.
  - `0` en la última.
- `onLevel(fase)`: `1` al arrancar y `+1` al completar cada fase. No tiene tope.
- `onGameOver(finalScore)`: **una sola vez**, cuando `lives` llega a 0 y termina la animación de muerte (`1s`).

### Controles

**Teclado.** Los listeners están en `window`, se leen por `e.code` y se llama a `preventDefault` en todas estas teclas:

| Acción | Teclas | Tipo |
|---|---|---|
| Mover | `ArrowUp/Down/Left/Right` y `KeyW/S/A/D` | Mantenido. Se mantiene una pila de direcciones pulsadas y manda la última; `keyup` la saca de la pila. |
| Soltar bomba | `Space` | Toque, en `keydown` sin autorrepetición (se ignora `e.repeat`). |
| Detonar | `KeyX` | Toque. Solo tiene efecto con el detonador. |

- En `window` `blur` la pila se vacía para que no queden teclas pegadas.
- La pausa no se gestiona con teclas: la hace la plataforma (botón PAUSA).

**Táctil** (fila nueva en `TOUCH_MAP`, sin tocar `TouchControls.tsx`):

```ts
detonix: {
  buttons: [
    { label: "◄", code: "ArrowLeft",  key: "ArrowLeft",  hold: true,  slot: "dpad-left" },
    { label: "►", code: "ArrowRight", key: "ArrowRight", hold: true,  slot: "dpad-right" },
    { label: "▲", code: "ArrowUp",    key: "ArrowUp",    hold: true,  slot: "dpad-up" },
    { label: "▼", code: "ArrowDown",   key: "ArrowDown",  hold: true,  slot: "dpad-down" },
    { label: "⦿", code: "Space",      key: " ",          hold: false, slot: "action-a" },
    { label: "✸", code: "KeyX",       key: "x",          hold: false, slot: "action-b" },
  ],
},
```

### Estados del motor

| Estado | Descripción |
|---|---|
| `start()` | Añade los listeners, construye la fase 1, emite `onScore(0)`, `onLives(3)` y `onLevel(1)`, y arranca el RAF. |
| `pause()` | Detiene el RAF. Mechas, llamas, temporizador e IA se congelan porque solo avanzan con `dt`. |
| `resume()` | Resetea `lastTime` y reanuda el RAF sin salto de simulación. |
| `restart()` | Reset total: fase 1, 3 vidas, score 0, 1 bomba, alcance 2, sin patines ni detonador. Vacía la pila de teclas y rearma el aviso de fin. |
| `destroy()` | Cancela el RAF, quita los listeners `keydown`/`keyup`/`blur` y suelta las referencias. |

Subestados internos de la partida: `playing`, `dying` (`1s`), `stageClear` (`1.5s`, con el cartel "FASE N" en el canvas) y `over`.

### Render en canvas

- El contexto se abre con `canvas.getContext("2d", { alpha: false })` y cada frame empieza con `fillRect` completo del fondo (SPEC 16).
- Pilares y bloques se dibujan con rellenos y contornos planos, sin `shadowBlur`. Son la mayor parte del dibujo y así salen baratos.
- El glow (`shadowBlur`) se reserva a la mecha, las llamas, el jugador y la salida abierta, multiplicado por `glowScale()` (de `app/lib/games/perf.ts`), que se calcula una vez al instanciar el motor.
- Todo es procedural: no hay assets de bitmap.
- Los colores salen de `palette.ts` (verde neón de la casa para jugador y bloques, magenta para llamas y amarillo para la mecha) y no se incrustan en el código de dibujo.
- Elementos animados:
  - La bomba late según su mecha.
  - Las llamas se desvanecen con su `ttl`.
  - El jugador parpadea en `dying`.
  - Se ven textos flotantes de puntos (`+200`, `×2`) durante `0.6s`.
- No se dibujan overlays de PAUSA ni de GAME OVER en el canvas: los ponen los modales de React.

### Reglas y casos límite

- **Bomba sobre bomba o con el máximo alcanzado:** se ignora sin efecto.
- **Salir de la propia bomba:** el jugador puede salir; al quedar su caja fuera de la celda, `passableBy` pasa a `null` y ya no puede volver a entrar.
- **Muerte y salida en el mismo frame:** si una llama alcanza al jugador en el mismo frame en que pisa la salida abierta, **gana la muerte** (se evalúan antes las llamas).
- **Llama sobre la salida destapada:** hace aparecer 2 enemigos del tipo más fuerte de la composición de la fase, a distancia ≥ 4 del jugador. Valen sus puntos normales. Como máximo ocurre 3 veces por fase; después, la llama no tiene efecto sobre la salida.
- **Llama sobre un power-up destapado:** lo destruye (como el clásico).
- **Doble muerte:** si el jugador muere por llama y por enemigo en el mismo frame, cuenta **una sola** muerte.
- **`onGameOver`:** se protege con un flag para que no se emita dos veces.
- **Todos los enemigos muertos con la salida aún oculta:** la salida sigue oculta hasta que se destruya su bloque, y entonces aparece ya abierta.
- **Enemigo pisando una llama viva:** muere y se atribuye al `chainId` de esa llama, que cuenta para el multi-kill.
- **`dt` grande** (pestaña en segundo plano, tirón): `dt` tiene tope en `0.05`. A la velocidad máxima (`5.3 celdas/s × 40px × 0.05 = 10.6px`) el desplazamiento por tick es menor que media celda, así que no hay *tunneling* a través de llamas ni pilares.
- **Pánico durante `dying` o `stageClear`:** el temporizador no corre en esos subestados.

---

## Implementation plan

Cada paso deja la app compilando y navegable.

1. **Prototipo vanilla.** Crear `references/started-games/09-bomberman/` con `index.html`, `core.js` (rejilla, bombas, `resolveDetonations`, `canEnter`, `bfsNextDir`) y `game.js` (campaña completa con las tablas de este Data model). Canvas `800×600` y control con flechas, Espacio y X. Se verifica abriendo el `index.html`.
2. **Núcleo tipado.** Portar `core.js` a `app/lib/games/detonix/core.ts` con la API del Data model, puro y sin DOM. Si `02-detonix-frenesi` ya lo creó, reutilizarlo y ampliarlo sin romper su API.
3. **Paleta.** Crear `app/lib/games/detonix/palette.ts` con un único objeto `PALETTE` (fondo, pilar, bloque, jugador, mecha, llamas, salida, enemigos por tipo, texto HUD).
4. **Motor.** Crear `app/lib/games/detonix/engine.ts` como `createDetonixGame: GameFactory`, **sin estado global de módulo**.
   - Encapsular en el closure `grid`, `player`, `bombs`, `flames`, `enemies`, `exit`, `powerUp`, `stage`, `timer`, `score`, `lives`, `stats {bombs, range, skates, remote}`, `heldDirs`, `phase` y `gameOverSent`.
   - `canvas`/`ctx` llegan por parámetro, con `alpha: false`, y el canvas se fija a `800×600`.
   - Listeners de teclado y `blur` en `start()`, quitados en `destroy()`.
   - RAF cancelable (`rafId` nullable, `startLoop`/`stopLoop`), `dt` con tope `0.05` y `lastTime` reseteado al (re)arrancar.
   - `syncReactState()` difunde `onScore`/`onLives`/`onLevel` solo cuando cambian, y `onGameOver` una vez.
5. **Registro.** En `app/lib/games/registry.ts`: `import { createDetonixGame } from "./detonix/engine";` y la línea `detonix: createDetonixGame`. Actualizar el comentario de cabecera. No se tocan ni `CanvasGame.tsx` ni `GamePlayer.tsx`.
6. **Táctil.** Añadir la fila `detonix` a `TOUCH_MAP` en `app/lib/games/touch-map.ts`, tal como figura en el Data model, junto con su línea en el comentario de esquemas.
7. **Migración Supabase** (MCP `apply_migration`): el `insert` en `games` con `position = MAX + 1` y la siembra de 12 `scores`. Después, `get_advisors` debe confirmar que RLS sigue limpio. No se regenera `database.types.ts`: no cambia el esquema.
8. **Portada.** Añadir `.cover-detonix` (con sus pseudo-elementos) en `app/globals.css` usando `/frontend-design`.
9. **Documentación.** Añadir la fila de `detonix` en `references/implemented-games.md` (ID, título, categoría, descripción corta y ruta del motor).

---

## Acceptance criteria

**Build y catálogo**

- [ ] `npm run build` compila sin errores de TypeScript ni de tipos de ruta, y `npm run lint` pasa.
- [ ] Existe `references/started-games/09-bomberman/` con la campaña vanilla jugable abriendo su `index.html`.
- [ ] Existe la fila `games` con `id = 'detonix'`, `cat = 'ARCADE'`, `color = 'green'` y `cover = 'cover-detonix'`, y RLS sigue habilitado en `games` y `scores`.
- [ ] El leaderboard de `detonix` muestra las 12 filas sembradas en `/salon` y en `/juego/detonix`.
- [ ] DETONIX aparece en `/`, `/games`, `/salon` y `/juego/detonix` con la portada `.cover-detonix`.

**Juego**

- [ ] En `/jugar/detonix` se juega en canvas `800×600`:
  - el jugador recorre los pasillos con asistencia en esquinas;
  - las bombas explotan a los `2.5s` en cruz con el alcance actual;
  - los bloques se rompen y los pilares no;
  - una bomba alcanzada por una llama detona en cadena en el mismo tick.
- [ ] La salida aparece al romper su bloque, solo se abre sin enemigos vivos, y pisarla abierta suma `1000 + 10 × segundos` y pasa a la fase siguiente (`onLevel` +1).
- [ ] Los cuatro tipos de enemigo se comportan según su tabla. En particular, el ESPECTRO atraviesa bloques pero no pilares ni bombas, y el CAZADOR persigue por BFS.
- [ ] Matar a 3 enemigos con una sola cadena puntúa `base×1 + base×2 + base×4`.
- [ ] El HUD de React refleja el score real, las vidas (3 → 0) y la fase. Al morir, la fase se reinicia con bloques nuevos y se pierde el detonador.
- [ ] Al llegar el temporizador a 0 aparecen 4 CAZADORES que no dan puntos.

**Ciclo de vida y fin**

- [ ] Perder la última vida abre el modal de fin con la puntuación real (`onGameOver` una sola vez).
- [ ] "JUGAR DE NUEVO" reinicia limpio: fase 1, 3 vidas, score 0, 1 bomba y alcance 2.
- [ ] Guardar la puntuación hace `POST /api/scores` con `gameId: "detonix"` y la fila aparece en `/salon`.
- [ ] PAUSA/REANUDAR no provoca saltos: las mechas, el temporizador y los enemigos siguen exactamente donde estaban.
- [ ] `engine.ts` no usa estado global ni `document.getElementById`. Al salir del juego, `destroy()` cancela el RAF y quita los listeners, y volver a entrar no duplica el loop.

**Táctil y rendimiento**

- [ ] Con `pointer: coarse`:
  - el d-pad mantenido mueve al jugador mientras se pulsa;
  - `⦿` suelta una bomba;
  - `✸` detona con el detonador;
  - no quedan direcciones pegadas al soltar o al cambiar de pestaña.
- [ ] El motor abre el contexto con `{ alpha: false }`, sin artefactos, y con la instrumentación de SPEC 16 mantiene unos 60 fps en desktop con 8 bombas y llamas en pantalla.

**No regresión**

- [ ] `rocas`, `caida`, `bloque-buster`, `serpentina` y `ranaria` siguen jugables, y los ids sin motor siguen como maqueta.

---

## Decisions

- **Sí:** spec completa por variante (catálogo, motor, táctil y rendimiento) en lugar del par `01-catalogo`/`02-motor` de jams anteriores, para que cada variante se pueda aprobar e implementar por separado.
- **Sí:** núcleo puro `detonix/core.ts` compartido con `02-detonix-frenesi`. La lógica de bombas, cadenas e IA es idéntica y duplicarla abriría dos fuentes de bugs. Lo crea la primera variante que se implemente.
- **Sí (supuesto):** `cat = ARCADE` y `color = green`, tal como figura en el To-Do. Es un 1P contra IA, no VERSUS.
- **Sí (supuesto):** tablero `19×13` de celdas de `40px` con una franja HUD de `80px`. Es la cuadrícula impar clásica que cabe en `800×600` sin deformar el 4:3.
- **Sí (supuesto):** alcance inicial `2` (el NES empieza en 1), para que la fase 1 no se haga tediosa con bloques al 35 %. Bombas, alcance y patines tienen tope `8`/`8`/`3`.
- **Sí (supuesto):** al morir se **reinicia la fase** con bloques nuevos, como en el clásico, en vez de reaparecer en mitad del mapa con los enemigos encima. Es más justo y evita muertes encadenadas al reaparecer.
- **Sí (supuesto):** 3 vidas y ninguna vida extra, para que el HUD sea simple y el score tenga un techo comparable entre partidas.
- **Sí (supuesto):** pánico a 0 s con CAZADORES que no dan puntos, y como máximo 3 apariciones por golpear la salida. Las dos reglas impiden *farmear* puntos con enemigos infinitos.
- **Sí:** multi-kill por cadena (`× 2^(k−1)`, tope ×8). Es el sistema de puntuación clásico del Bomberman y premia atrapar grupos.
- **Sí:** movimiento continuo con asistencia en esquinas. Moverse celda a celda haría el juego más fácil de programar pero no sería Bomberman.
- **Sí:** input táctil a través de la fila de `TOUCH_MAP` (patrón SPEC 13/15), con d-pad `hold: true` porque el movimiento es continuo.
- **Sí:** render procedural y paleta en `palette.ts`, que deja preparado el sistema de skins sin implementarlo.
- **No:** skins, sonido, versus o cooperativo, guardado de partida ni jefes en esta spec.
- **No:** tocar `TouchControls.tsx`, `CanvasGame.tsx`, `GamePlayer.tsx`, `app/api/scores` ni `app/lib/db/`.

---

## Risks

| Riesgo | Mitigación |
|---|---|
| Sin asistencia en esquinas el control se siente "pegajoso" y el jugador se atasca en los pilares. | Tolerancia de `14px` hacia el eje del pasillo y un criterio de aceptación específico. Se afina primero en el prototipo. |
| Cadenas de bombas resueltas en un orden inconsistente (doble detonación, llamas perdidas). | `resolveDetonations` hace un BFS en un solo tick con un conjunto de "ya detonadas" y es una función pura, verificable en el prototipo con escenarios de 4–8 bombas. |
| La IA del CAZADOR (BFS) cuesta demasiado con varios cazadores. | El BFS se recalcula cada `0.5s` y no por frame. La rejilla tiene 247 celdas, así que el coste es despreciable. |
| El jugador queda encerrado sin poder escapar de su propia bomba. | La regla `passableBy` y la "L" libre de salida. El encierro voluntario es parte del juego, no un bug. |
| El d-pad táctil tapa las esquinas inferiores del tablero en pantallas pequeñas. | Los botones del overlay son semitransparentes, y la columna 0 y la fila 12 son pilares de perímetro. El ajuste fino corresponde a SPEC 15. |
| Teclas de dirección pegadas al perder el foco. | La pila `heldDirs` se vacía en `blur` y al reiniciar. El overlay ya emite `keyup` en `pointercancel` y `pointerleave` (SPEC 13). |
| El `shadowBlur` de llamas con 8 bombas en cadena hunde los fps en móvil. | El glow solo se aplica a entidades dinámicas, multiplicado por `glowScale()` (0,5 en táctil y 0 con reduced-motion), y pilares y bloques se dibujan sin glow. |
| `position` codificado a mano colisiona con otro juego. | Se calcula `MAX(position) + 1` dentro del propio `insert`. |
| El `INSERT` público en `scores` permite spam. | `check` de rango y longitud (SPEC 06), sin `UPDATE`/`DELETE`. El anti-cheat va en otra spec. |

---

## Qué **no** está en esta spec

- La variante de supervivencia `detonix-frenesi` (va en `02-detonix-frenesi`).
- Skins del juego y su alta en `app/lib/games/skins.ts`.
- Sonido y efectos de audio.
- Modos versus o cooperativo, editor de niveles y jefes.
- Anti-cheat, verificación server-side de puntuaciones, auth real y vincular scores a un usuario.
- Cambios de layout responsive u orientación (SPEC 15).

Cada uno de esos, si llega, va en su propia spec.
