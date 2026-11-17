import React, { useEffect } from 'react';
import { supabaseEnv } from './supabase.js';

// Always-visible banner while the app is connected to the staging project.
export default function EnvBanner() {
  const staging = supabaseEnv.appEnv === 'staging';

  useEffect(() => {
    if (!staging) return;
    document.documentElement.classList.add('env-staging');
    if (!document.title.startsWith('[STAGING]')) document.title = `[STAGING] ${document.title}`;
  }, [staging]);

  if (!staging) return null;

  return (
    <div className="env-banner" role="status" aria-live="polite">
      STAGING · {supabaseEnv.projectRef} · test data only — not live RackStats
    </div>
  );
}
