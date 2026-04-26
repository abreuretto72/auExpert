# Prompt para Claude Code — Knowledge Base Dinâmica do Suporte (RAG)
# Data: 26/04/2026
# Leia CLAUDE.md e VISION.md antes de começar.

OBJETIVO:
  Tornar a knowledge base do support-assistant automática.
  Em vez de editar manualmente o supportKnowledgeBase.ts,
  o sistema:
  1. Gera embeddings de chunks de documentação
  2. Armazena em support_kb_chunks (já criada no banco)
  3. No support-assistant, busca semanticamente os chunks
     mais relevantes para cada pergunta do tutor
  4. Um agente scan-app-for-kb lê arquivos do projeto
     e atualiza a KB automaticamente

BANCO JÁ CRIADO:
  - Tabela: support_kb_chunks (id, source, source_ref,
    title, content, language, embedding vector(1536),
    is_active, version)
  - Função SQL: search_kb_chunks(query_embedding, threshold,
    count, language) → retorna chunks por similaridade

═══════════════════════════════════════════════════════════════
ETAPA 1 — Edge Function: scan-app-for-kb
ARQUIVO: supabase/functions/scan-app-for-kb/index.ts
═══════════════════════════════════════════════════════════════

Esta função:
  - Recebe uma lista de chunks (título + conteúdo + source)
  - Gera embedding para cada chunk via Gemini text-embedding
  - Insere/atualiza em support_kb_chunks
  - Pode ser chamada via cron ou após cada deploy

POST body:
  {
    chunks: [{
      source: 'screen' | 'flow' | 'faq' | 'rule' | 'release_note',
      source_ref: string,       // ex: 'diary/new', 'health'
      title: string,
      content: string,
      language: string          // 'pt-BR' | 'en-US' etc.
    }],
    replace_source?: string     // se passado, deleta chunks antigos desta source antes de inserir
  }

Implementação:
  import { createClient } from "jsr:@supabase/supabase-js@2";

  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!;
  const SUPABASE_URL   = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  async function getEmbedding(text: string): Promise<number[]> {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: { parts: [{ text: text.slice(0, 8000) }] },
          taskType: 'RETRIEVAL_DOCUMENT',
        }),
      }
    );
    const json = await res.json();
    return json.embedding?.values ?? [];
  }

  Deno.serve(async (req) => {
    // Verificar secret header para segurança
    const secret = req.headers.get('x-kb-secret');
    if (secret !== Deno.env.get('KB_SECRET')) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
    }

    const { chunks, replace_source } = await req.json();
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Deletar chunks antigos desta source se solicitado
    if (replace_source) {
      await sb.from('support_kb_chunks')
        .update({ is_active: false })
        .eq('source', replace_source);
    }

    const results = [];
    for (const chunk of chunks) {
      const embedding = await getEmbedding(`${chunk.title}\n\n${chunk.content}`);

      const { data, error } = await sb.from('support_kb_chunks')
        .upsert({
          source:     chunk.source,
          source_ref: chunk.source_ref ?? null,
          title:      chunk.title,
          content:    chunk.content,
          language:   chunk.language ?? 'pt-BR',
          embedding:  `[${embedding.join(',')}]`,
          token_count: Math.ceil(chunk.content.length / 4),
          is_active:  true,
          version:    1,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'source,source_ref,title,language',
          ignoreDuplicates: false,
        })
        .select('id');

      results.push({ title: chunk.title, ok: !error, error: error?.message });
    }

    return new Response(JSON.stringify({ inserted: results.length, results }), {
      headers: { 'Content-Type': 'application/json' }
    });
  });

Fazer deploy:
  supabase functions deploy scan-app-for-kb --no-verify-jwt

Adicionar secret KB_SECRET no Supabase:
  supabase secrets set KB_SECRET=auexpert-kb-2026

═══════════════════════════════════════════════════════════════
ETAPA 2 — Script local: seed-kb.ts
ARQUIVO: scripts/seed-kb.ts
═══════════════════════════════════════════════════════════════

Script que lê os arquivos do projeto e alimenta a KB.
Rodar com: npx ts-node scripts/seed-kb.ts

import fs from 'fs';
import path from 'path';

const KB_URL = 'https://peqpkzituzpwukzusgcq.supabase.co/functions/v1/scan-app-for-kb';
const KB_SECRET = process.env.KB_SECRET ?? 'auexpert-kb-2026';

