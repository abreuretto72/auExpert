/**
 * breed-editorial-generate v5 — Artigo clínico + ilustração via Pollinations.
 *
 * Pipeline:
 *   1. Claude gera title + body + tags + urgency + score + illustration_prompt
 *   2. Pollinations.ai (Flux) gera ilustração 16:9 a partir do prompt — grátis, sem auth
 *   3. Upload PNG no bucket pet-photos/breed-editorial/<uuid>.png
 *   4. INSERT em breed_posts com thumbnail_url + media_urls[0] preenchidos
 *
 * Se a imagem falhar, post publica text-only (não-fatal).
 * verify_jwt: false. Auth: KB_SECRET ou JWT admin.
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

interface EditorialAI {
  title: string;
  body: string;
  ai_tags: string[];
  urgency: 'none' | 'low' | 'medium' | 'high' | 'critical';
  ai_relevance_score: number;
  source_name: string;
  source_url: string | null;
  illustration_prompt: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return jsonResp({ error: 'method not allowed' }, 405);

  const tStart = Date.now();
  try {
    if (!ANTHROPIC_API_KEY) return jsonResp({ error: 'ANTHROPIC_API_KEY missing' }, 500);

    const body = await req.json().catch(() => ({}));

    // ── Modo diagnóstico: lista modelos Gemini disponíveis pra esta chave ──
    if (body.list_gemini_models === true) {
      const adminToken = body.admin_token ? String(body.admin_token) : null;
      if (!KB_SECRET || adminToken !== KB_SECRET) return jsonResp({ error: 'unauthorized' }, 401);
      const geminiKey = Deno.env.get('GEMINI_API_KEY');
      if (!geminiKey) return jsonResp({ error: 'GEMINI_API_KEY not set' }, 500);
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`);
      const json = await res.json();
      const models = (json?.models ?? []) as Array<{ name: string; supportedGenerationMethods?: string[]; description?: string }>;
      return jsonResp({
        total: models.length,
        models: models.map(m => ({
          name: m.name,
          methods: m.supportedGenerationMethods ?? [],
          description: m.description?.slice(0, 100),
        })),
      });
    }

    const breed = String(body.breed ?? '').trim();
    const species = String(body.species ?? 'dog');
    const topic = body.topic ? String(body.topic) : null;
    const language = String(body.language ?? 'pt-BR');
    const adminToken = body.admin_token ? String(body.admin_token) : null;
    const skipImage = !!body.skip_image;

    if (!breed) return jsonResp({ error: 'breed required' }, 400);
    if (!['dog', 'cat'].includes(species)) return jsonResp({ error: 'invalid species' }, 400);

    let isAuthed = false;
    if (KB_SECRET && adminToken && adminToken === KB_SECRET) {
      isAuthed = true;
    } else {
      const authHeader = req.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '');
        const anon = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!);
        const { data: { user } } = await anon.auth.getUser(token);
        if (user) {
          const sbAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          const { data: u } = await sbAdmin.from('users').select('role').eq('id', user.id).maybeSingle();
          if (u?.role === 'admin') isAuthed = true;
        }
      }
    }
    if (!isAuthed) return jsonResp({ error: 'unauthorized' }, 401);

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const lang = LANG_NAMES[language] ?? LANG_NAMES[language.split('-')[0]] ?? 'Brazilian Portuguese';

    // ── 1. Claude gera o artigo ──────────────────────────────────────────
    const systemPrompt = `You are a veterinary editor for auExpert Elite — a premium clinical pet platform.
Generate clinical, evidence-based articles for tutors with high care literacy.
Tone: Elite register (3rd person, no exclamations, sensorial but factual, like Clarice Lispector in "Laços de Família").
Format: impactful title + 3-4 short paragraphs, max 300 words.

CITATION POLICY (STRICT):
You MUST cite a real, verifiable veterinary source. Choose ONE from this curated allowlist:
- WSAVA (World Small Animal Veterinary Association — wsava.org)
- AVMA (American Veterinary Medical Association — avma.org)
- RCVS (Royal College of Veterinary Surgeons — rcvs.org.uk)
- CFMV (Conselho Federal de Medicina Veterinária — cfmv.gov.br)
- PubMed (a real published study — provide the title or PMID)
- MSD Veterinary Manual (msdvetmanual.com)
- Merck Veterinary Manual (merckvetmanual.com)
- Cornell University CUVM (vet.cornell.edu)
- OFA (Orthopedic Foundation for Animals — ofa.org)
- ACVIM (American College of Veterinary Internal Medicine — acvim.org)
- AAHA (American Animal Hospital Association — aaha.org)
- ABVAC (Associação Brasileira de Veterinária do Animal de Companhia)
- ESCCAP (European Scientific Counsel Companion Animal Parasites)

Generate "source_name" with the institution name (one of the above).
Generate "source_url" with a relevant landing/article URL on that organization's website if you know one with high confidence; otherwise null.

If you cannot ground the article on at least one of these sources for THIS specific breed and topic, you MUST decline by setting "title" to "DECLINE" — the system will skip the post.

You MUST also produce an "illustration_prompt": a single English sentence describing a clean editorial illustration for the article cover. Style: minimalist, gentle, clinical-elegant, soft lighting, vector-flat or watercolor look, no text overlay, no logos, breed-accurate. Aspect 16:9.

Return ONLY valid JSON, no markdown.`;

    const userPrompt = `Generate a clinical short article about the breed: ${breed} (${species}).
${topic ? `Specific topic: ${topic}.` : 'Pick the most useful topic for this breed today.'}

Priority topics for ${breed}:
- Known genetic predispositions
- Seasonal/regional alerts (Brazil)
- Breed-specific preventive care
- Recent scientific findings

Return ONLY this JSON shape:
{
  "title": "impactful article title (or 'DECLINE' if no verifiable source)",
  "body": "article body in markdown-free prose (3-4 short paragraphs)",
  "ai_tags": ["clinical_tag1", "clinical_tag2", "..."],
  "urgency": "none|low|medium|high|critical",
  "ai_relevance_score": 0.0,
  "source_name": "WSAVA|AVMA|RCVS|CFMV|PubMed|MSD Veterinary Manual|Merck Veterinary Manual|Cornell CUVM|OFA|ACVIM|AAHA|ABVAC|ESCCAP",
  "source_url": "https://wsava.org/... or null",
  "illustration_prompt": "Editorial illustration of a ${breed} ... in a soft, minimalist, clinical-elegant style. 16:9. No text. ..."
}

Respond text fields in ${lang}. The illustration_prompt MUST stay in English. The source MUST be from the allowlist above. NO 'Multiverso IA' allowed.`;

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
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('[breed-editorial-generate] anthropic err:', response.status, errBody);
      return jsonResp({ error: 'ai_failed', status: response.status }, 502);
    }

    const aiResponse = await response.json();
    const textContent = aiResponse.content?.find((c: { type: string }) => c.type === 'text');
    let raw = (textContent?.text ?? '').trim();
    if (raw.startsWith('```')) raw = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');

    let parsed: EditorialAI;
    try {
      parsed = JSON.parse(raw) as EditorialAI;
    } catch (e) {
      console.error('[breed-editorial-generate] JSON parse failed:', e, raw.slice(0, 500));
      return jsonResp({ error: 'invalid_ai_response' }, 502);
    }

    // DECLINE: Claude não conseguiu ancorar em fonte verificável
    if (parsed.title === 'DECLINE' || !parsed.source_name) {
      console.warn('[breed-editorial-generate] declined (no verifiable source) for breed=', breed);
      return jsonResp({ success: false, declined: true, reason: 'no_verifiable_source' }, 200);
    }

    // Allowlist de fontes (se Claude tentou inventar fonte fora da lista, recusa)
    const ALLOWED_SOURCES = [
      'WSAVA', 'AVMA', 'RCVS', 'CFMV', 'PubMed',
      'MSD Veterinary Manual', 'Merck Veterinary Manual', 'Cornell CUVM',
      'OFA', 'ACVIM', 'AAHA', 'ABVAC', 'ESCCAP',
    ];
    if (!ALLOWED_SOURCES.some(s => parsed.source_name.startsWith(s))) {
      console.warn('[breed-editorial-generate] source not in allowlist:', parsed.source_name);
      return jsonResp({ success: false, declined: true, reason: 'source_not_allowed', source_name: parsed.source_name }, 200);
    }

    // ── 2. Geração de ilustração (Gemini 3.1 Flash Image → Gemini 3 Pro → Pollinations) ──
    // Telemetria — Claude text invocation
    const claudeUsage = aiResponse.usage ?? {};
    recordInvocation(sb, {
      function_name: 'breed-editorial-generate',
      model_used: aiResponse.model ?? model,
      provider: 'anthropic',
      tokens_in: Number(claudeUsage.input_tokens ?? 0),
      tokens_out: Number(claudeUsage.output_tokens ?? 0),
      cache_read_tokens: Number(claudeUsage.cache_read_input_tokens ?? 0),
      cache_write_tokens: Number(claudeUsage.cache_creation_input_tokens ?? 0),
      latency_ms: Date.now() - tStart,
      status: 'success',
      payload: { phase: 'text', breed, species },
    });

    let publicImageUrl: string | null = null;
    let imageError: string | null = null;
    let imageProvider: string | null = null;
    let verificationFailed = false;
    if (!skipImage && parsed.illustration_prompt) {
      const tImg = Date.now();
      const result = await tryImageProvidersWithVerification(
        sb, parsed.illustration_prompt, breed, parsed.title, ANTHROPIC_API_KEY, anthropicVersion,
      );
      publicImageUrl = result.url;
      imageProvider = result.provider;
      imageError = result.errors.length > 0 && !result.url ? result.errors.join(' | ') : null;
      verificationFailed = result.verificationFailed;

      // Telemetria — image gen invocation (registra mesmo se falhou,
      // pra contar tentativa)
      if (result.provider) {
        // result.provider é "gemini:gemini-3.1-flash-image-preview" ou "pollinations:flux".
        // model_used em ai_pricing usa o mesmo formato pra Cloudflare/HF/Pollinations,
        // mas Gemini é só o nome do modelo (sem prefix "gemini:")
        const [provName, ...rest] = result.provider.split(':');
        const modelKey = provName === 'gemini' ? rest.join(':') : result.provider;
        recordInvocation(sb, {
          function_name: 'breed-editorial-generate',
          model_used: modelKey,
          provider: providerToEnum(provName),
          image_count: 1,
          latency_ms: Date.now() - tImg,
          status: 'success',
          payload: { phase: 'image', breed, species, provider: result.provider },
        });
      } else if (imageError) {
        recordInvocation(sb, {
          function_name: 'breed-editorial-generate',
          model_used: 'image-gen-failed',
          provider: 'other',
          latency_ms: Date.now() - tImg,
          status: 'error',
          error_category: 'api_error',
          error_message: imageError.slice(0, 500),
          payload: { phase: 'image', breed, species },
        });
      }
    }

    // ── 3. INSERT em breed_posts ─────────────────────────────────────────
    const now = new Date().toISOString();
    const { data: post, error: insErr } = await sb
      .from('breed_posts')
      .insert({
        post_type: 'editorial',
        source: 'editorial',
        title: parsed.title,
        body: parsed.body,
        ai_caption: parsed.title.slice(0, 280),
        ai_tags: parsed.ai_tags ?? [],
        urgency: parsed.urgency ?? 'none',
        ai_relevance_score: clamp(parsed.ai_relevance_score, 0, 10),
        source_name: parsed.source_name,
        source_url: parsed.source_url ?? null,
        target_breeds: [breed],
        target_species: species,
        moderation_status: 'approved',
        moderated_at: now,
        published_at: now,
        media_type: publicImageUrl ? 'photo' : 'none',
        media_urls: publicImageUrl ? [publicImageUrl] : null,
        thumbnail_url: publicImageUrl,
      })
      .select('id')
      .single();

    if (insErr || !post) {
      console.error('[breed-editorial-generate] insert error:', insErr?.message);
      return jsonResp({ error: 'insert_failed', details: insErr?.message }, 500);
    }

    return jsonResp({
      success: true,
      post_id: post.id,
      title: parsed.title,
      has_image: !!publicImageUrl,
      image_provider: imageProvider,
      image_error: imageError,
      verification_failed: verificationFailed,
      illustration_prompt: parsed.illustration_prompt?.slice(0, 200) ?? null,
    });

  } catch (err) {
    console.error('[breed-editorial-generate] error:', err);
    return jsonResp({ error: 'internal error', message: String(err) }, 500);
  }
});

/**
 * Gera ilustração via Pollinations.ai (Flux) e faz upload no bucket pet-photos.
 * Pollinations é grátis, sem auth, deterministic via seed. URL format:
 *   https://image.pollinations.ai/prompt/<URL_ENCODED_PROMPT>?width=1280&height=720&nologo=true&model=flux&seed=<n>
 *
 * Retorna a URL pública do nosso bucket. Lança em qualquer falha.
 */
