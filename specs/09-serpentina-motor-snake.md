# SPEC 09 — Motor de Snake para "SERPENTINA": la maqueta `serpentina` pasa a jugable

> **Status:** Implementado
> **Depends on:** SPEC 05, SPEC 06
> **Date:** 2026-10-21
> **Objective:** Portar el Snake de `references/started-games/05-snake` (con su sprite de frutas) a `app/lib/games/serpentina/engine.ts` y registrarlo, de modo que el juego `serpentina` (SERPENTINA), hoy maqueta pero ya presente en el catálogo y el leaderboard desde la SPEC 06, se convierta en jugable reusando el patrón de motor de la SPEC 05.

---

## Por qué existe esta spec

La SPEC 05 dejó el reproductor enchufable por `id` mediante `app/lib/games/registry.ts`: hoy `rocas` resuelve al motor de Asteroids, `caida` al de Tetris (SPEC 07) y `bloque-buster` al de Arkanoid (SPEC 08); el resto de ids conservan la maqueta genérica. La SPEC 06 sembró el catálogo completo en Supabase, incluida la fila `serpentina` (SERPENTINA, un Snake: `cat = ARCADE`, `cover = cover-snake`, `color = green`, `best = 7820`, `plays = "9.1K"`, `position = 3`), su portada `.cover-snake` en `app/globals.css` y 12 filas en `scores` para su leaderboard.

Es decir, **todo lo de catálogo, portada y leaderboard de SERPENTINA ya está implementado**. Lo único que falta para que deje de ser una maqueta es su **motor jugable**. A diferencia de Asteroids, Tetris y Arkanoid, en `references/started-games/` no existía un prototipo de Snake: solo había assets sueltos (`references/source-assests/snake-assets`). Como paso previo a esta spec se construyó el prototipo vanilla completo en `references/started-games/05-snake` (`index.html` + `game.js` + `sprites.js` + `snake-assets/fruits.png`). Esta spec porta ese motor y lo registra, siguiendo el patrón que la SPEC 05 estableció para ROCAS y las SPEC 07/08 replicaron: una fábrica `GameFactory` sin estado global, que recibe el canvas por parámetro, emite su estado a React por callbacks y se limpia al desmontar.

---

## Scope

**In:**

- Portar `references/started-games/05-snake/game.js` → `app/lib/games/serpentina/engine.ts` como `createSerpentinaGame: GameFactory`.
- Portar el atlas `references/started-games/05-snake/sprites.js` → `app/lib/games/serpentina/sprites.ts` (tipado, sin `window.*`).
- Servir el sprite de frutas como asset estático: `public/games/serpentina/fruits.png`, cargado desde el motor por URL `/games/serpentina/fruits.png`.
- Registrar el motor en `app/lib/games/registry.ts`: `"serpentina": createSerpentinaGame`.

**Out of scope (para futuras specs):**

- Alta en `games`, siembra de `scores` y portada `.cover-snake`: **ya existen** desde la SPEC 06; esta spec no los toca.
- Sonido, controles táctiles/móviles, anti-cheat, auth real / vincular scores a usuario.
- Tocar los motores de ROCAS (SPEC 05), CAÍDA (SPEC 07) o BLOQUE BUSTER (SPEC 08), ni `CanvasGame.tsx` / `GamePlayer.tsx`.
- Cambiar los valores de catálogo de `serpentina` (`best`, `plays`, `cat`, `color`, `cover`, `position`).

---

## Data model

Esta spec **no toca Supabase**: la fila `games` con `id = 'serpentina'` y sus 12 filas en `scores` ya están sembradas (SPEC 06), y la portada `.cover-snake` ya existe en `app/globals.css`. No hay inserts ni migraciones.

El único "modelo" que introduce es el **contrato de motor** (de `app/lib/games/types.ts`, no se redefine):

```ts
// app/lib/games/serpentina/engine.ts → cumple GameFactory
const createSerpentinaGame: GameFactory = (canvas, callbacks): GameEngine => {
  /* ... */
};
```

