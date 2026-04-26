# Plano de Implementação — Agentes Burocráticos auExpert
# Data: 25/04/2026

## Visão Geral

O auExpert disponibiliza agentes de IA para automatizar
o trabalho burocrático dos profissionais vinculados ao pet.
Disponível apenas no plano Elite do tutor.
O profissional usa os agentes gratuitamente.

## Agentes a implementar

### AGENTE 1 — Prontuário Automático
Gera prontuário no formato CFMV 1.236/2018 a partir
do histórico do pet e da consulta registrada.

### AGENTE 2 — Anamnese Inteligente
Briefing completo do pet para o vet antes da consulta.

### AGENTE 3 — Receituário
Gera receituário com verificação de interações e alertas
para medicamentos controlados.

### AGENTE 4 — TCI (Termo de Consentimento Informado)
Gera termo personalizado por procedimento, tutor assina
pelo app, vet assina digitalmente.

### AGENTE 5 — ASA (Atestado de Saúde Animal)
Gera atestado com dados do pet, vacinas e validade
automática de 10 dias após assinatura.

### AGENTE 6 — Notificação Sanitária
Identifica doenças de notificação obrigatória e gera
ficha pré-preenchida para o vet notificar a Vigilância.

### AGENTE 7 — Relatório de Alta
Gera relatório de alta com diagnóstico, tratamento,
cuidados em casa e agenda de retorno.

---

## Arquitetura Técnica

### Edge Functions (Supabase)

  agent-prontuario        — gera prontuário via IA
  agent-anamnese          — resume histórico do pet
  agent-receituario       — gera receituário
  agent-tci               — gera TCI por procedimento
  agent-asa               — gera ASA
  agent-notificacao       — identifica doenças obrigatórias
  agent-relatorio-alta    — gera relatório de alta

### Tabelas do banco (já criadas)

  prontuarios
  termos_consentimento
  receituarios
  atestados_saude
  notificacoes_sanitarias

### Telas do app

  app/(app)/professional/
    dashboard.tsx          — painel do profissional
    pet/[petId]/index.tsx  — perfil do pet (visão do vet)
    agents/
      prontuario.tsx
      anamnese.tsx
      receituario.tsx
      tci.tsx
      asa.tsx
      notificacao.tsx
      alta.tsx

---

## FASE 1 — Edge Functions dos Agentes

### agent-prontuario/index.ts

  Recebe:
    pet_id, professional_id, access_grant_id,
    consultation_id (opcional), chief_complaint,
    language

  Faz:
    1. Busca perfil completo do pet (vw_pet_full_profile)
    2. Busca últimas 10 entradas do diário
    3. Busca medicamentos em uso
    4. Envia para Claude com prompt estruturado
    5. Retorna prontuário preenchido para o vet revisar
    6. Vet revisa, edita se necessário e salva

  Prompt do agente:
    Você é um assistente veterinário especializado em
    documentação clínica. Gere um prontuário estruturado
    conforme a Resolução CFMV nº 1.236/2018.

    Pet: {nome}, {espécie}, {raça}, {idade}, {peso}
    Histórico recente: {últimas entradas do diário}
    Medicamentos em uso: {lista}
    Queixa principal relatada pelo tutor: {chief_complaint}

    Preencha o prontuário com base nas informações disponíveis.
    NÃO invente dados clínicos. Use apenas o que foi registrado.
    Para campos sem informação, retorne null.

    Retorne APENAS JSON válido:
    {
      "history": "histórico consolidado",
      "current_medications": "medicamentos em uso",
      "physical_exam_notes": "observações baseadas no histórico",
      "diagnoses": ["hipóteses baseadas nos registros"],
      "treatment_plan": "sugestão de conduta",
      "follow_up_days": 7,
      "prognosis": "baseado no histórico disponível"
    }

### agent-anamnese/index.ts

  Recebe: pet_id, professional_id, language

  Faz:
    1. Busca perfil completo do pet
    2. Busca últimas 5 consultas
    3. Busca vacinas e medicamentos
    4. Busca últimas métricas clínicas
    5. Gera briefing estruturado em linguagem clínica

  Retorna:
    {
      "pet_summary": "resumo do pet",
      "recent_consultations": [...],
      "current_medications": [...],
      "vaccines_status": "em dia | atrasado | pendente",
      "weight_trend": "estável | crescente | decrescente",
      "recent_symptoms": [...],
      "alerts": [...],
      "suggested_questions": ["perguntas sugeridas para a consulta"]
    }

### agent-receituario/index.ts

  Recebe:
    pet_id, professional_id, items (medicamentos),
    clinical_indication, language

  Faz:
    1. Busca peso atual e espécie do pet
    2. Verifica interações medicamentosas via IA
    3. Verifica se algum item é controlado (MAPA/ANVISA)
    4. Calcula dosagem por peso se necessário
    5. Retorna receituário estruturado com alertas

  Alertas automáticos:
    - "⚠️ Medicamento controlado — receituário especial em 3 vias"
    - "⚠️ Interação medicamentosa detectada: X + Y"
    - "⚠️ Dose acima do recomendado para o peso do animal"

