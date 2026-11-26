# SPEC 02 (game-jam/cavador) — "CAVADOR DERRUMBE": variante por turnos sin bomba (solo aplastar con rocas) con catálogo, leaderboard y motor

> **Status:** Draft
> **Depends on:** SPEC 05, SPEC 06, SPEC 13, SPEC 16, 01-cavador-clasico
> **Date:** 2026-11-26
> **Objective:** Dar de alta `cavador-derrumbe` (CAVADOR DERRUMBE, una variante de Dig Dug **por turnos y determinista** en la que la bomba de aire desaparece y la única forma de eliminar bichos es **socavar rocas para aplastarlos**, con presupuesto de excavación y 12 niveles hechos a mano) en el catálogo y el leaderboard de Supabase, y entregarla jugable con `createCavadorDerrumbeGame: GameFactory` registrado en `app/lib/games/registry.ts`, reusando los módulos de render de la spec 01.

---

## Por qué existe esta spec

El game jam sobre el tema **cavador** pide al menos dos **variantes jugables distintas** del mismo juego base. La spec `01-cavador-clasico.md` entrega el Dig Dug fiel: tiempo real, reflejos y bomba de aire. Esta spec entrega una variante que **cambia el verbo central y el ritmo**, no solo el aspecto:

| Eje                  | `cavador` (clásico)                     | `cavador-derrumbe` (esta spec)                                                                  |
| -------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Tiempo               | Tiempo real (RAF, `dt`)                 | **Por turnos**: cada acción tuya = un paso del mundo                                            |
| Arma                 | Bomba de aire (inflar) + rocas          | **Solo rocas**: socavar, empujar en horizontal y encadenar derrumbes                            |
| Excavar              | Gratis e ilimitado                      | **Presupuesto de pico** por nivel: cada tile cavado gasta 1                                     |
| Niveles              | Generados con RNG sembrado, infinitos   | **12 niveles a mano**, cada uno con **solución verificada** guardada junto al mapa              |
| Enemigos             | Persecución en continuo + modo fantasma | Persecución **determinista** por BFS, sin fantasma; el fuego del dragón se avisa un turno antes |
| Error                | Mueres y sigues                         | **Deshacer** (`Z`) con coste en el bonus; **reintentar** nivel (`R`) cuesta una vida            |
| Habilidad que premia | Reflejos y precisión                    | **Planificación** espacial y de tiempos (es un puzzle)                                          |

Así que se juega distinto: en el clásico huyes y bombeas, aquí **lees el tablero, cuentas turnos y preparas trampas por gravedad**. La identidad de Dig Dug se mantiene (cavador, estratos, túneles, globos, dragones, rocas que se tambalean y caen), pero la mecánica pasa a ser la de un puzzle. Por eso entra en otra categoría del catálogo.

**Por qué encaja en Arcade Vault:**

- **Variedad de catálogo.** PUZZLE hoy solo tiene `caida` (Tetris, apilar en tiempo real). Un puzzle de **planificación espacial y física de caída** es un tipo de juego que falta.
- **Un jugador y con puntuación**: aplastamientos con bonus por grupo y por cascada, más un bonus de nivel que premia gastar poco pico y no deshacer. Todo se suma en un `score` para `scores`.
- **Encaja con la arquitectura de motores**: el canvas `800×600` es el mismo que el del clásico. El motor sigue teniendo RAF, pero **solo para animar** las transiciones entre turnos; la lógica es una función pura. Vidas y niveles se corresponden directamente con `onLives`/`onLevel`.
- **Estética neón/CRT**: reutiliza la paleta y los sprites de la spec 01; las rocas en tensión y las casillas de fuego avisado se resaltan en neón cian.

**Estado de partida.** `cavador-derrumbe` no existe en el catálogo, ni en `registry.ts`, ni en `app/globals.css`, ni en el To-Do. Esta spec **depende de `01-cavador-clasico`** porque reutiliza sus módulos compartidos (`app/lib/games/cavador/{constants,palette,terrain,draw}.ts`). **Necesita prototipo nuevo**, que vive junto al del clásico.

---

## Scope

**In:**

