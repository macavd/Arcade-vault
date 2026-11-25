# SPEC 03 (game-jam/gemas) — Motor "GEMAS BOMBA": Match-3 con bombas de cuenta atrás y gema nova

> **Status:** Draft
> **Depends on:** SPEC 05, SPEC 16, 01-catalogo-leaderboard-gemas, 02-motor-gemas-clasico
> **Date:** 2026-11-25
> **Objective:** Ampliar el núcleo Match-3 de `app/lib/games/gemas/` con reglas de bombas de cuenta atrás, vidas, gema nova explosiva y barajado, y exponerlas como `createGemasBombaGame: GameFactory` registrada en el slug `gemas-bomba`, de modo que GEMAS BOMBA se juegue como variante con twist de GEMAS.

---

## Por qué existe esta spec

La spec `02-motor-gemas-clasico` deja jugable `gemas`: un Bejeweled sin reloj ni vidas que termina cuando el tablero se queda sin movimientos. Ese modo premia la paciencia pero no tiene **presión**: el jugador puede pensar cada jugada todo lo que quiera. La spec `01-catalogo-leaderboard-gemas` dio de alta una segunda ficha, `gemas-bomba` (GEMAS BOMBA, `cat = PUZZLE`, `color = yellow`, `cover = cover-gemas-bomba`, `best = 48620`), con su propio leaderboard. Esta spec le da su motor.

El twist toma dos ideas de la familia Bejeweled y las combina en un objetivo claro:

- **Gemas bomba** (como las de Bejeweled Twist): entre las gemas que caen aparecen bombas con un **contador** que baja con cada movimiento válido del jugador. Si un contador llega a cero, la bomba estalla y **se pierde una vida**. Para desactivarla hay que borrarla: alinearla con gemas de su color o alcanzarla con una explosión.
- **Gema nova** (como las power gems de Bejeweled 2): alinear 4 o más, o formar una L/T, crea una gema nova del mismo color que, cuando a su vez se borra, **explota en 3×3**. Es la herramienta del jugador para llegar a bombas mal colocadas.

Con 3 vidas, el final ya no lo decide el bloqueo del tablero sino el jugador dejando estallar bombas; por eso, cuando no quedan movimientos, en esta variante el tablero **se baraja** en lugar de acabar la partida. Así la variante no duplica al clásico: cambian el objetivo (desactivar), la condición de derrota (vidas), la política de bloqueo (barajar) y aparece la decisión táctica de "puntuar ahora o reservar la nova para la bomba".

Todo lo demás —tablero 8×8, intercambio, detección de líneas, gravedad, cascadas, render, input, ciclo de vida y rendimiento— se hereda del núcleo `createMatch3Engine` de la spec 02, que ya nació parametrizado por `Match3Rules`.

---

## Scope

**In:**

- **Prototipo:** añadir `MODE = "bomba"` a `references/started-games/09-match3/game.js` con las reglas de esta spec, verificable desde el mismo `index.html`.
- **Reglas puras de especiales** en `app/lib/games/gemas/specials.ts` (sin DOM): componentes de líneas, creación de novas, expansión de explosiones en cadena, tic y detonación de bombas, generación de bombas, barajado.
- **Ampliación del núcleo** `app/lib/games/gemas/core.ts`: `Match3Rules` gana `novaGems` y `bombs`; nuevas fases `DETONATING` y `SHUFFLING`; el tipo `GemKind` de `board.ts` pasa a `"normal" | "nova" | "bomba"`. `CLASSIC_RULES` las desactiva, de modo que `gemas` se comporta exactamente igual que en la spec 02.
- **Render** de bombas (contador legible, aviso cuando quedan ≤ 3), novas (halo) y detonaciones (destello + sacudida), en `render.ts`.
- **Fábrica** `createGemasBombaGame: GameFactory` en `app/lib/games/gemas/engine-bomba.ts` con `BOMBA_RULES`, y registro `"gemas-bomba": createGemasBombaGame`.
- **Vidas reales** en el HUD (`onLives(3 → 0)`).

