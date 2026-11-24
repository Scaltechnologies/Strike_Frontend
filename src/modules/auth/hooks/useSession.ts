// src/modules/auth/hooks/useSession.ts
//
// Who is signed in: the store owner, or a store manager an admin added to the
// store. Managers run day-to-day operations only — the backend (gateway)
// refuses earnings, withdrawals, bank details and store/business profile
// edits for them; this hook lets screens hide those entry points instead of
// showing a "not allowed" error.

import { useEffect, useState } from 'react';
import { getSession } from '../../../core/storage/secureStorage';
import { SessionInfo } from '../types/auth.types';

export function useSession(): { session: SessionInfo | null; isManager: boolean; ready: boolean } {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    getSession()
      .then(s => { if (alive) setSession(s); })
      .catch(() => { /* no session info → owner */ })
      .finally(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, []);

  return { session, isManager: session?.actor === 'MANAGER', ready };
}