- **Prototipo vanilla** de la variante en `references/started-games/09-dig-dug/derrumbe.html` + `derrumbe.js` (en la misma carpeta que el clásico, compartiendo sprites), con un botón de desarrollo "reproducir solución" por nivel.
- **Alta en `games`** de la fila `cavador-derrumbe` (`PUZZLE`/`cyan`) y **siembra de 12 filas en `scores`**.
- **Portada `.cover-cavador-derrumbe`** en `app/globals.css`, diseñada con `/frontend-design`.
- **Lógica pura** en `app/lib/games/cavador-derrumbe/logic.ts`: el reductor `step(state, action) → { state, events }` (determinista, sin DOM y sin aleatoriedad).
- **Niveles** en `app/lib/games/cavador-derrumbe/levels.ts`: 12 mapas de texto `20×15`, cada uno con su presupuesto de pico y su **cadena de solución**, más `verifyLevels()`, que reproduce cada solución con `step`.
- **Motor** en `app/lib/games/cavador-derrumbe/engine.ts` como `createCavadorDerrumbeGame: GameFactory`: entrada con búfer, historial para deshacer, animación entre turnos por RAF y callbacks.
- **Registro** en `app/lib/games/registry.ts`: `"cavador-derrumbe": createCavadorDerrumbeGame`.
- **Esquema táctil** `TOUCH_MAP["cavador-derrumbe"]` en `app/lib/games/touch-map.ts` (SPEC 13).
- **Rendimiento (SPEC 16)**: `{ alpha: false }`, frame completo, `glowScale()`; **fuera de las animaciones el loop no repinta** (ver Render).

**Out of scope (para futuras specs):**

- Editor de niveles, niveles generados por procedimiento o compartidos por la comunidad.
- Guardar el progreso entre sesiones (continuar desde el nivel N), selector de nivel y tabla de récord por nivel.
- Skins `neon`/`retro` (solo `clasico`; sin entrada en `skins.ts`).
- Sonido, anti-cheat, auth real.
- Cambios a `TouchControls.tsx`, `CanvasGame.tsx`, `GamePlayer.tsx`, al motor clásico `cavador` (más allá de importar sus módulos compartidos) o a los contratos de la SPEC 06.

---

## Data model

No se crean tablas nuevas. Se añaden **datos**, **una portada** y **un contrato de motor**.

### Fila en `games`

```sql
insert into public.games (id, title, short, long, cat, cover, color, best, plays, position)
values (
  'cavador-derrumbe',
  'CAVADOR DERRUMBE',
  'Sin bomba de aire: socava las rocas y aplasta a los bichos por turnos.',
  'La variante pensadora del cavador. Cada paso que das, los bichos dan otro. Tu pico tiene un número limitado de golpes y la única arma es la gravedad: socava rocas, empújalas y encadena derrumbes para aplastar a globos y dragones. Doce minas diseñadas a mano; deshacer cuesta bonus y reintentar cuesta una vida.',
  'PUZZLE',
  'cover-cavador-derrumbe',
  'cyan',
  71420,
  '2.7K',
  (select coalesce(max(position), 0) + 1 from public.games)
);
```

Se inserta **después** de `cavador` (spec 01), así que su `position` queda a continuación.

### Siembra de `scores`

12 filas decrecientes. `best = 71420` corresponde a una partida que completa los 12 niveles con buen aprovechamiento: el bonus de nivel suma como máximo `78000` sin penalizaciones y los aplastamientos añaden más.

```sql
insert into public.scores (game_id, name, score) values
  ('cavador-derrumbe', 'PX_KAI',    71420),
  ('cavador-derrumbe', 'NEONFOX',   66980),
  ('cavador-derrumbe', 'VECTORX',   60150),
  ('cavador-derrumbe', 'Z3R0COOL',  53700),
  ('cavador-derrumbe', 'SCANLINE',  47320),
  ('cavador-derrumbe', 'CYBER_LU',  40850),
  ('cavador-derrumbe', 'M00NRYU',   34600),
  ('cavador-derrumbe', 'BIT_LORD',  28150),
  ('cavador-derrumbe', 'RGB_QUEEN', 21900),
  ('cavador-derrumbe', 'JOY_STK',   15400),
  ('cavador-derrumbe', 'ATARI_KID',  9650),
  ('cavador-derrumbe', 'PIXEL_DAD',  4200);
```

### Portada

`.cover-cavador-derrumbe` (base `.cover-bg` + pseudo-elementos, `var(--cyan)`): el mismo corte de estratos que `.cover-cavador`, pero **en pausa táctica**. Una columna de 2–3 rocas apiladas con líneas de tensión cian, un globo justo debajo y una rejilla tenue de tiles que sugiere "por turnos". El cavador en un lateral, sin manguera. _El diseño real se hace con `/frontend-design`, coherente con `.cover-cavador` pero distinguible a tamaño de tarjeta._

### Contrato de motor

