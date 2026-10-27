"use client";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { getGameEngine } from "../../lib/games/registry";
import type { GameEngine, GameSkin } from "../../lib/games/types";
export interface CanvasGameHandle {
  restart: () => void;
}
interface CanvasGameProps {
  gameId: string;
  paused: boolean;
  // Skin seleccionado del juego (SPEC 10). Opcional con default "clasico"
  // mientras no exista selector en la UI; el motor lo recibe como 3er argumento.
  skin?: GameSkin;
  onScore: (score: number) => void;
  onLives: (lives: number) => void;
  onLevel: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}
// Monta un <canvas> dentro de .crt-screen e instancia el motor del registro.
// El motor se crea al montar y se destruye al desmontar (cancela RAF + quita
// listeners), evitando dobles loops al reentrar a la ruta en el App Router.
const CanvasGame = forwardRef<CanvasGameHandle, CanvasGameProps>(
  function CanvasGame(
    { gameId, paused, skin = "clasico", onScore, onLives, onLevel, onGameOver },
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<GameEngine | null>(null);
    // Las callbacks cambian de identidad en cada render; las guardamos en un
    // ref para no reinstanciar el motor y seguir llamando a las ultimas.
    const cbRef = useRef({ onScore, onLives, onLevel, onGameOver });
    cbRef.current = { onScore, onLives, onLevel, onGameOver };
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const factory = getGameEngine(gameId);
      if (!factory) return;
      const engine = factory(
        canvas,
        {
          onScore: (n) => cbRef.current.onScore(n),
          onLives: (n) => cbRef.current.onLives(n),
          onLevel: (n) => cbRef.current.onLevel(n),
          onGameOver: (n) => cbRef.current.onGameOver(n),
        },
        skin,
      );
      engineRef.current = engine;
      engine.start();
      return () => {
        engine.destroy();
        engineRef.current = null;
      };
      // El skin se fija al crear el motor; cambiarlo reinstancia (reinicia la
      // partida), aceptable mientras no exista selector en vivo.
    }, [gameId, skin]);
    // Conecta la bandera paused de React al pause()/resume() del motor.
    useEffect(() => {
      const engine = engineRef.current;
      if (!engine) return;
      if (paused) engine.pause();
      else engine.resume();
    }, [paused]);
    useImperativeHandle(
      ref,
      () => ({
        restart: () => engineRef.current?.restart(),
      }),
      [],
    );
    return (
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
    );
  },
);
export default CanvasGame;
