/**
 * Media helpers — detect MIME type from base64 prefixes or magic bytes,
 * and fetch remote audio/video files as base64 for downstream LLM calls.
 * These live outside the API-call modules so both Claude (image/PDF) and
 * Gemini (audio/video) paths can share them.
 */

export function detectMediaType(base64: string): string {
  if (base64.startsWith('/9j/')) return 'image/jpeg';
  if (base64.startsWith('iVBOR')) return 'image/png';
  if (base64.startsWith('UklGR')) return 'image/webp';
  return 'image/jpeg';
}

// ── Audio fetch helper ──

/** Detect actual audio format from magic bytes — ignores HTTP Content-Type header */
export function detectAudioMimeFromBytes(bytes: Uint8Array): string {
  if (bytes.length < 4) return 'audio/mp4';
  // MP3: ID3 tag header
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) return 'audio/mp3';
  // MP3: MPEG sync word (FF Ex or FF Fx)
  if (bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0) return 'audio/mp3';
  // WAV: RIFF....WAVE
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) return 'audio/wav';
  // OGG: OggS
  if (bytes[0] === 0x4F && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) return 'audio/ogg';
  // FLAC: fLaC
  if (bytes[0] === 0x66 && bytes[1] === 0x4C && bytes[2] === 0x61 && bytes[3] === 0x43) return 'audio/flac';
  // WebM: EBML header
  if (bytes[0] === 0x1A && bytes[1] === 0x45 && bytes[2] === 0xDF && bytes[3] === 0xA3) return 'audio/webm';
  // MP4/M4A: ftyp box at offset 4
  if (bytes.length >= 8 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) return 'audio/mp4';
  return 'audio/mp4';
}

export async function fetchAudioAsBase64(url: string): Promise<{ base64: string; mediaType: string } | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12_000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) {
      console.warn('[classifier] Audio fetch failed:', response.status);
      return null;
    }
    const contentLength = Number(response.headers.get('content-length') ?? 0);
    if (contentLength > 5 * 1024 * 1024) {
      console.warn('[classifier] Audio too large, skipping download:', contentLength);
      return null;
    }
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    // Detect actual format from magic bytes — do NOT trust HTTP Content-Type
    // (Supabase Storage serves MP3 files as video/mp4 when path ends in .mp4)
    const mediaType = detectAudioMimeFromBytes(bytes);
    const chunkSize = 8192;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunkSize, bytes.length)));
    }
    console.log('[classifier] Audio fetched | detectedMimeType:', mediaType, '| bytes:', bytes.length);
    return { base64: btoa(binary), mediaType };
  } catch (err) {
    console.warn('[classifier] Audio fetch error:', String(err));
    return null;
  }
}

/**
 * Fetch a media file from URL and return it as base64 + detected MIME type.
 * Storage bucket serves all audio as video/mp4 — magic bytes detection corrects this.
 */
export async function fetchMediaBase64(url: string): Promise<{ data: string; mimeType: string }> {
  const t0 = Date.now();
  console.log('[gemini:fetch] → GET', url.slice(0, 100));
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  console.log('[gemini:fetch] HTTP', res.status, '| content-type:', res.headers.get('content-type'), '| content-length:', res.headers.get('content-length'), '|', Date.now() - t0, 'ms');
  if (!res.ok) throw new Error(`Media fetch failed: HTTP ${res.status} — ${url.slice(0, 80)}`);

  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const rawBytes = buffer.byteLength;
  console.log('[gemini:fetch] Downloaded', rawBytes, 'bytes (', Math.round(rawBytes / 1024), 'KB ) in', Date.now() - t0, 'ms');

  const headerMime = (res.headers.get('content-type') ?? '').split(';')[0].trim();
  let mimeType = headerMime;
  let mimeSource = 'header';

  if (!mimeType || mimeType === 'application/octet-stream' || mimeType === 'video/mp4') {
    // Detect from magic bytes — bucket always serves audio as video/mp4
    const b0 = bytes[0], b1 = bytes[1], b2 = bytes[2], b3 = bytes[3];
    const b4 = bytes[4], b5 = bytes[5], b6 = bytes[6], b7 = bytes[7];
    console.log('[gemini:fetch] Magic bytes:', [b0, b1, b2, b3, b4, b5, b6, b7].map(b => b?.toString(16).padStart(2,'0')).join(' '));

    if (b0 === 0x49 && b1 === 0x44 && b2 === 0x33) {
      mimeType = 'audio/mpeg'; mimeSource = 'magic:ID3';
    } else if (b0 === 0xFF && (b1 & 0xE0) === 0xE0) {
      mimeType = 'audio/mpeg'; mimeSource = 'magic:MP3-sync';
    } else if (b0 === 0x52 && b1 === 0x49 && b2 === 0x46 && b3 === 0x46) {
      mimeType = 'audio/wav'; mimeSource = 'magic:RIFF';
    } else if (b0 === 0x4F && b1 === 0x67 && b2 === 0x67 && b3 === 0x53) {
      mimeType = 'audio/ogg'; mimeSource = 'magic:OGG';
    } else if (b4 === 0x66 && b5 === 0x74 && b6 === 0x79 && b7 === 0x70) {
      const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
      console.log('[gemini:fetch] ftyp brand:', JSON.stringify(brand));
      mimeType = (brand === 'M4A ' || brand === 'M4B ' || brand === 'f4a ') ? 'audio/mp4' : 'video/mp4';
      mimeSource = `magic:ftyp(${brand.trim()})`;
    } else {
      mimeType = 'video/mp4'; mimeSource = 'fallback';
    }
  }

  console.log('[gemini:fetch] MIME resolved:', mimeType, '| source:', mimeSource, '| header was:', headerMime || '(empty)');

  // Encode in 32KB chunks to avoid stack overflow on large files
  const t1 = Date.now();
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  const b64 = btoa(binary);
  console.log('[gemini:fetch] base64 encoded:', b64.length, 'chars (', Math.round(b64.length * 0.75 / 1024), 'KB ) in', Date.now() - t1, 'ms');
  return { data: b64, mimeType };
}
