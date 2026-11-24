# SPEC 01 (game-jam/enjambre) — "ENJAMBRE" clásico: Galaga con formación, picados bézier y rayo tractor

> **Status:** Draft
> **Depends on:** SPEC 05, SPEC 06, SPEC 13, SPEC 16
> **Date:** 2026-11-24
> **Objective:** Añadir `enjambre` (ENJAMBRE, un Galaga) al catálogo y al leaderboard de Arcade Vault como juego jugable, con un motor `createEnjambreGame: GameFactory` en `app/lib/games/enjambre/engine.ts` registrado en `registry.ts`, controles táctiles en `touch-map.ts` y presupuesto de rendimiento de SPEC 16.

---

## Por qué existe esta spec

La game jam del 2026-11-24 toma como tema la sugerencia **ENJAMBRE** del To-Do (`references/game-suggestions-todo.md`, carril de shooters espaciales): _"Galaga: formación que pica en picado (curvas bézier). Distinto de invasores; estrena cyan en SHOOTER"_. La jam produce dos **variantes jugables** del mismo juego base. Esta spec es la **variante clásica**: un Galaga fiel en su ritmo, con todo lo que lo diferencia de un Space Invaders. La variante "twist" (`02-enjambre-orbital.md`) es un juego hermano con su propio slug.

Hoy el catálogo tiene dos SHOOTER: `rocas` (Asteroids, jugable) e `invasores` (Space Invaders, maqueta). ENJAMBRE no duplica a INVASORES: en Space Invaders la formación es un bloque que baja en escalón y dispara en vertical; en Galaga la formación **entra volando** por trayectorias curvas, se asienta, "respira" y de ella **se desprenden atacantes que pican en picado** por curvas bézier, en solitario o en escuadra (jefe + escoltas), además del **rayo tractor** que captura tu nave y la mecánica de **rescate en doble nave**. Es una mecánica de persecución por trayectorias, no de muro descendente.

`references/started-games/` solo contiene `02-asteroids`, `03-tetris`, `04-arkanoid` y `05-snake` (todos portados). **No existe prototipo de Galaga**, así que esta spec **necesita prototipo nuevo**: se construye en `references/started-games/09-galaga` y se porta desde ahí, igual que la SPEC 09 construyó `05-snake` antes de portarlo (los números `06`–`08` quedan reservados por las specs de jam de `ranaria`, `turbovia` y `patrulla-lunar`).

A diferencia de `ranaria`/`turbovia`/`patrulla-lunar`, que separaron catálogo y motor en dos ficheros, esta jam escribe **una spec autocontenida por variante** (catálogo + leaderboard + motor + táctil + rendimiento), porque cada variante es un juego completo que se elige o se descarta entero.

---

## Scope

**In:**

- **Prototipo vanilla** en `references/started-games/09-galaga/` (`index.html` + `game.js`) jugable abriendo el HTML, como referencia verificable del port.
- **Motor portado** en `app/lib/games/enjambre/engine.ts` como `createEnjambreGame: GameFactory`, sin estado global de módulo, canvas por parámetro, resolución interna `800×600`.
- **Módulo de trayectorias** `app/lib/games/enjambre/path.ts`: evaluación de bézier cúbicas y tablas de muestreo por longitud de arco (LUT) reutilizables. Es el único código que la variante `enjambre-orbital` puede importar de esta carpeta (ver Decisions).
- **Registro** en `app/lib/games/registry.ts`: `enjambre: createEnjambreGame`.
- **Controles táctiles** (SPEC 13): entrada `enjambre` en `app/lib/games/touch-map.ts`.
- **Alta en catálogo** (patrón SPEC 06): fila `games` con `id = 'enjambre'`, siembra de 12 filas en `scores`, portada `.cover-enjambre` en `app/globals.css` diseñada con `/frontend-design`.
- **Rendimiento** (SPEC 16): canvas opaco `{ alpha: false }`, glow por `glowScale()`, pools de entidades y LUT precalculadas.
- Actualizar `references/implemented-games.md` con la fila de `enjambre`.

**Out of scope (para futuras specs):**

