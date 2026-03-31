# Prompt para Claude Code — Decisões de Produto: Fluxo de Confirmação
# Aplicar em cima das Fases 1-4 já implementadas

Copie o bloco abaixo e cole no Claude Code.

---

## PROMPT:

```
CONTEXTO: Decisões de produto tomadas após a implementação das Fases 1-4 e Sprint 4.5.
Este prompt implementa mudanças transversais que afetam o fluxo central do app.
Leia todos os arquivos listados antes de tocar em qualquer código.

ARQUIVOS A LER ANTES DE COMEÇAR:
  docs/specs/auexpert_novo_conceito_spec.md
  docs/specs/fase1_plano_migracao.md
  docs/specs/fase2_plano_implementacao.md
  docs/specs/sprint_4_5_agendamentos.md
  CLAUDE.md

─────────────────────────────────────────────────────────────────
DECISÃO 1 — SEMPRE SALVAR NO DIÁRIO E NOS MÓDULOS
─────────────────────────────────────────────────────────────────

ANTES (fluxo antigo):
  IA classifica → mostra cards → tutor escolhe [Registrar] ou [Ignorar]
  por cada card individualmente → [Salvar tudo] ou [Só salvar no diário]

DEPOIS (novo fluxo):
  IA classifica → mostra cards editáveis → tutor edita campos se necessário
  → [Confirmar] → salva TUDO de uma vez (diário + todos os módulos detectados)

REGRA ABSOLUTA: Toda entrada é sempre salva simultaneamente no diário
e em todos os módulos que a IA identificou. Não existe mais escolha
de "salvar só no diário". Não existe mais "ignorar" individual.
A correção acontece depois, pelo diário ou pela lente.

─────────────────────────────────────────────────────────────────
DECISÃO 2 — CARDS EDITÁVEIS (Opção A: todos de uma vez)
─────────────────────────────────────────────────────────────────

O tutor vê TODOS os cards ao mesmo tempo. Cada card mostra
os campos extraídos com ícone ✏️ indicando que são editáveis.
O tutor toca num campo, corrige se necessário, e toca [Confirmar].
Um único [Confirmar] salva diário + todos os módulos.

Layout do card editável:

  ┌─────────────────────────────────┐
  │ 💉 Vacina                  95%  │
  │                                  │
  │ Nome    V10            [✏️]     │
  │ Data    31/03/2026     [✏️]     │
  │ Vet     Dra. Carla     [✏️]     │
  │ Clínica Clínica VetBem [✏️]     │
  │                                  │
  └─────────────────────────────────┘

  ┌─────────────────────────────────┐
  │ ⚖️ Peso                    88%  │
  │                                  │
  │ Valor   32 kg          [✏️]     │
  │                                  │
  └─────────────────────────────────┘

  ┌─────────────────────────────────┐
  │ 💰 Gasto                   91%  │
  │                                  │
  │ Valor   R$ 280         [✏️]     │
  │ Local   Clínica VetBem [✏️]     │
  │                                  │
  └─────────────────────────────────┘

                    [Confirmar]

─────────────────────────────────────────────────────────────────
DECISÃO 3 — CORREÇÃO POSTERIOR PELO DIÁRIO OU PELA LENTE
─────────────────────────────────────────────────────────────────

Se o tutor perceber erro depois de confirmar:
  PELO DIÁRIO → toca na entrada → [Editar] → corrige campos → salva
  PELA LENTE  → abre Prontuário/Gastos/etc → encontra o registro → edita

Os dois caminhos atualizam o mesmo registro. Sem duplicação.

─────────────────────────────────────────────────────────────────
O QUE IMPLEMENTAR — LISTA COMPLETA
─────────────────────────────────────────────────────────────────

── EDGE FUNCTION: classify-diary-entry ──────────────────────────

1. UNIFICAR save-classified-entry + save-diary-only em 1 função.
   Renomear internamente para saveAllModules(). Remover a bifurcação.
   A função sempre salva diary_entry + todos os módulos detectados.

   ANTES:
     save-classified-entry  → salva diary + módulo confirmado
     save-diary-only        → salva só diary

   DEPOIS:
     saveAllModules()       → salva diary + TODOS os módulos da classificação
                              Chamada 1 vez com o payload editado pelo tutor.

2. O endpoint classify-diary-entry passa a ter DOIS estágios:
   ESTÁGIO 1 — /classify   → recebe mídia/texto → retorna classificações + narração
                              NÃO salva nada ainda. Só analisa.
   ESTÁGIO 2 — /confirm    → recebe classificações (editadas ou não) → salva tudo

   Implementar como:
     POST /classify-diary-entry/classify
       Input:  { pet_id, text?, photo_base64?, video_url?, audio_url?,
                 document_base64?, input_type }
       Output: { classifications, narration, mood, urgency, clinical_metrics,
                 scheduled_event? }
       Efeito: NENHUM — não persiste nada no banco

     POST /classify-diary-entry/confirm
       Input:  { pet_id, input_type, media_urls, narration, mood, urgency,
                 classifications: [{type, confidence, extracted_data}],
                 scheduled_event? }
       Output: { diary_entry_id, saved_modules: {vaccine_id?, expense_id?, ...} }
       Efeito: persiste diary_entry + todos os módulos de uma vez

3. Em modules/save.ts, a função saveAllModules() itera sobre
   classifications e chama a função de save de cada módulo:

     for (const cls of classifications) {
       if (cls.type === 'vaccine')      await saveVaccine(...)
       if (cls.type === 'exam')         await saveExam(...)
       if (cls.type === 'consultation') await saveConsultation(...)
       if (cls.type === 'expense')      await saveExpense(...)
       if (cls.type === 'weight')       await saveWeight(...)
       if (cls.type === 'medication')   await saveMedication(...)
       if (cls.type === 'food')         await saveNutrition(...)
       if (cls.type === 'connection')   await saveConnection(...)
       if (cls.type === 'travel')       await saveTravel(...)
       if (cls.type === 'achievement')  await checkAchievements(...)
       if (cls.type === 'plan')         await savePlan(...)
       if (cls.type === 'insurance')    await savePlan(...)
     }

     // Agendamento (se IA detectou intenção futura)
     if (scheduled_event) await saveScheduledEvent(...)

     // Sempre: atualizar linked_*_id no diary_entry com os IDs gerados
     await updateDiaryEntryLinks(diaryEntryId, savedModuleIds)

── CELULAR: componente ConfirmationScreen ───────────────────────

4. RENOMEAR ClassificationCard → ConfirmationCard.
   O componente não tem mais botões [Registrar] e [Ignorar].
   Tem campos editáveis com ícone ✏️ por campo.

5. Criar ConfirmationScreen (tela/modal que aparece após classify):

   Estrutura:
     - NarrationBubble no topo (narração IA em 3ª pessoa)
     - Lista de ConfirmationCard (1 por classificação)
     - Botão único [Confirmar] no final
     - Nenhum outro botão de ação na tela

6. ConfirmationCard — comportamento dos campos editáveis:

   - Cada campo do extracted_data é renderizado como linha:
       [label]  [valor atual]  [✏️]
   - Tocar no ✏️ abre um input inline (TextInput ou DatePicker conforme tipo)
   - Campo editado fica com borda destacada até confirmar
   - Valor editado vai para o payload do /confirm substituindo o original

   Campos por tipo de classificação:
     vaccine:      vaccine_name, date, next_due, vet_name, clinic, laboratory, batch
     exam:         exam_name, date, lab_name, results[]
     consultation: date, vet_name, clinic, reason, diagnosis
     medication:   medication_name, dosage, frequency, start_date, vet_name
     expense:      amount, category, merchant_name, date
     weight:       value (kg), date
     food:         product_name, brand, record_type
     connection:   friend_name, friend_species
     travel:       destination, started_at
     surgery:      procedure_name, date, vet_name
     plan/insurance: provider_name, plan_type, monthly_cost, start_date

7. Botão [Confirmar]:
   - Aparece sempre habilitado (o tutor não precisa editar nada para confirmar)
   - Ao tocar: chama POST /classify-diary-entry/confirm com payload completo
   - Durante chamada: botão mostra spinner, campos ficam desabilitados
   - Após sucesso: fecha a tela, volta ao diário, timeline atualizada
   - Após erro: mostra toast de erro, botão volta ao normal para retry

── CELULAR: hook useDiaryEntry ──────────────────────────────────

8. REFATORAR useDiaryEntry para o novo fluxo de 2 estágios:

   ANTES:
     submit()               → classify + save em 1 chamada
     confirmClassification() → salva módulo individual

   DEPOIS:
     classify()             → POST /classify → retorna resultado sem salvar
     confirm(payload)       → POST /confirm  → salva tudo, retorna IDs

   Remover:
     confirmClassification() ← não existe mais
     confirmAll()            ← não existe mais

   Fluxo no hook:
     1. classify() → recebe resultado da IA
     2. App mostra ConfirmationScreen com resultado
     3. Tutor edita campos (estado local na ConfirmationScreen)
     4. Tutor toca [Confirmar]
     5. confirm(payloadEditado) → salva tudo
     6. Optimistic update na timeline com a entry salva

── CELULAR: edição posterior ────────────────────────────────────

9. No card da timeline (DiaryEntry.tsx), adicionar botão [Editar]
   que abre um EditEntryScreen com os mesmos ConfirmationCard editáveis,
   mas desta vez conectado a PUT (update) em vez de POST (insert).

   O EditEntryScreen:
   - Carrega os dados atuais do diary_entry + módulos vinculados
   - Renderiza os mesmos ConfirmationCard preenchidos com dados existentes
   - Botão [Salvar alterações]
   - Ao confirmar: PATCH diary_entries + PATCH em cada módulo vinculado

10. Nas lentes (Prontuário, Gastos, Nutrição, etc.):
    Cada registro já tem opção de edição inline (era assim antes).
    Confirmar que ao editar pela lente, o diary_entry vinculado
    também é atualizado (narração pode ficar desatualizada — ok,
    deixar uma flag narration_outdated = true para reprocessar depois).

── BANCO DE DADOS ───────────────────────────────────────────────

11. Nenhuma nova tabela necessária.
    Apenas 1 coluna nova em diary_entries:

    ALTER TABLE diary_entries
      ADD COLUMN IF NOT EXISTS narration_outdated BOOLEAN DEFAULT FALSE;

    -- Setada como TRUE quando o tutor edita dados após a confirmação inicial
    -- Permite futuramente reprocessar a narração se necessário

── REMOVER / DEPRECAR ───────────────────────────────────────────

12. As seguintes funções/componentes devem ser removidos ou marcados
    como deprecated (não apagar — comentar com -- DEPRECATED e data):

    Edge Functions:
      save-diary-only       → DEPRECATED: absorvida por saveAllModules()
      save-classified-entry → DEPRECATED: absorvida por /confirm

    Componentes:
      ClassificationCard.tsx → DEPRECATED: substituído por ConfirmationCard.tsx

    No useDiaryEntry.ts:
      confirmClassification() → DEPRECATED
      confirmAll()            → DEPRECATED

─────────────────────────────────────────────────────────────────
REGRAS INVARIÁVEIS (mesmas de todas as fases)
─────────────────────────────────────────────────────────────────

- Narração SEMPRE em 3ª pessoa
- Zero regressão: tudo das Fases 1-4 continua funcionando
- Entradas antigas no diário não são reprocessadas
- Soft delete com is_active (nunca DELETE físico)
- RLS ativo em todas as tabelas
- Usar useDiaryEntry existente como base (refatorar, não recriar)

─────────────────────────────────────────────────────────────────
NÃO EXECUTE NADA AINDA
─────────────────────────────────────────────────────────────────

Primeiro confirme que entendeu respondendo:

1. Quantos estágios tem o novo fluxo de entrada? O que cada um faz?
2. O que [Confirmar] salva exatamente?
3. O que acontece com save-diary-only e save-classified-entry?
4. Como o tutor corrige um dado errado DEPOIS de confirmar?
5. Qual coluna nova vai para diary_entries e por quê?
6. O que é removido do useDiaryEntry?

Depois que confirmar, comece pelo Edge Function (estágios /classify e /confirm)
antes de qualquer mudança no celular.
```
