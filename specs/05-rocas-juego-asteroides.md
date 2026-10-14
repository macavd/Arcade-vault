# SPEC 05 — Primer juego real: Asteroids ("ROCAS") sobre el reproductor

> **Status:** Implementado
> **Depends on:** Ninguna (el reproductor y `data.ts` ya existen; no toca Supabase)
> **Date:** 2026-10-14
> **Objective:** Montar el juego de asteroides ya construido (`references/started-games/02-asteroids`) como el primer juego jugable real de la plataforma, adaptando el canvas vanilla a un componente cliente de Next 16, conectado al HUD y al flujo de "guardar puntuación" existentes, y detrás de un **registro de juegos por `id`** que deje el patrón listo para enchufar más motores.

---

## Por qué existe esta spec

Hasta ahora el reproductor (`app/jugar/[id]/page.tsx`) es una **maqueta**: una "arena" hecha de `<div>`s con CSS (`.game-arena`, `.player-ship`, `.enemy`) y un `setInterval` que suma puntos al azar. Ningún juego es jugable. Ya existe un Asteroids completo y funcional en `references/started-games/02-asteroids/game.js` (canvas HTML5 puro, ~510 líneas, con nave, asteroides que se parten, partículas, power-up de triple disparo, vidas, niveles y game over).

Esta spec convierte ese prototipo en el **primer juego real** de Arcade Vault, mapeado al juego que ya figura en el catálogo con `id: "rocas"` ("ROCAS — Pulveriza asteroides en gravedad cero"). En lugar de incrustar el juego a mano solo en `rocas`, se introduce un **registro de motores por `id`**: `rocas` apunta al motor de Asteroids y el resto de ids conservan la maqueta actual. Así, cuando lleguen Tetris (`03-tetris`) y Arkanoid (`04-arkanoid`), solo hay que registrar su motor sin reescribir el reproductor.

El reto técnico central: el `game.js` original vive de **estado global de módulo** y efectos de navegador (listeners en `window`, `requestAnimationFrame`, acceso directo a `document`). En React/App Router eso debe encapsularse en una instancia que se **crea al montar y se destruye al desmontar**, sin fugas de listeners ni de loops de animación, y que **emita su estado** (score/vidas/nivel/fin) hacia React para reutilizar el chrome de la plataforma.

---

## Scope

**In:**

- **Motor de Asteroids portado** en `app/lib/games/asteroids/engine.ts`: la lógica de `references/started-games/02-asteroids/game.js` reescrita en TypeScript como una fábrica/clase `createAsteroidsGame(canvas, callbacks)` sin estado global de módulo. Preserva mecánicas, constantes y feel del original (velocidades, radios, puntos, power-up triple, invencibilidad, wrap toroidal).
- **Puente motor → React mediante callbacks:** el motor recibe `{ onScore, onLives, onLevel, onGameOver }` y los invoca cuando cambia su estado. El HUD React existente (`.player-hud`) y el modal de fin de partida de `/jugar` muestran esos valores. **El HUD interno del canvas se mantiene:** el juego conserva su propio canvas, sus controles y su HUD dibujado (`drawHUD`, iconos de vida, overlay `GAME OVER`), tal como en el original. Los dos HUD coexisten — el del canvas vive dentro del juego y el de React es la capa de UI de la plataforma; el motor es la fuente de verdad y notifica a React, sin que React deje de reflejarse también dentro del canvas.
- **Control de ciclo de vida desde React:** métodos `start()`, `pause()`, `resume()`, `restart()` y `destroy()`. `destroy()` cancela el `requestAnimationFrame` y quita los listeners de teclado. `pause/resume` los conecta a los botones PAUSA/REANUDAR que ya tiene la página.
- **Registro de juegos por `id`** en `app/lib/games/registry.ts`: mapa de `id` → cargador de motor (o `null` si aún es maqueta). Expone un helper `getGameEngine(id)`. Inicialmente solo `rocas` resuelve a un motor; el resto devuelve `null`.
- **Componente cliente** `app/components/games/CanvasGame.tsx`: monta un `<canvas>` dentro de `.crt-screen`, instancia el motor del registro vía `ref`/`useEffect`, cablea callbacks a estado React, y limpia todo en el cleanup. Resolución interna fija **800×600** (coincide con el `aspect-ratio: 4/3` del `.crt-screen`), escalada por CSS para llenar la pantalla CRT.
- **Reproductor condicional:** `app/jugar/[id]/page.tsx` renderiza `<CanvasGame>` cuando el `id` tiene motor registrado (hoy `rocas`); para el resto conserva la maqueta actual (`.game-arena` + `setInterval`) sin cambios de comportamiento.
- **Manejo de teclado correcto para web:** las flechas y `Espacio` usadas por el juego hacen `preventDefault` para no hacer scroll de la página; los listeners se asocian al montar el canvas y se quitan al desmontar.
- **Flujo de fin de partida de la plataforma:** al `onGameOver`, React abre el modal existente con la puntuación final y el input de iniciales; "JUGAR DE NUEVO" llama a `restart()` del motor. El guardado sigue siendo el mock actual (no persiste todavía).

