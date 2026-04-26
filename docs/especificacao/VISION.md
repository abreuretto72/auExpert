# auExpert — Visão Estratégica e Diretivas Técnicas
# Multiverso Digital
# ESTE ARQUIVO DEVE SER LIDO PELO CLAUDE CODE ANTES DE QUALQUER IMPLEMENTAÇÃO

---

## MISSÃO

O auExpert não é apenas um gestor de pets.

**O objetivo final é construir a maior e mais avançada
inteligência artificial do mundo especializada em pets —
cães e gatos — alimentada por dados reais de tutores,
veterinários e profissionais de todo o mundo.**

Cada linha de código, cada tabela do banco, cada Edge Function
e cada decisão de produto deve ser tomada com este objetivo em mente.

---

## O QUE O AUEXPERT É HOJE

Um aplicativo mobile (iOS e Android) de gestão de pets
com inteligência artificial exclusiva para cada pet.

Stack atual:
  - React Native / Expo SDK 52+ / TypeScript
  - Supabase (PostgreSQL + Edge Functions + Storage) — Brasil
  - Claude API (Anthropic) — análise, narrativas, insights
  - Gemini API (Google) — funcionalidades complementares
  - React Query + Zustand + Expo Router v4
  - i18n: pt-BR, en-US, es-MX, es-AR, pt-PT

Usuários atuais: tutores de pets (cães e gatos)
Profissionais: veterinários, nutricionistas, groomers, adestradores
               e todos os profissionais do universo pet
Empresa: Multiverso Digital (Brasil)

---

## O QUE O AUEXPERT SERÁ

Uma plataforma global de IA especializada em pets que:

1. APRENDE com cada registro de cada pet do mundo
2. IDENTIFICA padrões de saúde, comportamento e nutrição
3. PREDIZ problemas de saúde antes que se manifestem
4. RECOMENDA tratamentos baseados em dados reais de milhões de pets
5. CONECTA tutores, profissionais e a ciência veterinária mundial
6. GERA documentação clínica automaticamente para profissionais
7. SE TORNA o prontuário global do pet — levado para qualquer
   veterinário, em qualquer país, em qualquer idioma

---

## PRINCÍPIOS TÉCNICOS INEGOCIÁVEIS

### 1. DADOS PRIMEIRO
Cada funcionalidade deve capturar dados estruturados e ricos.
Nunca armazenar texto livre quando é possível armazenar JSON estruturado.
Cada campo a mais no banco hoje é treinamento de IA amanhã.

### 2. ANONIMIZAÇÃO DESDE O INÍCIO
Todos os dados de pets devem ser armazenados de forma que possam
ser anonimizados sem perder valor científico:
  - IDs de pets e tutores nunca aparecem nos dados de treinamento
  - Raça, espécie, idade, peso, sintomas, diagnósticos = dados valiosos
  - Nome do pet, nome do tutor, endereço = dados privados, nunca treinamento

### 3. EMBEDDINGS EM TUDO
Cada entrada do diário, cada sintoma, cada diagnóstico, cada comportamento
deve gerar um embedding vetorial (pet_embeddings).
Estes embeddings são a memória de longo prazo da IA do pet
E o corpus de treinamento da IA mundial.

### 4. MULTILÍNGUE NATIVO
O app suporta 5 idiomas hoje: pt-BR, en-US, es-MX, es-AR, pt-PT.
TODA string nova deve ter tradução nos 5 idiomas.
Nunca hardcode strings em português ou inglês.
Use sempre i18n: t('chave.aqui')
O app será usado em qualquer país — nunca assumir localidade.

### 5. PREPARADO PARA ESCALA
Hoje: 5 usuários. Amanhã: 50.000. Em 5 anos: 5.000.000.
Decisões de banco, índices e queries devem considerar
volume de dados em escala global, não apenas o MVP.
Sempre criar índices nas colunas de busca frequente.
Sempre usar soft delete (is_deleted + deleted_at), nunca DELETE físico.
Dados de pets anonimizados nunca são deletados — são ativos estratégicos.