/**
 * Gera ilustração via Gemini 3 Image (Nano Banana 2 / Pro) e upa no bucket.
 * Endpoint: POST /v1beta/models/<model>:generateContent
 * Body: contents[0].parts[0].text com responseModalities=['IMAGE']
 * Resposta: candidates[0].content.parts[*].inlineData.data (base64) + mimeType
 */
/**
 * Multi-provider image generation chain.
 * Cada provider só roda se sua env var estiver setada (graceful skip).
 *
 * Ordem (do melhor pro fallback grátis):
 *   1. Gemini 3.1 Flash Image      (paid ~$0.039)         GEMINI_API_KEY
 *   2. Gemini 3 Pro Image          (paid premium)          GEMINI_API_KEY
 *   3. Cloudflare Workers AI Flux  (free tier)             CF_ACCOUNT_ID + CF_API_TOKEN
 *   4. Hugging Face Flux Schnell   (free, rate-limited)    HF_TOKEN
 *   5. Pollinations.ai (Flux)      (free, sem auth)        sempre tenta
 *
 * Retorna { url, provider, errors[] }. Se todos falharem, url=null.
 */
async function tryImageProviders(
  sb: ReturnType<typeof createClient>,
  prompt: string,
): Promise<{ url: string | null; provider: string | null; errors: string[] }> {
  const errors: string[] = [];

  const geminiKey = Deno.env.get('GEMINI_API_KEY') ?? '';
  const cfAccountId = Deno.env.get('CF_ACCOUNT_ID') ?? '';
  const cfApiToken = Deno.env.get('CF_API_TOKEN') ?? '';
  const hfToken = Deno.env.get('HF_TOKEN') ?? '';

  // 1+2: Gemini 3
  if (geminiKey) {
    for (const m of ['gemini-3.1-flash-image-preview', 'gemini-3-pro-image-preview']) {
      try {
        const url = await generateAndUploadFromGemini(sb, m, prompt, geminiKey);
        if (url) return { url, provider: `gemini:${m}`, errors };
      } catch (e) {
        errors.push(`gemini:${m}: ${String(e).slice(0, 180)}`);
      }
    }
  }

  // 3: Cloudflare Workers AI Flux (free tier)
  if (cfAccountId && cfApiToken) {
    try {
      const url = await generateAndUploadFromCloudflare(sb, prompt, cfAccountId, cfApiToken);
      if (url) return { url, provider: 'cloudflare:flux-1-schnell', errors };
    } catch (e) {
      errors.push(`cloudflare: ${String(e).slice(0, 180)}`);
    }
  }

  // 4: Hugging Face Flux Schnell (free, rate-limited)
  if (hfToken) {
    try {
      const url = await generateAndUploadFromHuggingFace(sb, prompt, hfToken);
      if (url) return { url, provider: 'huggingface:flux-schnell', errors };
    } catch (e) {
      errors.push(`huggingface: ${String(e).slice(0, 180)}`);
    }
  }

  // 5: Pollinations (sempre tenta, sem auth)
  try {
    const url = await generateAndUploadFromPollinations(sb, prompt);
    if (url) return { url, provider: 'pollinations:flux', errors };
  } catch (e) {
    errors.push(`pollinations: ${String(e).slice(0, 180)}`);
  }

  return { url: null, provider: null, errors };
}

