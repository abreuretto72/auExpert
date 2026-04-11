# auExpert Edge Functions Codemap

**Last Updated:** 2026-04-11
**Status:** Production — 4 Core Functions + 3 Utility Functions

---

## Overview

Edge Functions are Deno-based serverless functions deployed on Supabase. They handle AI classification, photo analysis, embeddings, and RAG search — operations that require:
- Extended execution time (AI inference)
- Access to secrets (Claude API key, Anthropic version)
- Isolation from the mobile app's React Native runtime

**Architecture Decision:** Disable gateway JWT validation (`verify_jwt = false`) and enforce auth internally via `validateAuth()` to handle ES256 asymmetric tokens correctly.

---

## Core Functions (Production)

### 1. `classify-diary-entry` — Unified AI Classifier

**Location:** `supabase/functions/classify-diary-entry/`

**Purpose:** Unified entry point for all diary input types (text, photo, OCR, video, audio, mixed).

**Modules:**
- `index.ts` — Request handler + orchestration
- `modules/auth.ts` — JWT validation (ES256)
- `modules/cors.ts` — CORS headers + response helpers
- `modules/context.ts` — Fetch pet profile + RAG context
- `modules/classifier.ts` — Claude API invocation + JSON parsing

**Input:**
```typescript
{
  pet_id: string;
  text?: string;                    // Free-form user text
  photos_base64?: string[];         // Array of up to 5 photos (base64)
  pdf_base64?: string;              // Scanned document (single)
  audio_url?: string;               // URL to pet audio (public Storage)
  audio_duration_seconds?: number;  // Duration hint
  video_url?: string;               // URL to video (public Storage)
  input_type: 'text' | 'photo' | 'video' | 'audio' | 'ocr_scan' | 'gallery' | 'listen' | 'mixed';
  language: string;                 // i18n language code ('pt-BR', 'en-US', etc.)
}
```

**Output:**
```typescript
{
  classifications: Array<{
    type: string;                    // vaccine, consultation, weight, expense, etc.
    confidence: number;              // 0-1
    extracted_data: Record<string, any>;
    module_id?: string;              // Future: module template ID
  }>;
  narration: string;                 // 1ª pessoa do pet (3rd person semantically)
  humor: string;                     // mood enum value
  tags: string[];                    // Detected tags/themes
  moments: Array<{
    type: string;                    // special_moment, milestone, danger_alert
    message: string;
  }>;
  urgency_level: 'low' | 'medium' | 'high';
  suggestions: string[];             // Tutor-facing suggestions
}
```

**Processing Pipeline:**

1. **Authenticate** → `validateAuth(req)` — check Bearer token via Auth server
2. **Parse input** → Validate pet_id, extract media
3. **Fetch context** → `fetchPetContext(petId)` → pet profile + top 5 RAG memories
4. **Route by input_type:**
   - `ocr_scan` → `buildOCRMessages()` — document-specific path
   - `video` → `buildMessages()` — slice first frame
   - `audio` → Detect MIME via magic bytes, use `model_audio`
   - `photo`/`gallery` → `buildMessages()` — up to 2 photos
   - `text` → `buildMessages()` — text-only
5. **Call Claude** → `callClaude()` with model from `getAIConfig()`
6. **Parse JSON** → Extract structured fields
7. **Return** → Caller saves classifications + updates cache

**Error Handling:**

- **402 Anthropic quota:** Return `{ classifications: [] }` — fallback to text-only
- **500 timeout:** Partial results acceptable — some classifications may be null
- **401 Unauthorized:** validateAuth() already rejected request

**Detailed Logging (2026-04-11):**
```
[classify-diary-entry] pet_id: {petId}, input_type: {type}, lang: {language}
[classify-diary-entry] elapsed: {ms}ms
[classify-diary-entry] classifications count: {n}
[AI-ERR] status HTTP: {status}
[AI-ERR] body: {error details}
```

---

### 2. `analyze-pet-photo` — Vision Analysis

**Location:** `supabase/functions/analyze-pet-photo/`

**Purpose:** Deep vision analysis of pet photos (identification, health metrics, mood, toxicity).

**Input:**
```typescript
{
  photo_base64: string;
  species: 'dog' | 'cat';           // Species context for IA
  language: string;                 // Response language
  media_type?: 'image/jpeg' | 'image/png' | 'image/webp';
}
```