**Out of scope (para futuras specs):**

- Alta en `games`, siembra de `scores` y portada `.cover-gemas-bomba`: van en `01-catalogo-leaderboard-gemas`.
- Cualquier cambio de comportamiento del modo clásico `gemas`.
- Hipercubo / gema de 5 (borrar todas las de un color), gemas estrella de cruz, modo contrarreloj, recuperar vidas.
- Skins de `gemas-bomba`, sonido, entrada en `TOUCH_MAP`, anti-cheat, auth real.
- Tocar `CanvasGame.tsx`, `GamePlayer.tsx`, `TouchControls.tsx`, otros motores, la API de scores o el esquema.

---

## Data model

Esta spec **no toca Supabase**: `gemas-bomba` y sus `scores` los crea `01-catalogo-leaderboard-gemas`. Introduce la fábrica, la ampliación de reglas y el modelo de gemas especiales.

```ts
// app/lib/games/gemas/engine-bomba.ts → cumple GameFactory
export const createGemasBombaGame: GameFactory = (canvas, callbacks) =>
  createMatch3Engine(canvas, callbacks, BOMBA_RULES);

// app/lib/games/gemas/board.ts (ampliado)
export type GemKind = "normal" | "nova" | "bomba";
export interface Gem {
  id: number;
  type: number;
  kind: GemKind;
  counter?: number; // solo kind === "bomba": movimientos restantes
  bornMove?: number; // nº de movimiento en que apareció (las recién nacidas no hacen tic)
}

// app/lib/games/gemas/core.ts (ampliado)
export interface BombRules {
  spawnEvery: (level: number) => number; // movimientos válidos entre bombas
  startCounter: (level: number) => number; // contador inicial
  maxOnBoard: number;
  defuseBonus: (counter: number) => number;
}
export interface Match3Rules {
  lives: number | null;
  onNoMoves: "gameover" | "shuffle";
  novaGems: boolean;
  bombs: BombRules | null;
}
export const CLASSIC_RULES: Match3Rules = {
  lives: null,
  onNoMoves: "gameover",
  novaGems: false,
  bombs: null,
};
export const BOMBA_RULES: Match3Rules = {
  lives: 3,
  onNoMoves: "shuffle",
  novaGems: true,
  bombs: {
    spawnEvery: (L) => Math.max(3, 7 - Math.floor(L / 2)),
    startCounter: (L) => Math.max(5, 13 - L),
    maxOnBoard: 3,
    defuseBonus: (c) => 100 + 25 * c,
  },
};
```

### Reglas de la variante

**Bombas.**

- El motor cuenta los **movimientos válidos** del jugador (`moveIndex`; los intercambios inválidos no cuentan). Cuando han pasado `spawnEvery(level)` movimientos desde la última bomba y hay menos de `maxOnBoard` bombas en el tablero, la **primera reposición** de ese movimiento convierte una de sus gemas nuevas (elegida al azar) en bomba, con `counter = startCounter(level)` y `bornMove = moveIndex`. Las bombas solo nacen entre las gemas que entran por arriba: nunca aparecen de golpe a mitad del tablero. Si el tope está lleno, la aparición se aplaza al siguiente movimiento.
- Con los valores elegidos: nivel 1 → una bomba cada 7 movimientos con contador 12; nivel 4 → cada 5 con contador 9; nivel 8+ → cada 3 con contador 5.
- Una bomba es una gema de su color a todos los efectos: se intercambia y forma líneas como cualquier otra.
- **Tic:** cuando un movimiento válido llega a `SETTLED` (todas sus cascadas resueltas), cada bomba con `bornMove < moveIndex` resta `1` a su contador. El tic ocurre **una vez por movimiento** del jugador, nunca por cascada ni por barajado.
- **Desactivar:** una bomba que entra en la máscara de borrado (por línea o por explosión de nova) se desactiva y suma `defuseBonus(counter)` = `100 + 25 × contador restante` (no se multiplica por la cadena: premia desactivar pronto, no combos).
- **Detonar:** si tras el tic alguna bomba queda en `0`, se pasa a la fase `DETONATING` (`DETONATE_MS = 500`, destello + sacudida): todas las bombas a cero estallan a la vez, **cada una resta una vida** (`lives` nunca baja de `0`), y desaparecen solo sus celdas (no dañan vecinas). Después hay gravedad, reposición y, si se forman líneas, una cascada que **puntúa normalmente** empezando en cadena `1`, sin volver a hacer tic.

