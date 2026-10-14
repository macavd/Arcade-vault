import { notFound } from "next/navigation";
import { getGameById } from "../../lib/db/games";
import GamePlayer from "../../components/GamePlayer";
export default async function GamePlayerPage({
  params,
}: PageProps<"/jugar/[id]">) {
  const { id } = await params;
  const game = await getGameById(id);
  if (!game) notFound();
  return <GamePlayer game={game} />;
}
