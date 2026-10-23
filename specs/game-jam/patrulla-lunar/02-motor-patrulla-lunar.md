# SPEC 02 (game-jam/patrulla-lunar) — Motor de Moon Patrol para "PATRULLA LUNAR"

> **Status:** Draft
> **Depends on:** SPEC 05, 01-catalogo-leaderboard-patrulla-lunar
> **Date:** 2026-10-23
> **Objective:** Construir y portar un motor de Moon Patrol a `app/lib/games/patrulla-lunar/engine.ts` y registrarlo, de modo que `patrulla-lunar` (PATRULLA LUNAR), dado de alta en catálogo y leaderboard por `01-catalogo-leaderboard-patrulla-lunar`, se convierta en jugable reusando el patrón de motor de la SPEC 05.

---

## Por qué existe esta spec

`01-catalogo-leaderboard-patrulla-lunar` deja a PATRULLA LUNAR presente en el catálogo y con su leaderboard sembrado, pero sin motor: `/jugar/patrulla-lunar` muestra la maqueta genérica. Esta spec entrega el **motor jugable**: un Moon Patrol en canvas con scroll horizontal donde el buggy avanza saltando cráteres y disparando rocas y OVNIs. Reusa el patrón de la SPEC 05 (fábrica `GameFactory` sin estado global, canvas por parámetro, callbacks `onScore/onLives/onLevel/onGameOver`, ciclo `start/pause/resume/restart/destroy`), igual que lo replicaron las SPEC 07/08/09.

En `references/started-games/` solo hay `02-asteroids`, `03-tetris`, `04-arkanoid` y `05-snake` (todos ya portados): **no existe un prototipo de Moon Patrol**. Por eso esta spec **necesita un prototipo nuevo**, que se construye en `references/started-games/08-moon-patrol` y se porta desde ahí, como paso previo (igual que la SPEC 09 construyó `05-snake` antes de portarlo).

---

## Scope

**In:**

- Construir un prototipo vanilla de Moon Patrol en `references/started-games/08-moon-patrol` (`index.html` + `game.js`), verificable fuera de React, como fuente del port.
- Portar ese `game.js` → `app/lib/games/patrulla-lunar/engine.ts` como `createPatrullaLunarGame: GameFactory`, sin estado global de módulo, con el canvas por parámetro.
- Registrar el motor en `app/lib/games/registry.ts`: `"patrulla-lunar": createPatrullaLunarGame`.

**Out of scope (para futuras specs):**

- Alta en `games`, siembra de `scores` y portada `.cover-patrulla-lunar`: van en `01-catalogo-leaderboard-patrulla-lunar`.
- Sonido, controles táctiles/móviles, anti-cheat, auth real / vincular scores a usuario.
- Tocar los motores de ROCAS (SPEC 05), CAÍDA (SPEC 07), BLOQUE BUSTER (SPEC 08) o SERPENTINA (SPEC 09), ni `CanvasGame.tsx` / `GamePlayer.tsx`.

---

## Data model

Esta spec **no toca Supabase** (el alta y la siembra son de la spec hermana). El único "modelo" que introduce es el **contrato de motor** (de `app/lib/games/types.ts`, no se redefine):

```ts
// app/lib/games/patrulla-lunar/engine.ts → cumple GameFactory
const createPatrullaLunarGame: GameFactory = (
  canvas,
  callbacks,
): GameEngine => {
  /* ... */
};
```

**Resolución y mundo.** Canvas interno `800×600`. Suelo lunar en la franja inferior con scroll horizontal continuo (auto-runner: el buggy avanza solo a izquierda→derecha simulado por el terreno moviéndose). El buggy vive a la izquierda; el jugador controla **salto** (saltar cráteres/minas/rocas en el suelo) y **disparo** (hacia delante contra rocas rodantes y obstáculos de suelo, hacia arriba contra OVNIs que sueltan bombas). El terreno genera cráteres (hoyos que se cruzan saltando), montículos y obstáculos.

**Mapeo de mecánicas → callbacks:**

- `onScore(score)` — acumulado por **distancia recorrida** (× factor) más **puntos por cada roca/obstáculo destruido y cada OVNI abatido**. Coherente con el `best = 64250` sembrado.
- `onLives(lives)` — arranca en `3`. Caer en un cráter, chocar con una roca/obstáculo o recibir una bomba de OVNI destruye el buggy y descuenta una vida; reaparece desde el último checkpoint con breve invencibilidad. `onLives(0)` en el último impacto.
- `onLevel(level)` — arranca en `1`; sube en `1` al alcanzar cada **checkpoint** (letra de ruta A→B→C… del arcade), aumentando la densidad de cráteres/obstáculos y la agresividad de los OVNIs.
- `onGameOver(finalScore)` — una sola vez, al perder la última vida.

---

## Implementation plan

Cada paso deja la app compilando y navegable.

