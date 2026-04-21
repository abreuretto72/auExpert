/**
 * generate-prontuario
 *
 * Generates a structured pet medical record (prontuário) using Claude.
 * Reads diary_entries, vaccines, medications, exams, allergies, and
 * consultations for the given pet, then produces a Prontuario JSON object
 * that is stored in the prontuario_cache table.
 *
 * Called by: hooks/useProntuario.ts → supabase.functions.invoke(...)
 * Auth: Bearer JWT required
 * Body: { pet_id: string, language?: string }
 * Response: { prontuario: Prontuario, cached: boolean }
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getAIConfig } from "../_shared/ai-config.ts";
import { validateAuth } from "../_shared/validate-auth.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CACHE_TTL_HOURS = 24;

const LANG_NAMES: Record<string, string> = {
  "pt-BR": "Brazilian Portuguese",
  pt: "Brazilian Portuguese",
  en: "English",
  "en-US": "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese (Simplified)",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function isExpired(generatedAt: string): boolean {
  const generated = new Date(generatedAt).getTime();
  const now = Date.now();
  return now - generated > CACHE_TTL_HOURS * 60 * 60 * 1000;
}

// ── Fase 3d — breed_predispositions DB lookup ────────────────────────────────
// Seed (Fase 3c) usa nome formal PT-BR. Mapa de aliases cobre variações em
// inglês + apelidos comuns para que a lookup encontre mesmo quando o cadastro
// do pet foi feito em outro idioma.
const BREED_ALIASES: Record<string, string> = {
  // Dogs
  "french bulldog": "Buldogue Francês",
  "bulldog frances": "Buldogue Francês",
  "buldogue frances": "Buldogue Francês",
  "english bulldog": "Bulldog Inglês",
  "bulldog ingles": "Bulldog Inglês",
  "bulldog": "Bulldog Inglês",
  "german shepherd": "Pastor Alemão",
  "pastor alemao": "Pastor Alemão",
  "siberian husky": "Husky Siberiano",
  "husky": "Husky Siberiano",
  "maltese": "Maltês",
  "maltes": "Maltês",
  "miniature pinscher": "Pinscher Miniatura",
  "min pin": "Pinscher Miniatura",
  "yorkie": "Yorkshire Terrier",
  "shih-tzu": "Shih Tzu",
  "cocker": "Cocker Spaniel",
  "cavalier": "Cavalier King Charles Spaniel",
  "king charles spaniel": "Cavalier King Charles Spaniel",
  "cavalier king charles": "Cavalier King Charles Spaniel",
  // Cats
  "persian": "Persa",
  "persa": "Persa",
  "siamese": "Siamês",
  "siames": "Siamês",
  "norwegian forest cat": "Norueguês da Floresta",
  "norwegian forest": "Norueguês da Floresta",
  "noruegues da floresta": "Norueguês da Floresta",
  "abyssinian": "Abissínio",
  "abissinio": "Abissínio",
  "british": "British Shorthair",
  "scottish": "Scottish Fold",
};

type SupabaseDbClient = ReturnType<typeof createClient>;

type DbPredisposition = {
  condition: string;
  rationale: string;
  severity: string;
};

async function fetchBreedPredispositionsFromDB(
  sb: SupabaseDbClient,
  species: string,
  breed: string,
  language: string,
): Promise<DbPredisposition[] | null> {
  const usePT = typeof language === "string" && language.toLowerCase().startsWith("pt");
  const normalize = (r: Record<string, unknown>): DbPredisposition => ({
    condition: String(usePT ? r.condition_pt : r.condition_en ?? r.condition_pt ?? "").trim(),
    rationale: String(usePT ? r.rationale_pt : r.rationale_en ?? r.rationale_pt ?? "").trim(),
    severity: String(r.severity ?? "monitor"),
  });

  // Try ilike (case-insensitive exact match) first.
  const { data: directData, error: directErr } = await sb
    .from("breed_predispositions")
    .select("condition_pt, condition_en, rationale_pt, rationale_en, severity")
    .eq("species", species)
    .ilike("breed", breed)
    .limit(5);

  if (directErr) {
    console.error("[generate-prontuario] breed_predispositions direct query error:", directErr.message);
  }

  if (directData && directData.length > 0) {
    return directData
      .map((r) => normalize(r as Record<string, unknown>))
      .filter((x) => x.condition.length > 0);
  }

  // Try alias map (English/variants → canonical PT-BR).
  const alias = BREED_ALIASES[breed.toLowerCase().trim()];
  if (alias) {
    const { data: aliasData, error: aliasErr } = await sb
      .from("breed_predispositions")
      .select("condition_pt, condition_en, rationale_pt, rationale_en, severity")
      .eq("species", species)
      .eq("breed", alias)
      .limit(5);

    if (aliasErr) {
      console.error("[generate-prontuario] breed_predispositions alias query error:", aliasErr.message);
    }

    if (aliasData && aliasData.length > 0) {
      return aliasData
        .map((r) => normalize(r as Record<string, unknown>))
        .filter((x) => x.condition.length > 0);
    }
  }

  return null;
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const authResult = await validateAuth(req, CORS_HEADERS);
    if (authResult instanceof Response) return authResult;
    const { userId } = authResult;

    if (!ANTHROPIC_API_KEY) {
      console.error("[generate-prontuario] ANTHROPIC_API_KEY not configured");
      return json({ error: "ANTHROPIC_API_KEY not configured" }, 500);
    }

    const body = await req.json();
    const { pet_id, language = "pt-BR", force_refresh = false } = body as {
      pet_id: string;
      language?: string;
      force_refresh?: boolean;
    };

    if (!pet_id) return json({ error: "pet_id is required" }, 400);

    console.log(
      "[generate-prontuario] START | pet_id:",
      pet_id.slice(-8),
      "user:",
      userId.slice(-8),
      "lang:",
      language,
      "force:",
      force_refresh,
    );

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── Check cache ──────────────────────────────────────────────────────────
    console.log("[generate-prontuario] checking cache...");
    if (!force_refresh) {
      const { data: cached } = await sb
        .from("prontuario_cache")
        .select("data, generated_at, emergency_token, is_stale")
        .eq("pet_id", pet_id)
        .eq("is_active", true)
        .maybeSingle();

      if (
        cached &&
        !cached.is_stale &&
        !isExpired(cached.generated_at)
      ) {
        console.log("[generate-prontuario] cache hit — returning cached data");
        return json({
          prontuario: { ...cached.data, emergency_token: cached.emergency_token },
          cached: true,
        });
      }
    }

    // ── Fetch pet data ───────────────────────────────────────────────────────
    // Fase 1: +surgeries (tabela existia em 011_health_tables.sql mas estava ignorada).
    const [petRes, vaccinesRes, medsRes, examsRes, allergiesRes, consRes, surgRes, diaryRes] =
      await Promise.all([
        sb.from("pets").select("*").eq("id", pet_id).single(),
        sb
          .from("vaccines")
          .select("*")
          .eq("pet_id", pet_id)
          .eq("is_active", true)
          .order("next_due_date", { ascending: true }),
        sb
          .from("medications")
          .select("*")
          .eq("pet_id", pet_id)
          .eq("is_active", true)
          .order("start_date", { ascending: false }),
        sb
          .from("exams")
          .select("*")
          .eq("pet_id", pet_id)
          .eq("is_active", true)
          .order("date", { ascending: false })
          .limit(10),
        sb
          .from("allergies")
          .select("*")
          .eq("pet_id", pet_id)
          .eq("is_active", true),
        sb
          .from("consultations")
          .select("*")
          .eq("pet_id", pet_id)
          .eq("is_active", true)
          .order("date", { ascending: false })
          .limit(5),
        sb
          .from("surgeries")
          .select("*")
          .eq("pet_id", pet_id)
          .eq("is_active", true)
          .order("date", { ascending: false })
          .limit(10),
        sb
          .from("diary_entries")
          .select(
            "id, content, entry_date, classifications, mood_id, is_special",
          )
          .eq("pet_id", pet_id)
          .eq("is_active", true)
          .order("entry_date", { ascending: false })
          .limit(30),
      ]);

    console.log("[generate-prontuario] DB queries done | petErr:", petRes.error?.message ?? "none", "| vaccinesErr:", vaccinesRes.error?.message ?? "none", "| medsErr:", medsRes.error?.message ?? "none", "| examsErr:", examsRes.error?.message ?? "none", "| allergiesErr:", allergiesRes.error?.message ?? "none", "| consErr:", consRes.error?.message ?? "none", "| surgErr:", surgRes.error?.message ?? "none", "| diaryErr:", diaryRes.error?.message ?? "none");

    if (petRes.error || !petRes.data) {
      console.error("[generate-prontuario] pet not found:", petRes.error?.message);
      return json({ error: "Pet not found: " + (petRes.error?.message ?? "no data") }, 404);
    }

    const pet = petRes.data;
    const vaccines = vaccinesRes.data ?? [];
    const medications = medsRes.data ?? [];
    const exams = examsRes.data ?? [];
    const allergies = allergiesRes.data ?? [];
    const consultations = consRes.data ?? [];
    const surgeries = surgRes.data ?? [];
    const diaryEntries = diaryRes.data ?? [];

    // Fase 1: conta exames com status anormal para surface no cartão de emergência
    const examAbnormalCount = exams.filter((e) =>
      ["attention", "abnormal", "critical"].includes(e.status),
    ).length;

    console.log("[generate-prontuario] data counts | vaccines:", vaccines.length, "meds:", medications.length, "exams:", exams.length, "allergies:", allergies.length, "consultations:", consultations.length, "surgeries:", surgeries.length, "diary:", diaryEntries.length, "examAbnormal:", examAbnormalCount);

    // ── Fase 3d — DB lookup de breed_predispositions (antes de chamar a IA) ──
    // Se a raça é conhecida e existe no seed (ou foi cacheada via source='ai'),
    // evita gastar tokens pedindo à IA algo que já temos curado.
    const dbPredispositions: DbPredisposition[] | null =
      pet.breed && pet.breed !== "unknown"
        ? await fetchBreedPredispositionsFromDB(sb, pet.species, pet.breed, language)
        : null;

    if (dbPredispositions) {
      console.log(
        "[generate-prontuario] breed_predispositions DB hit | breed:",
        pet.breed,
        "| rows:",
        dbPredispositions.length,
      );
    } else if (pet.breed && pet.breed !== "unknown") {
      console.log(
        "[generate-prontuario] breed_predispositions DB miss | breed:",
        pet.breed,
        "— will fall back to AI and persist result",
      );
    }

    // ── Fetch tutor name ─────────────────────────────────────────────────────
    const { data: tutorUser } = await sb
      .from("users")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();

    // ── Resolve existing emergency token ────────────────────────────────────
    const { data: existing } = await sb
      .from("prontuario_cache")
      .select("emergency_token")
      .eq("pet_id", pet_id)
      .eq("is_active", true)
      .maybeSingle();

    // ── Build context for Claude ─────────────────────────────────────────────
    const langName = LANG_NAMES[language] ?? "Brazilian Portuguese";
    const now = new Date().toISOString().split("T")[0];

    const vaccineLines = vaccines
      .map((v) => {
        const status = v.next_due_date
          ? new Date(v.next_due_date) < new Date()
            ? "OVERDUE"
            : "current"
          : "no_next_date";
        return `- ${v.name} | batch: ${v.batch_number ?? "N/A"} | last: ${v.date_administered ?? "N/A"} | next: ${v.next_due_date ?? "N/A"} | status: ${status}`;
      })
      .join("\n");

    const medLines = medications
      .map(
        (m) =>
          `- ${m.name} | dosage: ${m.dosage ?? "N/A"} | frequency: ${m.frequency ?? "N/A"} | start: ${m.start_date ?? "N/A"} | end: ${m.end_date ?? "ongoing"}`,
      )
      .join("\n");

    const allergyLines = allergies
      .map(
        (a) =>
          `- ${a.allergen} | reaction: ${a.reaction ?? "N/A"} | severity: ${a.severity ?? "N/A"}`,
      )
      .join("\n");

    const examLines = exams
      .map(
        (e) =>
          `- ${e.name} | date: ${e.date ?? "N/A"} | result: ${e.result ?? "N/A"} | lab: ${e.laboratory ?? "N/A"}`,
      )
      .join("\n");

    const consLines = consultations
      .map(
        (c) =>
          `- ${c.date ?? "N/A"} | vet: ${c.veterinarian ?? "N/A"} | clinic: ${c.clinic ?? "N/A"} | diagnosis: ${c.diagnosis ?? "N/A"} | notes: ${c.notes ?? "N/A"}`,
      )
      .join("\n");

    // Fase 2 — surgeries context for AI (predispositions, body systems review, emergency card)
    const surgeryLines = surgeries
      .map(
        (s) =>
          `- ${s.name ?? "N/A"} | date: ${s.date ?? "N/A"} | vet: ${s.veterinarian ?? "N/A"} | anesthesia: ${s.anesthesia ?? "N/A"} | status: ${s.status ?? "N/A"} | notes: ${s.notes ?? "N/A"}`,
      )
      .join("\n");

    const diaryLines = diaryEntries
      .slice(0, 15)
      .map((e) => `- [${e.entry_date}] ${e.content?.slice(0, 200) ?? ""}`)
      .join("\n");

    // Count moods from diary
    const moodCounts: Record<string, number> = {};
    diaryEntries.forEach((e) => {
      if (e.mood_id) moodCounts[e.mood_id] = (moodCounts[e.mood_id] ?? 0) + 1;
    });
    const dominantMood =
      Object.entries(moodCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;

    // Calculate pet age label
    const ageMonths = pet.estimated_age_months ?? 0;
    const ageLabel =
      ageMonths >= 12
        ? `${Math.floor(ageMonths / 12)} year${Math.floor(ageMonths / 12) !== 1 ? "s" : ""}`
        : `${ageMonths} month${ageMonths !== 1 ? "s" : ""}`;

    const PROMPT = `You are a veterinary assistant AI generating a structured medical record (prontuário) for a pet.

PET INFORMATION:
- Name: ${pet.name}
- Species: ${pet.species}
- Breed: ${pet.breed ?? "unknown"}
- Age: ${ageLabel}
- Weight: ${pet.weight_kg ? `${pet.weight_kg} kg` : "unknown"}
- Neutered/Spayed: ${pet.is_neutered ? "yes" : pet.is_neutered === false ? "no" : "unknown"}
- Microchip: ${pet.microchip ?? "not registered"}
- Tutor: ${tutorUser?.full_name ?? "unknown"}
- Today: ${now}

VACCINES:
${vaccineLines || "None recorded"}

ACTIVE MEDICATIONS:
${medLines || "None"}

ALLERGIES:
${allergyLines || "None recorded"}

RECENT EXAMS (last 10):
${examLines || "None"}

RECENT CONSULTATIONS (last 5):
${consLines || "None"}

SURGERIES (last 10):
${surgeryLines || "None"}

RECENT DIARY ENTRIES (last 15):
${diaryLines || "None"}

DOMINANT MOOD (from ${diaryEntries.length} diary entries): ${dominantMood ?? "insufficient data"}

BLOOD TYPE ON RECORD: ${pet.blood_type ?? "unknown"}

---
Generate a JSON object with EXACTLY this structure (no extra fields, no markdown, just raw JSON):
{
  "ai_summary": "<2-3 sentence summary of pet's current health status in simple language for the tutor>",
  "ai_summary_vet": "<2-3 sentence clinical summary appropriate for a veterinarian, using clinical terminology>",
  "alerts": [
    {
      "type": "critical|warning|info",
      "message": "<alert message>",
      "action": "<recommended action>"
    }
  ],
  "vaccines_status": "current|partial|overdue|none",
  "chronic_conditions": ["<condition1>", "<condition2>"],
  "usual_vet": "<name of most frequently mentioned veterinarian or null>",
  "weight_trend": "stable|gaining|losing|unknown",
  "last_exam_date": "<ISO date of most recent exam or null>",
  "last_consultation_date": "<ISO date of most recent consultation or null>",
  "breed_predispositions": [
    {
      "condition": "<condition name>",
      "rationale": "<one sentence why this breed is predisposed>",
      "severity": "monitor|watch|manage"
    }
  ],
  "drug_interactions": [
    {
      "drugs": ["<drug1>", "<drug2>"],
      "warning": "<one or two sentence clinical warning>",
      "severity": "mild|moderate|severe"
    }
  ],
  "preventive_calendar": [
    {
      "type": "vaccine|deworming|flea_tick|dental|annual_check",
      "label": "<event name>",
      "due_date": "<YYYY-MM-DD or null>",
      "status": "overdue|upcoming|scheduled|done"
    }
  ],
  "body_systems_review": [
    {
      "system": "cardiovascular|respiratory|gastrointestinal|urinary|neurological|musculoskeletal|dermatologic|ophthalmologic|otologic|dental",
      "status": "normal|attention|abnormal|unknown",
      "notes": "<one sentence observation or null>"
    }
  ],
  "exam_abnormal_flags": [
    {
      "exam_name": "<exam name>",
      "parameter": "<parameter name>",
      "value": "<value as string>",
      "reference": "<reference range or null>",
      "flag": "low|high|abnormal"
    }
  ],
  "emergency_card": {
    "critical_allergies": ["<allergen>"],
    "active_meds_with_dose": [
      { "name": "<med>", "dose": "<dose or null>" }
    ],
    "chronic_conditions_flagged": ["<condition>"],
    "blood_type": "<blood type or null>",
    "contact": {
      "tutor_name": "<tutor name or null>",
      "phone": null,
      "vet_name": "<usual vet name or null>",
      "vet_phone": null
    }
  }
}

Rules:
- alerts: max 3 items; only include if actionable and relevant.
- vaccines_status: "current" if all up-to-date, "partial" if some overdue, "overdue" if all/most overdue, "none" if no vaccines.
- chronic_conditions: conditions mentioned repeatedly across diary/consultations; empty array if none.
- breed_predispositions: ${dbPredispositions && dbPredispositions.length > 0
  ? 'Return []. The app already has curated breed-specific data from its own database — do NOT duplicate.'
  : `MAX 5 items. Include ONLY if the breed is known (not "unknown"); otherwise return []. Use evidence-based breed-specific conditions for ${pet.species}. "severity": "monitor" = low-risk statistical predisposition, "watch" = early signs worth looking for, "manage" = requires lifestyle or screening changes.`}
- drug_interactions: Include ONLY if there are 2 or more ACTIVE medications; otherwise return []. Identify clinically relevant interactions. "severity": "mild" = additive mild effects, "moderate" = dose adjustment advised, "severe" = contraindicated.
- preventive_calendar: MAX 8 items. Include core preventive care relevant to species, age and breed. "status": "overdue" if past due_date, "upcoming" if due within 30 days, "scheduled" if further future, "done" if already completed.
- body_systems_review: Review each system based on diary + consultation + exam + surgery context. Use "unknown" when there is no data. "notes" should be concise clinical observations or null. Include ALL 10 systems when possible.
- exam_abnormal_flags: Extract specific parameters from exam results that are outside normal range. "flag": "low", "high", or "abnormal". Return [] if no abnormalities found.
- emergency_card: Critical info for first responders. "critical_allergies": allergens with severe/moderate severity only. "active_meds_with_dose": current active meds with dose if known. "chronic_conditions_flagged": serious ongoing conditions. "blood_type": use the BLOOD TYPE ON RECORD value or null. "contact.tutor_name": use "${tutorUser?.full_name ?? "null"}". "contact.vet_name": usual_vet if identified or null. "contact.phone" and "contact.vet_phone": always null (filled by the app, not you).
- Respond in ${langName}. All string values in the JSON must be in ${langName}.
- Return ONLY raw JSON, no explanation, no code fences.`;

    // ── Call Claude ──────────────────────────────────────────────────────────
    const aiConfig = await getAIConfig(sb);
    console.log("[generate-prontuario] calling Claude | model:", aiConfig.model_insights, "| anthropic_version:", aiConfig.anthropic_version);

    const claudeResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY!,
        "anthropic-version": aiConfig.anthropic_version,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: aiConfig.model_insights,
        max_tokens: 2048,
        messages: [{ role: "user", content: PROMPT }],
      }),
    });

    console.log("[generate-prontuario] Claude HTTP status:", claudeResp.status);
    if (!claudeResp.ok) {
      const errText = await claudeResp.text();
      console.error("[generate-prontuario] Claude error status:", claudeResp.status, "body:", errText.slice(0, 500));
      return json({ error: "AI generation failed: HTTP " + claudeResp.status + " — " + errText.slice(0, 200) }, 502);
    }

    const claudeData = await claudeResp.json();
    const rawText = claudeData.content?.[0]?.text?.trim() ?? "{}";
    console.log("[generate-prontuario] Claude response tokens:", claudeData.usage?.output_tokens, "| raw preview:", rawText.slice(0, 100));

    // Strip markdown code fences (```json ... ```) before parsing — Claude sometimes wraps JSON in them.
    let jsonText = rawText;
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    }

    let aiData: Record<string, unknown> = {};
    try {
      aiData = JSON.parse(jsonText);
      console.log("[generate-prontuario] JSON parsed OK | keys:", Object.keys(aiData).join(", "));
    } catch {
      // Try to extract the largest valid JSON object substring (first '{' to last '}').
      const firstBrace = jsonText.indexOf("{");
      const lastBrace = jsonText.lastIndexOf("}");
      if (firstBrace >= 0 && lastBrace > firstBrace) {
        const candidate = jsonText.slice(firstBrace, lastBrace + 1);
        try {
          aiData = JSON.parse(candidate);
          console.log("[generate-prontuario] JSON parsed OK (substring fallback) | keys:", Object.keys(aiData).join(", "));
        } catch {
          console.error("[generate-prontuario] JSON parse failed (substring too):", candidate.slice(0, 300));
        }
      } else {
        console.error("[generate-prontuario] JSON parse failed, no braces found:", jsonText.slice(0, 300));
      }
      // If still empty after both attempts, use a clean structured default (never raw text).
      if (Object.keys(aiData).length === 0) {
        aiData = {
          ai_summary: null,
          ai_summary_vet: null,
          alerts: [],
          vaccines_status: "none",
          chronic_conditions: [],
        };
      }
    }

    // Normalize vaccines_status to allowed enum (current|partial|overdue|none).
    const allowedVaccineStatus = ["current", "partial", "overdue", "none"];
    if (!allowedVaccineStatus.includes(aiData.vaccines_status as string)) {
      console.log("[generate-prontuario] normalizing unknown vaccines_status:", aiData.vaccines_status, "-> none");
      aiData.vaccines_status = "none";
    }

    // ── Fase 2 — sanitize AI-derived vet-grade fields ────────────────────────
    const VALID_BREED_SEVERITY = ["monitor", "watch", "manage"];
    const VALID_DRUG_SEVERITY = ["mild", "moderate", "severe"];
    const VALID_CAL_TYPES = ["vaccine", "deworming", "flea_tick", "dental", "annual_check"];
    const VALID_CAL_STATUS = ["overdue", "upcoming", "scheduled", "done"];
    const VALID_BODY_SYSTEMS = [
      "cardiovascular", "respiratory", "gastrointestinal", "urinary",
      "neurological", "musculoskeletal", "dermatologic", "ophthalmologic",
      "otologic", "dental",
    ];
    const VALID_BODY_STATUS = ["normal", "attention", "abnormal", "unknown"];
    const VALID_EXAM_FLAG = ["low", "high", "abnormal"];

    const asStr = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
    const asNullableStr = (v: unknown): string | null => {
      const s = asStr(v);
      return s.length > 0 ? s : null;
    };

    function sanitizeBreedPred(items: unknown): unknown[] {
      if (!Array.isArray(items)) return [];
      return items
        .filter((it) => it && typeof it === "object")
        .map((it) => {
          const obj = it as Record<string, unknown>;
          const condition = asStr(obj.condition);
          const rationale = asStr(obj.rationale);
          const severity = VALID_BREED_SEVERITY.includes(obj.severity as string)
            ? (obj.severity as string)
            : "monitor";
          return { condition, rationale, severity };
        })
        .filter((it) => it.condition.length > 0)
        .slice(0, 5);
    }

    function sanitizeDrugInteractions(items: unknown): unknown[] {
      if (!Array.isArray(items)) return [];
      return items
        .filter((it) => it && typeof it === "object")
        .map((it) => {
          const obj = it as Record<string, unknown>;
          const drugs = Array.isArray(obj.drugs)
            ? (obj.drugs as unknown[]).map(asStr).filter((s) => s.length > 0)
            : [];
          const warning = asStr(obj.warning);
          const severity = VALID_DRUG_SEVERITY.includes(obj.severity as string)
            ? (obj.severity as string)
            : "mild";
          return { drugs, warning, severity };
        })
        .filter((it) => it.drugs.length >= 2 && it.warning.length > 0);
    }

    function sanitizeCalendar(items: unknown): unknown[] {
      if (!Array.isArray(items)) return [];
      return items
        .filter((it) => it && typeof it === "object")
        .map((it) => {
          const obj = it as Record<string, unknown>;
          const type = VALID_CAL_TYPES.includes(obj.type as string)
            ? (obj.type as string)
            : null;
          if (!type) return null;
          const label = asStr(obj.label);
          const due_date = asNullableStr(obj.due_date);
          const status = VALID_CAL_STATUS.includes(obj.status as string)
            ? (obj.status as string)
            : "upcoming";
          return { type, label, due_date, status };
        })
        .filter((it): it is NonNullable<typeof it> => it !== null && it.label.length > 0)
        .slice(0, 8);
    }

    function sanitizeBodyReview(items: unknown): unknown[] {
      if (!Array.isArray(items)) return [];
      const seen = new Set<string>();
      return items
        .filter((it) => it && typeof it === "object")
        .map((it) => {
          const obj = it as Record<string, unknown>;
          const system = VALID_BODY_SYSTEMS.includes(obj.system as string)
            ? (obj.system as string)
            : null;
          if (!system) return null;
          const status = VALID_BODY_STATUS.includes(obj.status as string)
            ? (obj.status as string)
            : "unknown";
          const notes = asNullableStr(obj.notes);
          return { system, status, notes };
        })
        .filter((it): it is NonNullable<typeof it> => {
          if (it === null) return false;
          if (seen.has(it.system)) return false;
          seen.add(it.system);
          return true;
        })
        .slice(0, 10);
    }

    function sanitizeExamFlags(items: unknown): unknown[] {
      if (!Array.isArray(items)) return [];
      return items
        .filter((it) => it && typeof it === "object")
        .map((it) => {
          const obj = it as Record<string, unknown>;
          const exam_name = asStr(obj.exam_name);
          const parameter = asStr(obj.parameter);
          const value = asStr(obj.value);
          const reference = asNullableStr(obj.reference);
          const flag = VALID_EXAM_FLAG.includes(obj.flag as string)
            ? (obj.flag as string)
            : "abnormal";
          return { exam_name, parameter, value, reference, flag };
        })
        .filter((it) => it.parameter.length > 0 && it.value.length > 0);
    }

    function sanitizeEmergencyCard(item: unknown): unknown {
      if (!item || typeof item !== "object") {
        return {
          critical_allergies: [],
          active_meds_with_dose: [],
          chronic_conditions_flagged: [],
          blood_type: pet.blood_type ?? null,
          contact: {
            tutor_name: tutorUser?.full_name ?? null,
            phone: null,
            vet_name: asNullableStr(aiData.usual_vet),
            vet_phone: null,
          },
        };
      }
      const obj = item as Record<string, unknown>;
      const critical_allergies = Array.isArray(obj.critical_allergies)
        ? (obj.critical_allergies as unknown[]).map(asStr).filter((s) => s.length > 0)
        : [];
      const active_meds_with_dose = Array.isArray(obj.active_meds_with_dose)
        ? (obj.active_meds_with_dose as unknown[])
            .filter((m) => m && typeof m === "object")
            .map((m) => {
              const mo = m as Record<string, unknown>;
              return { name: asStr(mo.name), dose: asNullableStr(mo.dose) };
            })
            .filter((m) => m.name.length > 0)
        : [];
      const chronic_conditions_flagged = Array.isArray(obj.chronic_conditions_flagged)
        ? (obj.chronic_conditions_flagged as unknown[]).map(asStr).filter((s) => s.length > 0)
        : [];
      const contact = (obj.contact && typeof obj.contact === "object")
        ? obj.contact as Record<string, unknown>
        : {};
      return {
        critical_allergies,
        active_meds_with_dose,
        chronic_conditions_flagged,
        blood_type: asNullableStr(obj.blood_type) ?? pet.blood_type ?? null,
        contact: {
          tutor_name: asNullableStr(contact.tutor_name) ?? tutorUser?.full_name ?? null,
          phone: null,
          vet_name: asNullableStr(contact.vet_name) ?? asNullableStr(aiData.usual_vet),
          vet_phone: null,
        },
      };
    }

    // ── Fase 3d — resolver breed_predispositions: DB preferred, AI fallback ──
    // Ordem: (1) se DB trouxe linhas, usa como fonte autoritativa;
    //        (2) caso contrário, sanitiza o que a IA devolveu;
    //        (3) se caiu na IA e a raça é conhecida, persiste como cache
    //            (source='ai') para próxima geração não pagar tokens.
    let breed_predispositions: unknown[] = [];
    if (dbPredispositions && dbPredispositions.length > 0) {
      breed_predispositions = dbPredispositions;
    } else if (pet.breed && pet.breed !== "unknown") {
      const aiBreedPred = sanitizeBreedPred(aiData.breed_predispositions) as Array<{
        condition: string;
        rationale: string;
        severity: string;
      }>;
      breed_predispositions = aiBreedPred;

      // Persist AI fallback to cache (best-effort — falha silenciosa não bloqueia resposta)
      if (aiBreedPred.length > 0) {
        const slugify = (s: string): string =>
          s.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_|_$/g, "")
            .slice(0, 64) || "ai_condition";
        const rows = aiBreedPred.map((bp) => ({
          species: pet.species,
          breed: pet.breed,
          condition_key: slugify(bp.condition),
          condition_pt: bp.condition,
          condition_en: bp.condition,
          rationale_pt: bp.rationale,
          rationale_en: bp.rationale,
          severity: bp.severity,
          source: "ai" as const,
        }));
        const { error: upsertErr } = await sb
          .from("breed_predispositions")
          .upsert(rows, {
            onConflict: "species,breed,condition_key",
            ignoreDuplicates: true,
          });
        if (upsertErr) {
          console.error(
            "[generate-prontuario] breed_predispositions AI-cache upsert failed:",
            upsertErr.message,
          );
        } else {
          console.log(
            "[generate-prontuario] breed_predispositions cached from AI | breed:",
            pet.breed,
            "| rows:",
            rows.length,
          );
        }
      }
    }

    const activeMedsCount = medications.filter(
      (m) => !m.end_date || new Date(m.end_date) >= new Date(),
    ).length;
    const drug_interactions =
      activeMedsCount >= 2 ? sanitizeDrugInteractions(aiData.drug_interactions) : [];
    const preventive_calendar = sanitizeCalendar(aiData.preventive_calendar);
    const body_systems_review = sanitizeBodyReview(aiData.body_systems_review);
    const exam_abnormal_flags = sanitizeExamFlags(aiData.exam_abnormal_flags);
    const emergency_card = sanitizeEmergencyCard(aiData.emergency_card);

    console.log(
      "[generate-prontuario] fase2 sanitized | predispositions:",
      breed_predispositions.length,
      "| drug_interactions:",
      drug_interactions.length,
      "| preventive:",
      preventive_calendar.length,
      "| body_systems:",
      body_systems_review.length,
      "| exam_flags:",
      exam_abnormal_flags.length,
    );

    // ── Build full Prontuario data object ───────────────────────────────────
    const prontuarioData = {
      pet_id,
      age_label: ageLabel,
      weight_kg: pet.weight_kg ?? null,
      is_neutered: pet.is_neutered ?? null,
      microchip: pet.microchip ?? pet.microchip_id ?? null,
      tutor_name: tutorUser?.full_name ?? null,
      // Fase 1 — campos do pet já existentes no banco, agora surfaceados
      sex: pet.sex ?? null,
      birth_date: pet.birth_date ?? null,
      size: pet.size ?? null,
      color: pet.color ?? null,
      blood_type: pet.blood_type ?? null,
      ai_summary: (aiData.ai_summary as string) ?? null,
      ai_summary_vet: (aiData.ai_summary_vet as string) ?? null,
      alerts: (aiData.alerts as unknown[]) ?? [],
      vaccines_status: (aiData.vaccines_status as string) ?? "none",
      vaccines: vaccines.map((v) => ({
        id: v.id,
        name: v.name,
        date_administered: v.date_administered,
        next_due_date: v.next_due_date,
        batch_number: v.batch_number,
        veterinarian: v.veterinarian,
        is_overdue: v.next_due_date
          ? new Date(v.next_due_date) < new Date()
          : false,
        // Fase 1 — campos já existentes no banco, agora surfaceados
        laboratory: v.laboratory ?? null,
        dose_number: v.dose_number ?? null,
        clinic: v.clinic ?? null,
        notes: v.notes ?? null,
      })),
      active_medications: medications
        .filter((m) => !m.end_date || new Date(m.end_date) >= new Date())
        .map((m) => ({
          id: m.id,
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          start_date: m.start_date,
          end_date: m.end_date,
          // Fase 1 — campos já existentes no banco, agora surfaceados
          type: m.type ?? null,
          reason: m.reason ?? null,
          prescribed_by: m.prescribed_by ?? null,
          notes: m.notes ?? null,
        })),
      allergies: allergies.map((a) => ({
        id: a.id,
        allergen: a.allergen,
        reaction: a.reaction,
        severity: a.severity,
        // Fase 1 — campos já existentes no banco, agora surfaceados
        diagnosed_date: a.diagnosed_date ?? null,
        diagnosed_by: a.diagnosed_by ?? null,
        confirmed: a.confirmed ?? false,
      })),
      chronic_conditions: (aiData.chronic_conditions as string[]) ?? [],
      consultations: consultations.map((c) => ({
        id: c.id,
        date: c.date,
        veterinarian: c.veterinarian,
        clinic: c.clinic,
        diagnosis: c.diagnosis,
        notes: c.notes,
        consult_type: c.consult_type,
        // Fase 1 — campos já existentes no banco, agora surfaceados
        type: c.type ?? null,
        time: c.time ?? null,
        prescriptions: c.prescriptions ?? null,
        follow_up_at: c.follow_up_at ?? null,
        cost: c.cost ?? null,
      })),
      last_consultation: consultations[0] ?? null,
      last_exam_date: (aiData.last_exam_date as string) ?? null,
      last_consultation_date: (aiData.last_consultation_date as string) ?? null,
      total_entries: diaryEntries.length,
      period_label: `${now}`,
      weight_history: [],
      mood_distribution: moodCounts,
      dominant_mood: dominantMood,
      usual_vet: (aiData.usual_vet as string) ?? null,
      weight_trend: (aiData.weight_trend as string) ?? "unknown",
      // Fase 1 — tabela surgeries já existia em 011_health_tables.sql, agora surfaceada
      surgeries: surgeries.map((s) => ({
        id: s.id,
        name: s.name,
        date: s.date,
        veterinarian: s.veterinarian,
        clinic: s.clinic,
        anesthesia: s.anesthesia,
        status: s.status,
        notes: s.notes,
      })),
      exam_abnormal_count: examAbnormalCount,
      // Fase 2 — campos derivados pela IA
      breed_predispositions,
      drug_interactions,
      preventive_calendar,
      body_systems_review,
      exam_abnormal_flags,
      emergency_card,
      generated_at: new Date().toISOString(),
      is_stale: false,
    };

    // ── Save cache (INSERT first time, UPDATE on regeneration) ───────────────
    // NOTE: cannot use .upsert({ onConflict: "pet_id" }) here because the
    // unique index on pet_id is a partial index (WHERE is_active = true).
    // PostgreSQL's ON CONFLICT clause cannot target partial indexes without
    // specifying the WHERE predicate, which PostgREST/Supabase client does
    // not support. Using explicit INSERT vs UPDATE avoids this issue and also
    // correctly preserves the existing emergency_token on re-generation.
    let saveError: { message?: string; details?: string } | null = null;

    if (existing) {
      // Row exists — UPDATE only data fields, emergency_token is untouched
      const { error } = await sb
        .from("prontuario_cache")
        .update({
          user_id: userId,
          data: prontuarioData,
          generated_at: new Date().toISOString(),
          is_stale: false,
          is_active: true,
        })
        .eq("pet_id", pet_id)
        .eq("is_active", true);
      saveError = error;
    } else {
      // First time — INSERT, DB DEFAULT generates emergency_token automatically
      const { error } = await sb
        .from("prontuario_cache")
        .insert({
          pet_id,
          user_id: userId,
          data: prontuarioData,
          generated_at: new Date().toISOString(),
          is_stale: false,
          is_active: true,
        });
      saveError = error;
    }

    if (saveError) {
      console.error("[generate-prontuario] save error:", saveError.message, saveError.details);
    } else {
      console.log("[generate-prontuario] save OK");
    }

    // Fetch the saved token
    const { data: saved } = await sb
      .from("prontuario_cache")
      .select("emergency_token")
      .eq("pet_id", pet_id)
      .eq("is_active", true)
      .maybeSingle();

    console.log("[generate-prontuario] generated and cached for pet:", pet_id.slice(-8));
    return json({
      prontuario: {
        ...prontuarioData,
        emergency_token: saved?.emergency_token ?? existing?.emergency_token ?? "",
      },
      cached: false,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : "";
    console.error("[generate-prontuario] UNEXPECTED ERROR:", msg, "\nStack:", stack);
    return json({ error: "Internal server error: " + msg }, 500);
  }
});
