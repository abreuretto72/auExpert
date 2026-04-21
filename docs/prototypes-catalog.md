# Catálogo de Protótipos

> Referência de layout e dados dos protótipos em `docs/prototypes/`. Todos são referência de **layout e estrutura de dados**, NÃO de cores. A paleta definitiva está em `.claude/skills/auexpert-design-system/` — prevalece SEMPRE sobre protótipos antigos.
> Protótipos antigos usam emojis; no código real, substituir por ícones Lucide.

## Protótipos com identidade v5/v6 (definitiva)

| Arquivo | Conteúdo | Status |
|---|---|---|
| `petaulife_login_v5.jsx` | Login + Biometria + Cadastro | ✅ v5 definitivo |
| `petaulife_hub_v6.jsx` | Hub com card Aldeia + Tutor + Pets | ✅ v6 definitivo |
| `petaulife_pet_dashboard.jsx` | Dashboard do Pet (12 funcionalidades) | ✅ v6 |
| `petaulife_diary_new_entry.jsx` | Diário nova entrada (5 etapas AI-first) | ✅ v6 |
| `NovaEntradaScreen.jsx` | **Tela unificada de nova entrada — mic + anexos + Gravar no Diário** | ✅ v8 ATUAL |

## Protótipos da Aldeia — 13 telas (identidade v6)

| Arquivo | Conteúdo |
|---|---|
| `aldeia_home_screen.jsx` | Home 4 abas (Feed, Mapa, SOS, Mais) |
| `aldeia_pet_profile_screen.jsx` | Perfil Público do Pet (vitrine + Admirar) |
| `aldeia_sos_details_screen.jsx` | SOS (mapa, prontuário proxy, timeline) |
| `aldeia_event_details_screen.jsx` | Evento (confirmações, check-in, alertas IA) |
| `aldeia_rankings_screen.jsx` | Rankings (5 abas, pódio, Aldeia vs Aldeia) |
| `aldeia_partner_list_screen.jsx` | Lista Parceiros (filtros, busca) |
| `aldeia_partner_profile_screen.jsx` | Perfil Parceiro (descontos PoL, avaliações) |
| `aldeia_modal_new_post.jsx` | Modal: Novo Post (voz/foto AI-first) |
| `aldeia_modal_sos_type.jsx` | Modal: Tipo SOS (médico, perdido, urgente) |
| `aldeia_modal_new_event.jsx` | Modal: Criar Evento |
| `aldeia_modal_new_favor.jsx` | Modal: Pedir Favor |
| `aldeia_modal_new_classified.jsx` | Modal: Oferecer Item (foto IA) |
| `aldeia_modal_review.jsx` | Modal: Avaliação Pós-Favor (4 estrelas) |

## Especificação técnica (documentos de referência)

| Arquivo | Conteúdo |
|---|---|
| `mvp_spec_petaulife.jsx` | 12 tabelas, 5 sprints, 88 tarefas, prompts IA, stack |
| `database_schema_petaulife.jsx` | Schema interativo 27 tabelas |
| `erd_completo_petaulife.jsx` | ERD 37 tabelas com views/triggers/functions |
| `pets_table_master.jsx` | Tabela pets: 95 campos, 33 filhas |
| `tutor_table_master.jsx` | Tabela users: ~170 campos, medalhas |
| `media_translation_arch.jsx` | Buckets, compressão, tradução |
| `diary_spec_completa.md` | Diário: 7 tipos, 5 tabelas SQL, Edge Functions, RAG |
| `aldeia_spec_unificada.md` | Aldeia completa (15 seções, merge de 4 docs) |
| `aldeia_db_telas_spec.md` | Aldeia: 22 tabelas, telas, types TS |
| `aldeia_avatares_spec.md` | Avatares IA: cold start, i18n 12 países |
| `aldeia_vaidade_avatares_spec.md` | Vaidade tutor + avatares ultra-realistas |

## Protótipos de tela (layout de referência, paleta v1 — usar cores do design system)

| Arquivo | Conteúdo |
|---|---|
| `pet_ai_screens.jsx` | Análises IA (foto, vídeo, áudio, OCR) |
| `rede_solidaria_pets.jsx` | Feed, mapa, SOS, Credits, playdates |
| `prontuario_saude_pet.jsx` | Vacinas, exames, remédios, consultas |
| `diario_vida_pet.jsx` | Diário/timeline com narração IA |
| `co_parentalidade_pet.jsx` | Rede de cuidadores, agenda |
| `grafico_felicidade_pet.jsx` | Curva emocional, heatmap |
| `capsula_tempo_pet.jsx` | Cápsulas do tempo |
| `testamento_emocional_pet.jsx` | Testamento e sucessão |
| `conquistas_pet.jsx` | 30 emblemas, XP, níveis |
| `qr_carteirinha_pet.jsx` | QR Code, carteirinha digital |
| `viagens_pet.jsx` | Roteiros, registros pet-friendly |
| `planos_seguros_pet.jsx` | Saúde, funerário, bem-estar |
| `nutricao_pet.jsx` | Cardápio, alimentos, receitas |

## Protótipos descartados (histórico de evolução visual)

| Arquivo | Motivo |
|---|---|
| `petaulife_mvp_sprint1.jsx` | Paleta laranja terroso, sem personalidade |
| `petaulife_v2_identity.jsx` | Teal vibrante em fundo claro, genérico |
| `petaulife_v3_dark.jsx` | Verde esmeralda, não combina com brand |
| `petaulife_login_v4.jsx` | Mic em campo de senha, biometria sem glow |
| `login_auth_pet.jsx` | Paleta antiga, emojis |
| `meus_pets_hub.jsx` | Paleta antiga, emojis |
