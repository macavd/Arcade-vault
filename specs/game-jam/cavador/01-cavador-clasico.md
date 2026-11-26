# SPEC 01 (game-jam/cavador) — "CAVADOR" modo clásico (Dig Dug): catálogo, leaderboard y motor jugable

> **Status:** Draft
> **Depends on:** SPEC 05, SPEC 06, SPEC 13, SPEC 16
> **Date:** 2026-11-26
> **Objective:** Dar de alta `cavador` (CAVADOR, un Dig Dug fiel: excavar túneles e inflar bichos con la bomba de aire) en el catálogo y el leaderboard de Supabase y entregarlo jugable con un motor `createCavadorGame: GameFactory` registrado en `app/lib/games/registry.ts`, reusando el patrón de motor de las SPEC 05/07/08/09 y el de catálogo/scores de la SPEC 06.

---

## Por qué existe esta spec

La tanda de sugerencias del 2026-10-21 (carril laberinto/persecución) propuso **CAVADOR**, un **Dig Dug** (Namco, 1982), con esta justificación: _"excavar túneles e inflar bichos. Terreno destructible, el jugador crea el laberinto (no solapa con gloton)"_. Este game jam lo toma como tema y lo desarrolla en dos variantes jugables con slug propio. Esta es la **variante clásica**, fiel al arcade. La variante con cambio de mecánica (`cavador-derrumbe`, por turnos y sin bomba) está en `02-cavador-derrumbe.md` y reutiliza el render y la geometría que se definen aquí.

**Por qué encaja en Arcade Vault:**

- **Llena un hueco de mecánica.** Ningún juego del catálogo actual (`rocas`, `caida`, `bloque-buster`, `serpentina`, `ranaria`, `gloton`, `invasores`, `duelo-pixel`) tiene **terreno destructible**. `gloton` (un Pac-Man) es un laberinto fijo; en CAVADOR **el jugador dibuja el laberinto** mientras juega, y los enemigos lo usan para perseguirle.
- **Es un arcade de un jugador que se puntúa de forma natural**: inflar un bicho da más puntos cuanto más profundo está, aplastar varios con una roca da un bonus escalonado y aparece una verdura de bonus. Todo eso se suma en un `score` para el leaderboard de `scores`.
- **Encaja con la arquitectura de motores**: rejilla en canvas 2D de `800×600` (4:3, igual que el `.crt-screen`), con vidas y rondas que se corresponden directamente con `onLives`/`onLevel`.
- **Encaja con la estética neón/CRT**: túneles negros recortados sobre estratos de tierra en degradado, con un cavador y unos bichos de neón muy marcados. Funciona bien sobre fondo oscuro.

**Estado de partida.** Lo he verificado leyendo los ficheros. `cavador` **no existe** en el catálogo, ni en `app/lib/games/registry.ts`, ni en `app/globals.css` (no hay `.cover-cavador`), ni en `specs/game-jam/`. En `references/started-games/` solo están `02-asteroids`, `03-tetris`, `04-arkanoid` y `05-snake`, y todos están ya portados. **No hay prototipo de Dig Dug**, así que, igual que con `05-snake` antes de la SPEC 09 y con `06-frogger` antes del motor de `ranaria`, **primero hay que construir un prototipo vanilla nuevo** y después portarlo.

A diferencia de la SPEC 09 (solo motor, porque el catálogo ya existía), esta spec cubre **catálogo + leaderboard + motor + táctil**, porque `cavador` empieza de cero.

---

## Scope

**In:**

- **Prototipo vanilla** de Dig Dug en `references/started-games/09-dig-dug/` (`index.html` + `game.js`), que se pueda verificar fuera de React y sirva como fuente del port. El número `09` evita chocar con `06-frogger`, `07-road-fighter` y `08-moon-patrol`, que están reservados por otras specs de game-jam; al implementar se comprueba el siguiente número libre.
- **Alta en `games`** de la fila `cavador` (`ARCADE`/`yellow`) mediante migración de Supabase, respetando los `check` de la SPEC 06.
- **Siembra de 12 filas en `scores`** para `game_id = 'cavador'`.
- **Portada `.cover-cavador`** en `app/globals.css`, diseñada con `/frontend-design`.
- **Motor portado** a `app/lib/games/cavador/engine.ts` como `createCavadorGame: GameFactory`, sin estado global de módulo, con el canvas recibido por parámetro y resolución interna `800×600`.
- **Módulos compartidos** en `app/lib/games/cavador/`: `constants.ts` (rejilla, estratos, tiempos), `palette.ts` (paleta `clasico`), `terrain.ts` (máscara de tierra por subceldas con caché de dibujo) y `draw.ts` (sprites vectoriales del cavador, los bichos y las rocas). La variante `cavador-derrumbe` (spec 02) los reutiliza.
- **Registro** en `app/lib/games/registry.ts`: `cavador: createCavadorGame`.
- **Esquema táctil** en `app/lib/games/touch-map.ts`: `TOUCH_MAP.cavador` (d-pad de 4 direcciones en modo `hold` + botón de bomba en modo `hold`), siguiendo SPEC 13 sin tocar `TouchControls.tsx`.
- **Rendimiento (SPEC 16)**: contexto `{ alpha: false }`, el frame completo se pinta en cada vuelta y el glow se multiplica por `glowScale()` de `app/lib/games/perf.ts`.
- Fila nueva en `references/implemented-games.md` al cerrar la implementación.