**Gema nova.**

- En cada paso de borrado (del intercambio o de una cascada), las líneas se agrupan en **componentes** (líneas que comparten celda). Cada componente con una línea de 4+ **o** con una intersección h×v (L, T, +) crea **una** nova del tipo del componente; un componente con ambas cosas sigue creando una sola.
- **Dónde nace:** en la celda del componente que el jugador acaba de mover (solo en el paso de cadena `1`); si no hay, en la celda central de la línea más larga del componente. Esa celda **sale de la máscara**: la gema se transforma en nova en su sitio en lugar de borrarse. Si en esa celda había una bomba, la bomba se desactiva (con su bonus) y la nova la sustituye.
- **Explosión:** cuando una nova existente entra en la máscara (por línea o por estar dentro de otra explosión), añade su vecindario 3×3 a la máscara. Las explosiones se expanden en cadena con una cola BFS y un conjunto de visitadas: **cada nova detona una sola vez** por paso. Las novas recién creadas en ese paso están protegidas y no detonan hasta un paso posterior.
- **Puntos de explosión:** cada gema borrada **solo** por explosión (no por línea) suma `20 × cadena`. Las celdas en línea y en explosión a la vez cuentan una vez, como línea.

**Barajado.**

- Con `onNoMoves: "shuffle"`, un tablero estable sin movimientos pasa a la fase `SHUFFLING` (`SHUFFLE_MS = 500`, banner "BARAJANDO"): se permutan las posiciones de todas las gemas (Fisher–Yates) conservando tipo, `kind`, `counter` y `bornMove`, repitiendo hasta que no haya líneas y exista un movimiento válido (máximo 100 intentos). Si se agotan los intentos, se genera un tablero nuevo con `createInitialGrid` y se reubican en él las bombas y novas existentes en celdas al azar, re-tipando la gema especial si su tipo formara línea. El barajado no hace tic ni cuesta vida.

**Scoring y niveles.** Igual que el clásico (spec 02: 50/100/250 por línea, +100 por forma, × cadena, metas `1500 + 500·(L−1)`, bonus `500·L`), más los puntos de explosión (`20 × cadena` por gema) y los bonus de desactivación (`100 + 25·contador`). El nivel sube la frecuencia de bombas y baja su contador inicial. Todo entero.

### Mapeo de mecánicas a callbacks

- `onScore(score)` — ante cada cambio (líneas, explosiones, desactivaciones, bonus de nivel).
- `onLives(lives)` — `3` al arrancar/reiniciar; se emite al restar vidas en `DETONATING` (si estallan dos bombas a la vez se emite una vez con el valor final). Llega a `0` en la última vida.
- `onLevel(level)` — igual que el clásico.
- `onGameOver(finalScore)` — una sola vez, al terminar la animación de `DETONATING` con `lives === 0`. En esta variante el tablero sin movimientos **nunca** termina la partida.

### Máquina de estados (ampliada)

