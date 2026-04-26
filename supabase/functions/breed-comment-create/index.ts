/**
 * breed-comment-create — Comentário de tutor com moderação IA + cross-ref diário.
 *
 * Tutor comenta em um post (texto já transcrito no client). Claude modera +
 * reescreve em registro Elite. Se aprovado, busca no diário do tutor entradas
 * recentes com sintomas/temas similares — se encontrar, marca diary_confirmed.
 *
 * POST body:
 *   {
 *     post_id: string,
 *     pet_id?: string,                // opcional, contexto
 *     raw_text: string,
 *     audio_url?: string,
 *     comment_type?: 'experience' | 'question' | 'tip' | 'confirmation',
 *     language?: string
 *   }
 *
 * Response:
 *   { comment_id, approved, rejection_reason, diary_confirmed }
 *
 * Elite gating obrigatório. verify_jwt: false.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LANG_NAMES: Record<string, string> = {
  'pt-BR': 'Brazilian Portuguese', 'pt': 'Brazilian Portuguese',
  'en': 'English', 'en-US': 'English',
  'es': 'Spanish', 'es-MX': 'Spanish (Mexico)', 'es-AR': 'Spanish (Argentina)',
  'fr': 'French', 'de': 'German',
};

function jsonResp(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

interface CommentAI {
  approved: boolean;
  rejection_reason: string | null;
  ai_summary: string;
  ai_tags: string[];
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return jsonResp({ error: 'method not allowed' }, 405);

  try {
    if (!ANTHROPIC_API_KEY) return jsonResp({ error: 'ANTHROPIC_API_KEY missing' }, 500);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return jsonResp({ error: 'unauthorized' }, 401);
    const token = authHeader.replace('Bearer ', '');
    const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { user } } = await anon.auth.getUser(token);
    if (!user) return jsonResp({ error: 'unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const postId = String(body.post_id ?? '');
    const petId = body.pet_id ? String(body.pet_id) : null;
    const rawText = String(body.raw_text ?? '').trim();
    const audioUrl = body.audio_url ? String(body.audio_url) : null;
    const commentType = String(body.comment_type ?? 'experience');
    const language = String(body.language ?? 'pt-BR');

    if (!postId) return jsonResp({ error: 'post_id required' }, 400);
    if (rawText.length < 3) return jsonResp({ error: 'text_too_short' }, 400);

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Elite gate
    const { data: gate } = await sb.rpc('is_elite_breed', { p_user_id: user.id });
    if (!gate) return jsonResp({ error: 'elite_required' }, 403);

    // Carrega post original
    const { data: post, error: postErr } = await sb
      .from('breed_posts')
      .select('id, ai_caption, target_breeds, target_species, ai_tags, post_type, title')
      .eq('id', postId)
      .eq('moderation_status', 'approved')
      .eq('is_active', true)
      .maybeSingle();
    if (postErr || !post) return jsonResp({ error: 'post_not_found' }, 404);

    // Pet do tutor (se enviado)
    let pet: { breed: string | null; species: string | null } | null = null;
    if (petId) {
      const { data } = await sb.from('pets')
        .select('id, breed, species, user_id')
        .eq('id', petId)
        .eq('user_id', user.id)
        .maybeSingle();
      pet = data ?? null;
    }

    const lang = LANG_NAMES[language] ?? LANG_NAMES[language.split('-')[0]] ?? 'Brazilian Portuguese';
    const breedHint = pet?.breed ?? (post.target_breeds?.[0] ?? 'unknown');

    // ── Moderação Claude ─────────────────────────────────────────────────
    const systemPrompt = `You are the comment moderator for the Breed Intelligence feed of auExpert Elite — a clinical, premium pet platform.
A tutor commented on a published post. Your job: moderate + rewrite the comment.

REJECT if the comment contains:
- Medication recommendations without veterinary supervision
- Informal disease diagnosis
- Misinformation about animal health
- Offensive, irrelevant, or off-topic content
- Personal data
- Spam / promotional content

Also REJECT if the comment is irrelevant to the original post topic.

If APPROVED, rewrite in:
- 1-2 short sentences
- 3rd person, no exclamations
- Clinical-elegant tone
- Strip personal identifiers
- Generate relevant tags

Return ONLY valid JSON, no markdown.`;

    const userPrompt = `Original post (about ${breedHint}):
Title: "${post.title ?? post.ai_caption}"
Tags: ${JSON.stringify(post.ai_tags ?? [])}

Tutor of ${breedHint} commented (type=${commentType}):
"${rawText.slice(0, 2000)}"

Moderate and rewrite. Verify the comment is relevant to the post topic.
Return ONLY this JSON shape:
{
  "approved": true | false,
  "rejection_reason": "short reason in user's language, or null",
  "ai_summary": "rewritten 1-2 sentence comment in Elite register",
  "ai_tags": ["relevant", "tags"]
}

Respond in ${lang}.`;

    const cfgQ = await sb.from('app_config')
      .select('key, value')
      .in('key', ['ai_model_chat', 'ai_anthropic_version']);
    const cfgMap: Record<string, unknown> = {};
    for (const r of (cfgQ.data ?? [])) cfgMap[r.key] = r.value;
    const modelChain = Array.isArray(cfgMap.ai_model_chat)
      ? (cfgMap.ai_model_chat as string[])
      : [String(cfgMap.ai_model_chat ?? 'claude-sonnet-4-6')];
    const model = modelChain[0];
    const anthropicVersion = String(cfgMap.ai_anthropic_version ?? '2023-06-01');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': anthropicVersion,
      },
      body: JSON.stringify({
        model,
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('[breed-comment-create] anthropic err:', response.status, errBody);
      return jsonResp({ error: 'ai_failed' }, 502);
    }

    const aiResponse = await response.json();
    const textContent = aiResponse.content?.find((c: { type: string }) => c.type === 'text');
    let raw = (textContent?.text ?? '').trim();
    if (raw.startsWith('```')) raw = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');

    let parsed: CommentAI;
    try {
      parsed = JSON.parse(raw) as CommentAI;
    } catch (e) {
      console.error('[breed-comment-create] JSON parse failed:', e, raw.slice(0, 500));
      return jsonResp({ error: 'invalid_ai_response' }, 502);
    }

    // Cross-ref diário se aprovado e há tags clínicas
    let diaryEntryId: string | null = null;
    let diaryConfirmed = false;
    if (parsed.approved && petId && parsed.ai_tags?.length > 0) {
      const since = new Date();
      since.setDate(since.getDate() - 60);
      const { data: similarEntries } = await sb
        .from('diary_entries')
        .select('id, content, created_at')
        .eq('pet_id', petId)
        .gte('created_at', since.toISOString())
        .or(parsed.ai_tags.slice(0, 3).map(t => `content.ilike.%${t}%`).join(','))
        .order('created_at', { ascending: false })
        .limit(1);
      if (similarEntries && similarEntries.length > 0) {
        diaryEntryId = similarEntries[0].id;
        diaryConfirmed = true;
      }
    }

    // Insere comentário
    const { data: comment, error: insErr } = await sb
      .from('breed_post_comments')
      .insert({
        post_id: postId,
        tutor_user_id: user.id,
        pet_id: petId,
        content: parsed.approved ? parsed.ai_summary : rawText.slice(0, 1000),
        raw_text: rawText,
        ai_summary: parsed.ai_summary,
        ai_tags: parsed.ai_tags ?? [],
        ai_approved: parsed.approved,
        ai_rejection_reason: parsed.rejection_reason ?? null,
        comment_type: commentType,
        audio_url: audioUrl,
        diary_entry_id: diaryEntryId,
        diary_confirmed: diaryConfirmed,
      })
      .select('id, ai_approved')
      .single();

    if (insErr || !comment) {
      console.error('[breed-comment-create] insert err:', insErr?.message);
      return jsonResp({ error: 'insert_failed', details: insErr?.message }, 500);
    }

    // Increment comment_count se aprovado
    if (parsed.approved) {
      await sb.rpc('breed_post_increment_comment_count', { p_post_id: postId })
        .then(() => {}, (e: unknown) => {
          // Fallback se RPC não existir: UPDATE direto
          console.warn('[breed-comment-create] rpc fail, fallback to update:', e);
          return sb.from('breed_posts')
            .update({ comment_count: (post as { comment_count?: number }).comment_count })
            .eq('id', postId);
        });
    }

    return jsonResp({
      comment_id: comment.id,
      approved: parsed.approved,
      rejection_reason: parsed.rejection_reason,
      diary_confirmed: diaryConfirmed,
      ai_summary: parsed.ai_summary,
    });

  } catch (err) {
    console.error('[breed-comment-create] error:', err);
    return jsonResp({ error: 'internal error', message: String(err) }, 500);
  }
});
