# Admin Dashboard — tabela `ai_invocations` + helper

**Status:** schema + helper criados no working tree. Aguardando aplicação da migration e instrumentação das 11 EFs.

**Sessão:** 2026-04-25 (continuidade da implementação stats screen + admin dashboard).

---

## Por que isso existe

O `admin-dashboard/` (Next.js, deploy em `admin.auexpert.com.br`) tem **3 RPCs já criadas** no banco que dependem de uma tabela `ai_invocations` que **não existia**. Diagnosticado via:

```sql
SELECT proname FROM pg_proc 
WHERE proname IN ('is_admin','get_admin_overview','get_admin_users_list','get_admin_ai_breakdown');
-- ✓ as 4 retornaram (RPCs existem)

SELECT to_regclass('public.ai_invocations')::text AS exists;
-- ✗ null (tabela faltava)
```

Sem a tabela, todas as métricas de custo, latência, taxa de sucesso e erros voltam zero. As páginas `/`, `/ai-costs` e `/errors` ficam inúteis. Apenas `/users` continua funcionando (usa `users` + `pets`, não `ai_invocations`).

---

## Fase 1 — Criar a tabela (5 min)

**Arquivo:** `supabase/migrations/20260425_ai_invocations_table.sql` (120 linhas, 6 KB).

**Conteúdo:**
- Tabela `public.ai_invocations` com 14 colunas mapeadas pra todas as queries das 3 RPCs admin
- 6 índices otimizados pros padrões de query (created_at desc, by user, by function, by model, errors-only, by category)
- RLS habilitado: SELECT só pra admin OU pro próprio user; INSERT/UPDATE/DELETE só service_role (bypassa RLS)
- `NOTIFY pgrst, 'reload schema'` no fim

**Como aplicar (Opção A — SQL Editor):**

1. Abre https://supabase.com/dashboard/project/peqpkzituzpwukzusgcq/sql/new
2. Abre o arquivo no VS Code: `supabase/migrations/20260425_ai_invocations_table.sql`
3. Copia tudo, cola no editor, clica **Run**
4. Verifica:

```sql
SELECT to_regclass('public.ai_invocations')::text AS exists;
-- deve retornar 'ai_invocations'

SELECT count(*) FROM public.ai_invocations;
-- deve retornar 0 (tabela vazia, recém-criada)
```

5. Faz logout/login no admin.auexpert.com.br → as páginas `/`, `/ai-costs`, `/errors` carregam sem erro (mas com dados zerados, porque ninguém escreveu ainda)

**Schema da tabela:**

| Coluna | Tipo | Pra que serve |
|---|---|---|
| `id` | UUID PK | identificador da invocação |
| `user_id` | UUID FK users (nullable) | tutor que disparou (null pra cron/sistema) |
| `pet_id` | UUID FK pets (nullable) | pet alvo, quando aplicável |
| `function_name` | TEXT NOT NULL | `'analyze-pet-photo'`, `'classify-diary-entry'`, etc. |
| `model_used` | TEXT | `'claude-opus-4-7'`, `'gemini-2.5-flash-preview-04-17'`, etc. |
| `tokens_in` | INTEGER | tokens do prompt |
| `tokens_out` | INTEGER | tokens da resposta |
| `latency_ms` | INTEGER | duração total da chamada |
| `cost_estimated_usd` | NUMERIC(12,4) | custo estimado em USD |
| `status` | TEXT | `'success'` / `'error'` / `'timeout'` / `'rate_limited'` |
| `error_category` | TEXT | uma de 9 categorias (timeout, network, api_error, ...) |
| `error_message` | TEXT (max 1000) | mensagem técnica do erro |
| `user_message` | TEXT (max 500) | mensagem amigável mostrada ao tutor |
| `payload` | JSONB | metadados extras (request_id, depth, etc.) |
| `is_active` | BOOLEAN | soft-delete |
| `created_at` | TIMESTAMPTZ | timestamp da chamada |

---

## Fase 2 — Instrumentar as 11 Edge Functions

**Arquivo helper:** `supabase/functions/_shared/recordAiInvocation.ts` (144 linhas, 6 KB) — já criado.

**Funções expostas:**
- `recordAiInvocation(client, record)` — insert best-effort, nunca lança
- `categorizeError(err)` — heurística pra mapear `Error` em uma das 9 categorias
- `statusFromCategory(cat)` — mapping pra `success` / `error` / `timeout` / `rate_limited`

**Lista das 11 EFs alvo** (todas existem no working tree):

| # | EF | Modelo principal | Prioridade |
|---|---|---|---|
| 1 | `classify-diary-entry` | Sonnet 4.6 + Gemini | **alta** — mais chamada |
| 2 | `analyze-pet-photo` | Opus 4.7 (chain) | **alta** — caro |
| 3 | `generate-diary-narration` | Sonnet 4.6 | **alta** — toda entry de diário |
| 4 | `generate-cardapio` | Sonnet 4.6 | média |
| 5 | `generate-prontuario` | Sonnet 4.6 | média |
| 6 | `ocr-document` | Sonnet/Opus | média |
| 7 | `generate-embedding` | gte-small (Supabase AI) | baixa — sem custo USD |
| 8 | `pet-assistant` | Sonnet 4.6 | baixa |
| 9 | `generate-ai-insight` | Sonnet 4.6 | baixa |
| 10 | `evaluate-nutrition` | Sonnet 4.6 | baixa |
| 11 | `generate-personality` | Sonnet 4.6 | baixa |

**Padrão de instrumentação (template):**

