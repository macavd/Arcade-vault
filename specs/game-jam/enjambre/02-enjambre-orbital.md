# SPEC 02 (game-jam/enjambre) — "ENJAMBRE ORBITAL": el enjambre en perspectiva polar alrededor de la colmena

> **Status:** Draft
> **Depends on:** SPEC 05, SPEC 06, SPEC 13, SPEC 16, 01-enjambre-clasico (solo para reutilizar `app/lib/games/enjambre/path.ts`; ver paso 2)
> **Date:** 2026-11-24
> **Objective:** Añadir `enjambre-orbital` (ENJAMBRE ORBITAL, la variante twist de ENJAMBRE en la que la nave orbita un anillo y dispara hacia el núcleo de la colmena) al catálogo y al leaderboard como juego jugable, con su motor `createEnjambreOrbitalGame: GameFactory` registrado, controles táctiles y presupuesto de rendimiento de SPEC 16.

---

## Por qué existe esta spec

La game jam del 2026-11-24 (tema **ENJAMBRE**) pide dos variantes jugables del mismo juego base, y la segunda tiene que ser un **twist real**, no la variante clásica con otros números. Se valoraron tres twists:

1. **"Colmena" de oleadas infinitas con escalado:** descartado como variante independiente. Es la clásica sin fases de desafío y con la dificultad subiendo más rápido; el jugador haría lo mismo (mover en horizontal, esquivar picados) y el leaderboard sería un duplicado.
2. **Modo invertido (tú controlas el enjambre):** descartado. Cambia de género (deja de ser un shooter de un jugador con puntuación clara) y exige una IA defensora creíble; mucho riesgo para una jam.
3. **Enjambre orbital (geometría polar, linaje Gyruss):** **elegido**. Mantiene el ADN de ENJAMBRE (formación que entra por trayectorias curvas, se asienta y se desprende en picados) pero cambia **el espacio de juego entero**: la nave ya no se desliza por una línea abajo, **orbita un anillo** alrededor del centro de la pantalla y dispara **hacia dentro**, hacia el núcleo de la colmena. Los picados salen del centro hacia fuera en espiral, con perspectiva (los enemigos crecen al acercarse). Cambia la lectura espacial, el apuntado y la forma de esquivar, y aprovecha el canvas 4:3 completo en vez de una columna. Konami lo demostró en 1983 con Gyruss, la "secuela polar" de Galaga.

Del twist "colmena" se rescata lo mejor: cada 4ª fase es **LA COLMENA**, una fase bonus contra el núcleo de la colmena blindado por anillos de celdas que giran, que ocupa el papel de las fases de desafío de la clásica con una mecánica propia (abrir hueco y colar disparos).

`references/started-games/` no tiene prototipo de Galaga ni de Gyruss, así que esta spec **necesita prototipo nuevo**: `references/started-games/10-gyruss`. Es una spec autocontenida (catálogo + leaderboard + motor + táctil + rendimiento), como `01-enjambre-clasico`.

---

## Scope

**In:**

- **Prototipo vanilla** en `references/started-games/10-gyruss/` (`index.html` + `game.js`), jugable abriendo el HTML.
- **Motor portado** en `app/lib/games/enjambre-orbital/engine.ts` como `createEnjambreOrbitalGame: GameFactory`, sin estado global de módulo, canvas por parámetro, `800×600`.
- **Reutilización de trayectorias:** importar `bezierPoint`/`buildPathLUT`/`samplePath` de `app/lib/games/enjambre/path.ts` (creado por `01-enjambre-clasico`); si esa spec no se implementó antes, este paso lo crea con el contrato exacto definido en el Data model.
- **Registro** en `app/lib/games/registry.ts`: `"enjambre-orbital": createEnjambreOrbitalGame`.
- **Controles táctiles** (SPEC 13): entrada `"enjambre-orbital"` en `app/lib/games/touch-map.ts`.
- **Alta en catálogo** (patrón SPEC 06): fila `games` con `id = 'enjambre-orbital'`, 12 filas en `scores`, portada `.cover-enjambre-orbital` en `app/globals.css` con `/frontend-design`.
- **Rendimiento** (SPEC 16): canvas opaco, glow por `glowScale()`, pools y transformaciones sin `save/restore` por entidad.
- Actualizar `references/implemented-games.md` con la fila de `enjambre-orbital`.

