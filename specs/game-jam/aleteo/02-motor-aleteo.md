# SPEC 02 (game-jam/aleteo) — Motor de Flappy para "ALETEO"

> **Status:** Draft
> **Depends on:** SPEC 05, SPEC 13, SPEC 16, 01-catalogo-leaderboard-aleteo
> **Date:** 2026-11-28
> **Objective:** Construir un prototipo vanilla de Flappy, portarlo a `app/lib/games/aleteo/engine.ts` como `createAleteoGame: GameFactory` con timestep fijo y registrarlo (con su control táctil de un botón), de modo que `aleteo` (ALETEO), dado de alta por `01-catalogo-leaderboard-aleteo`, se convierta en jugable.

---

## Por qué existe esta spec

`01-catalogo-leaderboard-aleteo` deja a ALETEO en el catálogo (home, biblioteca, salón, detalle) con su leaderboard sembrado, pero sin motor: `/jugar/aleteo` muestra la maqueta genérica. Esta spec entrega el **motor jugable**: un volador de un botón estilo _Flappy Bird_ en el que el pájaro cae por la gravedad, cada pulsación le da un aletazo hacia arriba y hay que cruzar por el hueco de tuberías que avanzan sin fin.

Reusa el patrón de la SPEC 05 tal como lo replicaron las SPEC 07, 08 y 09 y el motor de `ranaria`: una fábrica `GameFactory` sin estado global, el canvas por parámetro, los callbacks `onScore/onLives/onLevel/onGameOver` y el ciclo `start/pause/resume/restart/destroy`. Además nace respetando desde el principio dos specs transversales posteriores:

- **SPEC 16 (rendimiento):** contexto `{ alpha: false }` con el frame completo rellenado y `shadowBlur` multiplicado por `glowScale()`.
- **SPEC 13 (táctil):** entrada propia en `TOUCH_MAP`, más el toque directo sobre el canvas, que en un juego de un botón es el control natural.

Hay un reto técnico propio de este género: la **física sensible al framerate**. En un Flappy, una gravedad integrada con un `dt` variable cambia la altura del aletazo según los Hz del monitor (60, 120 o 144). Eso rompería la equidad del leaderboard. Por eso este motor usa un **timestep fijo** (paso de simulación constante con acumulador), a diferencia de ROCAS o BLOQUE BUSTER, que integran con `dt` variable.

En `references/started-games/` solo hay `02-asteroids`, `03-tetris`, `04-arkanoid` y `05-snake`, todos ya portados, y la jam anterior reservó `06`–`08`. **No existe un prototipo de Flappy**, así que esta spec **necesita un prototipo nuevo**: se construye en `references/started-games/09-flappy` y se porta desde ahí, igual que la SPEC 09 construyó `05-snake` antes de portarlo.

---

## Scope

**In:**

- Construir un prototipo vanilla de Flappy en `references/started-games/09-flappy` (`index.html` + `game.js`), verificable fuera de React, como fuente del port.
- Portar ese `game.js` a `app/lib/games/aleteo/engine.ts` como `createAleteoGame: GameFactory`, sin estado global de módulo, con el canvas por parámetro y un timestep fijo de 120 Hz.
- Paleta del motor en `app/lib/games/aleteo/palette.ts`, un objeto de colores con nombre que el motor lee en vez de incrustar hex. Así queda preparado para que `skin-designer` añada skins más tarde sin reescribir el dibujo.
- Registrar el motor en `app/lib/games/registry.ts`: `aleteo: createAleteoGame`.
- Control táctil: entrada `TOUCH_MAP["aleteo"]` en `app/lib/games/touch-map.ts` (un botón de acción), más `pointerdown` sobre el canvas dentro del motor.
- Añadir la fila de ALETEO a `references/implemented-games.md` y actualizar el comentario de cabecera de `registry.ts`.

**Out of scope (para futuras specs):**

