# SPEC 02 (game-jam/caudal) — Motor de River Raid para "CAUDAL"

> **Status:** Draft
> **Depends on:** SPEC 05, 01-catalogo-leaderboard-caudal
> **Date:** 2026-11-23
> **Objective:** Construir y portar un motor de River Raid a `app/lib/games/caudal/engine.ts` y registrarlo, de modo que `caudal` (CAUDAL), dado de alta en catálogo y leaderboard por `01-catalogo-leaderboard-caudal`, se convierta en jugable reusando el patrón de motor de la SPEC 05.

---

## Por qué existe esta spec

`01-catalogo-leaderboard-caudal` deja a CAUDAL presente en el catálogo (home, biblioteca, salón, detalle) y con su leaderboard sembrado, pero sin motor: `/jugar/caudal` muestra la maqueta genérica. Esta spec entrega el **motor jugable**: un River Raid en canvas con scroll vertical donde pilotas un caza ligero con control continuo (lateral + disparo), esquivando el cauce del río y repostando/combatiendo contra objetivos. Reusa el patrón de la SPEC 05 (fábrica `GameFactory` sin estado global, canvas por parámetro, callbacks `onScore/onLives/onLevel/onGameOver`, ciclo `start/pause/resume/restart/destroy`), igual que lo replicaron las SPEC 07/08/09 y la spec hermana `02-motor-turbovia`.

En `references/started-games/` solo hay `02-asteroids`, `03-tetris`, `04-arkanoid` y `05-snake` (todos ya portados): **no existe un prototipo de River Raid**. Por eso esta spec **necesita un prototipo nuevo**, que se construye en `references/started-games/10-river-raid` y se porta desde ahí, como paso previo (igual que la SPEC 09 construyó `05-snake` antes de portarlo).

---

## Scope

**In:**

- Construir un prototipo vanilla de River Raid en `references/started-games/10-river-raid` (`index.html` + `game.js`), verificable fuera de React, como fuente del port.
- Portar ese `game.js` → `app/lib/games/caudal/engine.ts` como `createCaudalGame: GameFactory`, sin estado global de módulo, con el canvas por parámetro.
- Registrar el motor en `app/lib/games/registry.ts`: `"caudal": createCaudalGame`.

**Out of scope (para futuras specs):**

- Alta en `games`, siembra de `scores` y portada `.cover-caudal`: van en `01-catalogo-leaderboard-caudal`.
- Sonido, controles táctiles/móviles, anti-cheat, auth real / vincular scores a usuario.
- Tocar los motores de ROCAS (SPEC 05), CAÍDA (SPEC 07), BLOQUE BUSTER (SPEC 08), SERPENTINA (SPEC 09) o TURBOVÍA/RESISTENCIA (`game-jam/turbovia`, `game-jam/resistencia`), ni `CanvasGame.tsx` / `GamePlayer.tsx`.

---

## Data model

Esta spec **no toca Supabase** (el alta y la siembra son de la spec hermana). El único "modelo" que introduce es el **contrato de motor** (de `app/lib/games/types.ts`, no se redefine):

```ts
// app/lib/games/caudal/engine.ts → cumple GameFactory
const createCaudalGame: GameFactory = (canvas, callbacks): GameEngine => {
  /* ... */
};
```

**Resolución y mundo.** Canvas interno `800×600`. Río vertical con orillas irregulares (ancho variable por tramo) que hace scroll descendente; puentes atravesados periódicamente (destruibles a tiro, bloquean el paso mientras existen), islas, depósitos de combustible y enemigos (barcos/helicópteros) que aparecen y descienden. El caza del jugador vive en la franja inferior, con control **continuo** lateral y disparo vertical hacia arriba.

**Mapeo de mecánicas → callbacks:**

