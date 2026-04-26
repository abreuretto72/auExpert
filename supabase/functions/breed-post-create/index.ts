/**
 * breed-post-create — Cria post do tutor com moderação automática IA.
 *
 * Recebe texto cru (transcrito no client via useSimpleSTT) + URLs de mídia já
 * upadas no storage. Claude modera + reescreve em registro Elite.
 * Inserts row em breed_posts com moderation_status apropriado.
 *
 * POST body:
 *   {
 *     pet_id: string,
 *     tutor_raw_text: string,        // texto/transcrição obrigatória
 *     media_urls?: string[],         // URLs já upadas no storage
 *     media_thumbnails?: string[],
 *     media_type?: 'photo' | 'video' | 'mixed' | 'none',
 *     media_duration?: number,       // segundos (vídeo)
 *     audio_url?: string,            // áudio original opcional
 *     from_diary_entry_id?: string,
 *     recommendation_id?: string,
 *     language?: string
 *   }
 *
 * Response:
 *   { post_id, approved, rejection_reason }
 *
 * verify_jwt: false. Auth via Authorization header.
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

interface ModerationAI {
  approved: boolean;
  rejection_reason: string | null;
  ai_caption: string;
  ai_tags: string[];
  urgency: 'none' | 'low' | 'medium' | 'high' | 'critical';
  ai_relevance_score: number;
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
    const petId = String(body.pet_id ?? '');
    const tutorRawText = String(body.tutor_raw_text ?? '').trim();
    const mediaUrls = Array.isArray(body.media_urls) ? body.media_urls.map(String) : [];
    const mediaThumbnails = Array.isArray(body.media_thumbnails) ? body.media_thumbnails.map(String) : [];
    const mediaType = String(body.media_type ?? (mediaUrls.length === 0 ? 'none' : 'photo'));
    const mediaDuration = body.media_duration ? Number(body.media_duration) : null;
    const audioUrl = body.audio_url ? String(body.audio_url) : null;
    const fromDiaryEntryId = body.from_diary_entry_id ? String(body.from_diary_entry_id) : null;
    const recommendationId = body.recommendation_id ? String(body.recommendation_id) : null;
    const language = String(body.language ?? 'pt-BR');

    if (!petId) return jsonResp({ error: 'pet_id required' }, 400);
    if (!tutorRawText && mediaUrls.length === 0) {
      return jsonResp({ error: 'text_or_media_required' }, 400);
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Elite gate
    const { data: gate } = await sb.rpc('is_elite_breed', { p_user_id: user.id });
    if (!gate) return jsonResp({ error: 'elite_required' }, 403);

    // Pet do tutor
    const { data: pet, error: petErr } = await sb
      .from('pets')
      .select('id, user_id, name, breed, species, birth_date, weight_kg')
      .eq('id', petId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (petErr || !pet) return jsonResp({ error: 'pet_not_found' }, 404);

    const ageMonths = pet.birth_date ? monthsBetween(new Date(String(pet.birth_date)), new Date()) : null;

    const lang = LANG_NAMES[language] ?? LANG_NAMES[language.split('-')[0]] ?? 'Brazilian Portuguese';

    // Normaliza texto: descarta placeholders do client ("(media)", "(foto)", "(video)")
    // que aparecem quando o tutor só anexa mídia sem digitar nada.
    const PLACEHOLDER_RE = /^\s*\(\s*(media|m[ií]dia|foto|photo|v[ií]deo|video|audio|[áa]udio)\s*\)\s*$/i;
    const cleanTutorText = PLACEHOLDER_RE.test(tutorRawText) ? '' : tutorRawText.trim();
    const isMediaOnly = !cleanTutorText && mediaUrls.length > 0;

    // ── Moderação Claude ─────────────────────────────────────────────────
    const systemPrompt = `You are the moderator for the Breed Intelligence feed of auExpert Elite — a clinical, premium pet platform.
Tutors share experiences with their pets. Your job: moderate + rewrite each contribution in clinical Elite register.

REJECT if the content contains:
- Medication recommendations without veterinary supervision
- Informal disease diagnosis ("my pet has X disease")
- Misinformation about animal health
- Offensive, irrelevant, or off-topic content
- Personal data (full names, addresses, phone numbers)
- Promotional/spam content unrelated to pet care

If APPROVED, rewrite the content in:
- 2-3 short sentences
- 3rd person, no exclamations, no "I"/"my"/"we"
- Clinical-elegant tone (like Clarice Lispector in "Laços de Família")
- Reference the pet's breed when relevant
- Strip personal identifiers
- Generate clinical tags (breed, condition, theme)
- Set urgency level based on content (e.g., recall/critical health = "critical", routine experience = "none")
- Score relevance 0.0-10.0 (how useful is this for other tutors of the same breed?)

MEDIA-ONLY POSTS: If the tutor only attached media (photos/videos) without text,
DO NOT reject. Treat it as a moment-of-life post and generate a brief, evocative
3rd-person caption based on the breed + context. Approval criteria above still apply.

Return ONLY valid JSON, no markdown.`;

    const userPrompt = `A tutor of ${pet.breed} (${pet.species}, age ${ageMonths ?? 'unknown'} months) shared:
${isMediaOnly
  ? `[MEDIA-ONLY POST — no text written by the tutor]
They attached ${mediaUrls.length} ${mediaType} file(s). Generate a brief evocative
3rd-person caption based on the breed and the fact that this is a moment of life
they wanted to share with other ${pet.breed} tutors. APPROVE unless the caption
would inevitably involve forbidden topics.`
  : `"${cleanTutorText.slice(0, 4000)}"

${mediaUrls.length > 0 ? `They attached ${mediaUrls.length} media file(s) of type ${mediaType}.` : ''}`}
${fromDiaryEntryId ? 'Source: existing diary entry from this tutor.' : ''}
${recommendationId ? 'Source: recommendation post (The Inner Circle).' : ''}

Moderate and rewrite for the Breed Intelligence feed.
Return ONLY this JSON shape:
{
  "approved": true | false,
  "rejection_reason": "short reason in Brazilian Portuguese, or null if approved",
  "ai_caption": "rewritten 2-3 sentence post in Elite register",
  "ai_tags": ["breed_or_condition_tag", "another_tag"],
  "urgency": "none|low|medium|high|critical",
  "ai_relevance_score": 0.0
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
        max_tokens: 800,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('[breed-post-create] anthropic err:', response.status, errBody);
      return jsonResp({ error: 'ai_failed' }, 502);
    }

    const aiResponse = await response.json();
    const textContent = aiResponse.content?.find((c: { type: string }) => c.type === 'text');
    let raw = (textContent?.text ?? '').trim();
    if (raw.startsWith('```')) raw = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');

    let parsed: ModerationAI;
    try {
      parsed = JSON.parse(raw) as ModerationAI;
    } catch (e) {
      console.error('[breed-post-create] JSON parse failed:', e, raw.slice(0, 500));
      return jsonResp({ error: 'invalid_ai_response' }, 502);
    }

    // Inserir row (aprovado ou rejeitado)
    const now = new Date().toISOString();
    const { data: post, error: insErr } = await sb
      .from('breed_posts')
      .insert({
        tutor_user_id: user.id,
        pet_id: petId,
        diary_entry_id: fromDiaryEntryId,
        recommendation_id: recommendationId,
        target_breeds: [pet.breed].filter(Boolean),
        target_species: pet.species,
        post_type: recommendationId ? 'recommendation' : 'tutor',
        source: recommendationId ? 'recommendation' : 'tutor',
        ai_caption: parsed.ai_caption ?? '',
        tutor_raw_text: cleanTutorText,
        audio_url: audioUrl,
        media_type: mediaType,
        media_urls: mediaUrls,
        media_thumbnails: mediaThumbnails.length ? mediaThumbnails : null,
        media_duration: mediaDuration,
        moderation_status: parsed.approved ? 'approved' : 'rejected',
        moderation_reason: parsed.rejection_reason ?? null,
        moderated_at: now,
        published_at: parsed.approved ? now : null,
        ai_tags: parsed.ai_tags ?? [],
        urgency: parsed.urgency ?? 'none',
        ai_relevance_score: clamp(parsed.ai_relevance_score, 0, 10),
        pet_age_months: ageMonths,
      })
      .select('id, moderation_status')
      .single();

    if (insErr || !post) {
      console.error('[breed-post-create] insert err:', insErr?.message);
      return jsonResp({ error: 'insert_failed', details: insErr?.message }, 500);
    }

    // Notifica tutor se rejeitado (push silencioso via notifications_queue)
    if (!parsed.approved) {
      await sb.from('notifications_queue').insert({
        user_id: user.id,
        type: 'breed_post_rejected',
        title: 'Conteúdo não aprovado',
        body: parsed.rejection_reason ?? 'Tente reformular sua contribuição.',
        scheduled_for: now,
        data: { post_id: post.id },
      }).then(
        () => {},
        (e: unknown) => console.warn('[breed-post-create] queue insert failed:', e),
      );
    }

    return jsonResp({
      post_id: post.id,
      approved: parsed.approved,
      rejection_reason: parsed.rejection_reason,
      ai_caption: parsed.ai_caption,
    });

  } catch (err) {
    console.error('[breed-post-create] error:', err);
    return jsonResp({ error: 'internal error', message: String(err) }, 500);
  }
});

function clamp(n: unknown, min: number, max: number): number {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return Math.min(Math.max(v, min), max);
}

function monthsBetween(from: Date, to: Date): number {
  const months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  return Math.max(0, months);
}
