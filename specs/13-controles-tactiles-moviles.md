# SPEC 13 — Controles táctiles para jugar en móvil

> **Status:** Implementado
> **Depends on:** SPEC 05, SPEC 07, SPEC 08, SPEC 09
> **Date:** 2026-10-28
> **Objective:** Que los cuatro juegos jugables (rocas, caída, bloque-buster, serpentina) se puedan controlar con la pantalla táctil en móvil, mediante un overlay de la capa React que sintetiza los mismos eventos de teclado/ratón que ya leen los motores, sin tocar ningún `engine.ts`.

---

## Por qué existe esta spec

Hoy los cuatro motores jugables capturan input **por su cuenta** sobre `window`: `rocas` (Asteroids, SPEC 05), `caída` (Tetris, SPEC 07) y `serpentina` (Snake, SPEC 09) leen `keydown`/`keyup` por `e.code`; `bloque-buster` (Arkanoid, SPEC 08) lee `keydown`/`keyup` por `e.key` **y** `mousemove` sobre el canvas para mover la pala. No existe ninguna entrada táctil: en un teléfono los juegos cargan y se ven, pero no hay forma de jugarlos. Las SPEC 07, 08 y 09 dejaron "controles táctiles/móviles" explícitamente **fuera de alcance**, difiriéndolo a una spec propia. Esta es esa spec.

La decisión de diseño central (tomada en la entrevista) es **no tocar los motores**. En vez de añadir listeners `touch*` dentro de cada `engine.ts` (duplicaría lógica en cuatro sitios y reabriría código ya estable), la plataforma React monta un overlay de controles que, al pulsarse, **despacha a `window` los mismos eventos de teclado que los motores ya escuchan** (y, para la pala de Arkanoid, un `mousemove` sintético sobre el canvas). Así el input táctil reutiliza el camino de entrada existente y los motores permanecen intactos. Es el mismo principio que el resto de la plataforma: la UI (HUD, modales, selector de tema) vive en React y los motores solo emiten estado por callbacks.

---

## Scope

**In:**

- Un componente nuevo `app/components/games/TouchControls.tsx` que renderiza el overlay de controles táctiles sobre el `.crt-screen` del reproductor.
- Un mapa por juego `app/lib/games/touch-map.ts` que describe, por `id` de juego, qué botones mostrar y a qué tecla (`code` + `key`) corresponde cada uno, y si la acción es **mantenida** (hold) o de **toque** (tap).
- Síntesis de eventos: cada botón despacha `KeyboardEvent("keydown"/"keyup")` sobre `window` con `code`, `key` y `bubbles: true`, imitando exactamente lo que teclea el jugador.
- Control especial de `bloque-buster`: arrastrar el dedo sobre el canvas mueve la pala, traduciendo `touchmove` a un `MouseEvent("mousemove")` sintético sobre el elemento `<canvas>` (posición absoluta, igual que hoy con el ratón).
- Detección de dispositivo táctil con `window.matchMedia("(pointer: coarse)")`: el overlay solo se monta en dispositivos táctiles.
- Integración en `app/components/GamePlayer.tsx`: montar `TouchControls` solo cuando `hasEngine` **y** el dispositivo es táctil.
- Exponer el elemento `<canvas>` desde `app/components/games/CanvasGame.tsx` a través de su handle (`CanvasGameHandle`), necesario para el arrastre de pala de `bloque-buster`.
- Estilos del overlay en `app/globals.css` (clase `.touch-controls` y derivadas), legibles sobre el CRT oscuro y sin romper el layout de desktop.

**Out of scope (para futuras specs):**

- Tocar cualquier `app/lib/games/<slug>/engine.ts`. Los motores no se modifican.
- Las maquetas (ids sin motor registrado): no tienen input real, no reciben controles.
- Reajuste responsive del `.crt-screen` para pantallas pequeñas y aviso de "gira el teléfono a horizontal" (orientación). Queda para otra spec.
- Pantalla completa (fullscreen API), vibración/haptics y audio.
- Rediseño del HUD o de los botones PAUSA/FIN/SALIR existentes.
- Soporte de gamepad/mando físico.
- Auto-repetición al mantener pulsado un botón de **toque** (p. ej. mantener `↓` en Tetris para soft-drop continuo): cada pulsación equivale a un toque. Ver Decisiones.

---

## Data model

Esta spec **no toca Supabase** ni introduce estructuras persistentes. El único "modelo" nuevo es la configuración de controles por juego.

