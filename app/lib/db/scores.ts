// app/lib/db/scores.ts — acceso a las puntuaciones (tabla `scores`) desde el servidor.
// Leaderboard persistente desde SPEC 06. Usa el cliente server de SPEC 04.
import { createClient } from "../supabase/server";
import type { ScoreRow } from "../data";
function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}
// Mejores puntuaciones de un juego, orden descendente, con rango 1..n.
export async function getTopScores(
  gameId: string,
  limit = 12,
): Promise<ScoreRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scores")
    .select("name, score, created_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .limit(limit);
  if (error)
    throw new Error(`No se pudieron cargar las puntuaciones: ${error.message}`);
  return (data ?? []).map((row, i) => ({
    rank: i + 1,
    name: row.name,
    score: row.score,
    date: formatDate(row.created_at),
  }));
}
export type InsertScoreResult = { ok: true } | { ok: false; error: string };
// Inserta una puntuación anónima (iniciales). Valida en servidor antes de insertar.
export async function insertScore(input: {
  gameId: string;
  name: string;
  score: number;
}): Promise<InsertScoreResult> {
  const gameId = String(input.gameId ?? "").trim();
  const name = String(input.name ?? "")
    .trim()
    .toUpperCase()
    .slice(0, 10);
  const score = Number(input.score);
  if (!gameId) return { ok: false, error: "Falta el juego." };
  if (name.length < 1) return { ok: false, error: "El nombre es obligatorio." };
  if (!Number.isInteger(score) || score < 0 || score > 100_000_000)
    return { ok: false, error: "Puntuación inválida." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("scores")
    .insert({ game_id: gameId, name, score });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