- `onScore(score)` — acumulado por **distancia recorrida** (metros × factor) más **puntos por depósito/enemigo destruido**. Coherente con el `best = 71300` sembrado.
- `onLives(lives)` — arranca en `3`. El combustible se consume con el tiempo y se repone al destruir un depósito; chocar contra la orilla, un puente en pie, una isla o un enemigo, o **quedarse sin combustible**, descuenta una vida: el caza estalla y reaparece con combustible parcial y una breve invencibilidad. `onLives(0)` en el último choque. _(Supuesto documentado: el River Raid arcade original termina la partida directamente al perder el avión; aquí se mapea a 3 vidas para que el HUD compartido score/vidas/nivel sea coherente con el resto del catálogo.)_
- `onLevel(level)` — arranca en `1`; sube en `1` cada **tramo de distancia** superado (p. ej. cada 1000 m), estrechando el cauce y aumentando la densidad de puentes/enemigos.
- `onGameOver(finalScore)` — una sola vez, al perder la última vida.

---

## Implementation plan

Cada paso deja la app compilando y navegable.

1. **Prototipo vanilla.** Crear `references/started-games/10-river-raid/` con `index.html` + `game.js`: River Raid en canvas `800×600`, río con scroll vertical y ancho de cauce variable, caza del jugador con control continuo lateral + disparo vertical, puentes destruibles a tiro, depósitos de combustible que repostan al destruirlos, enemigos (barcos/helicópteros) que aparecen y descienden, medidor de combustible que baja con el tiempo, colisión con orillas/islas/puentes/enemigos, 3 vidas con invencibilidad breve al reaparecer, score por distancia + objetivos destruidos, tramos que estrechan el río y densifican enemigos. Controles de flechas + barra espaciadora para disparar. Verificable abriendo el `index.html`.
2. **Portar el motor.** Crear `app/lib/games/caudal/engine.ts` como `createCaudalGame: GameFactory`, SIN estado global de módulo: encapsular todo el estado (`player {x,y}`, `bullets[]`, `riverSegments[]`, `fuelDepots[]`, `enemies[]`, `fuel`, `distance`, `score`, `lives`, `level`, `scrollY`, `state`) en el closure; recibir `canvas`/`ctx` por parámetro (no `getElementById`); fijar `canvas.width/height` a `800×600`. Mover depósitos/enemigos/proyectiles a estructuras/clases internas. Listeners de teclado (flechas + WASD + Espacio, con `preventDefault` para las teclas del juego) añadidos en `start()` y quitados en `destroy()`. RAF cancelable (`rafId` nullable, `startLoop`/`stopLoop`), `dt` cap `0.05`, `lastTime` reseteado al (re)arrancar. `syncReactState()` que difunde `onScore/onLives/onLevel` solo ante cambios y `onGameOver` una vez. Quitar cualquier "pulsa tecla para reiniciar" del prototipo (lo gobierna el modal de React vía `restart()`). Preservar constantes y feel (velocidades, consumo de combustible, puntos por objetivo, ancho mínimo/máximo del cauce).
3. **Registrar.** En `app/lib/games/registry.ts`: `import { createCaudalGame } from "./caudal/engine";` + línea `"caudal": createCaudalGame`. (El reproductor ya lo recoge por `id`; no se tocan `CanvasGame.tsx` ni `GamePlayer.tsx`.)
4. **Verificación manual** (ver Acceptance criteria).

> No se regenera `database.types.ts` (no cambia el esquema) ni se corre `get_advisors` (no se toca Supabase).

