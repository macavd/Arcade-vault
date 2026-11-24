# SPEC 02 (game-jam/detonix) — "DETONIX FRENESÍ": supervivencia contrarreloj por oleadas con multiplicador de cadena (catálogo + leaderboard + motor)

> **Status:** Draft
> **Depends on:** SPEC 05, SPEC 06, SPEC 13, SPEC 16
> **Date:** 2026-11-24
> **Objective:** Añadir `detonix-frenesi` (DETONIX FRENESÍ, una variante de Bomberman de supervivencia contrarreloj en arena única, con oleadas infinitas y puntuación multiplicada por cadenas de explosiones y combos) al catálogo y al leaderboard, y hacerlo jugable con un motor `createDetonixFrenesiGame: GameFactory` registrado en `app/lib/games/registry.ts`, con controles de teclado y táctiles.

---

## Por qué existe esta spec

Esta jam toma `detonix` (Bomberman 1P contra IA, sugerido en `references/game-suggestions-todo.md`) como juego base y produce variantes jugables distintas. `01-detonix-campana` es la versión clásica. En ella se **explora**: se avanza por fases, se busca una salida oculta y se puntúa sobre todo por limpiar fases rápido.

**DETONIX FRENESÍ** cambia de verdad la forma de jugar y de puntuar:

| | Campaña | Frenesí |
|---|---|---|
| Objetivo | Salir de cada fase | **Aguantar**: un reloj que se agota y solo se recarga matando |
| Espacio | Fases sucesivas | **Arena única** en la que los bloques **vuelven a crecer** |
| Enemigos | Plantilla fija por fase | **Oleadas** sin fin que entran por 4 portales |
| Puntuación | Multi-kill clásico | **Tamaño de la cadena** (cuántas bombas detonan juntas) **× nivel de combo** (bajas seguidas sin pausa) |

El juego deja de premiar la prudencia y premia **preparar redes de bombas** y detonarlas en el momento en que la oleada entra en ellas. Una misma partida puede dar 2.000 o 200.000 puntos según lo bien que se encadene, lo que da al leaderboard un rango muy distinto al de la campaña.

La spec es **completa por sí sola**: incluye el catálogo y el leaderboard (patrón SPEC 06), el motor (patrón SPEC 05/09), la fila táctil (SPEC 13/15) y las convenciones de rendimiento (SPEC 16). Comparte con `01-detonix-campana` el núcleo puro `app/lib/games/detonix/core.ts` y su prototipo, pero **no depende de que la campaña esté implementada**: si se implementa primero esta variante, crea ella el núcleo con la misma API.

**Necesita prototipo nuevo.** No existe un Bomberman en `references/started-games/`, así que se usa `references/started-games/09-bomberman/` (el mismo de la campaña), al que se añade el modo `frenesi.js`.

---

## Scope

**In:**

- Alta de `detonix-frenesi` en `games` vía migración, respetando los `check`.
- Siembra de 12 filas en `scores` para `game_id = 'detonix-frenesi'`.
- Portada `.cover-detonix-frenesi` en `app/globals.css`, diseñada con `/frontend-design`.
- Prototipo vanilla `references/started-games/09-bomberman/frenesi.html` + `frenesi.js`, sobre el mismo `core.js` de la campaña (se crea si aún no existe).
- Núcleo compartido `app/lib/games/detonix/core.ts`: se reutiliza si ya existe y, si no, se crea con la API del Data model.
- Motor `app/lib/games/detonix-frenesi/engine.ts` como `createDetonixFrenesiGame: GameFactory`, que reusa `app/lib/games/detonix/palette.ts` (se crea si no existe).
- Registro en `app/lib/games/registry.ts`: `"detonix-frenesi": createDetonixFrenesiGame`.
- Fila `detonix-frenesi` en `TOUCH_MAP`: d-pad mantenido y botón de bomba.
- Convenciones de SPEC 16: `alpha: false`, frame completo pintado y `shadowBlur × glowScale()`.