- Alta en `games`, siembra de `scores` y portada `.cover-aleteo`: van en `01-catalogo-leaderboard-aleteo`.
- La variante con inversión de gravedad (`aleteo-inverso`, specs `03`/`04` de esta carpeta).
- Skins seleccionables (`neon`/`retro`): el motor acepta el parámetro `skin` de `GameFactory` pero lo ignora, y `aleteo` no entra en `SKINNED_GAMES` de `skins.ts`. Lo diseña `skin-designer` en su propia spec.
- Sonido, medallas (bronce/plata/oro) y mejor marca local en `localStorage`.
- Anti-cheat y verificación server-side de puntuaciones, auth real.
- Tocar otros motores, `CanvasGame.tsx`, `GamePlayer.tsx` o `TouchControls.tsx`.

---

## Data model

Esta spec **no toca Supabase**: el alta y la siembra son de la spec hermana. El único "modelo" que introduce es el **contrato de motor** de `app/lib/games/types.ts`, que no se redefine:

```ts
// app/lib/games/aleteo/engine.ts → cumple GameFactory
export const createAleteoGame: GameFactory = (
  canvas,
  callbacks /*, skin ignorado */,
): GameEngine => {
  /* todo el estado en el closure */
};
```

### Objetivo del jugador

Cruzar el mayor número posible de tuberías sin tocar ninguna ni el suelo. No hay final: la partida dura hasta el primer choque.

### Mundo y constantes (canvas interno `800×600`)

| Constante                  | Valor                                  | Notas                                                                                |
| -------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------ |
| `W`, `H`                   | `800`, `600`                           | Se fija `canvas.width/height` por parámetro, sin leer el DOM.                        |
| `GROUND_Y`                 | `520`                                  | Franja de suelo de 80 px, mortal.                                                    |
| `BIRD_X`                   | `200`                                  | El pájaro no se mueve en horizontal; el mundo se desplaza.                           |
| `BIRD_R`                   | `12`                                   | Radio de la hitbox circular. El dibujo mide unos 32 px y es un poco más generoso.    |
| `GRAVITY`                  | `1800` px/s²                           |                                                                                      |
| `FLAP_VY`                  | `-520` px/s                            | Fija `vy` (no suma). El apex de un aletazo queda unos 75 px por encima.              |
| `MAX_FALL`                 | `720` px/s                             | Velocidad terminal de caída.                                                         |
| `PIPE_W`                   | `78`                                   |                                                                                      |
| `PIPE_SPACING`             | `260` px                               | Distancia entre los bordes izquierdos de tuberías consecutivas.                      |
| `GAP_BASE` / `GAP_MIN`     | `170` / `130` px                       | Alto del hueco: baja 5 px por nivel hasta el mínimo.                                 |
| `SPEED_BASE` / `SPEED_MAX` | `180` / `300` px/s                     | Velocidad de scroll: sube 15 px/s por nivel hasta el máximo.                         |
| `GAP_MARGIN`               | `60` px                                | Distancia mínima del hueco al techo y al suelo.                                      |
| `MAX_GAP_DELTA`            | `160` px                               | Desplazamiento vertical máximo del centro del hueco entre dos tuberías consecutivas. |
| `FIXED_DT`                 | `1/120` s                              | Paso de simulación constante.                                                        |
| `DT_CAP`                   | `0.05` s                               | Tope del `dt` real por frame (anti-spiral tras blur/pausa).                          |
| `MAX_STEPS`                | `8`                                    | Tope de pasos fijos por frame.                                                       |
| `LEVEL_EVERY`              | `10` tuberías                          |                                                                                      |

### Mecánicas

