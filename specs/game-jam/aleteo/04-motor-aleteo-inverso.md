# SPEC 04 (game-jam/aleteo) — Motor de gravedad invertida para "ALETEO INVERSO"

> **Status:** Draft
> **Depends on:** SPEC 05, SPEC 13, SPEC 16, 03-catalogo-leaderboard-aleteo-inverso
> **Date:** 2026-11-28
> **Objective:** Construir un prototipo vanilla de volador con inversión de gravedad, portarlo a `app/lib/games/aleteo-inverso/engine.ts` como `createAleteoInversoGame: GameFactory` con timestep fijo y registrarlo (con su control táctil de un botón), de modo que `aleteo-inverso` (ALETEO INVERSO), dado de alta por `03-catalogo-leaderboard-aleteo-inverso`, se convierta en jugable.

---

## Por qué existe esta spec

`03-catalogo-leaderboard-aleteo-inverso` deja a ALETEO INVERSO en el catálogo con su leaderboard sembrado, pero sin motor. Esta spec entrega el **motor jugable** de la segunda variante del juego base `aleteo`. Comparte con el clásico (`02-motor-aleteo`) el formato: un botón, scroll horizontal infinito, una vida y timestep fijo. Pero cambia el **verbo** del botón y, con él, toda la toma de decisiones:

| Aspecto           | ALETEO (clásico, `02`)                       | ALETEO INVERSO (esta spec)                                                     |
| ----------------- | -------------------------------------------- | ------------------------------------------------------------------------------ |
| Botón             | Impulso: fija `vy = FLAP_VY`                 | Invierte el signo de la gravedad y **conserva** `vy` (inercia)                 |
| Bordes            | Techo seguro, suelo mortal                   | Riel eléctrico arriba **y** abajo, ambos mortales                              |
| Obstáculos        | Tubería doble con un hueco                   | Barra de techo, barra de suelo o bloque flotante (elegir arriba o abajo)       |
| Puntuación        | +1 por tubería                               | +10 por obstáculo y +25 por chispa recogida (recompensa al riesgo)             |
| Lectura del juego | Ritmo de pulsación                           | Anticipación: frenar y cambiar de sentido tarda                                 |

Reusa el patrón de la SPEC 05 (fábrica `GameFactory` sin estado global, canvas por parámetro, callbacks, ciclo de vida) y nace respetando la SPEC 16 (`alpha: false`, `glowScale()`) y la SPEC 13 (entrada en `TOUCH_MAP`).

**No existe un prototipo** de este juego en `references/started-games/`: solo están `02`–`05`, ya portados, y `06`–`09` están reservados por la jam anterior y por `09-flappy` de la variante clásica. Esta spec **necesita un prototipo nuevo** en `references/started-games/10-gravity-flap`, que se porta desde ahí. Es **independiente** del motor de `aleteo`: no lo importa ni lo requiere implementado.

---

## Scope

**In:**

- Prototipo vanilla en `references/started-games/10-gravity-flap` (`index.html` + `game.js`), verificable fuera de React.
- Port a `app/lib/games/aleteo-inverso/engine.ts` como `createAleteoInversoGame: GameFactory`, sin estado global de módulo y con timestep fijo de 120 Hz.
- Paleta en `app/lib/games/aleteo-inverso/palette.ts`, preparada para futuras skins.
- Registro en `app/lib/games/registry.ts`: `"aleteo-inverso": createAleteoInversoGame`.
- Control táctil: `TOUCH_MAP["aleteo-inverso"]` (un botón) más `pointerdown` sobre el canvas.
- Fila en `references/implemented-games.md` y mención en el comentario de `registry.ts`.

**Out of scope (para futuras specs):**

