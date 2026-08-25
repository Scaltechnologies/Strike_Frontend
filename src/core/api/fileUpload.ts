// src/core/api/fileUpload.ts
//
// Uploads a local device file (from expo-image-picker / expo-image-manipulator)
// via multipart/form-data using expo-file-system's native upload task, instead
// of fetch()+FormData()+Blob.
//
// Two JS-level approaches were tried and both hit real walls in this
// environment's React Native networking stack:
//   1. formData.append('file', { uri, name, type }) — the classic RN
//      shorthand — is rejected with "Unsupported FormDataPart implementation"
//      by the FormData implementation this app's global fetch resolves to.
//   2. formData.append('file', await (await fetch(uri)).blob(), name) — a
//      real spec Blob — fails with "Creating blobs from 'ArrayBuffer' and
//      'ArrayBufferView' are not supported", because that Blob is backed by
//      an ArrayBuffer and RN's native Blob module only accepts blobs backed
//      by its own BlobManager-registered data.
// FileSystem.uploadAsync sidesteps both: it streams the file natively and
// never constructs a JS-side FormData/Blob at all.
import * as FileSystem from 'expo-file-system/legacy';
import axios from 'axios';
import { router } from 'expo-router';
import { BASE_URL } from './axiosInstance';
import { getRefreshToken, saveTokens, clearAll } from '../storage/secureStorage';

export interface UploadFileResult {
  status: number;
  body: string;
}

function guessMimeType(filename: string): string {
  const ext = /\.(\w+)$/.exec(filename)?.[1]?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

async function attemptUpload(
  url: string,
  localUri: string,
  fieldName: string,
  token: string | null,
  timeoutMs: number,
): Promise<UploadFileResult> {
  const filename = localUri.split('/').pop() || `upload-${Date.now()}.jpg`;
  const mimeType = guessMimeType(filename);

  const upload = FileSystem.uploadAsync(url, localUri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName,
    mimeType,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  // uploadAsync has no built-in abort/timeout — race it against a timer so
  // the vendor isn't left staring at a spinner forever if the connection
  // stalls. This only stops *waiting*; it doesn't cancel the underlying
  // native request, but that's fine since we've already given up on it.
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(Object.assign(new Error('Upload timed out — check your connection and try again.'), { name: 'TimeoutError' })), timeoutMs);
  });

  try {
    return await Promise.race([upload, timeout]);
  } catch (err: any) {
    if (err?.name === 'TimeoutError') throw err;
    throw new Error(err?.message || 'Upload failed. Check your connection and try again.');
  }
}

// Mirrors axiosInstance's refresh-on-401 interceptor. uploadAsync attaches
// the Authorization header manually (it never goes through axios), so
// without this an access token that expires between login and the next
// photo upload fails the upload with a bare 401 while every other request
// in the app keeps working — refreshed transparently by axiosInstance.
async function refreshAccessToken(): Promise<string> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) throw new Error('no refresh token');

  const res = await axios.post(
    `${BASE_URL}/api/auth/refresh`,
    { refreshToken },
    { headers: { 'Content-Type': 'application/json' } },
  );

  const data = res.data?.data ?? res.data;
  const newAccess: string = data.token ?? data.accessToken;
  const newRefresh: string = data.refreshToken;
  await saveTokens({ accessToken: newAccess, refreshToken: newRefresh });
  return newAccess;
}

export async function uploadFile(
  url: string,
  localUri: string,
  fieldName: string,
  token: string | null,
  timeoutMs = 30000,
): Promise<UploadFileResult> {
  const result = await attemptUpload(url, localUri, fieldName, token, timeoutMs);
  if (result.status !== 401 || !token) return result;

  try {
    const freshToken = await refreshAccessToken();
    return await attemptUpload(url, localUri, fieldName, freshToken, timeoutMs);
  } catch {
    await clearAll();
    router.replace('/(auth)/login');
    throw new Error('Session expired. Please log in again.');
  }
}
