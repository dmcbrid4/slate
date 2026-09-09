import { defineConfig } from 'drizzle-kit';

// drizzle-kit does not auto-load .env.local (that's a Next.js convention, not a generic dotenv
// default), so load it explicitly for commands that need a live connection. No-op if absent.
try {
  process.loadEnvFile('.env.local');
} catch {
  // No .env.local present (CI, or a contributor who hasn't configured a database yet).
}

// `generate` and `check` only diff the schema file against committed migration snapshots and need
// no live connection; only `migrate`/`push`/`studio` read dbCredentials, so this stays safe to load
// without DATABASE_URL set.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
});
