/**
 * reembed-diary-rich — Regenera embeddings ricos de diary_entries.
 *
 * Para cada diary_entry, monta um content_text COMPLETO contendo:
 *   - Texto do tutor (content)
 *   - Narração da IA (narration)
 *   - Resumo photo_analysis_data (raça, mood, sinais clínicos visíveis)
 *   - Resumo video_analysis (atividade, comportamento, duração)
 *   - Resumo pet_audio_analysis (tipo de vocalização, contexto emocional)
 *   - Resumo media_analyses (OCR, descrição de cada item)
 *
 * Cria 1 embedding tipo 'diary_full' por diary_entry. Os embeddings antigos
 * com content_text mínimo continuam ativos (não estraga histórico) — mas o
 * novo embedding rico passa a dominar o ranking RAG.
 *
 * POST body: { pet_id?: string, diary_entry_id?: string, all?: boolean,
 *              admin_token?: string }
 *   - pet_id: re-embeda todas as entries desse pet
 *   - diary_entry_id: re-embeda só uma
 *   - all + admin_token: re-embeda TUDO no banco (admin)
 *
 * verify_jwt: false. Auth: KB_SECRET ou JWT.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const KB_SECRET = Deno.env.get('KB_SECRET') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResp(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

interface DiaryEntry {
  id: string;
  pet_id: string;
  user_id: string;
  content: string | null;
  narration: string | null;
  tags: string[] | null;
  mood_id: string | null;
  entry_date: string | null;
  created_at: string;
  media_analyses: unknown[] | null;
  photo_analysis_data: Record<string, unknown> | null;
  video_analysis: Record<string, unknown> | null;
  pet_audio_analysis: Record<string, unknown> | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return jsonResp({ error: 'method not allowed' }, 405);

  try {
    if (!GEMINI_API_KEY) return jsonResp({ error: 'GEMINI_API_KEY missing' }, 500);

    const body = await req.json().catch(() => ({}));
    const petId = body.pet_id ? String(body.pet_id) : null;
    const diaryEntryId = body.diary_entry_id ? String(body.diary_entry_id) : null;
    const all = body.all === true;
    const adminToken = body.admin_token ? String(body.admin_token) : null;

    // Auth: KB_SECRET (CRON/admin) OR JWT do dono do pet
    let isAuthed = false;
    let userId: string | null = null;
    if (KB_SECRET && adminToken && adminToken === KB_SECRET) {
      isAuthed = true;
    } else {
      const auth = req.headers.get('Authorization');
      if (auth?.startsWith('Bearer ')) {
        const token = auth.replace('Bearer ', '');
        const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const { data: { user } } = await anon.auth.getUser(token);
        if (user) { isAuthed = true; userId = user.id; }
      }
    }
    if (!isAuthed) return jsonResp({ error: 'unauthorized' }, 401);

    if (!petId && !diaryEntryId && !all) {
      return jsonResp({ error: 'pet_id, diary_entry_id or all required' }, 400);
    }
    if (all && !KB_SECRET) {
      return jsonResp({ error: 'all flag requires admin_token' }, 403);
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Carrega diary entries alvo
    let q = sb.from('diary_entries').select(`
      id, pet_id, user_id, content, narration, tags, mood_id, entry_date, created_at,
      media_analyses, photo_analysis_data, video_analysis, pet_audio_analysis
    `).eq('is_active', true);

    if (diaryEntryId) {
      q = q.eq('id', diaryEntryId);
    } else if (petId) {
      q = q.eq('pet_id', petId);
      // Se JWT do tutor, valida ownership do pet
      if (userId) {
        const { data: petCheck } = await sb.from('pets')
          .select('user_id').eq('id', petId).maybeSingle();
        if (petCheck?.user_id !== userId) return jsonResp({ error: 'not pet owner' }, 403);
      }
    }
    // all = sem filtro adicional

    const { data: entries, error } = await q;
    if (error) return jsonResp({ error: 'query failed', details: error.message }, 500);
    if (!entries || entries.length === 0) {
      return jsonResp({ success: true, processed: 0, message: 'no entries to re-embed' });
    }

    const results: Array<{ id: string; ok: boolean; len?: number; err?: string }> = [];
    let processed = 0;

    // Processa em batches de 5 pra não estourar timeout
    const BATCH = 5;
    for (let i = 0; i < entries.length; i += BATCH) {
      const batch = entries.slice(i, i + BATCH) as DiaryEntry[];
      const batchResults = await Promise.allSettled(
        batch.map(async (entry) => {
          const richText = buildRichContentText(entry);
          if (richText.length < 20) {
            return { id: entry.id, ok: false, err: 'too_short_skipped' };
          }
          const embedding = await embedText(richText);
          if (!embedding) {
            return { id: entry.id, ok: false, err: 'embed_failed' };
          }

          // Upsert: 1 embedding tipo 'diary_full' por diary_entry.
          // Procura existente; se houver, atualiza; senão insere.
          const { data: existing } = await sb
            .from('pet_embeddings')
            .select('id')
            .eq('diary_entry_id', entry.id)
            .eq('category', 'diary_full')
            .maybeSingle();

          const row = {
            pet_id:        entry.pet_id,
            user_id:       entry.user_id,
            diary_entry_id: entry.id,
            content_text:  richText.slice(0, 8000),
            content_type:  'diary_full',
            category:      'diary_full',
            importance:    0.85,  // alto: contém TUDO da entrada
            embedding,
            metadata: {
              entry_date: entry.entry_date,
              has_narration: !!entry.narration,
              has_photo_analysis: !!entry.photo_analysis_data,
              has_video_analysis: !!entry.video_analysis,
              has_audio_analysis: !!entry.pet_audio_analysis,
              media_analyses_count: Array.isArray(entry.media_analyses) ? entry.media_analyses.length : 0,
              tags: entry.tags ?? [],
              source: 'reembed-diary-rich-v1',
            },
            is_active: true,
          };

          if (existing) {
            const { error: upErr } = await sb.from('pet_embeddings')
              .update(row).eq('id', existing.id);
            if (upErr) return { id: entry.id, ok: false, err: upErr.message };
          } else {
            const { error: insErr } = await sb.from('pet_embeddings').insert(row);
            if (insErr) return { id: entry.id, ok: false, err: insErr.message };
          }
          return { id: entry.id, ok: true, len: richText.length };
        }),
      );
      for (const r of batchResults) {
        if (r.status === 'fulfilled') {
          results.push(r.value);
          if (r.value.ok) processed++;
        } else {
          results.push({ id: 'unknown', ok: false, err: String(r.reason).slice(0, 200) });
        }
      }
    }

    return jsonResp({
      success: true,
      total: entries.length,
      processed,
      failed: entries.length - processed,
      results: results.slice(0, 20), // amostra
    });

  } catch (err) {
    console.error('[reembed-diary-rich] error:', err);
    return jsonResp({ error: 'internal error', message: String(err) }, 500);
  }
});

/**
 * Monta o content_text COMPLETO juntando todas as fontes da diary_entry.
 * Inclui: texto do tutor, narração da IA, e resumo de TODAS as análises de mídia.
 */