- Alta en `games`, siembra de `scores` y portada (van en `03-catalogo-leaderboard-aleteo-inverso`).
- La variante clásica `aleteo` y cualquier núcleo de código compartido entre las dos.
- Skins seleccionables (el parámetro `skin` se acepta pero se ignora, y no hay entrada en `skins.ts`).
- Power-ups (escudo, imán, cámara lenta), jefes, sonido y mejor marca local.
- Anti-cheat, auth real, y cambios en `CanvasGame.tsx`, `GamePlayer.tsx`, `TouchControls.tsx` u otros motores.

---

## Data model

Esta spec **no toca Supabase**. Contrato de motor (de `app/lib/games/types.ts`, no se redefine):

```ts
// app/lib/games/aleteo-inverso/engine.ts → cumple GameFactory
export const createAleteoInversoGame: GameFactory = (
  canvas,
  callbacks /*, skin ignorado */,
): GameEngine => {
  /* todo el estado en el closure */
};
```

### Objetivo del jugador

Sobrevivir el máximo de obstáculos alternando el sentido de la gravedad sin tocar los rieles ni los obstáculos, y arriesgarse a recoger chispas para multiplicar la puntuación.

### Mundo y constantes (canvas interno `800×600`)

| Constante                    | Valor                        | Notas                                                                                         |
| ---------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------- |
| `W`, `H`                     | `800`, `600`                 |                                                                                               |
| `RAIL_TOP` / `RAIL_BOTTOM`   | `40` / `560`                 | Rieles eléctricos mortales. El campo útil mide 520 px.                                        |
| `BIRD_X`, `BIRD_R`           | `220`, `12`                  | Hitbox circular.                                                                              |
| `GRAVITY`                    | `1600` px/s²                 | Se aplica como `gSign·GRAVITY`, con `gSign ∈ {+1 (abajo), −1 (arriba)}`.                      |
| `MAX_VY`                     | `480` px/s                   | Velocidad vertical máxima en ambos sentidos.                                                  |
| `FLIP_COOLDOWN`              | `0.10` s                     | Tiempo mínimo entre inversiones. Una pulsación dentro del cooldown se descarta.               |
| `OBST_W`                     | `60`                         | Ancho de barras y bloques.                                                                    |
| `OBST_SPACING`               | `340` px                     | Distancia entre los bordes izquierdos de obstáculos consecutivos.                             |
| `BAR_MIN` / `BAR_MAX`        | `0.30` / `0.60`              | Longitud de las barras como fracción del campo útil.                                          |
| `FLOAT_H_MIN` / `FLOAT_H_MAX`| `130` / `180` px             | Alto del bloque flotante.                                                                     |
| `PASS_MIN`                   | `150` px                     | Hueco libre mínimo de cualquier paso (unas 6 veces el diámetro del pájaro).                   |
| `MAX_SWING`                  | `300` px                     | Distancia vertical máxima entre los centros de paso de dos obstáculos consecutivos.          |
| `SPARK_R`, `SPARK_CHANCE`    | `10`, `0.5`                  | Radio de la chispa y probabilidad de que un obstáculo lleve una.                              |
| `SPEED_BASE` / `SPEED_MAX`   | `200` / `340` px/s           | Sube 15 px/s por nivel.                                                                       |
| `LEVEL_EVERY`                | `8` obstáculos               |                                                                                               |
| `FIXED_DT`, `DT_CAP`, `MAX_STEPS` | `1/120` s, `0.05` s, `8`  | Mismo esquema de timestep fijo que la variante clásica.                                       |

### Mecánicas

