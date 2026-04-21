---
name: auexpert-diary-flow
description: Especificação do fluxo do diário inteligente do auExpert — tela unificada de nova entrada (mic auto-abrindo + anexos + "Gravar no Diário"), 4 cenários de input (voz, foto, mic, eventos automáticos), pipeline de publicação em 9 etapas, hierarquia de exclusão, regras de tamanho/humor/narração/RAG, arquivos protegidos do motor central. Use SEMPRE que o trabalho envolver a tela de nova entrada do diário, classify-diary-entry, analyze-pet-photo, hooks/useDiaryEntry, modules/lens cards, extracted_data, diary_entries, mood_logs, pipeline de pub do diário, timeline, offline queue do diário. Também quando o usuário mencionar "diário", "nova entrada", "narração", "classificador", "mood", "timeline", "lente", "module card", "trocar ração", "scanner vet". Complementa auexpert-edge-functions quando mexer nas Edge Functions.
---

# auExpert — Fluxo do Diário Inteligente

## Tela de Nova Entrada — UNIFICADA

A tela de nova entrada é UMA ÚNICA tela que substituiu o grid de 8 botões (versão antiga). Referência visual: `docs/prototypes/NovaEntradaScreen.jsx`.

```
FLUXO:
  FAB laranja (Mic) no diário
       ↓
  Tela unificada abre com mic JÁ gravando
       ↓
  Tutor fala + pode anexar foto / vídeo / som do pet / arquivo
       ↓
  Toca [Gravar no Diário] → vai pro diário IMEDIATAMENTE
       ↓
  IA processa em background (fire-and-forget)
       ↓
  Entry aparece como "processando..." → atualiza com narração + lentes
```

### Componentes obrigatórios da tela

1. **Waveform animado** — barras laranja pulsando enquanto grava; pausa quando pausado
2. **Campo de transcrição** — readonly durante gravação, editável quando pausado
3. **Botão ✏️** — pausa o mic e foca o campo para edição manual
4. **4 botões de anexo** — Foto, Vídeo, Som do pet, Arquivo
5. **Thumbnails dos anexos** — com × para remover cada um
6. **Hint roxo** — "A IA vai narrar, classificar e construir as lentes automaticamente"
7. **Botão Mic toggle** — pausar/retomar; NUNCA fecha sozinho
8. **Botão primário "Gravar no Diário"** — navega imediatamente, processa em background

### Regras da tela

- Mic abre AUTOMATICAMENTE ao entrar na tela
- Mic NUNCA fecha sozinho (sem silence detection)
- Mic pausa durante qualquer picker de mídia e retoma depois
- **[Gravar no Diário] navega imediatamente** — sem esperar IA terminar
- Botão desabilitado se sem texto E sem anexos
- Confirmar antes de voltar (←) se há conteúdo não salvo

### Hierarquia de input (AI-first, obrigatória)

```
1º  FALAR (botão grande Mic)  → STT transcreve → IA interpreta
2º  FOTO/VÍDEO (Camera)       → Vision analisa → IA gera texto
3º  DIGITAR (TextInput)        → último recurso
```

O botão "Falar" é o maior e mais proeminente. Campo de texto é visível mas secundário — a hierarquia visual guia pra voz/foto.

---

## 4 cenários de input

### Cenário 1 — Tutor conta por voz ou texto

1. Tutor fala ou digita o que aconteceu
2. Seleciona humor (6 ícones: Eufórico / Feliz / Calmo / Cansado / Ansioso / Triste)
3. IA processa em 2-5s:
   - STT transcreve (se voz)
   - Busca RAG: top 5 memórias relevantes do pet
   - Monta prompt: texto + nome/raça/idade/personalidade + humor + RAG + idioma
   - Claude API gera narração 1ª pessoa na voz do pet (máx 150 palavras)
   - Em paralelo: sugere tags, infere `mood_score` 0-100, detecta momento especial
4. Preview: texto + narração em card com borda laranja + tags + humor
5. Tutor pode: publicar, refazer narração, editar texto, mudar humor
6. Ao publicar: pipeline completo (ver abaixo)

### Cenário 2 — Tutor tira foto, IA gera tudo

1. Tutor escolhe "Foto" na tela de nova entrada
2. Claude Vision analisa: saúde visual, humor por expressão/postura, ambiente, acessórios
3. Busca RAG: últimas fotos (comparar mudanças), histórico de saúde
4. Gera automaticamente: narração do pet + humor + tags + mini-relatório de saúde
5. Tela mostra: foto + narração + achados (score, checks, warnings) + humor + tags
6. Tutor não precisa digitar — uma foto gera entrada completa

### Cenário 3 — Tutor fala no microfone

1. Toca no botão grande "Falar" → animação pulsante laranja
2. Fala naturalmente (sem formato fixo)
3. STT transcreve → IA interpreta contexto emocional
4. Sugere humor baseado no conteúdo emocional da fala
5. Narração reflete nuance (solidão, reconexão, alegria)
6. Preview → ajustes opcionais → publica

### Cenário 4 — Eventos automáticos (sem ação do tutor)

Geradas pelo sistema:

- **Vacina vencendo** — narração lembrando o tutor (7 dias antes)
- **Aniversário** — narração especial marcada como "Momento Especial"
- **Conquista desbloqueada** — badge + narração celebratória
- **Insight semanal** — resumo de atividade + humor dominante

Aparecem na timeline com badge diferenciada (IA automático vs entrada manual).

---

## Regras do diário

| Regra | Valor |
|---|---|
| Input mínimo | 3 chars (texto) ou 1 foto ou 5s áudio |
| Input máximo | 2000 caracteres |
| Fotos por entrada | Máx 5, comprimidas WebP |
| Narração IA | Máx 150 palavras, 1ª pessoa (3ª pessoa gramatical — "O Rex foi...") |
| Humor | Obrigatório (manual ou inferido por IA) |
| Tags | Sugeridas pela IA, editáveis |
| Tempo de geração | <5 segundos |
| Embedding | Gerado automaticamente ao publicar |
| RAG context | Top 5 memórias relevantes |
| Idioma | Segue `i18n.language` do dispositivo |
| Momento especial | Tutor marca OU IA detecta |
| Edição posterior | Tutor pode editar texto, narração regenera |
| Exclusão | Soft delete, embedding mantido no RAG |

---

## Pipeline de publicação (sequência)

```
1. Salva diary_entry no banco
2. Salva mood_log
3. Atualiza pets.current_mood
4. Incrementa pets.total_diary_entries
5. Comprime fotos (WebP, 3 tamanhos: thumb/medium/full)
6. Gera embedding do texto → pet_embeddings
7. Registra rag_conversation (auditoria)
8. Verifica se deve gerar insight semanal
9. Verifica se é marco para conquista
```

Etapas 5-9 em background (fire-and-forget). Navegação não espera.

---

## Arquitetura de dados do diário

**Decisões críticas** (quebrar isso = bug sutil e difícil de rastrear):

- **Lens cards usam `extracted_data` como fonte primária** — NÃO resultados de JOIN. O JOIN pode ser pulado / redundante — sempre ler do campo `extracted_data`.
- **`DIARY_MODULE_SELECT` usa `select('*')`** — sem expansões de FK. Isso evita erros silenciosos do PostgREST quando há FKs múltiplas apontando pra mesma tabela.
- **`diary_entries` tem FKs para registros linkados:** vacina, consulta, despesa, métrica de peso, medicação. Cada uma com constraint nomeada explicitamente. Ao fazer JOIN manual, usar `table!constraint_name(columns)`.
- **FKs `registered_by` / `updated_by` / `deleted_by` apontam para `public.users`**, não `auth.users`. Migrations antigas estavam erradas — corrigidas.
- **Edge Functions invocadas em background** (`generate-embedding`, `analyze-pet-photo`) precisam `verify_jwt: false` no `config.toml` — senão falham com 401.

Ao adicionar FK nova em `diary_entries`, executar `NOTIFY pgrst, 'reload schema'` depois da migration. PostgREST só reconhece relacionamentos novos após o reload.

---

## Hierarquia de exclusão — regra visual

```
Card do diário (timeline):
  ❌ SEM lixeira — apenas botão ✏️

Tela de edição (abre ao tocar ✏️):
  ✅ 🗑️ no header → exclui entry inteira (soft delete)
  ✅ 🗑️ na narração → zera ai_narration (não exclui entry)

Cada ModuleCard (lente):
  ✅ ✏️ + 🗑️ lado a lado → edita ou exclui o módulo
```

Ícone: `Trash2` (Lucide), cor `danger` (#E74C3C). Sempre soft delete (`is_active = false`). Sempre `confirm()` antes de excluir.

---

## Arquivos protegidos do diário

**NUNCA modificar sem autorização explícita** (ver CLAUDE.md seção "Protected files"):

- `supabase/functions/classify-diary-entry/**` (incluindo `modules/classifier.ts`, `modules/context.ts`, submodules)
- `supabase/functions/analyze-pet-photo/**`
- `hooks/useDiaryEntry.ts`
- `app/(app)/pet/[id]/diary/new.tsx`
- `DocumentScanner` component

### Como trabalhar em torno

Para comportamento novo que envolveria um desses:

1. **Criar Edge Function NOVA** que reusa o que o protegido produz, ou faz análise paralela especializada
2. **Criar hook NOVO** que wrap o protegido, adicionando comportamento antes/depois
3. **Criar tela NOVA** que chama Edge Function dedicada em vez do classifier genérico — ex: tela "Trocar ração" usa `classify-diary-entry` hoje, mas pode virar `extract-food-package` dedicada no futuro

**Exceção única:** bug fix urgente crítico de produção em arquivo protegido é autorizado, mas documentar no commit e CHANGELOG exatamente o que mudou e por quê.

---

## Prompts de IA — regras gerais

- **Narração do diário:** máx 150 palavras, 1ª pessoa do pet (3ª pessoa gramatical), tom varia com humor
- **Análise de foto:** JSON completo (identificação, saúde, humor, ambiente), NUNCA diagnosticar, comparar via RAG
- **Insight semanal:** máx 60 palavras, específico, acionável
- **Modelo:** sempre via `getAIConfig(supabase)` — nunca hardcoded (ver `auexpert-edge-functions`)
- **Idioma:** sempre do dispositivo (ver `auexpert-i18n`)
