# auExpert — Fase 4: Planos + Conquistas + Felicidade + Viagens
# Data: 31/03/2026
# Pré-requisito: Fase 3 concluída (Documento + Vídeo + Ouvir + Nutrição + Amigos)

---

## 1. VISÃO GERAL

A Fase 3 completou todos os 8 elementos de entrada e adicionou as lentes Nutrição e Amigos.
A Fase 4 fecha o ciclo de valor do pet com as 4 lentes restantes: Planos, Conquistas, Felicidade e Viagens.

```
FASE 3 (concluída):                      FASE 4 (esta):
  ✓ Documento (upload PDF)                Planos pet (5 tipos)
  ✓ Vídeo (gravação + análise IA)         Conquistas (badges, XP, marcos)
  ✓ Ouvir (som do pet)                    Felicidade (gráfico emocional)
  ✓ Lente Nutrição                        Viagens (roteiros pet-friendly)
  ✓ Lente Amigos                          Sugestão contextual de planos pela IA
  ✓ pet_mood_logs + nutrition_records     pet_plans + plan_claims
  ✓ pet_connections                       achievements + pet_travels
```

Ao final da Fase 4, o LensGrid estará completo com todas as 8 lentes do spec:
Prontuário · Nutrição · Gastos · Amigos · Conquistas · Felicidade · Viagens · Planos

---

## 2. OS 4 SPRINTS

```
Sprint 4.1 — PLANOS PET (5 tipos + sugestão contextual da IA)
Sprint 4.2 — CONQUISTAS (badges, XP, marcos automáticos)
Sprint 4.3 — FELICIDADE (lente de humor com gráfico de tendência)
Sprint 4.4 — VIAGENS (roteiros, registros e locais pet-friendly)
```

---

## 3. SPRINT 4.1 — PLANOS PET

### Objetivo: Criar tabelas pet_plans e plan_claims + lente Planos + sugestão contextual da IA baseada em gatilhos do diário.

### 3.1 Por que Planos é prioridade #1 da Fase 4

Planos é a funcionalidade com maior potencial de monetização e maior impacto para o tutor:
- Um único gasto alto de cirurgia pode motivar contratação de seguro imediatamente
- A IA conhece todo o histórico financeiro do pet (via Gastos) e de saúde (via Prontuário)
- Nenhum concorrente sugere plano baseado em contexto real do pet

Além disso, o spec já define tabelas completas — é a sprint com menos trabalho de design.

### 3.2 CREATE TABLE pet_plans

```sql
-- ============================================================
-- SPRINT 4.1 — pet_plans e plan_claims
-- REGRA: RLS ativo + user_id em todas as tabelas
-- ============================================================

CREATE TABLE IF NOT EXISTS pet_plans (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id            UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    user_id           UUID NOT NULL REFERENCES users(id),
    diary_entry_id    UUID REFERENCES diary_entries(id),  -- entrada que originou o plano
    plan_type         VARCHAR(20) NOT NULL
                      CHECK (plan_type IN (
                        'health',       -- Rotina + prevenção: consultas, vacinas, exames
                        'insurance',    -- Emergências: cirurgias, internação, acidentes
                        'funeral',      -- Pós-vida: cremação, sepultamento, cerimônia
                        'assistance',   -- Benefícios: banho/tosa, hotel, televet 24h
                        'emergency'     -- Urgência: ambulância 24h, primeiros socorros
                      )),
    provider_name     VARCHAR(100) NOT NULL,  -- "Porto Seguro Pet", "VetAmigo", "Memorial Pet"
    plan_name         VARCHAR(100),           -- "Plano Ouro", "Básico", "Premium"
    monthly_cost      DECIMAL(10,2),          -- R$ 89,00
    coverage_limit    DECIMAL(10,2),          -- R$ 15.000,00 (para seguros)
    start_date        DATE NOT NULL,
    end_date          DATE,                   -- NULL = vigente
    renewal_date      DATE,
    status            VARCHAR(20) DEFAULT 'active'
                      CHECK (status IN ('active','expired','cancelled','pending')),
    coverage_details  JSONB DEFAULT '{}',     -- Detalhes de cobertura
    documents         TEXT[] DEFAULT '{}',    -- URLs de apólice e contrato
    source            VARCHAR(20) DEFAULT 'manual'
                      CHECK (source IN ('manual','ocr','voice','ai_suggestion')),
    notes             TEXT,
    is_active         BOOLEAN DEFAULT TRUE,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_plans_pet ON pet_plans(pet_id);
CREATE INDEX idx_plans_type ON pet_plans(plan_type);
CREATE INDEX idx_plans_active ON pet_plans(pet_id, status) WHERE status = 'active';
CREATE INDEX idx_plans_renewal ON pet_plans(renewal_date) WHERE renewal_date IS NOT NULL;

ALTER TABLE pet_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY plans_own ON pet_plans
  FOR ALL USING (user_id = auth.uid());
```

### 3.3 CREATE TABLE plan_claims

```sql
CREATE TABLE IF NOT EXISTS plan_claims (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id               UUID NOT NULL REFERENCES pet_plans(id) ON DELETE CASCADE,
    pet_id                UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    user_id               UUID NOT NULL REFERENCES users(id),
    claim_type            VARCHAR(30) NOT NULL,
                          -- "surgery","emergency","routine","cremation","grooming","exam","hospitalization"
    description           TEXT NOT NULL,
    amount                DECIMAL(10,2),         -- Valor do sinistro
    reimbursed            DECIMAL(10,2),          -- Valor reembolsado pelo plano
    status                VARCHAR(20) DEFAULT 'pending'
                          CHECK (status IN ('pending','approved','denied','partial','completed')),
    date                  DATE NOT NULL DEFAULT CURRENT_DATE,
    linked_expense_id     UUID REFERENCES expenses(id),
    linked_consultation_id UUID REFERENCES consultations(id),
    documents             TEXT[] DEFAULT '{}',
    notes                 TEXT,
    is_active             BOOLEAN DEFAULT TRUE,
    created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_claims_plan ON plan_claims(plan_id);
CREATE INDEX idx_claims_pet ON plan_claims(pet_id);
CREATE INDEX idx_claims_status ON plan_claims(status);

ALTER TABLE plan_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY claims_own ON plan_claims
  FOR ALL USING (user_id = auth.uid());

-- View materializada: resumo de planos por pet (para o badge da lente)
CREATE MATERIALIZED VIEW IF NOT EXISTS pet_plans_summary AS
SELECT
  pp.pet_id,
  COUNT(*) FILTER (WHERE pp.status = 'active') AS active_plans_count,
  SUM(pp.monthly_cost) FILTER (WHERE pp.status = 'active') AS total_monthly_cost,
  COUNT(pc.id) AS total_claims,
  SUM(pc.reimbursed) AS total_reimbursed,
  MIN(pp.renewal_date) FILTER (WHERE pp.renewal_date >= CURRENT_DATE) AS next_renewal
FROM pet_plans pp
LEFT JOIN plan_claims pc ON pc.plan_id = pp.id AND pc.status IN ('approved','completed')
WHERE pp.is_active = TRUE
GROUP BY pp.pet_id;

CREATE UNIQUE INDEX idx_plans_summary ON pet_plans_summary(pet_id);
```