**Out of scope (para futuras specs):**

- **Skins** `neon`/`retro`: el motor acepta el parámetro `skin` de `GameFactory`, pero en esta spec solo implementa `clasico`. `cavador` **no** se añade a `app/lib/games/skins.ts` (así no sale selector). Los skins se harán con el agente `skin-designer` en su propia spec.
- Sonido y música (la melodía que en el original acompaña al movimiento del jugador).
- Modo de dos jugadores alternos, tabla de iniciales dentro del canvas y DIP switches (vidas y bonus configurables).
- Cambios a `TouchControls.tsx`, `CanvasGame.tsx`, `GamePlayer.tsx`, a los otros motores o a los contratos de la SPEC 06.
- Anti-cheat y verificación de puntuaciones en servidor; auth real.
- La variante `cavador-derrumbe` (va en `02-cavador-derrumbe.md`).

---

## Data model

Esta spec **no crea tablas** (ya existen `games` y `scores` desde la SPEC 06). Añade **datos**, **una portada** y **un contrato de motor**.

### Fila en `games`

`position` es el siguiente hueco libre: se calcula en la migración con `MAX(position) + 1` sobre el valor real, sin suponer ningún número.

```sql
insert into public.games (id, title, short, long, cat, cover, color, best, plays, position)
values (
  'cavador',
  'CAVADOR',
  'Excava túneles bajo tierra e infla a los bichos hasta que revienten.',
  'Abre tu propio laberinto a golpe de pala por cuatro estratos de tierra de neón. Los globos y los dragones te persiguen por tus túneles y atraviesan la tierra como fantasmas: clávales la bomba de aire e ínflalos hasta que revienten, o socava las rocas para aplastarlos en grupo. Cuanto más hondo cazas, más puntúas.',
  'ARCADE',
  'cover-cavador',
  'yellow',
  48650,
  '5.2K',
  (select coalesce(max(position), 0) + 1 from public.games)
);
```

### Siembra de `scores`

Los nombres tienen entre 1 y 10 caracteres y salen del set del prototipo. Los scores están en el rango 0..100000000, son decrecientes y encajan con `best = 48650`: equivalen más o menos a llegar a la ronda 12–14.

```sql
insert into public.scores (game_id, name, score) values
  ('cavador', 'PX_KAI',    48650),
  ('cavador', 'NEONFOX',   44120),
  ('cavador', 'VECTORX',   39870),
  ('cavador', 'Z3R0COOL',  35400),
  ('cavador', 'SCANLINE',  31260),
  ('cavador', 'CYBER_LU',  27930),
  ('cavador', 'M00NRYU',   23500),
  ('cavador', 'BIT_LORD',  19840),
  ('cavador', 'RGB_QUEEN', 16200),
  ('cavador', 'JOY_STK',   12750),
  ('cavador', 'ATARI_KID',  9300),
  ('cavador', 'PIXEL_DAD',  6100);
```

### Portada

`.cover-cavador` va en `app/globals.css` (base `.cover-bg` + `::before`/`::after`, color neón `var(--yellow)`). Diseño propuesto: un corte de terreno con 3–4 bandas horizontales en degradado de ámbar a granate, un túnel negro en forma de "L" que baja desde la superficie, el cavador amarillo-neón con la manguera extendida y un globo inflado a punto de reventar. Una roca encima del túnel. _El diseño real se hace con `/frontend-design`._

### Contrato de motor

Viene de `app/lib/games/types.ts` y no se redefine:

```ts
// app/lib/games/cavador/engine.ts → cumple GameFactory
export const createCavadorGame: GameFactory = (canvas, callbacks, skin = "clasico"): GameEngine => {
  /* estado de partida (terreno, jugador, enemigos, rocas, bonus, score,
     lives, level, state, rafId, lastTime, held) encapsulado en el closure */
};
```

### Geometría y resolución

- Canvas interno de `800×600`, fijado por el motor (`canvas.width = 800; canvas.height = 600`) sin leer el DOM.
- **Rejilla lógica** de `20×15` **tiles de 40 px** (`TILE = 40`). La fila 0 es el **cielo** (no se puede pisar; allí se dibujan las flores de ronda que marcan el nivel, como en el original). La fila 1 es la **superficie** (se camina sin cavar; el jugador aparece aquí). Las filas 2–14 son **tierra**, en 4 estratos: `2–4`, `5–7`, `8–10` y `11–14`. Cada estrato tiene su color en la paleta y su multiplicador de puntos.
- **Máscara de terreno** de `80×60` **subceldas de 10 px** (`SUB = 10`, `Uint8Array`): `1` = tierra, `0` = túnel. Cuando el cavador avanza, limpia las subceldas que pisa su caja de `40×40`, así que los túneles quedan con forma suave y aparecen poco a poco, como en el arcade. Los enemigos no fantasma **solo** pueden ocupar un tile si todas sus subceldas están cavadas.

### Mecánicas

- **Movimiento del cavador.** Se mueve en 4 direcciones por carriles de 40 px. Solo puede **girar 90°** cuando está alineado con el centro de un tile (tolerancia de 4 px, con ajuste al carril). Si se pide un giro perpendicular sin estar alineado, el giro **queda en búfer** y se aplica al llegar al siguiente centro. Invertir el sentido (180°) es inmediato. Velocidad: `PLAYER_SPEED = 90 px/s` por túnel y `DIG_SPEED = 70 px/s` cuando está cavando tierra.
- **Bomba de aire.** `Espacio` o `X` dispara una manguera en la dirección en la que mira. Se extiende a `HOSE_SPEED = 480 px/s` hasta un alcance de `HOSE_RANGE = 3 tiles` y **se detiene contra la tierra sin cavar**: no atraviesa tierra. Si toca a un enemigo no fantasma, se engancha a él. Mientras está enganchada:
  - cada **nueva pulsación** sube un estadio de inflado (`0→4`); si la tecla se **mantiene**, el bombeo es automático cada `PUMP_INTERVAL = 0.3 s`. Así el `hold` de SPEC 13 funciona sin depender del auto-repeat del teclado;
  - en el estadio 4 el bicho **revienta** a los `0.2 s` y da puntos;
  - el cavador **no puede moverse** mientras la manguera está enganchada. Pulsar una dirección suelta la manguera;
  - si se deja de bombear, el bicho se **desinfla** un estadio cada `DEFLATE_TIME = 0.8 s`. Mientras su estadio sea mayor que 0 está **inmóvil e inofensivo**.
- **Enemigos.**
  - **Globo** (equivalente al Pooka): persigue al jugador por los túneles. En cada centro de tile elige la dirección con BFS sobre los tiles cavados, con desempate fijo `arriba, izquierda, abajo, derecha`.
  - **Dragón** (equivalente al Fygar): persigue igual, pero cuando está **alineado en horizontal** con el jugador a 4 tiles o menos, se para `0.6 s` parpadeando en rojo (aviso) y **escupe fuego** 3 tiles en la dirección en la que mira durante `0.5 s`. El fuego **atraviesa la tierra**, como en el original. Recarga: `3 s`.
  - **Modo fantasma**: si un enemigo lleva `GHOST_DELAY` (aleatorio entre 4 y 8 s, con RNG sembrado) sin poder acercarse al jugador, pasa a fantasma (solo se le ven los ojos). Atraviesa tierra en línea recta hacia el jugador a `40 px/s` y vuelve a ser sólido en el primer tile cavado que alcanza tras al menos 1 s como fantasma. Mientras es fantasma **no se le puede bombear y no hace daño**.
  - Velocidad base: `ENEMY_SPEED = 60 px/s × min(1.8, 1 + 0.08·(level − 1))`.
  - **Huida del último**: cuando solo queda un enemigo, este se va hacia la superficie (fila 1) y después hacia el borde izquierdo, y puede usar el modo fantasma. Si sale por la izquierda, **la ronda termina sin darte sus puntos**.