function buildRichContentText(entry: DiaryEntry): string {
  const parts: string[] = [];

  // 1. Header com data
  if (entry.entry_date) parts.push(`[Data: ${entry.entry_date}]`);

  // 2. Texto do tutor
  if (entry.content && entry.content.trim()) {
    parts.push(`Tutor: ${entry.content.trim()}`);
  }

  // 3. Narração da IA
  if (entry.narration && entry.narration.trim()) {
    parts.push(`Narração: ${entry.narration.trim()}`);
  }

  // 4. Análise de foto
  if (entry.photo_analysis_data) {
    const p = entry.photo_analysis_data as Record<string, unknown>;
    const summary = summarizeAnalysis('Foto', p);
    if (summary) parts.push(summary);
  }

  // 5. Análise de vídeo
  if (entry.video_analysis) {
    const v = entry.video_analysis as Record<string, unknown>;
    const summary = summarizeAnalysis('Vídeo', v);
    if (summary) parts.push(summary);
  }

  // 6. Análise de áudio (latido/miado/etc)
  if (entry.pet_audio_analysis) {
    const a = entry.pet_audio_analysis as Record<string, unknown>;
    const summary = summarizeAnalysis('Áudio', a);
    if (summary) parts.push(summary);
  }

  // 7. media_analyses array (OCR, foto extra)
  if (Array.isArray(entry.media_analyses)) {
    entry.media_analyses.forEach((m, idx) => {
      if (typeof m === 'object' && m !== null) {
        const summary = summarizeAnalysis(`Mídia ${idx + 1}`, m as Record<string, unknown>);
        if (summary) parts.push(summary);
      }
    });
  }

  // 8. Tags
  if (entry.tags && entry.tags.length > 0) {
    parts.push(`Tags: ${entry.tags.join(', ')}`);
  }

  return parts.join('\n\n');
}