### 6. PROFISSIONAIS GLOBAIS
O auExpert aceita profissionais de qualquer país do mundo.
NUNCA validar automaticamente conselhos profissionais (CRMV, AVMA, RCVS etc.)
pois é inviável em escala global.
O profissional autodeclara seus dados e assume responsabilidade total.
O campo de conselho profissional é texto livre — sem validação de formato.

### 7. IA ESPECIALIZADA POR PET
Cada pet tem sua própria IA que aprende com seu histórico específico.
A IA do pet é construída sobre:
  - Embeddings das entradas do diário (pet_embeddings)
  - Perfil clínico (raça, idade, peso, condições)
  - Histórico de vacinas, medicamentos, consultas
  - Análises de imagem acumuladas
  - Padrões comportamentais detectados ao longo do tempo

### 8. CORPUS DE TREINAMENTO
Os dados anonimizados de todos os pets formam o corpus de treinamento
da IA Mundial de Pets da Multiverso Digital.
Este corpus é o ativo mais valioso da empresa — mais valioso que o código.
Toda arquitetura deve proteger e enriquecer este corpus.

---

## FLUXO DE DADOS PARA TREINAMENTO

```
TUTOR registra entrada no diário
           ↓
classify-diary-entry → extrai dados estruturados
           ↓
analyze-pet-photo → extrai dados visuais clínicos
           ↓
generate-embedding → cria vetor semântico
           ↓
BANCO (pet_embeddings + diary_entries)
           ↓
Dados brutos: identificados (privados, apenas do tutor)
           ↓
Pipeline de anonimização noturno (futuro)
           ↓
Dados anonimizados: raça + sintoma + diagnóstico + evolução
           ↓
CORPUS DE TREINAMENTO DA IA MUNDIAL
           ↓
Modelo especializado em cães e gatos
```

---

## ARQUITETURA DO BANCO — REGRAS

### Tabelas de dados clínicos (sempre enriquecer):
  pets                — perfil completo do pet
  diary_entries       — registros com media_analyses (JSONB rico)
  clinical_metrics    — métricas numéricas (peso, temperatura, glicemia)
  vaccines            — vacinas com lote, fabricante, validade
  consultations       — consultas com diagnóstico estruturado
  medications         — medicamentos com dose, duração, resposta
  pet_embeddings      — vetores semânticos de cada entrada
  prontuarios         — prontuários clínicos dos veterinários
  receituarios        — receituários com interações medicamentosas
  photo_analyses      — análises de imagem por arquivo

### Tabelas de profissionais (nunca validar credencial):
  professionals       — profissional com is_declared = true sempre
  trusted_vets        — contato sem login, responsabilidade do tutor
  access_grants       — permissões granulares por pet
  professional_signatures — assinatura digital com hash SHA-256

### Tabelas de IA (alimentar continuamente):
  pet_insights        — insights gerados pela IA
  ai_invocations      — log de todas as chamadas de IA (custo + qualidade)
  ai_tips_pool        — dicas geradas para reutilização
  photo_analyses      — análises visuais acumuladas

### Soft delete OBRIGATÓRIO em todas as tabelas:
  is_deleted BOOLEAN NOT NULL DEFAULT false
  deleted_at TIMESTAMPTZ

### Embeddings OBRIGATÓRIOS para:
  - Toda entrada do diário (diary_entries)
  - Todo prontuário (prontuarios)
  - Toda análise de imagem significativa
  - Todo insight gerado

---

## FUNCIONALIDADES ATUAIS (NÃO REMOVER SEM AUTORIZAÇÃO)

### App do Tutor
  - Diário inteligente: texto + foto + vídeo + áudio + OCR
  - Subcards por mídia: PhotoSubcard, VideoSubcard, AudioSubcard, OCRSubcard
  - Lentes (20 tipos): symptom, vaccine, consultation, weight, expense etc.
  - Painel: badges e sub-telas por lente
  - Aba IA: insights, padrões de saúde, assistente
  - Agenda: eventos, lembretes, notificações push
  - Co-tutor: compartilhamento de perfil do pet