```
... ──▶ SETTLED ──┬─ subida de nivel (no bloquea)
                  ├─ tic de bombas (1 vez por movimiento del jugador)
                  ├─ alguna bomba a 0 ──▶ DETONATING ──┬─ lives = 0 ──▶ OVER (onGameOver)
                  │                                    └─ FALLING ──▶ (cascada, cadena 1, sin tic) ──▶ SETTLED
                  ├─ hay movimiento ──▶ IDLE
                  └─ no hay ──▶ SHUFFLING ──▶ SETTLED (sin tic)
```

`CLEARING` calcula la máscara en este orden: líneas → componentes → novas nuevas (celdas protegidas, fuera de la máscara) → máscara de líneas → expansión BFS de novas existentes → bombas desactivadas → puntos. Con `CLASSIC_RULES` los pasos de novas y bombas son no-ops.

### Render

- **Bomba:** sprite de su gema oscurecido con un núcleo y una mecha, y el **contador** en grande y alto contraste en el centro (`fillText`, como mucho `maxOnBoard` por frame). Con contador ≤ 3, anillo rojo/amarillo pulsante por `globalAlpha` (sin `shadowBlur`).
- **Nova:** sprite de su gema + halo pre-renderizado (en la caché de `render.ts`, con el glow multiplicado por `glowScale()`), con pulso de opacidad.
- **Explosión 3×3:** destello cuadrado que se desvanece y partículas del pool existente (sin ampliar su tamaño de 96).
- **Detonación de bomba:** destello rojo sobre la celda y **sacudida** del tablero (desplazamiento de ±6 px durante 300 ms); con `prefers-reduced-motion: reduce` no hay sacudida (solo destello).
- **Panel:** además de SCORE / NIVEL / barra / CADENA, "BOMBAS n/3" y "PRÓXIMA EN m" (movimientos hasta la siguiente aparición). Las vidas las muestra el HUD de React.
- Colores exactos de bomba, nova y avisos fijados con `/frontend-design`, legibles sobre el CRT oscuro y distinguibles sin depender solo del color (forma de mecha y número, halo).

### Controles

Idénticos al clásico (spec 02): puntero (toque-toque y deslizamiento) y teclado (flechas/WASD, `Espacio`/`Enter`, `Escape`); `touch-action: none` sobre el canvas mientras el motor vive; sin entrada en `TOUCH_MAP`. Bombas y novas se intercambian como gemas normales.

### Casos límite que el motor debe cubrir

1. **Bomba en línea y en explosión a la vez:** se desactiva una sola vez (un solo bonus).
2. **Bomba borrada en una cascada del mismo movimiento:** se desactiva; como el tic se hace en `SETTLED`, nunca estalla por un movimiento que acabó borrándola.
3. **Bomba recién nacida** (`bornMove === moveIndex`): no hace tic en ese movimiento.
4. **Varias bombas a 0 a la vez:** una sola fase `DETONATING`, una vida por bomba, un solo `onLives` con el valor final, `lives` acotado a `0`, un solo `onGameOver`.
5. **Cascada tras detonación:** puntúa desde cadena `1` y **no** vuelve a hacer tic (bandera `tickedThisMove`).
6. **Reacción en cadena de novas:** BFS con visitadas; ninguna nova detona dos veces y ninguna celda se borra dos veces.
7. **Nova recién creada dentro de una explosión del mismo paso:** está protegida, sobrevive y detonará más adelante.
8. **Componente L/T con una línea de 4+:** crea una sola nova.
9. **Nova que nace sobre una bomba:** la bomba se desactiva con su bonus y la celda pasa a nova.
10. **Intercambio inválido:** no cuenta como movimiento, no hace tic ni acerca la próxima bomba.
11. **Tope de bombas lleno:** la aparición se aplaza, no se pierde.
12. **Tablero sin movimientos:** baraja conservando especiales y contadores; nunca hay fin de partida por bloqueo; el barajado no deja líneas hechas.
13. **Pausa durante `DETONATING` o `SHUFFLING`:** congela la animación; `resume()` resetea `lastTime`.
14. **`restart()`** en cualquier fase: vidas 3, sin bombas ni novas, `moveIndex = 0`, contadores de aparición a cero, tablero nuevo, sacudida cancelada.
15. **Fin de partida:** solo puede producirse al acabar `DETONATING`; nunca a mitad de una cascada.
16. **Puntuación entera** en todos los bonus (requisito de `insertScore`).
17. **Modo clásico intacto:** con `CLASSIC_RULES` no aparecen bombas ni novas, no hay barajado y el fin sigue siendo "sin movimientos".

