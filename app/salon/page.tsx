import { getGames } from "../lib/db/games";
import { getTopScores } from "../lib/db/scores";
import type { ScoreRow } from "../lib/data";
import HallOfFame from "../components/HallOfFame";
export default async function HallOfFamePage() {
  const games = await getGames();
  const scoreLists = await Promise.all(
    games.map((g) => getTopScores(g.id, 12)),
  );
  const scoresByGame: Record<string, ScoreRow[]> = {};
  games.forEach((g, i) => {
    scoresByGame[g.id] = scoreLists[i];
  });
  return <HallOfFame games={games} scoresByGame={scoresByGame} />;
}