### 3.4 Lente Planos

```
PLANOS DO REX

┌──────────────────────────────────┐
│ Saúde · VetAmigo Básico         │
│ R$ 89/mês · Vigente até 03/2027 │
│ Consultas ✓  Vacinas ✓  Exames ✓│
│ Usado: 3x este ano              │
│ Economia: R$ 420                │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ Seguro · Porto Seguro Pet Ouro  │
│ R$ 120/mês · Cobertura R$15.000 │
│ Cirurgias ✓  Internação ✓       │
│ Usado: 1x (cirurgia R$ 2.800)  │
└──────────────────────────────────┘

┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐
│ IA sugere: Plano Emergencial    │
│ Rex teve 3 emergências em 6    │
│ meses. SOS Pet R$29/mês.       │
│ [Ver opções]                   │
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘

Resumo financeiro:
  Total planos: R$ 209/mês
  Economia estimada: R$ 420/ano
  ROI: planos se pagam em 6 meses
```

### 3.5 Componente PlansLensContent

```typescript
// components/lenses/PlansLensContent.tsx

export function PlansLensContent({ petId }) {
  const { data } = useQuery({
    queryKey: ['plans', petId],
    queryFn: () => fetchPlansData(petId),
    staleTime: 24 * 60 * 60 * 1000,  // 24h — planos mudam raramente
  });

  return (
    <ScrollView>
      {/* Resumo financeiro */}
      <PlansSummaryCard
        totalMonthly={data?.totalMonthlyCost}
        totalReimbursed={data?.totalReimbursed}
        roi={data?.roi}
      />

      {/* Planos ativos */}
      {data?.activePlans.map(plan => (
        <PlanCard key={plan.id} plan={plan} />
      ))}

      {/* Sugestão IA (quando existe) */}
      {data?.aiSuggestion && (
        <PlanSuggestionCard suggestion={data.aiSuggestion} />
      )}

      {/* Histórico: planos expirados/cancelados */}
      {data?.inactivePlans.length > 0 && (
        <PlanHistorySection plans={data.inactivePlans} />
      )}
    </ScrollView>
  );
}
```

### 3.6 Sugestão contextual da IA (gatilhos do diário)

Adicionar ao `modules/notify.ts` da Edge Function `classify-diary-entry`:

```typescript
// modules/notify.ts — sugestão de planos baseada em contexto

async function checkPlanSuggestion(petId, userId, classifications, petProfile) {

  // Gatilho 1: gasto alto de saúde (cirurgia > R$ 500)
  const expense = classifications.find(c => c.type === 'expense');
  if (expense?.extracted_data?.amount > 500 && expense?.extracted_data?.category === 'health') {
    await createPlanSuggestion(petId, userId, {
      plan_type: 'insurance',
      reason: `Rex gastou R$ ${expense.extracted_data.amount} em saúde. Um seguro pet pode cobrir até R$15.000.`,
      trigger: 'high_health_expense',
    });
  }

  // Gatilho 2: pet sênior (8+ anos)
  if (petProfile.age_years >= 8 && !hasPlan(petId, 'health')) {
    await createPlanSuggestion(petId, userId, {
      plan_type: 'health',
      reason: `${petProfile.name} está na fase sênior. Exames preventivos ficam mais frequentes. Um plano de saúde pode economizar 40%.`,
      trigger: 'senior_pet',
    });
  }

  // Gatilho 3: 3+ emergências em 6 meses
  const recentEmergencies = await countRecentEmergencies(petId, 6);
  if (recentEmergencies >= 3 && !hasPlan(petId, 'emergency')) {
    await createPlanSuggestion(petId, userId, {
      plan_type: 'emergency',
      reason: `${petProfile.name} teve ${recentEmergencies} emergências em 6 meses. Um plano emergencial garante ambulância 24h.`,
      trigger: 'multiple_emergencies',
    });
  }

  // Gatilho 4: 3+ viagens em 6 meses
  const recentTravels = await countRecentTravels(petId, 6);
  if (recentTravels >= 3 && !hasPlan(petId, 'assistance')) {
    await createPlanSuggestion(petId, userId, {
      plan_type: 'assistance',
      reason: `Você viajou ${recentTravels}x com ${petProfile.name} este semestre. Um plano de assistência inclui hotel pet e transporte.`,
      trigger: 'frequent_traveler',
    });
  }

  // Gatilho 5: pet completou 10 anos
  if (petProfile.age_years >= 10 && !hasPlan(petId, 'funeral')) {
    await createPlanSuggestion(petId, userId, {
      plan_type: 'funeral',
      reason: `${petProfile.name} completou 10 anos! É hora de pensar no futuro com carinho.`,
      trigger: 'senior_decade',
    });
  }
}
```

### 3.7 Notificações de renovação (CRON check-vaccine-status)

Adicionar ao CRON existente `check-vaccine-status`:

```typescript
// Dentro de check-vaccine-status/index.ts — adicionar verificação de renovação

async function checkPlanRenewals() {
  const in30days = new Date();
  in30days.setDate(in30days.getDate() + 30);

  const { data: renewals } = await supabase
    .from('pet_plans')
    .select('*, pets(name, user_id)')
    .eq('status', 'active')
    .eq('is_active', true)
    .lte('renewal_date', in30days.toISOString().slice(0, 10))
    .gte('renewal_date', new Date().toISOString().slice(0, 10));

  for (const plan of renewals) {
    await sendPushNotification(plan.pets.user_id, {
      title: `Plano do ${plan.pets.name} renova em breve`,
      body: `${plan.provider_name} · R$${plan.monthly_cost}/mês · ${plan.renewal_date}`,
    });
  }
}
```

