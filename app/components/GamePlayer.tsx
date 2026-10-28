"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Game } from "../lib/data";
import type { GameSkin } from "../lib/games/types";
import { useSession } from "./SessionProvider";
import { getGameEngine } from "../lib/games/registry";
import { getAvailableSkins, SKIN_LABELS } from "../lib/games/skins";
import CanvasGame, { type CanvasGameHandle } from "./games/CanvasGame";
import TouchControls from "./games/TouchControls";
export default function GamePlayer({ game }: { game: Game }) {
  const router = useRouter();
  const { user } = useSession();
  const id = game.id;
  // Si el id tiene motor registrado, se juega el juego real; si no, maqueta.
  const hasEngine = getGameEngine(id) !== null;
  // Skins disponibles del juego (null si no tiene sistema de skins). El primero
  // es el default; solo se muestra selector si la lista existe.
  const availableSkins = getAvailableSkins(id);
  const canvasGameRef = useRef<CanvasGameHandle>(null);
  const [skin, setSkin] = useState<GameSkin>(
    availableSkins ? availableSkins[0] : "clasico",
  );
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [name, setName] = useState(user ? user.name : "INVITADO");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Puntuacion mock: solo para las maquetas (ids sin motor). Con motor, el
  // score lo alimenta la callback onScore del juego real.
  useEffect(() => {
    if (hasEngine || over || paused) return;
    const t = setInterval(
      () => setScore((s) => s + Math.floor(10 + Math.random() * 90)),
      220,
    );
    return () => clearInterval(t);
  }, [hasEngine, over, paused]);
  useEffect(() => {
    if (hasEngine) return;
    if (score > 0 && score % 2500 < 100) setLevel((l) => l + 1);
  }, [hasEngine, score]);
  const endGame = () => setOver(true);
  const restart = () => {
    setScore(0);
    setLives(3);
    setLevel(1);
    setPaused(false);
    setOver(false);
    setSaved(false);
    setSaving(false);
    setSaveError(null);
    // Reinicia tambien el motor del juego real (si lo hay).
    canvasGameRef.current?.restart();
  };
  const changeSkin = (next: GameSkin) => {
    if (next === skin) return;
    // Cambiar de tema reinstancia el motor (CanvasGame lo recrea al cambiar la
    // prop skin), lo que reinicia la partida. Reseteamos el HUD y los modales
    // para que la UI quede coherente con la partida nueva.
    setSkin(next);
    setScore(0);
    setLives(3);
    setLevel(1);
    setPaused(false);
    setOver(false);
    setSaved(false);
    setSaving(false);
    setSaveError(null);
  };
  const saveScore = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: id, name, score }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setSaveError(data.error ?? "No se pudo guardar la puntuación.");
      } else {
        setSaved(true);
      }
    } catch {
      setSaveError("Error de red al guardar la puntuación.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{"♥ ".repeat(lives).trim() || "—"}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
        </div>
        {hasEngine && availableSkins && (
          <div
            className="theme-select"
            role="radiogroup"
            aria-label="Tema del juego"
          >
            <span className="theme-select-label">Tema</span>
            <div className="theme-opts">
              {availableSkins.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={skin === s}
                  className={`theme-opt is-${s}${skin === s ? " active" : ""}`}
                  onClick={() => changeSkin(s)}
                >
                  {SKIN_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="hud-actions">
          <button className="btn yellow" onClick={() => setPaused((p) => !p)}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={endGame}>
            FIN
          </button>
          <button
            className="btn ghost"
            onClick={() => router.push(`/juego/${game.id}`)}
          >
            SALIR
          </button>
        </div>
      </div>
      <div className="crt">
        <div className="crt-screen">
          {hasEngine ? (
            <CanvasGame
              ref={canvasGameRef}
              gameId={id}
              paused={paused}
              skin={skin}
              onScore={setScore}
              onLives={setLives}
              onLevel={setLevel}
              onGameOver={(finalScore) => {
                setScore(finalScore);
                setOver(true);
              }}
            />
          ) : (
            <div className="game-arena">
              <div className="grid-floor" />
              <div className="enemy e1" />
              <div className="enemy e2" />
              <div className="enemy e3" />
              <div className="player-ship" />
            </div>
          )}
          {paused && (
            <div
              className="crt-content"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
            >
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        {hasEngine && (
          <TouchControls
            gameId={id}
            canvasRef={canvasGameRef}
            disabled={paused || over}
          />
        )}
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>
      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value.toUpperCase().slice(0, 10))
                  }
                  placeholder="TUS INICIALES"
                />
                <button
                  className="btn yellow"
                  onClick={saveScore}
                  disabled={saving || name.trim().length === 0}
                >
                  {saving ? "GUARDANDO…" : "GUARDAR PUNTUACIÓN"}
                </button>
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            {saveError && (
              <div
                className="mono"
                style={{
                  fontSize: 11,
                  color: "var(--magenta)",
                  marginTop: 8,
                  letterSpacing: "0.1em",
                }}
              >
                ✕ {saveError}
              </div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <button
                className="btn magenta"
                onClick={() => router.push("/games")}
              >
                VOLVER AL VAULT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
