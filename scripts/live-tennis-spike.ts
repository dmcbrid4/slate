import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { loadEnvFile } from "node:process";

const BASE_URL = "https://api.livetennisapi.com/api/public/v1";
const HARD_DAILY_LIMIT = 80;
const SURVEY_REQUEST_LIMIT = 14;
const OBSERVE_REQUEST_LIMIT = 3;
const UPCOMING_REQUEST_LIMIT = 4;
const OUTPUT_ROOT = ".local/provider-samples/live-tennis";

type Mode =
  | { kind: "survey" }
  | { kind: "observe"; matchId: number }
  | { kind: "upcoming" };

interface CaptureRecord {
  file: string;
  fetchedAt: string;
  name: string;
  ok: boolean;
  path: string;
  rateLimit: {
    limit: string | null;
    remaining: string | null;
    reset: string | null;
  };
  status: number;
}

interface Manifest {
  capturedAt: string;
  captures: CaptureRecord[];
  mode: Mode;
  provider: "live-tennis-api";
  requestBudget: {
    dailyCeiling: number;
    plannedProviderCalls: number;
    providerCallsMade: number;
    usageBefore: number | null;
  };
  selected: {
    atpMatchId: number | null;
    wtaMatchId: number | null;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) ? value : null;
}

function firstInteger(record: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = asInteger(record[key]);
    if (value !== null) return value;
  }
  return null;
}

function readUsageCount(value: unknown): number | null {
  if (!isRecord(value)) return null;
  const today = value.today;

  if (typeof today === "number" && Number.isSafeInteger(today)) return today;
  if (!isRecord(today)) return null;

  return firstInteger(today, [
    "calls",
    "requests",
    "used",
    "count",
    "total",
    "api_calls",
  ]);
}

function rows(value: unknown): unknown[] {
  if (!isRecord(value)) return [];
  return Array.isArray(value.data) ? value.data : [];
}

function matchId(value: unknown): number | null {
  if (!isRecord(value)) return null;
  return asInteger(value.match_id) ?? asInteger(value.id);
}

function playerId(value: unknown): number | null {
  if (!isRecord(value)) return null;
  if (isRecord(value.players)) {
    const p1 = value.players.p1;
    if (isRecord(p1)) return asInteger(p1.id);
  }
  return asInteger(value.player1_id);
}

function firstScheduledFixture(value: unknown): unknown {
  return rows(value).find(
    (row) => isRecord(row) && row.status === "scheduled",
  );
}

function parseMode(args: string[]): Mode {
  if (args.length === 0 || (args.length === 1 && args[0] === "survey")) {
    return { kind: "survey" };
  }

  if (args.length === 1 && args[0] === "upcoming") {
    return { kind: "upcoming" };
  }

  if (args.length === 2 && args[0] === "observe") {
    const id = Number(args[1]);
    if (Number.isSafeInteger(id) && id > 0) return { kind: "observe", matchId: id };
  }

  throw new Error(
    "Usage: npm run provider:spike -- [survey | upcoming | observe <positive-match-id>]",
  );
}

function loadKey(): string {
  if (!process.env.LIVE_TENNIS_API_KEY && existsSync(".env.local")) {
    loadEnvFile(".env.local");
  }

  const key = process.env.LIVE_TENNIS_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "LIVE_TENNIS_API_KEY is missing. Copy .env.example to .env.local and add a free key; do not paste the key into chat or commit it.",
    );
  }
  return key;
}

function safeTimestamp(date: Date): string {
  return date.toISOString().replaceAll(":", "-").replaceAll(".", "-");
}

function safeFileName(name: string): string {
  return name.replaceAll(/[^a-z0-9-]+/gi, "-").replaceAll(/^-|-$/g, "").toLowerCase();
}