1. **Prototipo vanilla.** Crear `references/started-games/08-moon-patrol/` con `index.html` + `game.js`: Moon Patrol en canvas `800×600`, suelo lunar con scroll horizontal, buggy con salto (gravedad/arco) y disparo doble (frontal + vertical), cráteres/minas/rocas en el suelo, rocas rodantes y OVNIs que sueltan bombas, 3 vidas con checkpoints e invencibilidad breve al reaparecer, score por distancia + destrucciones, tramos/checkpoints que suben la dificultad. Controles de flechas + tecla de disparo. Verificable abriendo el `index.html`.
2. **Portar el motor.** Crear `app/lib/games/patrulla-lunar/engine.ts` como `createPatrullaLunarGame: GameFactory`, SIN estado global de módulo: encapsular todo el estado (`buggy {x,y,vy,grounded}`, `terrain[]`, `obstacles[]`, `ufos[]`, `bullets[]`, `distance`, `score`, `lives`, `level`, `scrollX`, `state`) en el closure; recibir `canvas`/`ctx` por parámetro (no `getElementById`); fijar `canvas.width/height` a `800×600`. Mover las entidades (obstáculos, OVNIs, balas) a estructuras/clases internas. Listeners de teclado (flechas para mover/saltar + tecla de disparo, con `preventDefault` para las teclas del juego) añadidos en `start()` y quitados en `destroy()`. RAF cancelable (`rafId` nullable, `startLoop`/`stopLoop`), `dt` cap `0.05`, `lastTime` reseteado al (re)arrancar. `syncReactState()` que difunde `onScore/onLives/onLevel` solo ante cambios y `onGameOver` una vez. Quitar cualquier "pulsa tecla para reiniciar" del prototipo (lo gobierna el modal de React vía `restart()`). Preservar constantes y feel (gravedad del salto, velocidad de scroll, cadencia de disparo, checkpoints).
3. **Registrar.** En `app/lib/games/registry.ts`: `import { createPatrullaLunarGame } from "./patrulla-lunar/engine";` + línea `"patrulla-lunar": createPatrullaLunarGame`. (El reproductor ya lo recoge por `id`; no se tocan `CanvasGame.tsx` ni `GamePlayer.tsx`.)
4. **Verificación manual** (ver Acceptance criteria).

> No se regenera `database.types.ts` (no cambia el esquema) ni se corre `get_advisors` (no se toca Supabase).

---

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de tipos de ruta.
- [ ] Existe `references/started-games/08-moon-patrol/` con un Moon Patrol vanilla jugable abriendo su `index.html`.
- [ ] En `/jugar/patrulla-lunar` se juega el Moon Patrol real en canvas `800×600`: el buggy avanza con scroll horizontal, salta cráteres/obstáculos y dispara hacia delante y hacia arriba.
- [ ] El HUD de React (`.player-hud`) refleja score real (distancia + destrucciones), vidas (arranca en 3, baja al impactar) y nivel (sube por checkpoint).
- [ ] Caer en un cráter, chocar con un obstáculo o recibir una bomba descuenta una vida y reaparece desde checkpoint con breve invencibilidad; perder la última abre el modal de fin con la puntuación real; "JUGAR DE NUEVO" reinicia limpio (3 vidas, score 0, nivel 1) sin saltos.
- [ ] PAUSA/REANUDAR no provoca salto de simulación (el terreno no da un salto al reanudar).
- [ ] `engine.ts` no usa estado global ni `document.getElementById`; al navegar fuera, `destroy()` cancela el RAF y quita los listeners; reentrar no duplica el loop ni acumula velocidad.
- [ ] `patrulla-lunar` resuelve a un motor en `registry.ts`; `rocas`, `caida`, `bloque-buster` y `serpentina` siguen jugables y el resto de ids siguen como maqueta.
- [ ] El leaderboard de `patrulla-lunar` en `/salon` y en `/juego/patrulla-lunar` sigue mostrando las filas sembradas; `POST /api/scores` con `{ gameId: "patrulla-lunar", name, score }` válido inserta y aparece.

---

## Decisions

- **Sí:** reusar el patrón SPEC 05 (motor por `GameFactory` + registro) tal como lo replicaron SPEC 07/08/09.
- **Sí:** construir primero el prototipo en `references/started-games/08-moon-patrol` (no existía) y portarlo desde ahí, para tener una referencia vanilla verificable como los demás juegos.
- **Sí (supuesto documentado):** `onScore` = distancia + destrucciones; `onLives(3)` con reaparición desde checkpoint; `onLevel` = checkpoints A→B→C. Es la traducción natural del arcade al HUD compartido score/vidas/nivel.
- **Sí (supuesto documentado):** auto-runner con scroll horizontal (el buggy no retrocede libremente), salto por arco con gravedad y disparo doble (frontal + vertical), por ser el núcleo del Moon Patrol que cabe legible en `800×600`.
- **No:** tocar catálogo, portada o `scores` de `patrulla-lunar` (van en la spec hermana `01`).
- **No:** sonido, táctil, anti-cheat, auth real — cada uno en su propia spec.

---

## Risks

| Riesgo                                                                                          | Mitigación                                                                                                                                      |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| No existe prototipo de Moon Patrol: hay que construirlo, con riesgo de feel distinto al arcade. | Construir `08-moon-patrol` vanilla y verificarlo jugando antes de portar; preservar sus constantes (gravedad, scroll, cadencia) 1:1 en el port. |
| El doble disparo + salto + scroll hace el input denso y propenso a estados inconsistentes.      | Modelar el input como un set de teclas activas y resolver salto/disparo en el `update` con cooldowns; verificación manual.                      |
| La generación procedural del terreno produce tramos injugables (cráteres imposibles de saltar). | Acotar la anchura de cráteres al alcance del salto y garantizar separación mínima entre obstáculos; verificación manual por tramo.              |
| Fugas de RAF/listeners al montar/desmontar en el App Router.                                    | `destroy()` cancela el RAF y quita listeners; el `useEffect` de `CanvasGame` retorna ese cleanup.                                               |
| `INSERT` público en `scores` permite spam.                                                      | `check` de rango/longitud (SPEC 06); sin `UPDATE/DELETE`. Endurecer con auth + anti-cheat en otra spec.                                         |

---

## Qué **no** está en esta spec

- Alta de la fila `games`, siembra de `scores` y portada `.cover-patrulla-lunar` (van en `01-catalogo-leaderboard-patrulla-lunar`).
- Sonido y efectos de audio.
- Controles táctiles / móviles.
- Anti-cheat / verificación server-side de puntuaciones.
- Auth real y vincular scores a un usuario.

Cada uno de esos, si llega, va en su propia spec.
