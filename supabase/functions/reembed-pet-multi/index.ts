/**
 * reembed-pet-multi — RAG multi-fonte por pet.
 *
 * Indexa em pet_embeddings TODAS as fontes de informação relevantes pro pet,
 * não só diary_entries. Permite à IA do pet responder perguntas sobre:
 *   - Gastos (expenses)
 *   - Agenda + viagens (scheduled_events com event_type='travel')
 *   - Felicidade (mood_logs)
 *   - Nutrição: perfil + alimentos atuais + cardápios gerados
 *   - Posts no Breed Intelligence vinculados ao pet
 *   - Insights gerados pela IA
 *
 * Para cada registro de cada domínio, gera 1 embedding com category próprio
 * e importance calibrado. Deduplicação via metadata.source_id (UPSERT idempotente).
 *
 * POST body:
 *   { pet_id: string, domains?: string[], admin_token?: string }
 *
 *   - pet_id: obrigatório. Re-indexa TODOS os domínios desse pet.
 *   - domains: opcional. Filtra quais domínios indexar.
 *     ['expenses', 'agenda', 'mood', 'nutrition_profile', 'nutrition_record',
 *      'cardapio', 'breed_post', 'insight']
 *   - admin_token: KB_SECRET (CRON/admin). Sem token, exige JWT do dono.
 *
 * verify_jwt: false (auth manual).
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const KB_SECRET = Deno.env.get('KB_SECRET') ?? '';

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

interface DomainConfig {
  category: string;
  importance: number;
  table: string;
  buildText: (row: Record<string, unknown>) => string;
  sourceIdField?: string;  // campo que linka registro original (default: 'id')
}

const DOMAINS: Record<string, DomainConfig> = {
  expenses: {
    category: 'expense',
    importance: 0.4,
    table: 'expenses',
    buildText: (r) => {
      const parts = ['[Gasto]'];
      if (r.date) parts.push(`Data: ${r.date}`);
      if (r.category) parts.push(`Categoria: ${r.category}`);
      if (r.total) parts.push(`Valor: ${r.total} ${r.currency ?? ''}`.trim());
      if (r.vendor) parts.push(`Onde: ${r.vendor}`);
      if (r.notes) parts.push(`Notas: ${r.notes}`);
      if (Array.isArray(r.items) && r.items.length > 0) {
        parts.push(`Itens: ${(r.items as unknown[]).slice(0, 10).map(i =>
          typeof i === 'object' ? JSON.stringify(i).slice(0, 80) : String(i)).join('; ')}`);
      }
      return parts.join('\n');
    },
  },
  agenda: {
    category: 'agenda',
    importance: 0.7,
    table: 'scheduled_events',
    buildText: (r) => {
      const parts = [`[${r.event_type === 'travel' ? 'Viagem' : 'Agenda'}]`];
      if (r.scheduled_for) parts.push(`Data: ${r.scheduled_for}`);
      if (r.event_type) parts.push(`Tipo: ${r.event_type}`);
      if (r.title) parts.push(`Título: ${r.title}`);
      if (r.description) parts.push(`Descrição: ${r.description}`);
      if (r.professional) parts.push(`Profissional: ${r.professional}`);
      if (r.location) parts.push(`Local: ${r.location}`);
      if (r.status) parts.push(`Status: ${r.status}`);
      if (r.is_recurring) parts.push(`Recorrente: ${r.recurrence_rule ?? 'sim'}`);
      return parts.join('\n');
    },
  },
  mood: {
    category: 'mood',
    importance: 0.5,
    table: 'mood_logs',
    buildText: (r) => {
      const parts = ['[Humor / Felicidade]'];
      if (r.created_at) parts.push(`Quando: ${r.created_at}`);
      if (r.mood_id) parts.push(`Humor: ${r.mood_id}`);
      if (r.score !== null && r.score !== undefined) parts.push(`Score: ${r.score}/100`);
      if (r.source) parts.push(`Fonte: ${r.source}`);
      if (r.notes) parts.push(`Notas: ${r.notes}`);
      return parts.join('\n');
    },
  },
  nutrition_profile: {
    category: 'nutrition_profile',
    importance: 0.7,
    table: 'nutrition_profiles',
    buildText: (r) => {
      const parts = ['[Perfil Nutricional]'];
      if (r.modalidade) parts.push(`Modalidade: ${r.modalidade}`);
      if (r.natural_pct !== null && r.natural_pct !== undefined) {
        parts.push(`% Natural: ${r.natural_pct}`);
      }
      if (r.notes) parts.push(`Notas: ${r.notes}`);
      if (r.ai_evaluation) {
        const ev = JSON.stringify(r.ai_evaluation).slice(0, 800);
        if (ev.length > 4) parts.push(`Avaliação IA: ${ev}`);
      }
      return parts.join('\n');
    },
  },
  nutrition_record: {
    category: 'nutrition_record',
    importance: 0.6,
    table: 'nutrition_records',
    buildText: (r) => {
      const parts = ['[Alimento]'];
      if (r.record_type) parts.push(`Tipo: ${r.record_type}`);
      if (r.product_name) parts.push(`Produto: ${r.product_name}`);
      if (r.brand) parts.push(`Marca: ${r.brand}`);
      if (r.category) parts.push(`Categoria: ${r.category}`);
      if (r.portion_grams) parts.push(`Porção: ${r.portion_grams}g`);
      if (r.daily_portions) parts.push(`Porções/dia: ${r.daily_portions}`);
      if (r.calories_kcal) parts.push(`Calorias: ${r.calories_kcal} kcal`);
      if (r.is_current) parts.push('Atual: sim');
      if (r.started_at) parts.push(`Iniciado em: ${r.started_at}`);
      if (r.ended_at) parts.push(`Encerrado em: ${r.ended_at}`);
      if (r.notes) parts.push(`Notas: ${r.notes}`);
      if (r.extracted_data) {
        const ex = JSON.stringify(r.extracted_data).slice(0, 400);
        if (ex.length > 4) parts.push(`Dados extraídos: ${ex}`);
      }
      return parts.join('\n');
    },
  },
  cardapio: {
    category: 'cardapio',
    importance: 0.65,
    table: 'nutrition_cardapio_history',
    buildText: (r) => {
      const parts = ['[Cardápio Gerado]'];
      if (r.generated_at) parts.push(`Quando: ${r.generated_at}`);
      if (r.modalidade) parts.push(`Modalidade: ${r.modalidade}`);
      if (r.is_fallback) parts.push('Fallback: sim');
      if (r.data) {
        // O cardápio é um JSONB completo — extrai os campos textuais relevantes
        const d = r.data as Record<string, unknown>;
        if (d.resumo) parts.push(`Resumo: ${String(d.resumo).slice(0, 500)}`);
        if (d.recomendacoes) parts.push(`Recomendações: ${JSON.stringify(d.recomendacoes).slice(0, 600)}`);
        if (d.refeicoes || d.meals) {
          const meals = d.refeicoes ?? d.meals;
          parts.push(`Refeições: ${JSON.stringify(meals).slice(0, 800)}`);
        }
      }
      return parts.join('\n');
    },
  },
  breed_post: {
    category: 'breed_post',
    importance: 0.55,
    table: 'breed_posts',
    buildText: (r) => {
      const parts = ['[Post Breed Intelligence]'];
      if (r.published_at) parts.push(`Publicado: ${r.published_at}`);
      if (r.post_type) parts.push(`Tipo: ${r.post_type}`);
      if (r.title) parts.push(`Título: ${r.title}`);
      if (r.body) parts.push(`Conteúdo: ${String(r.body).slice(0, 1500)}`);
      else if (r.ai_caption) parts.push(`Legenda: ${String(r.ai_caption).slice(0, 1000)}`);
      if (r.tutor_raw_text) parts.push(`Tutor disse: ${String(r.tutor_raw_text).slice(0, 800)}`);
      if (Array.isArray(r.ai_tags) && r.ai_tags.length > 0) {
        parts.push(`Tags: ${(r.ai_tags as string[]).join(', ')}`);
      }
      if (r.source_name) parts.push(`Fonte: ${r.source_name}`);
      return parts.join('\n');
    },
  },
  insight: {
    category: 'insight',
    importance: 0.7,
    table: 'pet_insights',
    buildText: (r) => {
      const parts = ['[Insight IA]'];
      if (r.created_at) parts.push(`Quando: ${r.created_at}`);
      if (r.type) parts.push(`Tipo: ${r.type}`);
      if (r.urgency) parts.push(`Urgência: ${r.urgency}`);
      if (r.category) parts.push(`Categoria: ${r.category}`);
      if (r.title) parts.push(`Título: ${r.title}`);
      if (r.body) parts.push(`Conteúdo: ${String(r.body).slice(0, 1500)}`);
      if (r.action_label) parts.push(`Ação sugerida: ${r.action_label}`);
      return parts.join('\n');
    },
  },
  connection: {
    category: 'connection',
    importance: 0.6,
    table: 'pet_connections',
    buildText: (r) => {
      const parts = ['[Amigo do Pet]'];
      if (r.friend_name) parts.push(`Nome: ${r.friend_name}`);
      if (r.friend_species) parts.push(`Espécie: ${r.friend_species}`);
      if (r.friend_breed) parts.push(`Raça: ${r.friend_breed}`);
      if (r.friend_owner) parts.push(`Tutor do amigo: ${r.friend_owner}`);
      if (r.connection_type) parts.push(`Tipo: ${r.connection_type}`);
      if (r.first_met_at) parts.push(`Conheceram em: ${r.first_met_at}`);
      if (r.last_seen_at) parts.push(`Visto pela última vez: ${r.last_seen_at}`);
      if (r.notes) parts.push(`Notas: ${r.notes}`);
      if (r.narration) parts.push(`Narração: ${String(r.narration).slice(0, 800)}`);
      appendMedia(parts, r);
      return parts.join('\n');
    },
  },
  plan: {
    category: 'plan',
    importance: 0.75,
    table: 'pet_plans',
    buildText: (r) => {
      const parts = ['[Plano do Pet]'];
      if (r.plan_type) parts.push(`Tipo: ${r.plan_type}`);
      if (r.provider) parts.push(`Operadora: ${r.provider}`);
      if (r.plan_name) parts.push(`Nome do plano: ${r.plan_name}`);
      if (r.plan_code) parts.push(`Código: ${r.plan_code}`);
      if (r.monthly_cost) parts.push(`Mensalidade: ${r.monthly_cost}`);
      if (r.annual_cost) parts.push(`Custo anual: ${r.annual_cost}`);
      if (r.coverage_limit) parts.push(`Limite de cobertura: ${r.coverage_limit}`);
      if (r.start_date) parts.push(`Início: ${r.start_date}`);
      if (r.end_date) parts.push(`Término: ${r.end_date}`);
      if (r.renewal_date) parts.push(`Renovação: ${r.renewal_date}`);
      if (Array.isArray(r.coverage_items) && (r.coverage_items as unknown[]).length > 0) {
        parts.push(`Coberturas: ${(r.coverage_items as string[]).join(', ')}`);
      }
      if (r.status) parts.push(`Status: ${r.status}`);
      if (r.narration) parts.push(`Narração: ${String(r.narration).slice(0, 800)}`);
      appendMedia(parts, r);
      return parts.join('\n');
    },
  },
  travel: {
    category: 'travel',
    importance: 0.7,
    table: 'pet_travels',
    buildText: (r) => {
      const parts = ['[Viagem com o Pet]'];
      if (r.destination) parts.push(`Destino: ${r.destination}`);
      if (r.country) parts.push(`País: ${r.country}`);
      if (r.region) parts.push(`Região: ${r.region}`);
      if (r.travel_type) parts.push(`Tipo: ${r.travel_type}`);
      if (r.status) parts.push(`Status: ${r.status}`);
      if (r.start_date) parts.push(`Saída: ${r.start_date}`);
      if (r.end_date) parts.push(`Retorno: ${r.end_date}`);
      if (r.distance_km) parts.push(`Distância: ${r.distance_km} km`);
      if (r.notes) parts.push(`Notas: ${r.notes}`);
      if (Array.isArray(r.tags) && (r.tags as unknown[]).length > 0) {
        parts.push(`Tags: ${(r.tags as string[]).join(', ')}`);
      }
      if (r.narration) parts.push(`Narração: ${String(r.narration).slice(0, 800)}`);
      appendMedia(parts, r);
      return parts.join('\n');
    },
  },
};

/**
 * Anexa mídia (fotos, vídeos, scanners + OCR + análises) ao texto do RAG.
 * Conexões/planos/viagens podem ter foto do amigo, contrato escaneado, voucher
 * de hotel, atestado de viagem etc. — tudo entra no embedding pra IA responder.
 */