**Out of scope (para futuras specs):**

- La campaña por fases (`detonix`): va en `01-detonix-campana`.
- Skins: el motor ignora `skin` y no se registra en `skins.ts`.
- Detonador remoto, salida, fases, jefes y power-ups exclusivos de la campaña.
- Ranking por semanas o temporadas, retos diarios con semilla fija y multijugador.
- Sonido, anti-cheat, auth real y vincular scores a un usuario.
- Cambios en `TouchControls.tsx`, `CanvasGame.tsx`, `GamePlayer.tsx` o en el layout responsive (SPEC 15).

---

## Data model

No se crean tablas: se usan `games` y `scores` de la SPEC 06. Esta spec añade **datos**, una **portada**, un **contrato de motor** y una **fila de `TOUCH_MAP`**.

### Catálogo (fila en `games`)

```sql
insert into public.games (id, title, short, long, cat, cover, color, best, plays, position)
values (
  'detonix-frenesi',
  'DETONIX FRENESÍ',
  'Oleadas sin fin, un reloj que se agota: encadena bombas o muere.',
  'Una sola arena, cuatro portales escupiendo bichos y un reloj que solo se recarga matando. Siembra redes de bombas, espera a que la oleada entre y desata una reacción en cadena: cada bomba que detona junta multiplica los puntos y cada baja seguida sube el combo. Los bloques vuelven a crecer, los enemigos se vuelven más listos y el reloj no perdona.',
  'ARCADE',
  'cover-detonix-frenesi',
  'magenta',
  186400,
  '3.7K',
  (select coalesce(max(position), 0) + 1 from public.games)
);
```

### Siembra de `scores`

Doce filas decrecientes y coherentes con `best = 186400`. Una cadena de 4 bombas con combo ×3 que mata a 3 GOTAs da `600 × 4 × 3 = 7.200` puntos de golpe.

```sql
insert into public.scores (game_id, name, score) values
  ('detonix-frenesi', 'NEONFOX',   186400),
  ('detonix-frenesi', 'PX_KAI',    171250),
  ('detonix-frenesi', 'SCANLINE',  154800),
  ('detonix-frenesi', 'VECTORX',   139300),
  ('detonix-frenesi', 'Z3R0COOL',  122650),
  ('detonix-frenesi', 'RGB_QUEEN', 108900),
  ('detonix-frenesi', 'CYBER_LU',   93400),
  ('detonix-frenesi', 'BIT_LORD',   78150),
  ('detonix-frenesi', 'M00NRYU',    64800),
  ('detonix-frenesi', 'JOY_STK',    49250),
  ('detonix-frenesi', 'PIXEL_DAD',  35600),
  ('detonix-frenesi', 'ATARI_KID',  22300);
```

Las partidas reales se guardan con el flujo existente: el modal de fin de `/jugar/detonix-frenesi` hace `POST /api/scores` con `{ gameId: "detonix-frenesi", name, score }`. El route handler de la SPEC 06 valida (nombre 1–10, score entero 0..100000000) e inserta. No se tocan ni la API ni `app/lib/db/`.

### Portada `.cover-detonix-frenesi`

En `app/globals.css`, sobre la base `.cover-bg` y el neón `var(--magenta)`. Motivo: una **reacción en cadena** de tres o cuatro cruces de fuego solapadas que recorren la rejilla en diagonal, un contador de combo "×4" en tipografía CRT y un reloj de arena o cronómetro parpadeando en una esquina. Debe distinguirse de un vistazo de `.cover-detonix` (verde, una sola bomba). El diseño real lo hace `/frontend-design`.

### Contrato de motor

```ts
// app/lib/games/detonix-frenesi/engine.ts → cumple GameFactory
export const createDetonixFrenesiGame: GameFactory = (canvas, callbacks): GameEngine => {
  /* todo el estado en el closure; skin se ignora */
};
```

### Núcleo compartido `app/lib/games/detonix/core.ts`

