import { getGames } from "../lib/db/games";
import GamesBrowser from "../components/GamesBrowser";
export default async function GamesPage() {
  const games = await getGames();
  return <GamesBrowser games={games} />;
}
