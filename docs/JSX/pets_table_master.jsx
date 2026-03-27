import { useState, useRef } from "react";

const C = {
  bg: "#0C1117", bgCard: "#131C28", card: "#1A2535", cardHover: "#1E2D40",
  primary: "#3DD68C", primarySoft: "#3DD68C10", primaryMed: "#3DD68C20",
  blue: "#4A9EE8", blueSoft: "#4A9EE810",
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
  text: "#E0E8F0", textSec: "#8CA0B8", textDim: "#4A6078", textGhost: "#2A3C50",
  border: "#1E3045",
};
const font = "'Sora', -apple-system, sans-serif";
const fontMono = "'JetBrains Mono', monospace";

// ======================== COMPLETE PETS TABLE ========================
const petsColumns = [
  // === IDENTIFICATION ===
  { section: "🆔 Identificação", fields: [
    { n: "id", t: "UUID", k: "PK", desc: "Identificador único do pet", idx: true, required: true },
    { n: "owner_id", t: "UUID", k: "FK→users", desc: "Tutor proprietário (1 user → N pets)", idx: true, required: true },
    { n: "name", t: "VARCHAR(100)", desc: "Nome do pet (ex: Rex, Luna)", required: true },
    { n: "species", t: "ENUM('dog','cat')", desc: "Apenas cães e gatos. CHECK constraint.", required: true, constraint: "CHECK (species IN ('dog','cat'))" },
    { n: "breed", t: "VARCHAR(100)", desc: "Raça (Labrador, Siamês, SRD...)", required: true },
    { n: "breed_group", t: "VARCHAR(50)", desc: "Grupo (Sporting, Herding, Toy...) — para comparação IA", nullable: true },
    { n: "color_pattern", t: "VARCHAR(100)", desc: "Cor e padrão do pelo (dourado, tricolor, rajado...)", nullable: true },
    { n: "photo_url", t: "TEXT", desc: "URL no bucket avatars (WebP 400px)", nullable: true, bucket: "avatars" },
    { n: "gallery_count", t: "INTEGER DEFAULT 0", desc: "Contador de fotos no diário (atualizado por trigger)", computed: true },
  ]},
  // === BIOLOGICAL ===
  { section: "🧬 Dados Biológicos", fields: [
    { n: "birth_date", t: "DATE", desc: "Data de nascimento (exata ou estimada)", nullable: true },
    { n: "birth_date_is_estimate", t: "BOOLEAN DEFAULT false", desc: "true se a data é estimada (adotados/resgatados)" },
    { n: "sex", t: "ENUM('male','female')", desc: "Sexo biológico", required: true },
    { n: "is_neutered", t: "BOOLEAN DEFAULT false", desc: "Se é castrado/esterilizado" },
    { n: "neutered_date", t: "DATE", desc: "Data da castração", nullable: true },
    { n: "weight_kg", t: "DECIMAL(5,2)", desc: "Peso atual em kg (atualizado por trigger/manual)", nullable: true },
    { n: "ideal_weight_min", t: "DECIMAL(5,2)", desc: "Peso ideal mínimo para a raça/idade (IA calcula)", nullable: true, computed: true },
    { n: "ideal_weight_max", t: "DECIMAL(5,2)", desc: "Peso ideal máximo para a raça/idade", nullable: true, computed: true },
    { n: "height_cm", t: "DECIMAL(5,1)", desc: "Altura na cernelha em cm", nullable: true },
    { n: "blood_type", t: "VARCHAR(20)", desc: "Tipo sanguíneo (DEA 1.1 Neg, Tipo A...)", nullable: true },
    { n: "is_blood_donor", t: "BOOLEAN DEFAULT false", desc: "Se está cadastrado como doador de sangue" },
    { n: "microchip_number", t: "VARCHAR(20)", desc: "Número do microchip ISO 11784/11785", nullable: true, unique: true, idx: true },
    { n: "microchip_implant_date", t: "DATE", desc: "Data do implante", nullable: true },
    { n: "registration_number", t: "VARCHAR(50)", desc: "Registro RGA, Pedigree ou abrigo", nullable: true },
  ]},
  // === ORIGIN ===
  { section: "🏠 Origem e Adoção", fields: [
    { n: "origin_type", t: "ENUM", desc: "'breeder' | 'shelter' | 'rescue' | 'born_at_home' | 'gift' | 'other'", nullable: true },
    { n: "origin_name", t: "VARCHAR(200)", desc: "Nome do canil, abrigo ou ONG de origem", nullable: true },
    { n: "origin_city", t: "VARCHAR(100)", desc: "Cidade de origem", nullable: true },
    { n: "adoption_date", t: "DATE", desc: "Data em que o pet chegou ao tutor", nullable: true },
    { n: "mother_name", t: "VARCHAR(100)", desc: "Nome da mãe (se conhecido)", nullable: true },
    { n: "father_name", t: "VARCHAR(100)", desc: "Nome do pai (se conhecido)", nullable: true },
    { n: "litter_id", t: "VARCHAR(50)", desc: "Identificador da ninhada (para buscar irmãos)", nullable: true, idx: true },
    { n: "siblings_found", t: "INTEGER DEFAULT 0", desc: "Quantos irmãos de ninhada foram encontrados na rede", computed: true },
  ]},
  // === HEALTH SCORES (AI/RAG) ===
  { section: "🧠 Scores de IA (calculados pelo RAG)", fields: [
    { n: "health_score", t: "INTEGER", desc: "Score geral de saúde 0-100 (recalculado por trigger)", computed: true, idx: true },
    { n: "health_score_updated_at", t: "TIMESTAMPTZ", desc: "Último recálculo do health_score", computed: true },
    { n: "happiness_score", t: "INTEGER", desc: "Score de felicidade 0-100 (gráfico de felicidade)", computed: true, idx: true },
    { n: "happiness_score_updated_at", t: "TIMESTAMPTZ", desc: "Último recálculo", computed: true },
    { n: "happiness_trend", t: "ENUM", desc: "'rising' | 'stable' | 'falling' — tendência dos últimos 30 dias", computed: true },
    { n: "current_mood", t: "VARCHAR(20)", desc: "ecstatic|happy|calm|tired|anxious|sad — último registro", idx: true },
    { n: "current_mood_updated_at", t: "TIMESTAMPTZ", desc: "Quando o humor foi atualizado pela última vez" },
    { n: "energy_level", t: "ENUM", desc: "'very_low' | 'low' | 'medium' | 'high' | 'very_high'", nullable: true },
    { n: "anxiety_level", t: "ENUM", desc: "'none' | 'low' | 'moderate' | 'high' — detectado por áudio/vídeo IA", nullable: true },
    { n: "vaccine_status", t: "ENUM", desc: "'all_up_to_date' | 'some_overdue' | 'critical' — calculado por trigger", computed: true },
    { n: "vaccine_score", t: "VARCHAR(10)", desc: "'5/5', '3/5' — resumo visual", computed: true },
    { n: "next_vet_date", t: "DATE", desc: "Próxima consulta agendada", nullable: true, idx: true },
    { n: "days_since_last_vet", t: "INTEGER", desc: "Dias desde a última consulta (calculado)", computed: true },
    { n: "alerts_count", t: "INTEGER DEFAULT 0", desc: "Número de alertas pendentes (vacinas, exames...)", computed: true },
    { n: "alerts_summary", t: "TEXT", desc: "Resumo dos alertas em texto (ex: '2 vacinas vencidas')", computed: true },
  ]},
  // === PERSONALITY (AI/RAG) ===
  { section: "🎭 Personalidade e Comportamento (RAG)", fields: [
    { n: "personality_tags", t: "JSONB", desc: "['brincalhão','curioso','ansioso','sociável','dócil']", nullable: true },
    { n: "ai_personality_summary", t: "TEXT", desc: "Resumo gerado pelo RAG: 'Rex é brincalhão, curioso e...'", computed: true },
    { n: "ai_personality_updated_at", t: "TIMESTAMPTZ", desc: "Última atualização da personalidade IA", computed: true },
    { n: "fears", t: "JSONB", desc: "['fogos_de_artificio','trovões','aspirador']", nullable: true },
    { n: "favorite_activities", t: "JSONB", desc: "['buscar_bola','correr_parque','nadar']", nullable: true },
    { n: "favorite_toys", t: "JSONB", desc: "['bolinha_amarela','corda','osso_borracha']", nullable: true },
    { n: "favorite_foods", t: "JSONB", desc: "['cenoura','maçã','biscoito_integral']", nullable: true },
    { n: "dislikes", t: "JSONB", desc: "['banho','gato_do_vizinho','barulho_alto']", nullable: true },
    { n: "social_level", t: "ENUM", desc: "'very_shy' | 'shy' | 'moderate' | 'social' | 'very_social'", nullable: true },
    { n: "energy_profile", t: "ENUM", desc: "'couch_potato' | 'moderate' | 'active' | 'hyperactive'", nullable: true },
    { n: "compatibility_tags", t: "JSONB", desc: "Tags para matching de playdates: ['medium_energy','likes_dogs','submissive']", nullable: true, computed: true },
    { n: "vocalization_level", t: "ENUM", desc: "'silent' | 'quiet' | 'moderate' | 'vocal' | 'very_vocal'", nullable: true },
    { n: "sleep_spot", t: "VARCHAR(100)", desc: "Onde dorme (sofá, cama do tutor, caminha própria...)", nullable: true },
    { n: "daily_routine_notes", t: "TEXT", desc: "Notas sobre rotina específica do pet", nullable: true },
  ]},
  // === NUTRITION ===
  { section: "🥗 Nutrição", fields: [
    { n: "food_brand", t: "VARCHAR(150)", desc: "Marca da ração atual (Royal Canin, Premier...)", nullable: true },
    { n: "food_type", t: "ENUM", desc: "'dry' | 'wet' | 'raw' | 'homemade' | 'mixed'", nullable: true },
    { n: "daily_food_grams", t: "INTEGER", desc: "Quantidade diária em gramas", nullable: true },
    { n: "meals_per_day", t: "INTEGER DEFAULT 2", desc: "Número de refeições por dia" },
    { n: "daily_calorie_target", t: "INTEGER", desc: "Meta calórica diária (IA calcula por peso/idade/atividade)", computed: true },
    { n: "daily_water_target_cups", t: "INTEGER", desc: "Meta de hidratação em copos/dia", computed: true },
    { n: "dietary_restrictions", t: "JSONB", desc: "['sem_frango','sem_grãos','hipoalergênico']", nullable: true },
    { n: "supplements", t: "JSONB", desc: "[{name:'Omega 3',dose:'1000mg',freq:'diário'}]", nullable: true },
  ]},
  // === INSURANCE & PLANS ===
  { section: "🛡️ Planos e Seguros", fields: [
    { n: "has_health_insurance", t: "BOOLEAN DEFAULT false", desc: "Se tem plano de saúde ativo" },
    { n: "has_funeral_plan", t: "BOOLEAN DEFAULT false", desc: "Se tem plano funerário" },
    { n: "has_wellness_plan", t: "BOOLEAN DEFAULT false", desc: "Se tem plano bem-estar" },
    { n: "insurance_monthly_total", t: "DECIMAL(8,2)", desc: "Total mensal de todos os planos (calculado)", computed: true },
    { n: "total_claimed_amount", t: "DECIMAL(10,2) DEFAULT 0", desc: "Total já utilizado em sinistros", computed: true },
  ]},
  // === LEGACY & MEMORIAL ===
  { section: "💎 Legado e Memorial", fields: [
    { n: "is_memorial", t: "BOOLEAN DEFAULT false", desc: "true se o pet já faleceu", idx: true },
    { n: "memorial_date", t: "DATE", desc: "Data do falecimento", nullable: true },
    { n: "memorial_cause", t: "TEXT", desc: "Causa (opcional, privado)", nullable: true },
    { n: "memorial_message", t: "TEXT", desc: "Mensagem do tutor no memorial", nullable: true },
    { n: "candles_count", t: "INTEGER DEFAULT 0", desc: "Quantas pessoas 'acenderam vela' no memorial", computed: true },
    { n: "has_testament", t: "BOOLEAN DEFAULT false", desc: "Se o testamento emocional está configurado" },
    { n: "testament_status", t: "ENUM", desc: "'not_configured' | 'active' | 'verification_pending' | 'activated'", computed: true },
    { n: "capsules_total", t: "INTEGER DEFAULT 0", desc: "Total de cápsulas do tempo criadas", computed: true },
    { n: "capsules_locked", t: "INTEGER DEFAULT 0", desc: "Cápsulas ainda trancadas", computed: true },
    { n: "capsules_unlocked", t: "INTEGER DEFAULT 0", desc: "Cápsulas já desbloqueadas", computed: true },
  ]},
  // === SOCIAL & COMMUNITY ===
  { section: "🤝 Social e Comunidade", fields: [
    { n: "co_parents_count", t: "INTEGER DEFAULT 0", desc: "Número de cuidadores na rede", computed: true },
    { n: "friends_count", t: "INTEGER DEFAULT 0", desc: "Pets amigos (playdates completadas)", computed: true },
    { n: "playdates_completed", t: "INTEGER DEFAULT 0", desc: "Total de playdates realizadas", computed: true },
    { n: "total_walks", t: "INTEGER DEFAULT 0", desc: "Total de passeios registrados (gamificação)", computed: true },
    { n: "total_diary_entries", t: "INTEGER DEFAULT 0", desc: "Total de entradas no diário de vida", computed: true },
    { n: "total_ai_analyses", t: "INTEGER DEFAULT 0", desc: "Total de análises IA (foto+vídeo+áudio)", computed: true },
    { n: "total_rag_embeddings", t: "INTEGER DEFAULT 0", desc: "Total de embeddings no RAG deste pet", computed: true },
  ]},
  // === GAMIFICATION ===
  { section: "🏆 Gamificação", fields: [
    { n: "achievements_unlocked", t: "INTEGER DEFAULT 0", desc: "Emblemas desbloqueados (de 30)", computed: true },
    { n: "achievements_total", t: "INTEGER DEFAULT 30", desc: "Total de emblemas disponíveis" },
    { n: "total_xp", t: "INTEGER DEFAULT 0", desc: "XP total acumulado", computed: true },
    { n: "level_name", t: "VARCHAR(50)", desc: "'Filhote' | 'Explorador' | 'Guardião' | 'Mestre' | 'Lenda'", computed: true },
    { n: "current_streak_days", t: "INTEGER DEFAULT 0", desc: "Dias consecutivos com registro de humor", computed: true },
    { n: "best_streak_days", t: "INTEGER DEFAULT 0", desc: "Recorde de dias consecutivos", computed: true },
    { n: "proof_of_love_score", t: "INTEGER DEFAULT 0", desc: "Score de cuidado ativo (descontos em parceiros)", computed: true, idx: true },
  ]},
  // === TRAVEL ===
  { section: "✈️ Viagens", fields: [
    { n: "trips_completed", t: "INTEGER DEFAULT 0", desc: "Viagens concluídas", computed: true },
    { n: "total_km_traveled", t: "INTEGER DEFAULT 0", desc: "Km totais percorridos", computed: true },
    { n: "favorite_destination", t: "VARCHAR(100)", desc: "Destino com maior score de felicidade", computed: true, nullable: true },
  ]},
  // === SYSTEM ===
  { section: "⚙️ Sistema e Metadados", fields: [
    { n: "qr_token_secret", t: "VARCHAR(64)", desc: "Segredo para geração de QR Codes temporários" },
    { n: "last_backup_at", t: "TIMESTAMPTZ", desc: "Último backup incluindo este pet" },
    { n: "storage_used_bytes", t: "BIGINT DEFAULT 0", desc: "Espaço total de mídia deste pet", computed: true },
    { n: "is_active", t: "BOOLEAN DEFAULT true", desc: "Soft delete — false quando excluído logicamente" },
    { n: "created_at", t: "TIMESTAMPTZ DEFAULT NOW()", desc: "Data de cadastro do pet", required: true },
    { n: "updated_at", t: "TIMESTAMPTZ DEFAULT NOW()", desc: "Última modificação (trigger auto-update)" },
    { n: "deleted_at", t: "TIMESTAMPTZ", desc: "Data do soft delete (zona de perigo)", nullable: true },
  ]},
];