- **Rocas.** En cada ronda hay entre 3 y 5 rocas dentro de la tierra. Cuando el tile de debajo de una roca queda totalmente cavado **y el cavador no está en ese tile**, la roca **se tambalea** `0.6 s` y luego **cae** a `240 px/s` hasta que encuentra tierra o el fondo. Aplasta a todos los enemigos que encuentre en su camino (también a los inflados y a los fantasma) y **al cavador**. Al pararse se deshace en `0.4 s`.
- **Verdura de bonus.** Cuando se han dejado caer **2 rocas** en la ronda, aparece una verdura en el centro del tablero durante `10 s`. Si el cavador la recoge, suma `BONUS_VEG[min(level, 8) − 1]` (`400, 600, 800, 1000, 2000, 3000, 4000, 5000`).
- **Ronda.** Al empezar, el cavador aparece en la superficie, en la columna 9, sobre un **pozo vertical ya cavado** hasta la fila 7, y cada enemigo empieza en su propio **hueco ya cavado** (un túnel horizontal o vertical de 2 a 4 tiles). El reparto de huecos y rocas se **genera con un RNG sembrado por el número de nivel**, así que cada nivel tiene siempre la misma disposición. Restricciones del generador:
  - los huecos están a una distancia Manhattan de al menos 4 del pozo central y no se tocan entre sí;
  - ninguna roca está justo encima de un hueco.

  Número de enemigos: `min(8, 4 + floor((level − 1) / 2))`. Uno de cada tres, como mínimo, es dragón. La ronda se limpia cuando no queda ningún enemigo: `level++`, se regenera el terreno y empieza la siguiente.
- **Muerte.** El cavador muere si lo toca un enemigo sólido y sin inflar, si le alcanza el fuego o si le cae una roca. Pierde una vida y se congela `1.5 s` con la animación de muerte. Los enemigos vivos **vuelven a su hueco inicial** y el **terreno cavado se conserva**, igual que en el arcade.

### Puntuación (`onScore`)

| Evento                                   | Puntos                                                                                           |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Reventar un globo con la bomba           | `200 / 300 / 400 / 500` según el estrato (1–4) donde está el bicho                               |
| Reventar un dragón con la bomba          | igual que el globo; **×2** si la manguera iba en horizontal                                      |
| Aplastar con una roca (por caída)        | 1 bicho `1000`, 2 → `2500`, 3 → `4000`, 4 → `6000`, 5 → `8000`, 6 → `10000`, 7 → `12000`, 8+ → `15000` |
| Verdura de bonus                         | `400..5000` según el nivel (tabla `BONUS_VEG`)                                                   |
| Cavar tierra                             | `+10` por cada tile **nuevo** cavado del todo (premia abrir laberinto)                           |

Cada evento de puntos dibuja un texto flotante (`+500`) en el canvas durante `0.8 s`.

### Mapeo de mecánicas → callbacks

- `onScore(score)`: score acumulado (tabla de arriba). Solo se emite cuando cambia.
- `onLives(lives)`: arranca en `3`. Baja al morir. **Vida extra** al llegar a `10000` y después cada `40000` (tope de 5). `onLives(0)` en la última muerte.
- `onLevel(level)`: arranca en `1` y sube al limpiar una ronda. Si el último bicho se escapa, **también** se pasa de ronda.
- `onGameOver(finalScore)`: **una sola vez**, al perder la última vida, cuando termina la animación de muerte. No hay victoria final: las rondas son infinitas y se acelera hasta el tope de velocidad.

Todo pasa por un `syncReactState()` que compara con el último valor emitido (patrón de las SPEC 08/09).

### Estados del motor

`ready` → `playing` ⇄ `paused` → `dying` → (`playing` | `over`), más `roundIntro` (1,2 s con el texto "RONDA N" dibujado, la entrada no se procesa) y `roundClear` (1 s). Así se corresponden con el ciclo de vida:

- `start()`: crea el estado del nivel 1, añade los listeners y arranca el RAF. Emite `onScore(0)`, `onLives(3)` y `onLevel(1)`.
- `pause()`: cancela el RAF y vacía `held` (no quedan teclas pegadas). El estado lógico queda congelado tal cual: inflado, tambaleo de roca, cuenta del fuego.
- `resume()`: pone `lastTime = null` y reanuda. El primer frame tiene `dt = 0`, así que no hay salto.
- `restart()`: vuelve al estado del nivel 1 (score 0, vidas 3, terreno nuevo), anula el guard de `onGameOver` y rearranca el loop.
- `destroy()`: cancela el RAF, quita **todos** los listeners (`keydown`/`keyup` de `window` y `blur`) y suelta las referencias.