- **Inversión de gravedad.** Cada pulsación válida (fuera de `FLIP_COOLDOWN`) hace `gSign = −gSign` y **no modifica `vy`**. En cada paso: `vy = clamp(vy + gSign·GRAVITY·FIXED_DT, −MAX_VY, MAX_VY)` e `y += vy·FIXED_DT`. Por la inercia, a velocidad máxima el pájaro tarda unos 0,3 s y unos 72 px en frenar antes de cambiar de sentido: esa es la habilidad central.
- **Rieles.** Si `y − BIRD_R ≤ RAIL_TOP` o `y + BIRD_R ≥ RAIL_BOTTOM`, el pájaro muere.
- **Obstáculos.** Se mueven a `x −= speed·FIXED_DT`. El primero aparece en `x = W` en el primer impulso y los siguientes cada `OBST_SPACING`. Se eliminan al salir por la izquierda. Hay tres tipos:
  - `techo`: rectángulo desde `RAIL_TOP` hacia abajo, de longitud `L ∈ [BAR_MIN, BAR_MAX]·520`. El paso queda debajo.
  - `suelo`: el mismo rectángulo, desde `RAIL_BOTTOM` hacia arriba. El paso queda encima.
  - `flotante`: un bloque de alto `h ∈ [FLOAT_H_MIN, FLOAT_H_MAX]` en una `y` aleatoria tal que los dos pasos (arriba y abajo) midan al menos `PASS_MIN`. Hay que elegir uno de los dos.
- **Generación justa** (PRNG mulberry32 con semilla en el closure, resembrado en `restart()`):
  - Ningún tipo aparece más de 2 veces seguidas.
  - Todo paso mide al menos `PASS_MIN`.
  - El "centro de paso" de cada obstáculo (en un `flotante`, el de sus dos pasos más cercano al anterior) no se aleja más de `MAX_SWING` del anterior. Si el sorteo lo incumple, se vuelve a sortear la longitud o la posición, con un máximo de 5 intentos y después un fallback a una barra corta (`BAR_MIN`).
  - Así la inercia nunca deja un obstáculo inalcanzable a `SPEED_MAX`.
- **Chispas.** Con probabilidad `SPARK_CHANCE`, un obstáculo lleva una chispa dentro de su paso, pegada al borde del obstáculo (a 20 px de él), es decir, en la línea más arriesgada. Se recoge con una colisión círculo-círculo (`BIRD_R + SPARK_R`) y desaparece con un destello.
- **Colisión con obstáculos.** Círculo contra rectángulo. Con `FIXED_DT = 1/120` y `MAX_VY = 480`, cada paso avanza como mucho 4 px en vertical y 2,8 px en horizontal: no hay tunneling.
- **Dificultad.** `level = 1 + floor(obstaculosSuperados / LEVEL_EVERY)` y `speed = min(SPEED_MAX, SPEED_BASE + 15·(level−1))`, aplicada de inmediato. `OBST_SPACING` es constante en píxeles, así que a más velocidad hay menos tiempo entre obstáculos.

### Controles

| Entrada                                                           | Acción                  | Detalle                                                                                                      |
| ----------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| `Space`, `ArrowUp`, `ArrowDown`, `KeyW`, `KeyS` (por `e.code`)    | Invertir la gravedad    | `keydown` en `window` con `preventDefault`. Se ignora `e.repeat`. Todas las teclas hacen lo mismo: es un juego de un botón y las flechas se aceptan por costumbre. |
| Clic o toque sobre el canvas                                      | Invertir la gravedad    | `pointerdown` en el `<canvas>` con `preventDefault`.                                                         |
| Botón táctil `⇅` (overlay SPEC 13)                                | Invertir la gravedad    | `TOUCH_MAP["aleteo-inverso"]`: `{ label: "⇅", code: "Space", key: " ", hold: false, slot: "action-a" }`.     |
| Pausa / fin / reinicio                                            | Los gobierna React      | Sin tecla `P` ni "pulsa para reiniciar".                                                                     |

Las pulsaciones activan `flipQueued`, que consume el siguiente paso fijo si `flipCooldown ≤ 0`. Si no se puede aplicar, se descartan, sin búfer: así no se encadenan inversiones "fantasma" tras el cooldown.

### Scoring y mapeo a callbacks

