# auExpert — Descrição Completa de Funcionalidades

> Gerado em 2026-04-25 | Fase MVP "Diário Inteligente"

---

## 1. AUTENTICAÇÃO

| Funcionalidade | Detalhe |
|---|---|
| **Cadastro** | Nome completo, email, senha (mín 8 chars, maiúscula, número, especial), validação de idade (LGPD 13 anos, GDPR 16 anos) |
| **Login** | Email + senha com contador de falhas (lock após 5, liberado em 15 min) |
| **Biometria** | Impressão digital ou Face ID — credenciais salvas no SecureStore do dispositivo, nunca no servidor |
| **Esqueci a senha** | Fluxo de reset via email (`send-reset-email` Edge Function) |
| **Sessão** | Token JWT gerenciado pelo Supabase Auth com refresh automático |
| **Auditoria** | Cada login registrado em `audit_log` com método (password / biometric) via `recordUserLogin()` |
| **Exclusão de conta** | Soft delete com cascade via `delete-account` Edge Function |

---

## 2. GESTÃO DE PETS

| Funcionalidade | Detalhe |
|---|---|
| **Cadastrar pet** | Nome, espécie (cão/gato), raça, data nasc., peso, porte, cor, microchip, tipo sanguíneo, castrado |
| **Análise por foto** | Tutor tira foto → IA estima raça, peso, idade, humor pela expressão (AI-first UX) |
| **Editar pet** | Todos os campos editáveis com validação |
| **Listar pets** | Hub "Meus Pets" com cards, filtro por espécie, pull-to-refresh |
| **Excluir pet** | Soft delete (`is_active = false`) + tela de restauração `deleted-records.tsx` |
| **Offline** | Criação/edição/exclusão enfileirada offline, sincroniza ao reconectar |
| **Co-tutores** | Até N tutores por pet (owner / co_parent / caregiver / viewer) com controle de visibilidade de finanças |

---

## 3. DIÁRIO INTELIGENTE

| Funcionalidade | Detalhe |
|---|---|
| **Nova entrada** | Texto, voz (STT), foto, vídeo, áudio do pet, PDF/scan — tela unificada com mic iniciando automaticamente |
| **STT (Speech-to-Text)** | `useSimpleSTT()` via expo-speech-recognition — transcreve em tempo real no idioma do dispositivo |
| **Classificação IA** | `classify-diary-entry` processa em background: tipo de entrada, humor, tags, urgência, métricas clínicas, gastos, alertas |
| **Narração** | `generate-diary-narration` gera texto literário em 3ª pessoa no idioma do tutor (≤ 150 palavras, tom Elite) |
| **Humor** | 13 humores predefinidos — seleção manual ou inferência por IA |
| **Lentes (ModuleCards)** | Cards especializados extraídos da classificação: gastos, métricas de peso, sintomas, lembretes, análise de áudio/vídeo |
| **AudioSubcard** | Detecta fallback silencioso do classificador e oculta badges enganosos, exibe nota discreta |
| **Modo Fast / Deep** | Análise rápida (max_tokens reduzido) ou profunda; fix garante que Gemini retorne `pet_audio_analysis`/`video_analysis` em Fast mode |
| **RAG por pet** | Embedding gerado ao publicar; cada pet tem memória vetorial isolada (`pet_embeddings`) |
| **Timeline** | Scroll infinito com pull-to-refresh; eventos agendados intercalados |
| **Edição** | Editar texto, regenerar narração, mudar humor |
| **Exclusão** | Soft delete — embedding mantido no RAG |
| **Eventos automáticos** | Vacinas vencendo, aniversários, insights semanais, conquistas — gerados pelo sistema |
| **Realtime** | Supabase Realtime invalida cache quando co-tutor escreve nova entrada |
| **Offline** | SQLite local para leitura; criação enfileirada e sincronizada ao reconectar |
| **Export PDF** | `diaryPdf.ts` — export completo com texto, narração, humor, tags, fotos |

---

## 4. MÓDULO DE SAÚDE

| Sub-módulo | Funcionalidade |
|---|---|
| **Vacinas** | Nome, data, lote, veterinário, clínica, próxima dose — alertas 7d e 1d antes via CRON |
| **Alergias** | Alérgeno, reação, severidade (leve/moderada/grave), data/diagnóstico |
| **Medicamentos** | Nome, dose, frequência, via, início/fim, observações |
| **Consultas** | Data, tipo (checkup/cirurgia/emergência), veterinário, clínica, diagnóstico, hora |
| **Exames** | Nome, data, resultado, laboratório, observações |
| **Cirurgias** | Nome, data, veterinário, clínica, notas pós-operatórias |
| **Health Score** | Score 0-100 calculado pela IA, exibido em `HealthScoreCircle` |
| **Bridge saúde → diário** | `bridge-health-to-diary` cria entrada emocional no diário a partir de evento de saúde com narração automática |
| **Soft delete** | Todos os registros recuperáveis via `deleted-records.tsx` |
| **Export PDF** | `healthPdf.ts` — prontuário completo |

---

## 5. ANÁLISE DE FOTO (IA Vision)