### 3.8 Checklist Sprint 4.1

```
[ ] CREATE TABLE pet_plans + RLS
[ ] CREATE TABLE plan_claims + RLS
[ ] CREATE MATERIALIZED VIEW pet_plans_summary
[ ] Adicionar 'plan' e 'insurance' ao prompt do classify-diary-entry
[ ] saveToModule() para pet_plans
[ ] Sugestão contextual em modules/notify.ts (5 gatilhos)
[ ] Ativar lente Planos no LensGrid com badge (count de planos ativos)
[ ] Criar PlansLensContent com PlanCard, PlansSummaryCard, PlanSuggestionCard
[ ] Criar PlanCard com tipo, provedor, custo, cobertura, uso e economia
[ ] Criar PlansSummaryCard com total mensal + economia + ROI
[ ] Criar PlanSuggestionCard (card tracejado para sugestão da IA)
[ ] Adicionar checkPlanRenewals() ao CRON check-vaccine-status
[ ] Integração com Gastos: mensalidade do plano → gasto recorrente (categoria: insurance)
[ ] Testar: scanner de apólice → plano registrado com OCR
[ ] Testar: voz "contratei seguro Porto Seguro" → plano salvo
[ ] Testar: gasto de cirurgia R$2.800 → sugestão de seguro aparece
[ ] Testar: plano com renewal_date em 25 dias → notificação enviada
[ ] Testar: lente Planos mostra resumo financeiro correto
[ ] Testar: ROI calculado corretamente (total_reimbursed vs total_monthly_cost)
```

---

## 4. SPRINT 4.2 — CONQUISTAS

### Objetivo: Criar tabela achievements + sistema de detecção automática pela IA + lente Conquistas com badges e XP.

### 4.1 Por que Conquistas é o motor de retenção

Conquistas transformam o uso do app em um loop de recompensa:
- Cada nova feature usada pela primeira vez gera um badge
- Marcos do pet (primeiro aniversário, 100 entradas) viram comemorações
- O tutor sente que o app reconhece seu esforço e cuidado
- XP e nível criam progressão infinita que incentiva uso contínuo

Diferente de gamificação forçada, as conquistas do auExpert são 100% baseadas em comportamento real — nunca pedem que o tutor faça algo artificial.

### 4.2 CREATE TABLE achievements

```sql
CREATE TABLE IF NOT EXISTS achievements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id          UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id),
    diary_entry_id  UUID REFERENCES diary_entries(id),   -- entrada que desbloqueou
    achievement_key VARCHAR(50) NOT NULL,                 -- identificador único do badge
    title           VARCHAR(100) NOT NULL,                -- "Memória Viva"
    description     TEXT NOT NULL,                        -- "100 entradas no diário do Rex"
    category        VARCHAR(20) NOT NULL
                    CHECK (category IN (
                      'diary',      -- uso do diário
                      'health',     -- saúde e prevenção
                      'social',     -- amigos e conexões
                      'financial',  -- controle de gastos
                      'travel',     -- viagens
                      'milestone',  -- marcos do pet (idade, tempo de uso)
                      'special'     -- conquistas raras
                    )),
    xp_reward       INTEGER NOT NULL DEFAULT 10,          -- XP ganho
    rarity          VARCHAR(10) DEFAULT 'common'
                    CHECK (rarity IN ('common','rare','epic','legendary')),
    icon_name       VARCHAR(50),                          -- nome do ícone Lucide
    unlocked_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(pet_id, achievement_key)                       -- cada conquista 1x por pet
);

CREATE INDEX idx_achievements_pet ON achievements(pet_id);
CREATE INDEX idx_achievements_category ON achievements(category);
CREATE INDEX idx_achievements_unlocked ON achievements(pet_id, unlocked_at DESC);

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY achievements_own ON achievements
  FOR ALL USING (user_id = auth.uid());

-- XP acumulado e nível do pet (coluna na tabela pets ou view separada)
-- Adicionar à tabela pets (se não existir):
ALTER TABLE pets ADD COLUMN IF NOT EXISTS xp_total INTEGER DEFAULT 0;
ALTER TABLE pets ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;

-- Trigger: ao inserir achievement, incrementa XP do pet e recalcula nível
CREATE OR REPLACE FUNCTION increment_pet_xp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE pets
  SET
    xp_total = xp_total + NEW.xp_reward,
    level = CASE
      WHEN (xp_total + NEW.xp_reward) >= 5000 THEN 10
      WHEN (xp_total + NEW.xp_reward) >= 3000 THEN 9
      WHEN (xp_total + NEW.xp_reward) >= 2000 THEN 8
      WHEN (xp_total + NEW.xp_reward) >= 1500 THEN 7
      WHEN (xp_total + NEW.xp_reward) >= 1000 THEN 6
      WHEN (xp_total + NEW.xp_reward) >= 700  THEN 5
      WHEN (xp_total + NEW.xp_reward) >= 400  THEN 4
      WHEN (xp_total + NEW.xp_reward) >= 200  THEN 3
      WHEN (xp_total + NEW.xp_reward) >= 80   THEN 2
      ELSE 1
    END
  WHERE id = NEW.pet_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_increment_xp
  AFTER INSERT ON achievements
  FOR EACH ROW EXECUTE FUNCTION increment_pet_xp();
```

### 4.3 Catálogo de conquistas