- **Aletazo.** Cada pulsación válida pone `bird.vy = FLAP_VY`. Entre aletazos, `vy += GRAVITY·FIXED_DT`, limitado a `MAX_FALL`, e `y += vy·FIXED_DT`.
- **Techo.** No es mortal: si `y < BIRD_R`, se fija `y = BIRD_R` y `vy = max(vy, 0)`. Como la tubería superior se extiende hasta `y = 0`, no se puede "volar por encima" de las tuberías.
- **Suelo.** Es mortal: si `y + BIRD_R ≥ GROUND_Y`, la partida termina de inmediato.
- **Tuberías.** Cada tubería es un par (superior e inferior) con `x`, `gapY` (centro del hueco), `gap` (alto del hueco con el que nació) y `scored: boolean`. Se mueven a `x -= speed·FIXED_DT`. La primera aparece en `x = W` en el instante del primer aletazo. Cada nueva aparece cuando la última llega a `x ≤ W − PIPE_SPACING`. Se eliminan cuando `x + PIPE_W < 0`.
- **Generación justa del hueco.** `gapY` es aleatorio en `[GAP_MARGIN + gap/2, GROUND_Y − GAP_MARGIN − gap/2]` y además se limita a `±MAX_GAP_DELTA` respecto al `gapY` anterior. Así nunca aparece un hueco inalcanzable a la velocidad máxima. El azar sale de un PRNG con semilla (mulberry32) que vive en el closure y se resiembra en cada `restart()`.
- **Colisión.** Círculo contra rectángulo (punto más cercano del rectángulo al centro, distancia `< BIRD_R`) con los dos rectángulos de cada tubería cercana. Con `FIXED_DT = 1/120` y `MAX_FALL = 720`, el pájaro avanza como mucho 6 px por paso y el mundo 2,5 px: no hay tunneling posible contra tuberías de 78 px.
- **Dificultad.** `level = 1 + floor(score / LEVEL_EVERY)`. `speed = min(SPEED_MAX, SPEED_BASE + 15·(level−1))` se aplica de inmediato. `gap = max(GAP_MIN, GAP_BASE − 5·(level−1))` se aplica a las tuberías que nazcan a partir de ese momento, nunca a las que ya están en pantalla.

### Controles

| Entrada                                   | Acción                     | Detalle                                                                                                        |
| ----------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `Space`, `ArrowUp`, `KeyW` (por `e.code`) | Aletear                    | `keydown` en `window`, con `preventDefault` para esas teclas. Se ignora `e.repeat`: mantener pulsado no aletea en ráfaga. |
| Clic o toque sobre el canvas              | Aletear                    | `pointerdown` en el `<canvas>` con `preventDefault`. Cubre ratón y dedo con un solo listener.                  |
| Botón táctil `▲` (overlay SPEC 13)        | Aletear                    | `TOUCH_MAP["aleteo"]`: `{ label: "▲", code: "Space", key: " ", hold: false, slot: "action-a" }`.               |
| Pausa / fin / reinicio                    | Los gobierna React         | No hay tecla `P` ni "pulsa para reiniciar": se usan `pause()/resume()` y `restart()` desde el modal.           |

Las pulsaciones no se aplican al instante: activan `flapQueued = true`, que el **siguiente paso fijo** consume. Varias pulsaciones dentro del mismo paso cuentan como una sola. Así el input es determinista respecto a la simulación.

### Scoring y mapeo a callbacks

- `onScore(score)`: **+1 por tubería cruzada**. Una tubería se cuenta una sola vez (`scored = true`) cuando `pipe.x + PIPE_W < BIRD_X − BIRD_R`. Es la escala nativa de Flappy y coincide con la siembra (`best = 214`).
- `onLives(lives)`: hay una sola vida. `onLives(1)` al arrancar o reiniciar y `onLives(0)` al chocar, el mismo patrón que `serpentina`.
- `onLevel(level)`: `1` al arrancar y sube cada `LEVEL_EVERY = 10` tuberías (tramo de velocidad y estrechamiento del hueco).
- `onGameOver(finalScore)`: **una sola vez**, al terminar la animación de caída (ver Estados), protegido por la bandera `overEmitted`.
- `syncReactState()` compara con los últimos valores emitidos y solo llama a los callbacks ante un cambio. La puntuación final llega al leaderboard por el flujo ya existente: el modal de fin de `GamePlayer` hace `POST /api/scores` con `{ gameId: "aleteo", name, score }`. El motor no conoce la API.

### Estados

| Estado     | Qué pasa                                                                                                                                                                                                                               | Sale a                                                    |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `idle`     | Tras `start()`/`restart()`. El pájaro flota en `y = 260` con un vaivén senoidal (8 px, 2 Hz), sin gravedad. El suelo y el fondo se desplazan, no hay tuberías y se lee el texto "ESPACIO / TOCA PARA ALETEAR" dentro del canvas. | `playing` con la primera pulsación, que además ya aletea. |
| `playing`  | La simulación completa: gravedad, tuberías, puntuación y dificultad.                                                                                                                                                                   | `dying` al tocar una tubería; `over` al tocar el suelo.   |
| `paused`   | Lo activa `pause()`: se cancela el RAF y la entrada se ignora. Lo desactiva `resume()`: `lastTime = null`, `acc = 0` y se rearranca el loop.                                                                                          | El estado previo (`idle` / `playing` / `dying`).          |
| `dying`    | Tras chocar con una tubería: el scroll se detiene, un destello blanco de 80 ms, `onLives(0)`, y el pájaro cae sin poder aletear (con la gravedad normal) hasta el suelo, o como mucho 1,0 s.                                         | `over`.                                                   |
| `over`     | Último frame congelado y loop detenido. Se emite `onGameOver(score)` una vez y la entrada se ignora.                                                                                                                                  | `idle` vía `restart()`.                                   |

