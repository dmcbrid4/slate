import { SlateApp } from '@/components/SlateApp';
import { getInitialScoreboardData } from '@/server/scoreboard';

// Real tennis mode depends on this route actually re-running getInitialScoreboardData() on every
// request (that's what "request-driven refresh" in docs/phase-2.md means - the first request past
// a refresh deadline fetches upstream, concurrent requests read the same accepted snapshot). With
// no dynamic API usage here, Next.js would otherwise statically prerender this page once at build
// time and freeze whatever it fetched into the served HTML forever.
export const dynamic = 'force-dynamic';

export default async function Home() {
  const scoreboardData = await getInitialScoreboardData();
  return <SlateApp scoreboardData={scoreboardData}/>;
}