- Sistema de skins (`clasico`/`neon`/`retro`): el motor acepta el parámetro `skin` del `GameFactory` y lo ignora; los colores viven en una constante `PALETTE` para que `skin-designer` pueda convertirla luego en `enjambre/skins.ts`. No se añade a `SKINNED_GAMES`.
- Sonido y música (la "fanfarria" de Galaga).
- Estadística de fin de fase "SHOTS FIRED / HIT-MISS RATIO" del arcade original.
- Modo 2 jugadores alternos, entrada de iniciales dentro del canvas (lo hace el modal de React).
- Anti-cheat / verificación server-side de puntuaciones, auth real.
- Tocar `CanvasGame.tsx`, `GamePlayer.tsx`, `TouchControls.tsx`, `app/lib/db/*`, `app/api/scores/route.ts` o cualquier otro motor.

---

## Data model

Esta spec no crea tablas (ya existen `games` y `scores` de SPEC 06). Añade **datos**, una **portada**, un **contrato de motor** y una **entrada de controles táctiles**.

### Fila en `games`

`position` = siguiente libre: se calcula en la migración como `MAX(position) + 1` leyendo el valor real (no se asume un número).

```sql
insert into public.games (id, title, short, long, cat, cover, color, best, plays, position)
values (
  'enjambre',
  'ENJAMBRE',
  'La formación despierta y pica en picado sobre tu nave.',
  'Cuarenta insectos de neón entran en espiral y se alinean sobre ti. Cuando la formación respira, se desprenden en picado por curvas imposibles, en solitario o escoltando a su reina. Cuidado con el rayo tractor: si te captura, derriba a la reina en pleno vuelo para recuperar tu nave y pelear con doble cañón.',
  'SHOOTER',
  'cover-enjambre',
  'cyan',
  128450,
  '11.2K',
  (select coalesce(max(position), 0) + 1 from public.games)
);
```

### Siembra de `scores`

Nombres 1–10 chars del set del prototipo, `score` entero en `0..100000000`, decrecientes y coherentes con `best = 128450`:

```sql
insert into public.scores (game_id, name, score) values
  ('enjambre', 'PX_KAI',    128450),
  ('enjambre', 'NEONFOX',   117300),
  ('enjambre', 'VECTORX',   104860),
  ('enjambre', 'Z3R0COOL',   96120),
  ('enjambre', 'SCANLINE',   84750),
  ('enjambre', 'CYBER_LU',   73400),
  ('enjambre', 'M00NRYU',    65980),
  ('enjambre', 'BIT_LORD',   54210),
  ('enjambre', 'RGB_QUEEN',  46300),
  ('enjambre', 'JOY_STK',    38870),
  ('enjambre', 'ATARI_KID',  29540),
  ('enjambre', 'PIXEL_DAD',  21600);
```

### Integración con el leaderboard (sin cambios de código)

El flujo existente de SPEC 06 cubre `enjambre` sin tocar nada: el motor llama `onGameOver(finalScore)` → `GamePlayer` abre el modal de fin → "GUARDAR PUNTUACIÓN" hace `POST /api/scores` con `{ gameId: "enjambre", name, score }` → `insertScore` (validación 1–10 chars, entero `0..100000000`) → la fila aparece en `/salon` y en `/juego/enjambre`, que leen con `getTopScores("enjambre", N)`. Esta spec **no ejecuta nada contra Supabase** en su redacción; la migración se aplica en `/spec-impl`.

### Portada

`.cover-enjambre` en `app/globals.css` (base `.cover-bg` + `::before`/`::after`, neón `var(--cyan)` dominante): fondo de espacio azul-negro con estrellas, una formación de insectos estilizados (3 filas) arriba y **uno picando en curva** hacia una nave cian abajo, insinuando la estela bézier. Debe distinguirse a simple vista de `.cover-invaders` (que ya usa una rejilla de puntos verdes/magenta). _El diseño real se hace con `/frontend-design`._

### Contrato de motor

```ts
// app/lib/games/enjambre/engine.ts → cumple GameFactory (types.ts, no se redefine)
export const createEnjambreGame: GameFactory = (canvas, callbacks, _skin) => {
  /* todo el estado en el closure */
  return { start, pause, resume, restart, destroy };
};
```

