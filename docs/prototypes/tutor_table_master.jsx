import { useState, useRef } from "react";

const C = {
  bg: "#0C1117", bgCard: "#131C28", card: "#1A2535",
  primary: "#4A9EE8", primarySoft: "#4A9EE810", primaryMed: "#4A9EE820",
  green: "#3DD68C", greenSoft: "#3DD68C10",
  amber: "#E8B44A", amberSoft: "#E8B44A10",
  coral: "#E86854", coralSoft: "#E8685410",
  plum: "#A06ED8", plumSoft: "#A06ED810",
  teal: "#3AC4B0", tealSoft: "#3AC4B010",
  rose: "#E06888", roseSoft: "#E0688810",
  sky: "#5BB8F0", skySoft: "#5BB8F010",
  orange: "#E89040", orangeSoft: "#E8904010",
  pink: "#FF6B9D", pinkSoft: "#FF6B9D10",
  lime: "#84CC16", limeSoft: "#84CC1610",
  indigo: "#818CF8", indigoSoft: "#818CF810",
  cyan: "#22D3EE", cyanSoft: "#22D3EE10",
  gold: "#F0C754", goldSoft: "#F0C75410",
  text: "#E0E8F0", textSec: "#8CA0B8", textDim: "#4A6078", textGhost: "#2A3C50",
  border: "#1E3045",
};
const font = "'Sora', -apple-system, sans-serif";
const fontMono = "'JetBrains Mono', monospace";

