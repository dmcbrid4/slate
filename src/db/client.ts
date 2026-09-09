import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema.ts';

// No `server-only` guard here: this module stays a neutral, framework-oblivious connection
// factory, consistent with the rest of src/db (directly importable from tests, no live database
// required unless getDb() is actually called). The runtime server-only boundary is established at
// the composition root in src/server, which already carries the guard.

// Supabase's transaction pooler (port 6543) does not support server-side prepared statements,
// so `prepare` must stay false for any connection string routed through it.
function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required to use the Postgres-backed repositories.');
  return postgres(connectionString, { prepare: false });
}

let cached: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDb() {
  if (!cached) cached = drizzle(createClient(), { schema });
  return cached;
}