El bucle usa `dt = min((now − lastTime)/1000, 0.05)`. Se elimina cualquier "pulsa ENTER para reiniciar" del prototipo: el reinicio lo hace el modal de React con `restart()`.

### Controles

- **Teclado** (se lee `e.code`; `preventDefault` solo en estas teclas):
  - `ArrowUp/KeyW`, `ArrowDown/KeyS`, `ArrowLeft/KeyA`, `ArrowRight/KeyD`: mover (mantener pulsado). Si hay varias pulsadas, manda la última.
  - `Space`/`KeyX`: bomba (pulsar para disparar o inflar un estadio; mantener para bombear solo).
  - Al recibir `blur` en `window` se vacía `held`.
- **Táctil (SPEC 13)**. Entrada nueva en `TOUCH_MAP`; `TouchControls` no se toca:

  ```ts
  cavador: {
    buttons: [
      { label: "◄", code: "ArrowLeft",  key: "ArrowLeft",  hold: true,  slot: "dpad-left"  },
      { label: "►", code: "ArrowRight", key: "ArrowRight", hold: true,  slot: "dpad-right" },
      { label: "▲", code: "ArrowUp",    key: "ArrowUp",    hold: true,  slot: "dpad-up"    },
      { label: "▼", code: "ArrowDown",  key: "ArrowDown",  hold: true,  slot: "dpad-down"  },
      { label: "⦿", code: "Space",      key: " ",          hold: true,  slot: "action-a"   },
    ],
  },
  ```

  El movimiento es continuo, así que el d-pad va en `hold`. La bomba también va en `hold`: el `keydown` engancha o infla un estadio y, mientras el dedo sigue pulsando, el motor bombea solo con `PUMP_INTERVAL`. El layout responsive y el aviso de orientación los hereda de SPEC 15 sin cambios: el canvas es 4:3 y escala con `.crt-screen`.

### Render en canvas

Orden de dibujo en cada frame (todo el frame se pinta, como exige `alpha: false`):

1. Fondo: cielo (fila 0) y superficie (fila 1) con un `fillRect` de ancho completo.
2. **Capa de terreno**: un canvas auxiliar `800×520` (filas 2–14) que se crea en la fábrica con `document.createElement("canvas")`. **Solo se repintan las subceldas que cambian** al cavar (lista de cambios por frame) y la capa se copia con un único `drawImage`. Los estratos se pintan con el color de la paleta y los túneles con el color de fondo.
3. Rocas (con un temblor de ±2 px mientras se tambalean), verdura de bonus, enemigos (globo: círculo con gafas; dragón: cuerpo con cresta; fantasma: solo ojos; inflado: escala `1 + 0.25·estadio`), manguera (línea discontinua), cavador (vectorial, orientado según su dirección), fuego, textos flotantes y "RONDA N".
4. Flores en la fila 0: una por ronda (las de 10 rondas se agrupan en una flor grande), como indicador de nivel dentro del canvas.

El glow (`shadowBlur`) se aplica **solo** al cavador, la manguera y el fuego, multiplicado por `glowScale()` una vez al instanciar (SPEC 16). Ni el terreno ni los enemigos llevan glow, para contener el coste.

### Integración con el leaderboard

No cambia nada del flujo de la SPEC 06. Al llamar a `onGameOver`, el modal de `GamePlayer.tsx` hace `POST /api/scores` con `{ gameId: "cavador", name, score }`. El servidor valida nombre (1–10) y rango. `/juego/cavador` y `/salon` leen con `getTopScores("cavador", n)`.

### Casos límite

- **Cavar justo debajo de una roca estando debajo**: la roca no cae mientras el cavador ocupe el tile de debajo. Empieza a tambalearse en cuanto sale, y si vuelve a entrar durante el tambaleo, muere aplastado (comportamiento clásico y legible).
- **Roca que cae sobre un bicho inflado o fantasma**: lo aplasta y cuenta para el bonus por caída.
- **Manguera enganchada y el bicho se va (fantasma)**: imposible, porque un bicho inflado no puede pasar a fantasma. Si el bicho revienta por una roca mientras está enganchado, la manguera se suelta sin puntos de bomba.
- **Dos bichos en la trayectoria de la manguera**: se engancha al primero.
- **Fuego de un dragón inflado**: se cancela el aviso y la recarga vuelve a empezar al desinflarse.
- **Huida del último bicho cuando ya va a la superficie y se le infla**: se le puede bombear de forma normal.
- **Morir y perder la última vida en el mismo frame en que se limpia la ronda**: manda la muerte. Se comprueba la muerte antes de la condición de ronda limpia.
- **Varias direcciones pulsadas a la vez (diagonal)**: manda la última pulsada; la otra queda en búfer para el siguiente centro de tile.
- **Pérdida de foco o cambio de pestaña**: `blur` vacía `held`. La plataforma pausa y `resume()` no da saltos.
- **Varias vidas extra en el mismo evento** (una caída de roca enorme): se suman todas, con tope de 5.
- **Reentrada en `/jugar/cavador`**: cada montaje crea un estado y una capa de terreno nuevos; no se reutilizan módulos con estado.

