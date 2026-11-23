"use client";
import { useEffect, useRef, useState } from "react";
// SPEC 16 — Instrumentación de rendimiento, SOLO en desarrollo.
//
// Mide el frame-time real de la página (su propio rAF comparte el main thread y
// el compositor con el loop del juego, así que refleja los drops del canvas) y
// muestra ms/frame medio, fps y el pico del último segundo. Se activa con el
// flag `?debug=perf` en la URL del reproductor.
//
// Doble barrera para que NUNCA llegue a producción:
//   1. `process.env.NODE_ENV !== "production"` → en el build de producción el
//      cuerpo del efecto es código muerto y el overlay no se monta nunca.
//   2. aun en dev, solo aparece si la URL trae `?debug=perf`.
export default function PerfOverlay() {
  const [stats, setStats] = useState<{
    avg: number;
    fps: number;
    peak: number;
  } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (typeof window === "undefined") return;
    if (!new URLSearchParams(window.location.search).has("debug")) return;
    if (new URLSearchParams(window.location.search).get("debug") !== "perf")
      return;
    let rafId = 0;
    let last = performance.now();
    let frames: number[] = [];
    let lastReport = last;
    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      // Ignora el primer frame y los saltos de pestaña en segundo plano.
      if (dt > 0 && dt < 1000) frames.push(dt);
      if (now - lastReport >= 500 && frames.length > 0) {
        const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
        const peak = Math.max(...frames);
        setStats({ avg, fps: 1000 / avg, peak });
        frames = [];
        lastReport = now;
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);
  if (!stats) return null;
  // Rojo si cae por debajo de ~55 fps (>18 ms), ámbar cerca del límite, verde ok.
  const color =
    stats.avg > 18 ? "#ff2d6f" : stats.avg > 16.8 ? "#f5ff00" : "#00ff88";
  return (
    <div
      ref={boxRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        top: 8,
        left: 8,
        zIndex: 10,
        padding: "4px 8px",
        font: "11px/1.4 ui-monospace, monospace",
        color,
        background: "rgba(0,0,0,0.72)",
        border: `1px solid ${color}`,
        borderRadius: 6,
        pointerEvents: "none",
        whiteSpace: "pre",
        letterSpacing: "0.04em",
      }}
    >
      {`${stats.avg.toFixed(1)} ms  ${Math.round(stats.fps)} fps\npeak ${stats.peak.toFixed(1)} ms`}
    </div>
  );
}
