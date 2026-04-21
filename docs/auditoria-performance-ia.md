# Auditoria de Performance — Pipeline de IA

**Data:** 19/04/2026
**Escopo:** upload de mídia + chamadas Claude/Gemini nas Edge Functions
**Prioridade do tutor:** OCR → Vídeo → Áudio → Foto

---

## Sumário executivo

O app tem **três classes de gargalo** que se somam:

1. **Overhead invisível antes da IA começar a pensar** — cache de configuração desativado, RAG serializado antes do Claude, prompt gigante sem cache. Cada chamada paga 500–1500 ms "de graça" antes do primeiro token sair da Anthropic.
2. **Payload inflado no transporte** — fotos e documentos viajam em base64 inline dentro de JSON. Um JPEG de 2 MB vira 2,67 MB de string, e o servidor precisa decodificar antes de repassar à Claude. No cliente, a conversão base64 acontece em loop serial.
3. **Trabalho redundante** — classificador roda para CADA foto um prompt de ~8 K chars que repete o contexto do pet. Cinco fotos = cinco cópias do mesmo system prompt consumindo tokens de entrada.

Os três se combinam: **um diário com 3 fotos + 1 vídeo + voz pode hoje demorar 25–40 s total**, quando o mesmo conteúdo poderia rodar em 8–12 s com os ganhos listados abaixo.

---

## 1. Gargalos confirmados (com arquivo:linha)

### 1.1 Cache de configuração de IA desativado

`supabase/functions/_shared/ai-config.ts:83`

```typescript
cacheExpiry = now + 1; // cache desativado temporariamente
```

**Impacto:** cada invocação de Edge Function faz um SELECT em `app_config` antes de falar com a Claude. Em Edge Functions isso é 20–80 ms (rede + Postgres). Como TODA função de IA passa por aqui (`analyze-pet-photo`, `ocr-document`, `classify-diary-entry`, `generate-diary-narration`, `pet-assistant`, etc.), o custo se acumula.

**Esforço:** 1 linha. **Impacto:** 20–80 ms por chamada × 5+ chamadas por entrada = 100–400 ms por entrada.

---

### 1.2 RAG bloqueia o classificador

`supabase/functions/classify-diary-entry/index.ts:88`

```typescript
// 4. Fetch pet context (profile + RAG memories — passes text for vector search)
const petContext = await fetchPetContext(pet_id, text ?? undefined);
```

E dentro de `context.ts`:133–165 há embedding + vector search + fallback para últimas 5 entradas.

**Impacto:** antes do classificador mandar o primeiro byte pra Claude, ele gasta 400–1200 ms gerando embedding + vector search. Isso é **sequencial** com a chamada Claude. O classificador é a função mais chamada por entrada de diário (texto, foto, PDF, áudio, vídeo, OCR).

**Fix recomendado:** O contexto do pet (profile) e a busca RAG são independentes — paralelizar. Melhor ainda: mover o embedding+search para correr em paralelo com o upload do cliente, não como pré-requisito da resposta.

---

### 1.3 Zero prompt caching nas chamadas Claude

`supabase/functions/classify-diary-entry/modules/classifier.ts:1157–1162`

```typescript
body: JSON.stringify({
  model,
  max_tokens: maxTokens,
  system: systemPrompt,   // ← plain string, sem cache_control
  messages,
}),
```

Mesmo padrão em `analyze-pet-photo/index.ts:160–170` e `ocr-document/index.ts:110–120`.

**Impacto:** o system prompt do classificador tem **~8 000 caracteres** (perfil do pet + memórias relevantes + schema de classificação + instruções). Ele é **reenviado e reprocessado a cada chamada**. Com prompt caching (`cache_control: { type: 'ephemeral' }` no bloco do system), a Anthropic cobra 10% do preço nos tokens de entrada cacheados e responde 30–50% mais rápido em chamadas repetidas dentro de 5 min.

**Documentação Anthropic:** o cache tem TTL de 5 min. Para um tutor ativo registrando 3 fotos em sequência, a 2ª e 3ª chamadas pegam cache quente.

**Esforço:** mudar o campo `system: systemPrompt` para:
```typescript
system: [
  { type: 'text', text: SYSTEM_STATIC_PART, cache_control: { type: 'ephemeral' } },
  { type: 'text', text: DYNAMIC_PET_CONTEXT },
],
```
(parte estática do prompt vai cacheada; parte dinâmica — nome do pet, memórias RAG — fica fora).