**Out of scope (para futuras specs):**

- Motores de Tetris (`03-tetris`) y Arkanoid (`04-arkanoid`): el registro los deja enchufables, pero su portado va en sus propias specs.
- Persistencia real de puntuaciones en Supabase / leaderboards reales: el guardado sigue siendo mock (`seededScores` en el detalle, "GUARDADO" simulado en el modal). Entra con la spec de base de datos.
- Controles táctiles / móviles para el juego (las etiquetas del detalle dicen "TECLADO / TÁCTIL", pero el touch real queda fuera). El juego requiere teclado en esta fase.
- Sonido / efectos de audio.
- Cambios al catálogo `data.ts` (textos, `best`, `plays`), al detalle `/juego/[id]`, al salón, a la auth o a `SessionProvider`.
- Reescribir la maqueta de los demás juegos: siguen exactamente como están.

---

## Data model

Esta feature no introduce tablas ni estructuras persistentes. Los únicos "contratos" nuevos son los tipos del puente motor ↔ React:

```ts
// app/lib/games/types.ts
export interface GameCallbacks {
  onScore: (score: number) => void;
  onLives: (lives: number) => void;
  onLevel: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}

export interface GameEngine {
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void;
  destroy(): void;
}

export type GameFactory = (
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
) => GameEngine;
```

El registro asocia `id` del catálogo (`data.ts`) con una fábrica:

```ts
// app/lib/games/registry.ts (forma, no valores finales)
const REGISTRY: Record<string, GameFactory | undefined> = {
  rocas: createAsteroidsGame,
  // caida, serpentina, gloton, invasores, ranaria, duelo-pixel → undefined (maqueta)
};
export function getGameEngine(id: string): GameFactory | null {
  return REGISTRY[id] ?? null;
}
```

Las constantes de gameplay (RADII, SPEEDS, POINTS, power-up, etc.) se conservan como en el original, dentro del módulo del motor.

---

## Implementation plan

Cada paso deja la app compilando y navegable; la maqueta de los juegos no afectados nunca se rompe.

1. **Tipos del puente.** Crear `app/lib/games/types.ts` con `GameCallbacks`, `GameEngine` y `GameFactory`. Solo tipos; compila sin usarse.
2. **Portar el motor.** Crear `app/lib/games/asteroids/engine.ts` exportando `createAsteroidsGame: GameFactory`. Reescribir `game.js` en TS encapsulando **todo** el estado (antes global) dentro del closure/instancia; el `canvas` y el `ctx` vienen por parámetro, no de `document.getElementById`. Preservar clases `Bullet`/`Asteroid`/`Ship`/`Particle`/`PowerUp`, constantes y la mecánica. Sustituir:
   - `initGame`/`nextLevel`/`update`/`draw`/`loop` → métodos internos; `loop` guarda el id de `requestAnimationFrame` para poder cancelarlo.
   - Listeners `window` keydown/keyup → añadidos en `start()`, con `preventDefault` para `ArrowLeft/Right/Up/Down` y `Space`; removidos en `destroy()`.
   - El `drawHUD`, `drawLifeIcon` y el `drawOverlay('GAME OVER'…)` del original **se conservan** (el canvas sigue pintando su propio HUD y overlay). **Además**, cuando cambien `score`/`lives`/`level`/`state`, invocar `callbacks.onScore/onLives/onLevel/onGameOver` para notificar a React. Único cambio de comportamiento: el `Space-para-reiniciar` del game over se elimina (reinicia la plataforma vía `restart()`), para no competir con el botón del modal.
   - Exponer `start/pause/resume/restart/destroy`. `pause()` cancela el RAF y marca una bandera; `resume()` reanuda el loop reseteando `lastTime` para evitar un `dt` gigante.