**Mapeo de mecánicas → callbacks:**

- `onScore(score)` — puntos acumulados; **+10 por fruta comida** (preserva el prototipo y es coherente con el `best = 7820` sembrado).
- `onLives` — Snake tiene una sola vida: `onLives(1)` al arrancar/reiniciar y `onLives(0)` al chocar (mismo patrón que `caida` emite `onLives(0)` al perder).
- `onLevel(level)` — **nivel = tramo de velocidad**: `level` arranca en `1` y sube en `1` cada vez que la serpiente acelera un escalón. La aceleración se agrupa en tramos de `TIER_SIZE = 5` frutas, de modo que `level = 1 + floor(frutasComidas / 5)`. Esto sustituye la aceleración por-fruta del prototipo (`SPEEDUP`) por una por-tramo, para que velocidad y nivel avancen juntos.
- `onGameOver(finalScore)` — una sola vez, al chocar contra un muro o contra el propio cuerpo.

**Resolución interna del canvas:** `800×600`, rejilla fija de `32×24` celdas de `25px` (igual que el prototipo). El motor fija `canvas.width/height` por parámetro, sin leer el DOM.

**Atlas de frutas** (`app/lib/games/serpentina/sprites.ts`): exporta el mapa de recortes `{ x, y, w, h }` por fruta (portado de `sprites.js`) y la URL del asset `/games/serpentina/fruits.png`. La carga de la imagen es idempotente dentro del motor (patrón de `app/lib/games/bloque-buster/sprites.ts`); hasta que carga, la fruta se dibuja como círculo de reserva.

---

## Implementation plan

Cada paso deja la app compilando y navegable.

1. Copiar el asset: `references/started-games/05-snake/snake-assets/fruits.png` → `public/games/serpentina/fruits.png`.
2. Portar el atlas: crear `app/lib/games/serpentina/sprites.ts` desde `references/started-games/05-snake/sprites.js`, tipado y sin `window.SPRITE_ATLAS`; la constante de origen apunta a `/games/serpentina/fruits.png`. Exponer un cargador idempotente de la imagen (como `bloque-buster/sprites.ts`).
3. Portar el motor: crear `app/lib/games/serpentina/engine.ts` como `createSerpentinaGame: GameFactory`, SIN estado global de módulo: encapsular todo el estado (`snake`, `dir`, `nextDir`, `food`, `score`, `frutasComidas`, `level`, `step`, `acc`, `state`) en el closure; recibir `canvas`/`ctx` por parámetro (no `getElementById`); fijar `canvas.width/height` a `800×600`. Listeners de teclado (flechas + WASD, con `preventDefault` para las teclas del juego) añadidos en `start()` y quitados en `destroy()`. RAF cancelable (`rafId` nullable, `startLoop`/`stopLoop`), `dt` cap `0.05`, `lastTime` reseteado al (re)arrancar. `syncReactState()` que difunde `onScore/onLives/onLevel` solo ante cambios y `onGameOver` una vez. Quitar el "pulsa ENTER para reiniciar" del original (eso lo gobierna el modal de React vía `restart()`). Preservar constantes y feel (muros mortales, +10/fruta, `BASE_STEP`/`MIN_STEP`), salvo la aceleración, que pasa a tramos de `TIER_SIZE = 5` frutas.
4. Registrar en `app/lib/games/registry.ts`: `import { createSerpentinaGame } from "./serpentina/engine";` + línea `"serpentina": createSerpentinaGame`. (El reproductor ya lo recoge por `id`; no se tocan `CanvasGame.tsx` ni `GamePlayer.tsx`.)
5. Verificación manual (ver Acceptance criteria).

> No se regenera `database.types.ts` (no cambia el esquema) ni se corre `get_advisors` (no se toca Supabase).