| Funcionalidade | Detalhe |
|---|---|
| **Upload / câmera** | Foto existente ou captura ao vivo |
| **Identificação** | Raça primária + confiança, raça secundária, mistura, porte, faixa etária, idade estimada, peso estimado, sexo, pelagem |
| **Saúde visual** | Body condition score (1-9), observações: pele/pelo/olhos/ouvidos/boca/unhas/higiene/parasitas/nódulos |
| **Humor** | Humor primário + confiança + sinais detectados na expressão/postura |
| **Ambiente** | Localização, acessórios, outros animais, riscos visíveis |
| **Alertas** | Saúde/segurança/cuidados por nível de severidade |
| **Profundidade** | Superficial (rápido) ou profundo (completo) — `AnalysisDepthInfoModal` explica diferenças |
| **Histórico** | Todas as análises salvas em `photo_analyses`, comparáveis via `compare-photo-analysis` |
| **Disclaimer** | Confidence < 0.5 → disclaimer obrigatório, nunca diagnosticar |
| **Export PDF** | `photo-analysisPdf.ts` |

---

## 6. NUTRIÇÃO

| Funcionalidade | Detalhe |
|---|---|
| **Modalidade** | Só ração, ração + natural, só comida caseira — com calculadora de % |
| **Ração atual** | Produto, marca, categoria, porção (g), porções/dia, calorias (kcal) |
| **Histórico alimentar** | Trocas de ração com datas |
| **Restrições** | Lista de alérgenos/ingredientes a evitar |
| **Suplementos** | Suplementos ativos com doses |
| **Avaliação IA** | Score 1-10 da dieta atual + prós/contras + recomendação (cache 7 dias) |
| **Cardápio semanal** | Gerado por IA — menu com receitas/ingredientes/passos/armazenamento (cache 3 dias) |
| **Dicas** | Tips de nutrição geradas por IA |
| **Export PDF** | `nutritionPdf.ts` + `cardapioPdf.ts` |

---

## 7. MÓDULO PROFISSIONAL

### 7.1 Perfil Profissional
Cadastro com tipo (vet/groomer/nutricionista/etc.), nome de exibição, conselho profissional, registro, idiomas, especialidades, bio.

### 7.2 Sete Agentes IA para Documentos

| Agente | Documento Gerado |
|---|---|
| **Anamnese** | Histórico do paciente + consultas + medicamentos + status vacinas + tendência de peso + sintomas + alertas |
| **Prontuário** | Rascunho médico: histórico, exame físico, diagnósticos, plano de tratamento, prognóstico, acompanhamento |
| **Receituário** | Receita (padrão/controlada/especial) com itens, dose, frequência, duração |
| **ASA** | Atestado de saúde/viagem: vacinas em dia, controle de parasitas, apto para viagem, achados |
| **TCI** | Termo de consentimento informado com captura de assinatura digital |
| **Notificação** | Notificação compulsória: código CID, nível de suspeita, órgão notificado |
| **Relatório de Alta** | Diagnóstico, tratamento, cuidados domiciliares, acompanhamento, sinais de alerta |

### 7.3 Acesso e Gating
- Tutores convidam profissionais por email → profissional aceita → acesso ao pet
- Controle por plano: quais agentes estão disponíveis (lock icon se não liberado)
- "Meus Pacientes" — lista de pets com acesso concedido
- TCI com assinatura digital salva em Storage

---

## 8. CO-TUTORES E PARCERIAS

| Funcionalidade | Detalhe |
|---|---|
| **Convites** | Tutor convida por email com função e expiração (1-30 dias) |
| **Aceite** | Via deep link no email ou no app |
| **Revogação** | Tutor revoga acesso a qualquer momento |
| **Visibilidade de finanças** | Toggle por membro |
| **Funções** | owner (completo), co_parent (leitura/escrita), caregiver (restrito), viewer (somente leitura) |
| **Realtime** | Entradas de co-tutores aparecem na timeline em tempo real |

---

## 9. NOTIFICAÇÕES E LEMBRETES

| Funcionalidade | Detalhe |
|---|---|
| **Push** | Expo Notifications — token registrado em `users.expo_push_token` |
| **Tipos** | vaccine_reminder, diary_reminder (19h), ai_insight, welcome, medication_reminder, followup_reminder |
| **CRON vacinas** | Diário 08:00 — alertas 7 dias e 1 dia antes do vencimento |
| **CRON eventos** | `check-scheduled-events` 2x/dia (07h + 20h) |
| **Fila** | `notifications_queue` — in-app + push, marcar lido, dispensar |
| **Tela lembretes** | Lista de pendentes ordenada por `scheduled_for` |

---

## 10. STATS (Painel do Tutor)

| Métrica | Detalhe |
|---|---|
| **Uso de IA** | Imagens analisadas, vídeos, áudios transcritos, scans, cardápios, prontuários gerados |
| **Pets** | Contagem de cães e gatos |
| **Pessoas** | Co-tutores, cuidadores, visitantes, total |
| **Profissionais** | Por tipo + convites pendentes |
| **Atividade** | Dias ativos no mês, data do último login |
| **Filtro** | Seletor de mês/ano |
| **Fonte** | RPC `get_user_stats` (Supabase) |