```ts
// app/lib/games/touch-map.ts
// Una acción táctil = un botón del overlay que sintetiza una tecla.
// hold=true  → keydown al tocar, keyup al soltar (empuje/rotación/pala mantenida).
// hold=false → keydown+keyup en el mismo toque (disparo, giro, mover pieza).
export interface TouchAction {
  label: string; // glifo/etiqueta del botón, p. ej. "◄", "▲", "⟳", "⦿"
  code: string; // KeyboardEvent.code que leen rocas/caída/serpentina (p. ej. "ArrowUp", "Space", "KeyX")
  key: string; // KeyboardEvent.key que lee bloque-buster (p. ej. "ArrowLeft", " ")
  hold: boolean;
  slot:
    | "dpad-left"
    | "dpad-right"
    | "dpad-up"
    | "dpad-down"
    | "action-a"
    | "action-b";
}

// Un juego puede usar botones, arrastre de canvas, o ambos.
export interface TouchScheme {
  buttons: TouchAction[];
  canvasDrag?: boolean; // true solo en bloque-buster (pala por arrastre)
}

export const TOUCH_MAP: Record<string, TouchScheme>;
```

**Esquema por juego** (teclas tomadas de los motores actuales, no se inventan):

- `rocas` — `ArrowLeft`/`ArrowRight` rotar (hold), `ArrowUp` empuje (hold), `Space` disparar (tap). Los motores leen `e.code`.
- `caida` — `ArrowLeft`/`ArrowRight` mover (tap), `ArrowDown` soft-drop (tap), `ArrowUp` rotar (tap), `Space` hard-drop (tap). Lee `e.code`. (El motor también acepta `KeyX` para rotar; el overlay usa `ArrowUp`.)
- `bloque-buster` — `canvasDrag: true` (pala por arrastre absoluto); además botones `ArrowLeft`/`ArrowRight` (hold) como alternativa. El motor lee `e.key` para las flechas y `mousemove` para el arrastre.
- `serpentina` — `ArrowLeft`/`ArrowRight`/`ArrowUp`/`ArrowDown` girar (tap). Lee `e.code`.

Los eventos sintéticos de teclado fijan **`code` y `key` a la vez**, porque los motores no coinciden en cuál leen (rocas/caída/serpentina → `code`; bloque-buster → `key`). Así un mismo despachador sirve para los cuatro.

---

## Implementation plan

Cada paso deja la app compilando y navegable.

1. **Config por juego.** Crear `app/lib/games/touch-map.ts` con los tipos `TouchAction`/`TouchScheme` y la constante `TOUCH_MAP` para `rocas`, `caida`, `bloque-buster` y `serpentina`, según el esquema de arriba. Sin lógica de DOM todavía.
2. **Exponer el canvas.** En `app/components/games/CanvasGame.tsx`, ampliar `CanvasGameHandle` con `getCanvas(): HTMLCanvasElement | null` que devuelva `canvasRef.current` (vía `useImperativeHandle`). No cambia el comportamiento actual.
3. **Despachador de teclas.** En `TouchControls.tsx`, implementar `fireKey(code, key, type)` que haga `window.dispatchEvent(new KeyboardEvent(type, { code, key, bubbles: true }))`. Un botón `hold` dispara `keydown` en `pointerdown` y `keyup` en `pointerup`/`pointercancel`/`pointerleave`; un botón `tap` dispara `keydown` e inmediatamente `keyup` en `pointerdown`. Usar eventos **pointer** (no `click`) y `e.preventDefault()` para que no haya retardo ni scroll. Garantizar que no queden teclas "pegadas": al desmontar o perder el puntero, emitir `keyup` de las holds activas.
4. **Overlay de botones.** `TouchControls` recibe `gameId`, lee `TOUCH_MAP[gameId]` y renderiza los botones en sus `slot` (D-pad a la izquierda, botones de acción a la derecha). Si no hay entrada para ese id, no renderiza nada.
5. **Arrastre de pala (bloque-buster).** Si `TOUCH_MAP[gameId].canvasDrag`, `TouchControls` añade listeners `touchstart`/`touchmove` sobre el `<canvas>` (obtenido con `getCanvas()` del paso 2) y, por cada movimiento, despacha `new MouseEvent("mousemove", { clientX: touch.clientX, bubbles: true })` sobre el canvas, reutilizando el `onMouseMove` del motor. Quitar los listeners al desmontar.
6. **Detección táctil.** En `TouchControls` (o un hook `useCoarsePointer`), calcular `matchMedia("(pointer: coarse)").matches` tras el montaje (nunca en SSR), guardándolo en estado para evitar desajuste de hidratación. Si no es táctil, el componente devuelve `null`.
7. **Integrar en el reproductor.** En `app/components/GamePlayer.tsx`, montar `<TouchControls gameId={id} canvasRef={canvasGameRef} />` dentro de `.crt` solo cuando `hasEngine`. La propia detección del paso 6 lo oculta en desktop. Pausar: cuando `paused` u `over`, el overlay se oculta o se desactiva (los botones no despachan).
8. **Estilos.** En `app/globals.css`, añadir `.touch-controls` y clases de botón: posicionados sobre/junto al `.crt-screen`, con `touch-action: none`, área táctil ≥ 44px, semitransparentes para no tapar el juego, y ocultos por `@media (pointer: fine)` como segunda barrera además de la detección JS. Delegar los colores/acabado neón concretos a `/frontend-design`.
9. **Verificación manual** en emulación móvil del navegador y, si es posible, en un teléfono real (ver Acceptance criteria).