- `onScore(score)`: **+10** cuando un obstáculo queda atrás (`x + OBST_W < BIRD_X − BIRD_R`, con la bandera `passed`) y **+25** por chispa recogida (con la bandera `taken`). Es coherente con la siembra (`best = 2840`).
- `onLives(lives)`: una sola vida. `onLives(1)` al arrancar o reiniciar y `onLives(0)` al morir.
- `onLevel(level)`: `1` al arrancar y sube cada 8 obstáculos.
- `onGameOver(finalScore)`: una sola vez al terminar la animación de muerte, protegido por `overEmitted`.
- `syncReactState()` solo emite ante cambios. El envío al leaderboard es el flujo existente: el modal de `GamePlayer` hace `POST /api/scores` con `{ gameId: "aleteo-inverso", name, score }`.
- Dentro del canvas se dibuja, arriba a la derecha, un contador pequeño de chispas recogidas en la partida (informativo, no va al HUD de React).

### Estados

| Estado    | Qué pasa                                                                                                                                                                                                    | Sale a                                                          |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `idle`    | Tras `start()`/`restart()`: el pájaro flota en `y = 300` con un vaivén y sin gravedad, los rieles chisporrotean, no hay obstáculos y se lee el texto "ESPACIO / TOCA PARA INVERTIR LA GRAVEDAD".          | `playing` con la primera pulsación, que arranca con `gSign = +1` (cae hacia abajo). |
| `playing` | Simulación completa.                                                                                                                                                                                        | `dying` al tocar un riel o un obstáculo.                        |
| `paused`  | Lo activa `pause()`: se cancela el RAF y la entrada se ignora. Lo desactiva `resume()`: `lastTime = null`, `acc = 0`, y se conservan `gSign`, `vy` y `flipCooldown`.                                        | El estado previo.                                               |
| `dying`   | El scroll se detiene y se ve un destello eléctrico (100 ms). El pájaro se desintegra en unas 16 partículas durante 0,6 s. `onLives(0)` al entrar.                                                          | `over`.                                                         |
| `over`    | Último frame congelado, loop detenido y `onGameOver(score)` una vez.                                                                                                                                       | `idle` vía `restart()`.                                         |

### Render en canvas y timestep fijo

- **Loop:** idéntico esquema al clásico: RAF cancelable, `dt` limitado a `DT_CAP`, acumulador con `MAX_STEPS`, `draw(alpha)` interpolando la `y` del pájaro y la `x` de los obstáculos.
- **Orden de dibujo** (el frame completo cada vuelta):
  1. Fondo `palette.bg` a todo el canvas.
  2. Rejilla de fondo con un leve parallax (líneas, sin glow).
  3. Rieles: el riel **hacia el que tira la gravedad** se dibuja más brillante y con un chisporroteo animado, como pista visual constante del sentido actual. El otro queda atenuado.
  4. Obstáculos: relleno y después una única pasada de contornos con glow.
  5. Chispas con pulso de escala.
  6. Estela del pájaro (6 posiciones previas con alfa decreciente).
  7. Pájaro **volteado verticalmente** cuando `gSign = −1`, con la transición del volteo animada en 80 ms.
  8. Puntuación centrada arriba y contador de chispas.
  9. Texto de `idle`.
- **Rendimiento (SPEC 16):** `getContext("2d", { alpha: false })` y `const glow = glowScale()` calculado una vez, que multiplica todo `shadowBlur`. Como mucho, unas 60 primitivas por frame.
- **Paleta** (`palette.ts`): `{ bg, grid, railIdle, railActive, spark, obstacle, obstacleEdge, bird, birdWing, birdEye, trail, text, flash }`. El pájaro va en `--magenta` como color de identidad. Valores finales con `/frontend-design`.

### Edge cases

