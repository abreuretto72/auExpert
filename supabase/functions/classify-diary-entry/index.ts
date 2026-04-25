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
 *
 * Telemetria (Fase 1 admin dashboard):
 *   recordAiInvocation chamado no final (sucesso ou erro). Best-effort, nunca
 *   bloqueia. Alimenta tabela ai_invocations consumida pelas RPCs admin.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

import { corsResponse, jsonResponse, errorResponse } from './modules/cors.ts';
import { validateAuth } from './modules/auth.ts';
import { fetchPetContext } from './modules/context.ts';
import { classifyEntry } from './modules/classifier.ts';
import { getAIConfig } from './modules/_classifier/ai-config.ts';
import {
  recordAiInvocation,
  categorizeError,
  statusFromCategory,
} from '../_shared/recordAiInvocation.ts';
import { estimateAiCost } from '../_shared/estimateAiCost.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FUNCTION_NAME = 'classify-diary-entry';

// ── Main handler ──

Deno.serve(async (req: Request) => {
  // Preflight
  if (req.method === 'OPTIONS') {
    return corsResponse();
  }

  // Telemetria — captura de inicio pra latencia + contexto pra recordAiInvocation
  const t0 = Date.now();
  const ctx: {
    user_id: string | null;
    pet_id: string | null;
    input_type: string | null;
    analysis_depth: string | null;
  } = { user_id: null, pet_id: null, input_type: null, analysis_depth: null };

  // Cliente service_role pra logar em ai_invocations (bypassa RLS)
  const telemetryClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // 1. Validate API key exists
    if (!Deno.env.get('ANTHROPIC_API_KEY')) {
      return errorResponse('ANTHROPIC_API_KEY not configured', 500);
    }

    // 2. Authenticate
    const user = await validateAuth(req);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }
    ctx.user_id = user.id;

    // 3. Parse and validate input
    const body = await req.json();
    const {
      pet_id,
      text,
      photo_base64,
      photos_base64,
      pdf_base64,
      audio_url,
      audio_duration_seconds,
      video_url,
      input_type = 'text',
      language = 'pt-BR',
      analysis_depth = 'balanced',
    } = body;
    ctx.pet_id = pet_id ?? null;
    ctx.input_type = input_type;
    ctx.analysis_depth = analysis_depth;

    const hasPhoto = !!photo_base64 || (Array.isArray(photos_base64) && photos_base64.length > 0);
    const hasPDF = !!pdf_base64;
    const hasAudio = !!audio_url;
    const hasVideo = !!video_url;

    console.log('[classify-diary-entry] pet_id:', pet_id,
      '| input_type:', input_type,
      '| text_len:', text?.length ?? 0,
      '| photos:', photos_base64?.length ?? (photo_base64 ? 1 : 0),
      '| pdf:', hasPDF,
      '| audio:', hasAudio,
      '| video_url:', hasVideo,
      '| lang:', language,
      '| user:', user?.id ?? 'service',
    );

    if (!pet_id || (!text && !hasPhoto && !hasPDF && !hasAudio)) {
      return errorResponse('pet_id and (text, photo, pdf, or audio_url) are required', 400);
    }

    // 4. Fetch pet context
    const petContext = await fetchPetContext(pet_id, text ?? undefined);
    if (!petContext) {
      return errorResponse('Pet not found', 404);
    }

    // 5. Classify
    const result = await classifyEntry({
      text,
      photo_base64,
      photos_base64: Array.isArray(photos_base64) ? photos_base64 : undefined,
      pdf_base64: pdf_base64 ?? undefined,
      audio_url: audio_url ?? undefined,
      audio_duration_seconds: typeof audio_duration_seconds === 'number' ? audio_duration_seconds : undefined,
      video_url: video_url ?? undefined,
      input_type,
      language,
      petContext,
      analysisDepth: analysis_depth,
    });

    // 6. Auto-save allergy classifications — fire-and-forget
    const allergyClassifications = (result.classifications ?? []).filter(
      (c: { type: string; confidence: number; extracted_data: Record<string, unknown> }) =>
        c.type === 'allergy' && c.confidence >= 0.7 && c.extracted_data?.allergen,
    );
    if (allergyClassifications.length > 0 && user?.id) {
      const supabaseAllergy = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      const { data: existing } = await supabaseAllergy
        .from('allergies')
        .select('allergen')
        .eq('pet_id', pet_id)
        .eq('is_active', true);
      const existingLower = new Set((existing ?? []).map((r: { allergen: string }) => r.allergen.toLowerCase()));

      for (const c of allergyClassifications) {
        const d = c.extracted_data as Record<string, unknown>;
        const allergen = String(d.allergen ?? '').trim();
        if (!allergen || existingLower.has(allergen.toLowerCase())) continue;
        supabaseAllergy
          .from('allergies')
          .insert({
            pet_id,
            user_id: user.id,
            allergen,
            reaction: d.reaction_type ? String(d.reaction_type) : null,
            severity: (['mild', 'moderate', 'severe'].includes(String(d.severity ?? ''))
              ? String(d.severity)
              : 'mild'),
            diagnosed_date: d.first_observed ? String(d.first_observed) : null,
            diagnosed_by: null,
            is_active: true,
          })
          .then(() => {
            console.log('[classify-diary-entry] allergy auto-saved:', allergen, '| pet:', pet_id);
          })
          .catch((err: unknown) => {
            console.warn('[classify-diary-entry] allergy insert skipped:', String(err));
          });
        existingLower.add(allergen.toLowerCase());
      }
    }

    // 7. Record anonymized training data — fire-and-forget
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

    // ── Telemetria: registrar invocacao bem-sucedida em ai_invocations ──
    // Captura usage REAL via result._telemetry (anexado pelo classifier).
    // Quando ausente, cai em fallback do ai-config.
    {
      const t = result._telemetry;
      const cfg = await getAIConfig();
      const fallbackModel =
        input_type === 'pet_audio' ? cfg.model_audio :
        input_type === 'video'     ? cfg.model_video :
                                     cfg.model_classify;
      const modelUsed = t?.actual_model ?? fallbackModel;
      const provider: 'anthropic' | 'google' = t?.provider ?? 'anthropic';

      // Tokens reais por provider; sem mais null em tokens_in.
      let tokensIn = 0;
      let tokensOut = 0;
      let cacheRead = 0;
      let cacheWrite = 0;
      if (t?.claude_usage) {
        tokensIn   = t.claude_usage.input_tokens;
        tokensOut  = t.claude_usage.output_tokens;
        cacheRead  = t.claude_usage.cache_read_input_tokens;
        cacheWrite = t.claude_usage.cache_creation_input_tokens;
      } else if (t?.gemini_usage) {
        // Para Gemini, prompt_tokens ja exclui cached (subtraido em callGemini).
        tokensIn  = t.gemini_usage.prompt_tokens;
        tokensOut = t.gemini_usage.candidates_tokens;
        cacheRead = t.gemini_usage.cached_tokens;
      } else {
        // Fallback legado: tokens_used era apenas output em Claude.
        tokensOut = result.tokens_used ?? 0;
      }

      // Image/audio counts pra auditoria (custo ja incluso em tokens).
      const imageCount =
        Array.isArray(photos_base64) ? photos_base64.length :
        photo_base64 ? 1 :
        input_type === 'video' ? 1 :  // thumbnail fallback
        null;
      const audioSeconds =
        input_type === 'pet_audio' && typeof audio_duration_seconds === 'number'
          ? audio_duration_seconds : null;

      recordAiInvocation(telemetryClient, {
        function_name: FUNCTION_NAME,
        user_id: ctx.user_id,
        pet_id: ctx.pet_id,
        provider,
        model_used: modelUsed,
        tokens_in: tokensIn,
        tokens_out: tokensOut,
        cache_read_tokens: cacheRead,
        cache_write_tokens: cacheWrite,
        image_count: imageCount,
        audio_seconds: audioSeconds,
        latency_ms: Date.now() - t0,
        // cost_estimated_usd descontinuado — RPC calcula via ai_pricing.
        // Mantemos call ao estimateAiCost por compat de log local.
        cost_estimated_usd: estimateAiCost(modelUsed, tokensIn, tokensOut),
        status: 'success',
        payload: {
          input_type: ctx.input_type,
          analysis_depth: ctx.analysis_depth,
          primary_type: result.primary_type,
          classifications_count: (result.classifications ?? []).length,
        },
      }).catch(() => {});
    }

    // 8. Return structured result
    return jsonResponse(result);

  } catch (err) {
    console.error('[classify-diary-entry] Unhandled error:', err);

    // ── Telemetria: registrar invocacao com erro ──
    const cat = categorizeError(err);
    recordAiInvocation(telemetryClient, {
      function_name: FUNCTION_NAME,
      user_id: ctx.user_id,
      pet_id: ctx.pet_id,
      model_used: null,
      latency_ms: Date.now() - t0,
      status: statusFromCategory(cat),
      error_category: cat,
      error_message: String(err).slice(0, 1000),
      user_message: 'Algo nao saiu como esperado. Tente novamente.',
      payload: { input_type: ctx.input_type, analysis_depth: ctx.analysis_depth },
    }).catch(() => {});

    return errorResponse('Internal error', 500, { message: String(err) });
  }
});