```ts
// app/lib/games/cavador-derrumbe/engine.ts → cumple GameFactory
export const createCavadorDerrumbeGame: GameFactory = (canvas, callbacks, skin = "clasico"): GameEngine => {
  /* closure: levelIndex, state (DerrumbeState), history: DerrumbeState[],
     pendingAction, anim (tween entre turnos), score, lives, undos,
     rafId, lastTime, flags de juego terminado */
};

// app/lib/games/cavador-derrumbe/logic.ts — puro, sin DOM
export type Action = "U" | "D" | "L" | "R" | "WAIT";
export function step(s: DerrumbeState, a: Action): { state: DerrumbeState; events: StepEvent[] };
// StepEvent: dig | push | blocked | rockWobble | rockFall{from,to,crushed[],cascade} | enemyMove | fireWarn | fire | playerDied{cause} | levelClear
```

### Formato de nivel (`levels.ts`)

20 columnas × 15 filas de texto, con la misma rejilla de 40 px y los mismos estratos que el clásico:

| Carácter  | Significado                                                         |
| --------- | ------------------------------------------------------------------- |
| `~`       | Cielo (fila 0, no se puede pisar)                                   |
| `.`       | Túnel abierto (la fila 1 = superficie, siempre abierta)             |
| `#`       | Tierra (se cava gastando 1 de presupuesto)                          |
| `X`       | Roca madre: no se puede cavar, sostiene rocas y es pared para todos |
| `O`       | Roca suelta (cae, se empuja en horizontal)                          |
| `P`       | Inicio del cavador (sobre túnel)                                    |
| `g`       | Globo (sobre túnel)                                                 |
| `d` / `b` | Dragón mirando a la derecha / izquierda (sobre túnel)               |

```ts
export interface LevelDef {
  name: string;      // "TUTORIAL", "PRIMER DERRUMBE", ...
  map: string[];     // 15 filas de 20 caracteres
  dig: number;       // presupuesto de pico
  solution: string;  // acciones: U D L R y "." = esperar
}
```

**Nivel 1 (tutorial), ejemplo de referencia**, con la solución comprobada a mano siguiendo las reglas de esta spec:

```ts
{
  name: "PRIMER DERRUMBE",
  dig: 8,
  solution: "DDD.RRL",
  map: [
    "~~~~~~~~~~~~~~~~~~~~",
    "..........P.........",
    "####################",
    "############O#######",
    "####################",
    "########........g###",
    "####################", // filas 6–13 iguales
    /* … */
    "XXXXXXXXXXXXXXXXXXXX",
  ],
}
```

Traza (coordenadas `(fila,col)`): `DDD` cava hasta (4,10) y conecta con el túnel de la fila 5, así que el globo empieza a perseguir. `.` espera un turno para sincronizar. `RR` cava (4,11) y (4,12): la roca de (3,12) queda sin apoyo y se tambalea, mientras el globo llega a (5,12). `L` aparta al cavador: la roca cae por (4,12) hasta (5,12), aplasta al globo y el nivel queda limpio. Gasto de pico: 5 de 8.

La progresión de los 12 niveles se diseña en el prototipo. Es orientativa:

- 1–3: socavar una sola roca y sincronizar con esperas;
- 4–5: empujar rocas en horizontal;
- 6–7: dragones y su fuego avisado;
- 8–9: cascadas de rocas apiladas;
- 10–12: combinación de todo con poco presupuesto y `X` como pared.

### Reglas del turno (`step`)

Cada acción ejecuta, **en este orden**:

1. **Jugador.**
   - `U/D/L/R` hacia un túnel: se mueve.
   - Hacia tierra: si `dig > 0`, **cava** (`dig − 1`) y se mueve; si `dig = 0`, la acción **se rechaza** (no consume turno; evento `blocked`).
   - Hacia `X`, cielo o fuera del tablero: se rechaza.
   - Hacia una roca **en horizontal**: si el tile de detrás es túnel vacío (sin roca ni enemigo) y la roca no se está tambaleando, la **empuja** un tile y ocupa su sitio. Si no, se rechaza.
   - Hacia una roca **en vertical**: se rechaza.
   - `WAIT`: el jugador no hace nada.
   - Moverse a un tile con enemigo: **muere** (causa `enemy`).
2. **Rocas.** Se recorren **de abajo arriba**:
   - una roca que ya **se tambaleaba** desde el turno anterior **cae** hasta el primer tile sólido (`#`, `X`, `O` o el fondo) y aplasta a todo enemigo de su trayectoria **y al jugador** (causa `rock`);
   - después, toda roca cuyo tile de debajo **no sea sólido** (túnel, aunque esté el jugador o un enemigo) pasa a **tambalearse**.

   Resultado: el jugador siempre tiene **exactamente un turno** de aviso para apartarse.
   - **Cascada**: si una roca empieza a tambalearse porque la roca sobre la que descansaba acaba de caer, hereda el contador `cascade + 1`.