### Planos
  - Gratuito: 1 pet, IA básica, sem profissional
  - Elite: ilimitado, IA exclusiva por pet, profissionais, todos os agentes

### Profissionais (plano Elite do tutor)
  - Acesso ao perfil do pet mediante convite
  - Agentes burocráticos: prontuário, TCI, receituário, ASA, notificação, alta
  - Dashboard de pets vinculados
  - Assinatura digital de documentos

---

## EDGE FUNCTIONS ATIVAS (NÃO REMOVER)

  classify-diary-entry    — v86, verify_jwt: false
  analyze-pet-photo       — v51, verify_jwt: false (inclui toxicidade + fezes + lesões)
  generate-diary-narration — v19, verify_jwt: true
  generate-embedding       — v13, verify_jwt: false
  analyze-health-patterns  — v8, verify_jwt: false
  generate-ai-insight      — v10, verify_jwt: true
  pet-assistant            — v15, verify_jwt: true
  search-rag               — v10, verify_jwt: false
  generate-prontuario      — v16, verify_jwt: false
  ocr-document             — v12, verify_jwt: true
  get-nutricao             — v9, verify_jwt: false
  generate-cardapio        — v19, verify_jwt: false
  evaluate-nutrition       — v7, verify_jwt: false
  check-scheduled-events   — v9, verify_jwt: false
  send-push-notifications  — v9, verify_jwt: false
  generate-personality     — v10, verify_jwt: true
  bridge-health-to-diary   — v12, verify_jwt: true
  scan-professional-document — v1, verify_jwt: true
  professional-invite-create — v1, verify_jwt: false
  professional-invite-accept — v2, verify_jwt: false
  invite-pet-member        — v4, verify_jwt: false
  delete-account           — v7, verify_jwt: false
  delete-pet               — v2, verify_jwt: false
  generate-ai-tips         — v3, verify_jwt: false
  report-app-error         — v1, verify_jwt: false
  support-assistant        — v1, verify_jwt: true
  auth-callback            — v11, verify_jwt: false
  send-reset-email         — v12, verify_jwt: false

---

## REGRAS DE DESENVOLVIMENTO

### NUNCA fazer sem autorização explícita:
  - Remover logs de debug (só remover quando Belisario pedir)
  - DELETE físico em dados de pets ou diário
  - Hardcode de strings sem i18n
  - Hardcode de nomes de modelos de IA (usar app_config)
  - Alert.alert() — usar toast/confirm
  - Emoji no código — usar Lucide icons
  - Narração em primeira pessoa na IA
  - Validar CRMV ou qualquer conselho profissional automaticamente

### SEMPRE fazer:
  - Soft delete (is_deleted + deleted_at)
  - i18n em todos os 5 idiomas para strings novas
  - Índices em colunas de busca
  - RLS em todas as tabelas novas
  - NOTIFY pgrst, 'reload schema' após migrations com FK
  - Logs [S1][S2][S3]... no fluxo do diário
  - Tipo correto para cada attachment (photo/video/audio/document)
  - verify_jwt: false para funções chamadas em background

### MODELO DE IA:
  - Nunca hardcode 'claude-sonnet-4-...' no código
  - Usar sempre getAIConfig() que lê de app_config
  - Modelos atuais: claude-sonnet-4-20250514 (classify/vision)

---

## PETS DE TESTE

  Mana — Chihuahua fêmea
    UUID: dd3adaa6-88dc-481f-9064-33eef6b5d5fd

  Pico — Border Collie macho
    UUID: ce14ea07-f539-4244-9f36-d416b3d12c4f

  Tutor Belisario:
    UUID: 1f7e2b91-91dd-400b-be03-0c82ba2b1b3e

  Supabase project: peqpkzituzpwukzusgcq

---

## RESUMO EM UMA FRASE

Cada decisão técnica deve responder:
"Isso nos aproxima ou nos afasta de ser a maior
IA mundial especializada em cães e gatos?"

Se afasta → não fazer.
Se aproxima → fazer bem feito, escalável e com dados ricos.
