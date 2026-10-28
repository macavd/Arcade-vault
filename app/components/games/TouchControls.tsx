"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
  type RefObject,
} from "react";
import { TOUCH_MAP, type TouchAction } from "../../lib/games/touch-map";
import type { CanvasGameHandle } from "./CanvasGame";
interface TouchControlsProps {
  gameId: string;
  // Handle del CanvasGame: su getCanvas() da el <canvas> para el arrastre de
  // pala de bloque-buster (paso 5).
  canvasRef: RefObject<CanvasGameHandle | null>;
  // Cuando está desactivado (pausa / fin de partida) los botones no despachan
  // nada. Se cablea desde GamePlayer en el paso 7.
  disabled?: boolean;
}
// Overlay de controles táctiles (SPEC 13).
//
// No toca ningún engine.ts: sintetiza sobre `window` los mismos KeyboardEvent
// que los motores ya leen. Un botón "hold" mantiene la tecla (keydown al tocar,
// keyup al soltar); un botón "tap" emite keydown+keyup en el mismo toque.
// Se fijan `code` Y `key` a la vez porque bloque-buster lee `e.key` y el resto
// `e.code`.
export default function TouchControls({
  gameId,
  canvasRef,
  disabled,
}: TouchControlsProps) {
  const scheme = TOUCH_MAP[gameId];
  // Detección de dispositivo táctil (paso 6). useSyncExternalStore es SSR-safe:
  // el snapshot del servidor devuelve false (render inicial sin overlay = igual
  // que el servidor, sin desajuste de hidratación) y en cliente lee matchMedia,
  // suscribiéndose a sus cambios. En desktop (pointer: fine) queda en false.
  const isCoarse = useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia("(pointer: coarse)");
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(pointer: coarse)").matches,
    () => false,
  );
  // Teclas "hold" actualmente pulsadas, por `code`. Permite soltar cualquier
  // tecla pegada al desmontar, perder el puntero o quedar desactivado.
  const activeHolds = useRef<Map<string, TouchAction>>(new Map());
  // Despacha un KeyboardEvent sintético sobre window imitando al jugador.
  const fireKey = useCallback(
    (code: string, key: string, type: "keydown" | "keyup") => {
      window.dispatchEvent(
        new KeyboardEvent(type, { code, key, bubbles: true }),
      );
    },
    [],
  );
  // Suelta todas las teclas hold activas (keyup). Se usa al desmontar y cuando
  // el overlay se desactiva, para no dejar teclas "pegadas".
  const releaseAllHolds = useCallback(() => {
    for (const action of activeHolds.current.values()) {
      fireKey(action.code, action.key, "keyup");
    }
    activeHolds.current.clear();
  }, [fireKey]);
  // Al desmontar, soltar cualquier hold pendiente.
  useEffect(() => releaseAllHolds, [releaseAllHolds]);
  // Si el overlay queda desactivado con teclas mantenidas, soltarlas.
  useEffect(() => {
    if (disabled) releaseAllHolds();
  }, [disabled, releaseAllHolds]);
  // `disabled` en un ref para que el listener de arrastre lea el valor vivo sin
  // re-adjuntarse en cada pausa.
  const disabledRef = useRef(disabled);
  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);
  // Arrastre de pala de bloque-buster (paso 5): traduce touchmove sobre el
  // <canvas> a un MouseEvent("mousemove") sintético. El motor ya mapea clientX
  // a su sistema de coordenadas (lee getBoundingClientRect por su cuenta), así
  // que reutilizamos su onMouseMove sin tocarlo.
  const canvasDrag = scheme?.canvasDrag ?? false;
  useEffect(() => {
    if (!canvasDrag || !isCoarse) return;
    const canvas = canvasRef.current?.getCanvas();
    if (!canvas) return;
    const onTouch = (e: TouchEvent) => {
      if (disabledRef.current) return;
      const touch = e.touches[0];
      if (!touch) return;
      e.preventDefault();
      canvas.dispatchEvent(
        new MouseEvent("mousemove", { clientX: touch.clientX, bubbles: true }),
      );
    };
    // Evita que el toque sobre el canvas haga scroll/zoom de la página.
    const prevTouchAction = canvas.style.touchAction;
    canvas.style.touchAction = "none";
    canvas.addEventListener("touchstart", onTouch, { passive: false });
    canvas.addEventListener("touchmove", onTouch, { passive: false });
    return () => {
      canvas.style.touchAction = prevTouchAction;
      canvas.removeEventListener("touchstart", onTouch);
      canvas.removeEventListener("touchmove", onTouch);
    };
  }, [canvasDrag, canvasRef, isCoarse]);
  if (!scheme || !isCoarse) return null;
  const handlePointerDown =
    (action: TouchAction) => (e: React.PointerEvent) => {
      e.preventDefault();
      if (disabled) return;
      if (action.hold) {
        activeHolds.current.set(action.code, action);
        fireKey(action.code, action.key, "keydown");
      } else {
        fireKey(action.code, action.key, "keydown");
        fireKey(action.code, action.key, "keyup");
      }
    };
  // keyup para botones hold: al soltar, cancelar o salir del botón.
  const handlePointerUp = (action: TouchAction) => (e: React.PointerEvent) => {
    e.preventDefault();
    if (!action.hold) return;
    if (activeHolds.current.delete(action.code)) {
      fireKey(action.code, action.key, "keyup");
    }
  };
  return (
    <div className="touch-controls" aria-hidden="true">
      {scheme.buttons.map((action) => (
        <button
          key={action.slot}
          type="button"
          className={`touch-btn touch-${action.slot}`}
          onPointerDown={handlePointerDown(action)}
          onPointerUp={handlePointerUp(action)}
          onPointerCancel={handlePointerUp(action)}
          onPointerLeave={handlePointerUp(action)}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