- **Pulsaciones en ráfaga:** `FLIP_COOLDOWN` descarta las que llegan en menos de 100 ms y `e.repeat` se ignora. Varias pulsaciones dentro de un mismo paso cuentan como una sola.
- **Pausar justo después de invertir:** se conservan `gSign`, `vy` y `flipCooldown`, así que al reanudar la física sigue exactamente igual.
- **Pulsar en `idle`:** arranca con la gravedad hacia abajo (no invierte en esa pulsación). Lo explica el texto de ayuda.
- **Pulsar en `dying`, `over` o `paused`:** se ignora.
- **Chispa y obstáculo en el mismo paso:** primero se resuelven las chispas y después la colisión. Si el pájaro muere, la chispa recogida en ese mismo paso cuenta, y el score final la incluye.
- **Obstáculo superado y muerte en el mismo paso:** si el obstáculo ya quedó atrás, cuenta (`passed` se evalúa antes que la colisión).
- **Generación sin solución:** como mucho 5 reintentos y después el fallback a una barra corta, que siempre es alcanzable.
- **Cambio de pestaña o pausa larga:** `DT_CAP` y `MAX_STEPS` evitan saltos, y `resume()` pone `acc = 0`.
- **`destroy()` repetido o `restart()` después de `destroy()`:** no-op seguro.

---

## Implementation plan

Cada paso deja la app compilando y navegable.

1. **Prototipo vanilla.** Crear `references/started-games/10-gravity-flap/` (`index.html` + `game.js`) con las constantes, mecánicas, generación justa, estados y timestep fijo de este Data model. Controles: Espacio/flechas/W/S y clic. Calibrar ahí `GRAVITY`, `MAX_VY`, `OBST_SPACING` y `MAX_SWING`, jugando hasta el nivel 10 o más.
2. **Paleta.** Crear `app/lib/games/aleteo-inverso/palette.ts` con `ALETEO_INVERSO_PALETTE` (valores provisionales).
3. **Portar el motor.** Crear `app/lib/games/aleteo-inverso/engine.ts` que exporte `createAleteoInversoGame: GameFactory`, sin estado global. Todo el estado va en el closure: `bird {y, vy, prevY, flipAnim}`, `gSign`, `flipCooldown`, `flipQueued`, `obstacles[]` (con `type`, `x`, `prevX`, la geometría, `passed` y la chispa opcional con `taken`), `trail[]`, `particles[]`, `score`, `sparks`, `passedCount`, `level`, `speed`, `state`, `acc`, `lastTime`, `rafId`, `rng`, `dyingT`, `overEmitted` y los últimos valores emitidos. El canvas llega por parámetro, a `800×600` y con `alpha: false`. Los listeners se añaden en `start()` y se quitan en `destroy()`. Se eliminan del prototipo los textos de GAME OVER y el reinicio por tecla. Constantes 1:1 con el prototipo calibrado.
4. **Registrar.** En `app/lib/games/registry.ts`: `import { createAleteoInversoGame } from "./aleteo-inverso/engine";`, la línea `"aleteo-inverso": createAleteoInversoGame` (con comillas, por el guion) y la mención en el comentario de cabecera.
5. **Táctil.** En `app/lib/games/touch-map.ts`, añadir `"aleteo-inverso"` con un único botón `{ label: "⇅", code: "Space", key: " ", hold: false, slot: "action-a" }` y su línea en el comentario de esquemas. No se toca `TouchControls.tsx`.
6. **Referencia.** Añadir a `references/implemented-games.md` la fila `| \`aleteo-inverso\` | ALETEO INVERSO | ARCADE | Un toque invierte la gravedad: esquiva los rieles y caza chispas. | \`app/lib/games/aleteo-inverso/engine.ts\` |`.
7. **Afinado visual con `/frontend-design`.** Paleta, rieles activos e inactivos (deben leerse claramente como "hacia aquí tira la gravedad"), pájaro volteado, chispas y estela sobre el CRT oscuro.
8. **Verificación manual** según los Acceptance criteria, en desktop y en emulación móvil, con `?debug=perf`.

> No se regenera `database.types.ts` ni se corre `get_advisors`: no se toca Supabase.

