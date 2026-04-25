/**
 * Gemini API calls — `callGemini` posts inline media + text parts to the
 * generateContent endpoint; `callGeminiMedia` is the higher-level wrapper
 * that fetches a media URL as base64 first, then delegates to `callGemini`.
 * Used for audio (pet_audio) and video classification paths where Claude
 * can't directly consume the media format.
 */

import { GEMINI_API_KEY, MAX_TOKENS } from './constants.ts';
import { fetchMediaBase64 } from './media.ts';

// ── Gemini API ──

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

export interface GeminiUsageDetail {
  /** promptTokenCount - cached. */
  prompt_tokens: number;
  candidates_tokens: number;
  cached_tokens: number;
  total_tokens: number;
}

/** Call Gemini generateContent with inline media parts. */
export async function callGemini(
  systemPrompt: string,
  parts: GeminiPart[],
  model: string,
  maxTokens: number = MAX_TOKENS,
): Promise<{ text: string; tokensUsed: number; usage: GeminiUsageDetail; modelUsed: string }> {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');

  const mediaParts = parts.filter(p => p.inlineData);
  const textParts  = parts.filter(p => p.text);
  console.log('[gemini:api] → generateContent | model:', model, '| maxTokens:', maxTokens,
    '| mediaParts:', mediaParts.length, '| textParts:', textParts.length,
    '| inlineData KB:', mediaParts.reduce((s, p) => s + Math.round((p.inlineData?.data?.length ?? 0) * 0.75 / 1024), 0));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
  const bodyObj = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts }],
    generationConfig: { maxOutputTokens: maxTokens, temperature: 0.3 },
  };
  const bodyStr = JSON.stringify(bodyObj);
  console.log('[gemini:api] Request body size:', Math.round(bodyStr.length / 1024), 'KB');

  const t0 = Date.now();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: bodyStr,
    signal: AbortSignal.timeout(60_000),
  });
  console.log('[gemini:api] HTTP', res.status, '|', Date.now() - t0, 'ms');

  if (!res.ok) {
    const errText = await res.text();
    console.error('[gemini:api] ERROR body:', errText.slice(0, 500));
    throw new Error(`Gemini API error: ${res.status} — ${errText.slice(0, 200)}`);
  }

  const data = await res.json() as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      finishReason?: string;
      safetyRatings?: unknown[];
    }>;
    usageMetadata?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      totalTokenCount?: number;
      cachedContentTokenCount?: number;
    };
    modelVersion?: string;
    error?: { code?: number; message?: string; status?: string };
  };

  if (data.error) {
    console.error('[gemini:api] Response error:', JSON.stringify(data.error));
    throw new Error(`Gemini error: ${data.error.status} — ${data.error.message}`);
  }

  const candidate = data.candidates?.[0];
  console.log('[gemini:api] candidates:', data.candidates?.length ?? 0,
    '| finishReason:', candidate?.finishReason,
    '| usage: prompt=', data.usageMetadata?.promptTokenCount,
    'candidates=', data.usageMetadata?.candidatesTokenCount,
    'total=', data.usageMetadata?.totalTokenCount);

  const text = candidate?.content?.parts?.[0]?.text ?? '';
  if (!text) {
    console.error('[gemini:api] Empty text — full response:', JSON.stringify(data).slice(0, 600));
    throw new Error(`Gemini: empty response (finishReason=${candidate?.finishReason ?? 'unknown'})`);
  }

  console.log('[gemini:api] Response text length:', text.length, '| first 300:', text.slice(0, 300));
  const um = data.usageMetadata ?? {};
  return {
    text,
    tokensUsed: um.totalTokenCount ?? 0,
    usage: {
      prompt_tokens:     um.promptTokenCount     ?? 0,
      candidates_tokens: um.candidatesTokenCount ?? 0,
      cached_tokens:     um.cachedContentTokenCount ?? 0,
      total_tokens:      um.totalTokenCount      ?? 0,
    },
    modelUsed: data.modelVersion ?? model,
  };
}

/** Fetch media URL → base64 → Gemini analysis. */
export async function callGeminiMedia(
  systemPrompt: string,
  mediaUrl: string,
  mediaKind: 'audio' | 'video',
  tutorText: string | undefined,
  model: string,
  maxTokens: number,
): Promise<{ rawText: string; tokensUsed: number; usage: GeminiUsageDetail; modelUsed: string }> {
  const t0 = Date.now();
  console.log(`[gemini:${mediaKind}] ▶ START | model:`, model, '| hasTutorText:', !!(tutorText?.trim()), '| url:', mediaUrl.slice(0, 100));

  const { data, mimeType } = await fetchMediaBase64(mediaUrl);

  const parts: GeminiPart[] = [{ inlineData: { mimeType, data } }];
  if (tutorText?.trim()) {
    parts.push({ text: `Tutor's description: "${tutorText.trim()}"` });
    console.log(`[gemini:${mediaKind}] Tutor description included (${tutorText.trim().length} chars)`);
  }
  parts.push({ text: 'Return ONLY the JSON object as specified in the system prompt.' });

  console.log(`[gemini:${mediaKind}] Calling Gemini API...`);
  const { text, tokensUsed, usage, modelUsed } = await callGemini(systemPrompt, parts, model, maxTokens);

  console.log(`[gemini:${mediaKind}] ✅ DONE | tokens:`, tokensUsed, '| total time:', Date.now() - t0, 'ms');
  return { rawText: text, tokensUsed, usage, modelUsed };
}
