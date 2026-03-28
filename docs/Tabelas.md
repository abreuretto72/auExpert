# Tabelas.md — Schema do Banco de Dados PetauLife+
# Gerado em: 27/03/2026
# Supabase Project: peqpkzituzpwukzusgcq

> Fonte de verdade para consultas, queries e views.
> Consulte SEMPRE este arquivo antes de escrever SQL ou acessar dados.

---

## Relacionamentos Principais

```
users (1) ──→ (N) pets
users (1) ──→ (N) sessions
users (1) ──→ (N) audit_log
pets  (1) ──→ (N) diary_entries
pets  (1) ──→ (N) mood_logs
pets  (1) ──→ (N) photo_analyses
pets  (1) ──→ (N) vaccines
pets  (1) ──→ (N) allergies
pets  (1) ──→ (N) pet_embeddings
pets  (1) ──→ (N) rag_conversations
pets  (1) ──→ (N) media_files
pets  (1) ──→ (N) notifications_queue
```

**Regra:** Toda tabela filha tem `user_id UUID NOT NULL` (FK → users.id) e `pet_id UUID NOT NULL` (FK → pets.id). NUNCA enviar esses campos vazios.

---

## 1. users

Tutor (dono do pet). PK = `id` (UUID). Bucket de fotos: **tutores**.

| Coluna | Tipo | Null | Default | Descrição |
|--------|------|------|---------|-----------|
| **id** | uuid | NO | gen_random_uuid() | PK |
| **email** | varchar(255) | NO | — | Email do tutor (único) |
| **full_name** | varchar(150) | NO | — | Nome completo |
| avatar_url | text | YES | null | URL da foto (bucket: tutores) |
| phone | varchar(20) | YES | null | Telefone |
| cpf | varchar(14) | YES | null | CPF (Brasil) |
| birth_date | date | YES | null | Data de nascimento |
| country | varchar(3) | YES | 'BRA' | País (código ISO) |
| city | varchar(100) | YES | null | Cidade |
| state | varchar(100) | YES | null | Estado (nome completo ou UF) |
| address_street | varchar(255) | YES | null | Rua/Avenida |
| address_number | varchar(20) | YES | null | Número |
| address_complement | varchar(100) | YES | null | Complemento |
| address_neighborhood | varchar(100) | YES | null | Bairro |
| address_zip | varchar(20) | YES | null | CEP |
| latitude | numeric(10,7) | YES | null | Latitude GPS |
| longitude | numeric(10,7) | YES | null | Longitude GPS |
| social_network_type | varchar(30) | YES | null | App de mensagens: whatsapp, telegram, messenger, wechat, line, signal, kakaotalk, viber, discord, other |
| social_network_handle | varchar(100) | YES | null | Número ou @usuario |
| language | varchar(5) | NO | 'pt-BR' | Idioma (detectado do dispositivo) |
| timezone | varchar(50) | YES | 'America/Sao_Paulo' | Fuso horário |
| role | varchar(20) | NO | 'tutor_owner' | Papel: tutor_owner, tutor_assistant |
| owner_id | uuid | YES | null | FK → users.id (se é assistente) |
| biometric_enabled | boolean | NO | false | Biometria ativa |
| biometric_type | varchar(20) | YES | null | fingerprint, face |
| failed_login_attempts | integer | NO | 0 | Tentativas de login falhas |
| locked_until | timestamptz | YES | null | Bloqueado até |
| privacy_profile_public | boolean | NO | true | Perfil visível na comunidade |
| privacy_show_location | boolean | NO | true | Mostrar cidade/bairro |
| privacy_show_pets | boolean | NO | true | Pets visíveis na comunidade |
| privacy_show_social | boolean | NO | false | Mostrar app de mensagens |
| xp | integer | NO | 0 | Pontos de experiência |
| level | integer | NO | 1 | Nível do tutor |
| title | varchar(50) | YES | 'Tutor Iniciante' | Título gamificado |
| proof_of_love_tier | varchar(20) | YES | 'bronze' | bronze, silver, gold, diamond |
| is_active | boolean | NO | true | Soft delete |
| created_at | timestamptz | NO | now() | Criação |
| updated_at | timestamptz | NO | now() | Última atualização (trigger automático) |

