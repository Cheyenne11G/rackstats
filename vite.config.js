import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import { resolveSupabaseEnv, EnvConfigError, LIVE_MODES } from './src/env.js';

// Reads one variable from the live mode's .env FILES only (not from process.env),
// so the staging/live key comparison is not fooled by shell overrides.
function liveFileValue(name) {
  const files = ['.env.live.local', '.env.live', '.env.local', '.env'];
  for (const file of files) {
    const full = path.resolve(process.cwd(), file);
    if (!fs.existsSync(full)) continue;
    for (const raw of fs.readFileSync(full, 'utf8').split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq === -1 || line.slice(0, eq).trim() !== name) continue;
      return line.slice(eq + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
    }
  }
  return undefined;
}

export default defineConfig(({ mode }) => {
  // Layer 1 of the fail-closed check: Vite refuses to start or build if the
  // environment for this mode is not exactly right. Uses the same file priority
  // Vite uses at runtime (e.g. .env.staging.local before .env.local).
  const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), MODE: mode };
  const resolved = resolveSupabaseEnv(env);

  if (resolved.appEnv === 'staging') {
    const liveKey = liveFileValue('VITE_SUPABASE_PUBLISHABLE_KEY');
    if (liveKey && liveKey === resolved.key) {
      throw new EnvConfigError('Staging is using the same publishable key as the live environment (.env.local). Refusing to start.');
    }
  }

  if (!LIVE_MODES.includes(mode) && resolved.appEnv === 'live') {
    throw new EnvConfigError('Internal check failed: non-live mode resolved to live.');
  }

  return {}; // otherwise Vite's defaults, exactly as before this file existed
});