**Out of scope (para futuras specs):**

- Skins (`clasico`/`neon`/`retro`): el motor acepta e ignora `skin`; colores en una constante `PALETTE`. No se añade a `SKINNED_GAMES`.
- Sonido y música.
- Control "absoluto" por joystick de 8 direcciones (Gyruss original) o por arrastre táctil alrededor del anillo; aquí la órbita se controla por rotación `←/→` (ver Decisions).
- Un selector de modo dentro de un mismo juego, enlaces cruzados entre las fichas de `enjambre` y `enjambre-orbital`, o un leaderboard combinado.
- Anti-cheat, auth real.
- Tocar `CanvasGame.tsx`, `GamePlayer.tsx`, `TouchControls.tsx`, `app/lib/db/*`, `app/api/scores/route.ts`, el motor de `enjambre` u otros motores.

---

## Data model

Esta spec no crea tablas. Añade **datos**, una **portada**, un **contrato de motor** y una **entrada táctil**.

### Convivencia con `enjambre`

| | `enjambre` (01) | `enjambre-orbital` (02) |
| --- | --- | --- |
| Fila `games` | propia | propia |
| Leaderboard (`scores.game_id`) | propio | propio |
| Motor | `app/lib/games/enjambre/engine.ts` | `app/lib/games/enjambre-orbital/engine.ts` |
| Código compartido | `enjambre/path.ts` (dueño) | importa `../enjambre/path` |
| Portada | `.cover-enjambre` (cian) | `.cover-enjambre-orbital` (magenta) |

Se implementan en cualquier orden. Si se aprueba solo esta, la carpeta `enjambre/` contendrá únicamente `path.ts` hasta que llegue la clásica, y eso es correcto: `registry.ts` solo apunta a `enjambre-orbital/engine.ts`.

### Fila en `games`

```sql
insert into public.games (id, title, short, long, cat, cover, color, best, plays, position)
values (
  'enjambre-orbital',
  'ENJAMBRE ORBITAL',
  'Orbita el núcleo de la colmena y dispara hacia el abismo.',
  'Tu nave gira alrededor del agujero por el que brota el enjambre. Los insectos salen en espiral desde el centro, forman anillos que rotan y se lanzan en picado hacia tu órbita, creciendo a medida que se acercan. Derriba el satélite brillante para doblar tu cañón y, cada tres saltos, rompe las celdas de LA COLMENA para alcanzar su núcleo antes de que acabe el tiempo.',
  'SHOOTER',
  'cover-enjambre-orbital',
  'magenta',
  74320,
  '6.4K',
  (select coalesce(max(position), 0) + 1 from public.games)
);
```

### Siembra de `scores`

```sql
insert into public.scores (game_id, name, score) values
  ('enjambre-orbital', 'PX_KAI',    74320),
  ('enjambre-orbital', 'NEONFOX',   68150),
  ('enjambre-orbital', 'VECTORX',   61900),
  ('enjambre-orbital', 'Z3R0COOL',  55480),
  ('enjambre-orbital', 'SCANLINE',  49720),
  ('enjambre-orbital', 'CYBER_LU',  43260),
  ('enjambre-orbital', 'M00NRYU',   38010),
  ('enjambre-orbital', 'BIT_LORD',  32450),
  ('enjambre-orbital', 'RGB_QUEEN', 27380),
  ('enjambre-orbital', 'JOY_STK',   21940),
  ('enjambre-orbital', 'ATARI_KID', 16700),
  ('enjambre-orbital', 'PIXEL_DAD', 11850);
```

### Integración con el leaderboard (sin cambios de código)