**Output:**
```typescript
{
  identification: {
    species: 'dog' | 'cat';
    breed?: string;
    confidence: number;
  };
  health: {
    body_condition: string;          // overweight, ideal, underweight
    coat_quality: string;
    alert_conditions: string[];      // e.g., ["skin_irritation", "eye_discharge"]
  };
  mood: string;                      // Detected mood (ecstatic, happy, calm, tired, anxious, sad)
  mood_confidence: number;
  environment: {
    setting: string;                 // home, outdoor, vet_clinic, etc.
    conditions: string[];
  };
  toxicity_check: Array<{
    item: string;
    toxicity_level: 'mild' | 'moderate' | 'severe';
    action: string;                  // "monitor", "contact_vet", "remove"
  }>;
  description: string;               // Narrative summary (never null)
  alerts: Array<{
    type: 'health' | 'behavior' | 'environment';
    message: string;
  }>;
}
```

**Key Features:**

- **Content-aware:** Detects pet directly vs. feces, plants, wounds, food, objects, environment
- **Obrigatório `description`:** Never null — clinical summary appropriate to content
- **Species context:** Passed from app for correct IA interpretation
- **Toxicity detection:** Lists items with severity + recommended action
- **Language support:** Responds in tutor's language

---

### 3. `generate-embedding` — Vector Generation

**Location:** `supabase/functions/generate-embedding/`

**Purpose:** Convert diary entry text → pgvector embedding (1536 dimensions, `text-embedding-3-small`).

**Input:**
```typescript
{
  pet_id: string;
  entry_id: string;
  text: string;                      // Diary entry text (300–2000 chars)
}
```

**Output:**
```typescript
{
  embedding: number[];               // 1536-dim vector
  model: string;                     // "text-embedding-3-small"
  tokens: number;
}
```

**Process:**

1. Authenticate via SERVICE_ROLE (internal use only, no user context)
2. Call Anthropic `v1/embeddings` endpoint
3. Return vector for storage in `pet_embeddings` table

**Optimization:** Run asynchronously after diary entry save (fire and forget).

---

### 4. `search-rag` — Vector Similarity Search

**Location:** `supabase/functions/search-rag/`

**Purpose:** Find top K semantically similar diary entries for pet (RAG context).

**Input:**
```typescript
{
  pet_id: string;
  query_text: string;                // Search query (user text or IA-generated)
  top_k: number;                     // Number of results (default: 5)
  min_similarity: number;            // Similarity threshold (default: 0.3)
}
```

**Output:**
```typescript
{
  results: Array<{
    entry_id: string;
    text: string;                    // Snippet
    similarity: number;              // 0-1
    created_at: string;
    tags?: string[];
  }>;
}
```

**Process:**

1. Generate embedding for `query_text` (via `generate-embedding` logic)
2. Query `pet_embeddings` table with cosine similarity: `SELECT * FROM pet_embeddings WHERE pet_id = {id} ORDER BY embedding <=> {vector} LIMIT {k}`
3. Filter by `min_similarity` threshold
4. Return sorted results with similarity scores

**Auth:** validateAuth() required — prevents cross-pet RAG leakage.

---

## Configuration & Deployment

### `supabase/config.toml`

```toml
# JWT Authentication Architecture (2026-04-11)
# Root cause: Supabase uses ES256 (asymmetric) for JWT signing,
# but gateway's verify_jwt uses legacy HS256 secret → rejects valid tokens.
# Solution: Disable gateway validation, enforce internally via validateAuth().

[functions.classify-diary-entry]
verify_jwt = false

[functions.analyze-pet-photo]
verify_jwt = false

[functions.generate-embedding]
verify_jwt = false

[functions.search-rag]
verify_jwt = false
```

### Deployment

```bash
# Deploy single function
supabase functions deploy classify-diary-entry

# Deploy all functions
supabase functions deploy

# View logs (real-time)
supabase functions logs classify-diary-entry
```

---

## Authentication Pattern

### ES256 JWT Validation

**File:** `supabase/functions/classify-diary-entry/modules/auth.ts`

```typescript
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface AuthUser {
  id: string;
  email?: string;
}

/**
 * Validates JWT by checking Supabase Auth server directly.
 * Handles ES256 (asymmetric) tokens correctly.
 */
export async function validateAuth(req: Request): Promise<AuthUser | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;  // No token provided
  }

  const token = authHeader.substring(7);
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // getUser() validates token against Auth server (handles ES256)
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    console.error('[validateAuth] rejected:', error?.message);
    return null;
  }

  return user as AuthUser;
}
```

