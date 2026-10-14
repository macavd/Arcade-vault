// app/lib/db/games.ts — acceso al catálogo (tabla `games`) desde el servidor.
// Fuente de verdad del catálogo desde SPEC 06. Usa el cliente server de SPEC 04.
import { createClient } from "../supabase/server";
import type { Game, GameCategory, NeonColor } from "../data";
import type { Database } from "../supabase/database.types";
type GameRow = Database["public"]["Tables"]["games"]["Row"];
function toGame(row: GameRow): Game {
  return {
    id: row.id,
    title: row.title,
    short: row.short,
    long: row.long,
    cat: row.cat as GameCategory,
    cover: row.cover,
    color: row.color as NeonColor,
    best: row.best,
    plays: row.plays,
  };
}
// Catálogo completo, en el orden de la biblioteca (columna `position`).
export async function getGames(): Promise<Game[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .order("position", { ascending: true });
  if (error) throw new Error(`No se pudo cargar el catálogo: ${error.message}`);
  return (data ?? []).map(toGame);
}
// Un juego por su slug, o null si no existe.
export async function getGameById(id: string): Promise<Game | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`No se pudo cargar el juego: ${error.message}`);
  return data ? toGame(data) : null;
}
