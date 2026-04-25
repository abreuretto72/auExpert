/**
 * generate-ai-tips — mantém o ai_tips_pool cheio.
 *
 * Para cada combinação (species, language) suportada, verifica a contagem
 * de tips ativas e, se estiver abaixo do MIN_POOL_SIZE, chama Claude Haiku
 * pedindo N tips novas no tom Elite (Clarice, 3a pessoa, factual, sem
 * onomatopeia). Insere no pool com ON CONFLICT DO NOTHING (a unique
 * constraint em (language, text) descarta duplicatas silenciosamente).
 *
 * Trigger:
 *   - CRON diário (08:00 UTC) via pg_net.http_post
 *   - Manual: supabase functions invoke generate-ai-tips
 *
 * Body (opcional): { force?: boolean, only?: Array<{species, language}> }
 *
 * Response: { generated: [{species, language, inserted, total_after}], total_cost_usd }
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  recordAiInvocation,
  categorizeError,
  statusFromCategory,
} from '../_shared/recordAiInvocation.ts';
import { extractAnthropicUsage } from '../_shared/extractAnthropicUsage.ts';

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_VERSION = "2023-06-01";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Combinações que mantemos. Adicionar es-MX/es-AR/pt-PT quando escalar base.
const COMBINATIONS: Array<{ species: "dog" | "cat" | "both"; language: "pt-BR" | "en-US" }> = [
  { species: "both", language: "pt-BR" },
  { species: "dog",  language: "pt-BR" },
  { species: "cat",  language: "pt-BR" },
  { species: "both", language: "en-US" },
  { species: "dog",  language: "en-US" },
  { species: "cat",  language: "en-US" },
];

const MIN_POOL_SIZE = 200;  // Se abaixo disso, gera mais.
const BATCH_SIZE = 20;      // Quantas tips pedir por chamada.
const CATEGORIES = ["behavior", "breed_trivia", "nutrition", "preventive_care", "welfare", "clinical_curiosity"];

// ── Preço Haiku 4.5 (USD/1M tokens) ──
const PRICE_IN = 0.80;    // $0.80 / 1M input tokens
const PRICE_OUT = 4.00;   // $4.00 / 1M output tokens

function buildPrompt(species: string, language: string, batch: number): { system: string; user: string } {
  const speciesText = species === "both"
    ? "dogs and cats (general tips applicable to either)"
    : species === "dog" ? "dogs" : "cats";
  const langName = language === "pt-BR" ? "Brazilian Portuguese" : "American English";

  const system = `You are a senior veterinary copywriter for auExpert, a high-end pet app targeting "Elite" pet parents.
Your job: generate short, specialist-grade care tips in the Elite editorial register.

EDITORIAL REGISTER — MANDATORY:
- Reference: Clarice Lispector in "Laços de Família" — contemplative, close, sensorial, never melodramatic.
- Third person or impersonal voice. NEVER first person of the pet. NEVER address the tutor with "você/humano/hein".
- NO performative exclamation marks. Exclamation ONLY for genuinely celebratory moments (almost never in tips).
- NO onomatopoeia ("Eba", "Xi", "Opa", "Yay", "Oops", "Hey").
- NO diminutives or cartoon warmth ("fofinho", "pequenino", "little guy").
- NO vocatives to the reader.
- Hedged, professional language: "consistent with", "suggestive of", "warrants veterinary evaluation".
- Short prose — 1 to 2 sentences each tip. 20–300 characters.
- Every tip must carry specialist knowledge a layman would not otherwise know: a clinical framework name (BCS, Bristol, UNESP-Botucatu, Five Domains), a breed predisposition, a physiological mechanism, a specific number/frequency, or a recognized veterinary reference.
- NEVER diagnose. NEVER recommend treatment without "consider veterinary evaluation" framing when relevant.

CATEGORIES (distribute evenly across the batch):
- behavior: body language, communication, training insights
- breed_trivia: genetic predispositions, conformational traits
- nutrition: feeding, hydration, supplementation, toxic foods
- preventive_care: exams, vaccination, parasite control, dental, grooming schedules
- welfare: Five Domains, enrichment, stress, bond
- clinical_curiosity: physiology facts that inform care (e.g. cat purring 25-50Hz promotes bone regeneration; canine mitral disease onset 5-7 years in toy breeds)

OUTPUT FORMAT — STRICT:
Return ONLY a valid JSON array. No markdown, no code fences, no prose around it.
Each element: { "category": "<one of the 6>", "text": "<the tip>" }
Return exactly ${batch} elements.`;

  const user = `Generate ${batch} Elite-register care tips for ${speciesText} in ${langName}.
Distribute categories evenly. Each tip must be factually verifiable and specialist-grade.
Return ONLY the JSON array.`;

  return { system, user };
}

interface TipOut { category: string; text: string; }

async function generateBatch(species: string, language: string): Promise<{
  tips: TipOut[];
  inTok: number;
  outTok: number;
  rawResponse: unknown;
}> {
  const { system, user } = buildPrompt(species, language, BATCH_SIZE);
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY!,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4000,
      system: [{ type: "text", text: system }],
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Anthropic ${resp.status}: ${body.slice(0, 300)}`);
  }

  const data = await resp.json();
  const textContent = data.content?.find((c: { type: string }) => c.type === "text");
  if (!textContent?.text) throw new Error("empty AI response");

  let jsonText = textContent.text.trim();
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  let parsed: unknown;
  try { parsed = JSON.parse(jsonText); }
  catch (err) { throw new Error(`invalid JSON: ${String(err)} | preview=${jsonText.slice(0, 200)}`); }

  if (!Array.isArray(parsed)) throw new Error("AI did not return a JSON array");

  const tips: TipOut[] = [];
  for (const item of parsed) {
    if (typeof item !== "object" || item === null) continue;
    const o = item as Record<string, unknown>;
    const category = typeof o.category === "string" ? o.category : null;
    const text = typeof o.text === "string" ? o.text.trim() : null;
    if (!category || !text) continue;
    if (!CATEGORIES.includes(category)) continue;
    if (text.length < 20 || text.length > 500) continue;
    tips.push({ category, text });
  }

  return {
    tips,
    inTok: data.usage?.input_tokens ?? 0,
    outTok: data.usage?.output_tokens ?? 0,
    rawResponse: data,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY missing" }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  }

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const force = body.force === true;
    const only = Array.isArray(body.only) ? body.only : null;

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    const results: Array<Record<string, unknown>> = [];
    let totalInTok = 0, totalOutTok = 0;

    const targets = only ?? COMBINATIONS;
    for (const { species, language } of targets) {
      // Count ativas
      const { count, error: countErr } = await sb
        .from("ai_tips_pool")
        .select("id", { count: "exact", head: true })
        .eq("species", species)
        .eq("language", language)
        .eq("is_active", true);
      if (countErr) {
        results.push({ species, language, error: countErr.message });
        continue;
      }
      const current = count ?? 0;

      if (!force && current >= MIN_POOL_SIZE) {
        results.push({ species, language, current, skipped: "above MIN_POOL_SIZE" });
        continue;
      }

      // Gera e insere
      let inserted = 0;
      let generationError: string | null = null;
      const tBatchStart = Date.now();
      try {
        const { tips, inTok, outTok, rawResponse } = await generateBatch(species, language);
        totalInTok += inTok;
        totalOutTok += outTok;

        // Telemetria — sucesso da batch
        const usage = extractAnthropicUsage(rawResponse);
        recordAiInvocation(sb, {
          function_name: 'generate-ai-tips',
          user_id: null, pet_id: null, // CRON sistêmico
          provider: 'anthropic',
          model_used: usage.model ?? MODEL,
          tokens_in: usage.tokens_in, tokens_out: usage.tokens_out,
          cache_read_tokens: usage.cache_read_tokens, cache_write_tokens: usage.cache_write_tokens,
          latency_ms: Date.now() - tBatchStart,
          status: 'success',
          payload: { species, language, tips_returned: tips.length },
        }).catch(() => {});

        if (tips.length === 0) {
          generationError = "zero valid tips returned";
        } else {
          const rows = tips.map((t) => ({
            species,
            language,
            category: t.category,
            text: t.text,
            source: "anthropic",
          }));
          // Inserção em batch; unique constraint (language,text) descarta duplicatas
          const { data: ins, error: insErr } = await sb
            .from("ai_tips_pool")
            .insert(rows)
            .select("id");
          if (insErr) {
            // Se a inserção falhar por duplicata, o erro vem agregado; tentamos uma a uma
            if (insErr.code === "23505" || insErr.message?.includes("duplicate")) {
              for (const row of rows) {
                const { error: singleErr } = await sb.from("ai_tips_pool").insert(row);
                if (!singleErr) inserted++;
              }
            } else {
              generationError = insErr.message;
            }
          } else {
            inserted = ins?.length ?? 0;
          }
        }
      } catch (genErr) {
        generationError = String(genErr);

        // Telemetria — falha da batch (Anthropic ou parse)
        const cat = categorizeError(genErr);
        recordAiInvocation(sb, {
          function_name: 'generate-ai-tips',
          user_id: null, pet_id: null,
          provider: 'anthropic',
          model_used: MODEL, latency_ms: Date.now() - tBatchStart,
          status: statusFromCategory(cat), error_category: cat,
          error_message: generationError.slice(0, 1000),
          payload: { species, language },
        }).catch(() => {});
      }

      results.push({
        species, language,
        before: current,
        inserted,
        after: current + inserted,
        error: generationError,
      });
    }

    const costUSD = (totalInTok * PRICE_IN + totalOutTok * PRICE_OUT) / 1_000_000;

    return new Response(JSON.stringify({
      ok: true,
      results,
      tokens: { input: totalInTok, output: totalOutTok },
      estimated_cost_usd: +costUSD.toFixed(4),
    }, null, 2), { status: 200, headers: { ...CORS, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("[generate-ai-tips] error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});