---

## 2. pets

Pet do tutor (cão ou gato). PK = `id` (UUID). FK = `user_id` → users.id. Bucket de fotos: **pets**.

| Coluna | Tipo | Null | Default | Descrição |
|--------|------|------|---------|-----------|
| **id** | uuid | NO | gen_random_uuid() | PK |
| **user_id** | uuid | NO | — | FK → users.id |
| **name** | varchar(100) | NO | — | Nome do pet |
| **species** | varchar(3) | NO | — | 'dog' ou 'cat' |
| breed | varchar(100) | YES | null | Raça |
| birth_date | date | YES | null | Data de nascimento |
| estimated_age_months | integer | YES | null | Idade estimada (meses) |
| sex | varchar(6) | YES | null | male, female |
| is_neutered | boolean | YES | null | Castrado |
| weight_kg | numeric | YES | null | Peso em kg |
| size | varchar(6) | YES | null | small, medium, large |
| color | varchar(50) | YES | null | Cor da pelagem |
| microchip_id | varchar(20) | YES | null | ID do microchip (UNIQUE) |
| blood_type | varchar(20) | YES | null | Tipo sanguíneo |
| avatar_url | text | YES | null | URL da foto do pet |
| personality_tags | jsonb | YES | '[]' | Tags de personalidade |
| ai_personality | text | YES | null | Personalidade gerada pela IA |
| health_score | integer | YES | 0 | Score de saúde (0-100) |
| happiness_score | integer | YES | 0 | Score de felicidade (0-100) |
| current_mood | varchar(20) | YES | null | Humor atual |
| is_memorial | boolean | NO | false | Pet falecido (memorial) |
| is_active | boolean | NO | true | Soft delete |
| created_at | timestamptz | NO | now() | Criação |
| updated_at | timestamptz | NO | now() | Última atualização |

---

## 3. diary_entries

Entradas do diário do pet. PK = `id`. FKs = `pet_id`, `user_id`.

| Coluna | Tipo | Null | Default | Descrição |
|--------|------|------|---------|-----------|
| **id** | uuid | NO | gen_random_uuid() | PK |
| **pet_id** | uuid | NO | — | FK → pets.id |
| **user_id** | uuid | NO | — | FK → users.id |
| **content** | text | NO | — | Texto da entrada (3-2000 chars) |
| narration | text | YES | null | Narração gerada pela IA |
| **mood_id** | varchar(20) | NO | — | ID do humor |
| tags | jsonb | YES | '[]' | Tags |
| photos | jsonb | YES | '[]' | URLs das fotos |
| is_special | boolean | NO | false | Entrada especial |
| entry_date | date | NO | CURRENT_DATE | Data da entrada |
| is_active | boolean | NO | true | Soft delete |
| created_at | timestamptz | NO | now() | Criação |

---

## 4. vaccines

Vacinas do pet. PK = `id`. FKs = `pet_id`, `user_id`.

| Coluna | Tipo | Null | Default | Descrição |
|--------|------|------|---------|-----------|
| **id** | uuid | NO | gen_random_uuid() | PK |
| **pet_id** | uuid | NO | — | FK → pets.id |
| **user_id** | uuid | NO | — | FK → users.id |
| **name** | varchar(100) | NO | — | Nome da vacina |
| laboratory | varchar(100) | YES | null | Laboratório |
| batch_number | varchar(50) | YES | null | Número do lote |
| **date_administered** | date | NO | — | Data de aplicação |
| next_due_date | date | YES | null | Próxima dose |
| dose_number | varchar(20) | YES | null | Número da dose |
| veterinarian | varchar(150) | YES | null | Veterinário |
| clinic | varchar(150) | YES | null | Clínica |
| status | varchar(10) | NO | 'up_to_date' | up_to_date, overdue, upcoming |
| source | varchar(15) | NO | 'manual' | manual, ocr, ai |
| notes | text | YES | null | Observações |
| is_active | boolean | NO | true | Soft delete |
| created_at | timestamptz | NO | now() | Criação |