3. **Enemigos.**
   - **Globo**: se mueve 1 tile **cada turno** por el BFS más corto sobre túneles (sin pasar por rocas ni por `X`) hasta el jugador. Desempate fijo `U, L, D, R`. Si no hay camino, se queda quieto.
   - **Dragón**: se mueve **solo en turnos pares** (`turn % 2 === 0`) con la misma regla. Antes de moverse comprueba si el jugador está en su fila, en la dirección en la que mira, a 3 tiles o menos, con la línea **sin tierra ni roca** entre ambos. Si es así, en vez de moverse **avisa** (`fireWarn`: las casillas afectadas se marcan). En el turno siguiente **escupe fuego** sobre esas casillas (`fire`): si el jugador sigue en alguna, muere (causa `fire`). Recarga: 3 turnos. Al moverse en horizontal actualiza la dirección en la que mira.
   - Un enemigo que entra en el tile del jugador, o que **se cruza** con él (intercambio de casillas), lo mata (causa `enemy`).
4. **Comprobación final.** Si el jugador ha muerto, se emite `playerDied` (la muerte **manda** sobre limpiar el nivel en el mismo turno). Si no queda ningún enemigo vivo, `levelClear`. `turn++`.

### Puntuación (`onScore`)

| Evento                                 | Puntos                                                              |
| -------------------------------------- | ------------------------------------------------------------------- |
| Caída de roca que aplasta `k` enemigos | `k = 1 → 500`, `2 → 1500`, `3 → 3000`, `≥4 → 5000`                  |
| Multiplicador de cascada               | La n-ésima roca de una cascada multiplica su valor por `min(n, 4)`  |
| Bonus al completar el nivel            | `max(0, 1000 × nivel + 50 × picoRestante − 200 × deshacer)`         |

Deshacer **no tiene coste directo en el score**: su única penalización es la reducción del bonus de nivel. Pero el score del nivel en curso forma parte del estado guardado en el historial, así que deshacer un turno que había dado puntos **revierte esos puntos**. Por eso `onScore` puede emitir un valor menor que el anterior, aunque nunca por debajo del score con el que empezó el nivel. El score de niveles ya completados no se toca nunca.

### Mapeo de mecánicas → callbacks

- `onScore(score)`: score total (score acumulado de los niveles completados + score del nivel en curso). Solo se emite cuando cambia.
- `onLives(lives)`: arranca en `3`. **Morir** (roca, enemigo o fuego) o **reintentar** el nivel (`R`, o mantener pulsado deshacer en táctil) resta 1 y **reinicia el nivel en curso** desde su mapa (se vacía el historial y se recupera el score con el que empezó el nivel). **+1 vida** cada 4 niveles completados (tope 5). `onLives(0)` en la última.
- `onLevel(level)`: el índice de nivel `1..12`.
- `onGameOver(finalScore)`: **una vez**. Ocurre en dos casos: al perder la última vida (derrota) o **al completar el nivel 12** (victoria tratada como fin de partida, mismo criterio que `bloque-buster` en la SPEC 08).

### Estados del motor

`levelIntro` (1,2 s con el nombre del nivel; la entrada se ignora) → `idle` (espera una acción) → `animating` (tween de `TURN_ANIM = 140 ms`; las caídas de roca usan `60 ms` por tile) → `idle` | `dying` (1 s) | `levelClear` (1,2 s, cuenta del bonus) | `over`. Ciclo de vida:

- `start()`: carga el nivel 1, emite `onScore(0)`/`onLives(3)`/`onLevel(1)`, añade los listeners y arranca el RAF.
- `pause()`: cancela el RAF, vacía la acción en búfer y las teclas mantenidas. Como la lógica es por turnos, **no puede haber salto de simulación** al pausar.
- `resume()`: `lastTime = null` y se reanuda la animación en curso donde se quedó.
- `restart()`: score 0, vidas 3, nivel 1, historial vacío, se anula el guard de `onGameOver` y se rearranca.
- `destroy()`: cancela el RAF y quita los listeners `keydown`/`keyup`/`blur` de `window`.

### Controles