```ts
// app/lib/games/enjambre/path.ts → helpers puros, sin estado de módulo mutable
export interface Vec2 { x: number; y: number }
export interface Bezier { p0: Vec2; p1: Vec2; p2: Vec2; p3: Vec2 }
export function bezierPoint(b: Bezier, t: number, out: Vec2): Vec2; // escribe en `out`, no aloca
export interface PathLUT { xs: Float32Array; ys: Float32Array; length: number }
export function buildPathLUT(segments: Bezier[], samples?: number): PathLUT; // muestreo por longitud de arco (64 por segmento)
export function samplePath(lut: PathLUT, distance: number, out: Vec2): boolean; // false = fin del camino
```

### Resolución y layout del canvas

Interno `800×600` (4:3, coincide con `.crt-screen`; sin reproyección). Galaga es vertical, así que el **campo de juego** ocupa una columna centrada de `600×600` (`FIELD_X0 = 100`, `FIELD_X1 = 700`). Los márgenes laterales de 100 px muestran, dentro del canvas: a la izquierda las **insignias de fase** (banderines por fase completada, estilo Galaga) y a la derecha las **naves de reserva**. Score, vidas y nivel numéricos van al HUD de React (`.player-hud`) vía callbacks; el canvas no duplica el contador de puntos.

### Entidades y constantes

| Elemento | Valor |
| --- | --- |
| Nave del jugador | `32×28`, `y = 552`, velocidad horizontal `300 px/s`, confinada a `[FIELD_X0+16, FIELD_X1−16]` |
| Disparo del jugador | `3×12`, `640 px/s` hacia arriba; `MAX_PLAYER_SHOTS = 2` en pantalla (4 en doble nave: 2 ráfagas de 2); autofire con `FIRE_COOLDOWN = 0.18 s` mientras se mantiene `Espacio` |
| Formación | 10 columnas × 5 filas, separación `44×36 px`, origen `y = 80`, centrada en el campo |
| Composición | Fila 0: 4 **Jefes** (cols 3–6, 2 impactos). Filas 1–2: 16 **Mariposas** (cols 1–8). Filas 3–4: 20 **Abejas** (cols 0–9). Total 40 |
| Balanceo | Mientras entra: vaivén horizontal `±30 px`, periodo `4 s`. Asentada: "respiración" (escala de separación `1.00↔1.15`, periodo `3 s`) |
| Entrada | 5 grupos de 8; intervalo dentro del grupo `0.12 s`, entre grupos `1.4 s`; velocidad en ruta `220 px/s` |
| Picados | Intervalo `DIVE_INTERVAL = max(0.8, 2.6 − 0.15·(stage−1)) s`; atacantes simultáneos `min(2 + floor(stage/2), 8)`; velocidad `200 + 8·stage px/s` (tope `320`) |
| Disparo enemigo | `4×10`, `260 px/s`, apuntado con desviación máx. `±25°`; `MAX_ENEMY_SHOTS = 6`; 0–2 disparos por picado, solo con `y < 420` |
| Rayo tractor | Jefe se detiene en `y = 380`; haz trapezoidal que crece hasta `96 px` de ancho en la base en `0.6 s`, activo `3 s` |
| Vidas | 3 iniciales; vida extra a `20 000` y luego cada `70 000` (90 000, 160 000…); tope 9 |
| Respawn | `RESPAWN_DELAY = 2 s` + espera a que ningún atacante esté por debajo de `y = 440`; `INVULN = 1.5 s` con parpadeo |

### Mapeo de mecánicas → callbacks

- `onScore(score)` — puntuación acumulada con la tabla del arcade:

  | Enemigo | En formación | En picado |
  | --- | --- | --- |
  | Abeja | 50 | 100 |
  | Mariposa | 80 | 160 |
  | Jefe (2º impacto; el 1º solo cambia su color) | 150 | 400 solo · 800 con 1 escolta viva · 1600 con 2 escoltas vivas |
  | Nave capturada (hostil) | 500 | 1000 |
  | Fase de desafío | 100 por enemigo; bonus `aciertos × 100`, o `10 000` si 40/40 (PERFECT) | — |

  Colisionar con un atacante también suma sus puntos de picado (y cuesta la vida). Tope defensivo: `min(score, 100000000)` para respetar el `check` de `scores`.