---

## 11. CONFIGURAÇÕES

| Funcionalidade | Detalhe |
|---|---|
| **Escala de fonte** | 3 opções de tamanho (`fontScale` via `usePreferencesStore`) |
| **Antecedência de notificações** | Long (dias), Mid (horas), Short (horas antes) — configurável por tipo |
| **Biometria** | Ativar/desativar |
| **Idioma** | Seletor de idioma do app |
| **Documentos legais** | Termos de uso, política de privacidade |
| **Zona de perigo** | Excluir conta permanentemente |

---

## 12. TELAS ADICIONAIS POR PET

| Tela | Funcionalidade |
|---|---|
| **Felicidade** | Curva de humor ao longo do tempo |
| **Conquistas** | Marcos e badges do pet |
| **Amigos** | Lista de co-tutores |
| **Gastos** | Despesas por categoria, total mensal |
| **Agenda** | Calendário de eventos agendados |
| **Viagem** | Documentação para viagem (ASA + vacinas) |
| **Prontuário** | Resumo médico consolidado + QR code |
| **Carteirinha** | ID card digital com microchip, tipo sanguíneo, contato do tutor |
| **Cápsulas do tempo** | Memórias encapsuladas |
| **Documentos** | Documentos enviados (receitas, exames) |
| **Seguro** | Informações de plano/seguro pet |
| **Testamento** | Testamento emocional |
| **Registros excluídos** | Restauração de soft-deletes |

---

## 13. EXPORT PDF (20+ tipos)

`diaryPdf` · `healthPdf` · `nutritionPdf` · `cardapioPdf` · `photo-analysisPdf` · `agendaPdf` · `expensesPdf` · `friendsPdf` · `happinessPdf` · `id-cardPdf` · `achievementsPdf` · `prontuarioPdf` · `painelPdf` · `profilePdf` · `preferencesPdf` · `professionalDocsPdf` · `travelPdf` · `iaChatPdf` · `plansPdf` · `helpPdf`

Todos usam `PdfActionModal` (bottom sheet Preview + Compartilhar), gerados via `expo-print`, compartilhados via `expo-sharing`.

---

## 14. OFFLINE FIRST

| Camada | Detalhe |
|---|---|
| **SQLite local** | Diário em cache para leitura offline |
| **Fila de mutações** | `offlineQueue.ts` — operações CRUD enfileiradas no AsyncStorage |
| **React Query** | staleTime 5 min, gcTime 30 min, retry 2 — serve do cache quando offline |
| **NetworkGuard** | Banner animado offline/online, contador de pendentes, sync automático ao reconectar |
| **onlineManager** | `@tanstack/react-query` + `@react-native-community/netinfo` sincronizados |

---

## 15. INTERNACIONALIZAÇÃO

- **Idiomas completos:** pt-BR, en-US (JSON estático)
- **Idiomas dinâmicos:** es-MX, es-AR, pt-PT e outros via `translate-strings` Edge Function
- **Detecção automática:** `expo-localization` → `getLocales()[0].languageTag`
- **IA responde no idioma do dispositivo** — parâmetro `language` em todas as Edge Functions

---

## 16. EDGE FUNCTIONS (40+)

| Grupo | Funções |
|---|---|
| **Auth** | `send-reset-email`, `auth-callback`, `delete-account` |
| **Diário** | `classify-diary-entry`, `generate-diary-narration`, `bridge-health-to-diary`, `generate-embedding`, `search-rag` |
| **IA** | `analyze-pet-photo`, `compare-photo-analysis`, `generate-ai-insight`, `generate-ai-tips`, `generate-personality` |
| **Nutrição** | `get-nutricao`, `generate-cardapio`, `evaluate-nutrition` |
| **Profissional** | `agent-anamnese`, `agent-prontuario`, `agent-receituario`, `agent-asa`, `agent-tci`, `agent-notificacao`, `agent-relatorio-alta`, `professional-invite-create/accept/cancel/expire`, `scan-professional-document` |
| **Notificações** | `send-push-notifications`, `check-scheduled-events` |
| **Utilitários** | `backfill-pet-rag`, `ocr-document`, `report-app-error`, `translate-strings`, `validate-ai-model` |
| **Admin** | `support-assistant`, `support-admin-reply`, `breed-feed`, `breed-editorial-generate` |

---

## 17. INFRAESTRUTURA

- **Supabase:** PostgreSQL 15+ / pgvector 0.7+ / Auth / Storage / Edge Functions (Deno) / Realtime
- **RLS ativo em todas as tabelas** — isolamento total por `user_id` e `pet_id`
- **Modelo IA via `app_config`** — nunca hardcoded; atualização = 1 UPDATE no banco
- **Admin Dashboard** — app Next.js em `admin-dashboard/` (custos IA, suporte, erros, usuários)
- **Relatório de erros** — `initRemoteErrorReporting()` + `report-app-error` Edge Function

---

*auExpert — Multiverso Digital (Belisario) — MVP "Diário Inteligente" — 2026*