**Impacto estimado:** 30–50% redução de latência na 2ª+ chamadas + redução de custo significativa.

---

### 1.4 Fotos sequenciais no cliente (compressão + base64)

`app/(app)/pet/[id]/diary/new.tsx:1116–1127`

```typescript
for (const photo of photosForAI) {
  const compressed = await ImageManipulator.manipulateAsync(...)
  const b64 = await readAsStringAsync(compressed.uri, { encoding: EncodingType.Base64 });
  if (b64) results.push(b64);
}
```

**Impacto:** 3 fotos × (~200 ms compressão + ~100 ms leitura base64) = **~900 ms serial**. Em paralelo com `Promise.all` seria ~350 ms (limite do processador do celular).

**Fix:** trocar o `for` por `Promise.all(photosForAI.map(async photo => { … }))`.

**Esforço:** 10 minutos. **Impacto:** 500–600 ms por entrada com múltiplas fotos.

---

### 1.5 Base64 inline em vez de URL de Storage (fotos + PDF)

**Como está hoje (cliente):** `mediaRoutines.ts:114–129` manda `photo_base64: b64` no body do `invoke('analyze-pet-photo')`.

**Como áudio e vídeo já funcionam:** `classify-diary-entry` recebe `audio_url` e `video_url` e faz download do Storage server-side (`classifier.ts:1199 fetchMediaBase64`).

**Impacto do base64 inline:**
- **+33% de overhead de rede** (regra de base64).
- Uma foto já comprimida de 500 KB vira 667 KB de string no body.
- O JSON tem que ser parseado inteiro no Edge runtime antes da função ver o primeiro campo.
- 3 fotos × 500 KB = 2 MB transferidos, ~2 s em 4G razoável.

**Fix estrutural:** padronizar que foto e PDF também sobem pro Storage primeiro e só a URL viaja no body. O Edge faz o download em paralelo com outras operações.

**Trade-off:** upload pro Storage adiciona um round-trip a mais, mas:
- O Storage é muito mais rápido que Edge Function (infraestrutura otimizada).
- Cliente pode disparar o upload DURANTE o tutor ainda estar falando — pre-fetch.
- Servidor pode baixar em paralelo com fetch de pet context.

**Esforço:** médio — requer mudança no contrato das Edge Functions `analyze-pet-photo` e `ocr-document`.

---

### 1.6 OCR captura em qualidade máxima

`components/diary/DocumentScanner.tsx:37–44`

```typescript
quality: 1,  // full quality
```

Depois o `useDiaryEntry.ts:1369–1387` redimensiona para 2000 px @ 90 % JPEG antes de mandar para Claude Vision. Mas o base64 **original** de quality:1 já foi carregado em memória (pode ser 5–8 MB em foto de documento moderna).

**Impacto:** pressão de memória + leitura disco + tempo de manipulate. Documentos raramente precisam de mais que 1600 px de largura (Claude lê texto perfeitamente a partir daí).

**Fix:** `quality: 0.7`, `targetWidth: 1600` direto no scanner.

**Esforço:** 1 linha. **Impacto:** 200–400 ms + 30–40 % menos memória no pico.

---

### 1.7 5 fotos = 5 chamadas Claude independentes (system prompt × 5)

`hooks/_diary/mediaRoutines.ts:114` usa `Promise.all` — bom, é paralelo. Mas cada uma manda o system prompt completo.

**Impacto:** com prompt caching ativado (item 1.3), a 1ª chamada esquenta o cache e as outras 4 batem no cache quente. Hoje, sem cache, são 5× ~2 000 tokens de input processados do zero na Anthropic. **Esse item depende de 1.3 ser feito.**

---

### 1.8 max_tokens alto demais no classificador

`classifier.ts:81` → `max_tokens: 8192`
`analyze-pet-photo:163` → `max_tokens: 4096`
`ocr-document:115` → `max_tokens: 4096`

**Impacto:** `max_tokens` não controla quanto a Claude gasta, mas define o teto de streaming. Valores altos não pioram latência se a resposta real for curta, MAS sem streaming (item 1.9) o cliente espera a resposta inteira.

