# CLAUDE.md — auExpert Project Rules (v10 slim)

> Regras universais do auExpert. Conhecimento especializado (design system, i18n, fluxo do diário, etc.) mora em `.claude/skills/` e carrega sob demanda.

## Identity

- **App:** auExpert — grafia exata, sempre (`au` minúsculo, `Expert` com E maiúsculo, sem espaço). Em código: `au-expert` (kebab) ou `AuExpert` (Pascal). Nome anterior **PetauLife+** está descontinuado — não usar.
- **Tagline:** "Uma inteligência única para o seu pet" / "A unique intelligence for your pet"
- **Owner:** Multiverso Digital (Belisario)
- **Phase:** MVP "Diário Inteligente" — login + biometria, pets (cães/gatos), Hub Meus Pets, diário com narração IA, análise de foto IA, RAG por pet, prontuário (vacinas + alergias), push.
- **Pós-MVP:** Aldeia (rede solidária hiperlocal — ver `@docs/aldeia-spec.md` quando for relevante).

## Stack

Expo SDK 52+ · React Native · TypeScript · Expo Router v4 · Zustand 4.x · React Query (TanStack) 5.x · react-i18next 14.x · lucide-react-native · Supabase (PostgreSQL 15+ / pgvector 0.7+ / Auth / Storage / Edge Functions) · Claude API (modelo via `app_config`) · Sharp 0.33+ · Expo Notifications · Expo LocalAuthentication · Expo Camera

**Supabase project ID:** `peqpkzituzpwukzusgcq`
**i18n locales:** pt-BR, en-US, es-MX, es-AR, pt-PT
**Test pets:** Mana (Chihuahua), Pico (Border Collie). Co-tester: Anita.

---

## Inviolable Rules (resumo — detalhes nas skills)

Essas 10 regras valem em qualquer arquivo, qualquer tarefa. Cada violação é bug em aberto.

1. **Nenhuma string visível ao tutor hardcoded.** Todo texto de UI (Text, placeholder, toast, label, alert) vai para i18n. Ver skill `auexpert-i18n`.
2. **`Alert.alert()` é proibido.** Usar `toast()` ou `confirm()` do ToastProvider. Ver skill `auexpert-ui-patterns`.
3. **Emojis no código são proibidos.** Usar ícones Lucide React Native. Ver skill `auexpert-design-system`.
4. **Delete físico é proibido.** Soft delete via `is_active = false`.
5. **Narração do pet sempre em 3ª pessoa.** "O Rex foi ao parque" ✅ — "Fui ao parque" ⛔ — "Meu dono..." ⛔
6. **Nunca inventar nomes de colunas, tabelas ou RPCs.** Antes de escrever query, consultar schema real (ver "Database workflow" abaixo).
7. **Modelo de IA nunca hardcoded.** Sempre `getAIConfig(supabase)` de `supabase/functions/_shared/ai-config.ts`. Mudança de modelo = 1 UPDATE em `app_config`, zero deploy.
8. **Cores hardcoded são proibidas.** Sempre importar de `constants/colors.ts`. Branco puro `#FFFFFF` é exceção universal permitida apenas em texto de botão primário. Preto puro nunca.
9. **Arquivos protegidos não são modificados** sem autorização explícita (ver seção "Protected files" abaixo).
10. **Fontes customizadas são proibidas.** Apenas fonte do sistema (SF Pro/Roboto). Nunca `fontStyle: 'italic'` em texto corrido. Tamanho mínimo: 12px labels, 14px corpo.

---

## Database workflow (universal)