La API es idéntica a la de `01-detonix-campana`: la primera de las dos specs que se implemente la crea y la otra la reutiliza sin romperla.

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

Esta variante usa siempre `remote = false`: no tiene detonador.

### Arena y resolución

- El canvas interno es de `800×600` y el motor fija `canvas.width/height`.
- **Franja HUD** de `0..80px` en el canvas, con tres elementos:
  - el **reloj** grande, que pasa a rojo y parpadea por debajo de 10 s;
  - el **medidor de combo** (nivel y barra de ventana restante);
  - bombas máximas, alcance y patines.

  Score, vidas y oleada van al HUD de React por callbacks.
- **Tablero** de `19×13` celdas de `40px` con origen en `(20, 80)`, perímetro de pilares y pilares interiores en las celdas de columna y fila pares, igual que la campaña.
- El jugador arranca en el **centro** `(9,6)` (una celda libre del patrón), con la cruz `(8,6)`, `(10,6)`, `(9,5)` y `(9,7)` libre.
- **Portales** de aparición en las cuatro esquinas interiores: `(1,1)`, `(17,1)`, `(1,11)` y `(17,11)`. Se dibujan como anillos pulsantes, y en ellos y en sus vecinas inmediatas nunca se colocan bloques.
- La densidad inicial de bloques es de `0.30`, generada con `buildArena`.

### Mecánicas

**Base compartida con la campaña** (implementada en `core.ts`):

- **Movimiento y bombas:** movimiento continuo a `3.5` celdas/s con asistencia en esquinas (`≤ 14px`) y caja de `28×28px`.
- **Explosión:** bomba sólida con mecha de `2.5s`, explosión en cruz que se corta en los pilares y se detiene en el primer bloque, y llamas de `0.5s`.
- **Cadenas:** detonación en cadena en el mismo tick mediante `resolveDetonations`, con un `chainId` por componente conexo.
- **Valores iniciales:** 1 bomba y alcance 2.

**Reloj**

- Empieza en `90s` y baja en tiempo real; solo avanza con `dt`, así que en pausa no corre.
- Se recarga por cada baja: `+2s` por GLOBO o GOTA y `+3s` por ESPECTRO o CAZADOR.
- Limpiar una oleada da `+8s`.
- Tope de `99s`.
- **Al llegar a 0 termina la partida**, queden las vidas que queden.

**Oleadas**

- La oleada `n` trae `min(3 + n, 14)` enemigos que salen de los portales de uno en uno, cada `0.6s`, rotando de portal.
- Nunca hay más de `10` enemigos vivos a la vez: el resto espera en cola.
- Un portal no hace aparecer a nadie si el jugador está a ≤ 2 celdas de él; espera al siguiente ciclo.
- La oleada termina cuando no queda nadie vivo ni en cola. Tras `3s` de respiro, en los que el reloj **sí** corre, entra la `n + 1`.

**Composición por oleada**

Se sortea cada enemigo con estos pesos:

| Oleadas | GLOBO | GOTA | ESPECTRO | CAZADOR |
|---|---|---|---|---|
| 1–2 | 100 % | – | – | – |
| 3–4 | 60 % | 40 % | – | – |
| 5–7 | 30 % | 45 % | 25 % | – |
| 8+ | 15 % | 35 % | 25 % | 25 % |

**Velocidad de los enemigos:** la base de la tabla `× (1 + 0.04 × (n − 1))`, con tope `× 1.6`.

**Enemigos e IA** (los mismos tipos que en la campaña):

| Tipo | Vel. (celdas/s) | Atraviesa bloques | IA | Puntos base |
|---|---|---|---|---|
| GLOBO | 1.5 | No | Paseo aleatorio en cruces (no da media vuelta salvo en callejón). | 100 |
| GOTA | 2.5 | No | Paseo aleatorio; si el jugador está en su fila o columna a ≤ 5 celdas con visión libre, va hacia él. | 200 |
| ESPECTRO | 1.2 | Sí (no pilares ni bombas) | Rumbo directo que reduce la distancia Manhattan al jugador. | 400 |
| CAZADOR | 3.2 | No | `bfsNextDir` al jugador cada `0.5s`; si no hay ruta, paseo aleatorio. | 800 |