async function run(): Promise<void> {
  const mode = parseMode(process.argv.slice(2));
  const key = loadKey();
  const capturedAt = new Date();
  const outputDirectory = `${OUTPUT_ROOT}/${safeTimestamp(capturedAt)}`;
  await mkdir(outputDirectory, { recursive: true, mode: 0o700 });

  const captures: CaptureRecord[] = [];
  const plannedProviderCalls =
    mode.kind === "survey"
      ? SURVEY_REQUEST_LIMIT
      : mode.kind === "upcoming"
        ? UPCOMING_REQUEST_LIMIT
        : OBSERVE_REQUEST_LIMIT;
  let providerCallsMade = 0;

  async function capture(name: string, path: string): Promise<unknown> {
    if (providerCallsMade >= plannedProviderCalls) {
      throw new Error(`Local per-run request limit (${plannedProviderCalls}) reached.`);
    }
    providerCallsMade += 1;

    const response = await fetch(`${BASE_URL}${path}`, {
      headers: { "X-API-Key": key },
      signal: AbortSignal.timeout(15_000),
    });
    const text = await response.text();
    let body: unknown;
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = { nonJsonBody: text };
    }

    const fetchedAt = new Date().toISOString();
    const file = `${String(captures.length + 1).padStart(2, "0")}-${safeFileName(name)}.json`;
    const rateLimit = {
      limit: response.headers.get("x-ratelimit-limit"),
      remaining: response.headers.get("x-ratelimit-remaining"),
      reset: response.headers.get("x-ratelimit-reset"),
    };

    await writeFile(
      `${outputDirectory}/${file}`,
      `${JSON.stringify(
        {
          capturedAt: fetchedAt,
          request: { method: "GET", path },
          response: { body, rateLimit, status: response.status },
        },
        null,
        2,
      )}\n`,
      { encoding: "utf8", mode: 0o600 },
    );

    captures.push({
      file,
      fetchedAt,
      name,
      ok: response.ok,
      path,
      rateLimit,
      status: response.status,
    });

    if (!response.ok) {
      throw new Error(`${name} returned HTTP ${response.status}; inspect the ignored capture.`);
    }
    return body;
  }

  const usageBeforeBody = await capture("usage-before", "/usage");
  const usageBefore = readUsageCount(usageBeforeBody);
  if (usageBefore === null) {
    throw new Error(
      "The provider usage shape was not recognized. The ignored usage capture is available for updating the spike safely.",
    );
  }
  if (usageBefore + plannedProviderCalls > HARD_DAILY_LIMIT) {
    throw new Error(
      `Spike aborted: ${usageBefore} calls are already reported and ${plannedProviderCalls} total calls could exceed Slate's ${HARD_DAILY_LIMIT}-call ceiling.`,
    );
  }

  let atpMatchId: number | null = null;
  let wtaMatchId: number | null = null;

  if (mode.kind === "observe") {
    await capture("observed-match-score", `/matches/${mode.matchId}/score`);
  } else if (mode.kind === "upcoming") {
    await capture(
      "atp-matches-upcoming-singles",
      "/matches?status=upcoming&tour=atp&draw=singles&limit=25",
    );
    await capture(
      "wta-matches-upcoming-singles",
      "/matches?status=upcoming&tour=wta&draw=singles&limit=25",
    );
  } else {
    const atpLive = await capture(
      "atp-live-singles",
      "/matches?status=live&tour=atp&draw=singles&limit=25",
    );
    const wtaLive = await capture(
      "wta-live-singles",
      "/matches?status=live&tour=wta&draw=singles&limit=25",
    );
    const atpFixtures = await capture(
      "atp-upcoming-singles",
      "/fixtures?tour=atp&draw=singles&limit=25",
    );
    const wtaFixtures = await capture(
      "wta-upcoming-singles",
      "/fixtures?tour=wta&draw=singles&limit=25",
    );
    await capture(
      "atp-us-open-tournaments",
      "/tournaments?search=US+Open&tour=atp&draw=singles&limit=50",
    );
    await capture(
      "wta-us-open-tournaments",
      "/tournaments?search=US+Open&tour=wta&draw=singles&limit=50",
    );

    const atpLiveMatch = rows(atpLive)[0];
    const wtaLiveMatch = rows(wtaLive)[0];
    const atpMatch = atpLiveMatch ?? firstScheduledFixture(atpFixtures);
    const wtaMatch = wtaLiveMatch ?? firstScheduledFixture(wtaFixtures);
    atpMatchId = matchId(atpMatch);
    wtaMatchId = matchId(wtaMatch);

    for (const [tour, match, id, isLive] of [
      ["atp", atpMatch, atpMatchId, atpLiveMatch !== undefined],
      ["wta", wtaMatch, wtaMatchId, wtaLiveMatch !== undefined],
    ] as const) {
      if (id === null) continue;
      await capture(`${tour}-match-detail`, `/matches/${id}`);
      if (isLive) await capture(`${tour}-match-score`, `/matches/${id}/score`);
      const idOfPlayer = playerId(match);
      if (idOfPlayer !== null) {
        await capture(`${tour}-player-detail`, `/players/${idOfPlayer}`);
      }
    }
  }

  await capture("usage-after", "/usage");

  const manifest: Manifest = {
    capturedAt: capturedAt.toISOString(),
    captures,
    mode,
    provider: "live-tennis-api",
    requestBudget: {
      dailyCeiling: HARD_DAILY_LIMIT,
      plannedProviderCalls,
      providerCallsMade,
      usageBefore,
    },
    selected: { atpMatchId, wtaMatchId },
  };
  await writeFile(
    `${outputDirectory}/manifest.json`,
    `${JSON.stringify(manifest, null, 2)}\n`,
    { encoding: "utf8", mode: 0o600 },
  );

  console.log(`Captured ${captures.length} responses in ${outputDirectory}`);
  console.log(`Provider calls made: ${providerCallsMade}/${plannedProviderCalls}`);
  if (mode.kind === "survey") {
    console.log(`Selected ATP match: ${atpMatchId ?? "none"}; WTA match: ${wtaMatchId ?? "none"}`);
  }
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown spike failure";
  console.error(message);
  process.exitCode = 1;
});
