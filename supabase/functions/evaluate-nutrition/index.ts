/**
 * evaluate-nutrition
 *
 * Generates an AI nutrition evaluation for a pet using Claude.
 * Returns { score, summary, pros, cons, recommendation } and persists
 * the result in nutrition_profiles.ai_evaluation with a timestamp.
 *
 * Cache TTL: 7 days. The client checks ai_evaluation_updated_at before calling.
 *
 * Called by: hooks/useNutricao.ts (background, after data load)
 * Auth: Bearer JWT required
 * Body: { pet_id: string, language?: string }
 * Response: { evaluation: NutritionAIEvaluation }
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

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function ageMonthsFromPet(pet: Record<string, unknown>): number {
  if (pet.birth_date) {
    const birth = new Date(pet.birth_date as string);
    const now = new Date();
    return Math.max(
      0,
      (now.getFullYear() - birth.getFullYear()) * 12 +
        (now.getMonth() - birth.getMonth()),
    );
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

// ── Build evaluation prompt ──────────────────────────────────────────────────

function buildPrompt(ctx: {
  petName: string;
  species: string;
  breed: string | null;
  sex: string | null;
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
    racao_natural: `mixed diet: ${ctx.naturalPct}% natural food + ${100 - ctx.naturalPct}% kibble`,
    so_natural: "natural/BARF diet only (no kibble)",
  };

  const foodLine = ctx.currentFood
    ? `${ctx.currentFood.product_name ?? "unknown"} (${ctx.currentFood.category ?? "unspecified"})${
        ctx.currentFood.portion_grams
          ? `, ${ctx.currentFood.portion_grams}g per meal`
          : ""
      }${
        ctx.currentFood.daily_portions
          ? `, ${ctx.currentFood.daily_portions}x/day`
          : ""
      }${
        ctx.currentFood.calories_kcal
          ? `, ${ctx.currentFood.calories_kcal} kcal/day`
          : ""
      }`
    : "not specified";

  return `You are an expert veterinary nutritionist. Evaluate the current nutrition plan for a pet and return a JSON assessment.

PET PROFILE:
- Name: ${ctx.petName}
- Species: ${ctx.species}
- Breed: ${ctx.breed ?? "mixed breed"}
- Sex: ${ctx.sex ?? "unknown"}
- Age: ${ctx.ageMonths} months (life stage: ${ctx.lifeStage})
- Weight: ${ctx.weightKg != null ? ctx.weightKg + " kg" : "unknown"}
- Neutered: ${ctx.neutered ? "yes" : "no"}
- Diet type: ${modDesc[ctx.modalidade] ?? ctx.modalidade}
- Current food: ${foodLine}
- Dietary restrictions/intolerances: ${ctx.restrictions.length > 0 ? ctx.restrictions.join(", ") : "none"}
- Active supplements: ${ctx.supplements.length > 0 ? ctx.supplements.join(", ") : "none"}

Evaluate this nutrition plan holistically. Consider: nutritional adequacy for life stage, portion appropriateness, diet variety, identified risks, and opportunities for improvement.

IMPORTANT RULES:
- Never make a specific medical diagnosis or replace a veterinary consultation.
- If data is insufficient, note it in the summary and give a moderate score.
- Score range: 0–100 (0 = critical, 50 = needs improvement, 80+ = good, 100 = excellent).
- Pros and cons: 1–4 items each, concise (max 10 words per item).
- Recommendation: 1 actionable suggestion (max 20 words).
- Respond ONLY with a valid JSON object — no markdown, no explanation outside JSON.
- Respond in ${lang}.

Return exactly this JSON structure:
{
  "score": <number 0-100>,
  "summary": "<2-sentence overall assessment>",
  "pros": ["<strength 1>", "<strength 2>"],
  "cons": ["<concern 1>", "<concern 2>"],
  "recommendation": "<single most important next step>"
}`;
}

// ── Fallback evaluation when Claude is unavailable ───────────────────────────

function buildFallback(): Record<string, unknown> {
  return {
    score: 50,
    summary: "Não foi possível gerar a avaliação completa no momento. Os dados básicos foram registrados.",
    pros: [],
    cons: [],
    recommendation: "Consulte um veterinário nutricionista para uma avaliação personalizada.",
  };
}

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  const t0 = Date.now();
  const ctx: {
    user_id: string | null;
    pet_id: string | null;
    model_used: string | null;
  } = { user_id: null, pet_id: null, model_used: null };
  const telemetryClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // ── Auth ───────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

    const token = authHeader.replace("Bearer ", "");
    const anonSb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { user } } = await anonSb.auth.getUser(token);
    if (!user) return json({ error: "unauthorized" }, 401);
    const userId = user.id;
    ctx.user_id = userId;

    const { pet_id, language = "pt-BR" } = await req.json();
    if (!pet_id) return json({ error: "pet_id required" }, 400);
    ctx.pet_id = pet_id;

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── Fetch pet ──────────────────────────────────────────────────────────
    const { data: pet, error: petErr } = await sb
      .from("pets")
      .select("id, name, species, breed, birth_date, estimated_age_months, weight_kg, size, sex, neutered")
      .eq("id", pet_id)
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();

    if (petErr || !pet) return json({ error: "pet not found" }, 404);

    // ── Fetch nutrition context ────────────────────────────────────────────
    const [profileRes, currentFoodRes, restrictionsRes, supplementsRes, latestWeightRes] =
      await Promise.all([
        sb.from("nutrition_profiles")
          .select("id, modalidade, natural_pct")
          .eq("pet_id", pet_id)
          .eq("user_id", userId)
          .eq("is_active", true)
          .maybeSingle(),

        sb.from("nutrition_records")
          .select("product_name, brand, category, portion_grams, daily_portions, calories_kcal")
          .eq("pet_id", pet_id)
          .eq("record_type", "food")
          .eq("is_current", true)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1),

        sb.from("nutrition_records")
          .select("product_name, notes")
          .eq("pet_id", pet_id)
          .in("record_type", ["restriction", "intolerance"])
          .eq("is_active", true),

        sb.from("nutrition_records")
          .select("product_name")
          .eq("pet_id", pet_id)
          .eq("record_type", "supplement")
          .eq("is_current", true)
          .eq("is_active", true),

        // Weight fallback if pets.weight_kg is null
        pet.weight_kg == null
          ? sb.from("clinical_metrics")
              .select("value")
              .eq("pet_id", pet_id)
              .eq("metric_type", "weight")
              .eq("is_active", true)
              .order("measured_at", { ascending: false })
              .limit(1)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

    const profile = profileRes.data;
    const currentFood = (currentFoodRes.data ?? [])[0] ?? null;
    const restrictions = (restrictionsRes.data ?? []).map(
      (r) => r.product_name ?? r.notes ?? "unknown",
    );
    const supplements = (supplementsRes.data ?? []).map(
      (s) => s.product_name ?? "unknown",
    );
    const weightKg: number | null =
      pet.weight_kg ?? latestWeightRes.data?.value ?? null;

    const ageMonths = ageMonthsFromPet(pet as Record<string, unknown>);
    const lifeStage = calcLifeStage(pet.species, ageMonths, pet.size);

    // ── Call Claude ────────────────────────────────────────────────────────
    const aiConfig = await getAIConfig(sb);
    let evaluation: Record<string, unknown>;

    if (!ANTHROPIC_API_KEY) {
      console.warn("[evaluate-nutrition] ANTHROPIC_API_KEY not set — using fallback");
      evaluation = buildFallback();
    } else {
      const prompt = buildPrompt({
        petName: pet.name,
        species: pet.species,
        breed: pet.breed,
        sex: pet.sex ?? null,
        ageMonths,
        lifeStage,
        weightKg,
        neutered: pet.neutered ?? false,
        modalidade: profile?.modalidade ?? "so_racao",
        naturalPct: profile?.natural_pct ?? 0,
        currentFood: currentFood as Record<string, unknown> | null,
        restrictions,
        supplements,
        language,
      });

      ctx.model_used = aiConfig.model_insights;
      const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": aiConfig.anthropic_version,
        },
        body: JSON.stringify({
          model: aiConfig.model_insights,
          max_tokens: 600,
          messages: [{ role: "user", content: prompt }],
        }),
        signal: AbortSignal.timeout(aiConfig.timeout_ms),
      });

      if (!claudeRes.ok) {
        const errBody = await claudeRes.text().catch(() => '');
        console.error("[evaluate-nutrition] Claude error:", claudeRes.status);
        const cat = claudeRes.status === 429 ? 'quota_exceeded'
                  : claudeRes.status === 401 || claudeRes.status === 403 ? 'auth_error'
                  : claudeRes.status >= 500 ? 'api_error'
                  : 'validation_error';
        recordAiInvocation(telemetryClient, {
          function_name: 'evaluate-nutrition',
          user_id: ctx.user_id,
          pet_id: ctx.pet_id,
          provider: 'anthropic',
          model_used: ctx.model_used,
          latency_ms: Date.now() - t0,
          status: statusFromCategory(cat),
          error_category: cat,
          error_message: `HTTP ${claudeRes.status} — ${errBody.slice(0, 500)}`,
          user_message: 'Avaliação gerada em modo básico (IA indisponível).',
          payload: { http_status: claudeRes.status, fallback: true },
        }).catch(() => {});
        evaluation = buildFallback();
      } else {
        const claudeData = await claudeRes.json();
        const raw = claudeData?.content?.[0]?.text ?? "";
        let parsedOK = false;
        try {
          // Strip potential markdown fences
          const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          evaluation = JSON.parse(cleaned);
          parsedOK = true;
          // Clamp score
          if (typeof evaluation.score === "number") {
            evaluation.score = Math.max(0, Math.min(100, Math.round(evaluation.score)));
          }
        } catch {
          console.error("[evaluate-nutrition] JSON parse failed:", raw.slice(0, 200));
          evaluation = buildFallback();
        }

        // Telemetria — Claude respondeu (com tokens cobrados, parseado ou não)
        const usage = extractAnthropicUsage(claudeData);
        recordAiInvocation(telemetryClient, {
          function_name: 'evaluate-nutrition',
          user_id: ctx.user_id,
          pet_id: ctx.pet_id,
          provider: 'anthropic',
          model_used: usage.model ?? ctx.model_used,
          tokens_in: usage.tokens_in,
          tokens_out: usage.tokens_out,
          cache_read_tokens: usage.cache_read_tokens,
          cache_write_tokens: usage.cache_write_tokens,
          latency_ms: Date.now() - t0,
          status: parsedOK ? 'success' : 'error',
          error_category: parsedOK ? null : 'invalid_response',
          error_message: parsedOK ? null : 'JSON parse failed',
          payload: { language, fallback_used: !parsedOK },
        }).catch(() => {});
      }
    }

    // ── Persist to nutrition_profiles ──────────────────────────────────────
    const now = new Date().toISOString();

    if (profile?.id) {
      await sb
        .from("nutrition_profiles")
        .update({
          ai_evaluation: evaluation,
          ai_evaluation_updated_at: now,
        })
        .eq("id", profile.id);
    } else {
      // Create a minimal profile if none exists yet
      await sb.from("nutrition_profiles").upsert(
        {
          pet_id,
          user_id: userId,
          modalidade: "so_racao",
          natural_pct: 0,
          ai_evaluation: evaluation,
          ai_evaluation_updated_at: now,
          is_active: true,
        },
        { onConflict: "pet_id", ignoreDuplicates: false },
      );
    }

    return json({ evaluation, generated_at: now });
  } catch (err) {
    console.error("[evaluate-nutrition] error:", err);

    const cat = categorizeError(err);
    recordAiInvocation(telemetryClient, {
      function_name: 'evaluate-nutrition',
      user_id: ctx.user_id,
      pet_id: ctx.pet_id,
      provider: 'anthropic',
      model_used: ctx.model_used,
      latency_ms: Date.now() - t0,
      status: statusFromCategory(cat),
      error_category: cat,
      error_message: String(err).slice(0, 1000),
      user_message: 'Algo nao saiu como esperado. Tente novamente.',
    }).catch(() => {});

    return json({ error: "internal error" }, 500);
  }
});