**Rebrote de bloques**

- Cada `8s`, si la densidad de bloques está por debajo de `0.30`, hasta 4 celdas vacías al azar se marcan como **brote**: un contorno parpadeante, transitable e inofensivo.
- Tras `1s` el brote se solidifica, salvo si en ese momento hay un jugador, un enemigo, una bomba, una llama o un power-up en la celda, en cuyo caso se cancela.
- Nunca brota en un portal ni en sus vecinas, ni a distancia Manhattan ≤ 2 del jugador.

**Power-ups**

- Cada bloque destruido tiene un `12 %` de probabilidad de soltar uno, repartido al 40 % BOMBA+, 40 % FUEGO+ y 20 % PATINES.
- Topes: bombas `6`, alcance `6`, patines `3`.
- Un power-up en el suelo desaparece a los `10s` si nadie lo recoge, y una llama lo destruye.
- **No hay detonador** en esta variante (ver Decisions).

**Muerte**

- El jugador muere si una llama ocupa la celda de su centro o si la distancia a un enemigo es `< 26px`.
- Pierde una vida, el combo se rompe a ×1 y pierde **un nivel** de bombas, alcance y patines, sin bajar de los valores iniciales.
- Reaparece en la celda libre **más alejada de todos los enemigos** (distancia Manhattan mínima máxima entre las celdas alcanzables desde el centro), con `2s` de invulnerabilidad en las que parpadea.
- Las bombas ya puestas siguen su mecha.
- El reloj **no** se detiene.

### Puntuación → `onScore` (el twist)

Cada **evento puntuable** vale:

```
puntos = base × tamañoCadena × multCombo
```

**`base`:**

| Evento | Base |
|---|---|
| Bloque destruido | 10 |
| Enemigo | Sus puntos base |
| Power-up recogido | 50 (no se multiplica por cadena: su tamaño de cadena es 1) |

**`tamañoCadena`:** el número de bombas del `ChainResult` cuya llama causó el evento, con tope `8`.

- Una bomba suelta vale ×1 y una red de 5 bombas detonadas juntas, ×5.
- Una baja por una llama que sigue viva se atribuye al `chainId` de esa llama.

**`multCombo`:** el contador `K` cuenta las bajas de enemigos sin que pasen más de `3s` entre una y la siguiente.

| `K` | 0–2 | 3–5 | 6–9 | ≥ 10 |
|---|---|---|---|---|
| Multiplicador | ×1 | ×2 | ×3 | ×4 |

- El combo **se rompe** (K = 0) si pasan `3s` sin bajas o si el jugador muere.
- Los bloques destruidos no suben `K`, pero sí se benefician del multiplicador vigente.

**Bonus de oleada:** `+500 × n` al limpiar la oleada `n`, sin multiplicar.

**Textos flotantes:** cada evento muestra en el canvas el desglose, por ejemplo `400 ×5 ×3`, y al cerrarse una cadena de 3 o más bombas se muestra el cartel "CADENA ×N".

### Callbacks

- `onScore(score)`: se emite solo cuando cambia.
- `onLives(lives)`: `3` al arrancar y al reiniciar, baja en cada muerte y llega a `0` en la última.
- `onLevel(n)`: el **número de oleada**. Es `1` al arrancar y sube al empezar cada oleada nueva.
- `onGameOver(finalScore)`: **una sola vez**, con lo que ocurra primero:
  - el reloj llega a 0 (con un cartel "TIEMPO" de `1s`);
  - las vidas llegan a 0 (tras la animación de muerte de `1s`).

### Controles

**Teclado.** Los listeners están en `window`, se leen por `e.code` y se llama a `preventDefault` en estas teclas:

| Acción | Teclas | Tipo |
|---|---|---|
| Mover | `ArrowUp/Down/Left/Right` y `KeyW/S/A/D` | Mantenido: pila de direcciones pulsadas en la que manda la última. |
| Soltar bomba | `Space` | Toque en `keydown`; se ignora `e.repeat`. |

- `KeyX` se ignora: no hay detonador.
- La pila se vacía en `window` `blur`.
- La pausa la gestiona la plataforma, no una tecla.

**Táctil** (fila nueva en `TOUCH_MAP`, sin tocar `TouchControls.tsx`):

```ts
"detonix-frenesi": {
  buttons: [
    { label: "◄", code: "ArrowLeft",  key: "ArrowLeft",  hold: true,  slot: "dpad-left" },
    { label: "►", code: "ArrowRight", key: "ArrowRight", hold: true,  slot: "dpad-right" },
    { label: "▲", code: "ArrowUp",    key: "ArrowUp",    hold: true,  slot: "dpad-up" },
    { label: "▼", code: "ArrowDown",  key: "ArrowDown",  hold: true,  slot: "dpad-down" },
    { label: "⦿", code: "Space",      key: " ",          hold: false, slot: "action-a" },
  ],
},
```

### Estados del motor

| Estado | Descripción |
|---|---|
| `start()` | Añade los listeners, crea la arena, el reloj a `90s` y la oleada 1; emite `onScore(0)`, `onLives(3)` y `onLevel(1)`, y arranca el RAF. |
| `pause()` | Detiene el RAF. El reloj, las mechas, la ventana de combo, los brotes y la cola de aparición se congelan. |
| `resume()` | Resetea `lastTime` y reanuda sin salto. En concreto, **la ventana de combo no caduca por estar en pausa**. |
| `restart()` | Reset total: arena nueva, oleada 1, reloj a `90s`, 3 vidas, score 0, combo a 0, valores iniciales, pila de teclas vacía y flag de fin rearmado. |
| `destroy()` | Cancela el RAF, quita `keydown`/`keyup`/`blur` y suelta las referencias. |

Subestados internos: `playing`, `respite` (`3s` entre oleadas), `dying` (`1s`), `timeUp` (`1s`) y `over`.

### Render en canvas

- El contexto se abre con `alpha: false` y cada frame empieza con el relleno completo del fondo (SPEC 16).
- Pilares y bloques se dibujan planos, sin `shadowBlur`. Los brotes son un contorno discontinuo parpadeante.
- El glow, multiplicado por `glowScale()` (que se calcula una vez), se reserva a la mecha, las llamas, el jugador, los portales y los textos de cadena.
- Las llamas de una cadena de 3 o más bombas se pintan con un tono más intenso para que se lea la reacción.
- El HUD de la franja superior muestra el reloj, la barra de combo con la ventana de 3 s vaciándose y su `×N`, y los iconos de bombas, alcance y patines.
- Los colores salen de `palette.ts`, con el magenta como acento de esta variante.
- Todo es procedural, sin bitmaps.
- No hay overlays de pausa ni de fin en el canvas: los pone React.

### Reglas y casos límite