- **Teclado** (se lee `e.code`; `preventDefault` solo en estas teclas):
  - `Arrow*`/`WASD`: mover un tile (un turno).
  - `Space`: esperar un turno.
  - `KeyZ`/`Backspace`: deshacer el último turno (sin límite de profundidad dentro del nivel; cada uso cuenta para la penalización del bonus).
  - `KeyR`: reintentar el nivel (cuesta una vida; pide confirmación pulsando `R` dos veces en menos de 1 s, y entre una y otra el canvas muestra "R OTRA VEZ PARA REINTENTAR").
  - Con el auto-repeat del teclado (`e.repeat`) se puede repetir un movimiento, pero el motor **solo acepta una acción por turno**, con **una acción en búfer** durante la animación (las demás se descartan). Así no se ejecutan turnos "en ráfaga" sin querer.
- **Táctil (SPEC 13)**: entrada nueva en `TOUCH_MAP`, sin tocar `TouchControls.tsx`:

  ```ts
  "cavador-derrumbe": {
    buttons: [
      { label: "◄", code: "ArrowLeft",  key: "ArrowLeft",  hold: false, slot: "dpad-left"  },
      { label: "►", code: "ArrowRight", key: "ArrowRight", hold: false, slot: "dpad-right" },
      { label: "▲", code: "ArrowUp",    key: "ArrowUp",    hold: false, slot: "dpad-up"    },
      { label: "▼", code: "ArrowDown",  key: "ArrowDown",  hold: false, slot: "dpad-down"  },
      { label: "⧗", code: "Space",      key: " ",          hold: false, slot: "action-a"   },
      { label: "↶", code: "KeyZ",       key: "z",          hold: true,  slot: "action-b"   },
    ],
  },
  ```

  El d-pad y "esperar" van en `tap` (un toque = un turno). "Deshacer" va en `hold` para que **un solo botón** sirva para dos acciones sin cambiar `TouchControls`: el motor mide cuánto tiempo pasa entre `keydown` y `keyup` de `KeyZ`. Si es **menos de 600 ms**, deshace al soltar. Si es **600 ms o más**, reintenta el nivel: se dibuja un anillo de progreso sobre el cavador mientras se mantiene, y no hace falta la doble confirmación de teclado. En teclado físico, `KeyZ` mantenido se comporta igual (el auto-repeat no cuenta como nueva pulsación porque `e.repeat` se ignora para `KeyZ`).

### Render en canvas

- Reutiliza `palette.ts` (`clasico`), `draw.ts` (cavador, globo, dragón, roca) y `terrain.ts` de la spec 01. Al cavar se limpian las **16 subceldas** del tile entero (no hay túnel parcial porque el movimiento es por tiles). La roca madre `X` se dibuja con el color de piedra oscura de la paleta y un contorno cian.
- **Fila 0 (cielo)** como panel dentro del canvas con la información que el HUD de React no tiene: `PICO: n` (con un icono de pico), `DESHACER: n`, `TURNO: n` y el nombre del nivel. Score, vidas y nivel los sigue mostrando el HUD de React.
- **Avisos legibles**: rocas que se tambalean (temblor de ±2 px y contorno cian parpadeante), casillas de fuego avisado (relleno rojo translúcido con trama) y una "sombra" punteada de la trayectoria de caída de cada roca en tensión, que facilita planificar.
- Animación entre turnos: interpolación lineal de las posiciones del estado anterior al nuevo en `TURN_ANIM`, con las caídas de roca encadenadas por tile; los textos flotantes de puntos se mantienen `0.8 s`.
- **Repintado bajo demanda**: el RAF se mantiene vivo (para avisos parpadeantes e intros), pero si el estado es `idle` y no hay ningún elemento animado visible, el frame se salta (`needsRedraw = false`). Glow (`shadowBlur × glowScale()`) solo en el cavador y los avisos.

### Integración con el leaderboard

Igual que en la SPEC 06: `onGameOver` → modal de `GamePlayer.tsx` → `POST /api/scores { gameId: "cavador-derrumbe", name, score }`. `/juego/cavador-derrumbe` y `/salon` leen con `getTopScores("cavador-derrumbe", n)`.

### Casos límite

