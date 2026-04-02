/**
 * generate-embedding — Edge Function
 *
 * Generates an OpenAI text embedding and optionally saves it to pet_embeddings.
 *
 * POST body:
 *   text            string   — text to embed
 *   pet_id          string   — pet UUID
 *   user_id         string   — user UUID
 *   diary_entry_id  string?  — source diary entry UUID
 *   category        string?  — classification type (vaccine, medication, …)
 *   importance      number?  — 0.0–1.0, default 0.5
 *   save            boolean? — if true, insert into pet_embeddings (default true)
 *
 * Returns:
 *   { embedding: number[], saved: boolean }
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const OPENAI_API_KEY       = Deno.env.get('OPENAI_API_KEY')!;
const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Helper: call OpenAI embeddings API ────────────────────────────────────

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');

  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8191), // API limit
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI embedding error ${res.status}: ${err}`);
  }

  const json = await res.json();
  return json.data[0].embedding as number[];
}

// ── Main handler ──────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const {
      text,
      pet_id,
      user_id,
      diary_entry_id,
      category,
      importance = 0.5,
      save       = true,
    } = await req.json();

    if (!text || !pet_id) {
      return new Response(
        JSON.stringify({ error: 'text and pet_id are required' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    // Generate embedding
    const embedding = await generateEmbedding(text);

    // Optionally persist to pet_embeddings
    let saved = false;
    if (save && user_id) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      const { error } = await supabase.from('pet_embeddings').insert({
        pet_id,
        user_id,
        diary_entry_id: diary_entry_id ?? null,
        content_text:   text,
        embedding,
        importance:     Math.max(0, Math.min(1, importance)),
        category:       category ?? null,
        is_active:      true,
      });
      if (error) {
        console.error('[generate-embedding] Insert error:', error.message);
      } else {
        saved = true;
      }
    }

    return new Response(
      JSON.stringify({ embedding, saved }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    console.error('[generate-embedding] Error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }
});
