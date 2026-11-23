# SPEC 02 (game-jam/interceptor) — Motor de Spy Hunter para "INTERCEPTOR"

> **Status:** Draft
> **Depends on:** SPEC 05, 01-catalogo-leaderboard-interceptor
> **Date:** 2026-11-23
> **Objective:** Construir y portar un motor de Spy Hunter a `app/lib/games/interceptor/engine.ts` y registrarlo, de modo que `interceptor` (INTERCEPTOR), dado de alta en catálogo y leaderboard por `01-catalogo-leaderboard-interceptor`, se convierta en jugable reusando el patrón de motor de la SPEC 05.

---

## Por qué existe esta spec

`01-catalogo-leaderboard-interceptor` deja a INTERCEPTOR presente en el catálogo (home, biblioteca, salón, detalle) y con su leaderboard sembrado, pero sin motor: `/jugar/interceptor` muestra la maqueta genérica. Esta spec entrega el **motor jugable**: un Spy Hunter en canvas con scroll vertical donde conduces con control continuo por una autopista de varios carriles, esquivando tráfico civil y combatiendo contra agentes rivales que maniobran activamente para interceptarte. Reusa el patrón de la SPEC 05 (fábrica `GameFactory` sin estado global, canvas por parámetro, callbacks `onScore/onLives/onLevel/onGameOver`, ciclo `start/pause/resume/restart/destroy`), igual que lo replicaron las SPEC 07/08/09 y las specs hermanas `02-motor-turbovia`/`02-motor-resistencia`/`02-motor-caudal`.

En `references/started-games/` solo hay `02-asteroids`, `03-tetris`, `04-arkanoid` y `05-snake` (todos ya portados): **no existe un prototipo de Spy Hunter**. Por eso esta spec **necesita un prototipo nuevo**, que se construye en `references/started-games/11-spy-hunter` y se porta desde ahí, como paso previo (igual que la SPEC 09 construyó `05-snake` antes de portarlo).

---

## Scope

**In:**

- Construir un prototipo vanilla de Spy Hunter en `references/started-games/11-spy-hunter` (`index.html` + `game.js`), verificable fuera de React, como fuente del port.
- Portar ese `game.js` → `app/lib/games/interceptor/engine.ts` como `createInterceptorGame: GameFactory`, sin estado global de módulo, con el canvas por parámetro.
- Registrar el motor en `app/lib/games/registry.ts`: `"interceptor": createInterceptorGame`.

**Out of scope (para futuras specs):**

- Alta en `games`, siembra de `scores` y portada `.cover-interceptor`: van en `01-catalogo-leaderboard-interceptor`.
- Sonido, controles táctiles/móviles, anti-cheat, auth real / vincular scores a usuario.
- Tocar los motores de ROCAS (SPEC 05), CAÍDA (SPEC 07), BLOQUE BUSTER (SPEC 08), SERPENTINA (SPEC 09) o TURBOVÍA/RESISTENCIA/CAUDAL (`game-jam/turbovia`, `game-jam/resistencia`, `game-jam/caudal`), ni `CanvasGame.tsx` / `GamePlayer.tsx`.

---

## Data model

Esta spec **no toca Supabase** (el alta y la siembra son de la spec hermana). El único "modelo" que introduce es el **contrato de motor** (de `app/lib/games/types.ts`, no se redefine):

```ts
// app/lib/games/interceptor/engine.ts → cumple GameFactory
const createInterceptorGame: GameFactory = (canvas, callbacks): GameEngine => {
  /* ... */
};
```

**Resolución y mundo.** Canvas interno `800×600`. Autopista vertical de 3–4 carriles con scroll descendente. El coche espía del jugador vive en la franja inferior, con control **continuo** lateral entre carriles y aceleración/freno. Tráfico civil neutro desciende por los carriles (solo estorba); agentes rivales (identificables por color/silueta) aparecen periódicamente y **persiguen activamente** al jugador: cambian de carril para embestirlo o dispararle. Una furgoneta de apoyo aparece de vez en cuando con power-ups de arma (ametralladora, aceite para la calzada) recogibles al alcanzarla.

**Mapeo de mecánicas → callbacks:**