3. **Registro.** Crear `app/lib/games/registry.ts` con el mapa `id → GameFactory` y `getGameEngine(id)`. Solo `rocas` resuelve; el resto `null`.
4. **Componente de canvas.** Crear `app/components/games/CanvasGame.tsx` (`"use client"`): recibe `{ gameId, paused, onScore, onLives, onLevel, onGameOver }` (o un `ref` imperativo para `restart`). En `useEffect`, resuelve la fábrica con `getGameEngine(gameId)`, instancia el motor sobre el `<canvas ref>` (800×600), llama a `start()` y retorna un cleanup que llama a `destroy()`. Un segundo efecto reacciona a `paused` → `pause()/resume()`. El `<canvas>` se estila para llenar `.crt-screen` (`width:100%; height:100%; display:block`).
5. **Conectar el reproductor.** Modificar `app/jugar/[id]/page.tsx`: si `getGameEngine(id)` existe, renderizar `<CanvasGame>` dentro de `.crt-screen` **en vez de** `.game-arena`, y dejar que sus callbacks alimenten los `useState` de `score`/`lives`/`level` y abran el modal `over` en `onGameOver`. Quitar, **solo en esa rama**, el `setInterval` mock de puntuación. Para ids sin motor, el componente renderiza exactamente la maqueta actual. "JUGAR DE NUEVO" del modal invoca `restart()` del motor (vía `ref`) y resetea el estado React.
6. **Teclado y foco.** Verificar que las flechas y `Espacio` no hacen scroll de la página y que, al salir del juego (SALIR/navegación), `destroy()` corre y los listeners desaparecen (sin dobles listeners al volver a entrar).
7. **Verificación.** `npm run build` compila. En `npm run dev`: entrar a `/jugar/rocas` → se juega Asteroids real; el HUD React muestra score/vidas/nivel reales; PAUSA congela el juego; morir 3 veces abre el modal de fin con la puntuación real; "JUGAR DE NUEVO" reinicia limpio. Entrar a `/jugar/caida` (u otro id) → sigue la maqueta falsa intacta. Navegar fuera y volver no acumula listeners ni duplica el loop (comprobable: el juego no se acelera al reentrar).

---

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de tipos de ruta.
- [ ] Existe `app/lib/games/types.ts` con `GameCallbacks`, `GameEngine` y `GameFactory`.
- [ ] `app/lib/games/asteroids/engine.ts` exporta `createAsteroidsGame` y **no** usa estado global de módulo ni `document.getElementById`; recibe el canvas por parámetro.
- [ ] `app/lib/games/registry.ts` mapea `rocas` al motor de Asteroids y devuelve `null` para los demás ids.
- [ ] En `/jugar/rocas` se juega el Asteroids real en canvas, con controles `←/→` (rotar), `↑` (propulsar) y `Espacio` (disparar), asteroides que se parten, power-up triple y 3 vidas con invencibilidad al reaparecer.
- [ ] El HUD de React (`.player-hud`) refleja la puntuación, vidas y nivel **reales** del motor (no el `setInterval` aleatorio).
- [ ] El HUD interno del canvas se mantiene: el juego sigue dibujando su propio score/nivel/vidas y su overlay de `GAME OVER` dentro del canvas, en paralelo al HUD de React.
- [ ] PAUSA/REANUDAR congela y reanuda el juego sin un salto de simulación (`dt` no se dispara al reanudar).
- [ ] Al perder la última vida se abre el modal de fin con la puntuación final real; "JUGAR DE NUEVO" reinicia el juego limpio y "VOLVER AL VAULT" navega a `/games`.
- [ ] Las flechas y `Espacio` no hacen scroll de la página durante el juego.
- [ ] Al navegar fuera de `/jugar/rocas` (o desmontar) se cancela el `requestAnimationFrame` y se quitan los listeners de teclado; reentrar no duplica el loop ni los listeners.
- [ ] Los ids sin motor (`caida`, `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`) conservan exactamente la maqueta actual.
- [ ] No se tocan `data.ts`, `/juego/[id]`, el salón, la auth, `SessionProvider` ni nada de Supabase.