/**
 * Converte um JSON de análise (foto/vídeo/áudio) em texto plano legível.
 * Pega só campos relevantes pra busca semântica.
 */
function summarizeAnalysis(label: string, data: Record<string, unknown>): string {
  const lines: string[] = [`[Análise ${label}]`];
  const RELEVANT_KEYS = [
    'breed', 'identified_breed', 'species_observed',
    'mood', 'mood_observed', 'emotional_state', 'behavior', 'activity',
    'body_condition', 'body_condition_score', 'bcs',
    'clinical_signs', 'visible_signs', 'observations', 'findings',
    'health_score', 'concerns', 'alerts', 'warnings',
    'environment', 'setting', 'location_inferred',
    'duration_seconds', 'duration', 'video_length',
    'vocalization_type', 'audio_type', 'sound_type', 'context',
    'urgency', 'confidence', 'description', 'summary', 'narrative',
    'transcript', 'extracted_text', 'ocr_text', 'recognized_text',
    'objects', 'features', 'tags',
  ];

  for (const key of RELEVANT_KEYS) {
    const value = data[key];
    if (value === null || value === undefined || value === '') continue;
    if (typeof value === 'object' && !Array.isArray(value)) {
      const inner = JSON.stringify(value).slice(0, 200);
      if (inner !== '{}') lines.push(`  ${key}: ${inner}`);
    } else if (Array.isArray(value)) {
      const inner = value.slice(0, 5).map(v =>
        typeof v === 'object' ? JSON.stringify(v).slice(0, 100) : String(v)
      ).join('; ');
      if (inner) lines.push(`  ${key}: ${inner}`);
    } else {
      const str = String(value).slice(0, 300);
      lines.push(`  ${key}: ${str}`);
    }
  }

  return lines.length > 1 ? lines.join('\n') : '';
}

/**
 * Gera embedding 384-dim via Gemini gemini-embedding-001 (Matryoshka).
 * A coluna pet_embeddings.embedding é vector(384) — alinha com o resto do app.
 * Quando dimensão < 3072, Gemini exige renormalização L2 client-side.
 */
async function embedText(text: string): Promise<number[] | null> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: { parts: [{ text: text.slice(0, 8000) }] },
          taskType: 'RETRIEVAL_DOCUMENT',
          outputDimensionality: 384,
        }),
      },
    );
    if (!res.ok) {
      console.warn('[reembed-diary-rich] gemini embed failed:', res.status, await res.text().catch(() => ''));
      return null;
    }
    const json = await res.json();
    const values = json?.embedding?.values as number[] | undefined;
    if (!values || values.length === 0) return null;
    // Renormaliza L2 (Matryoshka requirement quando outputDimensionality < 3072)
    let norm = 0;
    for (const v of values) norm += v * v;
    norm = Math.sqrt(norm);
    if (norm === 0) return values;
    return values.map(v => v / norm);
  } catch (e) {
    console.warn('[reembed-diary-rich] embed exception:', e);
    return null;
  }
}