/**
 * Cloudflare Workers AI — Flux 1 Schnell (free tier).
 * Endpoint: POST /accounts/{id}/ai/run/@cf/black-forest-labs/flux-1-schnell
 * Resposta: { result: { image: "<base64>" }, success: true }
 */
async function generateAndUploadFromCloudflare(
  sb: ReturnType<typeof createClient>,
  prompt: string,
  accountId: string,
  apiToken: string,
): Promise<string | null> {
  const fullPrompt = `${prompt} Editorial illustration, 16:9, soft lighting, minimalist, clinical-elegant, no text or logos.`;
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt: fullPrompt, num_steps: 4 }),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`http ${res.status}: ${errBody.slice(0, 200)}`);
  }
  const json = await res.json();
  const base64 = json?.result?.image as string | undefined;
  if (!base64) throw new Error('no image in cloudflare response');
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  return uploadImageBytes(sb, bytes, 'image/jpeg', 'jpg');
}

/**
 * Hugging Face Inference API — Flux Schnell (free tier, rate-limited).
 * Endpoint: POST /models/black-forest-labs/FLUX.1-schnell
 * Resposta: image bytes diretos (binary).
 */
async function generateAndUploadFromHuggingFace(
  sb: ReturnType<typeof createClient>,
  prompt: string,
  token: string,
): Promise<string | null> {
  const fullPrompt = `${prompt} Editorial illustration, 16:9, soft lighting, minimalist, clinical-elegant, no text or logos.`;
  const res = await fetch('https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inputs: fullPrompt }),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`http ${res.status}: ${errBody.slice(0, 200)}`);
  }
  const buffer = await res.arrayBuffer();
  if (buffer.byteLength < 1000) throw new Error(`tiny image (${buffer.byteLength} bytes)`);
  const bytes = new Uint8Array(buffer);
  const contentType = res.headers.get('Content-Type') ?? 'image/jpeg';
  const ext = contentType.includes('png') ? 'png' : 'jpg';
  return uploadImageBytes(sb, bytes, contentType, ext);
}

