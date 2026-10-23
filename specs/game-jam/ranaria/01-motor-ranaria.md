# SPEC 01 (game-jam/ranaria) — Motor de Frogger para "RANARIA": la maqueta `ranaria` pasa a jugable

> **Status:** Draft
> **Depends on:** SPEC 05, SPEC 06
> **Date:** 2026-10-23
> **Objective:** Construir y portar un motor de Frogger a `app/lib/games/ranaria/engine.ts` y registrarlo, de modo que el juego `ranaria` (RANARIA), hoy maqueta pero ya presente en el catálogo y el leaderboard desde la SPEC 06, se convierta en jugable reusando el patrón de motor de la SPEC 05 / SPEC 09.

---

## Por qué existe esta spec

La game jam "Cruzar obstáculos sin morir en el intento" tiene a **Frogger como juego central**: cruzar la carretera y el río sin convertirse en papilla. Al inventariar el catálogo resulta que **Frogger ya existe** como la fila `ranaria` sembrada por la SPEC 06: RANARIA — "Cruza la autopista de pixeles. Salta entre carriles de coches a toda velocidad y troncos a la deriva en el río. Llega a los nenúfares antes de que se acabe el tiempo." (`cat = ARCADE`, `cover = cover-rana`, `color = green`, `best = 18900`, `plays = "6.4K"`). Su portada `.cover-rana` vive en `app/globals.css` y tiene 12 filas en `scores`. Hoy es una **maqueta**: el reproductor (`app/jugar/[id]`) la resuelve a `null` en `app/lib/games/registry.ts` y muestra la arena genérica.

Es decir, **todo lo de catálogo, portada y leaderboard de RANARIA ya está implementado**; lo único que falta para que deje de ser maqueta es su **motor jugable**. Por eso, igual que la SPEC 09 hizo con SERPENTINA, esta spec **no toca Supabase ni el catálogo**: solo porta un motor nuevo y lo registra. A diferencia de Asteroids, Tetris, Arkanoid y Snake, en `references/started-games/` **no existe** un prototipo de Frogger (solo están `02-asteroids`, `03-tetris`, `04-arkanoid` y `05-snake`, ya portados). Por tanto, como paso previo a esta spec hay que **construir un prototipo vanilla nuevo** (`references/started-games/06-frogger`) y portarlo desde ahí, para que el juego tenga una referencia verificable como los demás.

---

## Scope

**In:**

- Construir un prototipo vanilla de Frogger en `references/started-games/06-frogger` (`index.html` + `game.js`), verificable fuera de React, como fuente del port (igual que se hizo con `05-snake` antes de la SPEC 09).
- Portar ese `game.js` → `app/lib/games/ranaria/engine.ts` como `createRanariaGame: GameFactory`, sin estado global de módulo, con el canvas por parámetro.
- Registrar el motor en `app/lib/games/registry.ts`: `"ranaria": createRanariaGame`.

**Out of scope (para futuras specs):**

- Alta en `games`, siembra de `scores` y portada `.cover-rana`: **ya existen** desde la SPEC 06; esta spec no los toca (el rediseño de la portada va en `02-portada-ranaria`).
- Sonido, controles táctiles/móviles, anti-cheat, auth real / vincular scores a usuario.
- Tocar los motores de ROCAS (SPEC 05), CAÍDA (SPEC 07), BLOQUE BUSTER (SPEC 08) o SERPENTINA (SPEC 09), ni `CanvasGame.tsx` / `GamePlayer.tsx`.
- Cambiar los valores de catálogo de `ranaria` (`best`, `plays`, `cat`, `color`, `cover`, `position`).

---

## Data model

Esta spec **no toca Supabase**: la fila `games` con `id = 'ranaria'` y sus filas en `scores` ya están sembradas (SPEC 06), y la portada `.cover-rana` ya existe en `app/globals.css`. No hay inserts ni migraciones.

El único "modelo" que introduce es el **contrato de motor** (de `app/lib/games/types.ts`, no se redefine):

```ts
// app/lib/games/ranaria/engine.ts → cumple GameFactory
const createRanariaGame: GameFactory = (canvas, callbacks): GameEngine => {
  /* ... */
};
```

**Rejilla y resolución.** Canvas interno `800×600` (coincide con el `aspect-ratio: 4/3` del `.crt-screen`). Rejilla de celdas de `50px`: `16` columnas × `12` filas. De abajo arriba: fila 11 = acera de salida (segura), filas 10–7 = **carretera** (4 carriles de coches con velocidades y sentidos alternos), fila 6 = **mediana** segura, filas 5–2 = **río** (4 carriles de troncos/tortugas sobre los que la rana debe montarse; el agua descubierta es mortal), fila 1 = franja de **5 nenúfares** (home slots) separados por orilla mortal, fila 0 = marco/HUD.

