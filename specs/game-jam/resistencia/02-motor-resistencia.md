# SPEC 02 (game-jam/resistencia) — Motor de Enduro para "RESISTENCIA"

> **Status:** Draft
> **Depends on:** SPEC 05, 01-catalogo-leaderboard-resistencia
> **Date:** 2026-11-23
> **Objective:** Construir y portar un motor de Enduro a `app/lib/games/resistencia/engine.ts` y registrarlo, de modo que `resistencia` (RESISTENCIA), dado de alta en catálogo y leaderboard por `01-catalogo-leaderboard-resistencia`, se convierta en jugable reusando el patrón de motor de la SPEC 05.

---

## Por qué existe esta spec

`01-catalogo-leaderboard-resistencia` deja a RESISTENCIA presente en el catálogo (home, biblioteca, salón, detalle) y con su leaderboard sembrado, pero sin motor: `/jugar/resistencia` muestra la maqueta genérica. Esta spec entrega el **motor jugable**: un Enduro en canvas con scroll vertical donde conduces un bólido con control continuo (aceleración, frenado y movimiento lateral libre, no saltos por rejilla), adelantando tráfico bajo un ciclo de día/noche y clima. Reusa el patrón de la SPEC 05 (fábrica `GameFactory` sin estado global, canvas por parámetro, callbacks `onScore/onLives/onLevel/onGameOver`, ciclo `start/pause/resume/restart/destroy`), igual que lo replicaron las SPEC 07/08/09 y la spec hermana `02-motor-turbovia`.

En `references/started-games/` solo hay `02-asteroids`, `03-tetris`, `04-arkanoid` y `05-snake` (todos ya portados): **no existe un prototipo de Enduro**. Por eso esta spec **necesita un prototipo nuevo**, que se construye en `references/started-games/09-enduro` y se porta desde ahí, como paso previo (igual que la SPEC 09 construyó `05-snake` antes de portarlo).

---

## Scope

**In:**

- Construir un prototipo vanilla de Enduro en `references/started-games/09-enduro` (`index.html` + `game.js`), verificable fuera de React, como fuente del port.
- Portar ese `game.js` → `app/lib/games/resistencia/engine.ts` como `createResistenciaGame: GameFactory`, sin estado global de módulo, con el canvas por parámetro.
- Registrar el motor en `app/lib/games/registry.ts`: `"resistencia": createResistenciaGame`.

**Out of scope (para futuras specs):**

- Alta en `games`, siembra de `scores` y portada `.cover-resistencia`: van en `01-catalogo-leaderboard-resistencia`.
- Sonido, controles táctiles/móviles, anti-cheat, auth real / vincular scores a usuario.
- Tocar los motores de ROCAS (SPEC 05), CAÍDA (SPEC 07), BLOQUE BUSTER (SPEC 08), SERPENTINA (SPEC 09) o TURBOVÍA (`game-jam/turbovia`), ni `CanvasGame.tsx` / `GamePlayer.tsx`.

---

## Data model

Esta spec **no toca Supabase** (el alta y la siembra son de la spec hermana). El único "modelo" que introduce es el **contrato de motor** (de `app/lib/games/types.ts`, no se redefine):

```ts
// app/lib/games/resistencia/engine.ts → cumple GameFactory
const createResistenciaGame: GameFactory = (canvas, callbacks): GameEngine => {
  /* ... */
};
```

**Resolución y mundo.** Canvas interno `800×600`. Carretera vertical centrada con arcenes a ambos lados, scroll vertical descendente que simula el avance del bólido. El coche del jugador vive en la franja inferior, con control **continuo**: izquierda/derecha mueven el carril libremente (no por rejilla), arriba acelera, abajo frena. El tráfico (coches más lentos) desciende por la pantalla en varios carriles; un ciclo de **jornada** (día → atardecer → noche → amanecer) y de **clima** (despejado → lluvia → niebla → nieve) reduce visibilidad/tracción conforme avanza la partida.

**Mapeo de mecánicas → callbacks:**