---

## Decisions

- **Sí:** puente motor → React por callbacks (`onScore/onLives/onLevel/onGameOver`) **y** se conserva el HUD interno del canvas. React es la capa de UI de la plataforma (chrome uniforme: `.player-hud`, pausa, modal de guardar), y el juego mantiene su canvas autocontenido con su propio HUD, igual que el original. El motor es la fuente de verdad y notifica a React; los dos HUD coexisten. Se descarta eliminar el HUD del canvas porque el juego debe seguir siendo autocontenido (jugable y legible por sí mismo), y reconstruirlo solo en React duplicaría trabajo y perdería fidelidad con el prototipo.
- **Sí:** registro de juegos por `id` (`getGameEngine`) desde ya, aunque solo `rocas` tenga motor. Cuesta poco y deja el patrón listo para Tetris/Arkanoid sin reescribir el reproductor. Se descarta incrustar el juego solo en la rama `rocas` porque obligaría a refactorizar el reproductor en la siguiente spec.
- **Sí:** encapsular el motor en una fábrica/instancia sin estado global, con `destroy()` que limpia RAF + listeners. Es obligatorio en React para evitar fugas y dobles loops al montar/desmontar en el App Router. Se descarta copiar `game.js` casi tal cual con globales de módulo porque reentrar a la ruta acumularía listeners y aceleraría el juego.
- **Sí:** resolución interna fija 800×600 escalada por CSS. Coincide con el `aspect-ratio: 4/3` del `.crt-screen` y mantiene el feel del original (constantes en px) sin reescalar la física. Se descarta un canvas de tamaño dinámico (DPR/resize) por añadir complejidad que no cambia el gameplay en esta fase.
- **Sí:** reiniciar desde el modal de la plataforma (`restart()`), no con `Espacio` como en el original. Unifica el flujo con el resto del reproductor (botón "JUGAR DE NUEVO"). Se descarta el `Space-para-reiniciar` del game over para no competir con el botón del modal.
- **No:** persistir puntuaciones. El guardado sigue siendo mock; la persistencia real es de la spec de base de datos (se apoyará en los cimientos de Supabase de la SPEC 04).
- **No:** controles táctiles ni sonido en esta spec; el juego es de teclado y silencioso, igual que el prototipo.

---

## Risks

| Riesgo                                                                                                                                         | Mitigación                                                                                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fugas de `requestAnimationFrame` o listeners de teclado al montar/desmontar en el App Router (dobles loops, juego que se acelera al reentrar). | `destroy()` cancela el RAF guardado y remueve los listeners; el `useEffect` del componente retorna ese cleanup. Criterio de aceptación verifica reentrada. |
| `dt` gigante tras pausa o al cambiar de pestaña provoca un salto de simulación ("spiral of death").                                            | Conservar el `dt` cap de 50 ms del original y resetear `lastTime` en `resume()` para que el primer frame tras reanudar tenga `dt` normal.                  |
| Las flechas/`Espacio` hacen scroll de la página y arruinan el control.                                                                         | `preventDefault` en keydown para las teclas del juego; listeners añadidos solo mientras el canvas está montado.                                            |
| El puerto a TS introduce regresiones de feel (velocidades, splits, power-up) respecto al original.                                             | Portar preservando constantes y mecánica 1:1 (RADII/SPEEDS/POINTS, invencibilidad, triple shot); verificación manual jugando en `/jugar/rocas`.            |
| Romper por accidente la maqueta de los demás juegos al tocar `/jugar/[id]`.                                                                    | El cambio es condicional por `getGameEngine(id)`; la rama sin motor queda idéntica. Criterio de aceptación comprueba un id de maqueta.                     |

---

## What is **not** in this spec

- Portado de Tetris (`03-tetris`) y Arkanoid (`04-arkanoid`): el registro los habilita, pero cada uno va en su propia spec.
- Persistencia real de puntuaciones/leaderboards en Supabase (sigue el guardado mock).
- Controles táctiles/móviles y sonido.
- Cambios a `data.ts`, al detalle `/juego/[id]`, al salón, a la auth o a `SessionProvider`.
- Reescritura de la maqueta de los juegos sin motor.

Cada uno de esos, si llega, va en su propia spec.
