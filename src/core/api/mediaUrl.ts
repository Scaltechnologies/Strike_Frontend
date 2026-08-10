// src/core/api/mediaUrl.ts
// Backend returns uploaded-image URLs as API-relative paths (e.g.
// "/api/vendor/uploads/banners/xyz.jpg") so the value doesn't bake in a
// host/port that changes across dev/staging/prod. Resolve to an absolute
// URL only at render time.

import { BASE_URL } from './axiosInstance';

export function resolveMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}