- **Pico a 0 sin haber terminado**: no se puede cavar, pero sí andar por túneles, esperar, empujar y deshacer. Si el nivel ya no tiene solución, el jugador deshace o reintenta. No se detecta automáticamente el bloqueo (ver Decisions).
- **Esperar debajo de una roca que se tambalea**: muerte por roca en el turno siguiente.
- **Empujar una roca a un tile sin apoyo**: la roca empieza a tambalearse en la misma fase de rocas y cae en el turno siguiente.
- **Rocas apiladas**: la de arriba está apoyada en la de abajo (que es sólida), así que no se tambalea. Cuando cae la de abajo, el recorrido de abajo arriba ya ve a la de arriba sin apoyo en esa misma fase, así que pasa a tambalearse y cae en el turno siguiente con `cascade + 1`.
- **Enemigo sin camino al jugador**: se queda quieto. No hay modo fantasma, para que el puzzle sea determinista y siempre se pueda leer.
- **Enemigo y jugador se cruzan** (intercambio de casillas en el mismo turno): cuenta como contacto, así que el jugador muere.
- **Deshacer tras morir**: no se puede, porque la muerte reinicia el nivel y vacía el historial. Para hacer la variante perdonable está el aviso de un turno de las rocas y el fuego.
- **Deshacer en el turno 0**: no hace nada y no penaliza.
- **Completar el nivel 12**: se suma el bonus, `levelClear` y después `onGameOver(score)` una sola vez.
- **Acción rechazada** (pared, `X`, pico agotado): no consume turno, no cuenta como deshacer y hace un pequeño "rebote" visual del cavador.
- **Doble pulsación de `R` separada por más de 1 s**: se cancela la confirmación.
- **Reentrada en `/jugar/cavador-derrumbe`**: estado nuevo en cada montaje; `levels.ts` solo exporta constantes de solo lectura (`as const`) y `step` nunca muta su entrada (devuelve un estado nuevo), así que no puede haber estado compartido entre instancias.

---

## Implementation plan

Cada paso deja la app compilando y navegable. **Requisito previo**: los pasos 4 (módulos compartidos) y 2 (migración) de `01-cavador-clasico` tienen que estar implementados. El paso 4 es necesario para importar `app/lib/games/cavador/*` y el paso 2 para que la `position` quede a continuación de `cavador`.

1. **Prototipo vanilla.** Crear `references/started-games/09-dig-dug/derrumbe.html` + `derrumbe.js`: reductor `step` puro, 12 niveles con su `solution`, render por tiles, deshacer y reintentar, y un botón de desarrollo "▶ solución" que reproduce la cadena de solución del nivel actual. Se diseñan y ajustan los 12 niveles hasta que **todas** las soluciones limpian su nivel.
2. **Migración Supabase** (`apply_migration`): `insert` de la fila `cavador-derrumbe` (`position = MAX + 1`) y de las 12 filas de `scores`. Después, `get_advisors`. Sin regenerar tipos. El juego aparece como maqueta.
3. **Portada.** `.cover-cavador-derrumbe` en `app/globals.css` con `/frontend-design`.
4. **Lógica pura.** Crear `app/lib/games/cavador-derrumbe/logic.ts` (tipos `DerrumbeState`, `Action`, `StepEvent`; `parseLevel(def) → DerrumbeState`; `step`; el BFS) y `levels.ts` (12 `LevelDef` portados del prototipo + `verifyLevels(): string[]`, que devuelve los nombres de los niveles cuya solución no limpia el nivel). Sin DOM ni `Math.random`.
5. **Motor.** Crear `app/lib/games/cavador-derrumbe/engine.ts` con `createCavadorDerrumbeGame: GameFactory`:
   - estado en el closure, `{ alpha: false }`, canvas `800×600`;
   - historial `DerrumbeState[]` para deshacer;
   - búfer de una acción, tween entre turnos y repintado bajo demanda;
   - lógica de `KeyZ` corto/largo y doble `R`;
   - `syncReactState()` y guard de `onGameOver`;
   - en desarrollo (`process.env.NODE_ENV !== "production"`), llamar a `verifyLevels()` una vez al crear la fábrica y hacer `console.error` con los niveles que fallen.

   Importa la paleta, los sprites y el terreno de `app/lib/games/cavador/`.
6. **Registrar.** `import { createCavadorDerrumbeGame } from "./cavador-derrumbe/engine";` + `"cavador-derrumbe": createCavadorDerrumbeGame` en `app/lib/games/registry.ts`.
7. **Táctil.** `TOUCH_MAP["cavador-derrumbe"]` en `app/lib/games/touch-map.ts` (bloque del Data model) y su línea en el comentario de esquemas.
8. **Referencia.** Fila de `cavador-derrumbe` en `references/implemented-games.md`.
9. **Verificación manual** (ver Acceptance criteria), en desktop y en emulación móvil.