---

## Implementation plan

Cada paso deja la app compilando y navegable; los demás juegos no se rompen nunca.

1. **Prototipo vanilla.** Crear `references/started-games/09-dig-dug/` (o el siguiente número libre) con `index.html` + `game.js`: Dig Dug completo en canvas `800×600` con todas las mecánicas, constantes y tablas de puntos del Data model, controles de flechas/WASD + Espacio/X y generador de rondas con RNG sembrado. Se verifica abriendo `index.html`. Aquí se ajusta el feel (velocidades, alcance de la manguera, tiempos de fantasma) antes de portar.
2. **Migración Supabase** (MCP `apply_migration`): `insert` de la fila `cavador` (`position = MAX + 1`) y de las 12 filas de `scores`. Después, `get_advisors` (RLS limpio). No hace falta `generate_typescript_types`, porque el esquema no cambia. A partir de aquí `cavador` aparece en `/`, `/games`, `/salon` y `/juego/cavador`, y `/jugar/cavador` muestra la maqueta.
3. **Portada.** Añadir `.cover-cavador` (+ pseudo-elementos) en `app/globals.css` con `/frontend-design`, probándola en los tamaños de tarjeta de `/`, `/games` y el detalle.
4. **Módulos compartidos.** Crear en `app/lib/games/cavador/` los ficheros `constants.ts` (TILE, SUB, filas de estrato, velocidades, tiempos, `BONUS_VEG`, tabla de caída), `palette.ts` (`clasico`, en forma de objeto `CavadorPalette`, preparado para que `skin-designer` añada `neon`/`retro`), `terrain.ts` (máscara `Uint8Array` de 80×60, `dig(rect)`, `isTileOpen(col,row)`, `createTerrainLayer()` con repintado incremental) y `draw.ts` (sprites vectoriales parametrizados por paleta). Ninguno guarda estado de módulo, solo constantes y funciones puras o fábricas.
5. **Portar el motor.** Crear `app/lib/games/cavador/engine.ts` con `createCavadorGame: GameFactory`, portado de `09-dig-dug/game.js`:
   - todo el estado va en el closure, el canvas llega por parámetro y se fija a 800×600;
   - `getContext("2d", { alpha: false })`;
   - listeners en `start()` y quitados en `destroy()`;
   - RAF cancelable (`rafId` nullable, `startLoop`/`stopLoop`), `dt` con tope `0.05` y `lastTime` reseteado al (re)arrancar;
   - `syncReactState()` y guard de `onGameOver`;
   - se quita el HUD/overlay propio del prototipo: score, vidas y nivel los muestra el HUD de React. Dentro del canvas solo se mantienen las flores de ronda, los textos flotantes y "RONDA N".
6. **Registrar.** En `app/lib/games/registry.ts`: `import { createCavadorGame } from "./cavador/engine";` y la línea `cavador: createCavadorGame`. Actualizar el comentario de cabecera del registro.
7. **Táctil.** Añadir `TOUCH_MAP.cavador` en `app/lib/games/touch-map.ts` (bloque del Data model) y su línea en el comentario de esquemas.
8. **Referencia.** Añadir la fila de `cavador` a `references/implemented-games.md`.
9. **Verificación manual** (ver Acceptance criteria), en desktop y en emulación móvil.

