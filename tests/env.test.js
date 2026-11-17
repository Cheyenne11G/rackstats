// Unit tests for the fail-closed environment checks (src/env.js).
// Run with: npm test   (Node's built-in test runner; no network access.)
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveSupabaseEnv, projectRefFromUrl, EnvConfigError,
  STAGING_PROJECT_REF, LIVE_PROJECT_REF
} from '../src/env.js';

const STAGING_URL = `https://${STAGING_PROJECT_REF}.supabase.co`;
const LIVE_URL = `https://${LIVE_PROJECT_REF}.supabase.co`;
const OTHER_URL = 'https://abcdefghijklmnopqrst.supabase.co';
const PUB = 'sb_publishable_TEST_ONLY_not_a_real_key';

const staging = (over = {}) => ({
  MODE: 'staging', VITE_APP_ENV: 'staging', VITE_SUPABASE_PROJECT_REF: STAGING_PROJECT_REF,
  VITE_SUPABASE_URL: STAGING_URL, VITE_SUPABASE_PUBLISHABLE_KEY: PUB, ...over
});
const live = (over = {}) => ({
  MODE: 'live', VITE_SUPABASE_URL: LIVE_URL, VITE_SUPABASE_PUBLISHABLE_KEY: PUB, ...over
});
const refuses = (env, pattern) => assert.throws(() => resolveSupabaseEnv(env), err => err instanceof EnvConfigError && pattern.test(err.message));

// ---- staging ---------------------------------------------------------------
test('staging: correct configuration is accepted', () => {
  const r = resolveSupabaseEnv(staging());
  assert.equal(r.appEnv, 'staging');
  assert.equal(r.projectRef, STAGING_PROJECT_REF);
  assert.equal(r.url, STAGING_URL);
});
test('staging: trailing slash on URL is accepted', () => {
  assert.equal(resolveSupabaseEnv(staging({ VITE_SUPABASE_URL: STAGING_URL + '/' })).projectRef, STAGING_PROJECT_REF);
});
test('staging: LIVE URL is refused', () => refuses(staging({ VITE_SUPABASE_URL: LIVE_URL }), /LIVE project/));
test('staging: another project URL is refused', () => refuses(staging({ VITE_SUPABASE_URL: OTHER_URL }), /not the staging project/));
test('staging: missing VITE_APP_ENV (staging file absent) is refused', () => refuses(staging({ VITE_APP_ENV: undefined }), /VITE_APP_ENV=staging/));
test('staging: wrong VITE_APP_ENV is refused', () => refuses(staging({ VITE_APP_ENV: 'live' }), /VITE_APP_ENV=staging/));
test('staging: missing project ref variable is refused', () => refuses(staging({ VITE_SUPABASE_PROJECT_REF: undefined }), /VITE_SUPABASE_PROJECT_REF/));
test('staging: project ref variable set to live is refused', () => refuses(staging({ VITE_SUPABASE_PROJECT_REF: LIVE_PROJECT_REF }), /VITE_SUPABASE_PROJECT_REF/));
test('staging: matching ref variable but LIVE URL is still refused', () => refuses(staging({ VITE_SUPABASE_URL: LIVE_URL }), /LIVE/));
test('staging: missing URL is refused', () => refuses(staging({ VITE_SUPABASE_URL: undefined }), /missing or is not a valid URL/));
test('staging: placeholder key is refused', () => refuses(staging({ VITE_SUPABASE_PUBLISHABLE_KEY: 'PASTE_STAGING_PUBLISHABLE_KEY_HERE' }), /sb_publishable_/));
test('staging: missing key is refused', () => refuses(staging({ VITE_SUPABASE_PUBLISHABLE_KEY: undefined }), /missing/));
test('staging: secret key is refused', () => refuses(staging({ VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_abc' }), /SECRET key/));
test('staging: legacy JWT key is refused', () => refuses(staging({ VITE_SUPABASE_PUBLISHABLE_KEY: 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.x' }), /sb_publishable_/));

// ---- live ------------------------------------------------------------------
test('live: correct configuration is accepted (mode live)', () => {
  const r = resolveSupabaseEnv(live());
  assert.equal(r.appEnv, 'live');
  assert.equal(r.projectRef, LIVE_PROJECT_REF);
});
test('live: production mode (npm run build/preview) gets the same checks', () => {
  assert.equal(resolveSupabaseEnv(live({ MODE: 'production' })).appEnv, 'live');
  refuses(live({ MODE: 'production', VITE_SUPABASE_URL: STAGING_URL }), /STAGING project/);
});
test('live: STAGING URL is refused', () => refuses(live({ VITE_SUPABASE_URL: STAGING_URL }), /STAGING project/));
test('live: another project URL is refused', () => refuses(live({ VITE_SUPABASE_URL: OTHER_URL }), /not the live project/));
test('live: VITE_APP_ENV=staging is refused', () => refuses(live({ VITE_APP_ENV: 'staging' }), /VITE_APP_ENV=staging/));
test('live: staging project ref variable is refused', () => refuses(live({ VITE_SUPABASE_PROJECT_REF: STAGING_PROJECT_REF }), /not the live project/));
test('live: explicit live ref variable is accepted', () => assert.equal(resolveSupabaseEnv(live({ VITE_SUPABASE_PROJECT_REF: LIVE_PROJECT_REF })).appEnv, 'live'));
test('live: secret key is refused', () => refuses(live({ VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_abc' }), /SECRET key/));
test('live: missing key is refused', () => refuses(live({ VITE_SUPABASE_PUBLISHABLE_KEY: '' }), /missing/));

// ---- unknown modes -----------------------------------------------------------
for (const mode of ['development', 'test', 'Staging', '', undefined]) {
  test(`unknown mode ${JSON.stringify(mode)} is refused`, () => refuses(staging({ MODE: mode }), /Unknown mode/));
}

// ---- URL parsing ---------------------------------------------------------------
test('URL parsing rejects lookalikes and extras', () => {
  const bad = [
    `http://${STAGING_PROJECT_REF}.supabase.co`,
    `https://${STAGING_PROJECT_REF}.supabase.co.evil.com`,
    `https://${STAGING_PROJECT_REF}.supabase.com`,
    `https://x.${STAGING_PROJECT_REF}.supabase.co`,
    `https://${STAGING_PROJECT_REF}.supabase.co/rest/v1`,
    `https://${STAGING_PROJECT_REF}.supabase.co:8443`,
    `https://${STAGING_PROJECT_REF}.supabase.co?x=1`,
    `https://user@${STAGING_PROJECT_REF}.supabase.co`,
    'not a url', '', undefined
  ];
  for (const url of bad) assert.throws(() => projectRefFromUrl(url), EnvConfigError, `should reject ${url}`);
  assert.equal(projectRefFromUrl(LIVE_URL), LIVE_PROJECT_REF);
});
