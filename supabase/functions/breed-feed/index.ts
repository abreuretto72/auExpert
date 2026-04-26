/**
 * breed-feed — Feed personalizado por raça (Breed Intelligence Elite).
 *
 * Retorna mix de posts (editorial / tutor / recommendation) filtrados pelas
 * raças dos pets do tutor logado. Paginação por cursor (published_at).
 *
 * POST body:
 *   {
 *     pet_id: string,         // pet ativo (define raça/espécie do filtro)
 *     cursor?: string,        // ISO datetime — published_at do último item
 *     limit?: number,         // default 20, max 50
 *     filter?: 'all' | 'editorial' | 'tutor' | 'recommendation'
 *   }
 *
 * Response:
 *   {
 *     items: BreedPost[],
 *     next_cursor: string | null,
 *     has_more: boolean
 *   }
 *
 * Ordenação: urgency DESC (critical primeiro) → ai_relevance_score DESC →
 * published_at DESC. Paginação cursor-based pela published_at.
 *
 * Elite gating: o EF retorna 403 se o tutor não tem feature_breed_intelligence.
 *
 * verify_jwt: false (autoriza via Authorization header manualmente).
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResp(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

interface BreedPostRow {
  id: string;
  post_type: string;
  source: string | null;
  title: string | null;
  body: string | null;
  ai_caption: string;
  ai_tags: string[] | null;
  urgency: string;
  ai_relevance_score: number | null;
  source_name: string | null;
  source_url: string | null;
  thumbnail_url: string | null;
  media_type: string;
  media_urls: string[] | null;
  media_thumbnails: string[] | null;
  media_duration: number | null;
  target_breeds: string[];
  target_species: string | null;
  pet_id: string | null;
  pet_name: string | null;
  pet_breed: string | null;
  tutor_user_id: string | null;
  recommendation_id: string | null;
  pet_age_months: number | null;
  useful_count: number;
  comment_count: number;
  share_count: number;
  view_count: number;
  published_at: string | null;
  created_at: string;
}

const URGENCY_RANK: Record<string, number> = {
  critical: 4, high: 3, medium: 2, low: 1, none: 0,
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return jsonResp({ error: 'method not allowed' }, 405);

  try {
    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return jsonResp({ error: 'unauthorized' }, 401);
    const token = authHeader.replace('Bearer ', '');
    const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { user } } = await anon.auth.getUser(token);
    if (!user) return jsonResp({ error: 'unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const petId = String(body.pet_id ?? '');
    const cursor = body.cursor ? String(body.cursor) : null;
    const limit = Math.min(Math.max(Number(body.limit ?? 20), 5), 50);
    const filter = String(body.filter ?? 'all') as 'all' | 'editorial' | 'tutor' | 'recommendation';

    if (!petId) return jsonResp({ error: 'pet_id required' }, 400);

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Elite gate
    const { data: gate } = await sb.rpc('is_elite_breed', { p_user_id: user.id });
    if (!gate) return jsonResp({ error: 'elite_required' }, 403);

    // Pet do tutor
    const { data: pet, error: petErr } = await sb
      .from('pets')
      .select('id, user_id, breed, species')
      .eq('id', petId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (petErr || !pet) return jsonResp({ error: 'pet not found' }, 404);

    // Raças de TODOS os pets do tutor (feed une raças do household)
    const { data: pets } = await sb
      .from('pets')
      .select('breed, species')
      .eq('user_id', user.id);

    const breeds = Array.from(new Set(
      (pets ?? []).map(p => p.breed).filter((b): b is string => !!b),
    ));
    const species = pet.species as string;

    // Query base: posts publicados, ativos, não deletados, target match.
    // target_breeds &&  → array overlap (qualquer raça do household)
    // target_species in ('both', species)
    let q = sb.from('breed_posts').select(`
      id, post_type, source, title, body, ai_caption, ai_tags, urgency,
      ai_relevance_score, source_name, source_url, thumbnail_url,
      media_type, media_urls, media_thumbnails, media_duration,
      target_breeds, target_species, pet_id, tutor_user_id, recommendation_id,
      pet_age_months, useful_count, comment_count, share_count, view_count,
      published_at, created_at,
      pets:pets!breed_posts_pet_id_fkey(name, breed)
    `)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .eq('moderation_status', 'approved')
      .or(`target_species.eq.both,target_species.eq.${species}`);

    if (breeds.length > 0) {
      q = q.overlaps('target_breeds', breeds);
    }

    if (filter !== 'all') {
      q = q.eq('post_type', filter);
    }

    if (cursor) {
      q = q.lt('published_at', cursor);
    }

    // Pega 3x o limit pra ordenar localmente por (urgency, score, date)
    // sem perder mix de tipos. Limita resultado final a `limit`.
    const fetchSize = Math.min(limit * 3, 100);
    q = q.order('published_at', { ascending: false }).limit(fetchSize);

    const { data: posts, error: qErr } = await q;
    if (qErr) {
      console.error('[breed-feed] query error:', qErr.message);
      return jsonResp({ error: 'query failed', details: qErr.message }, 500);
    }

    // Achata o nested `pets` em `pet_name` / `pet_breed` (string flat).
    // O JOIN PostgREST traz `pets: { name, breed }` ou `null`. O front espera
    // os dois campos no nível raiz do post.
    const rows: BreedPostRow[] = (posts ?? []).map((p) => {
      const r = p as Record<string, unknown> & { pets?: { name?: string; breed?: string } | null };
      const pets = r.pets;
      return {
        ...(r as unknown as BreedPostRow),
        pet_name:  pets?.name  ?? null,
        pet_breed: pets?.breed ?? null,
      } as BreedPostRow;
    });

    // Re-ordena por urgency DESC, score DESC, published_at DESC
    rows.sort((a, b) => {
      const ua = URGENCY_RANK[a.urgency] ?? 0;
      const ub = URGENCY_RANK[b.urgency] ?? 0;
      if (ua !== ub) return ub - ua;
      const sa = a.ai_relevance_score ?? 0;
      const sb_ = b.ai_relevance_score ?? 0;
      if (sa !== sb_) return sb_ - sa;
      const pa = a.published_at ? new Date(a.published_at).getTime() : 0;
      const pb = b.published_at ? new Date(b.published_at).getTime() : 0;
      return pb - pa;
    });

    // Mix proporção quando filter='all': 50% editorial, 30% tutor, 20% rec
    let items: BreedPostRow[] = rows;
    if (filter === 'all') {
      const editorial = rows.filter(r => r.post_type === 'editorial');
      const tutor = rows.filter(r => r.post_type === 'tutor');
      const rec = rows.filter(r => r.post_type === 'recommendation');
      const target = {
        editorial: Math.ceil(limit * 0.5),
        tutor: Math.ceil(limit * 0.3),
        rec: Math.ceil(limit * 0.2),
      };
      items = interleave(
        editorial.slice(0, target.editorial),
        tutor.slice(0, target.tutor),
        rec.slice(0, target.rec),
      ).slice(0, limit);
    } else {
      items = rows.slice(0, limit);
    }

    // Cursor: published_at do último item
    const last = items[items.length - 1];
    const nextCursor = last?.published_at ?? null;

    return jsonResp({
      items,
      next_cursor: nextCursor,
      has_more: rows.length >= fetchSize,
    });

  } catch (err) {
    console.error('[breed-feed] error:', err);
    return jsonResp({ error: 'internal error', message: String(err) }, 500);
  }
});

/**
 * Intercala 3 listas (editorial / tutor / rec) preservando ordem interna,
 * para que o feed alterne tipos ao invés de mostrar tudo de uma categoria.
 */
function interleave<T>(a: T[], b: T[], c: T[]): T[] {
  const out: T[] = [];
  const max = Math.max(a.length, b.length, c.length);
  for (let i = 0; i < max; i++) {
    if (i < a.length) out.push(a[i]);
    if (i < b.length) out.push(b[i]);
    if (i < c.length) out.push(c[i]);
  }
  return out;
}
