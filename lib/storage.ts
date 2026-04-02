import * as FileSystem from 'expo-file-system/legacy';
import { decode as base64Decode } from 'base-64';
import { supabase } from './supabase';

export type MediaType = 'photo' | 'video';

function getMimeType(uri: string, mediaType: MediaType): string {
  if (mediaType === 'video') {
    if (uri.endsWith('.mov')) return 'video/quicktime';
    if (uri.endsWith('.webm')) return 'video/webm';
    return 'video/mp4';
  }
  if (uri.endsWith('.png')) return 'image/png';
  if (uri.endsWith('.jpg') || uri.endsWith('.jpeg')) return 'image/jpeg';
  return 'image/webp';
}

/**
 * Read a local file URI as Uint8Array (works on Android content:// URIs).
 */
async function readFileAsBytes(uri: string): Promise<Uint8Array> {
  const b64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const binaryString = base64Decode(b64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function uploadPetPhoto(
  userId: string,
  petId: string,
  uri: string,
  fileName: string,
) {
  const bytes = await readFileAsBytes(uri);
  const path = `${userId}/${petId}/${Date.now()}_${fileName}`;
  const contentType = getMimeType(uri, 'photo');

  const { data, error } = await supabase.storage
    .from('pet-photos')
    .upload(path, bytes, { contentType, upsert: false });

  if (error) throw error;
  return data.path;
}

/**
 * Upload a photo or video to pet-photos bucket.
 * Returns the storage path (not the public URL).
 */
export async function uploadPetMedia(
  userId: string,
  petId: string,
  uri: string,
  mediaType: MediaType,
): Promise<string> {
  console.log('[Storage] uploadPetMedia — type:', mediaType, 'uri:', uri.slice(-40));
  const bytes = await readFileAsBytes(uri);
  console.log('[Storage] File read OK — size:', bytes.length, 'bytes');

  const ext = mediaType === 'video' ? 'mp4' : 'webp';
  const path = `${userId}/${petId}/${Date.now()}_diary.${ext}`;
  const contentType = getMimeType(uri, mediaType);

  const { data, error } = await supabase.storage
    .from('pet-photos')
    .upload(path, bytes, { contentType, upsert: false });

  if (error) {
    console.error('[Storage] Upload FAILED →', error.message);
    throw error;
  }
  console.log('[Storage] Upload OK → path:', data.path);
  return data.path;
}

export async function uploadAvatar(userId: string, uri: string) {
  const bytes = await readFileAsBytes(uri);
  const path = `${userId}/avatar_${Date.now()}.webp`;

  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(path, bytes, { contentType: 'image/webp', upsert: true });

  if (error) throw error;
  return data.path;
}

export function getPublicUrl(bucket: string, path: string) {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