```typescript
// lib/ai/achievements.ts — catálogo completo de conquistas

export const ACHIEVEMENT_CATALOG = [

  // DIÁRIO
  { key: 'first_entry',        title: 'Primeiro Registro',     category: 'diary',     xp: 10,  rarity: 'common',    desc: 'Criou a primeira entrada no diário', condition: 'diary_count >= 1' },
  { key: 'diary_10',           title: 'Contador Iniciante',    category: 'diary',     xp: 20,  rarity: 'common',    desc: '10 entradas no diário', condition: 'diary_count >= 10' },
  { key: 'diary_50',           title: 'Cronista Dedicado',     category: 'diary',     xp: 50,  rarity: 'rare',      desc: '50 entradas no diário', condition: 'diary_count >= 50' },
  { key: 'diary_100',          title: 'Memória Viva',          category: 'diary',     xp: 100, rarity: 'epic',      desc: '100 entradas no diário', condition: 'diary_count >= 100' },
  { key: 'diary_365',          title: 'Um Ano de Histórias',   category: 'diary',     xp: 300, rarity: 'legendary', desc: '365 entradas no diário', condition: 'diary_count >= 365' },
  { key: 'first_photo',        title: 'Fotógrafo Estreante',   category: 'diary',     xp: 15,  rarity: 'common',    desc: 'Primeira foto tirada pelo app', condition: 'photo_count >= 1' },
  { key: 'photo_10',           title: 'Fotógrafo Iniciante',   category: 'diary',     xp: 30,  rarity: 'common',    desc: '10 fotos classificadas pela IA', condition: 'photo_count >= 10' },
  { key: 'photo_50',           title: 'Scanner Pro',           category: 'diary',     xp: 75,  rarity: 'rare',      desc: '50 fotos e documentos classificados', condition: 'photo_count >= 50' },
  { key: 'first_voice',        title: 'Primeira Voz',          category: 'diary',     xp: 15,  rarity: 'common',    desc: 'Primeiro registro por voz', condition: 'voice_count >= 1' },
  { key: 'first_video',        title: 'Diretor Estreante',     category: 'diary',     xp: 20,  rarity: 'common',    desc: 'Primeiro vídeo gravado', condition: 'video_count >= 1' },
  { key: 'first_pdf',          title: 'Importador',            category: 'diary',     xp: 25,  rarity: 'common',    desc: 'Primeiro prontuário importado em PDF', condition: 'pdf_count >= 1' },
  { key: 'all_input_types',    title: 'Explorador Completo',   category: 'diary',     xp: 100, rarity: 'epic',      desc: 'Usou todos os 8 tipos de entrada', condition: 'all_input_types_used' },
  { key: 'streak_7',           title: '7 Dias Seguidos',       category: 'diary',     xp: 50,  rarity: 'rare',      desc: '7 dias consecutivos com registro', condition: 'streak >= 7' },
  { key: 'streak_30',          title: 'Hábito Formado',        category: 'diary',     xp: 200, rarity: 'epic',      desc: '30 dias consecutivos com registro', condition: 'streak >= 30' },

  // SAÚDE
  { key: 'first_vaccine_scan',  title: 'Prontuário Inteligente', category: 'health', xp: 30,  rarity: 'common',    desc: 'Registrou vacina via foto da carteirinha', condition: 'vaccine_ocr_count >= 1' },
  { key: 'vaccines_complete',   title: 'Prontuário Completo',    category: 'health', xp: 100, rarity: 'epic',      desc: 'Todas as vacinas registradas via foto', condition: 'all_vaccines_via_ocr' },
  { key: 'first_exam_import',   title: 'Laudos Digitais',        category: 'health', xp: 30,  rarity: 'common',    desc: 'Importou primeiro resultado de exame', condition: 'exam_count >= 1' },
  { key: 'health_score_90',     title: 'Pet Saudável',           category: 'health', xp: 75,  rarity: 'rare',      desc: 'Health score IA acima de 90 por 30 dias', condition: 'health_score_90_for_30d' },
  { key: 'first_weight',        title: 'Peso Registrado',        category: 'health', xp: 10,  rarity: 'common',    desc: 'Primeiro registro de peso', condition: 'weight_count >= 1' },
  { key: 'weight_12_months',    title: 'Evolução Completa',      category: 'health', xp: 100, rarity: 'epic',      desc: '12 meses de peso registrado', condition: 'weight_months >= 12' },

  // SOCIAL
  { key: 'first_friend',        title: 'Primeiro Amigo',         category: 'social',  xp: 15,  rarity: 'common',    desc: 'Primeiro amigo registrado no diário', condition: 'friends_count >= 1' },
  { key: 'friends_5',           title: 'Pet Popular',            category: 'social',  xp: 50,  rarity: 'rare',      desc: '5 amigos diferentes registrados', condition: 'friends_count >= 5' },
  { key: 'best_friend',         title: 'Melhor Amigo',           category: 'social',  xp: 75,  rarity: 'rare',      desc: 'Mesmo pet registrado 8+ vezes', condition: 'max_friend_meets >= 8' },
  { key: 'social_butterfly',    title: 'Muito Sociável',         category: 'social',  xp: 100, rarity: 'epic',      desc: '10 amigos diferentes registrados', condition: 'friends_count >= 10' },

  // FINANCEIRO
  { key: 'first_expense',       title: 'Primeiro Gasto',         category: 'financial', xp: 10, rarity: 'common',  desc: 'Primeiro gasto registrado', condition: 'expense_count >= 1' },
  { key: 'expense_10',          title: 'Contador do Rex',        category: 'financial', xp: 30, rarity: 'common',  desc: '10 gastos registrados', condition: 'expense_count >= 10' },
  { key: 'first_invoice_scan',  title: 'Nota Fiscal Scanner',    category: 'financial', xp: 25, rarity: 'common',  desc: 'Primeiro gasto via scanner de nota fiscal', condition: 'invoice_ocr_count >= 1' },
  { key: 'plan_roi_positive',   title: 'Investimento Inteligente', category: 'financial', xp: 75, rarity: 'rare',  desc: 'Plano pet se pagou (reembolso > mensalidades)', condition: 'plan_roi > 1.0' },

  // VIAGENS
  { key: 'first_travel',        title: 'Primeira Aventura',      category: 'travel',  xp: 25,  rarity: 'common',   desc: 'Primeira viagem registrada com o pet', condition: 'travel_count >= 1' },
  { key: 'travel_5',            title: 'Pet Viajante',           category: 'travel',  xp: 75,  rarity: 'rare',     desc: '5 viagens diferentes registradas', condition: 'travel_count >= 5' },
  { key: 'travel_10',           title: 'Explorador Aventureiro', category: 'travel',  xp: 150, rarity: 'epic',     desc: '10 viagens registradas', condition: 'travel_count >= 10' },
  { key: 'multi_city',          title: 'Pet Cosmopolita',        category: 'travel',  xp: 100, rarity: 'epic',     desc: 'Visitou 5 cidades diferentes', condition: 'unique_cities >= 5' },

  // MARCOS DO PET
  { key: 'pet_birthday_1',      title: '1 Ano Juntos',           category: 'milestone', xp: 100, rarity: 'epic',   desc: '1 ano de diário ativo', condition: 'diary_age_months >= 12' },
  { key: 'first_trick',         title: 'Talento Descoberto',     category: 'milestone', xp: 50,  rarity: 'rare',   desc: 'Primeiro truque ou habilidade registrado', condition: 'achievement_classification >= 1' },
  { key: 'anxiety_improvement', title: 'Mais Tranquilo',         category: 'milestone', xp: 75,  rarity: 'rare',   desc: 'Ansiedade reduziu 50% comparado ao mês anterior', condition: 'anxiety_reduction >= 0.5' },

  // ESPECIAIS
  { key: 'early_adopter',       title: 'Pioneiro',               category: 'special', xp: 200, rarity: 'legendary', desc: 'Um dos primeiros tutores do auExpert', condition: 'user_created_before_launch' },
];
```

