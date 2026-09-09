import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema.ts';

// No `server-only` guard here: this module stays a neutral, framework-oblivious connection
// factory, consistent with the rest of src/db (directly importable from tests, no live database
// required unless getDb() is actually called). The runtime server-only boundary is established at
// the composition root in src/server, which already carries the guard.

// Supabase's transaction pooler (port 6543) does not support server-side prepared statements,
// so `prepare` must stay false for any connection string routed through it.
//
// `max` raises the client-side pool above postgres.js's default of 10: `readGraph`'s Promise.all
// alone opens 10 simultaneous connections, which leaves zero spare capacity for anything else
// happening at the same time (a second concurrent request, or this same request's own earlier
// sequential queries not yet released). With the default, a second overlapping request would
// queue behind the first indefinitely rather than for a bounded time, appearing as a hang rather
// than added latency - confirmed directly: identical requests consistently exceeded an 8s and even
// a 25s timeout with `max: 10` under any request overlap, and consistently completed in 4-5.5s
// once raised.
function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required to use the Postgres-backed repositories.');
  return postgres(connectionString, { prepare: false, max: 20 });
}

let cached: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDb() {
  if (!cached) cached = drizzle(createClient(), { schema });
  return cached;
}