---

## 5. allergies

Alergias do pet. PK = `id`. FKs = `pet_id`, `user_id`.

| Coluna | Tipo | Null | Default | Descrição |
|--------|------|------|---------|-----------|
| **id** | uuid | NO | gen_random_uuid() | PK |
| **pet_id** | uuid | NO | — | FK → pets.id |
| **user_id** | uuid | NO | — | FK → users.id |
| **allergen** | varchar(150) | NO | — | Alérgeno |
| reaction | text | YES | null | Reação |
| **severity** | varchar(8) | NO | 'mild' | mild, moderate, severe |
| diagnosed_date | date | YES | null | Data do diagnóstico |
| diagnosed_by | varchar(150) | YES | null | Diagnosticado por |
| confirmed | boolean | NO | false | Confirmado por vet |
| is_active | boolean | NO | true | Soft delete |
| created_at | timestamptz | NO | now() | Criação |

---

## 6. photo_analyses

Análises de foto por IA. PK = `id`. FKs = `pet_id`, `user_id`.

| Coluna | Tipo | Null | Default | Descrição |
|--------|------|------|---------|-----------|
| **id** | uuid | NO | gen_random_uuid() | PK |
| **pet_id** | uuid | NO | — | FK → pets.id |
| **user_id** | uuid | NO | — | FK → users.id |
| **photo_url** | text | NO | — | URL da foto analisada |
| analysis_type | varchar(10) | NO | 'general' | general, breed, mood, health |
| **findings** | jsonb | NO | '{}' | Resultados estruturados da IA |
| health_score | integer | YES | null | Score de saúde calculado |
| **confidence** | numeric | NO | 0.00 | Confiança geral (0-1) |
| ai_diary_entry | text | YES | null | Entrada de diário gerada |
| raw_ai_response | jsonb | YES | null | Resposta bruta da IA |
| is_active | boolean | NO | true | Soft delete |
| created_at | timestamptz | NO | now() | Criação |

---

## 7. mood_logs

Registros de humor do pet. PK = `id`. FKs = `pet_id`, `user_id`.

| Coluna | Tipo | Null | Default | Descrição |
|--------|------|------|---------|-----------|
| **id** | uuid | NO | gen_random_uuid() | PK |
| **pet_id** | uuid | NO | — | FK → pets.id |
| **user_id** | uuid | NO | — | FK → users.id |
| **mood_id** | varchar(20) | NO | — | ecstatic, happy, calm, tired, anxious, sad, playful, sick |
| **score** | integer | NO | — | Pontuação (1-10) |
| source | varchar(20) | NO | 'manual' | manual, ai_photo, ai_diary |
| notes | text | YES | null | Observações |
| is_active | boolean | NO | true | Soft delete |
| created_at | timestamptz | NO | now() | Criação |

---

## 8. pet_embeddings

Vetores RAG por pet. PK = `id`. FK = `pet_id`.

| Coluna | Tipo | Null | Default | Descrição |
|--------|------|------|---------|-----------|
| **id** | uuid | NO | gen_random_uuid() | PK |
| **pet_id** | uuid | NO | — | FK → pets.id |
| **content_type** | varchar(20) | NO | — | diary, photo, vaccine, mood, allergy |
| **content_id** | uuid | NO | — | ID do registro fonte |
| **embedding** | vector(1536) | NO | — | Vetor de embedding |
| **content_text** | text | NO | — | Texto indexado |
| metadata | jsonb | YES | '{}' | Metadados extras |
| importance | numeric | NO | 0.5 | Importância (0-1) |
| is_active | boolean | NO | true | Soft delete |
| created_at | timestamptz | NO | now() | Criação |

---

## 9. rag_conversations

Conversas RAG com IA. PK = `id`. FKs = `pet_id`, `user_id`.