---

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de tipos de ruta, y `npm run lint` pasa.
- [ ] Existe `references/started-games/10-gravity-flap/` con el juego vanilla jugable abriendo su `index.html`.
- [ ] `app/lib/games/aleteo-inverso/engine.ts` exporta `createAleteoInversoGame`, no usa estado global de módulo ni `document.getElementById`, fija el canvas a `800×600` y usa `{ alpha: false }` sin artefactos.
- [ ] `getGameEngine("aleteo-inverso")` deja de devolver `null`. Los motores existentes (y `aleteo`, si está implementado) siguen funcionando, y los demás ids siguen como maqueta.
- [ ] En `/jugar/aleteo-inverso` el juego arranca en `idle`. La primera pulsación inicia la partida con la gravedad hacia abajo y cada pulsación posterior la invierte: el pájaro **frena y cambia de sentido con inercia** (no salta de golpe), se dibuja volteado y el riel activo cambia de brillo.
- [ ] Tocar el riel superior o el inferior mata al pájaro. Las barras de techo y de suelo y los bloques flotantes aparecen mezclados, y nunca hay más de 2 del mismo tipo seguidos.
- [ ] Superar un obstáculo suma +10 y recoger una chispa suma +25. El HUD de React refleja la puntuación, las vidas (`1` jugando, `0` al morir) y el nivel (sube cada 8 obstáculos, con más velocidad).
- [ ] Al nivel 10 o más (unos 335 px/s) todos los obstáculos siguen siendo alcanzables con buena anticipación: en 10 partidas de prueba no aparece ninguna configuración imposible.
- [ ] Pulsar dos veces en menos de 100 ms invierte la gravedad una sola vez, y mantener una tecla pulsada no invierte en ráfaga.
- [ ] Con el monitor a 60 Hz y a 144 Hz (o throttling de CPU), la trayectoria tras una inversión es idéntica (timestep fijo).
- [ ] Al morir se ve la desintegración y después se abre el modal con la puntuación real, emitida una sola vez. "JUGAR DE NUEVO" reinicia limpio a `idle` (score 0, nivel 1, gravedad neutra, sin obstáculos).
- [ ] PAUSA/REANUDAR no provoca salto y conserva el sentido de la gravedad y la velocidad vertical.
- [ ] Ni las flechas ni Espacio hacen scroll de la página.
- [ ] En `pointer: coarse` aparece el botón `⇅` y funciona, y tocar el canvas también invierte la gravedad. En desktop el overlay no aparece.
- [ ] Al navegar fuera, `destroy()` cancela el RAF y quita todos los listeners. Al volver a entrar no hay loop duplicado.
- [ ] Con `?debug=perf`, unos 16 ms/frame en desktop. En móvil o con reduced-motion, el glow queda atenuado.
- [ ] El leaderboard de `aleteo-inverso` muestra las filas sembradas, y enviar la puntuación desde el modal (`POST /api/scores` con `{ gameId: "aleteo-inverso", name, score }`) inserta la fila, que aparece al recargar.

---

## Decisions