/**
 * Helper compartilhado: upload de bytes no bucket pet-photos.
 * Nome do arquivo: breed-editorial/<uuid>.<ext>
 */
async function uploadImageBytes(
  sb: ReturnType<typeof createClient>,
  bytes: Uint8Array,
  contentType: string,
  ext: string,
): Promise<string | null> {
  const filename = `breed-editorial/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await sb.storage.from('pet-photos').upload(filename, bytes, {
    contentType,
    upsert: false,
  });
  if (upErr) throw new Error(`storage: ${upErr.message}`);
  const { data: pub } = sb.storage.from('pet-photos').getPublicUrl(filename);
  return pub.publicUrl ?? null;
}

async function generateAndUploadFromGemini(
  sb: ReturnType<typeof createClient>,
  model: string,
  prompt: string,
  apiKey: string,
): Promise<string | null> {
  const fullPrompt = `${prompt} High-quality editorial illustration, 16:9 aspect ratio, soft lighting, minimalist, clinical-elegant, no text or logos.`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: fullPrompt }] }],
      generationConfig: { responseModalities: ['IMAGE'] },
    }),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`http ${res.status}: ${errBody.slice(0, 200)}`);
  }
  const json = await res.json();
  const candidates = json?.candidates as Array<{
    content: { parts: Array<{ inlineData?: { data: string; mimeType: string } }> }
  }> | undefined;
  const imagePart = candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
  if (!imagePart?.inlineData?.data) throw new Error('no image in response');

  const mimeType = imagePart.inlineData.mimeType ?? 'image/png';
  const ext = mimeType.includes('jpeg') ? 'jpg' : 'png';
  const bytes = Uint8Array.from(atob(imagePart.inlineData.data), c => c.charCodeAt(0));

  const filename = `breed-editorial/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await sb.storage.from('pet-photos').upload(filename, bytes, {
    contentType: mimeType,
    upsert: false,
  });
  if (upErr) throw new Error(`storage: ${upErr.message}`);
  const { data: pub } = sb.storage.from('pet-photos').getPublicUrl(filename);
  return pub.publicUrl ?? null;
}