---

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de tipos de ruta; `npm run lint` pasa.
- [ ] Existe `references/started-games/09-dig-dug/derrumbe.html`, jugable, y su botón "▶ solución" limpia **cada uno** de los 12 niveles.
- [ ] Existe la fila `games` con `id = 'cavador-derrumbe'`, `cat = 'PUZZLE'`, `color = 'cyan'`, `cover = 'cover-cavador-derrumbe'` y `position` único; RLS sigue activo; `get_advisors` sin problemas nuevos.
- [ ] `scores` tiene 12 filas para `game_id = 'cavador-derrumbe'`, decrecientes, y la primera es igual a `best = 71420`.
- [ ] CAVADOR DERRUMBE aparece en `/`, `/games` (filtro PUZZLE incluido), `/salon` y `/juego/cavador-derrumbe` con su portada, que se distingue de `.cover-cavador`.
- [ ] `registry.ts` resuelve `cavador-derrumbe` a `createCavadorDerrumbeGame`; `cavador` y los demás motores siguen jugables.
- [ ] `logic.ts` no importa nada del DOM ni usa `Math.random`; `step` no muta su argumento; en desarrollo `verifyLevels()` devuelve `[]` (sin `console.error` al abrir el juego).
- [ ] En `/jugar/cavador-derrumbe` cada tecla de dirección o `Espacio` hace **exactamente un turno**; no existe la bomba de aire; cavar gasta pico, y con pico 0 no se puede cavar pero sí andar por túneles.
- [ ] Las rocas sin apoyo se tambalean un turno (temblor + sombra de trayectoria) y caen en el siguiente, aplastando enemigos y al cavador; las rocas se empujan en horizontal hacia un túnel vacío; las cascadas multiplican los puntos.
- [ ] Los globos se mueven cada turno y los dragones cada dos turnos; el fuego del dragón se avisa un turno antes con las casillas marcadas.
- [ ] `Z` deshace el turno (también varios seguidos) y revierte los puntos de ese turno sin bajar del score de inicio del nivel; el contador de deshacer sube y reduce el bonus de nivel; `R` dos veces reintenta el nivel restando una vida.
- [ ] El HUD de React refleja score, vidas (3, +1 cada 4 niveles, tope 5) y nivel (1..12); la fila 0 del canvas muestra pico, deshacer, turno y nombre del nivel.
- [ ] Al perder la última vida **o** al completar el nivel 12 se abre el modal con la puntuación real **una sola vez**; "JUGAR DE NUEVO" reinicia limpio en el nivel 1.
- [ ] En emulación `pointer: coarse` se completa el nivel 1 solo con el overlay: el d-pad y ⧗ hacen un turno por toque, ↶ corto deshace y ↶ mantenido ≥ 600 ms reintenta (con anillo de progreso).
- [ ] PAUSA/REANUDAR retoma la animación en curso sin perder ni duplicar turnos; tras pausar no quedan teclas mantenidas.
- [ ] `{ alpha: false }` sin estelas; en `idle` el motor no repinta (comprobable con `?debug=perf` de SPEC 16: el frame-time cae casi a cero en reposo).
- [ ] `destroy()` cancela el RAF y quita los listeners; volver a entrar no duplica el loop.
- [ ] `POST /api/scores` con `{ gameId: "cavador-derrumbe", name, score }` válido inserta y aparece en `/salon` y en el detalle; con datos inválidos responde `{ ok:false }` 400.
- [ ] No se modifican `CanvasGame.tsx`, `GamePlayer.tsx`, `TouchControls.tsx`, el `engine.ts` de `cavador` ni los demás motores.

---

## Decisions