---

## Implementation plan

Cada paso deja la app compilando y navegable; `gemas` (clásico) sigue funcionando igual en cada paso.

1. **Prototipo.** En `references/started-games/09-match3/game.js`, añadir `MODE = "bomba"` (conmutable por constante o parámetro de URL) con bombas, novas, vidas, detonación y barajado según el Data model. Verificable desde el `index.html`.
2. **Ampliar el modelo.** En `board.ts`, ampliar `GemKind` a `"normal" | "nova" | "bomba"` y añadir `counter?`/`bornMove?` a `Gem`. En `core.ts`, ampliar `Match3Rules` con `novaGems` y `bombs`, y `CLASSIC_RULES` con `novaGems: false, bombs: null`. Comportamiento del clásico sin cambios.
3. **Reglas puras de especiales.** Crear `app/lib/games/gemas/specials.ts` (sin DOM, `rng` inyectable): `groupRunComponents`, `planNovaSpawns(components, swapCells)`, `expandExplosions(grid, mask, protectedCells)`, `collectDefused(grid, mask)`, `tickBombs(grid, moveIndex)`, `pickBombSpawn(spawns, rng)`, `shuffleGrid(grid, rng)`.
4. **Integrar en el núcleo.** En `core.ts`, aplicar en `CLEARING` el orden de cálculo de la máscara (con no-ops si `!rules.novaGems` / `!rules.bombs`); contar `moveIndex`; en `SETTLED`, tic de bombas y paso a `DETONATING` si procede; añadir las fases `DETONATING` y `SHUFFLING`; política `onNoMoves`; vidas con `onLives`; `onGameOver` tras `DETONATING` con `lives === 0`. Añadir al estado del closure `lives`, `moveIndex`, `movesSinceBomb`, `tickedThisMove`, `shake`.
5. **Render.** En `render.ts`, añadir a la caché los sprites de bomba (mecha + núcleo) y el halo de nova, y al dibujo por frame el contador, el aviso ≤ 3, el destello 3×3, la detonación, la sacudida (desactivada con `prefers-reduced-motion`, consultado una vez al crear el motor) y las líneas de panel "BOMBAS" / "PRÓXIMA EN". Ningún `shadowBlur` por frame.
6. **Fábrica y registro.** Crear `app/lib/games/gemas/engine-bomba.ts` con `BOMBA_RULES` (o importarlas de `core.ts`) y `createGemasBombaGame: GameFactory` (ignora `skin`). En `app/lib/games/registry.ts`: `import { createGemasBombaGame } from "./gemas/engine-bomba";` y `"gemas-bomba": createGemasBombaGame`, actualizando el comentario de cabecera.
7. **Referencia rápida.** Añadir la fila de `gemas-bomba` a `references/implemented-games.md`.
8. **Verificación manual** (ver Acceptance criteria), incluida `?debug=perf` (SPEC 16) y una pasada de regresión de `/jugar/gemas`.

> No se regenera `database.types.ts` ni se corre `get_advisors`: esta spec no toca Supabase.

