import { createClient } from '@supabase/supabase-js'
import { resolveSupabaseEnv, showFatalConfigError } from './env.js'

// Layer 2 of the fail-closed check: validate the values actually compiled into
// this bundle BEFORE any client exists. On failure nothing is created and the
// app does not start.
let resolved
try {
  resolved = resolveSupabaseEnv(import.meta.env)
} catch (err) {
  showFatalConfigError(err)
  throw err
}

// Only non-secret identification is exported; the key is not.
export const supabaseEnv = Object.freeze({
  appEnv: resolved.appEnv,
  projectRef: resolved.projectRef
})

export const supabase = createClient(
  resolved.url,
  resolved.key
)
