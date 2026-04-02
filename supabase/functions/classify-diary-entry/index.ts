/**
 * classify-diary-entry — Edge Function
 *
 * Unified AI classifier for auExpert diary entries.
 * Receives text and/or photo, returns:
 *   - Classifications (multiple types with confidence)
 *   - 3rd person narration
 *   - Mood detection
 *   - Urgency level
 *   - Clinical metrics extracted
 *   - Suggestions for the tutor
 *
 * Modules:
 *   cors.ts       — CORS headers and response helpers
 *   auth.ts       — JWT validation
 *   context.ts    — Pet profile + recent memories (RAG)
 *   classifier.ts — Prompt builder + Claude API + JSON parser
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

import { corsResponse, jsonResponse, errorResponse } from './modules/cors.ts';
import { validateAuth } from './modules/auth.ts';
import { fetchPetContext } from './modules/context.ts';
import { classifyEntry } from './modules/classifier.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ── Main handler ──

Deno.serve(async (req: Request) => {
  // Preflight
  if (req.method === 'OPTIONS') {
    return corsResponse();
  }

  try {
    // 1. Validate API key exists
    if (!Deno.env.get('ANTHROPIC_API_KEY')) {
      return errorResponse('ANTHROPIC_API_KEY not configured', 500);
    }

    // 2. Authenticate (optional for now — log warning if missing)
    const user = await validateAuth(req);
    if (!user) {
      console.warn('[classify-diary-entry] No valid auth token — proceeding with service role');
    }

    // 3. Parse and validate input
    const body = await req.json();
    const {
      pet_id,
      text,
      photo_base64,           // legacy single photo (kept for backward compat)
      photos_base64,          // new: array of up to 5 photos
      pdf_base64,             // PDF document for pdf_upload input type
      input_type = 'text',
      language = 'pt-BR',
    } = body;

    const hasPhoto = !!photo_base64 || (Array.isArray(photos_base64) && photos_base64.length > 0);
    const hasPDF = !!pdf_base64;

    console.log('[classify-diary-entry] pet_id:', pet_id,
      '| input_type:', input_type,
      '| text_len:', text?.length ?? 0,
      '| photos:', photos_base64?.length ?? (photo_base64 ? 1 : 0),
      '| pdf:', hasPDF,
      '| lang:', language,
      '| user:', user?.id ?? 'service',
    );

    if (!pet_id || (!text && !hasPhoto && !hasPDF)) {
      return errorResponse('pet_id and (text or photo_base64/photos_base64/pdf_base64) are required', 400);
    }

    // 4. Fetch pet context (profile + RAG memories — passes text for vector search)
    const petContext = await fetchPetContext(pet_id, text ?? undefined);
    if (!petContext) {
      return errorResponse('Pet not found', 404);
    }

    // 5. Classify with Claude
    const result = await classifyEntry({
      text,
      photo_base64,
      photos_base64: Array.isArray(photos_base64) ? photos_base64 : undefined,
      pdf_base64: pdf_base64 ?? undefined,
      input_type,
      language,
      petContext,
    });

    // 6. Record anonymized training data — fire-and-forget, consent checked inside DB function
    if (user?.id) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      supabase.rpc('anonymize_and_insert_training_record', {
        p_user_id: user.id,
        p_pet_id: pet_id,
        p_input_text: text ?? null,
        p_input_type: input_type,
        p_language: language,
        p_classifications: result.classifications ?? [],
        p_primary_type: result.primary_type,
        p_mood: result.mood ?? null,
        p_urgency: result.urgency,
        p_narration: result.narration ?? null,
        p_model_used: 'claude-sonnet-4-20250514',
        p_tokens_used: result.tokens_used,
      }).then(() => {
        console.log('[classify-diary-entry] training record queued for user:', user.id);
      }).catch((err: unknown) => {
        console.warn('[classify-diary-entry] training insert skipped (non-critical):', String(err));
      });
    }

    // 7. Return structured result
    return jsonResponse(result);

  } catch (err) {
    console.error('[classify-diary-entry] Unhandled error:', err);
    return errorResponse('Internal error', 500, { message: String(err) });
  }
});