**Antes de qualquer query, RPC, migration ou mutation:**

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'nome_da_tabela' AND table_schema = 'public';
```

**Regras:**

- PostgREST JOIN com múltiplas FKs apontando pra mesma tabela exige o nome exato da constraint: `table!constraint_name(columns)`. Sem isso, retorna zero resultados silenciosamente.
- Depois de qualquer migration que adicione/altere FKs: rodar `NOTIFY pgrst, 'reload schema'` — sem isso o PostgREST não reconhece a relação nova.
- FKs de `registered_by`/`updated_by`/`deleted_by` apontam para `public.users`, **não** `auth.users`.
- Edge Functions invocadas em background (embeddings, análise de foto, etc.) precisam `verify_jwt: false` no `config.toml` pra não falhar com 401.
- RLS ativo em TODAS as tabelas. Ao corrigir policy, verificar TODAS as operações CRUD (SELECT, INSERT, UPDATE, DELETE), não só a que parece quebrada.
- Soft delete: `is_active BOOLEAN DEFAULT true` em toda tabela.
- Todo `id`: `UUID DEFAULT gen_random_uuid()`. Toda tabela: `created_at TIMESTAMPTZ DEFAULT NOW()`.
- `CHECK (species IN ('dog', 'cat'))` em tabelas de pet.

**Decisões arquiteturais específicas do diário:**

- Lens cards usam `extracted_data` como fonte primária, **não** resultados de JOIN.
- `DIARY_MODULE_SELECT` usa `select('*')` — sem expansões de FK (evita erros PostgREST).
- `diary_entries` tem FKs para vacinas, consultas, despesas, métricas de peso, medicações — todas seguem padrão de constraint explícita.

---

## Debug workflow (universal)

- Ao investigar bugs: `grep` + `read` com ranges específicos, **nunca** `read` de arquivos inteiros grandes.
- **Debug logs adicionados ao código ficam até o usuário confirmar visualmente que o bug foi resolvido.** Nunca remover logs especulativamente "porque parece que funcionou" — só após confirmação no dispositivo.
- Ao corrigir um bug, verificar se o fix não quebra funcionalidade relacionada (especialmente RLS e fluxos offline).
- Ao corrigir policy RLS: testar TODAS as operações CRUD, não apenas a que disparou o bug.
- Nunca sobrescrever assets visuais do usuário (ícones, imagens, temas) com substitutos gerados — sempre perguntar antes.
- Nunca incluir mock/placeholder em código de produção. Se mock for necessário para dev, vai em arquivo de teste claramente identificado e excluído do build.
- Antes de usar API de biblioteca (ex: `crypto.randomUUID`, `SecureStore`): verificar compatibilidade com a plataforma alvo (RN/iOS/Android).

---

## Core business rules (mínimo essencial)

- **Senha:** mín 8 chars, 1 maiúscula, 1 número, 1 especial. Lock após 5 falhas (15min).
- **Pets:** apenas `dog` / `cat`. Sem limite por tutor. Microchip `UNIQUE`.
- **Diário:** mín 3 chars OU 1 foto OU 5s áudio; máx 2000 chars, máx 5 fotos (WebP comprimido); humor obrigatório; narração IA ≤150 palavras e ≤5s. Ver skill `auexpert-diary-flow`.
- **Análise foto:** máx 12MB, confidence <0.5 = disclaimer obrigatório, nunca diagnosticar.
- **RAG:** isolado por `pet_id` — nunca misturar memórias entre pets. Importâncias: allergy 0.95, vaccine 0.9, medication 0.85, consultation 0.8, symptom 0.8, exam 0.75, weight 0.7, food 0.6, moment 0.5, expense 0.4.
- **Classificador de gastos:** nunca usar `'outros'` quando há contexto claro. Inferir pela categoria relacionada (consultation/vaccine/exam → `saude`, grooming → `higiene`, food → `alimentacao`, etc.).
- **Storage:** `pet-photos` (WebP 80%, 3 tamanhos), `avatars` (WebP 75%, 400px).
- **Push:** `vaccine_reminder`, `diary_reminder` (19h), `ai_insight`, `welcome`. CRON diário 08:00 pra alertas de vacina (push 7d e 1d antes).
- **MVP apenas tutor_owner** (sem assistentes/co-parentalidade ainda).

**Idioma da IA:** toda resposta da IA no idioma do dispositivo do tutor. Parâmetro `language` sempre vindo de `i18n.language`, nunca fixo. Edge Functions recebem e passam para o prompt como `Respond in {idioma}`.

---

## Protected files (não modificar sem autorização)

Cada um desses arquivos tem efeito em cascata. Se precisar de comportamento novo, criar arquivo SEPARADO que reuse o protegido — não mexer no original.

- `supabase/functions/classify-diary-entry/**` — motor central do diário, alimenta múltiplas features
- `supabase/functions/analyze-pet-photo/**` — análise visual com pipeline RAG
- `hooks/useDiaryEntry.ts` — orquestração offline queue + optimistic update + background IA
- `app/(app)/pet/[id]/diary/new.tsx` — fluxo de publicação do diário
- `DocumentScanner` component — timing crítico de câmera + crop + preview

**Exceção:** bug fix urgente crítico de produção — autorizado, mas documentar no commit message e CHANGELOG exatamente o que mudou e por quê.

---

## Glossary (termos do domínio)

- **Tutor** — dono do pet (usar "tutor" no UI, nunca "usuário")
- **Pet** — cão ou gato (apenas estes no MVP)
- **RAG** — Retrieval-Augmented Generation (memória vetorial por pet)
- **Narração** — texto gerado pela IA na voz do pet
- **Mood** — `ecstatic | happy | calm | tired | anxious | sad | playful | sick`
- **Health Score** — 0-100 calculado pela IA
- **Aldeia** — micro-rede solidária hiperlocal (pós-MVP, 22 tabelas, 13 telas)
- **Admirar** — reconhecimento de cuidado real (substitui o "like" tradicional)
- **Pet-Credits** — moeda solidária de reciprocidade (não é dinheiro)
- **Proof of Love** — score de cuidado ativo (none → bronze → silver → gold → diamond)
- **SOS Proxy** — compartilhamento automático de dados médicos em emergência
- **Edge Function** — função serverless Supabase (Deno runtime)
- **RLS** — Row Level Security do PostgreSQL

---

## Especialização (skills — carregadas sob demanda)

Quando a tarefa envolver um desses temas, a skill correspondente entra no contexto automaticamente:

| Skill | Quando carrega |
|---|---|
| `auexpert-design-system` | Ao mexer em cores, fontes, tipografia, botões, ícones, logo, espaçamento |
| `auexpert-ui-patterns` | Ao usar Toast/confirm, traduzir erros técnicos para o tutor, hierarquia de botões |
| `auexpert-i18n` | Ao adicionar/editar strings, estrutura de chaves, tom de voz do pet |
| `auexpert-diary-flow` | Ao trabalhar na tela de nova entrada, pipeline de publicação, cenários de input |
| `auexpert-edge-functions` | Ao escrever Edge Function (Promise.all, structured outputs, cache, timing, compressão de imagem) |
| `auexpert-architecture` | Ao organizar pastas, criar hooks, separar estado (RQ vs Zustand), escalar código |
| `auexpert-resilience` | Ao lidar com erros, offline, ErrorBoundary, NetworkGuard, PDF export |

**Docs adicionais** (carregados por referência explícita):
- `@docs/aldeia-spec.md` — spec completa da Aldeia (pós-MVP)
- `@docs/prototypes-catalog.md` — catálogo de protótipos em `docs/prototypes/`

---

## Compact Instructions

Quando compactar o contexto, **SEMPRE preservar:**

- Bug atual sob investigação + passos de reprodução
- Lista completa de arquivos modificados na sessão (paths absolutos)
- Migrations pendentes ou schema changes que ainda não tiveram `NOTIFY pgrst, 'reload schema'` aplicado
- Debug logs adicionados ao código que ainda não foram validados visualmente pelo tutor
- Decisões arquiteturais tomadas nesta sessão que ainda não entraram neste CLAUDE.md

**O resumo nunca pode dropar:**
- Regra de i18n (strings hardcoded proibidas)
- Soft delete (`is_active = false`)
- PostgREST JOIN syntax com constraint name
- Regra de `getAIConfig()` para modelo de IA
- Lista de protected files

Após compactar, sempre pedir para o Claude confirmar o estado: "Resuma onde estamos e o que vamos fazer em seguida."
