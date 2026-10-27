# SPEC 02 (game-jam/turbovia) — Motor de Road Fighter para "TURBOVÍA"

> **Status:** Draft
> **Depends on:** SPEC 05, 01-catalogo-leaderboard-turbovia
> **Date:** 2026-10-23
> **Objective:** Construir y portar un motor de Road Fighter a `app/lib/games/turbovia/engine.ts` y registrarlo, de modo que `turbovia` (TURBOVÍA), dado de alta en catálogo y leaderboard por `01-catalogo-leaderboard-turbovia`, se convierta en jugable reusando el patrón de motor de la SPEC 05.

---

## Por qué existe esta spec

`01-catalogo-leaderboard-turbovia` deja a TURBOVÍA presente en el catálogo (home, biblioteca, salón, detalle) y con su leaderboard sembrado, pero sin motor: `/jugar/turbovia` muestra la maqueta genérica. Esta spec entrega el **motor jugable**: un Road Fighter en canvas con scroll vertical donde conduces un bólido esquivando tráfico. Reusa el patrón de la SPEC 05 (fábrica `GameFactory` sin estado global, canvas por parámetro, callbacks `onScore/onLives/onLevel/onGameOver`, ciclo `start/pause/resume/restart/destroy`), igual que lo replicaron las SPEC 07/08/09.

En `references/started-games/` solo hay `02-asteroids`, `03-tetris`, `04-arkanoid` y `05-snake` (todos ya portados): **no existe un prototipo de Road Fighter**. Por eso esta spec **necesita un prototipo nuevo**, que se construye en `references/started-games/07-road-fighter` y se porta desde ahí, como paso previo (igual que la SPEC 09 construyó `05-snake` antes de portarlo).

---

## Scope

**In:**

- Construir un prototipo vanilla de Road Fighter en `references/started-games/07-road-fighter` (`index.html` + `game.js`), verificable fuera de React, como fuente del port.
- Portar ese `game.js` → `app/lib/games/turbovia/engine.ts` como `createTurboviaGame: GameFactory`, sin estado global de módulo, con el canvas por parámetro.
- Registrar el motor en `app/lib/games/registry.ts`: `"turbovia": createTurboviaGame`.

**Out of scope (para futuras specs):**

- Alta en `games`, siembra de `scores` y portada `.cover-turbovia`: van en `01-catalogo-leaderboard-turbovia`.
- Sonido, controles táctiles/móviles, anti-cheat, auth real / vincular scores a usuario.
- Tocar los motores de ROCAS (SPEC 05), CAÍDA (SPEC 07), BLOQUE BUSTER (SPEC 08) o SERPENTINA (SPEC 09), ni `CanvasGame.tsx` / `GamePlayer.tsx`.

---

## Data model

Esta spec **no toca Supabase** (el alta y la siembra son de la spec hermana). El único "modelo" que introduce es el **contrato de motor** (de `app/lib/games/types.ts`, no se redefine):

```ts
// app/lib/games/turbovia/engine.ts → cumple GameFactory
const createTurboviaGame: GameFactory = (canvas, callbacks): GameEngine => {
  /* ... */
};
```

**Resolución y mundo.** Canvas interno `800×600`. Carretera vertical centrada (con arcenes/bordes a ambos lados), scroll vertical descendente que simula el avance del bólido (las líneas divisorias y el tráfico bajan por pantalla). El coche del jugador vive en la franja inferior; se mueve en horizontal (y acelera/frena en vertical dentro de un rango). Coches rivales aparecen arriba a distintas velocidades/carriles y descienden.

**Mapeo de mecánicas → callbacks:**

- `onScore(score)` — acumulado por **distancia recorrida** (metros × factor) más **bonus por cada coche adelantado** sin tocarlo. Coherente con el `best = 87600` sembrado.
- `onLives(lives)` — arranca en `3`. Un choque (contra un coche rival o contra el borde de la pista a alta velocidad) descuenta una vida: el bólido "revienta", reaparece reducido de velocidad tras una breve invencibilidad. `onLives(0)` en el último choque. _(Supuesto documentado: el Road Fighter arcade no tiene vidas sino combustible + trompos; aquí se mapea a 3 vidas para que el HUD compartido score/vidas/nivel sea coherente.)_
- `onLevel(level)` — arranca en `1`; sube en `1` cada **tramo de distancia** superado (p. ej. cada 1000 m), aumentando la densidad y velocidad del tráfico.
- `onGameOver(finalScore)` — una sola vez, al perder la última vida.

---

## Implementation plan

Cada paso deja la app compilando y navegable.