- **Cadenas que se juntan en el mismo tick:** si dos mechas acaban en el mismo tick y sus cruces se tocan, `resolveDetonations` las une en **una sola** cadena (un único `chainId` con la suma de bombas). Si no se tocan, son dos cadenas independientes.
- **Bomba nueva sobre una llama viva:** detona en el tick siguiente como cadena nueva de tamaño 1. No hereda el tamaño de la cadena anterior, para evitar inflar el multiplicador con bombas "tardías".
- **Una baja con dos llamas:** un enemigo alcanzado por llamas de dos cadenas en el mismo tick se atribuye a la de **mayor** tamaño, y solo cuenta una vez.
- **Reloj a 0 y muerte en el mismo frame:** `onGameOver` se emite una sola vez, con un flag. El score final incluye los eventos de ese frame.
- **Reloj a 0 durante el respiro:** la partida termina igual. El respiro no protege el reloj.
- **Recarga después de morir:** el reloj puede recargarse con bajas producidas por bombas puestas antes de morir; cuentan como bajas normales.
- **Combo durante la invulnerabilidad:** el combo no se mantiene, porque morir lo rompe. Durante los `2s` de invulnerabilidad sí se puede volver a subir.
- **Jugador encerrado por un rebrote:** no puede ocurrir. Nunca brota a ≤ 2 celdas del jugador, y un brote se cancela si alguien está en la celda.
- **Cola llena:** con 10 enemigos vivos, la cola de la oleada espera. Una oleada no puede empezar sin haber vaciado la anterior.
- **Portal bloqueado por una bomba:** una bomba en la celda del portal retrasa la aparición hasta que explote. Es una táctica válida ("tapar el portal").
- **Granjear bloques no compensa:** los bloques valen poco (10 × cadena × combo), no suben `K` y el rebrote está limitado a la densidad `0.30`.
- **`dt` grande:** tope de `0.05`. Con el multiplicador ×1.6, el CAZADOR va a `5.12 celdas/s` (unos `10.2px` por tick), menos de media celda, así que no hay *tunneling*.

---

## Implementation plan

Cada paso deja la app compilando y navegable.

1. **Prototipo vanilla.** En `references/started-games/09-bomberman/`, crear `core.js` si no existe (la misma API que en la campaña), y además `frenesi.html` y `frenesi.js` con el modo completo de este Data model: reloj, oleadas, portales, rebrote, combo y cadena. Se verifica abriendo `frenesi.html`.
2. **Núcleo tipado.** Si `app/lib/games/detonix/core.ts` existe (campaña implementada), reutilizarlo tal cual. Si no, portarlo desde `core.js` con la API del Data model.
3. **Paleta.** Reutilizar `app/lib/games/detonix/palette.ts` o crearlo, añadiendo las entradas propias de esta variante: portal, brote, medidor de combo y reloj en alarma.
4. **Motor.** Crear `app/lib/games/detonix-frenesi/engine.ts` como `createDetonixFrenesiGame: GameFactory`, **sin estado global de módulo**.
   - Encapsular en el closure `grid`, `player`, `bombs`, `flames`, `chains` (de `chainId` a tamaño), `enemies`, `spawnQueue`, `sprouts`, `powerUps`, `wave`, `clock`, `combo {K, window}`, `score`, `lives`, `stats`, `heldDirs`, `phase` y `gameOverSent`.
   - `canvas`/`ctx` llegan por parámetro, con `alpha: false`, y el canvas se fija a `800×600`.
   - Listeners en `start()`, quitados en `destroy()`.
   - RAF cancelable, `dt` con tope `0.05` y `lastTime` reseteado al (re)arrancar.
   - `syncReactState()` emite solo cuando hay cambios, y `onGameOver` una vez.
5. **Registro.** En `app/lib/games/registry.ts`: `import { createDetonixFrenesiGame } from "./detonix-frenesi/engine";` y la línea `"detonix-frenesi": createDetonixFrenesiGame`, actualizando el comentario. No se tocan ni el reproductor ni `CanvasGame.tsx`.
6. **Táctil.** Añadir la fila `"detonix-frenesi"` a `TOUCH_MAP` en `app/lib/games/touch-map.ts` y su línea en el comentario de esquemas.
7. **Migración Supabase** (MCP `apply_migration`): el `insert` en `games` con `position = MAX + 1` y la siembra de 12 `scores`. Después, `get_advisors`. No se regenera `database.types.ts`.
8. **Portada.** Añadir `.cover-detonix-frenesi` (con sus pseudo-elementos) en `app/globals.css` con `/frontend-design`.
9. **Documentación.** Añadir la fila de `detonix-frenesi` en `references/implemented-games.md`.

---

## Acceptance criteria

**Build y catálogo**