| Coluna | Tipo | Null | Default | Descrição |
|--------|------|------|---------|-----------|
| **id** | uuid | NO | gen_random_uuid() | PK |
| **pet_id** | uuid | NO | — | FK → pets.id |
| **user_id** | uuid | NO | — | FK → users.id |
| **query** | text | NO | — | Pergunta do tutor |
| **response** | text | NO | — | Resposta da IA |
| context_ids | jsonb | YES | '[]' | IDs dos embeddings usados |
| response_type | varchar(20) | YES | 'chat' | chat, insight, alert |
| tokens_used | integer | YES | null | Tokens consumidos |
| is_active | boolean | NO | true | Soft delete |
| created_at | timestamptz | NO | now() | Criação |

---

## 10. sessions

Sessões ativas. PK = `id`. FK = `user_id`.

| Coluna | Tipo | Null | Default | Descrição |
|--------|------|------|---------|-----------|
| **id** | uuid | NO | gen_random_uuid() | PK |
| **user_id** | uuid | NO | — | FK → users.id |
| device_name | varchar(100) | YES | null | Nome do dispositivo |
| device_type | varchar(20) | YES | null | Tipo (phone, tablet) |
| platform | varchar(20) | YES | null | android, ios, web |
| ip_address | inet | YES | null | IP |
| auth_method | varchar(20) | YES | null | password, biometric |
| is_active | boolean | NO | true | Sessão ativa |
| created_at | timestamptz | NO | now() | Criação |
| **expires_at** | timestamptz | NO | — | Expiração |

---

## 11. notifications_queue

Fila de notificações push. PK = `id`. FKs = `user_id`, `pet_id` (opcional).

| Coluna | Tipo | Null | Default | Descrição |
|--------|------|------|---------|-----------|
| **id** | uuid | NO | gen_random_uuid() | PK |
| **user_id** | uuid | NO | — | FK → users.id |
| pet_id | uuid | YES | null | FK → pets.id |
| **type** | varchar(20) | NO | — | vaccine_reminder, diary_reminder, ai_insight, welcome |
| **title** | varchar(200) | NO | — | Título |
| **body** | text | NO | — | Corpo |
| data | jsonb | YES | null | Dados extras |
| scheduled_for | timestamptz | NO | now() | Agendar para |
| sent_at | timestamptz | YES | null | Enviado em |
| is_read | boolean | NO | false | Lida |
| is_active | boolean | NO | true | Soft delete |
| created_at | timestamptz | NO | now() | Criação |

---

## 12. media_files

Arquivos de mídia. PK = `id`. FKs = `user_id`, `pet_id` (opcional).

| Coluna | Tipo | Null | Default | Descrição |
|--------|------|------|---------|-----------|
| **id** | uuid | NO | gen_random_uuid() | PK |
| **user_id** | uuid | NO | — | FK → users.id |
| pet_id | uuid | YES | null | FK → pets.id |
| **bucket** | varchar(50) | NO | — | pet-photos, avatars |
| **path** | text | NO | — | Caminho no storage |
| **original_name** | varchar(255) | NO | — | Nome original |
| **mime_type** | varchar(50) | NO | — | image/jpeg, image/webp |
| **size_bytes** | bigint | NO | — | Tamanho em bytes |
| width | integer | YES | null | Largura px |
| height | integer | YES | null | Altura px |
| is_active | boolean | NO | true | Soft delete |
| created_at | timestamptz | NO | now() | Criação |

---

## 13. audit_log

Log de auditoria automático. PK = `id`. FK = `user_id`.

| Coluna | Tipo | Null | Default | Descrição |
|--------|------|------|---------|-----------|
| **id** | uuid | NO | gen_random_uuid() | PK |
| user_id | uuid | YES | null | FK → users.id |
| **action** | varchar(20) | NO | — | INSERT, UPDATE, DELETE |
| **table_name** | varchar(50) | NO | — | Nome da tabela |
| record_id | uuid | YES | null | ID do registro |
| changes | jsonb | YES | null | Dados alterados |
| ip_address | inet | YES | null | IP |
| created_at | timestamptz | NO | now() | Criação |

---

## Views

### vw_pet_full_profile
Perfil completo do pet com dados do tutor, alergias e vacinas agregadas em JSONB.

