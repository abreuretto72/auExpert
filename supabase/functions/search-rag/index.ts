/**
 * search-rag — Edge Function
 *
 * Semantic search over a pet's RAG memory using Supabase AI gte-small (384d).
 * No external API key required.
 *
 * POST body:
 *   pet_id          string  — pet UUID (required)
 *   query           string  — natural language query (required)
 *   match_threshold number? — cosine similarity floor, default 0.5
 *   match_count     number? — max results, default 5
 *
 * Returns:
 *   { results: Array<{ content, similarity, content_type, importance }> }
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { validateAuth } from '../_shared/validate-auth.ts';

const SUPABASE_URL             = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Singleton Session — gte-small, 384 dimensions
// deno-lint-ignore no-explicit-any
const embedModel = new (globalThis as any).Supabase.ai.Session('gte-small');

async function embedText(text: string): Promise<number[]> {
  const input = (text ?? '').trim().slice(0, 512);
  if (!input) throw new Error('empty query');
  const output = await embedModel.run(input, { mean_pool: true, normalize: true });
  return Array.from(output as Float32Array) as number[];
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  try {
    const authResult = await validateAuth(req, CORS_HEADERS);
    if (authResult instanceof Response) return authResult;

    const {
      pet_id,
      query,
      match_threshold = 0.5,
      match_count     = 5,
    } = await req.json();

    if (!pet_id || !query) {
      return new Response(
        JSON.stringify({ error: 'pet_id and query are required' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // Embed the query
    const queryEmbedding = await embedText(String(query));

    // Search pet_embeddings via RPC (isolated to p_pet_id)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: matches, error: rpcError } = await supabase.rpc('match_pet_embeddings', {
      p_pet_id:          pet_id,
      p_query_embedding: queryEmbedding,
      p_match_threshold: match_threshold,
      p_match_count:     match_count,
    });

    if (rpcError) {
      console.error('[search-rag] RPC error:', rpcError.message);
      return new Response(
        JSON.stringify({ error: 'RAG search failed', details: rpcError.message }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const results = (matches ?? []).map((m: {
      content_text: string;
      similarity:   number;
      category:     string;
      importance:   number;
    }) => ({
      content:      m.content_text,
      similarity:   m.similarity,
      content_type: m.category,
      importance:   m.importance,
    }));

    return new Response(
      JSON.stringify({ results }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    console.error('[search-rag] error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal error', message: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }
});