// Child tables that connect to pets.id
const childTables = [
  { group: "Saúde", color: C.coral, tables: [
    { name: "vaccines", rel: "1:N", desc: "Carteira de vacinação", cols: "~11 cols" },
    { name: "exams", rel: "1:N", desc: "Resultados de exames", cols: "~10 cols" },
    { name: "medications", rel: "1:N", desc: "Medicações ativas e históricas", cols: "~12 cols" },
    { name: "allergies", rel: "1:N", desc: "Alergias e sensibilidades", cols: "~6 cols" },
    { name: "surgeries", rel: "1:N", desc: "Histórico cirúrgico", cols: "~8 cols" },
    { name: "consultations", rel: "1:N", desc: "Consultas veterinárias", cols: "~8 cols" },
    { name: "pet_weight_history", rel: "1:N", desc: "Evolução do peso", cols: "~5 cols" },
  ]},
  { group: "IA e Análises", color: C.plum, tables: [
    { name: "photo_analyses", rel: "1:N", desc: "Análises de foto", cols: "~8 cols" },
    { name: "video_analyses", rel: "1:N", desc: "Análises de vídeo", cols: "~8 cols" },
    { name: "audio_analyses", rel: "1:N", desc: "Análises de áudio/latido", cols: "~8 cols" },
    { name: "ocr_documents", rel: "1:N", desc: "Documentos digitalizados", cols: "~7 cols" },
  ]},
  { group: "Diário e Timeline", color: C.amber, tables: [
    { name: "diary_entries", rel: "1:N", desc: "Diário narrado pela IA", cols: "~12 cols" },
    { name: "mood_logs", rel: "1:N", desc: "Registros de humor", cols: "~6 cols" },
    { name: "milestones", rel: "1:N", desc: "Marcos e conquistas", cols: "~6 cols" },
  ]},
  { group: "Legado", color: C.rose, tables: [
    { name: "time_capsules", rel: "1:N", desc: "Cápsulas do tempo", cols: "~14 cols" },
    { name: "emotional_testament", rel: "1:1", desc: "Testamento emocional", cols: "~12 cols" },
  ]},
  { group: "Social", color: C.teal, tables: [
    { name: "co_parents", rel: "1:N", desc: "Rede de cuidadores", cols: "~11 cols" },
    { name: "care_schedule", rel: "1:N", desc: "Agenda de cuidados", cols: "~6 cols" },
    { name: "pet_credits", rel: "1:N", desc: "Créditos solidários", cols: "~7 cols" },
    { name: "sos_alerts", rel: "1:N", desc: "Alertas de emergência", cols: "~8 cols" },
    { name: "playdates (pet_1)", rel: "1:N", desc: "Encontros como pet_1", cols: "~6 cols" },
    { name: "playdates (pet_2)", rel: "1:N", desc: "Encontros como pet_2", cols: "~6 cols" },
  ]},
  { group: "Nutrição", color: C.lime, tables: [
    { name: "meals", rel: "1:N", desc: "Refeições registradas", cols: "~7 cols" },
    { name: "water_logs", rel: "1:N", desc: "Hidratação diária", cols: "~4 cols" },
  ]},
  { group: "Extras", color: C.sky, tables: [
    { name: "trips", rel: "1:N", desc: "Viagens do pet", cols: "~12 cols" },
    { name: "insurance_plans", rel: "1:N", desc: "Planos de saúde/funerário", cols: "~10 cols" },
    { name: "user_achievements", rel: "1:N", desc: "Progresso em conquistas", cols: "~6 cols" },
    { name: "partner_transactions", rel: "1:N", desc: "Transações com parceiros", cols: "~16 cols" },
  ]},
  { group: "RAG", color: C.pink, tables: [
    { name: "pet_embeddings", rel: "1:N", desc: "Embeddings vetoriais (cérebro do pet)", cols: "~10 cols, VECTOR(1536)" },
    { name: "rag_conversations", rel: "1:N", desc: "Histórico de interações IA", cols: "~9 cols" },
  ]},
  { group: "Mídia", color: C.cyan, tables: [
    { name: "media_files", rel: "1:N", desc: "Todas as mídias comprimidas", cols: "~18 cols" },
    { name: "messages (via chats)", rel: "N:N", desc: "Mensagens entre tutores sobre este pet", cols: "~12 cols" },
  ]},
];