const tutorColumns = [
  { section: "🆔 Identificação e Autenticação", fields: [
    { n: "id", t: "UUID", k: "PK", desc: "Identificador único do tutor", idx: true, req: true },
    { n: "email", t: "VARCHAR(255)", k: "UQ", desc: "Email de login — único global para tutores e assistentes", idx: true, req: true },
    { n: "password_hash", t: "VARCHAR(255)", desc: "Hash bcrypt da senha (mín 8 caracteres)", req: true },
    { n: "full_name", t: "VARCHAR(150)", desc: "Nome completo do tutor", req: true },
    { n: "display_name", t: "VARCHAR(50)", desc: "Nome exibido na rede (apelido)", nullable: true },
    { n: "cpf", t: "VARCHAR(14)", k: "UQ", desc: "CPF do tutor (Brasil) ou doc equivalente no país", idx: true, nullable: true },
    { n: "document_type", t: "ENUM", desc: "'cpf' | 'passport' | 'national_id' | 'other'", nullable: true },
    { n: "document_number", t: "VARCHAR(30)", desc: "Número do documento (formato do país)", nullable: true },
    { n: "phone", t: "VARCHAR(20)", desc: "Telefone com código do país (+55 15 99812-3456)", req: true },
    { n: "phone_verified", t: "BOOLEAN DEFAULT false", desc: "Se o telefone foi verificado por SMS" },
    { n: "email_verified", t: "BOOLEAN DEFAULT false", desc: "Se o email foi confirmado" },
    { n: "birth_date", t: "DATE", desc: "Data de nascimento do tutor", nullable: true },
    { n: "gender", t: "ENUM", desc: "'male' | 'female' | 'non_binary' | 'prefer_not_say'", nullable: true },
    { n: "avatar_url", t: "TEXT", desc: "Foto de perfil no bucket avatars (WebP 400px)", nullable: true, bucket: "avatars" },
    { n: "cover_photo_url", t: "TEXT", desc: "Foto de capa do perfil", nullable: true, bucket: "avatars" },
    { n: "bio", t: "VARCHAR(300)", desc: "Mini bio do tutor ('Mãe de 2 dogs e 1 gato')", nullable: true },
  ]},
  { section: "🔐 Controle de Acesso", fields: [
    { n: "role", t: "ENUM", desc: "'tutor_owner' (proprietário) | 'assistant' (convidado)", req: true, idx: true },
    { n: "owner_id", t: "UUID", k: "FK→users", desc: "NULL se owner · ID do dono se assistant", nullable: true, idx: true },
    { n: "biometric_enabled", t: "BOOLEAN DEFAULT false", desc: "Se biometria está ativa neste dispositivo" },
    { n: "biometric_type", t: "ENUM", desc: "'fingerprint' | 'face_id' | null", nullable: true },
    { n: "two_factor_enabled", t: "BOOLEAN DEFAULT false", desc: "Se 2FA está ativo (SMS ou authenticator)" },
    { n: "two_factor_method", t: "ENUM", desc: "'sms' | 'authenticator' | null", nullable: true },
    { n: "is_active", t: "BOOLEAN DEFAULT true", desc: "Conta ativa. false = suspensa ou excluída", idx: true },
    { n: "is_banned", t: "BOOLEAN DEFAULT false", desc: "Conta banida por violação de termos" },
    { n: "ban_reason", t: "TEXT", desc: "Motivo do banimento", nullable: true },
    { n: "last_login_at", t: "TIMESTAMPTZ", desc: "Último acesso ao app" },
    { n: "last_login_device", t: "VARCHAR(100)", desc: "Dispositivo do último login" },
    { n: "last_login_ip", t: "INET", desc: "IP do último login" },
    { n: "login_count", t: "INTEGER DEFAULT 0", desc: "Total de logins realizados", computed: true },
    { n: "failed_login_attempts", t: "INTEGER DEFAULT 0", desc: "Tentativas falhas consecutivas (lock após 5)" },
    { n: "locked_until", t: "TIMESTAMPTZ", desc: "Conta bloqueada até esta data após 5 falhas", nullable: true },
    { n: "password_changed_at", t: "TIMESTAMPTZ", desc: "Última troca de senha" },
  ]},
  { section: "🌍 Localização e Endereço", fields: [
    { n: "country_code", t: "VARCHAR(3)", desc: "Código ISO 3166-1 alfa-3 (BRA, USA, PRT, ESP...)", req: true, idx: true },
    { n: "country_name", t: "VARCHAR(100)", desc: "Nome do país no idioma local ('Brasil', 'United States')" },
    { n: "state_code", t: "VARCHAR(10)", desc: "Código do estado/província (SP, CA, Lisboa...)", idx: true },
    { n: "state_name", t: "VARCHAR(100)", desc: "Nome completo do estado ('São Paulo', 'California')" },
    { n: "city", t: "VARCHAR(100)", desc: "Cidade do tutor ('Salto', 'New York')", req: true, idx: true },
    { n: "neighborhood", t: "VARCHAR(100)", desc: "Bairro", nullable: true },
    { n: "address_street", t: "VARCHAR(255)", desc: "Rua / Logradouro", nullable: true },
    { n: "address_number", t: "VARCHAR(20)", desc: "Número", nullable: true },
    { n: "address_complement", t: "VARCHAR(100)", desc: "Complemento (apto, bloco...)", nullable: true },
    { n: "postal_code", t: "VARCHAR(15)", desc: "CEP / ZIP Code / Postal Code", nullable: true, idx: true },
    { n: "latitude", t: "DECIMAL(10,7)", desc: "Coordenada para mapa da aldeia e busca de proximidade", idx: true, nullable: true },
    { n: "longitude", t: "DECIMAL(10,7)", desc: "Coordenada geográfica", idx: true, nullable: true },
    { n: "geo_region", t: "VARCHAR(50)", desc: "Região geográfica (Sudeste, West Coast...) — para analytics", computed: true },
    { n: "timezone", t: "VARCHAR(50)", desc: "Fuso horário (America/Sao_Paulo, Europe/Lisbon...)", req: true },
    { n: "address_is_public", t: "BOOLEAN DEFAULT false", desc: "Se o endereço aparece no perfil público" },
  ]},
  { section: "🌐 Idioma e Internacionalização", fields: [
    { n: "language", t: "VARCHAR(5)", desc: "Idioma principal do app: pt-BR, en-US, es-ES, fr-FR, it-IT, de-DE", req: true, idx: true },
    { n: "secondary_language", t: "VARCHAR(5)", desc: "Segundo idioma (para tradução de chat)", nullable: true },
    { n: "auto_translate", t: "BOOLEAN DEFAULT true", desc: "Se tradução automática de mensagens está ativa" },
    { n: "date_format", t: "ENUM", desc: "'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'", req: true },
    { n: "currency", t: "VARCHAR(3)", desc: "Moeda: BRL, USD, EUR, GBP...", req: true },
    { n: "weight_unit", t: "ENUM", desc: "'kg' | 'lb'", req: true },
    { n: "temperature_unit", t: "ENUM", desc: "'celsius' | 'fahrenheit'", req: true },
    { n: "distance_unit", t: "ENUM", desc: "'km' | 'miles'", req: true },
  ]},
  { section: "🔒 Privacidade e Consentimentos", fields: [
    { n: "profile_visibility", t: "ENUM", desc: "'public' | 'community' | 'friends_only' | 'private'", req: true },
    { n: "show_real_name", t: "BOOLEAN DEFAULT true", desc: "Exibir nome real ou apenas display_name" },
    { n: "show_city", t: "BOOLEAN DEFAULT true", desc: "Exibir cidade no perfil" },
    { n: "show_pets_public", t: "BOOLEAN DEFAULT true", desc: "Se pets aparecem em buscas da comunidade" },
    { n: "allow_playdate_invites", t: "BOOLEAN DEFAULT true", desc: "Receber convites de playdate de desconhecidos" },
    { n: "allow_safeswap_requests", t: "BOOLEAN DEFAULT true", desc: "Receber pedidos de SafeSwap" },
    { n: "allow_sos_notifications", t: "BOOLEAN DEFAULT true", desc: "Receber alertas SOS da comunidade" },
    { n: "allow_partner_offers", t: "BOOLEAN DEFAULT true", desc: "Receber ofertas de parceiros" },
    { n: "data_sharing_anonymous", t: "BOOLEAN DEFAULT false", desc: "Compartilhar dados anonimizados para pesquisa" },
    { n: "data_sharing_partners", t: "BOOLEAN DEFAULT false", desc: "Compartilhar dados com parceiros para descontos" },
    { n: "marketing_email", t: "BOOLEAN DEFAULT false", desc: "Aceita receber emails de marketing" },
    { n: "marketing_push", t: "BOOLEAN DEFAULT true", desc: "Aceita push notifications promocionais" },
    { n: "terms_accepted_at", t: "TIMESTAMPTZ", desc: "Data de aceite dos termos de uso", req: true },
    { n: "terms_version", t: "VARCHAR(10)", desc: "Versão dos termos aceitos ('v2.1')" },
    { n: "privacy_accepted_at", t: "TIMESTAMPTZ", desc: "Data de aceite da política de privacidade", req: true },
    { n: "privacy_version", t: "VARCHAR(10)", desc: "Versão da política aceita" },
    { n: "gdpr_consent", t: "BOOLEAN DEFAULT false", desc: "Consentimento GDPR (obrigatório na UE)" },
    { n: "lgpd_consent", t: "BOOLEAN DEFAULT false", desc: "Consentimento LGPD (obrigatório no Brasil)" },
    { n: "data_export_requested_at", t: "TIMESTAMPTZ", desc: "Se pediu exportação de dados (LGPD/GDPR)", nullable: true },
    { n: "data_deletion_requested_at", t: "TIMESTAMPTZ", desc: "Se pediu exclusão de dados", nullable: true },
  ]},
  { section: "🔔 Preferências de Notificação", fields: [
    { n: "notif_health_alerts", t: "BOOLEAN DEFAULT true", desc: "Vacinas vencidas, exames pendentes, medicação" },
    { n: "notif_health_ai_insights", t: "BOOLEAN DEFAULT true", desc: "Insights preditivos da IA sobre saúde" },
    { n: "notif_diary_reminders", t: "BOOLEAN DEFAULT true", desc: "Lembrete para escrever no diário" },
    { n: "notif_mood_check", t: "BOOLEAN DEFAULT true", desc: "Lembrete para registrar humor do pet" },
    { n: "notif_community_sos", t: "BOOLEAN DEFAULT true", desc: "Alertas de pet perdido e SOS" },
    { n: "notif_playdates", t: "BOOLEAN DEFAULT true", desc: "Convites e lembretes de playdates" },
    { n: "notif_safeswap", t: "BOOLEAN DEFAULT true", desc: "Propostas de troca de cuidados" },
    { n: "notif_credits_earned", t: "BOOLEAN DEFAULT true", desc: "Pet-Credits ganhos" },
    { n: "notif_achievements", t: "BOOLEAN DEFAULT true", desc: "Conquistas desbloqueadas" },
    { n: "notif_capsule_unlock", t: "BOOLEAN DEFAULT true", desc: "Cápsulas do tempo desbloqueadas" },
    { n: "notif_testament_verify", t: "BOOLEAN DEFAULT true", desc: "Verificação periódica do testamento" },
    { n: "notif_partner_offers", t: "BOOLEAN DEFAULT false", desc: "Ofertas de parceiros" },
    { n: "notif_quiet_start", t: "TIME", desc: "Início do modo silencioso (ex: 22:00)", nullable: true },
    { n: "notif_quiet_end", t: "TIME", desc: "Fim do modo silencioso (ex: 07:00)", nullable: true },
  ]},
  { section: "🎨 Preferências de Interface", fields: [
    { n: "theme", t: "ENUM", desc: "'light' | 'dark' | 'system'", req: true },
    { n: "font_size", t: "ENUM", desc: "'small' | 'medium' | 'large' | 'extra_large'", req: true },
    { n: "reduced_motion", t: "BOOLEAN DEFAULT false", desc: "Acessibilidade: reduzir animações" },
    { n: "high_contrast", t: "BOOLEAN DEFAULT false", desc: "Acessibilidade: alto contraste" },
    { n: "screen_reader_mode", t: "BOOLEAN DEFAULT false", desc: "Otimizado para leitor de tela" },
    { n: "default_pet_id", t: "UUID", k: "FK→pets", desc: "Pet padrão ao abrir o app (se tem mais de 1)", nullable: true },
    { n: "feed_sort", t: "ENUM", desc: "'recent' | 'popular' | 'nearby'", nullable: true },
  ]},
  { section: "💰 Financeiro e Pagamento", fields: [
    { n: "stripe_customer_id", t: "VARCHAR(50)", k: "UQ", desc: "ID do cliente no Stripe para pagamentos", nullable: true },
    { n: "payment_method_default", t: "ENUM", desc: "'credit_card' | 'debit_card' | 'pix' | 'boleto' | 'paypal' | 'apple_pay' | 'google_pay'", nullable: true },
    { n: "card_last_four", t: "VARCHAR(4)", desc: "Últimos 4 dígitos do cartão principal", nullable: true },
    { n: "card_brand", t: "VARCHAR(20)", desc: "Visa, Mastercard, Elo, Amex...", nullable: true },
    { n: "pix_key", t: "VARCHAR(100)", desc: "Chave Pix cadastrada (se Brasil)", nullable: true },
    { n: "subscription_tier", t: "ENUM", desc: "'free' | 'plus' | 'premium'", req: true, idx: true },
    { n: "subscription_started_at", t: "TIMESTAMPTZ", desc: "Quando iniciou a assinatura atual", nullable: true },
    { n: "subscription_expires_at", t: "TIMESTAMPTZ", desc: "Quando expira a assinatura", nullable: true, idx: true },
    { n: "subscription_auto_renew", t: "BOOLEAN DEFAULT true", desc: "Renovação automática ativa" },
    { n: "total_spent_subscriptions", t: "DECIMAL(10,2) DEFAULT 0", desc: "Total gasto com assinaturas", computed: true },
    { n: "total_spent_partners", t: "DECIMAL(10,2) DEFAULT 0", desc: "Total gasto com parceiros", computed: true },
    { n: "total_spent_all", t: "DECIMAL(10,2) DEFAULT 0", desc: "Total geral de gastos no app", computed: true },
    { n: "total_savings", t: "DECIMAL(10,2) DEFAULT 0", desc: "Total economizado com descontos RSP/PetCredits", computed: true },
  ]},
  { section: "⭐ Pet-Credits e Moeda Solidária", fields: [
    { n: "pet_credits_balance", t: "INTEGER DEFAULT 0", desc: "Saldo atual de Pet-Credits", computed: true, idx: true },
    { n: "pet_credits_earned_total", t: "INTEGER DEFAULT 0", desc: "Total de créditos ganhos historicamente", computed: true },
    { n: "pet_credits_spent_total", t: "INTEGER DEFAULT 0", desc: "Total de créditos gastos", computed: true },
    { n: "pet_credits_earned_month", t: "INTEGER DEFAULT 0", desc: "Créditos ganhos no mês atual", computed: true },
    { n: "last_credit_activity_at", t: "TIMESTAMPTZ", desc: "Última movimentação de créditos", nullable: true },
  ]},
  { section: "🏆 Gamificação do Tutor", fields: [
    { n: "tutor_xp", t: "INTEGER DEFAULT 0", desc: "XP total do tutor (soma de todos os pets)", computed: true, idx: true },
    { n: "tutor_level", t: "ENUM", desc: "'Iniciante' | 'Cuidador' | 'Dedicado' | 'Expert' | 'Lenda'", computed: true },
    { n: "tutor_level_progress", t: "INTEGER", desc: "% de progresso para o próximo nível (0-100)", computed: true },
    { n: "tutor_rank_city", t: "INTEGER", desc: "Posição no ranking da cidade", computed: true },
    { n: "tutor_rank_country", t: "INTEGER", desc: "Posição no ranking do país", computed: true },
    { n: "total_pets_registered", t: "INTEGER DEFAULT 0", desc: "Total de pets cadastrados (ativos + memorial)", computed: true },
    { n: "total_pets_active", t: "INTEGER DEFAULT 0", desc: "Pets ativos (não memorial)", computed: true },
    { n: "total_diary_entries_all", t: "INTEGER DEFAULT 0", desc: "Total de entradas de diário (soma todos os pets)", computed: true },
    { n: "total_walks_all", t: "INTEGER DEFAULT 0", desc: "Total de passeios registrados", computed: true },
    { n: "total_ai_analyses_all", t: "INTEGER DEFAULT 0", desc: "Total de análises IA executadas", computed: true },
    { n: "total_community_helps", t: "INTEGER DEFAULT 0", desc: "Vezes que ajudou na comunidade (SOS, SafeSwap)", computed: true },
    { n: "total_playdates_organized", t: "INTEGER DEFAULT 0", desc: "Playdates organizadas pelo tutor", computed: true },
    { n: "total_reviews_written", t: "INTEGER DEFAULT 0", desc: "Reviews de parceiros escritas", computed: true },
    { n: "days_active", t: "INTEGER DEFAULT 0", desc: "Total de dias com pelo menos 1 ação no app", computed: true },
    { n: "current_daily_streak", t: "INTEGER DEFAULT 0", desc: "Dias consecutivos de uso do app", computed: true },
    { n: "best_daily_streak", t: "INTEGER DEFAULT 0", desc: "Recorde de dias consecutivos", computed: true },
    { n: "consecutive_months_active", t: "INTEGER DEFAULT 0", desc: "Meses consecutivos com atividade", computed: true },
  ]},
  { section: "🎖️ Medalhas e Prêmios do Tutor", fields: [
    { n: "medals", t: "JSONB", desc: "Medalhas desbloqueadas: [{id, name, emoji, earned_at, tier}]", nullable: true },
    { n: "medals_count", t: "INTEGER DEFAULT 0", desc: "Total de medalhas ganhas", computed: true },
    { n: "featured_medal_id", t: "VARCHAR(50)", desc: "Medalha em destaque no perfil (escolhida pelo tutor)", nullable: true },
    { n: "titles_unlocked", t: "JSONB", desc: "Títulos desbloqueados: ['Herói da Aldeia','Super Padrinho'...]", nullable: true },
    { n: "current_title", t: "VARCHAR(100)", desc: "Título exibido no perfil ('Herói da Aldeia de Salto')", nullable: true },
    { n: "badges_special", t: "JSONB", desc: "Badges especiais: early_adopter, beta_tester, top_contributor...", nullable: true },
    { n: "seasonal_rewards", t: "JSONB", desc: "Recompensas sazonais: [{season, year, reward, redeemed}]", nullable: true },
    { n: "partner_coupons", t: "JSONB", desc: "Cupons ativos de parceiros: [{partner_id, code, discount, expires}]", nullable: true },
    { n: "proof_of_love_score", t: "INTEGER DEFAULT 0", desc: "Score de cuidado ativo (0-1000). Quanto maior, mais desconto em parceiros.", computed: true, idx: true },
    { n: "proof_of_love_tier", t: "ENUM", desc: "'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'", computed: true },
    { n: "proof_of_love_discount_pct", t: "DECIMAL(4,2)", desc: "% de desconto atual em parceiros (5%, 10%, 15%, 20%, 25%)", computed: true },
  ]},
  { section: "🤝 Rede e Indicações", fields: [
    { n: "referral_code", t: "VARCHAR(20)", k: "UQ", desc: "Código único de indicação do tutor", idx: true },
    { n: "referred_by_user_id", t: "UUID", k: "FK→users", desc: "Quem indicou este tutor", nullable: true },
    { n: "referral_count", t: "INTEGER DEFAULT 0", desc: "Quantas pessoas indicou que se cadastraram", computed: true },
    { n: "referral_credits_earned", t: "INTEGER DEFAULT 0", desc: "Créditos ganhos por indicações", computed: true },
    { n: "is_ambassador", t: "BOOLEAN DEFAULT false", desc: "Se é embaixador da rede (top referrers)" },
    { n: "ambassador_tier", t: "ENUM", desc: "'none' | 'bronze' | 'silver' | 'gold'", nullable: true },
    { n: "community_village_id", t: "UUID", desc: "Aldeia/comunidade local do tutor", nullable: true, idx: true },
    { n: "village_role", t: "ENUM", desc: "'member' | 'moderator' | 'leader'", nullable: true },
    { n: "assistants_count", t: "INTEGER DEFAULT 0", desc: "Assistentes ativos (max 2)", computed: true },
    { n: "co_parents_total", t: "INTEGER DEFAULT 0", desc: "Total de co-parents em todos os pets", computed: true },
  ]},
  { section: "📊 Analytics e Engajamento", fields: [
    { n: "onboarding_completed", t: "BOOLEAN DEFAULT false", desc: "Se completou o tutorial inicial" },
    { n: "onboarding_step", t: "INTEGER DEFAULT 0", desc: "Etapa atual do onboarding (0-5)" },
    { n: "first_pet_added_at", t: "TIMESTAMPTZ", desc: "Quando cadastrou o primeiro pet", nullable: true },
    { n: "first_diary_at", t: "TIMESTAMPTZ", desc: "Quando fez a primeira entrada de diário", nullable: true },
    { n: "first_ai_analysis_at", t: "TIMESTAMPTZ", desc: "Primeira análise IA utilizada", nullable: true },
    { n: "first_purchase_at", t: "TIMESTAMPTZ", desc: "Primeira transação com parceiro", nullable: true },
    { n: "app_rating_given", t: "INTEGER", desc: "Nota dada ao app (1-5) se solicitada", nullable: true },
    { n: "app_rating_at", t: "TIMESTAMPTZ", desc: "Quando avaliou o app", nullable: true },
    { n: "nps_score", t: "INTEGER", desc: "Net Promoter Score (0-10)", nullable: true },
    { n: "nps_at", t: "TIMESTAMPTZ", desc: "Quando respondeu NPS", nullable: true },
    { n: "churn_risk_score", t: "DECIMAL(3,2)", desc: "Risco de abandono 0.00-1.00 (calculado por ML)", computed: true },
    { n: "last_active_at", t: "TIMESTAMPTZ", desc: "Última ação no app (qualquer)", idx: true },
    { n: "engagement_score", t: "INTEGER", desc: "Score de engajamento 0-100 (baseado em frequência e profundidade)", computed: true },
  ]},
  { section: "🛡️ Backup e Storage", fields: [
    { n: "last_backup_at", t: "TIMESTAMPTZ", desc: "Data do último backup completo" },
    { n: "backup_frequency", t: "ENUM", desc: "'daily' | 'weekly' | 'manual'", req: true },
    { n: "backup_auto_enabled", t: "BOOLEAN DEFAULT true", desc: "Backup automático ativo" },
    { n: "storage_used_bytes", t: "BIGINT DEFAULT 0", desc: "Espaço total usado em todos os buckets", computed: true },
    { n: "storage_limit_bytes", t: "BIGINT", desc: "Limite baseado na assinatura (2GB/20GB/100GB)", computed: true },
    { n: "storage_usage_pct", t: "DECIMAL(5,2)", desc: "% de uso do storage", computed: true },
  ]},
  { section: "⚙️ Sistema e Metadados", fields: [
    { n: "created_at", t: "TIMESTAMPTZ DEFAULT NOW()", desc: "Data de criação da conta", req: true },
    { n: "updated_at", t: "TIMESTAMPTZ DEFAULT NOW()", desc: "Última modificação (auto-trigger)" },
    { n: "deleted_at", t: "TIMESTAMPTZ", desc: "Soft delete — Zona de Perigo", nullable: true },
    { n: "deletion_scheduled_at", t: "TIMESTAMPTZ", desc: "Quando a exclusão definitiva será executada (30 dias após pedido)", nullable: true },
    { n: "account_version", t: "INTEGER DEFAULT 1", desc: "Versão do schema da conta (para migrações)" },
  ]},
];