- `onLives(lives)` — arranca en `3`; baja al morir **o al ser capturado**; sube con la vida extra. En doble nave, perder una de las dos mitades **no** baja `lives`.
- `onLevel(stage)` — número de fase (`1..∞`), incluidas las de desafío.
- `onGameOver(finalScore)` — una sola vez, cuando `lives` llega a `0` (por muerte o por captura de la última nave).

### Máquina de estados interna

`ready` (banner "FASE N", 2 s) → `entering` (los grupos vuelan a sus huecos; ya pueden disparar y picar los asentados a partir de la fase 2) → `playing` (formación asentada y picados) → `stageClear` (banner 1.5 s) → `ready` de la fase siguiente. Laterales: `dying` (explosión 1 s) → `respawn` → `playing`; `capturing` (la nave sube girando 1.5 s y se acopla al jefe) → `respawn`; `challenge` (fase de desafío) → `challengeResult` (2 s, "PERFECT" o "ACIERTOS NN") → `ready`; `gameover` (terminal, loop detenido). La pausa es una bandera ortogonal (`paused`) gestionada por `pause()/resume()`.

Correspondencia con el ciclo de vida de la plataforma:

- `start()` — fase 1, estado `ready`, listeners añadidos, RAF en marcha.
- `pause()` — congela cualquier estado (incluido un rayo tractor a medio desplegar o una captura en curso); no se simula nada.
- `resume()` — continúa exactamente donde estaba, con `lastTime` reseteado.
- `restart()` — vuelve al estado de `start()` desde cero, sea cual sea el estado previo (también desde `gameover`).
- `gameover` — se emite `onGameOver` una vez y el loop se detiene; el modal lo pinta React.

### Controles

| Acción | Teclado (`e.code`) | Táctil (SPEC 13, `touch-map.ts`) |
| --- | --- | --- |
| Mover izquierda | `ArrowLeft` / `KeyA` | `◄` `dpad-left`, `hold: true` |
| Mover derecha | `ArrowRight` / `KeyD` | `►` `dpad-right`, `hold: true` |
| Disparar (autofire al mantener) | `Space` / `KeyZ` | `⦿` `action-a`, `hold: true` |

El motor lee `e.code` (el overlay de SPEC 13 fija `code` y `key` a la vez). `preventDefault` en flechas y `Space`. Sin tecla de pausa propia: la pausa la da el botón PAUSA de la plataforma.

### Casos límite

- **Izquierda y derecha a la vez:** se anulan (velocidad 0); soltar una deja activa la otra.
- **`keydown` repetido por el SO** (`e.repeat`): se ignora; el autofire lo controla el cooldown, no la repetición del teclado.
- **Pérdida de foco / cambio de pestaña:** en `blur` del `window` se limpian las teclas pulsadas para que la nave no siga moviéndose sola; el RAF se detiene solo y el `dt` cap evita el salto al volver.
- **Fase despejada con el jugador muerto:** la fase siguiente no empieza hasta completar el respawn.
- **Captura con la doble nave activa:** imposible por regla (el jefe no despliega el rayo si `dual`).
- **Captura con una nave ya capturada en juego:** imposible por regla (solo una nave capturada a la vez).
- **Jefe captor destruido por colisión con el jugador** mientras pica: el jugador muere y la nave capturada se pierde (no hay rescate); se documenta como comportamiento esperado.
- **Nave capturada hostil viva al despejar el resto:** la fase no termina hasta destruirla.
- **Vida extra y muerte en el mismo frame:** se aplican ambas en orden (sumar, luego restar) y se emite un único `onLives` con el valor final.
- **Puntuación:** entero; tope `100000000` para no romper el `check` de `scores`.
- **`restart()` durante `capturing`, `challenge` o `gameover`:** reinicia limpio; `gameOverSent` vuelve a `false`.

### Presupuesto de rendimiento (SPEC 16)

