import 'server-only';

const API_BASE = 'https://api.football-data.org/v4';

export async function fetchPremierLeagueMatches(dateFrom: string, dateTo: string): Promise<unknown> {
  const token = process.env.FOOTBALL_DATA_API_TOKEN;
  if (!token) throw new Error('football_data_token_missing');
  const url = new URL(`${API_BASE}/competitions/PL/matches`);
  url.searchParams.set('dateFrom', dateFrom);
  url.searchParams.set('dateTo', dateTo);
  const response = await fetch(url, {
    headers: { 'X-Auth-Token': token },
    cache: 'no-store',
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`football_data_http_${response.status}`);
  return response.json();
}