const tutorMedals = [
  { name: "Primeiro Pet", emoji: "🐾", tier: "bronze", condition: "Cadastrar o primeiro pet" },
  { name: "Tutor Dedicado", emoji: "💚", tier: "silver", condition: "30 dias consecutivos de uso" },
  { name: "Mestre dos Diagnósticos", emoji: "🔍", tier: "gold", condition: "50 análises de IA realizadas" },
  { name: "Guardião da Aldeia", emoji: "🏘️", tier: "gold", condition: "Ajudar 10 vezes na comunidade" },
  { name: "Herói de Resgate", emoji: "🦸", tier: "platinum", condition: "Ajudar a encontrar 1 pet perdido" },
  { name: "Super Indicador", emoji: "📢", tier: "gold", condition: "Indicar 10 novos tutores" },
  { name: "Doador de Vida", emoji: "🩸", tier: "platinum", condition: "Registrar doação de sangue do pet" },
  { name: "Memória Eterna", emoji: "📖", tier: "silver", condition: "365 dias de diário contínuo" },
  { name: "Embaixador PetauLife+", emoji: "👑", tier: "diamond", condition: "Top 1% de engajamento global" },
  { name: "Early Adopter", emoji: "🌟", tier: "special", condition: "Conta criada no primeiro mês do app" },
];