1. **Prototipo vanilla.** Crear `references/started-games/07-road-fighter/` con `index.html` + `game.js`: Road Fighter en canvas `800×600`, carretera con scroll vertical, bólido del jugador controlable en horizontal (+ acelerar/frenar), coches rivales que aparecen y descienden por carriles a distintas velocidades, colisión con rivales y bordes, 3 vidas con invencibilidad breve al reaparecer, score por distancia + adelantamientos, tramos que aceleran el tráfico. Controles de flechas. Verificable abriendo el `index.html`.
2. **Portar el motor.** Crear `app/lib/games/turbovia/engine.ts` como `createTurboviaGame: GameFactory`, SIN estado global de módulo: encapsular todo el estado (`player {x,y,speed}`, `rivals[]`, `distance`, `score`, `lives`, `level`, `scrollY`, `state`) en el closure; recibir `canvas`/`ctx` por parámetro (no `getElementById`); fijar `canvas.width/height` a `800×600`. Mover las entidades (coches rivales) a estructuras/clases internas. Listeners de teclado (flechas + WASD, con `preventDefault` para las teclas del juego) añadidos en `start()` y quitados en `destroy()`. RAF cancelable (`rafId` nullable, `startLoop`/`stopLoop`), `dt` cap `0.05`, `lastTime` reseteado al (re)arrancar. `syncReactState()` que difunde `onScore/onLives/onLevel` solo ante cambios y `onGameOver` una vez. Quitar cualquier "pulsa tecla para reiniciar" del prototipo (lo gobierna el modal de React vía `restart()`). Preservar constantes y feel (velocidades, aceleración, invencibilidad, factor de score).
3. **Registrar.** En `app/lib/games/registry.ts`: `import { createTurboviaGame } from "./turbovia/engine";` + línea `"turbovia": createTurboviaGame`. (El reproductor ya lo recoge por `id`; no se tocan `CanvasGame.tsx` ni `GamePlayer.tsx`.)
4. **Verificación manual** (ver Acceptance criteria).

> No se regenera `database.types.ts` (no cambia el esquema) ni se corre `get_advisors` (no se toca Supabase).

---

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de tipos de ruta.
- [ ] Existe `references/started-games/07-road-fighter/` con un Road Fighter vanilla jugable abriendo su `index.html`.
- [ ] En `/jugar/turbovia` se juega el Road Fighter real en canvas `800×600`: el bólido se mueve con flechas/WASD, acelera/frena, la carretera hace scroll vertical y aparecen coches rivales a esquivar.
- [ ] El HUD de React (`.player-hud`) refleja score real (distancia + adelantamientos), vidas (arranca en 3, baja al chocar) y nivel (sube por tramo de distancia).
- [ ] Chocar contra un rival o contra el borde a alta velocidad descuenta una vida con breve invencibilidad al reaparecer; perder la última abre el modal de fin con la puntuación real; "JUGAR DE NUEVO" reinicia limpio (3 vidas, score 0, nivel 1) sin saltos.
- [ ] PAUSA/REANUDAR no provoca salto de simulación (el tráfico no da un salto al reanudar).
- [ ] `engine.ts` no usa estado global ni `document.getElementById`; al navegar fuera, `destroy()` cancela el RAF y quita los listeners; reentrar no duplica el loop ni acumula velocidad.
- [ ] `turbovia` resuelve a un motor en `registry.ts`; `rocas`, `caida`, `bloque-buster` y `serpentina` siguen jugables y el resto de ids siguen como maqueta.
- [ ] El leaderboard de `turbovia` en `/salon` y en `/juego/turbovia` sigue mostrando las filas sembradas; `POST /api/scores` con `{ gameId: "turbovia", name, score }` válido inserta y aparece.

---

## Decisions

- **Sí:** reusar el patrón SPEC 05 (motor por `GameFactory` + registro) tal como lo replicaron SPEC 07/08/09.
- **Sí:** construir primero el prototipo en `references/started-games/07-road-fighter` (no existía) y portarlo desde ahí, para tener una referencia vanilla verificable como los demás juegos.
- **Sí (supuesto documentado):** mapear Road Fighter a **3 vidas + invencibilidad** en vez del combustible/trompos del arcade, para que el HUD compartido score/vidas/nivel nunca salga incoherente.
- **Sí (supuesto documentado):** `onScore` = distancia + adelantamientos; `onLevel` = tramos de distancia que densifican el tráfico; coherente con el `best = 87600` sembrado.
- **Sí (supuesto documentado):** scroll **vertical** con el bólido abajo y rivales descendiendo, por ser la variante más legible en el `800×600` CRT sin render pseudo-3D (se descarta la perspectiva tipo Pole Position, mayor riesgo, reservada a `asfalto`).
- **No:** tocar catálogo, portada o `scores` de `turbovia` (van en la spec hermana `01`).
- **No:** sonido, táctil, anti-cheat, auth real — cada uno en su propia spec.

---

## Risks

| Riesgo                                                                                                | Mitigación                                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No existe prototipo de Road Fighter: hay que construirlo, con riesgo de feel distinto al arcade.      | Construir `07-road-fighter` vanilla y verificarlo jugando antes de portar; preservar sus constantes (velocidades, aceleración, densidad de tráfico) 1:1 en el port. |
| La detección de colisión a alta velocidad falla si los rivales se mueven mucho por frame (tunneling). | Limitar el desplazamiento por frame con el `dt` cap 0.05 y usar colisión por solape de cajas con un margen; verificación manual a velocidad máxima.                 |
| Fugas de RAF/listeners al montar/desmontar en el App Router.                                          | `destroy()` cancela el RAF y quita listeners; el `useEffect` de `CanvasGame` retorna ese cleanup.                                                                   |
| Dificultad mal calibrada (imposible o trivial).                                                       | Ajustar densidad/velocidad por nivel en el prototipo antes del port; verificación manual del ritmo.                                                                 |
| `INSERT` público en `scores` permite spam.                                                            | `check` de rango/longitud (SPEC 06); sin `UPDATE/DELETE`. Endurecer con auth + anti-cheat en otra spec.                                                             |

---

## Qué **no** está en esta spec

- Alta de la fila `games`, siembra de `scores` y portada `.cover-turbovia` (van en `01-catalogo-leaderboard-turbovia`).
- Sonido y efectos de audio.
- Controles táctiles / móviles.
- Anti-cheat / verificación server-side de puntuaciones.
- Auth real y vincular scores a un usuario.

Cada uno de esos, si llega, va en su propia spec.