`onGameOver(finalScore)` → modal de `GamePlayer` → `POST /api/scores` con `{ gameId: "enjambre-orbital", name, score }` → `insertScore` → visible en `/salon` y `/juego/enjambre-orbital` vía `getTopScores("enjambre-orbital", N)`. El slug con guion ya es válido (precedente: `bloque-buster`). Nada se ejecuta contra Supabase en la redacción; la migración se aplica en `/spec-impl`.

### Portada

`.cover-enjambre-orbital` (base `.cover-bg` + pseudo-elementos, `var(--magenta)` como color de catálogo con trazos cian): un túnel de anillos concéntricos que se cierran hacia un núcleo magenta pulsante, insectos pequeños cerca del centro y uno grande en el borde, y la nave cian en el arco inferior del anillo exterior. Debe leerse distinta de `.cover-enjambre` (formación en filas) y de `.cover-rocas`. _El diseño real se hace con `/frontend-design`._

### Contrato de motor

```ts
// app/lib/games/enjambre-orbital/engine.ts → cumple GameFactory (types.ts, no se redefine)
import { buildPathLUT, samplePath, type Bezier, type PathLUT, type Vec2 } from "../enjambre/path";
export const createEnjambreOrbitalGame: GameFactory = (canvas, callbacks, _skin) => {
  /* todo el estado en el closure */
  return { start, pause, resume, restart, destroy };
};
```

Contrato de `enjambre/path.ts` (idéntico al de `01-enjambre-clasico`; si este paso lo crea, debe respetarlo al pie de la letra):

```ts
export interface Vec2 { x: number; y: number }
export interface Bezier { p0: Vec2; p1: Vec2; p2: Vec2; p3: Vec2 }
export function bezierPoint(b: Bezier, t: number, out: Vec2): Vec2;
export interface PathLUT { xs: Float32Array; ys: Float32Array; length: number }
export function buildPathLUT(segments: Bezier[], samples?: number): PathLUT;
export function samplePath(lut: PathLUT, distance: number, out: Vec2): boolean;
```

### Geometría polar

- Centro `C = (400, 300)`. Ángulo `θ` medido desde `+x`, con `y` hacia abajo (aumentar `θ` gira en sentido horario en pantalla).
- **Órbita del jugador:** radio `R = 262`; el jugador empieza en `θ = π/2` (abajo) y su nave apunta siempre al centro.
- **Perspectiva:** escala de dibujo `s(r) = 0.35 + 0.65 · min(r / R, 1.2)`; hitbox de enemigos `14 · s(r)` px de radio. Los enemigos cerca del núcleo son pequeños y lejanos; al acercarse a la órbita crecen.
- **Anillos de la formación (la colmena):** anillo interior `r = 90` con 12 huecos y anillo exterior `r = 140` con 20 huecos. La formación entera gira a `ω_f = 0.35 rad/s` (sentido alterno por fase) y "respira" `±8 px` de radio con periodo `3 s`.

### Entidades y constantes