const totalFields = petsColumns.reduce((s, sec) => s + sec.fields.length, 0);
const totalChildTables = childTables.reduce((s, g) => s + g.tables.length, 0);
const computedFields = petsColumns.reduce((s, sec) => s + sec.fields.filter(f => f.computed).length, 0);

// ======================== MAIN APP ========================
export default function PetsTableDiagram() {
  const [expandedSection, setExpandedSection] = useState("🆔 Identificação");
  const [showRelations, setShowRelations] = useState(false);
  const containerRef = useRef();

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", padding: 20, background: `radial-gradient(ellipse at 30% 20%, #0E2418, ${C.bgCard} 60%, #06080C)`, fontFamily: font }}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div ref={containerRef} style={{ width: 440, maxHeight: 860, background: C.bg, borderRadius: 20, overflow: "auto", position: "relative", boxShadow: `0 20px 80px rgba(0,0,0,0.5), 0 0 0 1px ${C.border}` }}>

        {/* Header */}
        <div style={{ position: "sticky", top: 0, zIndex: 20, background: `linear-gradient(to bottom, ${C.bg}, ${C.bg}F8, ${C.bg}00)`, padding: "16px 18px 10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: C.primaryMed, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🐾</div>
            <div>
              <h1 style={{ color: C.primary, fontSize: 17, fontWeight: 800, margin: 0, fontFamily: fontMono }}>pets</h1>
              <p style={{ color: C.textDim, fontSize: 10, margin: "2px 0 0" }}>Tabela principal do PetauLife+ · O coração de tudo</p>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
            {[
              { label: "Campos", value: totalFields, color: C.primary },
              { label: "Seções", value: petsColumns.length, color: C.amber },
              { label: "Computados", value: computedFields, color: C.plum },
              { label: "Tabelas filhas", value: totalChildTables, color: C.coral },
              { label: "Indexes", value: 8, color: C.teal },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, background: C.card, borderRadius: 8, padding: "6px 4px", textAlign: "center", border: `1px solid ${C.border}` }}>
                <p style={{ color: s.color, fontSize: 14, fontWeight: 800, margin: 0, fontFamily: fontMono }}>{s.value}</p>
                <p style={{ color: C.textDim, fontSize: 7, margin: "1px 0 0" }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* View toggle */}
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => setShowRelations(false)} style={{
              flex: 1, padding: "7px", borderRadius: 8, cursor: "pointer",
              background: !showRelations ? C.primary + "18" : C.card,
              border: !showRelations ? `1px solid ${C.primary}28` : `1px solid ${C.border}`,
              color: !showRelations ? C.primary : C.textDim, fontSize: 10, fontWeight: 700,
            }}>📋 Campos ({totalFields})</button>
            <button onClick={() => setShowRelations(true)} style={{
              flex: 1, padding: "7px", borderRadius: 8, cursor: "pointer",
              background: showRelations ? C.coral + "18" : C.card,
              border: showRelations ? `1px solid ${C.coral}28` : `1px solid ${C.border}`,
              color: showRelations ? C.coral : C.textDim, fontSize: 10, fontWeight: 700,
            }}>🔗 Relacionamentos ({totalChildTables})</button>
          </div>
        </div>

        <div style={{ padding: "6px 18px 24px" }}>

          {/* ====== FIELDS VIEW ====== */}
          {!showRelations && petsColumns.map((section, si) => {
            const isExp = expandedSection === section.section;
            return (
              <div key={si} style={{ marginBottom: 6 }}>
                <button onClick={() => setExpandedSection(isExp ? null : section.section)} style={{
                  width: "100%", textAlign: "left", cursor: "pointer",
                  background: isExp ? C.primary + "06" : C.card,
                  borderRadius: isExp ? "12px 12px 0 0" : 12,
                  padding: "11px 14px",
                  border: `1px solid ${isExp ? C.primary + "20" : C.border}`,
                  borderBottom: isExp ? `1px dashed ${C.border}` : undefined,
                  fontFamily: font,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ color: C.text, fontSize: 12, fontWeight: 700 }}>{section.section}</span>
                    <div style={{ display: "flex", gap: 4 }}>
                      <span style={{ background: C.primary + "12", color: C.primary, fontSize: 8, fontWeight: 700, padding: "2px 7px", borderRadius: 5 }}>{section.fields.length} campos</span>
                      {section.fields.some(f => f.computed) && (
                        <span style={{ background: C.plum + "12", color: C.plum, fontSize: 8, fontWeight: 700, padding: "2px 7px", borderRadius: 5 }}>
                          {section.fields.filter(f => f.computed).length} IA
                        </span>
                      )}
                    </div>
                  </div>
                </button>

                {isExp && (
                  <div style={{ background: C.bgCard, borderRadius: "0 0 12px 12px", border: `1px solid ${C.primary}10`, borderTop: "none", padding: "4px 0" }}>
                    {section.fields.map((col, ci) => (
                      <div key={ci} style={{
                        display: "flex", alignItems: "flex-start", gap: 6,
                        padding: "7px 14px",
                        borderBottom: ci < section.fields.length - 1 ? `1px solid ${C.border}` : "none",
                        background: col.computed ? C.plum + "03" : "transparent",
                      }}>
                        {/* Key indicator */}
                        <div style={{ width: 14, display: "flex", justifyContent: "center", flexShrink: 0, marginTop: 3 }}>
                          {col.k?.includes("PK") && <span style={{ color: C.amber, fontSize: 8 }}>🔑</span>}
                          {col.k?.includes("FK") && <span style={{ color: C.blue, fontSize: 8 }}>🔗</span>}
                          {col.unique && <span style={{ color: C.teal, fontSize: 8 }}>◆</span>}
                          {col.computed && !col.k && <span style={{ color: C.plum, fontSize: 8 }}>⚡</span>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                            <span style={{ color: col.computed ? C.plum : C.text, fontSize: 11, fontWeight: 700, fontFamily: fontMono }}>{col.n}</span>
                            <span style={{ color: C.textGhost, fontSize: 8, fontFamily: fontMono, background: C.card, padding: "1px 5px", borderRadius: 3 }}>{col.t}</span>
                            {col.k?.includes("PK") && <span style={{ color: C.amber, fontSize: 7, fontWeight: 800 }}>PK</span>}
                            {col.k?.includes("FK") && <span style={{ color: C.blue, fontSize: 7, fontWeight: 700, fontFamily: fontMono }}>{col.k}</span>}
                            {col.unique && <span style={{ color: C.teal, fontSize: 7, fontWeight: 700 }}>UNIQUE</span>}
                            {col.idx && <span style={{ color: C.cyan, fontSize: 7, fontWeight: 700 }}>IDX</span>}
                            {col.required && <span style={{ color: C.coral, fontSize: 7, fontWeight: 700 }}>NOT NULL</span>}
                            {col.computed && <span style={{ color: C.plum, fontSize: 7, fontWeight: 700 }}>COMPUTED</span>}
                            {col.bucket && <span style={{ color: C.teal, fontSize: 7, fontWeight: 700 }}>BUCKET:{col.bucket}</span>}
                          </div>
                          <p style={{ color: C.textDim, fontSize: 9, margin: "3px 0 0", lineHeight: 1.4 }}>{col.desc}</p>
                          {col.constraint && <p style={{ color: C.coral, fontSize: 8, margin: "2px 0 0", fontFamily: fontMono }}>{col.constraint}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* ====== RELATIONS VIEW ====== */}
          {showRelations && (
            <>
              {/* Central node */}
              <div style={{
                background: `linear-gradient(145deg, ${C.primary}12, ${C.primary}06)`,
                borderRadius: 18, padding: "18px 20px", marginBottom: 16,
                border: `2px solid ${C.primary}25`, textAlign: "center",
              }}>
                <span style={{ fontSize: 36 }}>🐾</span>
                <p style={{ color: C.primary, fontSize: 18, fontWeight: 800, margin: "8px 0 2px", fontFamily: fontMono }}>pets</p>
                <p style={{ color: C.textDim, fontSize: 11, margin: "0 0 10px" }}>Tabela central · {totalFields} campos · {totalChildTables} tabelas filhas</p>
                <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ background: C.primary + "14", color: C.primary, fontSize: 9, fontWeight: 700, padding: "3px 10px", borderRadius: 8 }}>1 user → N pets</span>
                  <span style={{ background: C.coral + "14", color: C.coral, fontSize: 9, fontWeight: 700, padding: "3px 10px", borderRadius: 8 }}>1 pet → N health records</span>
                  <span style={{ background: C.pink + "14", color: C.pink, fontSize: 9, fontWeight: 700, padding: "3px 10px", borderRadius: 8 }}>1 pet → N RAG embeddings</span>
                </div>
              </div>

              {/* Child table groups */}
              {childTables.map((grp, gi) => (
                <div key={gi} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: grp.color, flexShrink: 0 }} />
                    <span style={{ color: grp.color, fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>{grp.group.toUpperCase()} ({grp.tables.length})</span>
                  </div>

                  {grp.tables.map((tbl, ti) => (
                    <div key={ti} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      background: C.card, borderRadius: 10, padding: "9px 14px", marginBottom: 4,
                      border: `1px solid ${C.border}`, borderLeft: `3px solid ${grp.color}`,
                    }}>
                      {/* Relationship line */}
                      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, width: 42 }}>
                        <span style={{ color: C.primary, fontSize: 9, fontWeight: 800, fontFamily: fontMono }}>pets</span>
                      </div>
                      <span style={{
                        background: tbl.rel === "1:1" ? C.amber + "18" : tbl.rel === "N:N" ? C.pink + "18" : grp.color + "15",
                        color: tbl.rel === "1:1" ? C.amber : tbl.rel === "N:N" ? C.pink : grp.color,
                        fontSize: 8, fontWeight: 800, padding: "2px 6px", borderRadius: 4, fontFamily: fontMono, flexShrink: 0,
                      }}>{tbl.rel}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ color: grp.color, fontSize: 10, fontWeight: 700, fontFamily: fontMono }}>{tbl.name}</span>
                          <span style={{ color: C.textGhost, fontSize: 8 }}>{tbl.cols}</span>
                        </div>
                        <p style={{ color: C.textDim, fontSize: 8, margin: "2px 0 0" }}>{tbl.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ))}

              {/* Visual summary */}
              <div style={{
                background: C.card, borderRadius: 14, padding: 16, marginTop: 10, border: `1px solid ${C.border}`,
              }}>
                <p style={{ color: C.textDim, fontSize: 9, fontWeight: 700, letterSpacing: 1, margin: "0 0 10px" }}>RESUMO DE RELACIONAMENTOS</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {[
                    { label: "1:N (um para muitos)", count: childTables.reduce((s, g) => s + g.tables.filter(t => t.rel === "1:N").length, 0), color: C.primary },
                    { label: "1:1 (um para um)", count: childTables.reduce((s, g) => s + g.tables.filter(t => t.rel === "1:1").length, 0), color: C.amber },
                    { label: "N:N (muitos para muitos)", count: childTables.reduce((s, g) => s + g.tables.filter(t => t.rel === "N:N").length, 0), color: C.pink },
                  ].map((r, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, background: r.color + "08", padding: "5px 10px", borderRadius: 8 }}>
                      <span style={{ color: r.color, fontSize: 14, fontWeight: 800, fontFamily: fontMono }}>{r.count}</span>
                      <span style={{ color: C.textSec, fontSize: 9 }}>{r.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Legend */}
        <div style={{ margin: "0 18px 16px", padding: 14, background: C.card, borderRadius: 12, border: `1px solid ${C.border}` }}>
          <p style={{ color: C.textDim, fontSize: 9, fontWeight: 700, letterSpacing: 1, margin: "0 0 8px" }}>LEGENDA DOS CAMPOS</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[
              { icon: "🔑", label: "Primary Key", color: C.amber },
              { icon: "🔗", label: "Foreign Key", color: C.blue },
              { icon: "◆", label: "Unique", color: C.teal },
              { icon: "⚡", label: "Computado pela IA/Trigger", color: C.plum },
              { text: "IDX", label: "Indexado", color: C.cyan },
              { text: "NOT NULL", label: "Obrigatório", color: C.coral },
            ].map((l, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {l.icon ? <span style={{ fontSize: 10 }}>{l.icon}</span> : <span style={{ color: l.color, fontSize: 7, fontWeight: 800 }}>{l.text}</span>}
                <span style={{ color: C.textDim, fontSize: 9 }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p style={{ color: C.textGhost, fontSize: 8, textAlign: "center", padding: "0 18px 16px", fontFamily: fontMono }}>
          PetauLife+ · pets table · {totalFields} campos · {computedFields} computados · {totalChildTables} tabelas filhas · species CHECK('dog','cat')
        </p>

        <style>{`::-webkit-scrollbar{width:0;height:0}`}</style>
      </div>
    </div>
  );
}
