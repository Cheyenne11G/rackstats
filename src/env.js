// Environment identification and fail-closed checks for the Supabase connection.
// Contains no secrets: project references are public (they are part of the URL).
//
// Modes (see package.json):
//   staging            npm run dev, build:staging, preview:staging  -> staging project only
//   live / production  npm run dev:live, build, preview             -> live project only
// Any other mode is refused.

export const STAGING_PROJECT_REF = 'bspxmdkjqfkilhpjbaem';
export const LIVE_PROJECT_REF = 'wfpngxkdqiazodqybzfi';

export const STAGING_MODES = ['staging'];
export const LIVE_MODES = ['live', 'production'];

export class EnvConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'EnvConfigError';
  }
}

const fail = message => {
  throw new EnvConfigError(message);
};

// Returns the project ref from exactly https://<ref>.supabase.co (optionally with a
// trailing slash). Anything else is refused.
export function projectRefFromUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    fail('VITE_SUPABASE_URL is missing or is not a valid URL.');
  }
  const match = /^([a-z0-9]{20})\.supabase\.co$/.exec(parsed.hostname);
  if (
    parsed.protocol !== 'https:' ||
    !match ||
    parsed.port !== '' ||
    parsed.username !== '' ||
    parsed.password !== '' ||
    !['', '/'].includes(parsed.pathname) ||
    parsed.search !== '' ||
    parsed.hash !== ''
  ) {
    fail(`VITE_SUPABASE_URL must be exactly https://<project-ref>.supabase.co (got "${parsed.host}${parsed.pathname}").`);
  }
  return match[1];
}

// Only publishable keys may reach the browser.
function assertPublishableKey(key, where) {
  if (!key) fail(`VITE_SUPABASE_PUBLISHABLE_KEY is missing (${where}).`);
  if (key.startsWith('sb_secret_')) {
    fail('A SECRET key was supplied. Only publishable keys (sb_publishable_…) may be used in the browser.');
  }
  if (!key.startsWith('sb_publishable_')) {
    fail(`VITE_SUPABASE_PUBLISHABLE_KEY must be a publishable key starting with sb_publishable_ (${where}).`);
  }
}

// Validates the environment for the given mode.
// Returns { appEnv, projectRef, url, key } or throws EnvConfigError.
export function resolveSupabaseEnv(env) {
  const mode = env.MODE;
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (STAGING_MODES.includes(mode)) {
    if (env.VITE_APP_ENV !== 'staging') {
      fail('Staging mode requires VITE_APP_ENV=staging. Is .env.staging.local missing?');
    }
    if (env.VITE_SUPABASE_PROJECT_REF !== STAGING_PROJECT_REF) {
      fail(`Staging mode requires VITE_SUPABASE_PROJECT_REF=${STAGING_PROJECT_REF} in .env.staging.local.`);
    }
    const ref = projectRefFromUrl(url);
    if (ref === LIVE_PROJECT_REF) fail('Staging mode is pointing at the LIVE project. Refusing to start.');
    if (ref !== STAGING_PROJECT_REF) {
      fail(`Staging mode URL points at project "${ref}", not the staging project (${STAGING_PROJECT_REF}).`);
    }
    assertPublishableKey(key, 'set the staging publishable key in .env.staging.local');
    return { appEnv: 'staging', projectRef: ref, url, key };
  }

  if (LIVE_MODES.includes(mode)) {
    if (env.VITE_APP_ENV !== undefined && env.VITE_APP_ENV !== '' && env.VITE_APP_ENV !== 'live') {
      fail(`Live mode found VITE_APP_ENV=${env.VITE_APP_ENV}. Refusing to start (staging settings must not be used in live mode).`);
    }
    if (env.VITE_SUPABASE_PROJECT_REF !== undefined && env.VITE_SUPABASE_PROJECT_REF !== '' &&
        env.VITE_SUPABASE_PROJECT_REF !== LIVE_PROJECT_REF) {
      fail(`Live mode found VITE_SUPABASE_PROJECT_REF=${env.VITE_SUPABASE_PROJECT_REF}, not the live project. Refusing to start.`);
    }
    const ref = projectRefFromUrl(url);
    if (ref === STAGING_PROJECT_REF) fail('Live mode is pointing at the STAGING project. Refusing to start.');
    if (ref !== LIVE_PROJECT_REF) {
      fail(`Live mode URL points at project "${ref}", not the live project (${LIVE_PROJECT_REF}).`);
    }
    assertPublishableKey(key, 'check .env.local');
    return { appEnv: 'live', projectRef: ref, url, key };
  }

  fail(`Unknown mode "${mode}". Use "npm run dev" (staging) or "npm run dev:live" (live).`);
}

// Replaces the page with a plain message when the app refuses to start.
export function showFatalConfigError(err) {
  if (typeof document === 'undefined') return;
  const root = document.getElementById('root');
  if (!root) return;
  root.textContent = `RackStats cannot start: ${err?.message || err}`;
  root.setAttribute('style', 'padding:24px;color:#f07b7b;background:#0b0d0c;font:14px/1.5 sans-serif');
}