**Mapeo de mecánicas → callbacks:**

- `onScore(score)` — acumulado: **+10 por avanzar una fila hacia arriba** (solo la primera vez que se alcanza esa fila en el salto actual, como el original), **+50 por alojar la rana en un nenúfar**, y **bonus de tiempo** (los segundos restantes del temporizador × 10) al llegar a casa. Completar los 5 nenúfares de un nivel suma un **+1000** de bonus de ronda. La suma es coherente con el `best = 18900` ya sembrado.
- `onLives(lives)` — arranca en `3`. Se decrementa al morir: atropello en la carretera, caer al agua (estar en un carril de río sin tronco/tortuga), ser arrastrado fuera de pantalla por un tronco, saltar a una orilla ocupada/fuera de nenúfar, o agotar el temporizador. `onLives(0)` en la última muerte.
- `onLevel(level)` — arranca en `1`; sube en `1` cada vez que se completan los **5 nenúfares** (la ronda se reinicia con tráfico y corriente más rápidos).
- `onGameOver(finalScore)` — una sola vez, al perder la última vida.

**Temporizador.** Cada intento de cruce tiene un tiempo límite (barra dibujada en el canvas); al agotarse se pierde una vida y la rana reaparece en la acera. Al llegar a un nenúfar el temporizador se reinicia.

---

## Implementation plan

Cada paso deja la app compilando y navegable.

1. **Prototipo vanilla.** Crear `references/started-games/06-frogger/` con `index.html` + `game.js`: Frogger completo en canvas `800×600`, rejilla `16×12`, carretera con 4 carriles de coches (velocidad/sentido por carril), río con 4 carriles de troncos y tortugas, 5 nenúfares, temporizador, 3 vidas, niveles que aceleran. Controles de flechas (salto celda a celda, un paso por pulsación). Verificable abriendo el `index.html`.
2. **Portar el motor.** Crear `app/lib/games/ranaria/engine.ts` como `createRanariaGame: GameFactory`, SIN estado global de módulo: encapsular todo el estado (`frog {col,row}`, `lanes[]`, `homes[]`, `timer`, `score`, `lives`, `level`, `state`) en el closure; recibir `canvas`/`ctx` por parámetro (no `getElementById`); fijar `canvas.width/height` a `800×600`. Mover las entidades (coches, troncos, tortugas) a estructuras/clases internas. Listeners de teclado (flechas + WASD, con `preventDefault` para las teclas del juego) añadidos en `start()` y quitados en `destroy()`. RAF cancelable (`rafId` nullable, `startLoop`/`stopLoop`), `dt` cap `0.05`, `lastTime` reseteado al (re)arrancar. `syncReactState()` que difunde `onScore/onLives/onLevel` solo ante cambios y `onGameOver` una vez. Quitar cualquier "pulsa tecla para reiniciar" del prototipo (eso lo gobierna el modal de React vía `restart()`). Preservar constantes y feel del prototipo (tamaño de celda, velocidades de carril, duración del temporizador).
3. **Registrar.** En `app/lib/games/registry.ts`: `import { createRanariaGame } from "./ranaria/engine";` + línea `"ranaria": createRanariaGame`. (El reproductor ya lo recoge por `id`; no se tocan `CanvasGame.tsx` ni `GamePlayer.tsx`.)
4. **Verificación manual** (ver Acceptance criteria).

> No se regenera `database.types.ts` (no cambia el esquema) ni se corre `get_advisors` (no se toca Supabase).

---

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de tipos de ruta.
- [ ] Existe `references/started-games/06-frogger/` con un Frogger vanilla jugable abriendo su `index.html`.
- [ ] En `/jugar/ranaria` se juega el Frogger real en canvas `800×600`: la rana salta celda a celda con flechas/WASD, cruza 4 carriles de coches, monta troncos/tortugas sobre el río y aloja en los 5 nenúfares.
- [ ] El HUD de React (`.player-hud`) refleja score real (+10 por fila, +50 por nenúfar, bonus de tiempo y de ronda), vidas (arranca en 3, baja al morir) y nivel (sube al completar los 5 nenúfares).
- [ ] Morir (atropello, agua, arrastre fuera de pantalla, orilla sin nenúfar o fin de tiempo) descuenta una vida; perder la última abre el modal de fin con la puntuación real; "JUGAR DE NUEVO" reinicia limpio (3 vidas, score 0, nivel 1, rana en la acera) sin saltos.
- [ ] PAUSA/REANUDAR no provoca salto de simulación (el tráfico no da un salto al reanudar).
- [ ] `engine.ts` no usa estado global ni `document.getElementById`; al navegar fuera, `destroy()` cancela el RAF y quita los listeners; reentrar no duplica el loop ni acumula velocidad.
- [ ] `ranaria` resuelve a un motor en `registry.ts`; `rocas`, `caida`, `bloque-buster` y `serpentina` siguen jugables y el resto de ids siguen como maqueta.
- [ ] El leaderboard de `ranaria` en `/salon` y en `/juego/ranaria` sigue mostrando las filas sembradas; `POST /api/scores` con `{ gameId: "ranaria", name, score }` válido inserta y aparece.