// ── Chunks a enviar ────────────────────────────────────────────

const chunks: Chunk[] = [];

// 1. CLAUDE.md
if (fs.existsSync('CLAUDE.md')) {
  const content = fs.readFileSync('CLAUDE.md', 'utf-8');
  chunks.push({
    source: 'rule',
    source_ref: 'CLAUDE.md',
    title: 'Regras de Desenvolvimento auExpert',
    content,
    language: 'pt-BR',
  });
}

// 2. VISION.md
if (fs.existsSync('VISION.md')) {
  const content = fs.readFileSync('VISION.md', 'utf-8');
  chunks.push({
    source: 'rule',
    source_ref: 'VISION.md',
    title: 'Visão Estratégica auExpert',
    content,
    language: 'pt-BR',
  });
}

// 3. Telas do app (app/(app)/**/*.tsx)
const screenDirs = [
  'app/(app)/pet/[id]/diary',
  'app/(app)/pet/[id]/health',
  'app/(app)/professional',
];

for (const dir of screenDirs) {
  if (!fs.existsSync(dir)) continue;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.tsx')) continue;
    const content = fs.readFileSync(path.join(dir, file), 'utf-8');
    // Extrair apenas comentários JSDoc e nomes de componentes
    const comments = content.match(/\/\*\*[\s\S]*?\*\//g) ?? [];
    if (comments.length > 0) {
      chunks.push({
        source: 'screen',
        source_ref: `${dir}/${file}`,
        title: `Tela: ${dir}/${file}`,
        content: comments.join('\n\n'),
        language: 'pt-BR',
      });
    }
  }
}

// 4. i18n pt-BR (fluxos e labels)
if (fs.existsSync('i18n/pt-BR.json')) {
  const i18n = JSON.parse(fs.readFileSync('i18n/pt-BR.json', 'utf-8'));
  const flat = flattenObject(i18n);
  const content = Object.entries(flat)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
  chunks.push({
    source: 'rule',
    source_ref: 'i18n/pt-BR.json',
    title: 'Textos e Labels do App (pt-BR)',
    content,
    language: 'pt-BR',
  });
}

// 5. Planos (subscription_plans) — hardcoded por ora
chunks.push({
  source: 'rule',
  source_ref: 'subscription_plans',
  title: 'Planos de Assinatura',
  content: `
    PLANO GRATUITO: 1 pet, IA básica, sem profissional vinculado.
    PLANO ELITE (R$ 49,90/mês): pets ilimitados, IA exclusiva por pet,
    profissionais ilimitados, todos os agentes burocráticos.
    PROFISSIONAL: sempre gratuito quando atende pets de tutores Elite.
  `,
  language: 'pt-BR',
});

// ── Enviar chunks em lotes de 10 ──────────────────────────────

function flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  return Object.entries(obj).reduce((acc, [k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null) {
      Object.assign(acc, flattenObject(v as Record<string, unknown>, key));
    } else {
      acc[key] = String(v);
    }
    return acc;
  }, {} as Record<string, string>);
}

interface Chunk {
  source: string;
  source_ref: string;
  title: string;
  content: string;
  language: string;
}

const BATCH_SIZE = 10;
for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
  const batch = chunks.slice(i, i + BATCH_SIZE);
  const res = await fetch(KB_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-kb-secret': KB_SECRET,
    },
    body: JSON.stringify({ chunks: batch }),
  });
  const json = await res.json();
  console.log(`Lote ${i / BATCH_SIZE + 1}:`, json);
}

console.log('KB seed concluído!');

═══════════════════════════════════════════════════════════════
ETAPA 3 — Atualizar support-assistant para usar RAG
ARQUIVO: supabase/functions/support-assistant/index.ts
═══════════════════════════════════════════════════════════════

Adicionar busca RAG ANTES de montar o system prompt.