async function generateAndUploadFromPollinations(
  sb: ReturnType<typeof createClient>,
  prompt: string,
): Promise<string | null> {
  const fullPrompt = `${prompt} Editorial illustration, 16:9 aspect ratio, soft lighting, minimalist, clinical-elegant, no text or logos, no watermarks.`;
  const seed = Math.floor(Math.random() * 1_000_000);
  const url = `${'https://image.pollinations.ai/prompt'}/${encodeURIComponent(fullPrompt)}?width=1280&height=720&nologo=true&model=flux&seed=${seed}`;

  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`pollinations http ${res.status}: ${errBody.slice(0, 200)}`);
  }
  const contentType = res.headers.get('Content-Type') ?? 'image/jpeg';
  const buffer = await res.arrayBuffer();
  if (buffer.byteLength < 1000) {
    throw new Error(`pollinations returned tiny image (${buffer.byteLength} bytes)`);
  }
  const bytes = new Uint8Array(buffer);

  const ext = contentType.includes('png') ? 'png' : 'jpg';
  const filename = `breed-editorial/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await sb.storage.from('pet-photos').upload(filename, bytes, {
    contentType,
    upsert: false,
  });
  if (upErr) throw new Error(`storage upload: ${upErr.message}`);
  const { data: pub } = sb.storage.from('pet-photos').getPublicUrl(filename);
  return pub.publicUrl ?? null;
}

function clamp(n: unknown, min: number, max: number): number {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return Math.min(Math.max(v, min), max);
}

// ─── Telemetria ────────────────────────────────────────────────────────────

interface InvocationRecord {
  function_name: string;
  model_used: string;
  provider: string;
  tokens_in?: number;
  tokens_out?: number;
  cache_read_tokens?: number;
  cache_write_tokens?: number;
  image_count?: number;
  audio_seconds?: number;
  latency_ms: number;
  status: 'success' | 'error' | 'timeout' | 'rate_limited';
  error_category?: string;
  error_message?: string;
  payload?: Record<string, unknown>;
}

/**
 * Insert fire-and-forget em ai_invocations. Nunca bloqueia, nunca lança.
 * O custo é derivado pela RPC get_admin_ai_breakdown via JOIN com ai_pricing.
 */
function recordInvocation(sb: ReturnType<typeof createClient>, rec: InvocationRecord): void {
  sb.from('ai_invocations').insert({
    function_name:      rec.function_name,
    model_used:         rec.model_used,
    provider:           rec.provider,
    tokens_in:          rec.tokens_in ?? null,
    tokens_out:         rec.tokens_out ?? null,
    cache_read_tokens:  rec.cache_read_tokens ?? null,
    cache_write_tokens: rec.cache_write_tokens ?? null,
    image_count:        rec.image_count ?? null,
    audio_seconds:      rec.audio_seconds ?? null,
    latency_ms:         rec.latency_ms,
    status:             rec.status,
    error_category:     rec.error_category ?? null,
    error_message:      rec.error_message ?? null,
    payload:            rec.payload ?? null,
  }).then(
    ({ error }) => { if (error) console.warn('[breed-editorial-generate] ai_invocations insert failed:', error.message); },
    (e: unknown) => console.warn('[breed-editorial-generate] ai_invocations exception:', e),
  );
}

/** Mapeia o nome curto do provider pro enum aceito por ai_invocations.provider */
function providerToEnum(name: string): string {
  switch (name) {
    case 'gemini':       return 'google';
    case 'cloudflare':   return 'cloudflare';
    case 'huggingface':  return 'huggingface';
    case 'pollinations': return 'pollinations';
    default:             return 'other';
  }
}

// ─── Vision verification ───────────────────────────────────────────────────

/**
 * Tenta gerar imagem em providers em cascata, mas DEPOIS de cada sucesso
 * roda verificação Claude Vision pra confirmar que a imagem está on-topic.
 * Se a verificação falha, descarta o upload e tenta o próximo provider.
 *
 * Custo: cada verificação ~$0.005 (Haiku 4.5 + 1 imagem). Vale a pena
 * pra garantir relevância clínica do feed.
 *
 * Limite: max 2 providers tentados pra controlar custo. Se ambos falharem
 * verificação, retorna sem imagem (text-only) com verificationFailed=true.
 */
async function tryImageProvidersWithVerification(
  sb: ReturnType<typeof createClient>,
  prompt: string,
  breed: string,
  title: string,
  anthropicKey: string,
  anthropicVersion: string,
): Promise<{ url: string | null; provider: string | null; errors: string[]; verificationFailed: boolean }> {
  const errors: string[] = [];
  let attempts = 0;
  const MAX_VERIFY_ATTEMPTS = 2;

  const tryAndVerify = async (
    genFn: () => Promise<string | null>,
    providerName: string,
  ): Promise<{ url: string | null; verified: boolean }> => {
    attempts++;
    const url = await genFn();
    if (!url) return { url: null, verified: false };
    if (attempts > MAX_VERIFY_ATTEMPTS) {
      // já gastamos demais — aceita sem verificar
      return { url, verified: true };
    }
    const ok = await verifyImageWithVision(sb, url, breed, title, anthropicKey, anthropicVersion);
    if (ok) return { url, verified: true };
    // Imagem off-topic — deleta do storage e tenta próximo
    await deleteUploadedImage(sb, url).catch(() => {});
    errors.push(`${providerName}: vision verification failed`);
    return { url: null, verified: false };
  };

  const geminiKey = Deno.env.get('GEMINI_API_KEY') ?? '';
  const cfAccountId = Deno.env.get('CF_ACCOUNT_ID') ?? '';
  const cfApiToken = Deno.env.get('CF_API_TOKEN') ?? '';
  const hfToken = Deno.env.get('HF_TOKEN') ?? '';

  if (geminiKey) {
    for (const m of ['gemini-3.1-flash-image-preview', 'gemini-3-pro-image-preview']) {
      try {
        const r = await tryAndVerify(
          () => generateAndUploadFromGemini(sb, m, prompt, geminiKey),
          `gemini:${m}`,
        );
        if (r.url) return { url: r.url, provider: `gemini:${m}`, errors, verificationFailed: false };
      } catch (e) { errors.push(`gemini:${m}: ${String(e).slice(0, 180)}`); }
    }
  }
  if (cfAccountId && cfApiToken) {
    try {
      const r = await tryAndVerify(
        () => generateAndUploadFromCloudflare(sb, prompt, cfAccountId, cfApiToken),
        'cloudflare',
      );
      if (r.url) return { url: r.url, provider: 'cloudflare:flux-1-schnell', errors, verificationFailed: false };
    } catch (e) { errors.push(`cloudflare: ${String(e).slice(0, 180)}`); }
  }
  if (hfToken) {
    try {
      const r = await tryAndVerify(
        () => generateAndUploadFromHuggingFace(sb, prompt, hfToken),
        'huggingface',
      );
      if (r.url) return { url: r.url, provider: 'huggingface:flux-schnell', errors, verificationFailed: false };
    } catch (e) { errors.push(`huggingface: ${String(e).slice(0, 180)}`); }
  }
  try {
    const r = await tryAndVerify(
      () => generateAndUploadFromPollinations(sb, prompt),
      'pollinations',
    );
    if (r.url) return { url: r.url, provider: 'pollinations:flux', errors, verificationFailed: false };
  } catch (e) { errors.push(`pollinations: ${String(e).slice(0, 180)}`); }

  // Se chegou aqui sem url, e attempts > 0, é porque verificação falhou
  return { url: null, provider: null, errors, verificationFailed: attempts > 0 };
}

/**
 * Pergunta pro Claude Haiku Vision se a imagem mostra a raça correta no
 * contexto certo. Custo ~$0.001-0.005 por chamada.
 *
 * Estratégia conservadora: rejeita só se Claude responder explicitamente "no".
 * Se Claude responder algo dúbio ou ambíguo, aceita (false negative > false positive
 * pra evitar bloquear posts válidos por interpretação rígida).
 */
async function verifyImageWithVision(
  sb: ReturnType<typeof createClient>,
  imageUrl: string,
  breed: string,
  title: string,
  apiKey: string,
  anthropicVersion: string,
): Promise<boolean> {
  const tStart = Date.now();
  try {
    // Baixa a imagem e converte pra base64
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return true; // se nem conseguiu baixar, aceita (não bloqueia)
    const buf = await imgRes.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const base64 = btoa(binary);
    const mime = imgRes.headers.get('Content-Type') ?? 'image/jpeg';

    const verifyRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': anthropicVersion,
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 50,
        system: 'You are a visual quality reviewer for a clinical pet platform. Reply ONLY with "yes" or "no".',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mime, data: base64 },
            },
            {
              type: 'text',
              text: `Does this illustration depict a ${breed} in a context relevant to the article titled "${title}"? Reply ONLY "yes" if the image is clearly on-topic and shows a ${breed}-like animal, or "no" if it's clearly wrong (different species/breed entirely, or unrelated scene). Reply with a single word.`,
            },
          ],
        }],
      }),
    });

    if (!verifyRes.ok) {
      console.warn('[breed-editorial-generate] vision verify HTTP error:', verifyRes.status);
      return true; // aceita por dúvida — não bloqueia se Anthropic estiver fora
    }
    const verifyJson = await verifyRes.json();
    const verifyUsage = verifyJson.usage ?? {};
    const text = (verifyJson.content?.[0]?.text ?? '').trim().toLowerCase();

    // Telemetria — verificação
    recordInvocation(sb, {
      function_name: 'breed-editorial-generate',
      model_used: verifyJson.model ?? 'claude-haiku-4-5-20251001',
      provider: 'anthropic',
      tokens_in: Number(verifyUsage.input_tokens ?? 0),
      tokens_out: Number(verifyUsage.output_tokens ?? 0),
      image_count: 1,
      latency_ms: Date.now() - tStart,
      status: 'success',
      payload: { phase: 'verification', breed, verdict: text },
    });

    return !text.startsWith('no');
  } catch (e) {
    console.warn('[breed-editorial-generate] vision verify exception:', e);
    return true; // erro = aceita (não bloqueia)
  }
}

/** Deleta um arquivo do bucket pet-photos a partir da public URL. */
async function deleteUploadedImage(sb: ReturnType<typeof createClient>, publicUrl: string): Promise<void> {
  // Extrai o path depois de "/object/public/pet-photos/"
  const m = publicUrl.match(/\/object\/public\/pet-photos\/(.+)$/);
  if (!m) return;
  await sb.storage.from('pet-photos').remove([m[1]]);
}
