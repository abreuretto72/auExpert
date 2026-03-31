# Prompt para Claude Code — Fase 4

Copie o bloco abaixo e cole no Claude Code.

---

## PROMPT:

```
CONTEXTO: Este é o início da FASE 4 do auExpert.
As Fases 1, 2 e 3 já foram implementadas.
Leia docs/specs/fase4_plano_implementacao.md para o plano completo.

RESUMO DO QUE JÁ EXISTE (Fases 1, 2 e 3):
- Dashboard do pet com diário protagonista (Fase 1)
- Todos os 8 elementos do InputSelector funcionando (Fases 1, 2 e 3)
- classify-diary-entry com módulos: auth, media, stt, vision, classifier,
  ocr, narration, metrics, rag, save, notify, pdf
- Cards de sugestão da IA + NarrationBubble (3ª pessoa)
- Tabelas de saúde: clinical_metrics, vaccines, exams, consultations,
  medications, surgeries, allergies
- expenses + pet_expense_summary (view materializada)
- nutrition_records + pet_connections + pet_mood_logs (Fase 3)
- diary_entries.parent_entry_id (Fase 3)
- Lentes: Prontuário, Gastos, Nutrição, Amigos
- LensScreen genérico reutilizável
- useDiaryEntry hook com optimistic updates
- CRONs: check-vaccine-status + refresh-health-views

O QUE A FASE 4 ADICIONA (4 sprints):
1. Planos pet (Sprint 4.1) — 5 tipos + sugestão contextual da IA
2. Conquistas (Sprint 4.2) — badges, XP, marcos automáticos
3. Felicidade (Sprint 4.3) — gráfico de humor histórico (sem nova tabela)
4. Viagens (Sprint 4.4) — roteiros e registros de viagem

NOVAS TABELAS:
  - pet_plans (Sprint 4.1)
  - plan_claims (Sprint 4.1)
  - achievements (Sprint 4.2)
  - pet_travels (Sprint 4.4)

ALTERAÇÕES EM TABELAS EXISTENTES:
  - pets.xp_total INTEGER DEFAULT 0 (Sprint 4.2)
  - pets.level INTEGER DEFAULT 1 (Sprint 4.2)

VIEWS MATERIALIZADAS NOVAS:
  - pet_plans_summary (Sprint 4.1)
  - pet_mood_monthly (Sprint 4.3)

LENTES QUE SERÃO ATIVADAS:
  - Planos (PlansLensContent) → badge: count de planos ativos
  - Conquistas (AchievementsLensContent) → badge: count total de badges
  - Felicidade (HappinessLensContent) → badge: emoji do humor atual do pet
  - Viagens (TravelsLensContent) → badge: count de viagens

AO FINAL DA FASE 4:
  → LensGrid completo com todas as 8 lentes do spec
  → Prontuário · Nutrição · Gastos · Amigos · Conquistas · Felicidade · Viagens · Planos

---

REGRAS GERAIS (valem para TODAS as sprints):
- Narração SEMPRE em 3ª pessoa. NUNCA "Fui...", "Meu dono..."
- Preservar TUDO das Fases 1, 2 e 3 (zero regressão)
- Não remover colunas ou tabelas existentes — apenas ADD
- Soft delete com is_active (nunca DELETE físico)
- Toda tabela nova: RLS ativo + policy user_id = auth.uid()
- Toda tabela nova: user_id UUID NOT NULL REFERENCES users(id)
- Usar o hook useDiaryEntry existente (não criar hooks paralelos)
- Usar o componente LensScreen genérico para lentes novas
- Adicionar funções ao notify.ts e save.ts existentes (não reescrever)

---

NÃO EXECUTE NADA AINDA.

Primeiro confirme que entendeu respondendo:
1. Quais tabelas NOVAS precisam ser criadas na Fase 4?
2. Quais colunas novas vão para tabelas existentes?
3. Quais lentes serão ativadas? Quais ficam no LensGrid após a Fase 4?
4. Qual sprint pode ser executada SEM nova tabela?
5. O que NÃO pode quebrar das Fases 1, 2 e 3?

Depois que confirmar, eu indico qual Sprint executar primeiro.
```