---

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de tipos de ruta; `npm run lint` pasa.
- [ ] `specials.ts` no importa nada del DOM ni guarda estado de módulo; el prototipo `09-match3` se juega en modo bomba desde su `index.html`.
- [ ] `registry.ts` mapea `gemas-bomba` a `createGemasBombaGame`; `gemas` sigue resolviendo a `createGemasGame` y los demás motores y maquetas no cambian.
- [ ] En `/jugar/gemas-bomba` el HUD de React muestra 3 vidas reales que bajan al estallar bombas; el nivel y el score son reales.
- [ ] Las bombas aparecen solo entre las gemas que caen, con la frecuencia y el contador del nivel, nunca más de 3 a la vez; su contador baja 1 por movimiento válido (no por cascada, no por intercambio inválido, no por barajado) y las recién nacidas no bajan ese mismo movimiento.
- [ ] Borrar una bomba (por línea o explosión) la desactiva con bonus `100 + 25 × contador`; si llega a 0 estalla, resta una vida, desaparece solo su celda y el tablero se rellena.
- [ ] Alinear 4+ o formar una L/T crea una nova en la celda movida; borrar una nova revienta su 3×3 y las novas alcanzadas encadenan su explosión, cada una una sola vez, sin dobles borrados.
- [ ] Un tablero sin movimientos se baraja (banner "BARAJANDO") conservando bombas, novas y contadores, sin dejar líneas hechas y sin terminar la partida.
- [ ] Al perder la última vida se abre el modal de fin con la puntuación real, una sola vez aunque estallen varias bombas a la vez; "JUGAR DE NUEVO" reinicia limpio (3 vidas, sin bombas, score 0, nivel 1).
- [ ] PAUSA/REANUDAR durante una detonación o un barajado no provoca saltos; con `prefers-reduced-motion: reduce` no hay sacudida.
- [ ] Contador de bomba y aviso ≤ 3 legibles en desktop y en emulación móvil; bombas y novas se distinguen sin depender solo del color.
- [ ] Con `?debug=perf` se mantiene ~16 ms/frame en desktop durante reacciones en cadena de novas; sin `shadowBlur` por frame.
- [ ] Regresión: `/jugar/gemas` se comporta exactamente como en la spec 02 (sin bombas, sin novas, sin barajado, fin por "sin movimientos").
- [ ] `POST /api/scores` con `{ gameId: "gemas-bomba", name, score }` tras una partida real inserta y la marca aparece en el leaderboard de `/juego/gemas-bomba` y `/salon` (no en el de `gemas`).
- [ ] Al navegar fuera se cancela el RAF, se quitan los listeners y se restaura `touchAction`; reentrar no duplica el loop.
- [ ] No se modifican `CanvasGame.tsx`, `GamePlayer.tsx`, `TouchControls.tsx`, `touch-map.ts`, otros motores, `app/lib/db/`, `app/api/` ni `database.types.ts`.

---

## Decisions

- **Sí: variante = mismo núcleo con otras reglas**, no un motor nuevo. Se amplía `Match3Rules` y se añaden dos fases; tablero, input, render base y ciclo de vida no se duplican. `CLASSIC_RULES` desactiva todo lo nuevo para que el clásico no cambie.
- **Sí: slug propio `gemas-bomba`** con leaderboard propio (decidido en la spec 01): el reproductor guarda con el `id` de la ruta, así que no hace falta tocar `GamePlayer.tsx` ni la API.
- **Sí (supuesto documentado): twist = bombas de cuenta atrás + gema nova.** De las opciones planteadas (contrarreloj, gemas bomba, bloques bloqueantes) es la que más cambia la toma de decisiones sin cambiar el gesto: añade un objetivo (desactivar), una condición de derrota (vidas) y una herramienta (nova). El contrarreloj solo acelera el clásico y los bloques bloqueantes se acercan a un apilador tipo CAÍDA.
- **Sí:** el tic de las bombas ocurre **una vez por movimiento válido, en `SETTLED`**. Así una bomba que la propia cascada borra nunca estalla, y las cascadas largas no castigan al jugador.
- **Sí:** la bomba al estallar solo borra su celda. Si arrasara un 3×3 acabaría "ayudando" al jugador con puntos y huecos; el castigo es la vida perdida.
- **Sí:** la cascada que sigue a una detonación puntúa (empezando en cadena 1) pero no hace tic. Sería raro que unas gemas que se borran no sumen; pero un segundo tic convertiría una detonación en una cadena de detonaciones injusta.
- **Sí:** bonus de desactivación `100 + 25 × contador` fuera del multiplicador de cadena: premia desactivar pronto, no depende de la suerte de las cascadas.
- **Sí:** barajar en lugar de terminar cuando no hay movimientos. Con vidas, perder por bloqueo sería un final ajeno al jugador; el barajado conserva bombas y contadores para que no sirva de "reinicio" de la presión.
- **Sí (supuesto documentado):** valores de dificultad `spawnEvery = max(3, 7 − ⌊L/2⌋)`, `startCounter = max(5, 13 − L)`, `maxOnBoard = 3`, calibrados para que el nivel 1 sea de aprendizaje y desde el 8 la presión sea constante; se ajustan jugando el prototipo antes de portar.
- **Sí:** sacudida desactivada con `prefers-reduced-motion`, en la línea de la degradación de la SPEC 16.
- **No:** hipercubo, gemas estrella, recuperar vidas o un modo contrarreloj: cada uno ampliaría las reglas más allá de una variante; irían en su propia spec.
- **No:** entrada en `TOUCH_MAP`, skins, sonido, anti-cheat, auth real.