### 4.4 Detecção automática de conquistas

```typescript
// modules/notify.ts — detecção de conquistas após cada entrada

async function checkAchievements(petId, userId, diaryEntryId, classifications) {

  const stats = await getPetStats(petId);  // Busca contagens do pet
  const unlocked = await getUnlockedAchievements(petId);  // Evita duplicatas

  const toUnlock = ACHIEVEMENT_CATALOG.filter(achievement => {
    if (unlocked.includes(achievement.key)) return false;  // Já tem
    return evaluateCondition(achievement.condition, stats);  // Avalia condição
  });

  for (const achievement of toUnlock) {
    await supabase.from('achievements').insert({
      pet_id: petId,
      user_id: userId,
      diary_entry_id: diaryEntryId,
      achievement_key: achievement.key,
      title: achievement.title,
      description: achievement.desc,
      category: achievement.category,
      xp_reward: achievement.xp,
      rarity: achievement.rarity,
      icon_name: achievement.icon,
    });

    // Notificar o tutor imediatamente
    await sendPushNotification(userId, {
      title: `Conquista desbloqueada!`,
      body: `${achievement.title} · +${achievement.xp} XP`,
    });
  }
}
```

### 4.5 Lente Conquistas

```
CONQUISTAS DO REX

Nível 5 · 700 XP  ████████████░░░░ 850 para nível 6

Badges (18 de 42):

  DIÁRIO (8)          SAÚDE (4)          SOCIAL (3)
  ✅ Primeiro Reg.   ✅ Pront. Intelig.  ✅ Primeiro Amigo
  ✅ Memória Viva     ✅ Laudos Digitais  ✅ Pet Popular
  ✅ Fotógrafo Init.  ✅ Peso Registrado  ✅ Melhor Amigo
  ✅ Scanner Pro      ✅ Pet Saudável
  ✅ Primeira Voz     🔒 Pront. Completo
  ✅ Diretor Estr.    🔒 Evolução Comp.
  ✅ 7 Dias Seguidos
  🔒 Hábito Formado

  FINANCEIRO (2)      VIAGENS (1)        MARCOS (1)
  ✅ Primeiro Gasto   ✅ 1ª Aventura     ✅ 1 Ano Juntos
  ✅ NF Scanner       🔒 Pet Viajante
  🔒 Invest. Intelig. 🔒 Explorador Av.

Recentes:
  🏆 Memória Viva · ontem · +100 XP
  🏆 Pet Popular · 3 dias atrás · +50 XP
```

### 4.6 Componente AchievementsLensContent

```typescript
// components/lenses/AchievementsLensContent.tsx

export function AchievementsLensContent({ petId }) {
  const { data } = useQuery({
    queryKey: ['achievements', petId],
    queryFn: () => fetchAchievements(petId),
    staleTime: 10 * 60 * 1000,
  });

  return (
    <ScrollView>
      {/* Nível e barra de XP */}
      <XPProgressBar
        level={data?.level}
        xpCurrent={data?.xpTotal}
        xpNext={data?.xpForNextLevel}
      />

      {/* Conquistas recentes */}
      <RecentAchievements achievements={data?.recent} />

      {/* Grade por categoria */}
      {CATEGORIES.map(cat => (
        <AchievementCategory
          key={cat}
          category={cat}
          achievements={data?.byCagory[cat]}
        />
      ))}
    </ScrollView>
  );
}
```

### 4.7 Checklist Sprint 4.2

```
[ ] CREATE TABLE achievements + RLS
[ ] ALTER TABLE pets ADD COLUMN xp_total, level
[ ] CREATE TRIGGER trg_increment_xp
[ ] Criar catálogo ACHIEVEMENT_CATALOG (35 conquistas)
[ ] checkAchievements() em modules/notify.ts
[ ] evaluateCondition() para cada tipo de condição
[ ] getPetStats() com todas as contagens necessárias
[ ] Notificação push ao desbloquear conquista
[ ] Ativar lente Conquistas no LensGrid com badge (count total)
[ ] Criar AchievementsLensContent com grade por categoria
[ ] Criar XPProgressBar com nível e barra de progresso
[ ] Criar AchievementBadge (desbloqueado vs cadeado)
[ ] Criar RecentAchievements (3 últimas com data e XP)
[ ] Testar: 10ª entrada → "Contador Iniciante" desbloqueado
[ ] Testar: 1ª foto classificada → "Fotógrafo Estreante" desbloqueado
[ ] Testar: XP incrementado corretamente via trigger
[ ] Testar: nível sobe quando XP cruza threshold
[ ] Testar: conquista não duplicada (UNIQUE constraint)
[ ] Testar: notificação push enviada ao desbloquear
[ ] Testar: lente Conquistas mostra badges bloqueados em cinza
```

---

## 5. SPRINT 4.3 — FELICIDADE

### Objetivo: Ativar lente Felicidade com gráfico emocional histórico, tendências e humor médio — alimentado pelos dados já coletados nas Fases 1-3.

### 5.1 Por que Felicidade já tem dados para exibir

Esta é a única lente da Fase 4 que NÃO precisa de nova tabela. Os dados já existem:

- `diary_entries.mood` → humor de cada entrada (Fases 1+)
- `pet_mood_logs` → histórico emocional detalhado (Sprint 3.3)
- `diary_entries.pet_audio_analysis` → emoções detectadas por som
- `diary_entries.video_analysis` → emoções detectadas por vídeo

A lente Felicidade apenas organiza e visualiza o que já foi coletado.

### 5.2 View materializada de humor mensal

```sql
-- View materializada para o gráfico de felicidade
CREATE MATERIALIZED VIEW IF NOT EXISTS pet_mood_monthly AS
SELECT
  de.pet_id,
  date_trunc('month', de.created_at) AS month,
  de.mood,
  COUNT(*) AS count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (
    PARTITION BY de.pet_id, date_trunc('month', de.created_at)
  ), 1) AS percentage
FROM diary_entries de
WHERE de.mood IS NOT NULL
  AND de.is_active = TRUE
GROUP BY de.pet_id, date_trunc('month', de.created_at), de.mood;

CREATE UNIQUE INDEX idx_mood_monthly ON pet_mood_monthly(pet_id, month, mood);

-- Adicionar ao CRON refresh-health-views:
-- REFRESH MATERIALIZED VIEW CONCURRENTLY pet_mood_monthly;
```

### 5.3 Lente Felicidade

```
FELICIDADE DO REX · Março/2026

Score de Humor: 78/100  📈 +12% vs fevereiro

┌──────────────────────────────────┐
│ 😊 Feliz    ████████████░░ 65%  │
│ 😌 Calmo    ██████░░░░░░░░ 20%  │
│ 😰 Ansioso  ████░░░░░░░░░░ 10%  │
│ 😴 Cansado  ██░░░░░░░░░░░░  5%  │
└──────────────────────────────────┘

Evolução dos últimos 6 meses:
  Fev ████████░░ 66% feliz
  Mar ████████░░ 65% feliz  ← atual
  Abr ? (em andamento)

Momentos mais felizes:
  • Passeios no parque (Sab/Dom)
  • Brincadeiras com o Thor
  • Entrada pelo portão (horário 18h)

Alertas de tendência:
  ⚠️ Ansiedade às 14-16h (3ª semana)
     Possível: solidão no horário de trabalho
     Dica: brinquedo interativo
```

### 5.4 Componente HappinessLensContent

```typescript
// components/lenses/HappinessLensContent.tsx

export function HappinessLensContent({ petId }) {
  const [period, setPeriod] = useState<'30d' | '3m' | '6m' | '1y'>('30d');

  const { data } = useQuery({
    queryKey: ['happiness', petId, period],
    queryFn: () => fetchHappinessData(petId, period),
    staleTime: 30 * 60 * 1000,
  });

  return (
    <ScrollView>
      {/* Score de humor atual */}
      <MoodScoreCard
        score={data?.currentScore}
        trend={data?.trendPercent}
        dominantMood={data?.dominantMood}
      />

      {/* Distribuição de humores do período */}
      <MoodDistributionBars moods={data?.distribution} />

      {/* Seletor de período */}
      <PeriodSelector period={period} onChange={setPeriod} />

      {/* Gráfico de linha: humor médio ao longo do tempo */}
      <MoodTrendChart dataPoints={data?.monthlyTrend} />

      {/* Padrões detectados pela IA */}
      {data?.patterns.length > 0 && (
        <MoodPatternsCard patterns={data?.patterns} />
      )}

      {/* Alertas de tendência */}
      {data?.alerts.length > 0 && (
        <MoodAlertsCard alerts={data?.alerts} />
      )}
    </ScrollView>
  );
}
```

### 5.5 Cálculo do score de humor

```typescript
// lib/ai/happiness.ts — cálculo do mood score (0-100)

const MOOD_WEIGHTS = {
  ecstatic: 100,
  happy: 85,
  playful: 80,
  calm: 65,
  tired: 40,
  anxious: 25,
  sad: 15,
  sick: 5,
};

export function calculateMoodScore(moodDistribution: Record<string, number>): number {
  const total = Object.values(moodDistribution).reduce((a, b) => a + b, 0);
  if (total === 0) return 50;  // neutro sem dados

  const weightedSum = Object.entries(moodDistribution)
    .reduce((sum, [mood, count]) => sum + (MOOD_WEIGHTS[mood] || 50) * count, 0);

  return Math.round(weightedSum / total);
}
```

### 5.6 Detecção de padrões de humor pela IA

Adicionar ao CRON `check-vaccine-status` uma verificação semanal de padrões:

```typescript
// Verificação semanal de padrões emocionais
async function checkMoodPatterns(petId, userId) {
  const recentMoods = await getMoodLogs(petId, 14);  // últimos 14 dias

  // Padrão 1: ansiedade recorrente em horário específico
  const anxiousHours = recentMoods
    .filter(m => m.mood === 'anxious')
    .map(m => new Date(m.logged_at).getHours());

  const anxiousHourCount = anxiousHours.reduce((acc, h) => {
    acc[h] = (acc[h] || 0) + 1; return acc;
  }, {});

  const dominantAnxiousHour = Object.entries(anxiousHourCount)
    .sort(([,a], [,b]) => b - a)[0];

  if (dominantAnxiousHour && Number(dominantAnxiousHour[1]) >= 3) {
    await saveMoodAlert(petId, userId, {
      type: 'anxiety_pattern',
      message: `Ansiedade detectada às ${dominantAnxiousHour[0]}h em ${dominantAnxiousHour[1]} dias diferentes.`,
      suggestion: 'Verifique o que acontece nesse horário.',
    });
  }

  // Padrão 2: declínio de humor (mês atual vs anterior)
  const currentMonthScore = await getMoodScore(petId, 'current');
  const lastMonthScore = await getMoodScore(petId, 'last');
  const decline = lastMonthScore - currentMonthScore;

  if (decline >= 20) {
    await saveMoodAlert(petId, userId, {
      type: 'mood_decline',
      message: `O humor do Rex caiu ${decline}% comparado ao mês passado.`,
      suggestion: 'Registre mais detalhes sobre o dia a dia para a IA identificar a causa.',
    });
  }
}
```

### 5.7 Checklist Sprint 4.3