**Fix:** revisar respostas reais. Se nenhum classificador está devolvendo mais que 2 000 tokens de JSON, baixar para 2 500 como margem. `analyze-pet-photo` e `ocr-document` quase certamente cabem em 1 500.

---

### 1.9 Sem streaming — cliente espera JSON completo

Nenhuma das funções usa `stream: true`. Para **narração do diário** e **respostas do pet-assistant** (textos longos em linguagem natural), streaming cortaria o tempo até o primeiro token visível em 60–80 %.

**Quando NÃO usar streaming:** funções que devolvem JSON estruturado (classify, analyze-pet-photo, ocr) — você precisa do JSON inteiro pra parsear, então não há ganho.

**Quando usar:** `generate-diary-narration` e `pet-assistant`. A UI pode mostrar as palavras aparecendo (efeito típico de "IA escrevendo") e percepção de velocidade melhora muito.

---

### 1.10 Vídeo usa Gemini (bom) mas depende de public URL

`classifier.ts:1508–1521` — vídeo vai pro Gemini File API via `video_url`. Gemini é significativamente mais barato e rápido que Vision para vídeo longo. **Essa parte está bem.**

Oportunidades:
- Comprimir vídeo no cliente antes de enviar (`expo-video-thumbnails` já extrai frames, mas o arquivo bruto sobe sem transcode). Um vídeo de 60s em 1080p pode ter 80 MB. Transcodar para 720p @ 2 Mbps derruba para ~15 MB — 5× mais rápido pra subir.
- Biblioteca: `react-native-compressor` ou `ffmpeg-kit-react-native` (pesado, ~30 MB no bundle). Alternativa: reduzir resolução da câmera ao gravar (`quality: '720p'` no CameraView).

---

## 2. Plano priorizado

Ordenado pela **prioridade declarada pelo tutor** (OCR → Vídeo → Áudio → Foto) cruzada com impacto estimado e esforço.

### Quick wins — menos de 1 hora cada, ganho alto

| # | Onde | O que | Impacto estimado |
|---|------|-------|------------------|
| Q1 | `ai-config.ts:83` | Reativar cache (`cacheExpiry = now + CACHE_TTL_MS`) | 100–400 ms por entrada |
| Q2 | `new.tsx:1116` | `for` → `Promise.all(map(async…))` na compressão+base64 | 500–600 ms por entrada com múltiplas fotos |
| Q3 | `DocumentScanner.tsx:38` | `quality: 1` → `quality: 0.7` e resize direto no capture | 200–400 ms + menos memória |
| Q4 | `analyze-pet-photo`, `ocr-document`, `classifier` | Reduzir `max_tokens` realistas (2 500 / 1 500 / 1 500) | 0 ms direto, mas libera headroom |

**Total dos quick wins: ~1.5 s cortados de uma entrada com 3 fotos.**

### Ganhos médios — 1 a 3 dias

| # | O que | Onde | Impacto |
|---|-------|------|---------|
| M1 | **Prompt caching** do system prompt em classifier + vision + ocr | `classifier.ts:1157`, `analyze-pet-photo:160`, `ocr-document:110` | 30–50 % redução de latência nas chamadas 2+ (janela 5 min) + redução de custo |
| M2 | **Streaming** na narração e no pet-assistant | `generate-diary-narration`, `pet-assistant` | Tempo até 1º token −60 a −80 % (percepção de velocidade) |
| M3 | **Paralelizar pet context** com Claude call | `classify-diary-entry/index.ts:88` | 400–1200 ms |
| M4 | **Compressão de vídeo no cliente** (720p/2 Mbps) via `react-native-compressor` | `VideoRecorder.tsx` ou pipeline de upload | Upload vídeo 3–5× mais rápido |

### Ganhos estruturais — 3 a 7 dias, refatoração maior

| # | O que | Por quê |
|---|-------|---------|
| E1 | **Foto e PDF via Storage URL** (igual áudio/vídeo já fazem) | Elimina 33 % overhead de base64; permite pre-upload enquanto o tutor ainda grava; paraleliza download no servidor |
| E2 | **Pre-upload em background**: cliente começa a subir a foto pro Storage no momento da captura, antes do tutor tocar "Gravar no Diário" | Quando ele confirmar, o asset já está lá; só URL viaja |
| E3 | **Classificador único para múltiplas fotos**: em vez de 5 chamadas Claude, 1 chamada com 5 blocks de imagem | Um system prompt só; Claude compara as fotos entre si (qualidade melhor); menos tokens de entrada totais |
| E4 | **Cache de "system prompt + pet context" por pet** no Edge (Redis ou in-memory por instância) | Entradas consecutivas do mesmo pet dentro de X minutos pulam o RAG |