| Elemento | Valor |
| --- | --- |
| Nave del jugador | círculo de colisión `r = 14`, velocidad angular `3.0 rad/s` |
| Disparo del jugador | radial hacia el centro a `560 px/s`, muere en `r < 24`; `MAX_PLAYER_SHOTS = 3` (6 con cañón doble); autofire `FIRE_COOLDOWN = 0.16 s` |
| Composición por fase | 32 enemigos: anillo interior 4 **Reinas** (2 impactos) + 8 **Zánganos**; anillo exterior 20 **Obreras** |
| Entrada | 4 grupos de 8; cada grupo nace en el núcleo (`r = 0`) o fuera de pantalla (`r = 420`) en un ángulo de entrada `φ_g`, recorre una espiral bézier rotada por `φ_g` y se coloca en su hueco; intervalo `0.12 s` dentro del grupo y `1.5 s` entre grupos; velocidad `230 px/s` |
| Picados | `DIVE_INTERVAL = max(0.7, 2.4 − 0.14·(stage−1)) s`; simultáneos `min(2 + floor(stage/2), 10)`; velocidad `210 + 8·stage px/s` (tope `340`). Ruta: bézier desde el hueco, con un rizo de `+0.8 rad`, hasta `R + 80` en el ángulo del jugador al lanzarse (`θ_target`), pasando por `R − 40` a `θ_target − 0.5 rad` (sentido alterno). Al pasar de `r > 420` reaparece en el núcleo y vuelve a su hueco |
| Disparo enemigo | hacia fuera, apuntado a la nave con desviación `±20°`, `240 px/s`; `MAX_ENEMY_SHOTS = 8`; 0–2 por picado, solo con `r < R − 60` |
| Satélites | una vez por fase normal, cuando la formación está completa: trío en triángulo que sale del núcleo girando y se aleja hasta `r = 200` en 6 s y vuelve a entrar. El central brilla. Destruirlo concede el **cañón doble** hasta perder una vida |
| LA COLMENA (fase bonus) | núcleo `r = 36`, 12 PV; anillo de 16 celdas en `r = 70` girando `0.9 rad/s`; anillo de 24 celdas en `r = 110` girando `−0.6 rad/s`; cada celda absorbe 1 disparo; límite `20 s`; sin disparos enemigos ni muerte |
| Vidas | 3; extra a `30 000` y luego cada `60 000` (90 000, 150 000…); tope 9 |
| Respawn | `RESPAWN_DELAY = 2 s`; `INVULN = 1.5 s` con parpadeo |

### Progresión: saltos hacia la colmena

Las fases se agrupan en ciclos de 4: tres **saltos** normales y una fase **LA COLMENA** (`stage % 4 === 0`). El banner de inicio dice "SALTO N · FALTAN K PARA LA COLMENA" (equivalente a los "warps" de Gyruss). Cada ciclo aumenta la rotación de los anillos (`+0.05 rad/s`) y la de la colmena (`+0.1 rad/s`).

### Mapeo de mecánicas → callbacks

- `onScore(score)`:

  | Objetivo | En anillo | En picado |
  | --- | --- | --- |
  | Obrera | 50 | 100 |
  | Zángano | 80 | 160 |
  | Reina (2º impacto) | 150 | 400 |
  | Satélite normal / brillante | 100 / 300 (+ cañón doble) | — |
  | Celda de LA COLMENA | 50 | — |
  | Impacto en el núcleo | 200 | — |
  | Núcleo destruido | `5000 + 100 × segundos restantes` | — |

  Colisionar con un atacante suma sus puntos de picado y cuesta la vida. Tope `100000000`.
- `onLives(lives)` — arranca en `3`; baja al morir; sube con vida extra. El cañón doble se pierde al morir, sin afectar a `lives`.
- `onLevel(stage)` — número de fase (`1..∞`), incluidas las de LA COLMENA.
- `onGameOver(finalScore)` — una sola vez, cuando `lives` llega a `0`.

### Máquina de estados interna

`ready` (banner de salto, 2 s) → `entering` → `playing` → `stageClear` (1.5 s) → `ready`. Laterales: `dying` (1 s) → `respawn` → `playing`; `hive` (LA COLMENA, hasta 20 s o núcleo destruido) → `hiveResult` (2 s, "COLMENA ROTA +N" o "TIEMPO") → `ready`; `gameover` (terminal). Pausa ortogonal (`paused`).

- `start()` — fase 1, `ready`, listeners y RAF.
- `pause()` — congela todo (rotación de anillos, satélites, temporizador de LA COLMENA incluido).
- `resume()` — continúa con `lastTime` reseteado; el temporizador de LA COLMENA **no** descuenta el tiempo en pausa.
- `restart()` — vuelve a `start()` desde cualquier estado.
- `gameover` — `onGameOver` una vez y loop detenido.

### Controles

| Acción | Teclado (`e.code`) | Táctil (SPEC 13, `touch-map.ts`) |
| --- | --- | --- |
| Orbitar en sentido horario (en la parte baja del anillo, la nave va a la izquierda) | `ArrowLeft` / `KeyA` | `◄` `dpad-left`, `hold: true` |
| Orbitar en sentido antihorario | `ArrowRight` / `KeyD` | `►` `dpad-right`, `hold: true` |
| Disparar hacia el núcleo (autofire al mantener) | `Space` / `KeyZ` | `⦿` `action-a`, `hold: true` |