- `onScore(score)` — acumulado por **distancia recorrida** (metros × factor) más **puntos por agente rival destruido**. Coherente con el `best = 68900` sembrado.
- `onLives(lives)` — arranca en `3`. El coche tiene un medidor de **blindaje** que baja con cada impacto/embestida de un rival; al llegar a cero, o tras un choque fuerte directo contra tráfico civil/arcén, se descuenta una vida: el coche "revienta" y reaparece con blindaje completo y una breve invencibilidad. `onLives(0)` en el último impacto. _(Supuesto documentado: el Spy Hunter arcade original no tiene "vidas" sino un medidor de daño con fin de partida directo; aquí se mapea a 3 vidas + blindaje para que el HUD compartido score/vidas/nivel sea coherente con el resto del catálogo.)_
- `onLevel(level)` — arranca en `1`; sube en `1` cada **oleada de agentes rivales** superada (p. ej. tras destruir/evadir un número de rivales o cada tramo de distancia), aumentando la frecuencia y agresividad de los rivales.
- `onGameOver(finalScore)` — una sola vez, al perder la última vida.

---

## Implementation plan

Cada paso deja la app compilando y navegable.

1. **Prototipo vanilla.** Crear `references/started-games/11-spy-hunter/` con `index.html` + `game.js`: Spy Hunter en canvas `800×600`, autopista de varios carriles con scroll vertical, coche del jugador con control continuo lateral + acelerar/frenar + disparo vertical, tráfico civil neutro, agentes rivales que persiguen y embisten/disparan activamente, furgoneta de apoyo con power-up de armamento, medidor de blindaje, colisión con tráfico/arcén/rivales, 3 vidas con invencibilidad breve al reaparecer, score por distancia + rivales destruidos, oleadas que aumentan agresividad. Controles de flechas + Espacio para disparar. Verificable abriendo el `index.html`.
2. **Portar el motor.** Crear `app/lib/games/interceptor/engine.ts` como `createInterceptorGame: GameFactory`, SIN estado global de módulo: encapsular todo el estado (`player {x,y,armor}`, `bullets[]`, `traffic[]`, `rivals[]`, `van`, `distance`, `score`, `lives`, `level`, `scrollY`, `state`) en el closure; recibir `canvas`/`ctx` por parámetro (no `getElementById`); fijar `canvas.width/height` a `800×600`. Mover tráfico/rivales/proyectiles a estructuras/clases internas, con IA simple de persecución para los rivales (buscan el carril del jugador). Listeners de teclado (flechas + WASD + Espacio, con `preventDefault` para las teclas del juego) añadidos en `start()` y quitados en `destroy()`. RAF cancelable (`rafId` nullable, `startLoop`/`stopLoop`), `dt` cap `0.05`, `lastTime` reseteado al (re)arrancar. `syncReactState()` que difunde `onScore/onLives/onLevel` solo ante cambios y `onGameOver` una vez. Quitar cualquier "pulsa tecla para reiniciar" del prototipo (lo gobierna el modal de React vía `restart()`). Preservar constantes y feel (velocidades, agresividad de IA, daño por impacto, puntos por rival).
3. **Registrar.** En `app/lib/games/registry.ts`: `import { createInterceptorGame } from "./interceptor/engine";` + línea `"interceptor": createInterceptorGame`. (El reproductor ya lo recoge por `id`; no se tocan `CanvasGame.tsx` ni `GamePlayer.tsx`.)
4. **Verificación manual** (ver Acceptance criteria).

> No se regenera `database.types.ts` (no cambia el esquema) ni se corre `get_advisors` (no se toca Supabase).