### Render en canvas y timestep fijo

- **Loop.** RAF cancelable (`rafId` nullable, `startLoop`/`stopLoop`). En cada frame: `dt = lastTime === null ? 0 : min((ts − lastTime)/1000, DT_CAP)`; `acc += dt`; `while (acc ≥ FIXED_DT && steps < MAX_STEPS) { step(); acc −= FIXED_DT; }`. Si se alcanza `MAX_STEPS`, se descarta el resto (`acc = 0`). Después `draw(alpha)` con `alpha = acc / FIXED_DT`.
- **Interpolación.** `step()` guarda `prevY`, `prevScroll` y el `prevX` de cada tubería. `draw` interpola con `alpha`, de modo que en monitores de 144 Hz el movimiento no "tartamudea", aunque la física siga yendo a 120 Hz exactos.
- **Orden de dibujo** (el frame completo cada vuelta, requisito de `alpha: false`):
  1. Fondo (`palette.bg`, `fillRect` de todo el canvas).
  2. Skyline de dos capas en parallax (factores 0,2 y 0,5 del scroll), cada una con unos 15 rectángulos como mucho y sin glow.
  3. Tuberías: relleno sólido y, después, **una sola pasada** de contornos con `shadowBlur = GLOW·glow` y `shadowBlur = 0` al terminar.
  4. Suelo con franjas diagonales desplazadas.
  5. Pájaro: cuerpo, ala con dos frames que alternan tras cada aletazo y ojo. Gira según `vy` (de −25° a +90°) y lleva un glow propio.
  6. Plumas: 3 partículas por aletazo, con un tope de 30 vivas.
  7. Puntuación grande centrada arriba (seña de identidad de Flappy; el HUD de React también la muestra).
  8. Texto de `idle`.
- **Rendimiento (SPEC 16).** `canvas.getContext("2d", { alpha: false })`. `const glow = glowScale()` se calcula una vez al crear la fábrica, y todo `shadowBlur` se multiplica por `glow`. No hay doble canvas ni `OffscreenCanvas`: no hace falta, porque son unas 40 primitivas por frame.
- **Paleta** (`palette.ts`): `{ bg, skylineFar, skylineNear, pipe, pipeEdge, ground, groundStripe, bird, birdWing, birdEye, feather, text, flash }`. Los valores concretos los fija `/frontend-design` durante la implementación, legibles sobre el CRT oscuro, con el pájaro en `--yellow` como color de identidad.

### Edge cases

- **Tecla mantenida:** se ignora `e.repeat`, así que solo aletea el primer `keydown`.
- **Pulsar durante `paused`, `dying` u `over`:** se ignora. Pulsar durante `idle` arranca la partida y aletea en el mismo paso.
- **Cambiar de pestaña o perder el foco:** el RAF se congela. Al volver, el `dt` queda limitado a `DT_CAP` y los pasos a `MAX_STEPS`, así que no hay salto de simulación.
- **`resume()` tras una pausa larga:** `lastTime = null` y `acc = 0`, de modo que el primer frame avanza 0.
- **Puntuación doble:** la bandera `scored` impide contar dos veces una misma tubería.
- **`onGameOver` doble** (chocar con una tubería y luego con el suelo en `dying`): la bandera `overEmitted` lo evita; el suelo en `dying` solo cierra la animación.
- **Hueco imposible:** se evita con `GAP_MARGIN` y `MAX_GAP_DELTA`, y lo verifica una prueba manual a nivel 9 (velocidad máxima, hueco mínimo).
- **`restart()` durante `dying`:** reinicia limpio a `idle` (score 0, nivel 1, 1 vida, sin tuberías y con nueva semilla).
- **`destroy()` dos veces o `restart()` después de `destroy()`:** son no-op seguros; los listeners no se duplican.
- **Escalado CSS del canvas:** la posición del puntero da igual (un solo botón), así que no hay que mapear coordenadas.