---

## Risks

| Riesgo                                                                                              | Mitigación                                                                                                                                                                     |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Al ampliar el núcleo se rompe el modo clásico.                                                      | Todo lo nuevo es no-op con `CLASSIC_RULES`; criterio de aceptación de regresión de `/jugar/gemas`.                                                                            |
| Orden de cálculo de la máscara mal resuelto: dobles borrados, novas que detonan dos veces o que se autodestruyen al nacer. | Orden fijo documentado (líneas → componentes → novas protegidas → máscara → BFS con visitadas → desactivadas → puntos) en funciones puras de `specials.ts`, verificado con `rng` fijo. |
| Dificultad mal calibrada (bombas imposibles o irrelevantes).                                        | Valores como funciones del nivel en `BOMBA_RULES`, ajustables sin tocar la lógica; ajuste jugando el prototipo.                                                               |
| El barajado no encuentra una disposición válida.                                                    | Máximo 100 intentos y, después, tablero nuevo con las especiales reubicadas; con 64 gemas y 6–7 tipos el primer intento casi siempre sirve.                                    |
| Reacciones en cadena de novas disparan muchas partículas y bajan los fps.                           | Pool fijo de 96 partículas (se reutilizan las más viejas); destellos como rectángulos con `globalAlpha`; medición con `?debug=perf`.                                         |
| Contadores ilegibles en celdas pequeñas de móvil.                                                   | Número grande y de alto contraste en el centro de la celda, más el aviso pulsante ≤ 3; revisión en emulación móvil.                                                           |
| Fugas de RAF/listeners al montar/desmontar.                                                         | Heredado del núcleo de la spec 02: `destroy()` cancela el RAF, quita listeners y restaura `touchAction`.                                                                      |
| `INSERT` público en `scores` permite spam.                                                          | `check` de rango/longitud vigente (SPEC 06); endurecer con auth + anti-cheat en otra spec.                                                                                     |

---

## Qué **no** está en esta spec

- Alta de la fila `games`, siembra de `scores` y portada `.cover-gemas-bomba` (van en `01-catalogo-leaderboard-gemas`).
- Cambios de comportamiento del modo clásico `gemas`.
- Hipercubo, gemas estrella, recuperar vidas, modo contrarreloj.
- Skins de `gemas-bomba` y selector de tema.
- Sonido y efectos de audio.
- Entrada en `TOUCH_MAP` / overlay de botones táctiles.
- Anti-cheat / verificación server-side de puntuaciones.
- Auth real y vincular scores a un usuario.

Cada uno de esos, si llega, va en su propia spec.
