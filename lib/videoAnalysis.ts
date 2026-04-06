import * as VideoThumbnails from 'expo-video-thumbnails';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Extrai N frames de um vídeo local e retorna como base64.
 * Usado para análise visual de postura/comportamento via Claude.
 *
 * Sem saber a duração exata, usa timestamps fixos (2s, 8s, 15s).
 * Se o vídeo for mais curto, os timestamps inválidos são ignorados silenciosamente.
 */
export async function extractVideoFrames(
  localUri: string,
  frameCount: number = 3,
): Promise<string[]> {
  try {
    const timestamps = [1000, 5000, 10000].slice(0, frameCount);
    const base64Frames: string[] = [];

    for (const time of timestamps) {
      try {
        const { uri } = await VideoThumbnails.getThumbnailAsync(localUri, {
          time,
          quality: 0.3,  // reduced from 0.6 to lower memory pressure (~150KB vs ~500KB per frame)
        });
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        if (base64) base64Frames.push(base64);
      } catch {
        // Timestamp inválido (vídeo mais curto) — ignorar e continuar
        continue;
      }
    }

    return base64Frames;
  } catch (err) {
    console.warn('[videoAnalysis] extractVideoFrames falhou:', err);
    return [];
  }
}