- [ ] `npm run build` compila sin errores de TypeScript ni de tipos de ruta, y `npm run lint` pasa.
- [ ] Existe `references/started-games/09-bomberman/frenesi.html`, jugable en vanilla.
- [ ] Existe la fila `games` con `id = 'detonix-frenesi'`, `cat = 'ARCADE'`, `color = 'magenta'` y `cover = 'cover-detonix-frenesi'`, con RLS intacto.
- [ ] El leaderboard muestra las 12 filas sembradas en `/salon` y en `/juego/detonix-frenesi`, y el juego aparece en `/` y en `/games` con su portada.

**Reloj, oleadas y arena**

- [ ] En `/jugar/detonix-frenesi` se juega en canvas `800×600`: el jugador empieza en el centro, los enemigos entran por los 4 portales y la oleada 1 trae 4 GLOBOS.
- [ ] El reloj arranca en 90, baja en tiempo real, se recarga +2/+3 s por baja y +8 s por oleada, nunca supera 99, y al llegar a 0 abre el modal de fin.
- [ ] Al limpiar una oleada hay 3 s de respiro y `onLevel` sube. Nunca hay más de 10 enemigos vivos.
- [ ] Los bloques rebrotan con un aviso de 1 s, nunca a ≤ 2 celdas del jugador ni en los portales, y un brote con una entidad encima se cancela.

**Puntuación**

- [ ] Una red de 4 bombas detonadas en cadena que mata a una GOTA con combo ×1 suma exactamente `200 × 4 × 1 = 800`, y el canvas muestra el desglose.
- [ ] El combo sube a ×2 a la 3.ª baja seguida, a ×3 a la 6.ª y a ×4 a la 10.ª. Se rompe tras 3 s sin bajas o al morir.

**Ciclo de vida y fin**

- [ ] Al morir se pierde una vida y un nivel de cada stat, se reaparece en la celda libre más alejada de los enemigos con 2 s de invulnerabilidad, y el reloj sigue corriendo.
- [ ] Con 0 vidas o con el reloj a 0, `onGameOver` se emite **una sola vez** con el score real.
- [ ] "JUGAR DE NUEVO" reinicia limpio: oleada 1, reloj 90, 3 vidas, score 0 y combo ×1.
- [ ] Guardar la puntuación hace `POST /api/scores` con `gameId: "detonix-frenesi"` y la fila aparece en `/salon`.
- [ ] PAUSA/REANUDAR congela el reloj, las mechas y la ventana de combo. Al reanudar, ni el reloj salta ni el combo caduca.
- [ ] `engine.ts` no usa estado global ni `getElementById`. `destroy()` cancela el RAF y los listeners, y volver a entrar no duplica el loop.

**Táctil y rendimiento**

- [ ] Con `pointer: coarse`, el d-pad mantenido mueve al jugador, `⦿` suelta una bomba, no hay botón de detonador y no quedan direcciones pegadas.
- [ ] Con la instrumentación de SPEC 16, el juego mantiene unos 60 fps en desktop con 10 enemigos, 6 bombas en cadena y textos flotantes en pantalla, y el contexto se abre con `{ alpha: false }` sin artefactos.

**No regresión**

- [ ] Los juegos ya jugables (`rocas`, `caida`, `bloque-buster`, `serpentina`, `ranaria` y, si está implementado, `detonix`) siguen funcionando.

---

## Decisions