```
[ ] CREATE MATERIALIZED VIEW pet_mood_monthly
[ ] Adicionar REFRESH ao CRON refresh-health-views
[ ] Adicionar checkMoodPatterns() ao CRON check-vaccine-status (semanal)
[ ] Ativar lente Felicidade no LensGrid com badge (mood atual do pet)
[ ] Criar HappinessLensContent com 6 seções
[ ] Criar MoodScoreCard com score + trend + mood dominante
[ ] Criar MoodDistributionBars com barras proporcionais por humor
[ ] Criar PeriodSelector (30d / 3m / 6m / 1a)
[ ] Criar MoodTrendChart com gráfico de linha (meses no eixo X, score no eixo Y)
[ ] Criar MoodPatternsCard (padrões detectados)
[ ] Criar MoodAlertsCard (alertas de tendência)
[ ] calculateMoodScore() em lib/ai/happiness.ts
[ ] Hook useLens com lensType='happiness'
[ ] Testar: lente Felicidade abre com dados existentes das Fases 1-3
[ ] Testar: distribuição de humores calculada corretamente
[ ] Testar: gráfico de linha renderiza 6 meses
[ ] Testar: padrão de ansiedade às 14h detectado e exibido
[ ] Testar: declínio de 20%+ gera alerta
[ ] Testar: badge da lente mostra emoji do humor atual do pet
```

---

## 6. SPRINT 4.4 — VIAGENS

### Objetivo: Criar tabela pet_travels + lente Viagens com roteiros, registros e locais pet-friendly detectados pela IA.

### 6.1 CREATE TABLE pet_travels

```sql
CREATE TABLE IF NOT EXISTS pet_travels (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id          UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id),
    diary_entry_id  UUID REFERENCES diary_entries(id),
    destination     VARCHAR(150) NOT NULL,            -- "Campos do Jordão", "Praia de Maresias"
    city            VARCHAR(100),
    state           VARCHAR(50),
    country         VARCHAR(50) DEFAULT 'Brasil',
    travel_type     VARCHAR(20) DEFAULT 'leisure'
                    CHECK (travel_type IN (
                      'leisure',      -- passeio / férias
                      'vet_visit',    -- viagem para consulta especialista
                      'relocation',   -- mudança temporária ou permanente
                      'competition',  -- competição / exposição
                      'other'
                    )),
    started_at      DATE NOT NULL,
    ended_at        DATE,                             -- NULL = em andamento
    duration_days   INTEGER,                          -- calculado ou informado
    transport       VARCHAR(20)
                    CHECK (transport IN ('car','plane','bus','train','other')),
    pet_friendly_places JSONB DEFAULT '[]',           -- [{name, type, rating, address}]
    highlights      TEXT[],                           -- ["primeira vez na praia", "adorou a areia"]
    mood_during     VARCHAR(20)
                    CHECK (mood_during IN ('ecstatic','happy','calm','anxious','sick','mixed')),
    photos          TEXT[] DEFAULT '{}',              -- URLs de fotos da viagem
    notes           TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_travels_pet ON pet_travels(pet_id);
CREATE INDEX idx_travels_date ON pet_travels(started_at DESC);
CREATE INDEX idx_travels_destination ON pet_travels(destination);

ALTER TABLE pet_travels ENABLE ROW LEVEL SECURITY;
CREATE POLICY travels_own ON pet_travels
  FOR ALL USING (user_id = auth.uid());
```

### 6.2 Detecção de viagem pela IA

O classificador já reconhece `primary_type: 'travel'`. Adicionar ao `modules/save.ts`:

```typescript
// Exemplos de entradas que geram travel:
// "Vamos viajar pro litoral semana que vem com o Rex"
// "Chegamos em Campos do Jordão, Rex amou a friagem"
// Foto de paisagem → IA detecta praia, montanha, cidade diferente
// Foto de caixinha de transporte no carro → contexto de viagem
// Vídeo de Rex na areia → IA identifica praia

async function saveTravelRecord(diaryEntryId, petId, userId, extracted) {
  // Verificar se existe viagem ativa (sem ended_at) para não criar duplicata
  const { data: activeTravel } = await supabase
    .from('pet_travels')
    .select()
    .eq('pet_id', petId)
    .is('ended_at', null)
    .single();

  if (activeTravel) {
    // Adicionar foto à viagem existente
    await supabase
      .from('pet_travels')
      .update({
        photos: [...activeTravel.photos, ...(extracted.photo_urls || [])],
        notes: activeTravel.notes
          ? `${activeTravel.notes}\n${extracted.notes || ''}`
          : extracted.notes,
      })
      .eq('id', activeTravel.id);
    return activeTravel;
  }

  // Criar nova viagem
  const { data } = await supabase
    .from('pet_travels')
    .insert({
      pet_id: petId,
      user_id: userId,
      diary_entry_id: diaryEntryId,
      destination: extracted.destination || 'Destino não identificado',
      city: extracted.city,
      state: extracted.state,
      travel_type: extracted.travel_type || 'leisure',
      started_at: extracted.date || new Date().toISOString().slice(0, 10),
      transport: extracted.transport,
      mood_during: extracted.mood || 'happy',
      photos: extracted.photo_urls || [],
      notes: extracted.notes,
    })
    .select()
    .single();

  return data;
}
```

### 6.3 Lente Viagens

```
VIAGENS DO REX · 5 aventuras

┌──────────────────────────────────┐
│ Campos do Jordão · Mar/2026     │
│ 4 dias · Lazer · Carro          │
│ 😊 Feliz durante a viagem       │
│ 12 fotos                         │
│ "Primeira vez na neve artificial!│
│  Rex adorou."                   │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ Praia de Maresias · Jan/2026    │
│ 7 dias · Lazer · Carro          │
│ 😁 Super feliz                  │
│ 23 fotos                         │
│ "Primeira vez no mar!"          │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ Gramado · Dez/2025              │
│ 5 dias · Lazer · Carro          │
│ 😌 Calmo e explorador           │
│ 8 fotos                          │
└──────────────────────────────────┘

Locais pet-friendly visitados: 12
Cidades: 5 · Praias: 2 · Serras: 3
```

### 6.4 Componente TravelsLensContent