---

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de tipos de ruta.
- [ ] Existe `references/started-games/10-river-raid/` con un River Raid vanilla jugable abriendo su `index.html`.
- [ ] En `/jugar/caudal` se juega el River Raid real en canvas `800×600`: el caza se mueve lateralmente de forma continua con flechas/WASD, dispara con Espacio, el río hace scroll vertical con ancho variable y aparecen puentes/depósitos/enemigos.
- [ ] El HUD de React (`.player-hud`) refleja score real (distancia + objetivos destruidos), vidas (arranca en 3, baja al chocar o quedarse sin combustible) y nivel (sube por tramo de distancia).
- [ ] Destruir un depósito de combustible repone el medidor de combustible; agotarlo, o chocar contra orilla/isla/puente/enemigo, descuenta una vida con breve invencibilidad al reaparecer; perder la última abre el modal de fin con la puntuación real; "JUGAR DE NUEVO" reinicia limpio (3 vidas, score 0, nivel 1, combustible lleno) sin saltos.
- [ ] Disparar destruye puentes, depósitos y enemigos dentro de su rango, otorgando puntos; los proyectiles se limpian al salir de pantalla.
- [ ] PAUSA/REANUDAR no provoca salto de simulación (los enemigos y el río no dan un salto al reanudar).
- [ ] `engine.ts` no usa estado global ni `document.getElementById`; al navegar fuera, `destroy()` cancela el RAF y quita los listeners; reentrar no duplica el loop ni acumula velocidad.
- [ ] `caudal` resuelve a un motor en `registry.ts`; `rocas`, `caida`, `bloque-buster` y `serpentina` siguen jugables y el resto de ids siguen como maqueta.
- [ ] El leaderboard de `caudal` en `/salon` y en `/juego/caudal` sigue mostrando las filas sembradas; `POST /api/scores` con `{ gameId: "caudal", name, score }` válido inserta y aparece.

---

## Decisions

- **Sí:** reusar el patrón SPEC 05 (motor por `GameFactory` + registro) tal como lo replicaron SPEC 07/08/09 y `02-motor-turbovia`.
- **Sí:** construir primero el prototipo en `references/started-games/10-river-raid` (no existía) y portarlo desde ahí, para tener una referencia vanilla verificable como los demás juegos.
- **Sí (supuesto documentado, decidido de forma autónoma sin entrevista):** mapear River Raid a **3 vidas + invencibilidad** en vez del fin de partida directo del arcade original, para que el HUD compartido score/vidas/nivel nunca salga incoherente con el resto del catálogo.
- **Sí (supuesto documentado):** `onScore` = distancia + objetivos destruidos; `onLevel` = tramos de distancia que estrechan el río y densifican enemigos; coherente con el `best = 71300` sembrado.
- **Sí (supuesto documentado):** categorizar como SHOOTER (dispara activamente a depósitos/enemigos), distinto del esquive puro de RESISTENCIA/TURBOVÍA (ARCADE), para dar variedad de categoría dentro de la tanda.
- **No:** tocar catálogo, portada o `scores` de `caudal` (van en la spec hermana `01`).
- **No:** sonido, táctil, anti-cheat, auth real — cada uno en su propia spec.

---

## Risks

| Riesgo                                                                                                | Mitigación                                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No existe prototipo de River Raid: hay que construirlo, con riesgo de feel distinto al arcade.       | Construir `10-river-raid` vanilla y verificarlo jugando antes de portar; preservar sus constantes (velocidades, consumo de combustible, puntos) 1:1 en el port.   |
| El ancho de cauce variable puede generar pasos imposibles (sin espacio para el caza).                | Generar el cauce con un ancho mínimo garantizado por tramo en el prototipo; verificación manual recorriendo varios tramos.                                        |
| La detección de colisión a alta velocidad falla si enemigos/proyectiles se mueven mucho por frame.   | Limitar el desplazamiento por frame con el `dt` cap 0.05 y usar colisión por solape de cajas con un margen; verificación manual a velocidad máxima.                |
| Fugas de RAF/listeners al montar/desmontar en el App Router.                                          | `destroy()` cancela el RAF y quita listeners; el `useEffect` de `CanvasGame` retorna ese cleanup.                                                                   |
| `INSERT` público en `scores` permite spam.                                                            | `check` de rango/longitud (SPEC 06); sin `UPDATE/DELETE`. Endurecer con auth + anti-cheat en otra spec.                                                             |

---

## Qué **no** está en esta spec

- Alta de la fila `games`, siembra de `scores` y portada `.cover-caudal` (van en `01-catalogo-leaderboard-caudal`).
- Sonido y efectos de audio.
- Controles táctiles / móviles.
- Anti-cheat / verificación server-side de puntuaciones.
- Auth real y vincular scores a un usuario.

Cada uno de esos, si llega, va en su propia spec.
