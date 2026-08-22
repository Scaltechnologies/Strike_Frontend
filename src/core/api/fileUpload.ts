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

export async function uploadFile(
  url: string,
  localUri: string,
  fieldName: string,
  token: string | null,
  timeoutMs = 30000,
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
