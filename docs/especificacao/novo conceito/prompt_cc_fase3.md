# Prompt para Claude Code — Fase 3

Copie o bloco abaixo e cole no Claude Code.

---

## PROMPT:

```
CONTEXTO: Este é o início da FASE 3 do auExpert.
A Fase 1 (conceito Diário-cêntrico) e a Fase 2 (Galeria + Scanner + Prontuário + Gastos) já foram implementadas.
Leia docs/specs/fase3_plano_implementacao.md para o plano completo.

RESUMO DO QUE JÁ EXISTE (Fases 1 e 2):
- Dashboard do pet com diário protagonista (Fase 1)
- InputSelector com Foto, Falar, Escrever, Galeria e Scanner funcionando
- classify-diary-entry (Edge Function) com módulos: auth, media, stt, vision, classifier, ocr, narration, metrics, rag, save, notify
- Cards de sugestão da IA + NarrationBubble (3ª pessoa)
- Tabelas: clinical_metrics, app_config, metric_references, expenses, consultations, medications, exams, surgeries
- useDiaryEntry hook com optimistic updates
- Timeline com narração, tags e humor
- Lente Prontuário (vacinas, exames, consultas, métricas, gráficos)
- Lente Gastos (resumo mensal, barras por categoria, OCR de nota fiscal)
- LensScreen genérico reutilizável
- diary_entries.parent_entry_id (adicionado na Sprint 3.1)

O QUE A FASE 3 ADICIONA (5 sprints):
1. Documento (Sprint 3.1) — upload PDF, importação em lote de histórico
2. Vídeo (Sprint 3.2) — gravação 60s + análise de locomoção IA
3. Ouvir (Sprint 3.3) — gravação 30s + análise emocional de latido/miado
4. Nutrição (Sprint 3.4) — lente com ração atual, suplementos, petiscos, intolerâncias
5. Amigos (Sprint 3.5) — grafo social do pet com contagem de encontros

NOVAS TABELAS:
  - pet_mood_logs (Sprint 3.3)
  - nutrition_records (Sprint 3.4)
  - pet_connections (Sprint 3.5)

NOVOS ELEMENTOS DE ENTRADA ATIVADOS:
  - Documento → pdf_upload
  - Vídeo → video
  - Ouvir → pet_audio

LENTES NOVAS:
  - Nutrição (NutritionLensContent)
  - Amigos (FriendsLensContent)

---

REGRAS GERAIS (valem para TODAS as sprints):
- Narração SEMPRE em 3ª pessoa. NUNCA "Fui...", "Meu dono..."
- Preservar TUDO das Fases 1 e 2 (zero regressão)
- Não remover colunas ou tabelas existentes
- Usar is_active (não is_deleted) para soft delete
- Toda tabela nova: RLS ativo + policy user_id = auth.uid()
- Toda tabela nova: user_id UUID NOT NULL REFERENCES users(id)
- Usar o hook useDiaryEntry existente (não criar hooks paralelos)
- Usar o componente LensScreen genérico para lentes novas
- Usar o módulo save.ts existente (adicionar funções, não reescrever)

---

NÃO EXECUTE NADA AINDA.

Primeiro confirme que entendeu respondendo:
1. Quais tabelas NOVAS precisam ser criadas na Fase 3?
2. Quais botões do InputSelector serão ativados?
3. Quais lentes serão funcionais após a Fase 3?
4. Qual campo novo vai para diary_entries?
5. O que NÃO pode quebrar das Fases 1 e 2?

Depois que confirmar, eu indico qual Sprint executar primeiro.
```