`preventDefault` en flechas y `Space`. Sin tecla de pausa propia.

### Render (paleta neón, CRT)

Fondo `--bg` completo cada frame; **túnel de estrellas** radial (140 estrellas `(ángulo, r, velocidad)` que salen del centro como trazos cortos y se reciclan al pasar de `r = 420`); guía de la órbita como círculo cian muy tenue; nave del jugador cian; obreras cian; zánganos magenta; reinas amarillas que pasan a verde tras el primer impacto; satélites blancos con el brillante en amarillo pulsante; LA COLMENA con celdas hexagonales cian y núcleo magenta pulsante. Banners en fuente del sitio. Todos los colores en `PALETTE`, alineados con `--cyan #00f5ff`, `--magenta #ff006e`, `--yellow #f5ff00`, `--green #00ff88`, `--bg #0a0a0f`.

### Casos límite

- **Paso por `θ = 0 / 2π`:** el ángulo del jugador se normaliza a `[0, 2π)` cada frame; las comparaciones de ángulo (apuntado, picados) usan la diferencia angular mínima, nunca la resta directa.
- **`←` y `→` a la vez:** se anulan.
- **`e.repeat`:** se ignora; el autofire lo controla el cooldown.
- **`blur` del `window`:** se limpian las teclas pulsadas.
- **Disparo que cruza un enemigo pequeño cerca del centro:** colisión barrida a lo largo del segmento radial recorrido en el frame (distancia punto-segmento), con `dt` cap `0.05`.
- **Disparos en LA COLMENA:** chocan primero con la celda más exterior de su recorrido; solo llegan al núcleo por un hueco abierto.
- **Fase normal despejada con satélites vivos:** los satélites se retiran sin dar puntos y la fase termina.
- **Morir con el cañón doble:** se pierde el cañón doble; la vida se descuenta normal.
- **Tiempo de LA COLMENA agotado con el núcleo dañado:** se conservan los puntos de celdas e impactos, sin el bonus del núcleo.
- **Vida extra y muerte en el mismo frame:** se aplican en orden y se emite un único `onLives`.
- **`restart()` durante `hive`, `dying` o `gameover`:** reinicio limpio, `gameOverSent = false`.

### Presupuesto de rendimiento (SPEC 16)

- `getContext("2d", { alpha: false })` y fondo completo cada frame.
- `glowScale()` leído una vez al crear el motor; glow por lote de color (anillos de la formación, atacantes, jugador, núcleo); sin glow en disparos, estrellas, partículas ni celdas.
- Cada entidad rotada se dibuja con `ctx.setTransform(cos·s, sin·s, −sin·s, cos·s, x, y)` sobre `Path2D` precalculados (por tipo y frame de aleteo), y se restaura la identidad una vez por lote; nada de `save/restore` por entidad.
- `Math.cos/sin` del ángulo de cada hueco se calculan una vez por frame para todo el anillo (rotación común + offset del hueco).
- Pools de tamaño fijo: `playerShots[6]`, `enemyShots[8]`, `particles[256]`, `stars[140]`, `cells[40]`; LUT de entrada y picado (en coordenadas canónicas, rotadas al muestrear) construidas al crear el motor; cero asignaciones en el bucle.
- Objetivo: ≤ 4 ms de `update + draw` en desktop en el peor caso (10 atacantes, 8 disparos enemigos, satélites y explosiones; o LA COLMENA con 40 celdas), medido con `?debug=perf`.

---

## Implementation plan

Cada paso deja la app compilando y navegable; el resto de juegos nunca se rompe.