---

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de tipos de ruta.
- [ ] Existe `references/started-games/11-spy-hunter/` con un Spy Hunter vanilla jugable abriendo su `index.html`.
- [ ] En `/jugar/interceptor` se juega el Spy Hunter real en canvas `800×600`: el coche se mueve lateralmente de forma continua entre carriles con flechas/WASD, acelera/frena, dispara con Espacio, y los agentes rivales maniobran activamente para interceptarlo (no son tráfico pasivo).
- [ ] El HUD de React (`.player-hud`) refleja score real (distancia + rivales destruidos), vidas (arranca en 3, baja al agotar el blindaje) y nivel (sube por oleada superada).
- [ ] Recibir impactos/embestidas de rivales baja el medidor de blindaje hasta descontar una vida con breve invencibilidad al reaparecer; un choque fuerte directo contra tráfico civil/arcén también descuenta vida; perder la última abre el modal de fin con la puntuación real; "JUGAR DE NUEVO" reinicia limpio (3 vidas, blindaje lleno, score 0, nivel 1) sin saltos.
- [ ] Disparar destruye agentes rivales dentro de su rango, otorgando puntos; alcanzar la furgoneta de apoyo repone/mejora el armamento.
- [ ] PAUSA/REANUDAR no provoca salto de simulación (los rivales no dan un salto de posición al reanudar).
- [ ] `engine.ts` no usa estado global ni `document.getElementById`; al navegar fuera, `destroy()` cancela el RAF y quita los listeners; reentrar no duplica el loop ni acumula velocidad.
- [ ] `interceptor` resuelve a un motor en `registry.ts`; `rocas`, `caida`, `bloque-buster` y `serpentina` siguen jugables y el resto de ids siguen como maqueta.
- [ ] El leaderboard de `interceptor` en `/salon` y en `/juego/interceptor` sigue mostrando las filas sembradas; `POST /api/scores` con `{ gameId: "interceptor", name, score }` válido inserta y aparece.

---

## Decisions

- **Sí:** reusar el patrón SPEC 05 (motor por `GameFactory` + registro) tal como lo replicaron SPEC 07/08/09 y las specs hermanas de la tanda.
- **Sí:** construir primero el prototipo en `references/started-games/11-spy-hunter` (no existía) y portarlo desde ahí, para tener una referencia vanilla verificable como los demás juegos.
- **Sí (supuesto documentado, decidido de forma autónoma sin entrevista):** mapear Spy Hunter a **3 vidas + medidor de blindaje** en vez del medidor de daño con fin de partida directo del arcade original, para que el HUD compartido score/vidas/nivel nunca salga incoherente con el resto del catálogo.
- **Sí (supuesto documentado):** `onScore` = distancia + rivales destruidos; `onLevel` = oleadas de rivales, que aumentan su frecuencia y agresividad; coherente con el `best = 68900` sembrado.
- **Sí (supuesto documentado):** la IA de los rivales es **determinista y simple** (persiguen el carril del jugador con una velocidad máxima de giro limitada), suficiente para transmitir "me persiguen" sin requerir pathfinding; se calibra en el prototipo antes del port.
- **No:** tocar catálogo, portada o `scores` de `interceptor` (van en la spec hermana `01`).
- **No:** sonido, táctil, anti-cheat, auth real — cada uno en su propia spec.

---

## Risks

| Riesgo                                                                                                | Mitigación                                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No existe prototipo de Spy Hunter: hay que construirlo, con riesgo de feel distinto al arcade.       | Construir `11-spy-hunter` vanilla y verificarlo jugando antes de portar; preservar sus constantes (velocidades, daño, agresividad de IA) 1:1 en el port.          |
| La IA de persecución resulta imposible de esquivar o, al contrario, trivial.                          | Calibrar velocidad máxima de giro y frecuencia de aparición en el prototipo antes del port; verificación manual del ritmo por oleada.                             |
| La detección de colisión a alta velocidad falla si rivales/proyectiles se mueven mucho por frame.    | Limitar el desplazamiento por frame con el `dt` cap 0.05 y usar colisión por solape de cajas con un margen; verificación manual a velocidad máxima.                |
| Fugas de RAF/listeners al montar/desmontar en el App Router.                                          | `destroy()` cancela el RAF y quita listeners; el `useEffect` de `CanvasGame` retorna ese cleanup.                                                                   |
| `INSERT` público en `scores` permite spam.                                                            | `check` de rango/longitud (SPEC 06); sin `UPDATE/DELETE`. Endurecer con auth + anti-cheat en otra spec.                                                             |

---

## Qué **no** está en esta spec

- Alta de la fila `games`, siembra de `scores` y portada `.cover-interceptor` (van en `01-catalogo-leaderboard-interceptor`).
- Sonido y efectos de audio.
- Controles táctiles / móviles.
- Anti-cheat / verificación server-side de puntuaciones.
- Auth real y vincular scores a un usuario.

Cada uno de esos, si llega, va en su propia spec.