> No se regenera `database.types.ts` ni se corre `get_advisors`: esta spec no toca Supabase.

---

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de tipos de ruta.
- [ ] Ningún archivo bajo `app/lib/games/<slug>/engine.ts` aparece modificado en el diff.
- [ ] En un dispositivo/emulación con `pointer: coarse`, en `/jugar/rocas` se puede rotar la nave (←/→), empujar (↑) y disparar (Espacio) solo con la pantalla.
- [ ] En `/jugar/caida` se puede mover (←/→), rotar (↑), soft-drop (↓) y hard-drop (Espacio) solo con la pantalla.
- [ ] En `/jugar/bloque-buster` se puede mover la pala arrastrando el dedo sobre el canvas, y también con los botones ←/→.
- [ ] En `/jugar/serpentina` se puede girar en las cuatro direcciones solo con la pantalla.
- [ ] En desktop (`pointer: fine`) el overlay táctil **no** aparece y el juego se controla con teclado/ratón exactamente como hoy.
- [ ] Mantener pulsado un botón de empuje/rotación (rocas) mantiene la acción; al soltar, para. No quedan teclas "pegadas" tras soltar, cambiar de pestaña o salir del juego.
- [ ] Con el juego en PAUSA o en el modal de FIN, los botones táctiles no afectan la partida.
- [ ] Al salir del reproductor (`destroy` del canvas / desmontaje), se quitan los listeners del canvas y no se despacha ningún evento residual.
- [ ] El teclado físico sigue funcionando en los cuatro juegos (el overlay no lo rompe).

---

## Decisions

- **Sí:** sintetizar los eventos que los motores ya escuchan, desde un overlay de React. Cero cambios en los motores, un único punto de mantenimiento del input táctil.
- **No:** añadir listeners `touch*` dentro de cada `engine.ts`. Duplicaría lógica en cuatro motores estables y reabriría código ya verificado.
- **No:** ampliar el contrato `GameEngine` con un método `input(action)`. Sería más "limpio" a largo plazo pero obliga a tocar los cuatro motores y `types.ts`; se descarta a favor de no tocar motores.
- **Sí:** control híbrido por juego — botones para rocas/caída/serpentina y arrastre de canvas para la pala de bloque-buster (más botones ←/→ como alternativa), porque cada género se juega distinto.
- **Sí:** fijar `code` **y** `key` en el `KeyboardEvent` sintético, porque bloque-buster lee `e.key` y el resto `e.code`.
- **Sí:** usar eventos **pointer** con `preventDefault` en vez de `click`, para respuesta inmediata y permitir mantener pulsado.
- **Sí:** mostrar el overlay solo si `matchMedia("(pointer: coarse)")`, calculado tras el montaje para no romper la hidratación SSR, con `@media (pointer: fine)` como segunda barrera en CSS.
- **No:** auto-repetición al mantener pulsado un botón de toque (soft-drop/mover en Tetris). Cada toque = una pulsación; si se necesita, va en otra spec.
- **No:** reajuste responsive del CRT ni aviso de orientación horizontal. Es un problema de layout aparte; esta spec solo añade el control.
- **No:** tocar Supabase, catálogo, leaderboard ni el sistema de skins.

---

## Risks

| Riesgo                                                                                               | Mitigación                                                                                                                        |
| ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Teclas "pegadas": un botón `hold` queda en `keydown` si el dedo sale del botón o cambia de pestaña.  | Emitir `keyup` también en `pointercancel`/`pointerleave`/`blur` y al desmontar; cerrar todas las holds activas.                   |
| Desajuste de hidratación al depender de `matchMedia` (no existe en SSR).                             | Calcular la detección en `useEffect` tras el montaje; render inicial sin overlay y, si es táctil, aparece en el cliente.          |
| El motor de bloque-buster lee `e.key` y el resto `e.code`; un solo despachador podría fallar en uno. | El `KeyboardEvent` sintético fija `code` y `key` a la vez; test manual en los cuatro juegos (criterio de aceptación por juego).   |
| El overlay tapa parte del área de juego en pantallas chicas.                                         | Botones semitransparentes y pegados a los bordes; el reajuste fino del CRT se difiere a la spec de layout/orientación.            |
| `preventDefault` insuficiente deja que el toque haga scroll/zoom de la página.                       | `touch-action: none` en `.touch-controls` y en el canvas durante el arrastre, más `preventDefault` en los handlers pointer/touch. |

---

## Qué **no** está en esta spec

- Modificar cualquier `engine.ts` de los juegos.
- Controles para las maquetas (ids sin motor).
- Reajuste responsive del `.crt-screen` y aviso de girar a horizontal (orientación).
- Pantalla completa, vibración/haptics y audio.
- Auto-repetición de botones de toque mantenidos.
- Soporte de gamepad/mando físico.
- Cualquier cambio en Supabase, catálogo, leaderboard o skins.

Cada uno de esos, si llega, va en su propia spec.
