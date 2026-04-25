/**
 * generate-cardapio — OPTIMISED (Phase 1)
 *
 * Changes vs previous version:
 * - DB queries in parallel (Promise.all) → saves ~300-400ms
 * - In-memory cache for getAIConfig (5-min TTL) → saves ~50-100ms per call + fixes broken cache
 * - max_tokens 8192 → 4096 (weekly menu fits well within 4k)
 * - Structured outputs via output_config.format → guaranteed JSON schema, no regex parsing
 * - Per-stage timing logs (to measure real gains in production)
 * - schema_version in cache (safe invalidation when format evolves)
 *
 * NOTE: model swap (Haiku 4.5) is done via aiConfig.model_insights in DB — zero deploy.
 * Suggestion: set ai_config.model_insights = "claude-haiku-4-5" for maximum latency gain.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getAIConfig } from "../_shared/ai-config.ts";
import {
  recordAiInvocation,
  categorizeError,
  statusFromCategory,
} from "../_shared/recordAiInvocation.ts";
import { extractAnthropicUsage } from "../_shared/extractAnthropicUsage.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const CACHE_TTL_HOURS = 72; // 3 days
const CARDAPIO_SCHEMA_VERSION = 2; // bump here when changing the cardapio JSON shape
const AI_CONFIG_MEMORY_TTL_MS = 5 * 60 * 1000; // 5 min

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LANG_NAMES: Record<string, string> = {
  "pt-BR": "Brazilian Portuguese", pt: "Brazilian Portuguese",
  en: "English", "en-US": "English",
  es: "Spanish", fr: "French", de: "German",
  it: "Italian", ja: "Japanese", ko: "Korean",
  zh: "Chinese (Simplified)",
};

const WEEKDAYS_PT = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const WEEKDAYS_EN = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// ── In-memory cache for ai_config ────────────────────────────────────────────
// Supabase Edge Functions keep state between invocations while the isolate is warm.
// This cuts the ai_config DB query on consecutive invocations.
type AIConfig = Awaited<ReturnType<typeof getAIConfig>>;
let aiConfigCache: { value: AIConfig; expires: number } | null = null;

async function getCachedAIConfig(sb: ReturnType<typeof createClient>): Promise<AIConfig> {
  const now = Date.now();
  if (aiConfigCache && now < aiConfigCache.expires) return aiConfigCache.value;
  const value = await getAIConfig(sb);
  aiConfigCache = { value, expires: now + AI_CONFIG_MEMORY_TTL_MS };
  return value;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function isExpired(generatedAt: string): boolean {
  return Date.now() - new Date(generatedAt).getTime() > CACHE_TTL_HOURS * 3_600_000;
}

function ageMonthsFromPet(pet: Record<string, unknown>): number {
  if (pet.birth_date) {
    const birth = new Date(pet.birth_date as string);
    const now = new Date();
    return Math.max(0, (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth()));
  }
  return (pet.estimated_age_months as number | null) ?? 24;
}

function calcLifeStage(species: string, ageMonths: number, size: string | null): string {
  if (species === "dog") {
    const puppyEnd = size === "large" ? 18 : size === "medium" ? 15 : 12;
    const seniorStart = size === "large" ? 60 : size === "medium" ? 84 : 96;
    if (ageMonths < puppyEnd) return "puppy";
    if (ageMonths >= seniorStart) return "senior";
    return "adult";
  }
  if (ageMonths < 12) return "kitten";
  if (ageMonths >= 120) return "senior";
  return "adult";
}

function computeModalidadeLabel(modalidade: string, naturalPct: number, isPortuguese: boolean): string {
  if (modalidade === 'racao_natural') {
    const racaoPct = 100 - naturalPct;
    return isPortuguese
      ? `${racaoPct}% Ração + ${naturalPct}% Natural`
      : `${racaoPct}% Kibble + ${naturalPct}% Natural`;
  }
  if (modalidade === 'so_natural') return isPortuguese ? 'Só natural' : 'Natural only';
  return isPortuguese ? 'Só ração' : 'Dry kibble only';
}

function buildFallbackCardapio(
  petName: string,
  modalidade: string,
  naturalPct: number,
  weekdays: string[],
  isPortuguese: boolean,
): unknown {
  return {
    pet_name: petName,
    modalidade_label: computeModalidadeLabel(modalidade, naturalPct, isPortuguese),
    days: weekdays.map((day) => ({
      weekday: day,
      title: `Rotina ${day}`,
      description: "Cardápio gerado pelo sistema. Consulte um veterinário nutricionista para personalização.",
      ingredients: [],
      recipes: [],
    })),
    generated_at: new Date().toISOString(),
    is_fallback: true,
  };
}

// ── JSON Schema for structured outputs ───────────────────────────────────────
// Enforced by the Anthropic API via output_config. Schema is compiled and cached
// server-side for 24h — first call pays ~100-300ms compilation, then instant.

const CARDAPIO_JSON_SCHEMA = {
  type: "object",
  properties: {
    pet_name: { type: "string" },
    modalidade_label: { type: "string" },
    days: {
      type: "array",
      items: {
        type: "object",
        properties: {
          weekday: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          ingredients: { type: "array", items: { type: "string" } },
          recipes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                prep_minutes: { type: "integer" },
                servings: { type: "integer" },
                portion_g: { type: "integer" },
                is_safe: { type: "boolean" },
                ingredients: { type: "array", items: { type: "string" } },
                steps: { type: "array", items: { type: "string" } },
                storage_fridge: { type: "string" },
                storage_freezer: { type: "string" },
                ai_tip: { type: "string" },
              },
              required: [
                "name", "prep_minutes", "servings", "portion_g", "is_safe",
                "ingredients", "steps", "storage_fridge", "storage_freezer", "ai_tip",
              ],
              additionalProperties: false,
            },
          },
        },
        required: ["weekday", "title", "description", "ingredients", "recipes"],
        additionalProperties: false,
      },
    },
  },
  required: ["pet_name", "modalidade_label", "days"],
  additionalProperties: false,
} as const;

// ── Prompt builder ─────────────────────────────────────────────────────────────
// JSON format block removed from prompt — schema is now enforced by the API via
// output_config, not by prompt instructions.

function buildPrompt(ctx: {
  petName: string;
  species: string;
  breed: string | null;
  ageMonths: number;
  lifeStage: string;
  weightKg: number | null;
  neutered: boolean;
  modalidade: string;
  naturalPct: number;
  currentFood: Record<string, unknown> | null;
  restrictions: string[];
  supplements: string[];
  language: string;
}): string {
  const lang = LANG_NAMES[ctx.language] ?? "Brazilian Portuguese";
  const modDesc: Record<string, string> = {
    so_racao: "dry kibble only",
    racao_natural: `mixed: ${ctx.naturalPct}% natural food + ${100 - ctx.naturalPct}% kibble`,
    so_natural: "natural/BARF diet only (no kibble)",
  };

  return `You are a veterinary nutrition specialist. Create a 7-day weekly meal plan for a pet.

PET PROFILE:
- Name: ${ctx.petName}
- Species: ${ctx.species}
- Breed: ${ctx.breed ?? "mixed breed"}
- Age: ${ctx.ageMonths} months (life stage: ${ctx.lifeStage})
- Weight: ${ctx.weightKg ? ctx.weightKg + " kg" : "unknown"}
- Neutered: ${ctx.neutered ? "yes" : "no"}
- Diet type: ${modDesc[ctx.modalidade] ?? ctx.modalidade}
- Current food: ${ctx.currentFood ? `${ctx.currentFood.product_name ?? "unknown"} (${ctx.currentFood.category ?? ""})` : "not specified"}
- Known restrictions/intolerances: ${ctx.restrictions.length > 0 ? ctx.restrictions.join(", ") : "none"}
- Active supplements: ${ctx.supplements.length > 0 ? ctx.supplements.join(", ") : "none"}

INSTRUCTIONS:
- Create a 7-day plan (Monday through Sunday)
- Each day has a title and description
- For natural/BARF days, include specific recipes with ingredients, steps, and storage info
- For kibble-only days, provide portion tips and enrichment ideas (lick mats, puzzle feeders, toppers); recipes array can be empty
- Respect all dietary restrictions
- Include variety across the week
- NEVER include toxic foods (chocolate, grapes, onion, garlic, xylitol, macadamia, etc.)
- Mark recipes as is_safe: true only if safe for the pet's profile
- Respond entirely in ${lang}`;
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  const timings: Record<string, number> = {};
  const t_start = Date.now();

  // Telemetria
  const ctx: {
    user_id: string | null;
    pet_id: string | null;
    model_used: string | null;
  } = { user_id: null, pet_id: null, model_used: null };
  const telemetryClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // ── Auth ────────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

    const token = authHeader.replace("Bearer ", "");
    const anonSb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { user } } = await anonSb.auth.getUser(token);
    if (!user) return json({ error: "unauthorized" }, 401);
    const userId = user.id;
    ctx.user_id = userId;
    timings.auth = Date.now() - t_start;

    const { pet_id, force = false, language = "pt-BR" } = await req.json();
    if (!pet_id) return json({ error: "pet_id required" }, 400);
    ctx.pet_id = pet_id;

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── Check cache ──────────────────────────────────────────────────────────────
    if (!force) {
      const t_cache = Date.now();
      const { data: cached } = await sb
        .from("nutrition_cardapio_cache")
        .select("data, generated_at, modalidade, schema_version")
        .eq("pet_id", pet_id)
        .maybeSingle();
      timings.cache_lookup = Date.now() - t_cache;

      if (
        cached &&
        !isExpired(cached.generated_at) &&
        cached.schema_version === CARDAPIO_SCHEMA_VERSION
      ) {
        console.log("[generate-cardapio] CACHE HIT | timings:", JSON.stringify(timings), "| total:", Date.now() - t_start);
        return json({ cardapio: cached.data, cached: true });
      }
    }

    // ── DB queries in PARALLEL ───────────────────────────────────────────────────
    // Previously 5 sequential awaits (~400-500ms total).
    // Now Promise.all (~100ms, bounded by the slowest query).
    const t_queries = Date.now();
    const [
      petResult,
      profileResult,
      currentFoodsResult,
      restrictionsResult,
      supplementsResult,
    ] = await Promise.all([
      sb.from("pets")
        .select("id, name, species, breed, birth_date, estimated_age_months, weight_kg, size, neutered, user_id")
        .eq("id", pet_id).eq("user_id", userId).eq("is_active", true).single(),
      sb.from("nutrition_profiles")
        .select("modalidade, natural_pct")
        .eq("pet_id", pet_id).eq("is_active", true).maybeSingle(),
      sb.from("nutrition_records")
        .select("product_name, brand, category, portion_grams, calories_kcal")
        .eq("pet_id", pet_id).eq("record_type", "food")
        .eq("is_current", true).eq("is_active", true)
        .order("created_at", { ascending: false }).limit(1),
      sb.from("nutrition_records")
        .select("product_name, notes")
        .eq("pet_id", pet_id).in("record_type", ["restriction", "intolerance"])
        .eq("is_active", true),
      sb.from("nutrition_records")
        .select("product_name")
        .eq("pet_id", pet_id).eq("record_type", "supplement")
        .eq("is_current", true).eq("is_active", true),
    ]);
    timings.queries_parallel = Date.now() - t_queries;

    const pet = petResult.data;
    if (!pet) return json({ error: "pet not found" }, 404);

    const profile = profileResult.data;
    const currentFoods = currentFoodsResult.data;
    const restrictionRows = restrictionsResult.data;
    const supplementRows = supplementsResult.data;

    const ageMonths = ageMonthsFromPet(pet as Record<string, unknown>);
    const lifeStage = calcLifeStage(pet.species, ageMonths, pet.size);
    const modalidade = profile?.modalidade ?? "so_racao";
    const naturalPct = profile?.natural_pct ?? 0;
    const isPortuguese = language.startsWith("pt");
    const weekdays = isPortuguese ? WEEKDAYS_PT : WEEKDAYS_EN;

    // ── Call Claude ──────────────────────────────────────────────────────────────
    let cardapio: unknown;
    let fallbackReason: string | null = null;

    if (!ANTHROPIC_API_KEY) {
      fallbackReason = "NO_ANTHROPIC_API_KEY";
      console.error("[generate-cardapio] FATAL: ANTHROPIC_API_KEY not set");
      cardapio = buildFallbackCardapio(pet.name, modalidade, naturalPct, weekdays, isPortuguese);
    } else {
      try {
        const t_aiconfig = Date.now();
        const aiConfig = await getCachedAIConfig(sb);
        timings.ai_config = Date.now() - t_aiconfig;
        console.log("[generate-cardapio] model:", aiConfig.model_insights);

        const prompt = buildPrompt({
          petName: pet.name,
          species: pet.species,
          breed: pet.breed,
          ageMonths,
          lifeStage,
          weightKg: pet.weight_kg,
          neutered: pet.neutered ?? false,
          modalidade,
          naturalPct,
          currentFood: currentFoods?.[0] ?? null,
          restrictions: (restrictionRows ?? []).map(
            (r) => r.product_name ?? r.notes ?? "unknown",
          ),
          supplements: (supplementRows ?? []).map((s) => s.product_name ?? "supplement"),
          language,
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120_000);

        const t_claude = Date.now();
        ctx.model_used = aiConfig.model_insights;
        let claudeResp: Response;
        try {
          claudeResp = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": ANTHROPIC_API_KEY,
              "anthropic-version": aiConfig.anthropic_version,
            },
            body: JSON.stringify({
              model: aiConfig.model_insights,
              max_tokens: 4096,
              messages: [{ role: "user", content: prompt }],
              // Structured outputs — forces valid JSON matching the schema.
              // Eliminates multi-strategy regex parsing and reduces fallback risk.
              output_config: {
                format: {
                  type: "json_schema",
                  schema: CARDAPIO_JSON_SCHEMA,
                },
              },
            }),
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeoutId);
        }
        timings.claude_api = Date.now() - t_claude;

        if (!claudeResp.ok) {
          const errBody = await claudeResp.text();
          throw new Error(`Claude API ${claudeResp.status}: ${errBody.slice(0, 300)}`);
        }

        const claudeData = await claudeResp.json();

        // With output_config.format, content[0].text is guaranteed to be valid JSON.
        const rawText = claudeData.content?.[0]?.text ?? "";

        // Log token usage for cost/caching tracking
        if (claudeData.usage) {
          console.log(
            "[generate-cardapio] usage:",
            JSON.stringify({
              input: claudeData.usage.input_tokens,
              output: claudeData.usage.output_tokens,
              cache_read: claudeData.usage.cache_read_input_tokens ?? 0,
              cache_write: claudeData.usage.cache_creation_input_tokens ?? 0,
            }),
          );
        }

        try {
          cardapio = JSON.parse(rawText);
        } catch (parseErr) {
          // Legacy fallback in case ai_config points to a model without structured outputs support.
          console.warn("[generate-cardapio] structured output parse failed, trying legacy extraction:", parseErr);
          let jsonText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
          if (!jsonText.startsWith("{")) {
            const match = jsonText.match(/\{[\s\S]*\}/);
            if (match) jsonText = match[0];
          }
          cardapio = JSON.parse(jsonText);
        }

        // Defensive override — model sometimes ignores label when natural_pct=0
        (cardapio as Record<string, unknown>).modalidade_label =
          computeModalidadeLabel(modalidade, naturalPct, isPortuguese);
        (cardapio as Record<string, unknown>).generated_at = new Date().toISOString();

        // ── Telemetria — sucesso ────────────────────────────────────────
        const usage = extractAnthropicUsage(claudeData);
        recordAiInvocation(telemetryClient, {
          function_name: 'generate-cardapio',
          user_id: ctx.user_id,
          pet_id: ctx.pet_id,
          provider: 'anthropic',
          model_used: usage.model ?? ctx.model_used,
          tokens_in: usage.tokens_in,
          tokens_out: usage.tokens_out,
          cache_read_tokens: usage.cache_read_tokens,
          cache_write_tokens: usage.cache_write_tokens,
          latency_ms: Date.now() - t_start,
          status: 'success',
          payload: { modalidade, natural_pct: naturalPct, language },
        }).catch(() => {});
      } catch (aiErr) {
        fallbackReason = String(aiErr);
        console.error("[generate-cardapio] FALLBACK REASON:", fallbackReason);

        // ── Telemetria — IA falhou (caiu no fallback) ────────────────────
        const cat = categorizeError(aiErr);
        recordAiInvocation(telemetryClient, {
          function_name: 'generate-cardapio',
          user_id: ctx.user_id,
          pet_id: ctx.pet_id,
          provider: 'anthropic',
          model_used: ctx.model_used,
          latency_ms: Date.now() - t_start,
          status: statusFromCategory(cat),
          error_category: cat,
          error_message: String(aiErr).slice(0, 1000),
          user_message: 'Cardápio gerado em modo básico (IA indisponível).',
          payload: { fallback: true, modalidade, natural_pct: naturalPct },
        }).catch(() => {});

        cardapio = buildFallbackCardapio(pet.name, modalidade, naturalPct, weekdays, isPortuguese);
      }
    }

    // ── Upsert cache (with schema_version) ──────────────────────────────────────
    const t_write = Date.now();
    const { data: existingCache } = await sb
      .from("nutrition_cardapio_cache")
      .select("id")
      .eq("pet_id", pet_id)
      .maybeSingle();

    if (existingCache) {
      await sb
        .from("nutrition_cardapio_cache")
        .update({
          data: cardapio,
          modalidade,
          schema_version: CARDAPIO_SCHEMA_VERSION,
          generated_at: new Date().toISOString(),
          user_id: userId,
        })
        .eq("pet_id", pet_id);
    } else {
      await sb
        .from("nutrition_cardapio_cache")
        .insert({
          pet_id,
          user_id: userId,
          modalidade,
          schema_version: CARDAPIO_SCHEMA_VERSION,
          data: cardapio,
        });
    }

    if (!fallbackReason) {
      await sb
        .from("nutrition_cardapio_history")
        .insert({
          pet_id,
          user_id: userId,
          modalidade,
          data: cardapio,
          is_fallback: false,
        });
    }
    timings.db_writes = Date.now() - t_write;

    const total = Date.now() - t_start;
    console.log("[generate-cardapio] DONE | timings:", JSON.stringify(timings), "| total:", total, "ms");

    return json({ cardapio, cached: false, fallback_reason: fallbackReason });
  } catch (err) {
    console.error("[generate-cardapio] error:", err, "| timings:", JSON.stringify(timings));

    // Telemetria — erro de runtime
    const cat = categorizeError(err);
    recordAiInvocation(telemetryClient, {
      function_name: 'generate-cardapio',
      user_id: ctx.user_id,
      pet_id: ctx.pet_id,
      provider: 'anthropic',
      model_used: ctx.model_used,
      latency_ms: Date.now() - t_start,
      status: statusFromCategory(cat),
      error_category: cat,
      error_message: String(err).slice(0, 1000),
      user_message: 'Algo nao saiu como esperado. Tente novamente.',
    }).catch(() => {});

    return json({ error: "internal error" }, 500);
  }
});
