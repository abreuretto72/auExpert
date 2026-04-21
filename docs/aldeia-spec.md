# Aldeia — Rede Solidária (pós-MVP)

> Doc de referência. **NÃO é skill** — não carrega automaticamente. Abrir explicitamente com `@docs/aldeia-spec.md` quando for trabalhar em qualquer tela ou Edge Function relacionada à Aldeia.

## Conceito

Micro-rede de proteção hiperlocal onde tutores, pets, parceiros e a IA colaboram.

**3 modos:**
- **Escudo** — passivo (proteção automática de dados)
- **Círculo** — ativo (SOS, favores)
- **Praça** — social (feed, eventos)

**5 participantes:**
- Tutores
- Pets (com presença própria no app)
- Parceiros (vet, pet shop, groomer, walker, hotel, trainer, ONG)
- Guardiões
- ONGs

**5 níveis de progressão:**
Observador → Membro → Guardião → Ancião → Fundador

## Documentação completa (referência)

| Arquivo | Conteúdo |
|---|---|
| `aldeia_spec_unificada.md` | Spec completa: 15 seções, conceito, participantes, 3 modos, motivação/vaidade, 9 funcionalidades inéditas, eventos, Pet-Credits, confiança, rankings, avatares IA, i18n, integração, notificações, tabelas, diferenciais |
| `aldeia_db_telas_spec.md` | Modelo de dados: 22 tabelas SQL (~328 colunas), mapa de navegação (7 telas + 9 modais), mapa SQL→TypeScript (25+ types), ordem de criação (26 passos) |
| `aldeia_avatares_spec.md` | Sistema de avatares IA: cold start, templates 12 países, i18n, jornada 7 dias, transição gradual |
| `aldeia_vaidade_avatares_spec.md` | Vaidade do tutor: Admirar, galeria IA, cartão QR, retrospectiva, rankings por cuidado real, avatares ultra-realistas |

## Banco de dados — 22 tabelas

```
-- Core
aldeia_communities        -- Aldeias (nome, polígono geo, stats, avatar_count)
aldeia_members            -- Tutores na Aldeia (level, karma, trust, credits, verificação)

-- Feed e social
aldeia_feed               -- Posts (post, story, alert, event_share, achievement, ai_generated)
aldeia_feed_reactions     -- Admirações e comentários (1 admiração/user/pet/dia)
aldeia_pet_graph          -- Grafo social dos pets (best_friend, friend, acquaintance, neutral, avoid)

-- Favores e SOS
aldeia_favors             -- Favores (walk, care, transport, feeding, grooming, other)
aldeia_sos                -- Emergências (medical, lost_pet, urgent_help) com proxy_data JSONB
aldeia_sos_responses      -- Respostas ao SOS (on_my_way, can_help, sighting, info, found)
aldeia_reviews            -- Avaliações mútuas pós-favor (4 dimensões + overall)

-- Eventos
aldeia_events             -- Eventos (walk, fair, vaccination, social, rescue, workshop, adoption)
aldeia_event_attendees    -- Confirmações + check-in GPS

-- Alertas e classificados
aldeia_alerts             -- Alertas comunitários (danger, warning, info, noise, health)
aldeia_classifieds        -- Classificados solidários (donation, exchange, lend)

-- Economia e parceiros
aldeia_partners           -- Parceiros verificados (vet, pet_shop, groomer, walker, hotel, trainer, ong)
aldeia_pet_credits_log    -- Histórico de créditos (ganho/gasto/saldo)
aldeia_rankings           -- Rankings mensais (5 tipos)

-- IA e memória
aldeia_health_alerts      -- Epidemiologia IA (outbreak, poisoning, seasonal, parasite, behavioral)
aldeia_memorials          -- Memoriais de pets falecidos
aldeia_memorial_messages  -- Mensagens no memorial

-- Avatares IA (cold start)
aldeia_avatar_templates   -- Templates por país/região (12 países)
aldeia_ai_avatars         -- Avatares gerados para cold start
aldeia_avatar_interactions -- Log de interações com avatares IA
```

## Conceitos-chave

- **Admirar** — reconhecimento de cuidado real (substitui o "like" tradicional). 1 admiração por user / pet / dia.
- **Pet-Credits** — moeda solidária de reciprocidade. Não é dinheiro real.
- **Proof of Love** — score de cuidado ativo: `none → bronze → silver → gold → diamond`.
- **Grafo Social do Pet** — rede de amizades ENTRE PETS (não entre tutores).
- **SOS Proxy** — compartilhamento automático de dados médicos em emergência.
- **Aldeia Viva** — sistema de avatares IA para resolver cold start (aldeia vazia no dia 1).