- `getContext("2d", { alpha: false })` y `fillRect` del fondo completo al inicio de cada `draw()`.
- `glowScale()` se lee **una vez** al crear el motor; el glow se aplica por lote de color (formación por tipo, atacantes, jugador), nunca por disparo, estrella o partícula.
- **Cero asignaciones por frame** en el bucle: pools de tamaño fijo (`playerShots[4]`, `enemyShots[6]`, `particles[256]`, `stars[120]`), `Vec2` de trabajo reutilizados, LUT de rutas construidas al crear el motor.
- `ctx.font` solo se cambia al pintar banners; los textos fijos se precomponen.
- Sprites vectoriales con `Path2D` precalculados por tipo y frame de aleteo (8 `Path2D` en total), dibujados con `setTransform` en vez de `save/restore` por entidad.
- Objetivo: ≤ 4 ms de `update + draw` en desktop en el peor caso (8 atacantes, rayo activo, 6 disparos enemigos, explosiones), medido con la instrumentación `?debug=perf`.

---

## Implementation plan

Cada paso deja la app compilando y navegable; el resto de juegos nunca se rompe.

1. **Prototipo vanilla.** Crear `references/started-games/09-galaga/index.html` + `game.js`: canvas `800×600`, campo `600×600` centrado, formación 10×5 con la composición de la tabla, entrada por 5 grupos en bézier, respiración, picados en solitario y en escuadra (jefe + hasta 2 mariposas escolta), disparo enemigo apuntado, 3 vidas con vida extra, fase de desafío cada 4 fases empezando en la 3, rayo tractor y doble nave. Teclado: flechas/WASD + Espacio. Verificable abriendo el HTML. Calibrar ahí la dificultad antes de portar.
2. **Trayectorias.** Crear `app/lib/games/enjambre/path.ts` con `bezierPoint`, `buildPathLUT` (64 muestras por segmento, reparametrizadas por longitud de arco para velocidad constante) y `samplePath` (interpolación lineal entre muestras, escribe en un `Vec2` de salida). Definir en `engine.ts` (no en `path.ts`) las rutas de entrada de los 5 grupos y las plantillas de picado como arrays de `Bezier` en coordenadas relativas, espejables en X; construir sus LUT **una vez por instancia del motor** al crearla.
3. **Motor: esqueleto y ciclo de vida.** Crear `app/lib/games/enjambre/engine.ts` exportando `createEnjambreGame: GameFactory`. Todo el estado (`player`, `dual`, `formation[40]`, `divers`, `playerShots`, `enemyShots`, `particles`, `stars`, `score`, `lives`, `stage`, `nextExtraLife`, `state`, `stateTimer`, `paused`, `lastTime`, `rafId`) en el closure. `ctx = canvas.getContext("2d", { alpha: false })`, `canvas.width = 800`, `canvas.height = 600`. `start()` añade `keydown`/`keyup`/`blur` en `window` y arranca el RAF; `pause()` cancela el RAF y marca `paused`; `resume()` resetea `lastTime = null` y rearranca; `restart()` reinicia todo el estado (score 0, vidas 3, fase 1, sin doble nave, sin nave capturada, pools vacíos) y rearranca; `destroy()` cancela el RAF y quita los tres listeners. `dt = Math.min(dt, 0.05)`. `syncReactState()` emite `onScore/onLives/onLevel` solo ante cambio (comparando con el último valor emitido) y `onGameOver` una sola vez (bandera `gameOverSent`).
4. **Jugador, disparo y formación.** Movimiento horizontal, autofire con cooldown y tope de disparos, formación con vaivén/respiración (la posición de cada hueco se calcula cada frame a partir de `(col, row)`, el vaivén y la escala; no se almacena). Colisión disparo→enemigo **barrida**: se comprueba el segmento entre la `y` previa y la actual del disparo contra el AABB del enemigo (evita tunneling con `dt` alto). Jefes con 2 impactos.
5. **Entrada y picados.** Cada enemigo tiene `mode: "entering" | "formation" | "diving" | "returning"` y un cursor de distancia sobre su LUT. En `entering` recorre la ruta del grupo y, en los últimos `0.4 s`, interpola hacia la posición **viva** de su hueco (que se mueve por el vaivén). En `diving` recorre la plantilla de picado; el punto de control final se ajusta a la `x` del jugador en el momento del lanzamiento. Al salir por abajo (`y > 620`) reaparece por arriba sobre su columna y vuelve al hueco (`returning`). Escuadras: un jefe que pica arrastra hasta 2 mariposas vivas de los huecos adyacentes de la fila 1, que siguen la misma ruta con offset.
6. **Rayo tractor y doble nave.** Si no hay nave capturada, ni rayo activo, ni doble nave, un jefe que inicia picado elige con probabilidad `0.35` la rutina de rayo: baja a `y = 380`, se detiene y despliega el haz. Si la nave del jugador está dentro del trapecio con el haz completo → estado `capturing`: la nave sube girando, `lives--` (`onLives`) y queda acoplada encima del jefe (dibujada en magenta), que vuelve a formación. Si `lives` llega a 0 con la captura, `gameover`. Rescate: destruir a ese jefe **mientras pica** suelta la nave, que desciende y se acopla junto al jugador → `dual = true` (dos cañones, hitbox doble; un impacto elimina solo una mitad). Destruir al jefe **en formación** vuelve hostil a la nave capturada (ocupa su hueco y pica como una mariposa; vale 500/1000). Disparar a la nave capturada la destruye (500/1000).
7. **Fases de desafío.** Cuando `stage % 4 === 3`: 5 grupos de 8 cruzan la pantalla por rutas bézier propias sin formar, sin disparar y sin colisión letal con el jugador; salen por los bordes. Contar aciertos, sumar 100 por enemigo y al final el bonus (`10 000` si 40/40, si no `aciertos × 100`). Banner de resultado 2 s y paso a la fase siguiente.
8. **Render.** Por frame: `fillRect` de fondo completo (`PALETTE.bg`), campo de estrellas (120 estrellas precalculadas que descienden a 3 velocidades, se reciclan al salir), márgenes laterales con insignias de fase y naves de reserva, formación y atacantes como sprites vectoriales de 2 frames (aleteo cada `0.25 s`), disparos, rayo tractor (franjas cian translúcidas animadas), partículas de explosión, banners ("FASE N", "DESAFÍO", "PERFECT", "NAVE CAPTURADA", "READY"). Glow y asignaciones según el presupuesto de rendimiento del Data model.
9. **Registrar.** En `app/lib/games/registry.ts`: `import { createEnjambreGame } from "./enjambre/engine";` + entrada `enjambre: createEnjambreGame`, y actualizar el comentario de cabecera. No se tocan `CanvasGame.tsx` ni `GamePlayer.tsx`.
10. **Táctil.** En `app/lib/games/touch-map.ts`, añadir `enjambre` con `◄`/`►` (`ArrowLeft`/`ArrowRight`, `hold: true`, `dpad-left`/`dpad-right`) y `⦿` (`Space`, `key: " "`, `hold: true`, `action-a`), y documentarlo en el comentario del esquema. `TouchControls.tsx` no cambia.
11. **Catálogo y leaderboard.** Migración Supabase (MCP `apply_migration`) con el `insert` en `games` (con `position` calculado) y los 12 `insert` en `scores` del Data model. Revisar `get_advisors` tras aplicar. No se regenera `database.types.ts` (no cambia el esquema).
12. **Portada.** Añadir `.cover-enjambre` (+ pseudo-elementos) en `app/globals.css` con `/frontend-design`.
13. **Referencia.** Añadir la fila de `enjambre` a `references/implemented-games.md`.