- **Sí:** el twist es **inversión de gravedad con inercia**, no un simple "Flappy boca abajo". Conservar `vy` al invertir convierte el reflejo en anticipación y hace que esta variante se juegue de forma distinta a la clásica, que era el requisito de la jam (variantes mecánicamente distintas y no duplicadas). Se descarta poner `vy = 0` al invertir (quedaría demasiado parecido a un aletazo).
- **Sí:** los dos rieles son mortales. Con la gravedad en ambos sentidos, un borde "seguro" permitiría quedarse pegado a él indefinidamente.
- **Sí:** obstáculos de un solo lado y flotantes en vez de tuberías con hueco: obligan a decidir de qué lado pasar y aprovechan que la gravedad puede apuntar a cualquiera de los dos.
- **Sí:** chispas +25 en la línea arriesgada, para que la puntuación premie la ambición y no solo la duración. Esto diferencia el ranking del de `aleteo`.
- **Sí (supuesto documentado):** `FLIP_COOLDOWN = 0.10` s con descarte (sin búfer). Limita el "vibrado" de autoclicker sin que un jugador humano lo note. Se descarta el búfer porque produciría inversiones tardías inesperadas.
- **Sí (supuesto documentado):** la primera pulsación arranca con la gravedad hacia abajo, sin invertir, porque es la lectura más intuitiva ("empieza a caer"). El texto de `idle` lo deja claro.
- **Sí (supuesto documentado):** el riel activo se resalta como pista visual permanente del sentido de la gravedad. Sin ella, tras varias inversiones rápidas es fácil perder la cuenta.
- **Sí:** un timestep fijo de 120 Hz, por la misma razón de equidad que en el clásico: con inercia, la trayectoria depende aún más de una integración estable.
- **Sí:** `pointerdown` en el canvas más `TOUCH_MAP`, con la misma desviación consciente de SPEC 13 documentada en `02-motor-aleteo`: es un motor nuevo y de un botón.
- **Sí:** el prototipo va en `references/started-games/10-gravity-flap`, el siguiente número libre después de `09-flappy`.
- **No:** compartir código con `aleteo`. Son autocontenidos para poder implementarlos por separado; un núcleo común (loop de timestep fijo, PRNG) sería una spec de refactor si llegan los dos.
- **No:** power-ups (escudo, imán, cámara lenta). Ampliarían el alcance más allá de un juego "barato" de un botón; si se quieren, van en una spec de pulido.
- **No:** tocar el catálogo, la portada o `scores` (van en la spec hermana `03`).

---

## Risks

| Riesgo                                                                                        | Mitigación                                                                                                                                              |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La inercia hace el juego frustrante ("no me da tiempo a frenar").                             | Calibrar `GRAVITY`/`MAX_VY`/`OBST_SPACING` en el prototipo. `MAX_SWING` acota la exigencia, y un criterio de aceptación exige 10 partidas sin configuraciones imposibles. |
| El generador produce obstáculos encadenados inalcanzables con la inercia.                     | `MAX_SWING`, `PASS_MIN`, un máximo de 2 repeticiones de tipo, 5 reintentos y un fallback a una barra corta.                                            |
| El jugador pierde la referencia del sentido de la gravedad.                                   | Riel activo resaltado, pájaro volteado y la estela, tres pistas redundantes.                                                                            |
| Física dependiente del framerate.                                                             | Timestep fijo a 120 Hz con acumulador y criterio de 60 frente a 144 Hz.                                                                                |
| Un autoclicker o pulsaciones rápidas permiten "flotar" quieto.                                | `FLIP_COOLDOWN` más barras de hasta el 60 % del campo, que cortan cualquier altura fija. El anti-cheat va en otra spec.                                |
| Doble inversión por un mismo toque (overlay y canvas) o por la autorrepetición del teclado.   | Un `pointerdown` tiene un único target, se ignora `e.repeat` y el cooldown cubre cualquier resto.                                                       |
| El slug con guion rompe la clave del registry o del touch-map.                                | Clave entre comillas (`"aleteo-inverso"`), como `"bloque-buster"`; un criterio de aceptación comprueba `getGameEngine("aleteo-inverso")`.              |
| Fugas de RAF o listeners.                                                                     | `destroy()` cancela el RAF y quita los listeners de `window` y del canvas; cleanup en el `useEffect` de `CanvasGame`.                                   |
| Glow de rieles, chispas y estela caro en móvil.                                               | Una sola pasada de glow por grupo, multiplicada por `glowScale()`; la estela sin `shadowBlur`.                                                          |

---

## Qué **no** está en esta spec

- Alta de la fila `games`, siembra de `scores` y portada `.cover-aleteo-inverso` (van en `03-catalogo-leaderboard-aleteo-inverso`).
- La variante clásica `aleteo` y cualquier código compartido.
- Skins seleccionables y su entrada en `skins.ts`.
- Power-ups, jefes, sonido y mejor marca local.
- Anti-cheat y verificación server-side de puntuaciones; auth real.
- Cambios en `CanvasGame.tsx`, `GamePlayer.tsx`, `TouchControls.tsx` u otros motores.

Cada uno de esos, si llega, va en su propia spec.