---

## Implementation plan

Cada paso deja la app compilando y navegable.

1. **Prototipo vanilla.** Crear `references/started-games/09-flappy/` con `index.html` y `game.js`: un Flappy en canvas `800×600` con todas las constantes, mecánicas, estados y el timestep fijo de este Data model. Controles: Espacio/↑/W y clic. Verificable abriendo el `index.html` y calibrando ahí la sensación de juego (aletazo, gravedad, huecos) antes de portar.
2. **Paleta.** Crear `app/lib/games/aleteo/palette.ts` que exporte `ALETEO_PALETTE` con las claves de "Render en canvas" (valores provisionales, que se afinan en el paso 7).
3. **Portar el motor.** Crear `app/lib/games/aleteo/engine.ts` que exporte `createAleteoGame: GameFactory`, SIN estado global de módulo. Todo el estado va en el closure: `bird {y, vy, prevY, wingFrame}`, `pipes[]`, `particles[]`, `score`, `level`, `speed`, `scroll`, `state`, `flapQueued`, `acc`, `lastTime`, `rafId`, `rng`, `dyingT`, `overEmitted` y los últimos valores emitidos. El `canvas` llega por parámetro (sin `getElementById`), `width/height = 800×600` y `getContext("2d", { alpha: false })`. Los listeners (`keydown` en `window` y `pointerdown` en el canvas) se añaden en `start()` y se quitan en `destroy()`. `pause/resume/restart/destroy` siguen los Estados. Se eliminan del prototipo el "pulsa para reiniciar" y cualquier texto de GAME OVER (eso lo hace el modal de React). Las constantes se conservan 1:1 respecto al prototipo calibrado.
4. **Registrar.** En `app/lib/games/registry.ts`: `import { createAleteoGame } from "./aleteo/engine";`, la línea `aleteo: createAleteoGame` y la mención en el comentario de cabecera. No se tocan `CanvasGame.tsx` ni `GamePlayer.tsx`.
5. **Táctil.** En `app/lib/games/touch-map.ts`, añadir `aleteo` con un único botón `{ label: "▲", code: "Space", key: " ", hold: false, slot: "action-a" }` y su línea en el comentario de esquemas. No se toca `TouchControls.tsx`. Verificar que el contenedor `.touch-controls` deja pasar los toques al canvas fuera de los botones; si no, documentarlo y conformarse con el botón.
6. **Referencia.** Añadir a `references/implemented-games.md` la fila `| \`aleteo\` | ALETEO | ARCADE | Un botón, mil tuberías: aletea por el hueco o estréllate. | \`app/lib/games/aleteo/engine.ts\` |`.
7. **Afinado visual con `/frontend-design`.** Paleta final, forma del pájaro y de las tuberías, glow, legibilidad de la puntuación grande y del texto de `idle` sobre el CRT oscuro.
8. **Verificación manual** según los Acceptance criteria, en desktop y en emulación móvil (portrait y landscape, SPEC 15), con `?debug=perf` (SPEC 16).

> No se regenera `database.types.ts` (el esquema no cambia) ni se corre `get_advisors` (no se toca Supabase).