---

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de tipos de ruta; `npm run lint` pasa.
- [ ] Existe `references/started-games/09-galaga/` y el Galaga vanilla es jugable abriendo su `index.html`.
- [ ] Existe la fila `games` con `id = 'enjambre'`, `cat = 'SHOOTER'`, `color = 'cyan'`, `cover = 'cover-enjambre'` y `position` = máximo previo + 1; `scores` tiene 12 filas para `enjambre` con puntuaciones decrecientes; RLS sigue habilitado y `get_advisors` no reporta problemas nuevos.
- [ ] ENJAMBRE aparece en `/`, `/games` (filtro SHOOTER incluido), `/salon` (tab) y `/juego/enjambre`, con la portada `.cover-enjambre`, distinguible de `.cover-invaders`.
- [ ] En `/jugar/enjambre` se juega en canvas `800×600` con campo `600×600` centrado: la nave se mueve con `←/→`/`A/D` y dispara con `Espacio`/`Z` (autofire al mantener, nunca más de 2 disparos propios en pantalla, 4 en doble nave).
- [ ] Los 40 enemigos entran en 5 grupos por trayectorias curvas, se asientan en la formación 10×5, la formación se balancea mientras entra y "respira" cuando está completa.
- [ ] Hay picados en solitario y en escuadra (jefe + escoltas) por curvas bézier que persiguen la posición del jugador; los atacantes que salen por abajo reaparecen arriba y vuelven a su hueco.
- [ ] Los jefes necesitan 2 impactos (cambian de color tras el primero) y puntúan 400/800/1600 en picado según escoltas vivas; abejas y mariposas puntúan según la tabla (formación vs picado).
- [ ] El rayo tractor captura la nave si está dentro del haz: baja una vida; derribar al jefe captor mientras pica devuelve la nave como doble nave; un impacto en doble nave solo quita una mitad sin restar vida.
- [ ] La fase 3 (y la 7, 11…) es de desafío: enemigos sin disparos ni colisión letal, 100 por acierto, bonus final y "PERFECT" (+10 000) con 40/40.
- [ ] El HUD de React refleja score, vidas (3, baja al morir o ser capturado, sube a 20 000 y cada 70 000) y fase reales; el canvas no duplica el contador de puntos.
- [ ] Al perder la última nave (o ser capturada la última) se abre el modal de fin con la puntuación real; "GUARDAR PUNTUACIÓN" hace `POST /api/scores` con `{ gameId: "enjambre", name, score }` y la fila aparece en `/salon` y `/juego/enjambre`; "JUGAR DE NUEVO" reinicia limpio (score 0, 3 vidas, fase 1, sin doble nave ni nave capturada).
- [ ] PAUSA/REANUDAR no provoca salto de simulación ni pierde el estado del rayo tractor o de los picados en curso.
- [ ] Cambiar de pestaña con una flecha pulsada no deja la nave moviéndose sola al volver.
- [ ] `engine.ts` no usa estado global de módulo ni `document.getElementById`; al salir de `/jugar/enjambre`, `destroy()` cancela el RAF y quita los listeners; reentrar no duplica el loop ni acelera el juego.
- [ ] En emulación táctil (`pointer: coarse`) aparecen `◄`, `►` y `⦿`; mantener `⦿` dispara en ráfaga y mantener `◄`/`►` mueve sin teclas "pegadas" al soltar.
- [ ] El contexto es `{ alpha: false }`, el fondo se pinta completo cada frame sin estelas, y el glow se atenúa en `pointer: coarse` y se anula con `prefers-reduced-motion` (vía `glowScale()`); con `?debug=perf` (SPEC 16) se mantiene ~60 fps en desktop en el peor caso descrito.
- [ ] `enjambre` resuelve a un motor en `registry.ts`; `rocas`, `caida`, `bloque-buster`, `serpentina` y `ranaria` siguen jugables y `gloton`, `invasores`, `duelo-pixel` siguen como maqueta.