- **Sí:** el cambio de mecánica es **por turnos + sin bomba + presupuesto de pico + niveles a mano**. Se descartan variantes cosméticas (otra paleta, otros sprites) y variantes de solo dificultad ("modo turbo"), porque el usuario pidió un cambio real de mecánica. Cambia la habilidad que se premia: de reflejos a planificación.
- **Sí (supuesto documentado):** `cat = PUZZLE`, `color = cyan`. Con turnos deterministas y niveles con solución, es un puzzle en el sentido del catálogo (mismo grupo que `caida`). Cyan lo distingue de `caida` (PUZZLE/magenta) y de `cavador` (yellow), así la pareja de variantes se diferencia a simple vista en `/games`. (`apagon`, pendiente en el To-Do, también propone PUZZLE/cyan; si llegara a implementarse, su color se revisaría en su propia spec.)
- **Sí (supuesto documentado):** slug `cavador-derrumbe` y título `CAVADOR DERRUMBE`, con el prefijo del juego base para que el catálogo los agrupe. Es kebab-case, ASCII y sin colisiones.
- **Sí:** separar la lógica en un **reductor puro** (`step`). Permite deshacer con un simple historial de estados, garantiza el determinismo y hace que la **solución de cada nivel sea verificable** (`verifyLevels`). Sin test runner en el repo, esta es la forma barata de asegurar que ningún nivel es imposible.
- **Sí:** **12 niveles finitos** con victoria → `onGameOver` (como `bloque-buster`). Se descartan los niveles procedurales porque garantizar que tienen solución es un problema abierto (riesgo alto para un jam).
- **Sí (supuesto documentado):** un turno de aviso **siempre** antes de cualquier peligro (roca que se tambalea, fuego avisado). Es la regla que hace justo el puzzle; sin ella las muertes parecen arbitrarias.
- **Sí (supuesto documentado):** sin modo fantasma. Los fantasmas atraviesan tierra y romperían la lectura del tablero. El dragón se mueve cada dos turnos para que los dos tipos de enemigo tengan un ritmo distinto y se puedan aprovechar.
- **Sí (supuesto documentado):** deshacer **sin límite** pero con penalización en el bonus (−200), y reintentar con coste de vida. Así nunca te quedas atascado sin salida, y el leaderboard premia resolverlo limpio. Deshacer revierte los puntos del turno deshecho para que no se puedan "farmear" aplastamientos.
- **Sí:** "deshacer corto / reintentar largo" en un único botón `hold` del overlay, porque `TouchAction` tiene 6 slots y SPEC 13 prohíbe tocar `TouchControls.tsx`. Con esto no hace falta otro slot ni otro componente.
- **Sí:** repintado bajo demanda en `idle`. Un juego por turnos no necesita 60 fps en reposo; ahorra batería en móvil, que es el foco de SPEC 16.
- **Sí:** reutilizar `app/lib/games/cavador/{palette,draw,terrain,constants}.ts` de la spec 01, en vez de duplicarlos. La variante se ve como de la misma familia y el mantenimiento queda en un solo sitio.
- **No:** detectar automáticamente cuándo un nivel ha quedado sin solución. Es caro (búsqueda en el espacio de estados) y deshacer/reintentar ya cubren el caso.
- **No:** guardar el progreso entre sesiones ni selector de nivel: con eso se podría saltar niveles y falsear el leaderboard. Irá en otra spec si se pide.
- **No:** sonido, skins `neon`/`retro`, anti-cheat ni auth real.

---

## Risks

| Riesgo                                                                                | Mitigación                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Un nivel sale imposible o tiene una solución trivial no prevista.                     | Cada `LevelDef` lleva su `solution`; `verifyLevels()` la reproduce en desarrollo y el prototipo la reproduce con un botón. Los atajos triviales se revisan jugando cada nivel en el prototipo. |
| Diferencias entre el prototipo JS y el port a TS rompen las soluciones.               | `step` se porta 1:1 y `verifyLevels()` se ejecuta en la app en desarrollo; cualquier divergencia sale como `console.error` al abrir el juego.                                                  |
| El orden de resolución del turno (jugador → rocas → enemigos) confunde al jugador.    | Avisos visibles (temblor, sombra de caída, casillas de fuego) y un nivel 1 tutorial que enseña la sincronización con una espera.                                                              |
| El historial de deshacer crece sin límite en memoria.                                 | Los estados son pequeños (20×15 + entidades); se acota a 500 entradas por nivel (las más antiguas se descartan) y el historial se vacía al cambiar de nivel.                                  |
| El `hold` de ↶ en táctil dispara un reintento sin querer.                             | Umbral de 600 ms con anillo de progreso visible; soltar antes cancela y solo deshace.                                                                                                         |
| La dependencia de los módulos de la spec 01 bloquea esta spec si la 01 no se aprueba. | El requisito previo está explícito en el plan; si solo se aprueba esta, los pasos 4 y 2 de la 01 (módulos compartidos y migración) se incorporan como paso 0 de esta.                          |
| `INSERT` público en `scores` permite spam.                                            | `check` de la SPEC 06, sin `UPDATE/DELETE`; se endurecerá con auth + anti-cheat en otra spec.                                                                                                 |

---

## Qué **no** está en esta spec

- Editor de niveles, niveles procedurales o de comunidad.
- Guardar el progreso, selector de nivel y récord por nivel.
- Skins `neon`/`retro` y su entrada en `skins.ts`.
- Sonido y música.
- Anti-cheat / verificación de puntuaciones en servidor; auth real.
- Cambios al motor clásico `cavador` (más allá de reutilizar sus módulos compartidos), a `CanvasGame.tsx`, `GamePlayer.tsx`, `TouchControls.tsx` o a los contratos de la SPEC 06.

Cada uno de esos, si llega, irá en su propia spec.
