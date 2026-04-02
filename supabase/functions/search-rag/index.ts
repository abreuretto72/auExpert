import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY not configured' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const {
      pet_id,
      query,
      match_threshold = 0.5,
      match_count = 5,
    } = await req.json();

    if (!pet_id || !query) {
      return new Response(
        JSON.stringify({ error: 'pet_id and query are required' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // Generate embedding for the query
    const embedResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: query,
      }),
    });

    if (!embedResponse.ok) {
      const errBody = await embedResponse.text();
      console.error('[search-rag] OpenAI embedding error:', embedResponse.status, errBody);
      return new Response(
        JSON.stringify({ error: 'Embedding generation failed' }),
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const embedData = await embedResponse.json();
    const queryEmbedding: number[] = embedData.data?.[0]?.embedding;

    if (!queryEmbedding?.length) {
      return new Response(
        JSON.stringify({ error: 'Empty embedding returned' }),
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // Search pet_embeddings via RPC
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: matches, error: rpcError } = await supabase.rpc('match_pet_embeddings', {
      p_pet_id: pet_id,
      p_query_embedding: queryEmbedding,
      p_match_threshold: match_threshold,
      p_match_count: match_count,
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
      similarity: number;
      category: string;
      importance: number;
    }) => ({
      content: m.content_text,
      similarity: m.similarity,
      content_type: m.category,
      importance: m.importance,
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