---

## Decisions

- **Sí:** spec autocontenida (catálogo + motor + táctil + rendimiento) en vez del par `01-catalogo`/`02-motor` de otras jams: la jam compara **variantes completas** y cada una se aprueba o descarta entera.
- **Sí:** slug propio `enjambre` (el de la sugerencia del To-Do) para la variante clásica; la variante twist vive como juego aparte `enjambre-orbital` con su propia fila, leaderboard y motor. Motivo: el leaderboard es **uno por `game_id`** (sin columna de modo) y las puntuaciones de dos reglas distintas no son comparables; además `GameFactory` no recibe un "modo" (solo `skin`), y añadirlo obligaría a tocar `types.ts`, `CanvasGame.tsx` y `GamePlayer.tsx`.
- **Sí:** compartir solo `enjambre/path.ts` (bézier + LUT, funciones puras). Cada variante tiene su propio `engine.ts`; no se crea un "motor base" con herencia, para que cada juego se pueda tocar sin romper al otro.
- **Sí:** rayo tractor y doble nave **dentro** del alcance (paso 6, tras el núcleo jugable): son la seña de identidad que separa a Galaga de INVASORES. Se implementan después de que el juego ya funcione sin ellos, así que si dieran problemas el paso puede aplazarse sin bloquear el resto.
- **Sí (supuesto):** campo de juego vertical `600×600` centrado en el canvas `800×600`, con márgenes para insignias y reservas, igual que CAÍDA dibuja su panel lateral. Se descarta estirar la formación a 800 px (el picado pierde tensión) y se descarta rotar la pantalla.
- **Sí (supuesto):** autofire al mantener el disparo, respetando el tope de 2 disparos de Galaga. Hace jugable el táctil (SPEC 13 no auto-repite los botones de toque) sin dar ventaja en teclado.
- **Sí (supuesto):** la fase de desafío no mata por colisión. En el arcade el riesgo es mínimo y así la fase bonus no sufre por la hitbox simplificada.
- **Sí (supuesto):** ser capturado cuesta una vida y, si era la última, termina la partida (como en el arcade).
- **Sí:** paleta neón con cian dominante: nave del jugador, abejas, rayo tractor y estrellas en cian; mariposas en magenta; jefes en amarillo que pasan a verde tras el primer impacto; nave capturada en magenta. Tokens alineados con `--cyan #00f5ff`, `--magenta #ff006e`, `--yellow #f5ff00`, `--green #00ff88` y fondo `--bg #0a0a0f`, recogidos en una constante `PALETTE` para skins futuras.
- **Sí:** `best = 128450`, `plays = '11.2K'` como columnas de display sembradas (patrón SPEC 06).
- **No:** skins, sonido, ratio de aciertos del arcade, 2 jugadores, anti-cheat, auth real.