const proofOfLoveTiers = [
  { tier: "Bronze", min: 0, max: 199, discount: "5%", color: "#CD8B62", benefits: "Desconto básico em parceiros" },
  { tier: "Silver", min: 200, max: 499, discount: "10%", color: "#B8C4D0", benefits: "+ Acesso a ofertas exclusivas" },
  { tier: "Gold", min: 500, max: 799, discount: "15%", color: "#F0C754", benefits: "+ Seguro pet com desconto" },
  { tier: "Platinum", min: 800, max: 949, discount: "20%", color: "#A06ED8", benefits: "+ Consultas veterinárias com desconto" },
  { tier: "Diamond", min: 950, max: 1000, discount: "25%", color: "#22D3EE", benefits: "+ Prioridade em tudo + Badge exclusiva" },
];

const childTables = [
  { name: "pets", rel: "1:N", desc: "Todos os pets do tutor", color: C.green },
  { name: "sessions", rel: "1:N", desc: "Sessões ativas em dispositivos", color: C.primary },
  { name: "assistant_permissions", rel: "1:N", desc: "Permissões dos assistentes", color: C.primary },
  { name: "tutor_profiles (merged)", rel: "1:1", desc: "Dados financeiros e endereço (agora na mesma tabela)", color: C.primary },
  { name: "pet_credits", rel: "1:N", desc: "Movimentações de créditos", color: C.teal },
  { name: "partner_transactions", rel: "1:N", desc: "Compras com parceiros", color: C.orange },
  { name: "partner_reviews", rel: "1:N", desc: "Reviews escritas", color: C.orange },
  { name: "diary_entries (author)", rel: "1:N", desc: "Entradas de diário escritas", color: C.amber },
  { name: "co_parents (user_id)", rel: "1:N", desc: "Co-parentalidades onde participa", color: C.teal },
  { name: "time_capsules (creator)", rel: "1:N", desc: "Cápsulas do tempo criadas", color: C.rose },
  { name: "emotional_testament (owner)", rel: "1:N", desc: "Testamentos configurados", color: C.rose },
  { name: "rag_conversations", rel: "1:N", desc: "Interações com a IA", color: C.pink },
  { name: "messages (sender)", rel: "1:N", desc: "Mensagens enviadas", color: C.primary },
  { name: "chat_participants", rel: "1:N", desc: "Chats onde participa", color: C.primary },
  { name: "backups", rel: "1:N", desc: "Histórico de backups", color: C.indigo },
  { name: "audit_log", rel: "1:N", desc: "Log de todas as ações", color: C.indigo },
  { name: "notifications_queue", rel: "1:N", desc: "Fila de notificações", color: C.indigo },
  { name: "media_files (uploaded_by)", rel: "1:N", desc: "Mídias enviadas", color: C.cyan },
  { name: "user_preferences (deprecated)", rel: "1:1", desc: "Migrado para users — campos inline", color: C.textDim },
];