1. **Prototipo vanilla.** Crear `references/started-games/10-gyruss/index.html` + `game.js`: canvas `800×600`, órbita `R = 262`, nave que orbita con `←/→` y dispara hacia el centro, túnel de estrellas, formación en dos anillos que giran y respiran, entrada en espiral desde el núcleo y desde fuera, picados hacia fuera con perspectiva, disparo enemigo, satélites con cañón doble, LA COLMENA cada 4 fases, 3 vidas con vida extra. Verificable abriendo el HTML; calibrar ahí la velocidad angular y la dificultad.
2. **Trayectorias.** Si `app/lib/games/enjambre/path.ts` existe (implementada la `01`), importarlo sin modificarlo. Si no, crearlo con el contrato exacto del Data model (bézier cúbica, LUT de 64 muestras por segmento reparametrizada por longitud de arco, `samplePath` que escribe en un `Vec2` de salida). Definir en `engine.ts` las espirales de entrada y las plantillas de picado en un marco canónico (ángulo 0) y aplicar la rotación `φ` al muestrear, no al construir: una LUT por plantilla, no por enemigo.
3. **Motor: esqueleto y ciclo de vida.** Crear `app/lib/games/enjambre-orbital/engine.ts` exportando `createEnjambreOrbitalGame: GameFactory`. Estado en el closure (`player {θ}`, `doubleCannon`, `formation[32]`, `divers`, `satellites`, `hive`, pools, `score`, `lives`, `stage`, `nextExtraLife`, `ringAngle`, `state`, `stateTimer`, `paused`, `lastTime`, `rafId`). Contexto `{ alpha: false }`, `800×600`. `start/pause/resume/restart/destroy` con listeners `keydown`/`keyup`/`blur` en `window`, RAF cancelable, `dt` cap `0.05`, `lastTime = null` al reanudar, `syncReactState()` que emite solo ante cambio y `onGameOver` una vez.
4. **Órbita, disparo y anillos.** Rotación del jugador con normalización del ángulo, autofire radial, formación en dos anillos con rotación común y respiración, colisión barrida disparo→enemigo con escala de perspectiva. Reinas con 2 impactos.
5. **Entrada y picados.** Modos `entering | formation | diving | returning` con cursor sobre la LUT rotada; interpolación final hacia la posición viva del hueco (el anillo gira); picados hacia `θ_target` en sentido alterno; reaparición por el núcleo al salir de pantalla.
6. **Satélites y cañón doble.** Trío que sale del núcleo cuando la formación está completa; destruir el brillante activa `doubleCannon` (dos disparos paralelos separados `±0.06 rad`, tope 6); morir lo desactiva.
7. **LA COLMENA.** Cuando `stage % 4 === 0`: núcleo + 2 anillos de celdas contrarrotantes, temporizador de 20 s (dibujado en el canvas), colisión del disparo con la celda más exterior de su recorrido, puntos y bonus del núcleo; resultado 2 s y salto siguiente.
8. **Render.** Túnel de estrellas, guía de órbita, entidades con `setTransform` por lote, banners de salto/colmena/resultado, partículas; glow y asignaciones según el presupuesto de rendimiento.
9. **Registrar.** En `app/lib/games/registry.ts`: `import { createEnjambreOrbitalGame } from "./enjambre-orbital/engine";` + entrada `"enjambre-orbital": createEnjambreOrbitalGame`, y actualizar el comentario de cabecera. No se tocan `CanvasGame.tsx` ni `GamePlayer.tsx`.
10. **Táctil.** En `app/lib/games/touch-map.ts`, añadir `"enjambre-orbital"` con `◄`/`►` (`ArrowLeft`/`ArrowRight`, `hold: true`) y `⦿` (`Space`, `key: " "`, `hold: true`, `action-a`), documentado en el comentario del esquema.
11. **Catálogo y leaderboard.** Migración Supabase (MCP `apply_migration`) con el `insert` en `games` (`position` calculado) y los 12 `insert` en `scores`. Revisar `get_advisors`. Sin regenerar `database.types.ts`.
12. **Portada.** `.cover-enjambre-orbital` en `app/globals.css` con `/frontend-design`.
13. **Referencia.** Añadir la fila de `enjambre-orbital` a `references/implemented-games.md`.

