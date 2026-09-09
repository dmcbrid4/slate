import { SlateApp } from '@/components/SlateApp';
import { getInitialScoreboardData } from '@/server/scoreboard';

export default async function Home() {
  const scoreboardData = await getInitialScoreboardData();
  return <SlateApp scoreboardData={scoreboardData}/>;
}