---

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de tipos de ruta; `npm run lint` pasa.
- [ ] Existe `references/started-games/09-dig-dug/` (o el número que se use) con un Dig Dug vanilla jugable abriendo su `index.html`.
- [ ] Existe la fila `games` con `id = 'cavador'`, `cat = 'ARCADE'`, `color = 'yellow'`, `cover = 'cover-cavador'` y `position` único; RLS sigue activo en `games` y `scores`; `get_advisors` no reporta problemas nuevos.
- [ ] `scores` tiene 12 filas para `game_id = 'cavador'`, decrecientes y con la primera igual a `best = 48650`.
- [ ] CAVADOR aparece en `/`, `/games`, `/salon` y `/juego/cavador` con la portada `.cover-cavador`.
- [ ] `app/lib/games/registry.ts` resuelve `cavador` a `createCavadorGame`; `rocas`, `caida`, `bloque-buster`, `serpentina` y `ranaria` siguen jugables y el resto de ids siguen como maqueta.
- [ ] En `/jugar/cavador` se juega el Dig Dug real en canvas `800×600`: el cavador abre túneles suaves (subceldas de 10 px), solo gira en los centros de tile (con giro en búfer) y la manguera se detiene contra la tierra sin cavar.
- [ ] Bombear infla al bicho en 4 estadios hasta reventarlo; al dejar de bombear se desinfla; mantener Espacio bombea solo.
- [ ] Los dragones avisan `0.6 s` y escupen fuego horizontal de 3 tiles que atraviesa tierra; los enemigos atascados pasan a fantasma, atraviesan tierra y no se les puede bombear.
- [ ] Las rocas se tambalean y caen al socavarlas, aplastan a bichos y al cavador, y dan el bonus escalonado por número de aplastados; tras 2 rocas aparece la verdura.
- [ ] El último bicho huye por la izquierda de la superficie; si escapa, se pasa de ronda sin sus puntos.
- [ ] El HUD de React refleja score (puntos por estrato, ×2 al dragón en horizontal, +10 por tile nuevo), vidas (3, vida extra a 10000 y cada 40000, tope 5) y nivel (sube al limpiar la ronda).
- [ ] Al morir, los enemigos vuelven a su hueco y el terreno se conserva; al perder la última vida se abre el modal con la puntuación real **una sola vez**; "JUGAR DE NUEVO" reinicia limpio (score 0, vidas 3, nivel 1, terreno nuevo).
- [ ] PAUSA/REANUDAR no provoca salto de simulación (ni las rocas ni el fuego avanzan al reanudar) y no deja teclas pegadas.
- [ ] `engine.ts` y los módulos de `app/lib/games/cavador/` no usan estado global de módulo ni `document.getElementById`; al salir, `destroy()` cancela el RAF y quita los listeners; volver a entrar no duplica el loop ni acelera el juego.
- [ ] En emulación `pointer: coarse` se juega completo solo con el overlay: el d-pad mueve mientras se mantiene, el botón ⦿ dispara e infla (y bombea mientras se mantiene).
- [ ] El contexto se abre con `{ alpha: false }` y no hay estelas; con `?debug=perf` (SPEC 16) el juego se mantiene en torno a 16 ms/frame en desktop.
- [ ] `POST /api/scores` con `{ gameId: "cavador", name, score }` válido inserta y la fila aparece en `/salon` y en `/juego/cavador`; con `name` vacío o de más de 10 caracteres, o con `score` inválido, responde `{ ok:false }` 400.
- [ ] No se modifican `CanvasGame.tsx`, `GamePlayer.tsx`, `TouchControls.tsx` ni los otros motores.

---

## Decisions

