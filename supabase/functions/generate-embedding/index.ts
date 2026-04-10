/**
 * generate-embedding — Edge Function
 *
 * Generates a Supabase AI gte-small text embedding (384 dims) and
 * optionally saves it to pet_embeddings. No external API key required.
 *
 * POST body:
 *   text            string   — text to embed
 *   pet_id          string   — pet UUID
 *   user_id         string?  — user UUID (required when save=true)
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

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Singleton — constructing a Session is expensive; reuse across invocations.
// deno-lint-ignore no-explicit-any
const embedModel = new (globalThis as any).Supabase.ai.Session('gte-small');

async function embedText(text: string): Promise<number[]> {
  const input = (text ?? '').trim().slice(0, 512); // gte-small safe cap
  if (!input) throw new Error('empty text');
  const output = await embedModel.run(input, { mean_pool: true, normalize: true });
  return Array.from(output as Float32Array) as number[];
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

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

    const embedding = await embedText(String(text));

    let saved = false;
    if (save && user_id) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      const { error } = await supabase.from('pet_embeddings').insert({
        pet_id,
        user_id,
        diary_entry_id: diary_entry_id ?? null,
        content_text:   String(text).slice(0, 4000),
        embedding,
        importance:     Math.max(0, Math.min(1, Number(importance) || 0.5)),
        category:       category ?? null,
        is_active:      true,
      });
      if (error) {
        console.error('[generate-embedding] insert error:', error.message);
      } else {
        saved = true;
      }
    }

    return new Response(
      JSON.stringify({ embedding, saved }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    console.error('[generate-embedding] error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }
});