---

## Risks

| Riesgo | Mitigación |
| --- | --- |
| No existe prototipo de Galaga: el feel (rutas, ritmo de picados) puede salir plano o injusto. | Construir y calibrar `09-galaga` antes del port; portar sus constantes 1:1; verificación jugando las fases 1–8. |
| Velocidad no uniforme en las bézier (los enemigos aceleran en las curvas). | LUT reparametrizada por longitud de arco en `path.ts`; el cursor avanza en píxeles, no en `t`. |
| "Salto" al hueco al terminar la entrada, porque la formación se mueve. | Interpolar en los últimos `0.4 s` hacia la posición viva del hueco, no a una fija. |
| Tunneling de disparos rápidos contra enemigos pequeños con `dt` alto. | Colisión barrida por segmento (`y` previa → actual) contra AABB; `dt` cap `0.05`. |
| El rayo tractor complica el estado (captura, nave hostil, rescate, última vida). | Estados explícitos (`capturing`, `capturedShip` con dueño, `dual`), casos límite enumerados, criterio de aceptación por caso y paso aislado (6) que puede aplazarse. |
| Muchos `shadowBlur` por frame tumban los fps en móvil. | Glow por lote de color, `glowScale()`, sin glow en disparos/partículas/estrellas, pools sin asignaciones por frame. |
| Fugas de RAF/listeners al montar/desmontar en el App Router. | `destroy()` cancela el RAF y quita listeners; el `useEffect` de `CanvasGame` retorna ese cleanup; criterio de reentrada. |
| `INSERT` público en `scores` permite spam. | `check` de rango/longitud (SPEC 06), sin `UPDATE/DELETE`; endurecer con auth + anti-cheat en otra spec. |

---

## Qué **no** está en esta spec

- La variante twist `enjambre-orbital` (va en `02-enjambre-orbital.md`).
- Skins del juego (`clasico`/`neon`/`retro`) y su entrada en `SKINNED_GAMES`.
- Sonido y música.
- Estadística de aciertos de fin de fase y modo 2 jugadores.
- Anti-cheat / verificación server-side de puntuaciones.
- Auth real y vincular scores a un usuario.
- Cambios en `CanvasGame.tsx`, `GamePlayer.tsx`, `TouchControls.tsx`, `app/lib/db/*`, `app/api/scores/route.ts` u otros motores.

Cada uno de esos, si llega, va en su propia spec.