---

## Decisions

- **Sí:** reusar el patrón SPEC 05/09 (motor por `GameFactory` + registro). Un único origen de verdad para el ciclo de vida motor↔React.
- **Sí:** tratar a RANARIA como **motor-only sobre el `ranaria` existente** (no crear un slug nuevo de Frogger). RANARIA ya es un Frogger en el catálogo (SPEC 06); crear otro slug duplicaría el juego y violaría la unicidad del catálogo. Por eso esta carpeta **no** lleva spec de catálogo+leaderboard: ese alta ya está sembrado. Es exactamente lo que hizo la SPEC 09 con SERPENTINA.
- **Sí:** construir primero el prototipo en `references/started-games/06-frogger` (no existía) y portarlo desde ahí, para tener una referencia vanilla verificable como los demás juegos.
- **Sí (supuesto documentado):** `onLives(3→0)` y `onLevel = rondas de 5 nenúfares completadas` como traducción de un Frogger clásico (que tiene vidas pero cuyos "niveles" son rondas sucesivas más rápidas), para que el HUD compartido nunca salga incoherente.
- **Sí (supuesto documentado):** carretera de 4 carriles + río de 4 carriles + 5 nenúfares + temporizador por cruce, sobre rejilla `16×12` de `50px`. Es el reparto clásico que cabe en `800×600` y da el feel del arcade original. El agua descubierta es mortal; los troncos arrastran a la rana y salirse de pantalla montado también mata.
- **Sí (supuesto documentado):** reparto de puntos +10/fila, +50/nenúfar, bonus de tiempo ×10 y +1000/ronda, elegido para quedar coherente con el `best = 18900` ya sembrado.
- **No:** tocar catálogo, portada o `scores` de `ranaria` (ya implementados en SPEC 06); el rediseño de la portada va en la spec hermana `02-portada-ranaria`.
- **No:** sonido, táctil, anti-cheat, auth real — cada uno en su propia spec.

---

## Risks

| Riesgo                                                                                                       | Mitigación                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No existe prototipo de Frogger: hay que construirlo antes de portar, con riesgo de feel distinto al arcade.  | Construir `06-frogger` vanilla y verificarlo jugando antes de portar; preservar sus constantes (celda, velocidades de carril, temporizador) 1:1 en el port.                                                                  |
| La lógica de "montar tronco" (la rana hereda la velocidad del tronco) es sutil y fácil de romper en el port. | Modelar carriles de río como entidades con velocidad; si la rana está sobre un carril de río, sumar el desplazamiento del tronco a su posición cada frame; si no hay tronco bajo ella, muerte por agua. Verificación manual. |
| Fugas de RAF/listeners al montar/desmontar en el App Router.                                                 | `destroy()` cancela el RAF y quita listeners; el `useEffect` de `CanvasGame` retorna ese cleanup.                                                                                                                            |
| El salto celda-a-celda con pulsación sostenida se dispara demasiado rápido.                                  | Un salto por evento `keydown` (sin auto-repeat efectivo): consumir la pulsación hasta el siguiente `keyup`, como el arcade.                                                                                                  |
| `INSERT` público en `scores` permite spam.                                                                   | `check` de rango/longitud ya vigente (SPEC 06); sin `UPDATE/DELETE`. Endurecer con auth + anti-cheat en otra spec.                                                                                                           |

---

## Qué **no** está en esta spec

- Alta/edición de la fila `games` y siembra de `scores` de `ranaria` (ya existen desde SPEC 06).
- Rediseño de la portada `.cover-rana` (va en `02-portada-ranaria`).
- Sonido y efectos de audio.
- Controles táctiles / móviles.
- Anti-cheat / verificación server-side de puntuaciones.
- Auth real y vincular scores a un usuario.

Cada uno de esos, si llega, va en su propia spec.