```typescript
// components/lenses/TravelsLensContent.tsx

export function TravelsLensContent({ petId }) {
  const { data } = useQuery({
    queryKey: ['travels', petId],
    queryFn: () => fetchTravels(petId),
    staleTime: 60 * 60 * 1000,
  });

  return (
    <View>
      {/* Resumo de viagens */}
      <TravelsSummary
        totalTravels={data?.total}
        uniqueCities={data?.uniqueCities}
        totalDays={data?.totalDays}
      />

      {/* Lista de viagens em ordem cronológica reversa */}
      <FlatList
        data={data?.travels}
        renderItem={({ item }) => <TravelCard travel={item} />}
        keyExtractor={item => item.id}
      />
    </View>
  );
}
```

### 6.5 Card de sugestão de viagem no diário

Quando a IA detecta contexto de viagem futura:

```
┌─────────────────────────────────┐
│ 🗺️ Contexto de viagem detectado │
│                                  │
│ Destino: Campos do Jordão       │
│ Período: semana que vem         │
│                                  │
│ [Criar registro de viagem]      │
│ [Só salvar no diário]           │
└─────────────────────────────────┘
```

### 6.6 Checklist Sprint 4.4

```
[ ] CREATE TABLE pet_travels + RLS
[ ] Adicionar classificação 'travel' no prompt do classify-diary-entry
[ ] saveTravelRecord() em modules/save.ts (com lógica de viagem ativa)
[ ] Ativar lente Viagens no LensGrid com badge (count de viagens)
[ ] Criar TravelsLensContent com lista cronológica
[ ] Criar TravelCard com destino, datas, duração, humor, fotos
[ ] Criar TravelsSummary (total + cidades únicas + dias totais)
[ ] Card de sugestão de viagem no diário
[ ] Hook useLens com lensType='travels'
[ ] Testar: voz "vamos viajar pro litoral" → travel salvo
[ ] Testar: foto de paisagem de praia → travel sugerido
[ ] Testar: segunda entrada numa viagem ativa → foto adicionada à mesma viagem
[ ] Testar: lente Viagens lista viagens em ordem cronológica
[ ] Testar: badge mostra count correto de viagens
[ ] Testar: uniqueCities calculado corretamente
```

---

## 7. CRITÉRIOS DE CONCLUSÃO DA FASE 4

```
✓ Lente Planos ativa com 5 tipos de plano + resumo financeiro + ROI
✓ Sugestão contextual de planos (5 gatilhos do diário)
✓ Notificações de renovação de planos (CRON)
✓ Lente Conquistas ativa com 35 badges + XP + nível do pet
✓ Conquistas desbloqueadas automaticamente após cada entrada
✓ Trigger de XP funcional (pets.xp_total e pets.level atualizados)
✓ Lente Felicidade ativa com gráfico histórico alimentado pelas Fases 1-3
✓ Detecção de padrões de ansiedade e declínio de humor (CRON)
✓ Lente Viagens ativa com registro automático por contexto de viagem
✓ 3 tabelas novas: pet_plans, plan_claims, achievements, pet_travels
✓ 2 colunas novas em pets: xp_total, level
✓ 2 views materializadas: pet_plans_summary, pet_mood_monthly
✓ LensGrid completo com todas as 8 lentes do spec
✓ Tudo das Fases 1, 2 e 3 continua funcionando (regressão OK)
```

---

## 8. BANCO DE DADOS — RESUMO DA FASE 4

```sql
-- NOVAS TABELAS (4):
--   pet_plans       → 5 tipos de plano (Sprint 4.1)
--   plan_claims     → sinistros e uso de planos (Sprint 4.1)
--   achievements    → badges e marcos do pet (Sprint 4.2)
--   pet_travels     → roteiros e registros de viagem (Sprint 4.4)

-- ALTERAÇÕES EM TABELA EXISTENTE (1):
--   pets.xp_total INTEGER DEFAULT 0   → XP acumulado (Sprint 4.2)
--   pets.level    INTEGER DEFAULT 1   → nível do pet (Sprint 4.2)

-- NOVAS VIEWS MATERIALIZADAS (2):
--   pet_plans_summary  → resumo de planos e economia (Sprint 4.1)
--   pet_mood_monthly   → distribuição de humor por mês (Sprint 4.3)

-- TRIGGERS NOVOS (1):
--   trg_increment_xp  → incrementa xp_total e level ao inserir achievement

-- ADIÇÕES AO CRON check-vaccine-status (existente):
--   checkPlanRenewals()   → notificação 30 dias antes de renovação
--   checkMoodPatterns()   → detecção semanal de padrões de humor

-- ADIÇÕES AO CRON refresh-health-views (existente):
--   REFRESH MATERIALIZED VIEW pet_mood_monthly

-- REGRAS INVARIÁVEIS (mesmas das Fases 1, 2 e 3):
--   Toda tabela nova: RLS ativo + policy user_id = auth.uid()
--   Toda tabela nova: user_id UUID NOT NULL REFERENCES users(id)
--   Soft delete com is_active (nunca DELETE físico)
--   Narração SEMPRE em 3ª pessoa
--   Zero regressão em Fases 1, 2 e 3
```

---

## 9. ORDEM DE EXECUÇÃO RECOMENDADA

```
Sprint 4.1 primeiro — Planos (maior potencial de valor e monetização, tabelas definidas no spec)
Sprint 4.2 segundo  — Conquistas (motor de retenção, sem depender das outras sprints)
Sprint 4.3 terceiro — Felicidade (sem nova tabela, dados já existem das Fases 1-3)
Sprint 4.4 quarto   — Viagens (funcionalidade complementar, menor urgência)
```

---

## 10. O QUE VEM DEPOIS (preview Fase 5)

```
Fase 5 — ALDEIA (rede solidária):
  5.1 Banco Aldeia (22 tabelas: users, posts, sos_requests, events,
      classifieds, partners, donations, proof_of_love, etc.)
  5.2 Feed da Aldeia (timeline social com posts, curtidas, comentários)
  5.3 SOS (pedido de ajuda com geolocalização e resposta da comunidade)
  5.4 Eventos (criação, inscrição e participação em eventos pet)
  5.5 Classificados (adoção, produtos usados, serviços da comunidade)
  5.6 Parceiros (clínicas, pet shops, hotéis com integração direta)
  5.7 Proof of Love (sistema de reputação Bronze/Prata/Ouro/Diamante)
```