### agent-tci/index.ts

  Recebe:
    pet_id, professional_id, procedure_type,
    procedure_description, language

  Faz:
    1. Busca dados do pet e do profissional
    2. Gera TCI personalizado para o procedimento
    3. Inclui riscos específicos da espécie/raça
    4. Retorna TCI em texto formatado + JSON estruturado

  Após geração:
    - Envia notificação push para o tutor assinar
    - Tutor assina pelo app (toque + confirmação biométrica)
    - Vet recebe notificação de assinatura do tutor
    - Vet assina digitalmente
    - PDF gerado e salvo no prontuário

### agent-asa/index.ts

  Recebe:
    pet_id, professional_id, purpose, destination,
    transport_company, language

  Faz:
    1. Busca dados completos do pet
    2. Verifica status de vacinas (antirrábica obrigatória)
    3. Verifica controle de parasitas
    4. Gera ASA preenchido
    5. Após assinatura digital: calcula valid_until = +10 dias

### agent-notificacao/index.ts

  Recebe: pet_id, professional_id, disease_name, language

  Faz:
    1. Verifica se a doença está na lista do MAPA
    2. Identifica o nível de urgência
    3. Gera ficha de notificação pré-preenchida
    4. Informa o canal correto (Vigilância Sanitária municipal)
    5. Orienta sobre os próximos passos legais

### agent-relatorio-alta/index.ts

  Recebe:
    pet_id, professional_id, prontuario_id, language

  Faz:
    1. Busca prontuário da internação/cirurgia
    2. Busca receituários vinculados
    3. Gera relatório de alta estruturado
    4. Cria lembretes automáticos de dose para o tutor
    5. Agenda retorno no calendário do app

---

## FASE 2 — Telas do Profissional

### dashboard.tsx — Painel do profissional

  Lista de pets vinculados ao profissional:
  - Foto + nome do pet
  - Nome do tutor
  - Última entrada no diário
  - Alertas ativos
  - Botão "Ver perfil do pet"

### pet/[petId]/index.tsx — Perfil do pet (visão do vet)

  Abas:
  1. RESUMO       — dados do pet + métricas + alertas
  2. HISTÓRICO    — diário completo (somente leitura)
  3. DOCUMENTOS   — prontuários, TCIs, receituários, ASAs
  4. AGENTES      — acesso aos 7 agentes

### agents/ — Telas dos agentes

  Cada tela tem:
  1. Botão "Gerar com IA" → chama a Edge Function
  2. Preview do documento gerado
  3. Campo de edição livre antes de assinar
  4. Botão "Assinar e Salvar" (assinatura digital)
  5. Botão "Exportar PDF"

---

## FASE 3 — Assinatura Digital

  Ao assinar, salvar em professional_signatures:
    payload_hash      — SHA-256 do documento
    payload_snapshot  — cópia completa do documento
    signed_display_name — nome do profissional
    signed_council_name — conselho autodeclarado
    signed_council_number — número autodeclarado
    signed_as_declared — true (dados autodeclarados)

  O vet não pode editar um documento já assinado.
  Para corrigir: emitir versão amendada (status: 'amended').

---

## FASE 4 — Geração de PDF

  Usar a skill de PDF do Claude Code para gerar PDFs
  profissionais dos documentos assinados.

  PDF inclui:
  - Cabeçalho: logo auExpert + dados da clínica
  - Corpo: dados do documento
  - Rodapé: "Documento gerado pelo auExpert —
    As informações são de responsabilidade do profissional."
  - Hash SHA-256 para verificação de autenticidade
  - QR Code com link de verificação (futuro)

---

## Ordem de implementação sugerida

  1. agent-anamnese      (mais simples, só leitura)
  2. agent-prontuario    (núcleo do sistema)
  3. agent-receituario   (alta frequência de uso)
  4. agent-asa           (necessidade imediata dos tutores)
  5. agent-tci           (requer fluxo de assinatura)
  6. agent-relatorio-alta
  7. agent-notificacao   (mais complexo, integra MAPA)

---

## Checklist antes de implementar

  [ ] Tabelas criadas ✅
  [ ] Planos criados ✅
  [ ] Cadastro do profissional (prompt_cc_cadastro_profissional.md)
  [ ] Dashboard do profissional
  [ ] Permissões RLS validadas
  [ ] Edge Functions dos agentes
  [ ] Telas dos agentes
  [ ] Fluxo de assinatura digital
  [ ] Geração de PDF
  [ ] Notificações push (tutor ← → vet)
