// src/core/api/errorMessage.ts
// Backend error bodies sometimes leak raw JDBC/SQL exception text (schema
// mismatches, stack traces) straight into `message`. That must never be shown
// to a vendor — log the full detail for debugging and surface a short,
// human-readable fallback instead.

const RAW_EXCEPTION_MARKERS = [
  'JDBC exception', 'SQLGrammarException', 'SQL [', 'Caused by:',
  'at org.', 'at java.', 'Position:', 'ERROR: column', 'ERROR: relation',
];

export function getUserMessage(
  err: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  // console.log, not warn/error — RN's LogBox intercepts *both* warn and
  // error and pops a full-screen blocking overlay in dev. This fires for
  // errors that are already caught and shown to the vendor via in-app UI (a
  // toast, an inline error box), so it only needs to reach the Metro
  // terminal for debugging, not hijack the device screen.
  if (raw && __DEV__) console.log('[API error]', raw);

  const looksRaw = raw.length > 220 || RAW_EXCEPTION_MARKERS.some(marker => raw.includes(marker));
  return !raw || looksRaw ? fallback : raw;
}
