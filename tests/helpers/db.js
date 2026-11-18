// Test helper: a throwaway in-memory PostgreSQL 17 (PGlite) with minimal
// Supabase stand-ins, so RLS policies and RPCs can be tested locally.
// No network. Never connects to any Supabase project.
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

const repoFile = rel => readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8');

export const BASELINE = repoFile('supabase/migrations/0000_baseline.sql');
export const MIGRATION_0001 = repoFile('supabase/migrations/0001_organisers_can_view_league_members.sql');
export const SEED = repoFile('supabase/seed/staging_seed.sql');

export const TEST_USERS = ['owner', 'organiser', 'player.a', 'player.b', 'outsider'];
export const email = name => `${name}@rackstats.test`;

// Mirrors Supabase: the real auth.uid() definition and the grants that
// anon/authenticated have on the auth schema.
const SUPABASE_STUBS = `
  create role anon nologin; create role authenticated nologin; create role service_role nologin;
  create schema extensions; create schema auth; create schema storage;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text unique,
    email_confirmed_at timestamptz,
    raw_user_meta_data jsonb default '{}'
  );
  create function auth.uid() returns uuid language sql stable as $$
    select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''),
                    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  create table storage.buckets (id text primary key, public boolean, file_size_limit bigint, allowed_mime_types text[]);
`;

// Builds: stubs → baseline → 5 confirmed test users → staging seed → optional migrations.
export async function buildDb({ migrations = [] } = {}) {
  const db = new PGlite({ extensions: { uuid_ossp, pgcrypto } });
  await db.exec(SUPABASE_STUBS);
  await db.exec(BASELINE);
  await db.exec(TEST_USERS.map(u =>
    `insert into auth.users (email, email_confirmed_at) values ('${email(u)}', now());`).join('\n'));
  await db.exec(SEED);
  for (const m of migrations) await db.exec(m);
  return db;
}

export async function leagueId(db, tag) {
  return (await db.query('select id from public.leagues where legacy_id = $1', [tag])).rows[0].id;
}
export async function userId(db, name) {
  return (await db.query('select id from auth.users where email = $1', [email(name)])).rows[0].id;
}

// Runs fn(tx) as the given test user (role `authenticated` + JWT claims) inside
// a transaction that is ALWAYS rolled back, so tests never change shared state.
export async function asUser(db, name, fn) {
  const id = await userId(db, name);
  await db.exec('begin');
  try {
    await db.query("select set_config('request.jwt.claims', $1, true)",
      [JSON.stringify({ sub: id, role: 'authenticated' })]);
    await db.exec('set local role authenticated');
    return await fn(db);
  } finally {
    await db.exec('rollback');
  }
}
