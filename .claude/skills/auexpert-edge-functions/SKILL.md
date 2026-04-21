---
name: auexpert-edge-functions
description: Padrões técnicos obrigatórios para Edge Functions do auExpert — compressão de imagem antes de Claude Vision (máx 1568px), Promise.all para queries paralelas, structured outputs (output_config.format) com JSON Schema em extrações, cache em memória de configurações (ai-config, 5min TTL), logs de timing por etapa, escolha de modelo por tarefa (Haiku 4.5 para extração, Sonnet 4.6 para narração/análise), schema versioning para caches gerados por IA, e uso obrigatório de getAIConfig (nunca modelo hardcoded). Use SEMPRE que for criar, editar, otimizar ou debugar Edge Function do Supabase (pasta supabase/functions/), lidar com Claude API em backend, integrar Vision API, lidar com performance de IA, cache de resultados, latência de função serverless. Também quando usuário mencionar "Edge Function", "Deno", "Claude API", "Vision", "classify", "analyze-pet-photo", "structured output", "json_schema", "timing", "otimizar função", "app_config". Complementa auexpert-diary-flow quando a Edge Function faz parte do fluxo do diário.
---

# auExpert — Edge Function Patterns

Lições aprendidas em produção. Aplicar SEMPRE em qualquer Edge Function nova ou existente.

## 1. Modelo via `app_config` — NUNCA hardcoded

**Proibido:** `model: 'claude-sonnet-4-20250514'` em qualquer Edge Function.

**Obrigatório:** `getAIConfig(supabase)` do helper `supabase/functions/_shared/ai-config.ts`.

Motivo: mudança de modelo = 1 UPDATE no banco, zero deploy.

```typescript
// ⛔ PROIBIDO
body: JSON.stringify({ model: 'claude-sonnet-4-20250514', ... })

// ✅ OBRIGATÓRIO
const aiConfig = await getCachedAIConfig(supabase);
body: JSON.stringify({ model: aiConfig.ai_model_classify, ... })
```

Chaves no `app_config`:

```sql
ai_model_classify  → default claude-sonnet-4-20250514
ai_model_vision    → default claude-sonnet-4-20250514
ai_model_chat      → default claude-sonnet-4-20250514
ai_model_narrate   → default claude-sonnet-4-20250514
ai_model_insights  → default claude-sonnet-4-20250514
ai_model_simple    → default claude-haiku-4-5-20251001
```

## 2. Compressão de imagem antes de IA — OBRIGATÓRIO

**Toda imagem enviada a Claude Vision DEVE passar pelo helper `lib/imageCompression.ts` antes.**

Claude Vision recomenda **máx 1568px no lado maior**. Acima disso a API redimensiona internamente — enviar maior é desperdício triplo:

- Upload (4-6x mais lento em 4G)
- Tokens de imagem (aumenta custo e latência)
- Base64 no body do request

```typescript
import * as ImagePicker from 'expo-image-picker';
import { compressImageForAI } from '../lib/imageCompression';

// ⛔ ERRADO — manda foto de 3-4MB em base64
const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.85 });
const b64 = result.assets[0].base64;

// ✅ CERTO — comprime antes, manda ~300KB
const result = await ImagePicker.launchCameraAsync({ base64: false, quality: 1 });
const { base64 } = await compressImageForAI(result.assets[0].uri);
```

**Telas que DEVEM usar o helper:**
- `nutrition/trocar.tsx` (troca de ração, frente e verso)
- `diary/new.tsx` (foto de diário)
- Scanner de documentos vet
- Scanner de nota fiscal
- Qualquer tela futura que envie foto para análise IA

## 3. Queries paralelas — Promise.all OBRIGATÓRIO

**Múltiplos `await` sequenciais em Edge Function = bug de performance.** Quando precisa buscar N coisas independentes, usar `Promise.all`.

```typescript
// ⛔ ERRADO — 400-500ms desperdiçados (soma dos awaits)
const pet = await sb.from('pets').select('*').eq('id', petId).single();
const profile = await sb.from('nutrition_profiles').select('*').eq('pet_id', petId);
const foods = await sb.from('nutrition_records').select('*').eq('pet_id', petId);

// ✅ CERTO — tempo total = query mais lenta
const [petResult, profileResult, foodsResult] = await Promise.all([
  sb.from('pets').select('*').eq('id', petId).single(),
  sb.from('nutrition_profiles').select('*').eq('pet_id', petId),
  sb.from('nutrition_records').select('*').eq('pet_id', petId),
]);
```

Só usar await sequencial quando uma query REALMENTE depende do resultado da anterior (ex: query 2 usa ID vindo da query 1).

## 4. Structured outputs — OBRIGATÓRIO em extrações

**Quando Claude precisa retornar JSON estruturado, usar `output_config.format` em vez de instruir "retorne JSON puro" no prompt.**

Structured outputs (GA desde fev/2026) usa constrained decoding — garante matematicamente que o output obedece o schema. Elimina parser multi-estratégia com regex, elimina fallback por "AI devolveu markdown", reduz risco de erro.

**Suportado em:** Opus 4.7, 4.6, 4.5 · Sonnet 4.6, 4.5 · Haiku 4.5 e superiores. Não suportado em modelos 3.x.

