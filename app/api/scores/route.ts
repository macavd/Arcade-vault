// app/api/scores/route.ts — inserta una puntuación en el leaderboard (tabla `scores`).
// Valida el payload en servidor y delega en la capa de acceso. Patrón de SPEC 04.
import { NextResponse } from "next/server";
import { insertScore } from "@/app/lib/db/scores";
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Cuerpo JSON inválido." },
      { status: 400 },
    );
  }
  const { gameId, name, score } = (body ?? {}) as {
    gameId?: unknown;
    name?: unknown;
    score?: unknown;
  };
  if (typeof gameId !== "string" || typeof name !== "string") {
    return NextResponse.json(
      { ok: false, error: "gameId y name deben ser texto." },
      { status: 400 },
    );
  }
  const result = await insertScore({
    gameId,
    name,
    score: Number(score),
  });
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }
  return NextResponse.json(result, { status: 201 });
}