---

## 3. Ordem de execução recomendada

Se for aplicar ao longo de 1 sprint:

**Dia 1 (manhã):** Q1 + Q2 + Q3 + Q4 — quick wins todos juntos. 3 h de trabalho, ganho imediato perceptível de 1.5 s.

**Dia 1 (tarde):** M1 prompt caching. É uma mudança contida (alterar 3 funções para o formato `system: [{ type, text, cache_control }]`). Testar bem pra garantir que o cache está sendo hit (Anthropic retorna `cache_read_input_tokens` no usage).

**Dia 2:** M3 paralelização do pet context. Reescrever `classify-diary-entry` para rodar `fetchPetContext` e a construção inicial do prompt em paralelo com `Promise.all`.

**Dia 3:** M2 streaming na narração + pet-assistant. Requer mudança no cliente também para consumir SSE.

**Dia 4-5:** E1 padronizar fotos via Storage URL. Maior mudança — contratos das Edge Functions.

**Depois:** M4 compressão de vídeo, E2 pre-upload em background, E3 classificador unificado multi-foto.

---

## 4. Medição — o que logar antes e depois

Sem medição, qualquer "ganho" é teatro. Adicionar em cada Edge Function:

```typescript
const t0 = Date.now();
// ... config + context ...
const t1 = Date.now();
// ... Claude call ...
const t2 = Date.now();
// ... post-processing ...
const t3 = Date.now();
console.log('[timing]', {
  boot_ms: t1 - t0,
  ai_ms: t2 - t1,
  post_ms: t3 - t2,
  total_ms: t3 - t0,
  cache_hit: aiResponse.usage?.cache_read_input_tokens ?? 0,
  cache_write: aiResponse.usage?.cache_creation_input_tokens ?? 0,
});
```

Sem esses logs você não vai conseguir provar que o prompt caching está funcionando (veja `cache_read_input_tokens` no response da Anthropic).

No cliente, cronometrar:
- `t_capture_to_upload_start` (tutor tira foto → começou a subir)
- `t_upload_duration`
- `t_edge_function_duration`
- `t_total_to_first_feedback_on_screen`

---

## 5. O que NÃO vale a pena (ainda)

- **Trocar Claude Sonnet por Haiku** em classificação — já testei contextualmente o que o CLAUDE.md fala e o prompt do classifier é complexo; Haiku provavelmente degrada a qualidade das classificações. Se for testar, fazer A/B com métrica de acerto.
- **Substituir Anthropic por OpenAI/Groq** — mudança de fornecedor é custo alto e o projeto tem regras fortes de modelo via `app_config`. Otimizar o que já está antes de trocar.
- **Rodar IA on-device** — modelos locais de vision de qualidade comparável não cabem em celular hoje. Esperar 1–2 anos.

---

## Referências no código

| Evidência | Arquivo | Linha |
|-----------|---------|-------|
| Cache desativado | `supabase/functions/_shared/ai-config.ts` | 83 |
| RAG bloqueante | `supabase/functions/classify-diary-entry/index.ts` | 88 |
| Sem prompt caching (classifier) | `supabase/functions/classify-diary-entry/modules/classifier.ts` | 1157–1162 |
| Sem prompt caching (vision) | `supabase/functions/analyze-pet-photo/index.ts` | 160–170 |
| Sem prompt caching (OCR) | `supabase/functions/ocr-document/index.ts` | 110–120 |
| Loop serial de fotos | `app/(app)/pet/[id]/diary/new.tsx` | 1116–1127 |
| Base64 inline para foto | `hooks/_diary/mediaRoutines.ts` | 114–129 |
| Document scanner quality:1 | `components/diary/DocumentScanner.tsx` | 37–44 |
| Vídeo via Gemini (OK) | `supabase/functions/classify-diary-entry/modules/classifier.ts` | 1508–1521 |
| Fetch de mídia por URL (bom padrão) | `supabase/functions/classify-diary-entry/modules/classifier.ts` | 1199 |