```typescript
// ⛔ ERRADO — frágil
body: JSON.stringify({
  model: aiConfig.model_insights,
  max_tokens: 8192,
  messages: [{ role: 'user', content: `${prompt}\n\nReturn ONLY valid JSON...` }],
})
// ...e depois um parser multi-estratégia com regex

// ✅ CERTO — schema garantido
body: JSON.stringify({
  model: aiConfig.model_insights,
  max_tokens: 4096,
  messages: [{ role: 'user', content: prompt }],
  output_config: {
    format: {
      type: 'json_schema',
      schema: MY_SCHEMA,  // JSON Schema padrão
    },
  },
})
// ...e depois:
const data = JSON.parse(response.content[0].text);  // sempre válido
```

Usar **sempre** em: OCR, extração de documentos (vacinas, receitas, notas), classificação, cardápio semanal, qualquer output que consome campos específicos.

## 5. Cache em memória de configurações — OBRIGATÓRIO

**Queries repetidas na mesma Edge Function são desperdício.** Edge Functions do Supabase mantêm estado entre invocações enquanto o isolate está quente — aproveitar pra cachear valores que mudam raramente.

```typescript
const AI_CONFIG_MEMORY_TTL_MS = 5 * 60 * 1000; // 5 min
let aiConfigCache: { value: AIConfig; expires: number } | null = null;

async function getCachedAIConfig(sb): Promise<AIConfig> {
  const now = Date.now();
  if (aiConfigCache && now < aiConfigCache.expires) return aiConfigCache.value;
  const value = await getAIConfig(sb);
  aiConfigCache = { value, expires: now + AI_CONFIG_MEMORY_TTL_MS };
  return value;
}
```

Aplicar a: `app_config`, feature flags, prompts armazenados, quaisquer dados quase-estáticos.

## 6. Escolha de modelo por tarefa

Seguir `app_config.ai_model_*` SEMPRE (nunca hardcodar). Ao configurar os modelos no banco, usar esta diretriz:

| Tarefa | Modelo recomendado | Motivo |
|---|---|---|
| Extração estruturada (OCR, JSON schema, classificação) | **Haiku 4.5** | 3-5x mais rápido, qualidade equivalente em tarefas estruturadas |
| Cardápio semanal, receitas em schema | **Haiku 4.5** | Output em JSON Schema — Haiku dá conta |
| Narração criativa do diário | **Sonnet 4.6** | Nuance emocional, tom do pet |
| Análise profunda (saúde longitudinal, insights) | **Sonnet 4.6** ou **Opus 4.7** | Raciocínio clínico |
| Tarefas simples (translate, format) | **Haiku 4.5** | Desperdício usar modelo mais caro |

## 7. Logs de timing — OBRIGATÓRIO em toda função com IA

**Sem medição, otimização vira chute.**

```typescript
Deno.serve(async (req) => {
  const timings: Record<string, number> = {};
  const t_start = Date.now();

  const t_auth = Date.now();
  // ... auth
  timings.auth = Date.now() - t_auth;

  const t_queries = Date.now();
  // ... Promise.all das queries
  timings.queries_parallel = Date.now() - t_queries;

  const t_claude = Date.now();
  // ... chamada da API
  timings.claude_api = Date.now() - t_claude;

  const total = Date.now() - t_start;
  console.log('[function-name] DONE | timings:', JSON.stringify(timings), '| total:', total, 'ms');
});
```

Também logar `usage` retornado pela API para acompanhar cache hit/miss:

```typescript
if (claudeData.usage) {
  console.log('[fn] usage:', JSON.stringify({
    input: claudeData.usage.input_tokens,
    output: claudeData.usage.output_tokens,
    cache_read: claudeData.usage.cache_read_input_tokens ?? 0,
    cache_write: claudeData.usage.cache_creation_input_tokens ?? 0,
  }));
}
```

## 8. Schema versioning em caches gerados por IA

**Quando uma Edge Function gera JSON que fica cacheado no banco, usar `schema_version` para invalidar cache automaticamente quando o formato muda.**

```typescript
const CARDAPIO_SCHEMA_VERSION = 2; // bump ao mudar formato

// Ao ler cache:
if (cached
    && !isExpired(cached.generated_at)
    && cached.schema_version === CARDAPIO_SCHEMA_VERSION) {
  return json({ cardapio: cached.data, cached: true });
}
// Senão, regenera e grava com schema_version atual
```

Elimina "cache poisoning" quando você evolui o shape do JSON — caches antigos são ignorados automaticamente, sem drop de tabela.

## 9. verify_jwt para funções invocadas em background

Edge Functions chamadas em background (fire-and-forget do frontend ou por outras Edge Functions) precisam:

```toml
# supabase/config.toml
[functions.generate-embedding]
verify_jwt = false

[functions.analyze-pet-photo]
verify_jwt = false
```

Sem isso, falham com 401. Atenção: só desabilitar JWT em funções que não recebem input sensível diretamente do cliente — sempre validar autorização internamente.

## 10. Após migration que altera schema: `NOTIFY pgrst`

Se a Edge Function (ou o PostgREST em geral) vai usar relação nova após uma migration:

```sql
-- No final da migration ou executado manualmente:
NOTIFY pgrst, 'reload schema';
```

Sem isso, PostgREST não reconhece FKs novas — resultado: JOINs retornam vazio silenciosamente.