---

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de tipos de ruta; `npm run lint` pasa.
- [ ] Existe `references/started-games/10-gyruss/` y es jugable abriendo su `index.html`.
- [ ] Existe la fila `games` con `id = 'enjambre-orbital'`, `cat = 'SHOOTER'`, `color = 'magenta'`, `cover = 'cover-enjambre-orbital'` y `position` = máximo previo + 1; `scores` tiene 12 filas decrecientes para `enjambre-orbital`; RLS intacto y `get_advisors` sin problemas nuevos.
- [ ] ENJAMBRE ORBITAL aparece en `/`, `/games` (filtro SHOOTER), `/salon` (tab propia, separada de ENJAMBRE) y `/juego/enjambre-orbital`, con su portada.
- [ ] En `/jugar/enjambre-orbital` la nave orbita un anillo de radio 262 con `←/→`/`A/D`, apunta siempre al centro y dispara hacia él con `Espacio`/`Z` (autofire, máx. 3 disparos; 6 con cañón doble); pasar por la derecha del anillo (`θ = 0`) no produce saltos.
- [ ] Los 32 enemigos entran en espiral desde el núcleo o desde fuera, forman dos anillos que giran y respiran, y se lanzan en picado hacia la órbita creciendo con la perspectiva; los que salen de pantalla vuelven por el núcleo.
- [ ] Los satélites aparecen una vez por fase normal; destruir el brillante activa el cañón doble, que se pierde al morir.
- [ ] La fase 4 (y la 8, 12…) es LA COLMENA: celdas contrarrotantes que absorben disparos, núcleo de 12 PV alcanzable solo por huecos, 20 s de límite que no corren en pausa, sin disparos enemigos ni muerte, y bonus `5000 + 100 × segundos restantes` al romper el núcleo.
- [ ] El banner de inicio de fase indica cuántos saltos faltan para LA COLMENA.
- [ ] El HUD de React refleja score, vidas (3, extra a 30 000 y cada 60 000) y fase reales.
- [ ] Al perder la última vida se abre el modal de fin con la puntuación real; "GUARDAR PUNTUACIÓN" hace `POST /api/scores` con `{ gameId: "enjambre-orbital", name, score }` y la fila aparece en su leaderboard (no en el de `enjambre`); "JUGAR DE NUEVO" reinicia limpio.
- [ ] PAUSA/REANUDAR no provoca salto de simulación ni descuenta tiempo de LA COLMENA.
- [ ] `engine.ts` no usa estado global ni `document.getElementById`; `destroy()` cancela el RAF y quita listeners; reentrar no duplica el loop.
- [ ] En emulación táctil aparecen `◄`, `►`, `⦿` (todos mantenidos) y permiten orbitar y disparar en ráfaga sin teclas pegadas.
- [ ] Contexto `{ alpha: false }` sin estelas; glow atenuado en `pointer: coarse` y anulado con `prefers-reduced-motion`; con `?debug=perf` se mantiene ~60 fps en desktop en el peor caso descrito.
- [ ] Si `enjambre` ya estaba implementado, su motor y su `path.ts` no cambian y sigue jugable; `rocas`, `caida`, `bloque-buster`, `serpentina` y `ranaria` siguen jugables y las maquetas siguen como maqueta.

---

## Decisions

