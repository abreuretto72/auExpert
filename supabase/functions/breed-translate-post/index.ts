/**
 * breed-translate-post — Traduz on-demand uma editorial/comentário pra outro idioma.
 *
 * Chamada em background pela breed-feed quando descobre que o tutor pediu um idioma
 * que ainda não está cacheado em breed_posts.translations[locale].
 *
 * POST body:
 *   {
 *     post_id?: string,         // breed_posts.id  — OU
 *     comment_id?: string,      // breed_post_comments.id
 *     target_locale: string     // 'en-US', 'es-MX', etc.
 *   }
 *
 * Idempotente: se já existe translation pro locale, retorna cached.
 *
 * Custo: ~$0.001-0.005 por chamada (Claude Haiku 4.5).
 * verify_jwt: false. Auth: KB_SECRET (CRON/internal) ou service role header.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const KB_SECRET = Deno.env.get('KB_SECRET') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LANG_NAMES: Record<string, string> = {
  'pt-BR': 'Brazilian Portuguese', 'pt': 'Brazilian Portuguese', 'pt-PT': 'European Portuguese',
  'en': 'English', 'en-US': 'English (US)',
  'es': 'Spanish', 'es-MX': 'Spanish (Mexico)', 'es-AR': 'Spanish (Argentina)',
  'fr': 'French', 'de': 'German',
};

function jsonResp(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

interface PostTranslation {
  title: string | null;
  body: string | null;
  ai_caption: string;
  ai_tags: string[];
}

interface CommentTranslation {
  ai_summary: string;
  ai_tags: string[];
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return jsonResp({ error: 'method not allowed' }, 405);

  const tStart = Date.now();
  try {
    if (!ANTHROPIC_API_KEY) return jsonResp({ error: 'ANTHROPIC_API_KEY missing' }, 500);

    const body = await req.json().catch(() => ({}));
    const postId = body.post_id ? String(body.post_id) : null;
    const commentId = body.comment_id ? String(body.comment_id) : null;
    const targetLocale = String(body.target_locale ?? '').trim();
    const adminToken = body.admin_token ? String(body.admin_token) : null;

    if (!postId && !commentId) return jsonResp({ error: 'post_id or comment_id required' }, 400);
    if (!targetLocale) return jsonResp({ error: 'target_locale required' }, 400);

    // Auth: KB_SECRET (CRON / pg_net interno) ou service role direto
    let isAuthed = !!(KB_SECRET && adminToken && adminToken === KB_SECRET);
    if (!isAuthed) {
      const auth = req.headers.get('Authorization');
      if (auth?.startsWith('Bearer ')) {
        const token = auth.replace('Bearer ', '');
        if (token === SUPABASE_SERVICE_ROLE_KEY) isAuthed = true;
      }
    }
    if (!isAuthed) return jsonResp({ error: 'unauthorized' }, 401);

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (postId) {
      return await translatePost(sb, postId, targetLocale, tStart);
    } else if (commentId) {
      return await translateComment(sb, commentId, targetLocale, tStart);
    }
    return jsonResp({ error: 'unreachable' }, 500);

  } catch (err) {
    console.error('[breed-translate-post] error:', err);
    return jsonResp({ error: 'internal error', message: String(err) }, 500);
  }
});

async function translatePost(
  sb: ReturnType<typeof createClient>,
  postId: string,
  targetLocale: string,
  tStart: number,
): Promise<Response> {
  const { data: post, error } = await sb
    .from('breed_posts')
    .select('id, title, body, ai_caption, ai_tags, original_locale, translations')
    .eq('id', postId)
    .maybeSingle();
  if (error || !post) return jsonResp({ error: 'post_not_found' }, 404);

  // Se já está no idioma pedido, retorna o original como cached.
  if (post.original_locale === targetLocale) {
    return jsonResp({ cached: true, locale: targetLocale, data: pickPostFields(post) });
  }

  // Se tradução já existe, retorna cached.
  const translations = (post.translations ?? {}) as Record<string, PostTranslation>;
  if (translations[targetLocale]) {
    return jsonResp({ cached: true, locale: targetLocale, data: translations[targetLocale] });
  }

  // Traduz via Claude Haiku
  const targetLangName = LANG_NAMES[targetLocale] ?? LANG_NAMES[targetLocale.split('-')[0]] ?? targetLocale;
  const sourceLangName = LANG_NAMES[post.original_locale] ?? post.original_locale;

  const userInput = JSON.stringify({
    title: post.title,
    body: post.body,
    ai_caption: post.ai_caption,
    ai_tags: post.ai_tags ?? [],
  });

  const result = await callClaudeTranslate(userInput, sourceLangName, targetLangName, 'editorial');
  if (!result.ok) {
    return jsonResp({ error: 'translation_failed', details: result.error }, 502);
  }

  const translation = result.parsed as PostTranslation;

  // Atualiza o JSON translations[targetLocale]
  const newTranslations = { ...translations, [targetLocale]: translation };
  const { error: upErr } = await sb
    .from('breed_posts')
    .update({ translations: newTranslations })
    .eq('id', postId);
  if (upErr) {
    console.warn('[breed-translate-post] update failed:', upErr.message);
  }

  // Telemetria
  recordInvocation(sb, {
    function_name: 'breed-translate-post',
    model_used: result.model,
    provider: 'anthropic',
    tokens_in: result.tokens_in,
    tokens_out: result.tokens_out,
    latency_ms: Date.now() - tStart,
    status: 'success',
    payload: { kind: 'post', post_id: postId, target_locale: targetLocale },
  });

  return jsonResp({ cached: false, locale: targetLocale, data: translation });
}

async function translateComment(
  sb: ReturnType<typeof createClient>,
  commentId: string,
  targetLocale: string,
  tStart: number,
): Promise<Response> {
  const { data: comment, error } = await sb
    .from('breed_post_comments')
    .select('id, ai_summary, ai_tags, original_locale, translations')
    .eq('id', commentId)
    .maybeSingle();
  if (error || !comment) return jsonResp({ error: 'comment_not_found' }, 404);

  if (comment.original_locale === targetLocale) {
    return jsonResp({ cached: true, locale: targetLocale, data: { ai_summary: comment.ai_summary, ai_tags: comment.ai_tags ?? [] } });
  }

  const translations = (comment.translations ?? {}) as Record<string, CommentTranslation>;
  if (translations[targetLocale]) {
    return jsonResp({ cached: true, locale: targetLocale, data: translations[targetLocale] });
  }

  const targetLangName = LANG_NAMES[targetLocale] ?? LANG_NAMES[targetLocale.split('-')[0]] ?? targetLocale;
  const sourceLangName = LANG_NAMES[comment.original_locale] ?? comment.original_locale;

  const userInput = JSON.stringify({
    ai_summary: comment.ai_summary,
    ai_tags: comment.ai_tags ?? [],
  });

  const result = await callClaudeTranslate(userInput, sourceLangName, targetLangName, 'comment');
  if (!result.ok) return jsonResp({ error: 'translation_failed', details: result.error }, 502);

  const translation = result.parsed as CommentTranslation;
  const newTranslations = { ...translations, [targetLocale]: translation };
  await sb.from('breed_post_comments').update({ translations: newTranslations }).eq('id', commentId);

  recordInvocation(sb, {
    function_name: 'breed-translate-post',
    model_used: result.model,
    provider: 'anthropic',
    tokens_in: result.tokens_in,
    tokens_out: result.tokens_out,
    latency_ms: Date.now() - tStart,
    status: 'success',
    payload: { kind: 'comment', comment_id: commentId, target_locale: targetLocale },
  });

  return jsonResp({ cached: false, locale: targetLocale, data: translation });
}

interface TranslateResult {
  ok: boolean;
  parsed?: unknown;
  error?: string;
  model: string;
  tokens_in: number;
  tokens_out: number;
}

async function callClaudeTranslate(
  inputJson: string,
  sourceLang: string,
  targetLang: string,
  kind: 'editorial' | 'comment',
): Promise<TranslateResult> {
  const systemPrompt = `You are a clinical-medical translator for a premium pet care platform.
Translate the JSON content from ${sourceLang} to ${targetLang}.
Tone: Elite register (3rd person, no exclamations, clinical-elegant). Keep clinical accuracy.
Translate the values inside the JSON; keep keys identical.
For ai_tags array: translate each tag to natural ${targetLang}.
Return ONLY valid JSON, no markdown, no explanation.`;

  const model = 'claude-haiku-4-5-20251001';
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: kind === 'editorial' ? 2000 : 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: inputJson }],
    }),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    return { ok: false, error: `http ${res.status}: ${errBody.slice(0, 200)}`, model, tokens_in: 0, tokens_out: 0 };
  }
  const json = await res.json();
  const usage = json.usage ?? {};
  const textContent = json.content?.find((c: { type: string }) => c.type === 'text');
  let raw = (textContent?.text ?? '').trim();
  if (raw.startsWith('```')) raw = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  try {
    const parsed = JSON.parse(raw);
    return { ok: true, parsed, model: json.model ?? model, tokens_in: Number(usage.input_tokens ?? 0), tokens_out: Number(usage.output_tokens ?? 0) };
  } catch (e) {
    return { ok: false, error: `parse: ${String(e).slice(0, 200)}`, model, tokens_in: 0, tokens_out: 0 };
  }
}

function pickPostFields(post: Record<string, unknown>): PostTranslation {
  return {
    title: (post.title as string | null) ?? null,
    body: (post.body as string | null) ?? null,
    ai_caption: (post.ai_caption as string) ?? '',
    ai_tags: (post.ai_tags as string[]) ?? [],
  };
}

interface InvocationRecord {
  function_name: string;
  model_used: string;
  provider: string;
  tokens_in?: number;
  tokens_out?: number;
  latency_ms: number;
  status: 'success' | 'error' | 'timeout' | 'rate_limited';
  payload?: Record<string, unknown>;
}

function recordInvocation(sb: ReturnType<typeof createClient>, rec: InvocationRecord): void {
  sb.from('ai_invocations').insert({
    function_name: rec.function_name,
    model_used: rec.model_used,
    provider: rec.provider,
    tokens_in: rec.tokens_in ?? null,
    tokens_out: rec.tokens_out ?? null,
    latency_ms: rec.latency_ms,
    status: rec.status,
    payload: rec.payload ?? null,
  }).then(
    ({ error }) => { if (error) console.warn('[breed-translate-post] ai_invocations insert failed:', error.message); },
    (e: unknown) => console.warn('[breed-translate-post] ai_invocations exception:', e),
  );
}
