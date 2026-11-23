// src/modules/auth/hooks/useCountdown.ts — simple seconds countdown for "Resend code".

import { useCallback, useEffect, useState } from 'react';

export const useCountdown = () => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  // Stable identity so callers can use it in effect / callback deps.
  const start = useCallback((s: number) => setSeconds(Math.max(0, Math.round(s))), []);
  return { seconds, start };
};

// The backend's cooldown message ("Please wait 42 seconds…") → 42, so the
// timer stays in sync even when the app didn't start the cooldown itself.
export const secondsFromCooldownMessage = (message: string | null | undefined): number | null => {
  const m = message?.match(/wait (\d+) second/i);
  return m ? parseInt(m[1], 10) : null;
};