APÓS buscar o histórico da conversa (histórico já existe),
adicionar:

  // ── Busca semântica na KB ─────────────────────────────────
  let ragContext = '';
  try {
    // Gerar embedding da pergunta do tutor via Gemini
    const embedRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${Deno.env.get('GEMINI_API_KEY')}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: { parts: [{ text: message as string }] },
          taskType: 'RETRIEVAL_QUERY',
        }),
      }
    );
    const embedJson = await embedRes.json();
    const queryEmbedding = embedJson.embedding?.values as number[] | undefined;

    if (queryEmbedding && queryEmbedding.length > 0) {
      const { data: kbChunks } = await sb.rpc('search_kb_chunks', {
        query_embedding: `[${queryEmbedding.join(',')}]`,
        match_threshold: 0.70,
        match_count: 5,
        filter_language: conversation.locale ?? 'pt-BR',
      });

      if (kbChunks && kbChunks.length > 0) {
        ragContext = '\n\n## INFORMAÇÕES ADICIONAIS RELEVANTES (RAG)\n\n'
          + kbChunks.map((c: { title: string; content: string; similarity: number }) =>
              `### ${c.title} (relevância: ${(c.similarity * 100).toFixed(0)}%)\n${c.content}`
            ).join('\n\n---\n\n');
        console.log('[support-assistant] RAG chunks:', kbChunks.length);
      }
    }
  } catch (e) {
    console.warn('[support-assistant] RAG falhou (não crítico):', e);
    // Falha silenciosa — KB estática ainda cobre o caso
  }

ADICIONAR ragContext ao segundo bloco do system prompt:

  {
    type: 'text' as const,
    text: `## DIRETIVAS DE RESPOSTA (variáveis)
...
${ragContext}
...resto das diretivas...`,
  }

═══════════════════════════════════════════════════════════════
ETAPA 4 — Edge Function: update-kb-on-deploy
ARQUIVO: supabase/functions/update-kb-on-deploy/index.ts
═══════════════════════════════════════════════════════════════

Função chamada automaticamente após cada deploy do app
(via GitHub Actions ou EAS Build webhook).

Esta função gera e envia chunks atualizados da KB
baseados nos arquivos mais importantes do projeto:
  - supportKnowledgeBase.ts (chunked por seção)
  - VISION.md
  - CLAUDE.md
  - Planos do banco (subscription_plans)

Implementação simples:

  Deno.serve(async (req) => {
    const secret = req.headers.get('x-kb-secret');
    if (secret !== Deno.env.get('KB_SECRET')) {
      return new Response('unauthorized', { status: 401 });
    }

    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Buscar planos do banco (sempre atualizados)
    const { data: plans } = await sb
      .from('subscription_plans')
      .select('id, name, description, price_brl, max_pets, feature_diary_ai, feature_invite_professional')
      .eq('is_active', true);

    const planContent = (plans ?? []).map((p: Record<string, unknown>) =>
      `Plano ${(p.name as Record<string, string>)['pt-BR']}: ` +
      `R$ ${p.price_brl ?? 0}/mês. ` +
      `Pets: ${p.max_pets ?? 'ilimitados'}. ` +
      `IA: ${p.feature_diary_ai ? 'sim' : 'não'}. ` +
      `Profissional: ${p.feature_invite_professional ? 'sim' : 'não'}.`
    ).join('\n');

    // 2. Enviar para scan-app-for-kb
    const chunks = [
      {
        source: 'rule',
        source_ref: 'subscription_plans',
        title: 'Planos de Assinatura (atualizado)',
        content: planContent,
        language: 'pt-BR',
      }
    ];

    await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/scan-app-for-kb`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-kb-secret': Deno.env.get('KB_SECRET')!,
        },
        body: JSON.stringify({
          chunks,
          replace_source: 'rule',
        }),
      }
    );

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  });

Deploy:
  supabase functions deploy update-kb-on-deploy --no-verify-jwt

═══════════════════════════════════════════════════════════════
ETAPA 5 — Script de seed inicial
═══════════════════════════════════════════════════════════════

Após implementar tudo, rodar o seed inicial:

  node scripts/seed-kb.ts

Verificar no banco:
  SELECT source, title, language,
         LEFT(content, 80) AS preview,
         token_count
  FROM support_kb_chunks
  ORDER BY created_at DESC
  LIMIT 20;

═══════════════════════════════════════════════════════════════
VERIFICAR após implementar
═══════════════════════════════════════════════════════════════

1. Rodar seed-kb.ts → chunks aparecem em support_kb_chunks
2. Abrir o chat de suporte no app
3. Perguntar algo específico: "Como eu registro uma vacina?"
4. Log deve mostrar: [support-assistant] RAG chunks: 3
5. Resposta deve ser precisa e baseada nos chunks encontrados

A KB estática (SUPPORT_KNOWLEDGE_BASE) continua como fallback.
O RAG COMPLEMENTA — não substitui — a KB estática.

NAO REMOVER OS LOGS EXISTENTES.
Não precisa de rebuild — salvar e ver no Metro.