function appendMedia(parts: string[], r: Record<string, unknown>): void {
  if (Array.isArray(r.photos) && (r.photos as unknown[]).length > 0) {
    parts.push(`Fotos anexadas: ${(r.photos as unknown[]).length}`);
  }
  if (Array.isArray(r.videos) && (r.videos as unknown[]).length > 0) {
    parts.push(`Vídeos anexados: ${(r.videos as unknown[]).length}`);
  }
  if (Array.isArray(r.scan_urls) && (r.scan_urls as unknown[]).length > 0) {
    parts.push(`Documentos escaneados: ${(r.scan_urls as unknown[]).length}`);
  }
  if (r.ocr_text && String(r.ocr_text).trim().length > 0) {
    parts.push(`OCR dos documentos: ${String(r.ocr_text).slice(0, 1500)}`);
  }
  if (Array.isArray(r.media_analyses) && (r.media_analyses as unknown[]).length > 0) {
    const ma = (r.media_analyses as unknown[]).slice(0, 3).map(m =>
      typeof m === 'object' ? JSON.stringify(m).slice(0, 400) : String(m)
    ).join(' | ');
    parts.push(`Análises de mídia: ${ma}`);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return jsonResp({ error: 'method not allowed' }, 405);

  try {
    if (!GEMINI_API_KEY) return jsonResp({ error: 'GEMINI_API_KEY missing' }, 500);

    const body = await req.json().catch(() => ({}));
    const petId = body.pet_id ? String(body.pet_id) : null;
    const requestedDomains = Array.isArray(body.domains) ? body.domains as string[] : null;
    const adminToken = body.admin_token ? String(body.admin_token) : null;

    if (!petId) return jsonResp({ error: 'pet_id required' }, 400);

    // Auth: KB_SECRET ou JWT do dono do pet
    let isAuthed = false;
    let userId: string | null = null;
    if (KB_SECRET && adminToken && adminToken === KB_SECRET) {
      isAuthed = true;
    } else {
      const auth = req.headers.get('Authorization');
      if (auth?.startsWith('Bearer ')) {
        const token = auth.replace('Bearer ', '');
        const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const { data: { user } } = await anon.auth.getUser(token);
        if (user) { isAuthed = true; userId = user.id; }
      }
    }
    if (!isAuthed) return jsonResp({ error: 'unauthorized' }, 401);

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Valida ownership se vier por JWT
    if (userId) {
      const { data: petCheck } = await sb.from('pets')
        .select('user_id').eq('id', petId).maybeSingle();
      if (petCheck?.user_id !== userId) return jsonResp({ error: 'not pet owner' }, 403);
    }

    // Pega user_id do pet (pode ter vindo via admin_token sem userId)
    let petUserId = userId;
    if (!petUserId) {
      const { data: petRow } = await sb.from('pets')
        .select('user_id').eq('id', petId).maybeSingle();
      petUserId = petRow?.user_id ?? null;
    }
    if (!petUserId) return jsonResp({ error: 'pet user not found' }, 404);

    const domainsToProcess = requestedDomains
      ? Object.entries(DOMAINS).filter(([k]) => requestedDomains.includes(k))
      : Object.entries(DOMAINS);

    const summary: Record<string, { total: number; processed: number; failed: number }> = {};

    for (const [domainKey, cfg] of domainsToProcess) {
      summary[domainKey] = { total: 0, processed: 0, failed: 0 };

      // Lê todos os registros ativos do domínio pra esse pet
      const { data: rows, error } = await sb
        .from(cfg.table)
        .select('*')
        .eq('pet_id', petId)
        .eq('is_active', true);

      if (error) {
        console.warn(`[reembed-pet-multi] ${cfg.table} query err:`, error.message);
        continue;
      }
      if (!rows || rows.length === 0) continue;

      summary[domainKey].total = rows.length;

      const BATCH = 5;
      for (let i = 0; i < rows.length; i += BATCH) {
        const batch = rows.slice(i, i + BATCH);
        const results = await Promise.allSettled(
          batch.map(async (row) => {
            const r = row as Record<string, unknown>;
            const text = cfg.buildText(r);
            if (!text || text.length < 20) return { ok: false, err: 'too_short' };

            const embedding = await embedText(text);
            if (!embedding) return { ok: false, err: 'embed_failed' };

            const sourceId = r.id as string;

            // Upsert por (pet_id, category, source_id_in_metadata)
            // Como pet_embeddings não tem coluna source_id, identificamos via metadata.source_id
            const { data: existing } = await sb
              .from('pet_embeddings')
              .select('id')
              .eq('pet_id', petId)
              .eq('category', cfg.category)
              .eq('metadata->>source_id', sourceId)
              .maybeSingle();

            const payload = {
              pet_id: petId,
              user_id: petUserId,
              content_text: text.slice(0, 8000),
              content_type: cfg.category,
              category: cfg.category,
              importance: cfg.importance,
              embedding,
              metadata: {
                source_id: sourceId,
                source_table: cfg.table,
                domain: domainKey,
                source: 'reembed-pet-multi-v1',
              },
              is_active: true,
            };

            if (existing) {
              const { error: upErr } = await sb.from('pet_embeddings')
                .update(payload).eq('id', existing.id);
              if (upErr) return { ok: false, err: upErr.message };
            } else {
              const { error: insErr } = await sb.from('pet_embeddings').insert(payload);
              if (insErr) return { ok: false, err: insErr.message };
            }
            return { ok: true };
          }),
        );
        for (const r of results) {
          if (r.status === 'fulfilled' && r.value.ok) summary[domainKey].processed++;
          else summary[domainKey].failed++;
        }
      }
    }

    const grandTotal = Object.values(summary).reduce((acc, s) => acc + s.total, 0);
    const grandProcessed = Object.values(summary).reduce((acc, s) => acc + s.processed, 0);

    return jsonResp({
      success: true,
      pet_id: petId,
      grand_total: grandTotal,
      grand_processed: grandProcessed,
      by_domain: summary,
    });
  } catch (err) {
    console.error('[reembed-pet-multi] error:', err);
    return jsonResp({ error: 'internal error', message: String(err) }, 500);
  }
});

/**
 * Gera embedding 384-dim via Gemini gemini-embedding-001 (Matryoshka).
 * Renormaliza L2 — requirement quando outputDimensionality < 3072.
 */
async function embedText(text: string): Promise<number[] | null> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: { parts: [{ text: text.slice(0, 8000) }] },
          taskType: 'RETRIEVAL_DOCUMENT',
          outputDimensionality: 384,
        }),
      },
    );
    if (!res.ok) {
      console.warn('[reembed-pet-multi] gemini embed failed:', res.status,
        await res.text().catch(() => ''));
      return null;
    }
    const json = await res.json();
    const values = json?.embedding?.values as number[] | undefined;
    if (!values || values.length === 0) return null;
    let norm = 0;
    for (const v of values) norm += v * v;
    norm = Math.sqrt(norm);
    if (norm === 0) return values;
    return values.map(v => v / norm);
  } catch (e) {
    console.warn('[reembed-pet-multi] embed exception:', e);
    return null;
  }
}