- `onScore(score)` — acumulado por **distancia recorrida** (metros × factor) más **bonus por cada coche adelantado**. Coherente con el `best = 54200` sembrado.
- `onLives(lives)` — arranca en `3`. Cada jornada exige adelantar una **cuota de coches** antes de que se agote un contador de distancia; un choque contra el tráfico o el arcén a alta velocidad, o **no cumplir la cuota de la jornada**, descuenta una vida: el bólido da un trompo y reaparece ralentizado con una breve invencibilidad. `onLives(0)` en el último fallo. _(Supuesto documentado: el Enduro arcade original no tiene "vidas" sino un fin de partida directo al fallar la cuota del día; aquí se mapea a 3 vidas para que el HUD compartido score/vidas/nivel sea coherente con el resto del catálogo.)_
- `onLevel(level)` — arranca en `1`; sube en `1` cada **jornada superada** (cuota de coches cumplida a tiempo), lo que adelanta el ciclo día/noche/clima y aumenta la densidad y velocidad del tráfico.
- `onGameOver(finalScore)` — una sola vez, al perder la última vida.

---

## Implementation plan

Cada paso deja la app compilando y navegable.

1. **Prototipo vanilla.** Crear `references/started-games/09-enduro/` con `index.html` + `game.js`: Enduro en canvas `800×600`, carretera con scroll vertical, bólido del jugador con control continuo (lateral libre + acelerar/frenar), tráfico que desciende en varios carriles, cuota de coches a adelantar por jornada con contador de distancia, ciclo día/noche/clima que reduce visibilidad/tracción, colisión con tráfico y arcenes, 3 vidas con invencibilidad breve al reaparecer, score por distancia + adelantamientos. Controles de flechas. Verificable abriendo el `index.html`.
2. **Portar el motor.** Crear `app/lib/games/resistencia/engine.ts` como `createResistenciaGame: GameFactory`, SIN estado global de módulo: encapsular todo el estado (`player {x,y,speed}`, `traffic[]`, `distance`, `jornada`, `cuota`, `clima`, `score`, `lives`, `level`, `scrollY`, `state`) en el closure; recibir `canvas`/`ctx` por parámetro (no `getElementById`); fijar `canvas.width/height` a `800×600`. Mover el tráfico a estructuras/clases internas. Listeners de teclado (flechas + WASD, con `preventDefault` para las teclas del juego) añadidos en `start()` y quitados en `destroy()`. RAF cancelable (`rafId` nullable, `startLoop`/`stopLoop`), `dt` cap `0.05`, `lastTime` reseteado al (re)arrancar. `syncReactState()` que difunde `onScore/onLives/onLevel` solo ante cambios y `onGameOver` una vez. Quitar cualquier "pulsa tecla para reiniciar" del prototipo (lo gobierna el modal de React vía `restart()`). Preservar constantes y feel (velocidades, aceleración, invencibilidad, factor de score, duración de jornada).
3. **Registrar.** En `app/lib/games/registry.ts`: `import { createResistenciaGame } from "./resistencia/engine";` + línea `"resistencia": createResistenciaGame`. (El reproductor ya lo recoge por `id`; no se tocan `CanvasGame.tsx` ni `GamePlayer.tsx`.)
4. **Verificación manual** (ver Acceptance criteria).

> No se regenera `database.types.ts` (no cambia el esquema) ni se corre `get_advisors` (no se toca Supabase).