- **Sí:** spec **completa** (catálogo + leaderboard + motor + táctil) en un solo fichero, porque `cavador` empieza de cero y el usuario pidió una spec por variante. Los pasos del plan están separados para poder commitearlos sueltos (con la migración el juego ya aparece como maqueta).
- **Sí:** reusar los patrones SPEC 05/07/08/09 (`GameFactory` + registro) y SPEC 06 (`games` + `scores` + `.cover-*`). Hay una sola fuente de verdad del ciclo de vida motor↔React.
- **Sí (supuesto documentado):** `cat = ARCADE`, `color = yellow`, como en la entrada del To-Do del 2026-10-21. Dig Dug es un arcade de laberinto y persecución, no SHOOTER (la bomba no es un disparo de proyectil libre, sino una herramienta de captura de corto alcance).
- **Sí (supuesto documentado):** construir primero un prototipo nuevo (`09-dig-dug`), porque no hay ninguno de Dig Dug en `references/started-games/`.
- **Sí (supuesto documentado):** rejilla de 20×15 tiles de 40 px con máscara de 80×60 subceldas de 10 px. Así salen túneles suaves y progresivos como en el arcade sin tener que usar colisión por píxel. Los enemigos se mueven sobre tiles completos para que el BFS sea simple.
- **Sí (supuesto documentado):** tabla de puntos del arcade (200–500 por estrato, ×2 al dragón en horizontal, 1000…15000 por aplastamiento múltiple, verdura 400…5000), más `+10` por tile nuevo cavado. Esto último no está en el original, pero premia abrir laberinto y hace que el score avance desde el primer segundo. `best = 48650` es coherente con unas 12–14 rondas.
- **Sí (supuesto documentado):** vida extra a 10000 y cada 40000 (uno de los ajustes de fábrica habituales del arcade), con tope de 5 para que el HUD de corazones no se desborde.
- **Sí (supuesto documentado):** el fantasma no hace daño y no se le puede bombear. Es la lectura más clara para un jugador nuevo. Lo de "quién mata a quién" queda siempre visible: solo matan los cuerpos sólidos y el fuego.
- **Sí (supuesto documentado):** rondas generadas con un **RNG sembrado por nivel**, en vez de 100 mapas a mano. Son reproducibles (las mismas para todos, lo que hace justo el leaderboard) y salen baratas de producir.
- **Sí:** capa de terreno en un canvas auxiliar con repintado incremental. Repintar 4800 subceldas en cada frame chocaría con el presupuesto de SPEC 16. Es una caché interna del motor, no el "doble canvas de plataforma" que SPEC 16 aplazó.
- **Sí:** bomba en `hold` con auto-bombeo por temporizador propio. Así funciona igual con teclado físico (auto-repeat del SO) que con el `hold` de SPEC 13, que solo manda un `keydown`.
- **Sí:** el motor acepta `skin` pero solo implementa `clasico`, con la paleta ya aislada en `palette.ts`. Los skins se harán más adelante con `skin-designer`.
- **No:** HUD dibujado dentro del canvas con score o vidas (ya los muestra React). Las flores de ronda sí se quedan, porque son parte de la identidad visual del juego.
- **No:** sonido, modo de 2 jugadores, DIP switches, anti-cheat ni auth real: cada uno irá en su propia spec.

---

## Risks

| Riesgo                                                                                                   | Mitigación                                                                                                                                                                  |
| -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No hay prototipo: hay que construirlo y el feel puede salir distinto al del arcade.                     | Ajustar el feel en el prototipo vanilla (paso 1) antes de portar; portar las constantes tal cual; verificar jugando en `/jugar/cavador`.                                      |
| El giro solo en los centros de tile resulta "pegajoso" en táctil.                                        | Giro en búfer y tolerancia de alineación de 4 px con ajuste al carril; probar en emulación `pointer: coarse`.                                                               |
| El BFS de cada enemigo en cada centro de tile cuesta demasiado con 8 enemigos.                           | Rejilla de 20×15 = 300 nodos: el BFS es trivial. Se recalcula solo en los centros de tile, no en cada frame.                                                                 |
| El repintado de la capa de terreno o el `shadowBlur` hunden los fps en móvil.                            | Repintado incremental de subceldas; glow solo en 3 elementos y escalado con `glowScale()`; medir con `?debug=perf`.                                                         |
| El generador de rondas crea un hueco inalcanzable o una roca imposible de socavar.                       | Las restricciones del generador (distancia mínima, ninguna roca encima de un hueco) y el modo fantasma garantizan que todo enemigo acaba alcanzable. Se revisan las rondas 1–10 en el prototipo. |
| La huida del último bicho le quita puntos al jugador sin que lo entienda.                                | Un texto "¡SE ESCAPA!" parpadea en el canvas mientras huye.                                                                                                                 |
| Fugas de RAF o de listeners al montar y desmontar en el App Router.                                      | `destroy()` cancela el RAF y quita los listeners de `window`; el `useEffect` de `CanvasGame` devuelve ese cleanup. Hay un criterio que comprueba la reentrada.               |
| `INSERT` público en `scores` permite spam.                                                               | `check` de rango y longitud (SPEC 06), sin `UPDATE/DELETE`. Se endurecerá con auth + anti-cheat en otra spec.                                                              |

---

## Qué **no** está en esta spec

- Skins `neon`/`retro` de `cavador` y su entrada en `app/lib/games/skins.ts`.
- Sonido y música.
- Modo de 2 jugadores alternos y DIP switches.
- Anti-cheat / verificación de puntuaciones en servidor.
- Auth real y vincular scores a un usuario.
- La variante por turnos `cavador-derrumbe` (va en `02-cavador-derrumbe.md`).
- Cambios a `CanvasGame.tsx`, `GamePlayer.tsx`, `TouchControls.tsx`, a los otros motores o a los contratos de la SPEC 06.

Cada uno de esos, si llega, irá en su propia spec.
