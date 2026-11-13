import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useDatabase } from '../db/DatabaseContext';
import { cloudAuthClient } from './auth';
import { runPilotSync } from './pilot';

/** Best-effort foreground sync. Local transaction completion never waits for it. */
export function PilotSyncScheduler() {
  const adapter = useDatabase();
  useEffect(() => {
    const auth = cloudAuthClient();
    if (!auth) return;
    const run = () => {
      if (AppState.currentState !== 'active') return;
      void runPilotSync(adapter, auth).catch(() => {
        // The owner-facing Sync screen shows the durable status and manual retry.
      });
    };
    auth.auth.startAutoRefresh();
    run();
    const interval = setInterval(run, 60_000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        auth.auth.startAutoRefresh();
        run();
      } else {
        auth.auth.stopAutoRefresh();
      }
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
      auth.auth.stopAutoRefresh();
    };
  }, [adapter]);
  return null;
}