---

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de tipos de ruta, y `npm run lint` pasa.
- [ ] Existe `references/started-games/09-flappy/` con un Flappy vanilla jugable abriendo su `index.html`.
- [ ] `app/lib/games/aleteo/engine.ts` exporta `createAleteoGame`, no usa estado global de módulo ni `document.getElementById`, fija el canvas a `800×600` y abre el contexto con `{ alpha: false }` sin artefactos ni estelas.
- [ ] `getGameEngine("aleteo")` deja de devolver `null`. `rocas`, `caida`, `bloque-buster`, `serpentina` y `ranaria` siguen jugables, y los demás ids siguen como maqueta.
- [ ] En `/jugar/aleteo` el juego arranca en `idle` (el pájaro flota y se ve el texto de ayuda). La primera pulsación de Espacio, ↑, W o un clic sobre el canvas inicia la partida y aletea.
- [ ] Cada aletazo eleva al pájaro una altura constante. Con la instrumentación de SPEC 16 y el monitor a 60 Hz y a 144 Hz (o throttling de CPU), la altura del apex es la misma (física de timestep fijo, ±1 px).
- [ ] Mantener pulsado Espacio produce **un** aletazo, no una ráfaga.
- [ ] Las tuberías aparecen con huecos alcanzables. Cruzar una suma exactamente +1 y el HUD de React (`.player-hud`) refleja la puntuación, las vidas (`1` jugando, `0` al chocar) y el nivel (sube cada 10 tuberías, con la velocidad visiblemente mayor).
- [ ] Al nivel 9 o más (velocidad 300 px/s, hueco de 130 px) se puede seguir jugando: ningún hueco queda fuera del alcance de un jugador.
- [ ] Tocar una tubería provoca la caída (`dying`) y después el modal de fin con la puntuación real. Tocar el suelo abre el modal directamente. `onGameOver` se emite una sola vez.
- [ ] "JUGAR DE NUEVO" reinicia limpio a `idle` (score 0, nivel 1, sin tuberías) sin saltos.
- [ ] PAUSA/REANUDAR no provoca salto de simulación: las tuberías y el pájaro siguen exactamente donde estaban.
- [ ] Ni las flechas ni Espacio hacen scroll de la página durante el juego.
- [ ] En un dispositivo con `pointer: coarse` aparece el botón táctil `▲` y aletea, y tocar el canvas también aletea. En desktop el overlay no aparece.
- [ ] Al navegar fuera, `destroy()` cancela el RAF y quita los listeners de `window` y del canvas. Al volver a entrar no se duplica el loop ni el aletazo.
- [ ] Con `?debug=perf`, el juego mantiene unos 16 ms/frame en desktop. Con `pointer: coarse` o `prefers-reduced-motion`, el glow queda atenuado o anulado.
- [ ] El leaderboard de `aleteo` en `/salon` y `/juego/aleteo` muestra las filas sembradas. Terminar una partida y enviar el nombre desde el modal (`POST /api/scores` con `{ gameId: "aleteo", name, score }`) inserta la fila y esta aparece al recargar.

---

## Decisions

- **Sí:** reusar el patrón SPEC 05 (motor por `GameFactory` más registro) tal como lo replicaron las SPEC 07, 08 y 09.
- **Sí:** construir primero el prototipo en `references/started-games/09-flappy` (no existía) y portarlo desde ahí, para tener una referencia vanilla verificable como los demás juegos. Se usa el número `09` porque `06`–`08` ya los reservó la jam anterior (frogger, road-fighter, moon-patrol).
- **Sí:** un **timestep fijo** de 120 Hz con acumulador e interpolación del render. En un juego de un botón, la altura del aletazo es la regla del juego, y debe ser idéntica en cualquier monitor para que el leaderboard sea justo. Se descarta integrar con `dt` variable como ROCAS. Se descartan 60 Hz porque dan menos margen anti-tunneling y peor latencia de input.
- **Sí:** `FLAP_VY` **fija** la velocidad vertical, no la suma, como el Flappy original: cada aletazo es predecible sin importar la caída previa.
- **Sí (supuesto documentado):** techo no mortal con la tubería superior extendida hasta `y = 0`, y suelo mortal. Es la lectura más clara en el CRT `800×600` e impide el exploit de volar por encima.
- **Sí (supuesto documentado):** una sola vida (`onLives(1→0)`) y `onLevel` como tramo de dificultad cada 10 tuberías, para que el HUD compartido nunca salga incoherente (mismo criterio que `serpentina`).
- **Sí (supuesto documentado):** un estado `idle` dibujado en el canvas ("toca para aletear") antes de la primera pulsación, como el "Get Ready" del original. No contradice la regla de quitar el "pulsa para reiniciar": el **reinicio** sigue en manos del modal de React, e `idle` es solo el arranque de cada partida.
- **Sí (supuesto documentado):** fase `dying` de hasta 1,0 s antes de `onGameOver`, para que el choque se lea como en el original. El modal abre justo después.
- **Sí:** `pointerdown` sobre el canvas dentro del motor. Es una **desviación consciente** de la decisión de SPEC 13 ("no añadir listeners táctiles en los motores"), que se tomó para no reabrir cuatro motores ya estables. Este motor es nuevo, y en un juego de un botón el clic o toque sobre la pantalla es el control canónico, que con `pointerdown` sirve igual para el ratón en desktop. Además se añade `TOUCH_MAP["aleteo"]` para que el móvil muestre su botón como el resto de juegos.
- **Sí:** PRNG con semilla en el closure (mulberry32), para poder reproducir una partida concreta al depurar la equidad de los huecos. No se persiste ni se expone.
- **Sí:** paleta en `palette.ts` desde el principio, aunque todavía no haya skins, para que `skin-designer` pueda añadirlas sin tocar la lógica de dibujo.
- **No:** medallas, mejor marca local ni sonido. Quedan fuera para mantener el alcance "barato" que motivó la sugerencia.
- **No:** compartir código con `aleteo-inverso`. Cada variante es autocontenida para poder implementar una sin la otra; extraer un núcleo común sería otra spec si llegan las dos.
- **No:** tocar el catálogo, la portada o `scores` de `aleteo` (van en la spec hermana `01`).