- **Sí:** twist **orbital** (geometría polar, linaje Gyruss) frente a "colmena infinita" (duplicaría la clásica) y "modo invertido" (cambia de género y exige IA defensora). Es el único de los tres que cambia la forma de jugar manteniendo el ADN de ENJAMBRE: formación, entrada curva y picados.
- **Sí:** slug y fila propios (`enjambre-orbital`), no un modo dentro de `enjambre`. El leaderboard es uno por `game_id` y no hay columna de modo; mezclar puntuaciones de reglas distintas falsearía el ranking. Además el `GameFactory` solo admite `skin`, y añadir un "modo" obligaría a tocar `types.ts`, `CanvasGame.tsx` y `GamePlayer.tsx`. Dos fichas en `/games` dejan ver ambas variantes a la vez.
- **Sí:** compartir solo `enjambre/path.ts` (funciones puras); motores separados. Se descarta un motor base común: cada variante tiene su geometría y su máquina de estados.
- **Sí (supuesto):** control **rotacional** (`←` horario, `→` antihorario) en vez de "dirección de pantalla" (que se invierte en los laterales y vibra en `θ = 0/π`) o de joystick de 8 direcciones (el overlay táctil de SPEC 13 solo tiene ◄/►). En la parte baja del anillo, donde empieza la partida, `←` mueve la nave a la izquierda en pantalla, que es lo intuitivo.
- **Sí (supuesto):** cañón doble por **satélites** como equivalente polar de la doble nave de Galaga; se descarta portar el rayo tractor a la geometría polar (el haz radial se superpone a la órbita y complica el rescate).
- **Sí (supuesto):** LA COLMENA como fase bonus en lugar de la fase de desafío de la clásica: le da al twist una mecánica propia (abrir huecos en anillos que giran) y recoge la idea "colmena" de la jam.
- **Sí:** `cat = SHOOTER`, `color = magenta` en catálogo para distinguir la ficha de la clásica (cian), con el canvas manteniendo el cian como color dominante de la familia ENJAMBRE.
- **Sí:** `best = 74320`, `plays = '6.4K'` sembrados (patrón SPEC 06), por debajo de la clásica: variante más difícil y nueva.
- **No:** skins, sonido, control por arrastre táctil, selector de modo, leaderboard combinado, anti-cheat, auth real.

---

## Risks

| Riesgo | Mitigación |
| --- | --- |
| Control rotacional confuso en la mitad superior del anillo (`←` mueve la nave a la derecha en pantalla). | Es la convención de Gyruss/Tempest; la partida empieza abajo; el prototipo `10-gyruss` valida la velocidad angular antes del port. Si molesta, el control "dirección de pantalla" queda para otra spec. |
| Errores de ángulo al cruzar `0/2π` (saltos, apuntado erróneo). | Normalizar `θ` cada frame y usar siempre la diferencia angular mínima; criterio de aceptación específico. |
| Enemigos muy pequeños cerca del centro, difíciles de acertar, y tunneling de disparos radiales. | Hitbox con mínimo de `0.35` de escala; colisión barrida a lo largo del segmento radial; `dt` cap `0.05`. |
| Coste de dibujar muchas entidades rotadas y escaladas. | `setTransform` directo sobre `Path2D` precalculados, glow por lote, trigonometría del anillo una vez por frame, pools sin asignaciones. |
| Dependencia de `enjambre/path.ts` si solo se aprueba esta variante. | El paso 2 lo crea con el contrato exacto si no existe; la `01` lo reutilizará tal cual. |
| La pantalla con anillos, túnel de estrellas y celdas puede resultar ilegible en el CRT. | Guía de órbita y estrellas muy tenues, glow solo en entidades jugables, paleta con un color por tipo; revisión visual en el prototipo y en `/jugar`. |
| Fugas de RAF/listeners. | `destroy()` cancela el RAF y quita listeners; criterio de reentrada. |
| `INSERT` público en `scores` permite spam. | `check` de rango/longitud (SPEC 06), sin `UPDATE/DELETE`; endurecer en otra spec. |

---

## Qué **no** está en esta spec

- La variante clásica `enjambre` (va en `01-enjambre-clasico.md`).
- Skins del juego y su entrada en `SKINNED_GAMES`.
- Sonido y música.
- Control por joystick de 8 direcciones o por arrastre táctil sobre el anillo.
- Selector de modo, enlaces cruzados entre fichas o leaderboard combinado.
- Anti-cheat / verificación server-side de puntuaciones.
- Auth real y vincular scores a un usuario.
- Cambios en `CanvasGame.tsx`, `GamePlayer.tsx`, `TouchControls.tsx`, `app/lib/db/*`, `app/api/scores/route.ts` u otros motores.

Cada uno de esos, si llega, va en su propia spec.