### Usage in Edge Functions

```typescript
import { validateAuth } from './modules/auth.ts';

Deno.serve(async (req: Request) => {
  // 1. Validate JWT
  const user = await validateAuth(req);
  if (!user) {
    return errorResponse('Unauthorized', 401);
  }

  // 2. Process request with user context
  const { pet_id } = await req.json();
  // ... rest of logic
});
```

### Background Invocation (from lib/ai.ts)

When calling Edge Functions from mobile app (with ES256 token):

```typescript
const session = await supabase.auth.getSession();
const token = session.data.session?.access_token;

const { data, error } = await supabase.functions.invoke(
  'classify-diary-entry',
  {
    headers: {
      'Authorization': `Bearer ${token}`,  // ES256 token
    },
    body: { /* ... */ },
  }
);

// Detailed error logging
if (error) {
  const ctx = (error as Record<string, unknown>).context as Response | undefined;
  console.log('[AI-ERR] status HTTP:', ctx?.status);
  try {
    const errBody = await ctx?.json?.();
    console.log('[AI-ERR] body:', JSON.stringify(errBody));
  } catch {
    // Ignore parse errors
  }
}
```

---

## Utility Functions (Non-Production)

### `send-reset-email` — Password Reset

**Purpose:** Send password reset link via email.

**Input:** `{ email: string }`

**Output:** `{ status: 'sent' | 'error', message: string }`

### `generate-diary-narration` — Fallback Narration

**Purpose:** Generate additional narration if main classification failed.

**Input:** `{ text, petName, breed, humor, language, topMemories }`

**Output:** `{ narration: string }`

### `translate-strings` — Dynamic Translation

**Purpose:** Translate UI strings at runtime (fallback for missing i18n keys).

**Input:** `{ text, language }`

**Output:** `{ translated_text: string }`

---

## Error Handling & Logging

### HTTP Status Codes

| Status | Meaning | Handling |
|--------|---------|----------|
| 200 | Success | Use response data |
| 400 | Bad request | Log input validation error |
| 401 | Unauthorized | validateAuth() rejected — check token |
| 402 | Quota exceeded | Return graceful fallback |
| 500 | Server error | Log error, return partial results |
| 502 | Bad gateway | Timeout — return what we have |

### Logging Convention

**Prefix:** `[FunctionName]` — allows grep filtering

**Levels:**
```
[classify-diary-entry] INFO: Started processing
[classify-diary-entry] elapsed: 2340ms
[AI-ERR] status HTTP: 402
[AI-ERR] body: { "error": { "type": "overloaded_error" } }
```

---

## Performance Tuning

### Timeout & Retries

- **Max execution:** 600 seconds (Supabase limit)
- **Claude API timeout:** 30 seconds (hardcoded in `callClaude`)
- **Anthropic retries:** 2 retries with exponential backoff

### Concurrency

- **Parallel photo analysis:** Up to 5 photos analyzed simultaneously
- **Sequential RAG:** Single search query (no parallelization needed)

### Cost Optimization

- **Embedding caching:** 5-minute cache for identical queries
- **Prompt compression:** Limit RAG context to top 5 memories (not all)
- **Model selection:** Use cheaper model_simple for non-critical tasks

---

## Testing

### Local Development

```bash
# Start Supabase locally
supabase start

# Deploy function to local instance
supabase functions deploy classify-diary-entry --no-verify-jwt

# Invoke with auth header
curl -X POST http://localhost:54321/functions/v1/classify-diary-entry \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"pet_id": "123", "text": "...", "input_type": "text"}'
```

### Production Testing

Use `supabase functions logs` to monitor invocations:

```bash
supabase functions logs classify-diary-entry --live
```

---

## Related Docs

- [ARCHITECTURE.md](./ARCHITECTURE.md) — System design + JWT auth details
- [I18N.md](./I18N.md) — Language detection for AI responses
- [RESPONSIVENESS.md](./RESPONSIVENESS.md) — Mobile client that invokes functions
- [CLAUDE.md](../CLAUDE.md) § 13 — Architecture decisions

---

**Maintained by:** Development team  
**Last Reviewed:** 2026-04-11