---

## Risks

| Riesgo                                                                                              | Mitigación                                                                                                                                                |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No existe un prototipo de Flappy: hay que construirlo y la sensación (gravedad/aletazo) puede quedar "rara". | Calibrar `GRAVITY`/`FLAP_VY`/`GAP_*` en `09-flappy` antes de portar y conservar las constantes 1:1 en el port.                                            |
| La física depende del framerate y la equidad del leaderboard se rompe entre monitores.              | Timestep fijo a 120 Hz con acumulador. Un criterio de aceptación compara el apex a 60 y a 144 Hz.                                                         |
| Muerte en espiral (*spiral of death*) en hardware lento: el acumulador crece sin fin.               | `DT_CAP = 0.05` y `MAX_STEPS = 8`. El sobrante se descarta (`acc = 0`) en lugar de acumularse.                                                            |
| Un hueco imposible por un salto vertical excesivo entre tuberías.                                   | `MAX_GAP_DELTA = 160` y `GAP_MARGIN = 60`, con prueba manual a velocidad máxima y hueco mínimo.                                                           |
| Doble aletazo por un mismo toque (overlay y canvas a la vez) o por la autorrepetición del teclado.  | Un `pointerdown` solo tiene un target (botón o canvas, nunca los dos). `e.repeat` se ignora y `flapQueued` agrupa las pulsaciones dentro de un paso.      |
| El contenedor `.touch-controls` intercepta los toques sobre el canvas.                              | Verificarlo en el paso 5. Si intercepta, el botón `▲` basta para jugar; se documenta sin tocar `TouchControls.tsx`.                                       |
| Fugas de RAF o listeners al montar y desmontar en el App Router.                                    | `destroy()` cancela el RAF y quita los listeners de `window` y del canvas; el `useEffect` de `CanvasGame` devuelve ese cleanup.                           |
| El glow de las tuberías (muchos contornos) penaliza el rendimiento en móvil.                        | Una sola pasada de contorno con `shadowBlur` por frame, multiplicada por `glowScale()` (0,5 en móvil, 0 en reduced-motion).                               |
| Un autoclicker trivializa el juego.                                                                 | En Flappy, aletear en ráfaga choca contra el techo y las tuberías superiores: no es una ventaja. El anti-cheat de verdad va en otra spec.                 |

---

## Qué **no** está en esta spec

- Alta de la fila `games`, siembra de `scores` y portada `.cover-aleteo` (van en `01-catalogo-leaderboard-aleteo`).
- La variante `aleteo-inverso` (specs `03`/`04` de esta carpeta).
- Skins seleccionables (`neon`/`retro`) y su entrada en `skins.ts`.
- Sonido, medallas y mejor marca local.
- Anti-cheat y verificación server-side de puntuaciones.
- Auth real y vincular scores a un usuario.
- Cambios en `CanvasGame.tsx`, `GamePlayer.tsx`, `TouchControls.tsx` o en otros motores.

Cada uno de esos, si llega, va en su propia spec.
