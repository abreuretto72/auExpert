/**
 * compressPhoto — standalone helper extracted verbatim from
 * app/(app)/pet/[id]/diary/new.tsx.
 *
 * Move-only extraction. Same ImageManipulator params (1200px / 78% JPEG),
 * same fallback on error. Previously wrapped in `useCallback(..., [])` —
 * converted to a plain async function since it has no captured state
 * (semantically identical to a stable-reference callback).
 *
 * Compresses a photo to 1200px/78% quality BEFORE size validation.
 * Returns compressed URI + estimated size. Falls back to original on error.
 */

export async function compressPhoto(uri: string): Promise<{ uri: string; size?: number }> {
  try {
    const ImageManipulator = require('expo-image-manipulator');
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1200 } }],
      { compress: 0.78, format: ImageManipulator.SaveFormat.JPEG },
    );
    // After 1200px / 78% compression the result is always well under 5 MB —
    // no need to re-read the file size from disk.
    return { uri: result.uri };
  } catch {
    return { uri };
  }
}