- **Sí:** el twist es **supervivencia contrarreloj por oleadas con multiplicador por cadena × combo**, en vez de un modo puzle con bombas limitadas. Cambia a la vez el objetivo (aguantar en lugar de salir), el espacio (arena única con rebrote) y la puntuación (premia preparar redes de bombas). Además es procedural, así que no exige diseñar y validar a mano niveles de puzle resolubles, que serían el mayor riesgo de alcance.
- **Sí:** slug propio `detonix-frenesi` con su propia fila en `games` y su propio leaderboard, porque las escalas de score no son comparables con la campaña.
- **Sí (supuesto):** `color = magenta`, para distinguirlo de un vistazo de la campaña (verde) en la biblioteca. `cat = ARCADE`, porque sigue siendo 1P contra IA.
- **Sí (supuesto):** reloj de 90 s recargable (+2/+3 por baja, +8 por oleada, tope 99) como condición principal de fin, más 3 vidas. El reloj obliga a atacar y las vidas perdonan errores puntuales sin alargar partidas pasivas.
- **Sí (supuesto):** una bomba nueva puesta sobre una llama viva es una cadena nueva de tamaño 1, y una baja con dos cadenas se atribuye a la mayor. Las dos reglas cierran exploits del multiplicador.
- **Sí (supuesto):** al morir se pierde un nivel de cada stat (no todos) y se reaparece en la celda más alejada de los enemigos. Penaliza sin hundir la partida en un modo sin fases.
- **No:** detonador remoto. Permitiría montar cadenas de 8 bombas sin riesgo y vaciaría de tensión el multiplicador. Se queda como exclusivo de la campaña.
- **Sí:** núcleo puro compartido `detonix/core.ts`, con la misma API en las dos specs, y prototipo compartido `09-bomberman`. Esta spec no depende de que la campaña esté implementada.
- **Sí:** táctil a través de la fila de `TOUCH_MAP` (SPEC 13/15), con d-pad mantenido y un único botón de acción.
- **No:** skins, sonido, retos diarios con semilla, rankings por temporada ni multijugador en esta spec.
- **No:** tocar `TouchControls.tsx`, `CanvasGame.tsx`, `GamePlayer.tsx`, `app/api/scores` ni `app/lib/db/`.

---

## Risks

| Riesgo | Mitigación |
|---|---|
| El multiplicador cadena × combo dispara scores absurdos o permite exploits. | Topes de cadena ×8 y combo ×4, bloques que no suben `K`, rebrote limitado a densidad 0,30, cadena nueva para bombas tardías y sin detonador. Se calibra en el prototipo antes del port. |
| El reloj hace la partida demasiado corta o demasiado larga. | Se calibran en el prototipo las recargas (+2/+3/+8) y la curva de oleadas; el objetivo es que una partida media dure 4–8 minutos. |
| Un rebrote encierra o mata injustamente al jugador. | Exclusión de radio 2 alrededor del jugador, aviso visual de 1 s y cancelación si hay una entidad en la celda. |
| Enemigos que aparecen encima del jugador en los portales. | Un portal no hace aparecer a nadie si el jugador está a ≤ 2 celdas de él; espera al ciclo siguiente. |
| Desfase entre la campaña y el frenesí si cada uno implementa su propio núcleo. | Una única API de `core.ts` documentada igual en las dos specs; la segunda variante reutiliza lo que hizo la primera. |
| Muchos textos flotantes y llamas con glow hunden los fps en móvil. | Glow solo en entidades dinámicas, multiplicado por `glowScale()`; los textos flotantes tienen tope de 12 simultáneos (se descartan los más antiguos). |
| Teclas de dirección pegadas en táctil o al perder el foco. | La pila `heldDirs` se vacía en `blur`; el overlay ya emite `keyup` en `pointercancel` y `pointerleave` (SPEC 13). |
| `position` en conflicto con otros juegos. | Se calcula `MAX(position) + 1` dentro del `insert`. |
| El `INSERT` público en `scores` permite spam. | `check` de la SPEC 06, sin `UPDATE`/`DELETE`. El anti-cheat va en otra spec. |

---

## Qué **no** está en esta spec

- La campaña por fases `detonix` (va en `01-detonix-campana`).
- Detonador remoto, salida oculta y fases.
- Skins del juego y su alta en `app/lib/games/skins.ts`.
- Sonido y efectos de audio.
- Retos diarios con semilla, rankings por temporada y multijugador.
- Anti-cheat, auth real y vincular scores a un usuario.
- Cambios de layout responsive u orientación (SPEC 15).

Cada uno de esos, si llega, va en su propia spec.