---

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de tipos de ruta.
- [ ] En `/jugar/serpentina` se juega el Snake real en canvas `800×600`: la serpiente se mueve con flechas y WASD, come frutas (sprite de `/games/serpentina/fruits.png`), crece y acelera.
- [ ] El HUD de React (`.player-hud`) refleja score real (+10 por fruta), vidas (`1` en juego, `0` al perder) y nivel (sube cada 5 frutas).
- [ ] Chocar contra un muro o contra el propio cuerpo abre el modal de fin con la puntuación real; "JUGAR DE NUEVO" reinicia limpio (serpiente de 3 segmentos, score 0, nivel 1) sin saltos.
- [ ] PAUSA/REANUDAR no provoca salto de simulación (la serpiente no da un paso extra al reanudar).
- [ ] `engine.ts` no usa estado global ni `document.getElementById`; al navegar fuera, `destroy()` cancela el RAF y quita los listeners de teclado; reentrar no duplica el loop ni acumula velocidad.
- [ ] `serpentina` resuelve a un motor en `registry.ts`; `rocas`, `caida` y `bloque-buster` siguen jugables y el resto de ids siguen como maqueta.
- [ ] El leaderboard de `serpentina` en `/salon` y en `/juego/serpentina` sigue mostrando las filas sembradas; `POST /api/scores` con `{ gameId: "serpentina", name, score }` válido inserta y aparece.

---

## Decisions

- **Sí:** reusar el patrón SPEC 05 (motor por `GameFactory` + registro) tal como lo replicaron SPEC 07 y 08. Un único origen de verdad para el ciclo de vida motor↔React.
- **Sí:** construir primero el prototipo en `references/started-games/05-snake` (no existía) y portarlo desde ahí, para que el juego tenga una referencia vanilla verificable igual que los demás.
- **Sí:** `onLives(1→0)` y `onLevel = tramo de velocidad` como traducción de un Snake que no tiene vidas ni niveles nativos (decidido en la entrevista), para que el HUD compartido nunca salga incoherente.
- **Sí:** muros mortales (no envolventes), +10 por fruta y frutas aleatorias del atlas, tal como el prototipo.
- **Sí:** servir `fruits.png` desde `public/games/serpentina/` y cargarlo idempotente, igual que el spritesheet de BLOQUE BUSTER.
- **No:** tocar catálogo, portada o `scores` de `serpentina` (ya implementados en SPEC 06).
- **No:** sonido, táctil, anti-cheat, auth real — cada uno en su propia spec.

---

## Risks

| Riesgo                                                                      | Mitigación                                                                                                                              |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| El port a TS introduce regresiones de feel (velocidad, crecimiento, giros). | Portar preservando constantes (`CELL`, `BASE_STEP`, `MIN_STEP`) y la regla anti-reversa 180°; verificar jugando en `/jugar/serpentina`. |
| Fugas de RAF/listeners al montar/desmontar en el App Router.                | `destroy()` cancela el RAF y quita listeners; el `useEffect` de `CanvasGame` retorna ese cleanup.                                       |
| La imagen de frutas no carga (ruta de asset) y el juego parece "vacío".     | Cargador idempotente con fallback a círculo dibujado hasta que `fruits.png` esté listo; asset en `public/games/serpentina/`.            |
| El cambio de aceleración por-fruta → por-tramo altera la dificultad.        | `TIER_SIZE = 5` mantiene el rango `BASE_STEP`→`MIN_STEP` del prototipo; verificación manual del ritmo.                                  |
| `INSERT` público en `scores` permite spam.                                  | `check` de rango/longitud ya vigente (SPEC 06); sin `UPDATE/DELETE`. Endurecer con auth + anti-cheat en otra spec.                      |

---

## Qué **no** está en esta spec

- Alta/edición de la fila `games` y siembra de `scores` de `serpentina` (ya existen desde SPEC 06).
- Rediseño de la portada `.cover-snake`.
- Sonido y efectos de audio.
- Controles táctiles / móviles.
- Anti-cheat / verificación server-side de puntuaciones.
- Auth real y vincular scores a un usuario.

Cada uno de esos, si llega, va en su propia spec.
