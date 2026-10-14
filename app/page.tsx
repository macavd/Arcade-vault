import { getGames } from "./lib/db/games";
import HomeContent from "./components/HomeContent";
export default async function Home() {
  const games = await getGames();
  return <HomeContent games={games} />;
}