---

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de tipos de ruta.
- [ ] Existe `references/started-games/09-enduro/` con un Enduro vanilla jugable abriendo su `index.html`.
- [ ] En `/jugar/resistencia` se juega el Enduro real en canvas `800×600`: el bólido se mueve lateralmente de forma continua con flechas/WASD, acelera/frena, la carretera hace scroll vertical y el tráfico desciende por carriles.
- [ ] El HUD de React (`.player-hud`) refleja score real (distancia + adelantamientos), vidas (arranca en 3, baja al fallar) y nivel (sube por jornada superada).
- [ ] Chocar contra el tráfico o el arcén a alta velocidad, o no cumplir la cuota de la jornada, descuenta una vida con breve invencibilidad al reaparecer; perder la última abre el modal de fin con la puntuación real; "JUGAR DE NUEVO" reinicia limpio (3 vidas, score 0, nivel 1, jornada 1) sin saltos.
- [ ] El ciclo día/noche/clima avanza visiblemente con el nivel y reduce la visibilidad sin romper la jugabilidad (el jugador sigue viendo su carril y el tráfico inmediato).
- [ ] PAUSA/REANUDAR no provoca salto de simulación (el tráfico no da un salto al reanudar).
- [ ] `engine.ts` no usa estado global ni `document.getElementById`; al navegar fuera, `destroy()` cancela el RAF y quita los listeners; reentrar no duplica el loop ni acumula velocidad.
- [ ] `resistencia` resuelve a un motor en `registry.ts`; `rocas`, `caida`, `bloque-buster` y `serpentina` siguen jugables y el resto de ids siguen como maqueta.
- [ ] El leaderboard de `resistencia` en `/salon` y en `/juego/resistencia` sigue mostrando las filas sembradas; `POST /api/scores` con `{ gameId: "resistencia", name, score }` válido inserta y aparece.

---

## Decisions

- **Sí:** reusar el patrón SPEC 05 (motor por `GameFactory` + registro) tal como lo replicaron SPEC 07/08/09 y `02-motor-turbovia`.
- **Sí:** construir primero el prototipo en `references/started-games/09-enduro` (no existía) y portarlo desde ahí, para tener una referencia vanilla verificable como los demás juegos.
- **Sí (supuesto documentado, decidido de forma autónoma sin entrevista):** mapear Enduro a **3 vidas + invencibilidad** en vez del fin de partida directo del arcade original, para que el HUD compartido score/vidas/nivel nunca salga incoherente con el resto del catálogo.
- **Sí (supuesto documentado):** `onScore` = distancia + adelantamientos; `onLevel` = jornadas superadas, que aceleran el ciclo día/noche/clima y densifican el tráfico; coherente con el `best = 54200` sembrado.
- **Sí (supuesto documentado):** control **lateral libre** (no por carriles discretos) para diferenciarlo claramente del control por rejilla de RANARIA (Frogger) y mantener la esencia de "control continuo de vehículo" del tema de la jam.
- **No:** tocar catálogo, portada o `scores` de `resistencia` (van en la spec hermana `01`).
- **No:** sonido, táctil, anti-cheat, auth real — cada uno en su propia spec.

---

## Risks

| Riesgo                                                                                                | Mitigación                                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No existe prototipo de Enduro: hay que construirlo, con riesgo de feel distinto al arcade.            | Construir `09-enduro` vanilla y verificarlo jugando antes de portar; preservar sus constantes (velocidades, cuotas, duración de jornada) 1:1 en el port.           |
| El ciclo día/noche/clima reduce tanto la visibilidad que el juego se vuelve injugable.                | Calibrar los mínimos de visibilidad en el prototipo (siempre visible el carril propio y el tráfico inmediato) antes del port; verificación manual del ritmo.       |
| La detección de colisión a alta velocidad falla si el tráfico se mueve mucho por frame (tunneling).   | Limitar el desplazamiento por frame con el `dt` cap 0.05 y usar colisión por solape de cajas con un margen; verificación manual a velocidad máxima.                |
| Fugas de RAF/listeners al montar/desmontar en el App Router.                                          | `destroy()` cancela el RAF y quita listeners; el `useEffect` de `CanvasGame` retorna ese cleanup.                                                                   |
| `INSERT` público en `scores` permite spam.                                                            | `check` de rango/longitud (SPEC 06); sin `UPDATE/DELETE`. Endurecer con auth + anti-cheat en otra spec.                                                             |

---

## Qué **no** está en esta spec

- Alta de la fila `games`, siembra de `scores` y portada `.cover-resistencia` (van en `01-catalogo-leaderboard-resistencia`).
- Sonido y efectos de audio.
- Controles táctiles / móviles.
- Anti-cheat / verificación server-side de puntuaciones.
- Auth real y vincular scores a un usuario.

Cada uno de esos, si llega, va en su propia spec.