### vw_pet_health_summary
Resumo de saúde: scores, contagem de vacinas (total, em dia, atrasadas, próximas), alergias (total, severas), última atividade.

### vw_pet_happiness_timeline
Timeline de humor ao longo do tempo para gráficos.

### vw_vaccine_alerts
Vacinas com alertas: dias atrasadas (`days_overdue`) ou dias até vencer (`days_until_due`).

### vw_rag_context_by_pet
Contexto RAG por pet com ranking por tipo de conteúdo.

---

## Triggers

| Trigger | Tabela | Evento | Função | Descrição |
|---------|--------|--------|--------|-----------|
| trg_audit_* | allergies, diary_entries, pets, vaccines | INSERT/UPDATE/DELETE | trg_fn_audit_log() | Log automático de auditoria |
| trg_pets_updated_at | pets | UPDATE | trg_fn_set_updated_at() | Atualiza updated_at |
| trg_users_updated_at | users | UPDATE | trg_fn_set_updated_at() | Atualiza updated_at |
| trg_allergies_health_score | allergies | INSERT/UPDATE/DELETE | trg_fn_update_health_score() | Recalcula health_score do pet |
| trg_vaccines_health_score | vaccines | INSERT/UPDATE/DELETE | trg_fn_update_health_score() | Recalcula health_score do pet |
| trg_diary_update_mood | diary_entries | INSERT | trg_fn_update_pet_mood_from_diary() | Atualiza current_mood do pet |
| trg_mood_happiness_score | mood_logs | INSERT | trg_fn_update_happiness_score() | Recalcula happiness_score do pet |

---

## Functions (do app)

| Função | Descrição |
|--------|-----------|
| fn_calculate_health_score(pet_id) | Calcula score de saúde baseado em vacinas e alergias |
| fn_calculate_happiness(pet_id) | Calcula score de felicidade baseado em mood_logs |
| fn_create_vaccine_reminders() | Cria notificações push para vacinas próximas/vencidas |
| fn_update_vaccine_statuses() | Atualiza status de vacinas (up_to_date → overdue) |
| fn_get_pet_rag_context(pet_id) | Busca contexto RAG para o pet |
| fn_search_rag(query_embedding, pet_id) | Busca semântica nos embeddings do pet |
| trg_fn_audit_log() | Trigger: registra alterações no audit_log |
| trg_fn_set_updated_at() | Trigger: atualiza campo updated_at |
| trg_fn_update_health_score() | Trigger: recalcula health_score |
| trg_fn_update_happiness_score() | Trigger: recalcula happiness_score |
| trg_fn_update_pet_mood_from_diary() | Trigger: atualiza current_mood do pet |
| trg_fn_handle_new_auth_user() | Trigger: cria registro em public.users quando novo user no auth |

---

## Storage Buckets

| Bucket | Público | Limite | Tipos | Uso |
|--------|---------|--------|-------|-----|
| **pets** | Sim | 5MB | jpeg, png, webp | Fotos dos pets (avatar + análises) |
| **tutores** | Sim | 5MB | jpeg, png, webp | Fotos dos tutores (avatar) |
| pet-photos | Sim | — | — | (legado — não usar) |
| avatars | Sim | — | — | (legado — não usar) |
| public-pages | Sim | — | — | Assets públicos |

---

## Edge Functions

| Função | Descrição |
|--------|-----------|
| analyze-pet-photo | Análise de foto do pet via Claude Vision API |
| translate-strings | Tradução dinâmica de strings via Claude API |
| send-reset-email | Envio de email de reset de senha |
| auth-callback | Callback de autenticação |
| generate-diary-narration | Narração do diário na voz do pet |
| generate-ai-insight | Insight semanal por pet |
| generate-embedding | Geração de embedding para RAG |
| search-rag | Busca semântica RAG |
| check-vaccine-status | Verificação de status de vacinas |
| compress-media | Compressão de mídia |
| send-push-notifications | Envio de push notifications |

---

## RLS (Row Level Security)

Ativo em TODAS as tabelas. Regra geral: `auth.uid() = user_id`.
Cada tutor só vê e edita seus próprios dados.