const totalFields = tutorColumns.reduce((s, sec) => s + sec.fields.length, 0);
const computedFields = tutorColumns.reduce((s, sec) => s + sec.fields.filter(f => f.computed).length, 0);

export default function TutorTableMaster() {
  const [expandedSection, setExpandedSection] = useState("🆔 Identificação e Autenticação");
  const [activeView, setActiveView] = useState("fields");
  const containerRef = useRef();

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", padding: 20, background: `radial-gradient(ellipse at 30% 20%, #141E2C, ${C.bgCard} 60%, #06080C)`, fontFamily: font }}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div ref={containerRef} style={{ width: 440, maxHeight: 860, background: C.bg, borderRadius: 20, overflow: "auto", position: "relative", boxShadow: `0 20px 80px rgba(0,0,0,0.5), 0 0 0 1px ${C.border}` }}>

        <div style={{ position: "sticky", top: 0, zIndex: 20, background: `linear-gradient(to bottom, ${C.bg}, ${C.bg}F8, ${C.bg}00)`, padding: "16px 18px 10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: C.primaryMed, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>👤</div>
            <div>
              <h1 style={{ color: C.primary, fontSize: 17, fontWeight: 800, margin: 0, fontFamily: fontMono }}>users (Tutor Master)</h1>
              <p style={{ color: C.textDim, fontSize: 10, margin: "2px 0 0" }}>Tabela principal do tutor · PetauLife+</p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
            {[
              { label: "Campos", value: totalFields, color: C.primary },
              { label: "Seções", value: tutorColumns.length, color: C.amber },
              { label: "Computados", value: computedFields, color: C.plum },
              { label: "Filhas", value: childTables.length, color: C.coral },
              { label: "Medalhas", value: tutorMedals.length, color: C.gold },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, background: C.card, borderRadius: 8, padding: "6px 4px", textAlign: "center", border: `1px solid ${C.border}` }}>
                <p style={{ color: s.color, fontSize: 14, fontWeight: 800, margin: 0, fontFamily: fontMono }}>{s.value}</p>
                <p style={{ color: C.textDim, fontSize: 7, margin: "1px 0 0" }}>{s.label}</p>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 3 }}>
            {[
              { id: "fields", label: `Campos (${totalFields})`, color: C.primary },
              { id: "medals", label: `Medalhas (${tutorMedals.length})`, color: C.gold },
              { id: "proof", label: "Proof of Love", color: C.plum },
              { id: "relations", label: `Relações (${childTables.length})`, color: C.coral },
            ].map(t => (
              <button key={t.id} onClick={() => setActiveView(t.id)} style={{
                flex: 1, padding: "7px 4px", borderRadius: 8, cursor: "pointer",
                background: activeView === t.id ? t.color + "18" : C.card,
                border: activeView === t.id ? `1px solid ${t.color}28` : `1px solid ${C.border}`,
                color: activeView === t.id ? t.color : C.textDim,
                fontSize: 9, fontWeight: 700,
              }}>{t.label}</button>
            ))}
          </div>
        </div>

        <div style={{ padding: "6px 18px 24px" }}>

          {/* FIELDS */}
          {activeView === "fields" && tutorColumns.map((section, si) => {
            const isExp = expandedSection === section.section;
            return (
              <div key={si} style={{ marginBottom: 6 }}>
                <button onClick={() => setExpandedSection(isExp ? null : section.section)} style={{
                  width: "100%", textAlign: "left", cursor: "pointer",
                  background: isExp ? C.primary + "06" : C.card,
                  borderRadius: isExp ? "12px 12px 0 0" : 12, padding: "11px 14px",
                  border: `1px solid ${isExp ? C.primary + "20" : C.border}`,
                  borderBottom: isExp ? `1px dashed ${C.border}` : undefined,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ color: C.text, fontSize: 12, fontWeight: 700 }}>{section.section}</span>
                    <div style={{ display: "flex", gap: 4 }}>
                      <span style={{ background: C.primary + "12", color: C.primary, fontSize: 8, fontWeight: 700, padding: "2px 7px", borderRadius: 5 }}>{section.fields.length}</span>
                      {section.fields.some(f => f.computed) && (
                        <span style={{ background: C.plum + "12", color: C.plum, fontSize: 8, fontWeight: 700, padding: "2px 7px", borderRadius: 5 }}>
                          {section.fields.filter(f => f.computed).length} auto
                        </span>
                      )}
                    </div>
                  </div>
                </button>
                {isExp && (
                  <div style={{ background: C.bgCard, borderRadius: "0 0 12px 12px", border: `1px solid ${C.primary}10`, borderTop: "none", padding: "4px 0" }}>
                    {section.fields.map((col, ci) => (
                      <div key={ci} style={{
                        display: "flex", alignItems: "flex-start", gap: 6, padding: "6px 14px",
                        borderBottom: ci < section.fields.length - 1 ? `1px solid ${C.border}` : "none",
                        background: col.computed ? C.plum + "03" : "transparent",
                      }}>
                        <div style={{ width: 12, display: "flex", justifyContent: "center", flexShrink: 0, marginTop: 3 }}>
                          {col.k?.includes("PK") && <span style={{ color: C.amber, fontSize: 8 }}>🔑</span>}
                          {col.k?.includes("FK") && !col.k?.includes("PK") && <span style={{ color: C.primary, fontSize: 8 }}>🔗</span>}
                          {col.k?.includes("UQ") && !col.k?.includes("PK") && !col.k?.includes("FK") && <span style={{ color: C.teal, fontSize: 8 }}>◆</span>}
                          {col.computed && !col.k && <span style={{ color: C.plum, fontSize: 8 }}>⚡</span>}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                            <span style={{ color: col.computed ? C.plum : C.text, fontSize: 10, fontWeight: 700, fontFamily: fontMono }}>{col.n}</span>
                            <span style={{ color: C.textGhost, fontSize: 7, fontFamily: fontMono, background: C.card, padding: "1px 4px", borderRadius: 3 }}>{col.t}</span>
                            {col.k?.includes("PK") && <span style={{ color: C.amber, fontSize: 6, fontWeight: 800 }}>PK</span>}
                            {col.k?.includes("FK") && <span style={{ color: C.primary, fontSize: 6, fontWeight: 700 }}>{col.k}</span>}
                            {col.k?.includes("UQ") && <span style={{ color: C.teal, fontSize: 6, fontWeight: 700 }}>UNIQUE</span>}
                            {col.idx && <span style={{ color: C.cyan, fontSize: 6, fontWeight: 700 }}>IDX</span>}
                            {col.req && <span style={{ color: C.coral, fontSize: 6, fontWeight: 700 }}>NOT NULL</span>}
                            {col.computed && <span style={{ color: C.plum, fontSize: 6, fontWeight: 700 }}>COMPUTED</span>}
                          </div>
                          <p style={{ color: C.textDim, fontSize: 8, margin: "2px 0 0", lineHeight: 1.4 }}>{col.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* MEDALS */}
          {activeView === "medals" && (
            <>
              <p style={{ color: C.gold, fontSize: 11, fontWeight: 700, letterSpacing: 1, margin: "0 0 12px" }}>🎖️ MEDALHAS DO TUTOR ({tutorMedals.length})</p>
              <p style={{ color: C.textSec, fontSize: 11, lineHeight: 1.6, margin: "0 0 16px" }}>
                Medalhas são incentivos para o tutor usar o app ativamente. Diferentes das conquistas dos pets — estas premiam o comportamento do humano.
              </p>
              {tutorMedals.map((m, i) => {
                const tierColors = { bronze: "#CD8B62", silver: "#B8C4D0", gold: "#F0C754", platinum: C.plum, diamond: C.cyan, special: C.pink };
                return (
                  <div key={i} style={{
                    background: C.card, borderRadius: 14, padding: "12px 16px", marginBottom: 8,
                    border: `1px solid ${C.border}`, borderLeft: `3px solid ${tierColors[m.tier]}`,
                    display: "flex", alignItems: "center", gap: 12,
                  }}>
                    <span style={{ fontSize: 26, width: 36, textAlign: "center" }}>{m.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ color: C.text, fontSize: 12, fontWeight: 700 }}>{m.name}</span>
                        <span style={{ background: tierColors[m.tier] + "18", color: tierColors[m.tier], fontSize: 8, fontWeight: 800, padding: "2px 8px", borderRadius: 6, textTransform: "uppercase" }}>{m.tier}</span>
                      </div>
                      <p style={{ color: C.textDim, fontSize: 10, margin: "3px 0 0" }}>{m.condition}</p>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* PROOF OF LOVE */}
          {activeView === "proof" && (
            <>
              <p style={{ color: C.plum, fontSize: 11, fontWeight: 700, letterSpacing: 1, margin: "0 0 12px" }}>⭐ SISTEMA PROOF OF LOVE</p>
              <div style={{ background: C.plum + "08", borderRadius: 16, padding: 16, marginBottom: 16, border: `1px solid ${C.plum}12` }}>
                <p style={{ color: C.textSec, fontSize: 11, lineHeight: 1.7, margin: 0 }}>
                  O <b style={{ color: C.plum }}>Proof of Love</b> é o score que mede o quanto o tutor cuida ativamente dos seus pets. Cada ação real de cuidado (passeio, consulta, vacina, diário, análise IA) soma pontos. Quanto maior o score, maior o desconto em parceiros — porque <b>um tutor ativo é um tutor de menor risco para seguradoras e veterinários</b>.
                </p>
              </div>

              {proofOfLoveTiers.map((t, i) => (
                <div key={i} style={{
                  background: C.card, borderRadius: 16, padding: "14px 18px", marginBottom: 8,
                  border: `1px solid ${C.border}`, borderLeft: `4px solid ${t.color}`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: t.color, fontSize: 16, fontWeight: 800 }}>{t.tier}</span>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ background: t.color + "18", color: t.color, fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 8 }}>{t.discount} desconto</span>
                      <span style={{ color: C.textDim, fontSize: 9, fontFamily: fontMono }}>{t.min}-{t.max} pts</span>
                    </div>
                  </div>
                  <p style={{ color: C.textSec, fontSize: 10, margin: 0 }}>{t.benefits}</p>
                </div>
              ))}

              <p style={{ color: C.textDim, fontSize: 9, fontWeight: 700, letterSpacing: 1, margin: "16px 0 10px" }}>COMO GANHAR PONTOS</p>
              {[
                { action: "Passeio registrado", pts: "+2", freq: "por passeio" },
                { action: "Diário preenchido", pts: "+3", freq: "por dia" },
                { action: "Análise IA (foto/vídeo/áudio)", pts: "+5", freq: "por análise" },
                { action: "Consulta veterinária realizada", pts: "+10", freq: "por consulta" },
                { action: "Vacina em dia", pts: "+15", freq: "por vacina" },
                { action: "Ajudar na comunidade (SOS/SafeSwap)", pts: "+8", freq: "por ajuda" },
                { action: "Playdate realizada", pts: "+4", freq: "por encontro" },
                { action: "Manter streak diário", pts: "+1", freq: "por dia extra" },
                { action: "Review de parceiro", pts: "+3", freq: "por review" },
                { action: "Indicar novo tutor", pts: "+20", freq: "por indicação" },
              ].map((a, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ color: C.text, fontSize: 11, flex: 1 }}>{a.action}</span>
                  <span style={{ color: C.green, fontSize: 11, fontWeight: 800, fontFamily: fontMono, width: 35, textAlign: "right" }}>{a.pts}</span>
                  <span style={{ color: C.textGhost, fontSize: 9, width: 70, textAlign: "right" }}>{a.freq}</span>
                </div>
              ))}
            </>
          )}

          {/* RELATIONS */}
          {activeView === "relations" && (
            <>
              <div style={{
                background: C.primary + "08", borderRadius: 16, padding: 16, marginBottom: 16,
                border: `2px solid ${C.primary}18`, textAlign: "center",
              }}>
                <span style={{ fontSize: 32 }}>👤</span>
                <p style={{ color: C.primary, fontSize: 16, fontWeight: 800, margin: "8px 0 2px", fontFamily: fontMono }}>users</p>
                <p style={{ color: C.textDim, fontSize: 10, margin: "0 0 8px" }}>Tabela central do tutor · {totalFields} campos · {childTables.length} tabelas filhas</p>
                <div style={{ display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ background: C.green + "14", color: C.green, fontSize: 8, fontWeight: 700, padding: "2px 8px", borderRadius: 6 }}>1 user → N pets</span>
                  <span style={{ background: C.orange + "14", color: C.orange, fontSize: 8, fontWeight: 700, padding: "2px 8px", borderRadius: 6 }}>1 user → N transactions</span>
                  <span style={{ background: C.primary + "14", color: C.primary, fontSize: 8, fontWeight: 700, padding: "2px 8px", borderRadius: 6 }}>1 owner → max 2 assistants</span>
                </div>
              </div>

              {childTables.map((tbl, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  background: C.card, borderRadius: 10, padding: "8px 14px", marginBottom: 4,
                  border: `1px solid ${C.border}`, borderLeft: `3px solid ${tbl.color}`,
                }}>
                  <span style={{ color: C.primary, fontSize: 8, fontWeight: 800, fontFamily: fontMono, width: 35, flexShrink: 0 }}>users</span>
                  <span style={{ background: tbl.rel === "1:1" ? C.amber + "18" : tbl.color + "14", color: tbl.rel === "1:1" ? C.amber : tbl.color, fontSize: 7, fontWeight: 800, padding: "2px 5px", borderRadius: 4, fontFamily: fontMono, flexShrink: 0 }}>{tbl.rel}</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: tbl.color, fontSize: 10, fontWeight: 700, fontFamily: fontMono }}>{tbl.name}</span>
                    <p style={{ color: C.textDim, fontSize: 8, margin: "1px 0 0" }}>{tbl.desc}</p>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <div style={{ margin: "0 18px 12px", padding: 12, background: C.card, borderRadius: 10, border: `1px solid ${C.border}` }}>
          <p style={{ color: C.textDim, fontSize: 8, fontWeight: 700, letterSpacing: 1, margin: "0 0 6px" }}>LEGENDA</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[
              { icon: "🔑", label: "Primary Key", color: C.amber },
              { icon: "🔗", label: "Foreign Key", color: C.primary },
              { icon: "◆", label: "Unique", color: C.teal },
              { icon: "⚡", label: "Computado (IA/Trigger)", color: C.plum },
              { text: "IDX", label: "Indexado", color: C.cyan },
              { text: "NOT NULL", label: "Obrigatório", color: C.coral },
            ].map((l, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                {l.icon ? <span style={{ fontSize: 9 }}>{l.icon}</span> : <span style={{ color: l.color, fontSize: 6, fontWeight: 800 }}>{l.text}</span>}
                <span style={{ color: C.textDim, fontSize: 8 }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p style={{ color: C.textGhost, fontSize: 7, textAlign: "center", padding: "0 18px 16px", fontFamily: fontMono }}>
          PetauLife+ · users table · {totalFields} campos · {computedFields} computados · {childTables.length} filhas · {tutorMedals.length} medalhas · 5 tiers Proof of Love
        </p>

        <style>{`::-webkit-scrollbar{width:0;height:0}`}</style>
      </div>
    </div>
  );
}