Dentro de cada EF, no fim do handler:

```typescript
import { recordAiInvocation, categorizeError, statusFromCategory } from '../_shared/recordAiInvocation.ts';

Deno.serve(async (req) => {
  const t0 = Date.now();
  let invocationContext = {
    function_name: 'classify-diary-entry',  // <- nome da EF
    user_id: null as string | null,
    pet_id: null as string | null,
  };

  try {
    // ... código existente ...
    const user = await validateAuth(req);
    invocationContext.user_id = user?.id ?? null;
    const body = await req.json();
    invocationContext.pet_id = body.pet_id ?? null;

    // ... chamada IA ...
    const result = await classifyEntry({...});

    // ── INSTRUMENTAÇÃO: caminho de sucesso ──
    await recordAiInvocation(diagClient, {
      ...invocationContext,
      model_used: aiConfig.model_classify,
      tokens_in: result.tokens_in,
      tokens_out: result.tokens_used,
      latency_ms: Date.now() - t0,
      cost_estimated_usd: estimateCost(aiConfig.model_classify, result.tokens_in, result.tokens_used),
      status: 'success',
    });

    return jsonResponse(result);

  } catch (err) {
    // ── INSTRUMENTAÇÃO: caminho de erro ──
    const cat = categorizeError(err);
    await recordAiInvocation(diagClient, {
      ...invocationContext,
      latency_ms: Date.now() - t0,
      status: statusFromCategory(cat),
      error_category: cat,
      error_message: String(err),
      user_message: 'Algo não saiu como esperado. Tente novamente.',
    });
    return errorResponse('Internal error', 500);
  }
});
```

**Custo estimado de tempo:** ~10-15 min por EF + deploy individual = ~2-3 horas pra todas as 11. Pode fazer em batches:

- **Batch 1 (alta prioridade):** `classify-diary-entry`, `analyze-pet-photo`, `generate-diary-narration` — cobrem 80% das chamadas
- **Batch 2:** `generate-cardapio`, `generate-prontuario`, `ocr-document` — cobrem mais 15%
- **Batch 3:** `generate-embedding`, `pet-assistant`, `generate-ai-insight`, `evaluate-nutrition`, `generate-personality` — restantes 5%

**Não vou fazer agora** porque:
1. Cada EF precisa deploy individual via Supabase CLI ou MCP
2. Edit em arquivos longos vem truncando (4 incidentes nesta sessão) — preciso usar Python pra cada uma
3. Helper de cálculo de custo (`estimateCost`) não existe ainda — depende de tabela de preços por modelo

---

## Fase 3 — Helper de cálculo de custo (pendente)

`recordAiInvocation` aceita `cost_estimated_usd` mas o caller (cada EF) precisa calcular. Criar um helper `_shared/estimateAiCost.ts`:

```typescript
const PRICES_USD_PER_MTOK: Record<string, { in: number; out: number }> = {
  'claude-opus-4-7':   { in: 15.00, out: 75.00 },
  'claude-sonnet-4-6': { in:  3.00, out: 15.00 },
  'claude-haiku-4-5':  { in:  0.80, out:  4.00 },
  'gemini-2.5-flash':  { in:  0.10, out:  0.40 },
  // ...
};

export function estimateCost(model: string, tokensIn: number, tokensOut: number): number {
  const p = PRICES_USD_PER_MTOK[model] ?? PRICES_USD_PER_MTOK['claude-sonnet-4-6'];
  return (tokensIn * p.in / 1_000_000) + (tokensOut * p.out / 1_000_000);
}
```

Tabela de preços precisa ser atualizada periodicamente (Anthropic muda preços). Alternativa: armazenar preços em `app_config` JSONB e ler dinamicamente.

---

## Fase 4 — Backfill (opcional)

Se quiser ver tendência dos últimos 6 meses já no primeiro dia, dá pra extrair invocações passadas de `edge_function_diag_logs` (tabela existente que loga erros) e popular `ai_invocations` retroativo. Limitação: a tabela só tem ERROS, não success — então `success_rate` e `cost` ficariam errados.

Recomendação: começar limpo, deixar o histórico de 6 meses se construir naturalmente.

---

## Resumo de status

| Item | Status |
|---|---|
| Migration `ai_invocations` schema | ✅ pronto, aguardando aplicação |
| Helper `recordAiInvocation.ts` | ✅ pronto |
| Helper `estimateAiCost.ts` (preços) | ⏳ pendente |
| Instrumentação `classify-diary-entry` | ⏳ pendente |
| Instrumentação `analyze-pet-photo` | ⏳ pendente |
| Instrumentação `generate-diary-narration` | ⏳ pendente |
| Instrumentação 8 EFs restantes | ⏳ pendente |
| Migration de fix do `get_user_stats` (9 bugs do app mobile) | ⏳ pendente — `supabase/migrations/20260424_fix_user_stats.sql` |

## Recomendação do que fazer primeiro

1. **Aplicar `20260424_fix_user_stats.sql`** (fix dos 9 bugs do stats do app mobile) — 30s no SQL Editor
2. **Aplicar `20260425_ai_invocations_table.sql`** (criar tabela) — 30s no SQL Editor
3. **Subir o admin-dashboard** pra Vercel apontando pra `admin.auexpert.com.br` — verifica que `/users` funciona (não depende de `ai_invocations`)
4. **Decidir prioridade Batch 1** (classify + analyze + narration) — agendar bloco de tempo
5. Depois: Batches 2 e 3

Sem #1 e #2, nada do que está pronto valida. Faz isso primeiro e me diz quando estiver no ar.
