import { useState, useRef } from "react";

// ======================== DESIGN TOKENS ========================
const C = {
  bg: "#0C1117", bgCard: "#151D28", bgDeep: "#080C12",
  card: "#1A2535", cardHover: "#1E2D40", cardGlow: "#1F3045",
  primary: "#4A9EE8", primarySoft: "#4A9EE812", primaryMed: "#4A9EE820",
  green: "#3DD68C", greenSoft: "#3DD68C12",
  amber: "#E8B44A", amberSoft: "#E8B44A12",
  coral: "#E86854", coralSoft: "#E8685412",
  plum: "#A06ED8", plumSoft: "#A06ED812",
  teal: "#3AC4B0", tealSoft: "#3AC4B012",
  rose: "#E06888", roseSoft: "#E0688812",
  sky: "#5BB8F0", skySoft: "#5BB8F012",
  orange: "#E89040", orangeSoft: "#E8904012",
  text: "#E0E8F0", textSec: "#8CA0B8", textDim: "#4A6078", textGhost: "#2A3C50",
  border: "#1E3045", borderLight: "#253548",
  shadow: "0 4px 28px rgba(0,0,0,0.3)",
};
const font = "'Sora', -apple-system, sans-serif";
const fontMono = "'JetBrains Mono', monospace";

// ======================== ICONS ========================
const Ico = ({ type, size = 16, color = C.textDim }) => {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" };
  const icons = {
    key: <svg {...p} strokeWidth="2"><circle cx="8" cy="15" r="4" fill={color} stroke="none" opacity="0.4"/><path d="M14 11l7-7"/><path d="M17 4l4 0 0 4"/></svg>,
    link: <svg {...p}><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>,
    db: <svg {...p}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
    vector: <svg {...p}><circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M6 9v3a3 3 0 003 3h6a3 3 0 003-3V9"/></svg>,
    search: <svg {...p}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    brain: <svg {...p}><path d="M12 2a5 5 0 015 5c0 1.5-.7 2.8-1.7 3.7A5 5 0 0120 15a5 5 0 01-3 4.6V22h-2v-2h-6v2H7v-2.4A5 5 0 014 15a5 5 0 014.7-4.3A5 5 0 017 7a5 5 0 015-5z"/></svg>,
    paw: <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><ellipse cx="12" cy="17" rx="4.5" ry="4"/><circle cx="7" cy="10.5" r="2.2"/><circle cx="17" cy="10.5" r="2.2"/><circle cx="9.5" cy="6.5" r="1.8"/><circle cx="14.5" cy="6.5" r="1.8"/></svg>,
  };
  return icons[type] || null;
};

// ======================== SCHEMA DATA ========================
const schemaGroups = [
  {
    id: "auth", name: "Autenticação e Usuários", emoji: "🔐", color: C.primary, description: "Controle de acesso, tutores, assistentes e sessões",
    tables: [
      {
        name: "users", description: "Tutores e assistentes do app",
        columns: [
          { name: "id", type: "UUID", pk: true, desc: "Identificador único" },
          { name: "email", type: "VARCHAR(255)", unique: true, desc: "Email de login (obrigatório)" },
          { name: "password_hash", type: "VARCHAR(255)", desc: "Hash bcrypt da senha (min 8 chars)" },
          { name: "full_name", type: "VARCHAR(150)", desc: "Nome completo do usuário" },
          { name: "avatar_url", type: "TEXT", nullable: true, desc: "URL da foto de perfil" },
          { name: "role", type: "ENUM", desc: "'tutor_owner' | 'assistant'" },
          { name: "owner_id", type: "UUID", fk: "users.id", nullable: true, desc: "NULL se owner, ref ao dono se assistant" },
          { name: "biometric_enabled", type: "BOOLEAN", desc: "Se biometria está ativa" },
          { name: "biometric_type", type: "ENUM", nullable: true, desc: "'fingerprint' | 'face_id' | null" },
          { name: "language", type: "VARCHAR(5)", desc: "Idioma: pt-BR, en-US, es-ES..." },
          { name: "timezone", type: "VARCHAR(50)", desc: "Fuso horário do usuário" },
          { name: "is_active", type: "BOOLEAN", desc: "Conta ativa ou desativada" },
          { name: "last_login_at", type: "TIMESTAMPTZ", desc: "Último acesso" },
          { name: "created_at", type: "TIMESTAMPTZ", desc: "Data de criação" },
          { name: "updated_at", type: "TIMESTAMPTZ", desc: "Última atualização" },
        ],
        rules: ["Tutor owner pode ter no máximo 2 assistants", "Assistants podem tudo exceto DELETE", "Email único global"],
      },
      {
        name: "sessions", description: "Sessões ativas e dispositivos",
        columns: [
          { name: "id", type: "UUID", pk: true },
          { name: "user_id", type: "UUID", fk: "users.id" },
          { name: "device_name", type: "VARCHAR(100)", desc: "Ex: iPhone 15, Chrome Desktop" },
          { name: "device_type", type: "ENUM", desc: "'mobile' | 'tablet' | 'desktop' | 'watch'" },
          { name: "platform", type: "ENUM", desc: "'ios' | 'android' | 'web' | 'macos' | 'windows'" },
          { name: "ip_address", type: "INET" },
          { name: "auth_method", type: "ENUM", desc: "'password' | 'biometric'" },
          { name: "expires_at", type: "TIMESTAMPTZ", desc: "Expira em 30 dias de inatividade" },
          { name: "created_at", type: "TIMESTAMPTZ" },
        ],
      },
      {
        name: "assistant_permissions", description: "Permissões granulares por assistente",
        columns: [
          { name: "id", type: "UUID", pk: true },
          { name: "user_id", type: "UUID", fk: "users.id", desc: "Assistente" },
          { name: "permission", type: "VARCHAR(50)", desc: "Ex: view_health, edit_diary..." },
          { name: "granted", type: "BOOLEAN", desc: "Sempre false para 'delete_data'" },
          { name: "granted_by", type: "UUID", fk: "users.id", desc: "Tutor que concedeu" },
        ],
        rules: ["DELETE permissions são sempre bloqueadas para assistants"],
      },
    ],
  },
  {
    id: "pets", name: "Pets", emoji: "🐾", color: C.green, description: "Cadastro de cães e gatos com perfil completo",
    tables: [
      {
        name: "pets", description: "Perfil principal de cada pet",
        columns: [
          { name: "id", type: "UUID", pk: true },
          { name: "owner_id", type: "UUID", fk: "users.id", desc: "Tutor proprietário" },
          { name: "name", type: "VARCHAR(100)" },
          { name: "species", type: "ENUM", desc: "'dog' | 'cat' (apenas estes)" },
          { name: "breed", type: "VARCHAR(100)", desc: "Raça do animal" },
          { name: "birth_date", type: "DATE", nullable: true },
          { name: "sex", type: "ENUM", desc: "'male' | 'female'" },
          { name: "is_neutered", type: "BOOLEAN" },
          { name: "weight_kg", type: "DECIMAL(5,2)", nullable: true },
          { name: "microchip_number", type: "VARCHAR(20)", nullable: true, unique: true },
          { name: "blood_type", type: "VARCHAR(20)", nullable: true },
          { name: "photo_url", type: "TEXT", nullable: true },
          { name: "personality_tags", type: "JSONB", desc: "['brincalhão','curioso','ansioso']" },
          { name: "ai_personality_summary", type: "TEXT", desc: "Resumo gerado pela IA via RAG" },
          { name: "health_score", type: "INTEGER", desc: "0-100, calculado pela IA" },
          { name: "happiness_score", type: "INTEGER", desc: "0-100, gráfico de felicidade" },
          { name: "current_mood", type: "VARCHAR(20)", desc: "ecstatic|happy|calm|tired|anxious|sad" },
          { name: "is_memorial", type: "BOOLEAN", desc: "true se pet já faleceu" },
          { name: "memorial_date", type: "DATE", nullable: true },
          { name: "created_at", type: "TIMESTAMPTZ" },
          { name: "updated_at", type: "TIMESTAMPTZ" },
        ],
        rules: ["Apenas species 'dog' e 'cat' são permitidos", "Microchip é unique quando preenchido", "Scores recalculados pelo RAG periodicamente"],
      },
      {
        name: "pet_weight_history", description: "Histórico de peso para o gráfico de evolução",
        columns: [
          { name: "id", type: "UUID", pk: true },
          { name: "pet_id", type: "UUID", fk: "pets.id" },
          { name: "weight_kg", type: "DECIMAL(5,2)" },
          { name: "measured_at", type: "DATE" },
          { name: "source", type: "ENUM", desc: "'manual' | 'vet' | 'ai_photo'" },
        ],
      },
    ],
  },
  {
    id: "health", name: "Saúde e Prontuário", emoji: "🏥", color: C.coral, description: "Vacinas, exames, medicações, cirurgias, alergias e consultas",
    tables: [
      {
        name: "vaccines", description: "Carteira de vacinação digital",
        columns: [
          { name: "id", type: "UUID", pk: true },
          { name: "pet_id", type: "UUID", fk: "pets.id" },
          { name: "name", type: "VARCHAR(100)", desc: "Ex: V10, Antirrábica" },
          { name: "laboratory", type: "VARCHAR(100)" },
          { name: "batch_number", type: "VARCHAR(50)" },
          { name: "dose_number", type: "VARCHAR(20)", desc: "1ª dose, reforço anual..." },
          { name: "applied_date", type: "DATE" },
          { name: "next_due_date", type: "DATE" },
          { name: "vet_name", type: "VARCHAR(150)" },
          { name: "clinic_name", type: "VARCHAR(150)" },
          { name: "status", type: "ENUM", desc: "'up_to_date' | 'overdue' | 'upcoming'" },
          { name: "source", type: "ENUM", desc: "'manual' | 'ocr' | 'vet_import'" },
          { name: "ocr_document_id", type: "UUID", fk: "ocr_documents.id", nullable: true },
          { name: "created_at", type: "TIMESTAMPTZ" },
        ],
      },
      {
        name: "exams", description: "Resultados de exames laboratoriais e de imagem",
        columns: [
          { name: "id", type: "UUID", pk: true },
          { name: "pet_id", type: "UUID", fk: "pets.id" },
          { name: "name", type: "VARCHAR(150)", desc: "Hemograma, Bioquímico, etc." },
          { name: "exam_date", type: "DATE" },
          { name: "status", type: "ENUM", desc: "'normal' | 'attention' | 'critical'" },
          { name: "results", type: "JSONB", desc: "[{item,value,reference,is_normal}]" },
          { name: "vet_name", type: "VARCHAR(150)" },
          { name: "clinic_name", type: "VARCHAR(150)" },
          { name: "source", type: "ENUM", desc: "'manual' | 'ocr' | 'vet_import'" },
          { name: "file_url", type: "TEXT", nullable: true },
          { name: "created_at", type: "TIMESTAMPTZ" },
        ],
      },
      {
        name: "medications", description: "Medicações ativas e históricas",
        columns: [
          { name: "id", type: "UUID", pk: true },
          { name: "pet_id", type: "UUID", fk: "pets.id" },
          { name: "name", type: "VARCHAR(150)" },
          { name: "type", type: "VARCHAR(50)", desc: "antiparasitário, suplemento, etc." },
          { name: "dosage", type: "VARCHAR(100)" },
          { name: "frequency", type: "VARCHAR(100)", desc: "diário, mensal, trimestral..." },
          { name: "start_date", type: "DATE" },
          { name: "end_date", type: "DATE", nullable: true },
          { name: "is_active", type: "BOOLEAN" },
          { name: "notes", type: "TEXT", nullable: true },
          { name: "prescribed_by", type: "VARCHAR(150)", nullable: true },
          { name: "source", type: "ENUM", desc: "'manual' | 'ocr' | 'ai_recommendation'" },
          { name: "created_at", type: "TIMESTAMPTZ" },
        ],
      },
      {
        name: "allergies", description: "Alergias e sensibilidades",
        columns: [
          { name: "id", type: "UUID", pk: true },
          { name: "pet_id", type: "UUID", fk: "pets.id" },
          { name: "name", type: "VARCHAR(100)" },
          { name: "severity", type: "ENUM", desc: "'low' | 'medium' | 'high'" },
          { name: "reaction", type: "TEXT" },
          { name: "diagnosed_date", type: "DATE", nullable: true },
          { name: "confirmed", type: "BOOLEAN", desc: "true=confirmada, false=suspeita" },
        ],
      },
      {
        name: "surgeries", description: "Histórico cirúrgico",
        columns: [
          { name: "id", type: "UUID", pk: true },
          { name: "pet_id", type: "UUID", fk: "pets.id" },
          { name: "name", type: "VARCHAR(200)" },
          { name: "surgery_date", type: "DATE" },
          { name: "anesthesia_type", type: "VARCHAR(100)" },
          { name: "vet_name", type: "VARCHAR(150)" },
          { name: "clinic_name", type: "VARCHAR(150)" },
          { name: "notes", type: "TEXT" },
          { name: "recovery_status", type: "ENUM", desc: "'recovering' | 'recovered'" },
        ],
      },
      {
        name: "consultations", description: "Histórico de consultas veterinárias",
        columns: [
          { name: "id", type: "UUID", pk: true },
          { name: "pet_id", type: "UUID", fk: "pets.id" },
          { name: "consultation_date", type: "DATE" },
          { name: "type", type: "VARCHAR(50)", desc: "check-up, emergência, especialista..." },
          { name: "vet_name", type: "VARCHAR(150)" },
          { name: "clinic_name", type: "VARCHAR(150)" },
          { name: "summary", type: "TEXT" },
          { name: "ai_summary", type: "TEXT", desc: "Resumo gerado pela IA via RAG" },
        ],
      },
    ],
  },
  {
    id: "ai", name: "Análises de IA", emoji: "🧠", color: C.plum, description: "Foto, vídeo, áudio e OCR processados pela IA",
    tables: [
      {
        name: "photo_analyses", description: "Análises de fotos do pet",
        columns: [
          { name: "id", type: "UUID", pk: true },
          { name: "pet_id", type: "UUID", fk: "pets.id" },
          { name: "photo_url", type: "TEXT" },
          { name: "analysis_type", type: "ENUM", desc: "'skin' | 'eyes' | 'teeth' | 'body' | 'wound' | 'full'" },
          { name: "health_score", type: "INTEGER" },
          { name: "findings", type: "JSONB", desc: "[{area,status,label,detail}]" },
          { name: "ai_diary_entry", type: "TEXT", desc: "Narração gerada pelo pet" },
          { name: "raw_ai_response", type: "JSONB", desc: "Resposta completa da API Claude" },
          { name: "analyzed_at", type: "TIMESTAMPTZ" },
        ],
      },
      {
        name: "video_analyses", description: "Análises de vídeo comportamental",
        columns: [
          { name: "id", type: "UUID", pk: true },
          { name: "pet_id", type: "UUID", fk: "pets.id" },
          { name: "video_url", type: "TEXT" },
          { name: "duration_seconds", type: "INTEGER" },
          { name: "locomotion_score", type: "INTEGER" },
          { name: "energy_score", type: "INTEGER" },
          { name: "calm_score", type: "INTEGER" },
          { name: "findings", type: "JSONB" },
          { name: "ai_diary_entry", type: "TEXT" },
          { name: "analyzed_at", type: "TIMESTAMPTZ" },
        ],
      },
      {
        name: "audio_analyses", description: "Análises de vocalizações (latidos, miados)",
        columns: [
          { name: "id", type: "UUID", pk: true },
          { name: "pet_id", type: "UUID", fk: "pets.id" },
          { name: "audio_url", type: "TEXT" },
          { name: "duration_seconds", type: "INTEGER" },
          { name: "emotions", type: "JSONB", desc: "{alert:45, play:30, anxiety:15, hunger:10}" },
          { name: "translation", type: "TEXT", desc: "Tradução em linguagem humana" },
          { name: "ai_tip", type: "TEXT", nullable: true },
          { name: "is_monitoring", type: "BOOLEAN", desc: "Se veio do modo monitor contínuo" },
          { name: "analyzed_at", type: "TIMESTAMPTZ" },
        ],
      },
      {
        name: "ocr_documents", description: "Documentos digitalizados via OCR",
        columns: [
          { name: "id", type: "UUID", pk: true },
          { name: "pet_id", type: "UUID", fk: "pets.id" },
          { name: "document_type", type: "ENUM", desc: "'vaccine_card' | 'prescription' | 'exam' | 'invoice' | 'pedigree'" },
          { name: "image_url", type: "TEXT" },
          { name: "extracted_data", type: "JSONB", desc: "Dados estruturados extraídos" },
          { name: "original_text", type: "TEXT", desc: "Texto bruto do OCR" },
          { name: "confidence_score", type: "DECIMAL(3,2)", desc: "0.00 a 1.00" },
          { name: "processed_at", type: "TIMESTAMPTZ" },
        ],
      },
    ],
  },
  {
    id: "diary", name: "Diário e Timeline", emoji: "📖", color: C.amber, description: "Diário de vida, humor, marcos e memórias",
    tables: [
      {
        name: "diary_entries", description: "Entradas do diário narrado pela IA",
        columns: [
          { name: "id", type: "UUID", pk: true },
          { name: "pet_id", type: "UUID", fk: "pets.id" },
          { name: "author_id", type: "UUID", fk: "users.id" },
          { name: "tutor_input", type: "TEXT", desc: "O que o tutor escreveu" },
          { name: "ai_narration", type: "TEXT", desc: "Versão narrada pelo pet via RAG" },
          { name: "mood", type: "VARCHAR(20)" },
          { name: "tags", type: "JSONB", desc: "['parque','nina','brincadeira']" },
          { name: "is_special", type: "BOOLEAN", desc: "Momento especial destacado" },
          { name: "photos", type: "JSONB", desc: "[{url, thumbnail_url}]" },
          { name: "audio_url", type: "TEXT", nullable: true },
          { name: "video_url", type: "TEXT", nullable: true },
          { name: "linked_analysis_id", type: "UUID", nullable: true, desc: "Análise IA vinculada" },
          { name: "linked_analysis_type", type: "VARCHAR(20)", desc: "'photo' | 'video' | 'audio'" },
          { name: "entry_date", type: "DATE" },
          { name: "created_at", type: "TIMESTAMPTZ" },
        ],
      },
      {
        name: "mood_logs", description: "Registro de humor diário",
        columns: [
          { name: "id", type: "UUID", pk: true },
          { name: "pet_id", type: "UUID", fk: "pets.id" },
          { name: "mood", type: "VARCHAR(20)" },
          { name: "score", type: "INTEGER", desc: "0-100" },
          { name: "source", type: "ENUM", desc: "'manual' | 'ai_photo' | 'ai_audio' | 'ai_video'" },
          { name: "logged_at", type: "TIMESTAMPTZ" },
        ],
      },
      {
        name: "milestones", description: "Marcos e conquistas na vida do pet",
        columns: [
          { name: "id", type: "UUID", pk: true },
          { name: "pet_id", type: "UUID", fk: "pets.id" },
          { name: "title", type: "VARCHAR(200)" },
          { name: "description", type: "TEXT" },
          { name: "badge_name", type: "VARCHAR(100)", nullable: true },
          { name: "milestone_type", type: "ENUM", desc: "'achievement' | 'health' | 'social' | 'learning'" },
          { name: "milestone_date", type: "DATE" },
        ],
      },
    ],
  },
  {
    id: "legacy", name: "Legado e Memória", emoji: "💎", color: C.rose, description: "Cápsulas do tempo, testamento emocional e memorial",
    tables: [
      {
        name: "time_capsules", description: "Mensagens para o futuro",
        columns: [
          { name: "id", type: "UUID", pk: true },
          { name: "pet_id", type: "UUID", fk: "pets.id" },
          { name: "creator_id", type: "UUID", fk: "users.id" },
          { name: "title", type: "VARCHAR(200)" },
          { name: "content_type", type: "ENUM", desc: "'text' | 'audio' | 'video' | 'photo'" },
          { name: "content_text", type: "TEXT", nullable: true, desc: "Criptografado" },
          { name: "content_url", type: "TEXT", nullable: true },
          { name: "status", type: "ENUM", desc: "'locked' | 'unlocked'" },
          { name: "unlock_type", type: "ENUM", desc: "'date' | 'birthday' | 'health_goal' | 'milestone' | 'succession'" },
          { name: "unlock_condition", type: "TEXT" },
          { name: "unlock_date", type: "DATE", nullable: true },
          { name: "unlock_progress", type: "INTEGER", nullable: true, desc: "0-100" },
          { name: "is_private", type: "BOOLEAN", desc: "true = só abre em sucessão" },
          { name: "ai_reflection", type: "TEXT", nullable: true, desc: "Gerado pelo RAG no desbloqueio" },
          { name: "created_at", type: "TIMESTAMPTZ" },
          { name: "unlocked_at", type: "TIMESTAMPTZ", nullable: true },
        ],
      },
      {
        name: "emotional_testament", description: "Testamento emocional e sucessão",
        columns: [
          { name: "id", type: "UUID", pk: true },
          { name: "pet_id", type: "UUID", fk: "pets.id" },
          { name: "owner_id", type: "UUID", fk: "users.id" },
          { name: "is_active", type: "BOOLEAN" },
          { name: "primary_guardian_id", type: "UUID", fk: "co_parents.id" },
          { name: "secondary_guardian_id", type: "UUID", fk: "co_parents.id", nullable: true },
          { name: "tertiary_guardian_id", type: "UUID", fk: "co_parents.id", nullable: true },
          { name: "personal_letter", type: "TEXT", desc: "Carta pessoal criptografada" },
          { name: "personal_letter_video_url", type: "TEXT", nullable: true },
          { name: "critical_info", type: "JSONB", desc: "{allergies,meds,diet,fears,favorites,routine,vet,emergency}" },
          { name: "verification_interval_days", type: "INTEGER", desc: "Padrão: 90" },
          { name: "last_verified_at", type: "TIMESTAMPTZ" },
          { name: "next_verification_at", type: "TIMESTAMPTZ" },
          { name: "activation_status", type: "ENUM", desc: "'inactive' | 'verification_sent' | 'escalated' | 'activated'" },
          { name: "updated_at", type: "TIMESTAMPTZ" },
        ],
      },
    ],
  },
  {
    id: "social", name: "Rede Social e Comunidade", emoji: "🤝", color: C.teal, description: "Co-parentalidade, playdates, credits, SOS e SafeSwap",
    tables: [
      {
        name: "co_parents", description: "Rede de cuidadores do pet",
        columns: [
          { name: "id", type: "UUID", pk: true },
          { name: "pet_id", type: "UUID", fk: "pets.id" },
          { name: "user_id", type: "UUID", fk: "users.id", nullable: true, desc: "Se tem conta no app" },
          { name: "name", type: "VARCHAR(150)" },
          { name: "role", type: "ENUM", desc: "'tutor_reserva' | 'padrinho' | 'passeador' | 'veterinario' | 'vizinho' | 'familiar'" },
          { name: "email", type: "VARCHAR(255)" },
          { name: "phone", type: "VARCHAR(20)" },
          { name: "trust_score", type: "DECIMAL(2,1)", desc: "0.0 a 5.0" },
          { name: "activities_count", type: "INTEGER" },
          { name: "permissions", type: "JSONB", desc: "{view_health:true, edit_diary:true...}" },
          { name: "since_date", type: "DATE" },
          { name: "relation_note", type: "TEXT", nullable: true },
        ],
      },
      {
        name: "care_schedule", description: "Agenda semanal de cuidados",
        columns: [
          { name: "id", type: "UUID", pk: true },
          { name: "pet_id", type: "UUID", fk: "pets.id" },
          { name: "co_parent_id", type: "UUID", fk: "co_parents.id" },
          { name: "day_of_week", type: "INTEGER", desc: "0=dom, 1=seg..." },
          { name: "start_time", type: "TIME" },
          { name: "task", type: "VARCHAR(200)" },
        ],
      },
      {
        name: "pet_credits", description: "Sistema de moeda solidária",
        columns: [
          { name: "id", type: "UUID", pk: true },
          { name: "user_id", type: "UUID", fk: "users.id" },
          { name: "amount", type: "INTEGER", desc: "Positivo = ganho, negativo = gasto" },
          { name: "reason", type: "VARCHAR(200)" },
          { name: "related_pet_id", type: "UUID", fk: "pets.id", nullable: true },
          { name: "created_at", type: "TIMESTAMPTZ" },
        ],
      },
      {
        name: "sos_alerts", description: "Alertas de emergência comunitários",
        columns: [
          { name: "id", type: "UUID", pk: true },
          { name: "pet_id", type: "UUID", fk: "pets.id" },
          { name: "alert_type", type: "ENUM", desc: "'lost_pet' | 'sos_food' | 'sos_medicine' | 'vet_emergency' | 'blood_donation' | 'temp_shelter'" },
          { name: "latitude", type: "DECIMAL(10,7)" },
          { name: "longitude", type: "DECIMAL(10,7)" },
          { name: "radius_km", type: "DECIMAL(4,1)", desc: "Raio de notificação" },
          { name: "description", type: "TEXT" },
          { name: "status", type: "ENUM", desc: "'active' | 'resolved'" },
          { name: "photo_url", type: "TEXT", nullable: true },
          { name: "created_at", type: "TIMESTAMPTZ" },
          { name: "resolved_at", type: "TIMESTAMPTZ", nullable: true },
        ],
      },
      {
        name: "playdates", description: "Encontros entre pets compatíveis",
        columns: [
          { name: "id", type: "UUID", pk: true },
          { name: "pet_1_id", type: "UUID", fk: "pets.id" },
          { name: "pet_2_id", type: "UUID", fk: "pets.id" },
          { name: "compatibility_score", type: "INTEGER", desc: "0-100, calculado pela IA" },
          { name: "scheduled_date", type: "TIMESTAMPTZ", nullable: true },
          { name: "location", type: "TEXT", nullable: true },
          { name: "status", type: "ENUM", desc: "'suggested' | 'accepted' | 'completed' | 'cancelled'" },
        ],
      },
    ],
  },
  {
    id: "nutrition", name: "Nutrição", emoji: "🥗", color: C.orange, description: "Cardápios, refeições, hidratação e receitas",
    tables: [
      {
        name: "meals", description: "Refeições registradas",
        columns: [
          { name: "id", type: "UUID", pk: true },
          { name: "pet_id", type: "UUID", fk: "pets.id" },
          { name: "meal_type", type: "ENUM", desc: "'breakfast' | 'lunch' | 'dinner' | 'snack'" },
          { name: "items", type: "JSONB", desc: "[{name, amount, calories, type}]" },
          { name: "total_calories", type: "INTEGER" },
          { name: "scheduled_time", type: "TIME" },
          { name: "is_completed", type: "BOOLEAN" },
          { name: "meal_date", type: "DATE" },
        ],
      },
      {
        name: "water_logs", description: "Registro de hidratação diária",
        columns: [
          { name: "id", type: "UUID", pk: true },
          { name: "pet_id", type: "UUID", fk: "pets.id" },
          { name: "cups_count", type: "INTEGER" },
          { name: "target_cups", type: "INTEGER" },
          { name: "log_date", type: "DATE" },
        ],
      },
    ],
  },
  {
    id: "travel", name: "Viagens", emoji: "✈️", color: C.sky, description: "Roteiros, registros e locais pet-friendly",
    tables: [
      {
        name: "trips", description: "Viagens do pet",
        columns: [
          { name: "id", type: "UUID", pk: true },
          { name: "pet_id", type: "UUID", fk: "pets.id" },
          { name: "title", type: "VARCHAR(200)" },
          { name: "destination", type: "VARCHAR(200)" },
          { name: "start_date", type: "DATE" },
          { name: "end_date", type: "DATE" },
          { name: "status", type: "ENUM", desc: "'planned' | 'active' | 'completed'" },
          { name: "distance_km", type: "INTEGER" },
          { name: "happiness_score", type: "INTEGER", nullable: true },
          { name: "ai_memory", type: "TEXT", nullable: true, desc: "Narração RAG da viagem" },
          { name: "pet_friendly", type: "JSONB", desc: "{hotel:true, restaurant:true...}" },
          { name: "checklist", type: "JSONB", desc: "{vaccine:true, food:true...}" },
        ],
      },
    ],
  },
  {
    id: "plans", name: "Planos e Seguros", emoji: "🛡️", color: C.coral, description: "Saúde, funerário, bem-estar e dental",
    tables: [
      {
        name: "insurance_plans", description: "Planos contratados",
        columns: [
          { name: "id", type: "UUID", pk: true },
          { name: "pet_id", type: "UUID", fk: "pets.id" },
          { name: "plan_type", type: "ENUM", desc: "'health' | 'funeral' | 'wellness' | 'dental'" },
          { name: "provider_name", type: "VARCHAR(150)" },
          { name: "contract_number", type: "VARCHAR(50)" },
          { name: "monthly_fee", type: "DECIMAL(8,2)" },
          { name: "coverage", type: "JSONB", desc: "[{item, limit, covered}]" },
          { name: "start_date", type: "DATE" },
          { name: "renewal_date", type: "DATE" },
          { name: "status", type: "ENUM", desc: "'active' | 'expired' | 'cancelled'" },
          { name: "hotline", type: "VARCHAR(20)" },
        ],
      },
      {
        name: "insurance_claims", description: "Sinistros e reembolsos",
        columns: [
          { name: "id", type: "UUID", pk: true },
          { name: "plan_id", type: "UUID", fk: "insurance_plans.id" },
          { name: "description", type: "TEXT" },
          { name: "amount", type: "DECIMAL(10,2)" },
          { name: "claim_date", type: "DATE" },
          { name: "status", type: "ENUM", desc: "'pending' | 'approved' | 'rejected'" },
          { name: "provider_clinic", type: "VARCHAR(150)" },
        ],
      },
    ],
  },
  {
    id: "gamification", name: "Gamificação", emoji: "🏆", color: C.amber, description: "Conquistas, emblemas, XP e recompensas",
    tables: [
      {
        name: "achievements", description: "Definição dos 30 emblemas",
        columns: [
          { name: "id", type: "UUID", pk: true },
          { name: "name", type: "VARCHAR(100)" },
          { name: "description", type: "TEXT" },
          { name: "emoji", type: "VARCHAR(10)" },
          { name: "category", type: "ENUM", desc: "'care' | 'social' | 'health' | 'adventure' | 'legacy'" },
          { name: "rarity", type: "ENUM", desc: "'common' | 'rare' | 'epic' | 'legendary' | 'mythic'" },
          { name: "xp_reward", type: "INTEGER" },
          { name: "target_value", type: "INTEGER", desc: "Meta numérica para desbloquear" },
          { name: "tracking_key", type: "VARCHAR(50)", desc: "Chave para auto-tracking" },
        ],
      },
      {
        name: "user_achievements", description: "Progresso do usuário em cada conquista",
        columns: [
          { name: "id", type: "UUID", pk: true },
          { name: "pet_id", type: "UUID", fk: "pets.id" },
          { name: "achievement_id", type: "UUID", fk: "achievements.id" },
          { name: "current_progress", type: "INTEGER" },
          { name: "is_unlocked", type: "BOOLEAN" },
          { name: "unlocked_at", type: "TIMESTAMPTZ", nullable: true },
        ],
      },
    ],
  },
  {
    id: "rag", name: "RAG e Embeddings", emoji: "🧬", color: "#FF6B9D", description: "Cérebro individual de cada pet — busca semântica e memória vetorial",
    tables: [
      {
        name: "pet_embeddings", description: "Vetores de embedding para busca semântica por pet",
        columns: [
          { name: "id", type: "UUID", pk: true },
          { name: "pet_id", type: "UUID", fk: "pets.id", desc: "Cada pet tem seu próprio espaço vetorial" },
          { name: "embedding", type: "VECTOR(1536)", desc: "pgvector — embedding do Claude/OpenAI" },
          { name: "content_text", type: "TEXT", desc: "Texto original resumido" },
          { name: "content_type", type: "ENUM", desc: "'diary' | 'health' | 'photo' | 'video' | 'audio' | 'ocr' | 'consultation' | 'milestone' | 'mood' | 'nutrition' | 'travel'" },
          { name: "source_id", type: "UUID", desc: "ID do registro original na tabela de origem" },
          { name: "source_table", type: "VARCHAR(50)", desc: "Nome da tabela de origem" },
          { name: "metadata", type: "JSONB", desc: "{date, mood, tags, scores, context}" },
          { name: "importance_score", type: "DECIMAL(3,2)", desc: "0.00 a 1.00 — peso na busca" },
          { name: "created_at", type: "TIMESTAMPTZ" },
        ],
        rules: [
          "Cada evento no app gera um embedding no RAG do pet",
          "Busca semântica com pgvector cosine similarity",
          "Filtro por pet_id garante isolamento total entre pets",
          "importance_score prioriza eventos de saúde e emergência",
          "Metadata permite filtragem por data, tipo e contexto",
        ],
      },
      {
        name: "rag_conversations", description: "Histórico de interações com a IA por pet",
        columns: [
          { name: "id", type: "UUID", pk: true },
          { name: "pet_id", type: "UUID", fk: "pets.id" },
          { name: "user_id", type: "UUID", fk: "users.id" },
          { name: "query", type: "TEXT", desc: "Pergunta ou contexto enviado" },
          { name: "context_ids", type: "JSONB", desc: "IDs dos embeddings recuperados" },
          { name: "response", type: "TEXT", desc: "Resposta da IA com contexto RAG" },
          { name: "tokens_used", type: "INTEGER" },
          { name: "response_type", type: "ENUM", desc: "'diary' | 'insight' | 'alert' | 'prediction' | 'narration'" },
          { name: "created_at", type: "TIMESTAMPTZ" },
        ],
      },
    ],
  },
  {
    id: "system", name: "Sistema e Configurações", emoji: "⚙️", color: C.textSec, description: "Backups, preferências, notificações e auditoria",
    tables: [
      {
        name: "user_preferences", description: "Preferências do usuário",
        columns: [
          { name: "user_id", type: "UUID", pk: true, fk: "users.id" },
          { name: "theme", type: "ENUM", desc: "'light' | 'dark' | 'system'" },
          { name: "notifications", type: "JSONB", desc: "{health:true, community:true...}" },
          { name: "weight_unit", type: "ENUM", desc: "'kg' | 'lb'" },
          { name: "temp_unit", type: "ENUM", desc: "'celsius' | 'fahrenheit'" },
        ],
      },
      {
        name: "backups", description: "Histórico de backups",
        columns: [
          { name: "id", type: "UUID", pk: true },
          { name: "user_id", type: "UUID", fk: "users.id" },
          { name: "backup_type", type: "ENUM", desc: "'auto' | 'manual'" },
          { name: "size_bytes", type: "BIGINT" },
          { name: "status", type: "ENUM", desc: "'completed' | 'failed'" },
          { name: "storage_url", type: "TEXT" },
          { name: "created_at", type: "TIMESTAMPTZ" },
        ],
      },
      {
        name: "audit_log", description: "Log de todas as ações (GDPR compliance)",
        columns: [
          { name: "id", type: "UUID", pk: true },
          { name: "user_id", type: "UUID", fk: "users.id" },
          { name: "action", type: "VARCHAR(50)", desc: "'create' | 'update' | 'delete' | 'login' | 'export'" },
          { name: "table_name", type: "VARCHAR(50)" },
          { name: "record_id", type: "UUID" },
          { name: "changes", type: "JSONB", nullable: true, desc: "{before, after}" },
          { name: "ip_address", type: "INET" },
          { name: "created_at", type: "TIMESTAMPTZ" },
        ],
        rules: ["Registra TODAS as operações para compliance", "Assistants nunca geram logs de DELETE", "Retenção mínima de 5 anos"],
      },
    ],
  },
];

// ======================== STATS ========================
const totalTables = schemaGroups.reduce((s, g) => s + g.tables.length, 0);
const totalColumns = schemaGroups.reduce((s, g) => s + g.tables.reduce((st, t) => st + t.columns.length, 0), 0);

// ======================== MAIN APP ========================
export default function DatabaseSchema() {
  const [activeGroup, setActiveGroup] = useState("auth");
  const [expandedTable, setExpandedTable] = useState(null);
  const containerRef = useRef();

  const group = schemaGroups.find(g => g.id === activeGroup);

  return (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center",
      minHeight: "100vh", padding: 20,
      background: `radial-gradient(ellipse at 30% 20%, #141E2C, ${C.bgDeep} 60%, #06080C)`,
      fontFamily: font,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div ref={containerRef} style={{
        width: 420, maxHeight: 840, background: C.bg, borderRadius: 24,
        overflow: "auto", position: "relative",
        boxShadow: `0 20px 80px rgba(0,0,0,0.5), 0 0 0 1px ${C.border}`,
      }}>
        {/* Header */}
        <div style={{
          position: "sticky", top: 0, zIndex: 20,
          background: `linear-gradient(to bottom, ${C.bg}, ${C.bg}F8, ${C.bg}00)`,
          padding: "18px 20px 10px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <Ico type="db" size={20} color={C.primary} />
            <h1 style={{ color: C.text, fontSize: 18, fontWeight: 700, margin: 0 }}>PetauLife+ Database Schema</h1>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {[
              { label: "Grupos", value: schemaGroups.length, color: C.primary },
              { label: "Tabelas", value: totalTables, color: C.green },
              { label: "Colunas", value: totalColumns, color: C.amber },
              { label: "RAG", value: "pgvector", color: "#FF6B9D" },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, background: C.card, borderRadius: 10, padding: "8px 6px", textAlign: "center", border: `1px solid ${C.border}` }}>
                <p style={{ color: s.color, fontSize: 14, fontWeight: 800, margin: 0, fontFamily: fontMono }}>{s.value}</p>
                <p style={{ color: C.textDim, fontSize: 8, margin: "2px 0 0" }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Group selector */}
          <div style={{ display: "flex", gap: 4, overflow: "auto", paddingBottom: 4 }}>
            {schemaGroups.map(g => (
              <button key={g.id} onClick={() => { setActiveGroup(g.id); setExpandedTable(null); }} style={{
                display: "flex", alignItems: "center", gap: 4, padding: "6px 10px",
                borderRadius: 8, cursor: "pointer", whiteSpace: "nowrap",
                background: activeGroup === g.id ? g.color + "20" : C.card,
                border: activeGroup === g.id ? `1px solid ${g.color}30` : `1px solid ${C.border}`,
                color: activeGroup === g.id ? g.color : C.textDim,
                fontSize: 10, fontWeight: 700, fontFamily: font,
                transition: "all 0.2s",
              }}>
                <span style={{ fontSize: 12 }}>{g.emoji}</span> {g.name.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Group Content */}
        {group && (
          <div style={{ padding: "8px 20px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 22 }}>{group.emoji}</span>
              <div>
                <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: 0 }}>{group.name}</h2>
                <p style={{ color: C.textDim, fontSize: 11, margin: "2px 0 0" }}>{group.description}</p>
              </div>
            </div>
            <p style={{ color: C.textDim, fontSize: 10, margin: "8px 0 14px", fontFamily: fontMono }}>
              {group.tables.length} tabela{group.tables.length > 1 ? "s" : ""} ·{" "}
              {group.tables.reduce((s, t) => s + t.columns.length, 0)} colunas
            </p>

            {/* Tables */}
            {group.tables.map((table) => {
              const isExpanded = expandedTable === table.name;
              const pkCols = table.columns.filter(c => c.pk);
              const fkCols = table.columns.filter(c => c.fk);

              return (
                <div key={table.name} style={{ marginBottom: 10 }}>
                  <button onClick={() => setExpandedTable(isExpanded ? null : table.name)} style={{
                    width: "100%", textAlign: "left", cursor: "pointer",
                    background: isExpanded ? group.color + "08" : C.card,
                    borderRadius: isExpanded ? "16px 16px 0 0" : 16,
                    padding: "14px 16px",
                    border: `1px solid ${isExpanded ? group.color + "25" : C.border}`,
                    borderBottom: isExpanded ? `1px dashed ${C.border}` : `1px solid ${isExpanded ? group.color + "25" : C.border}`,
                    fontFamily: font, transition: "all 0.2s",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Ico type="db" size={15} color={group.color} />
                      <div style={{ flex: 1 }}>
                        <span style={{ color: group.color, fontSize: 14, fontWeight: 700, fontFamily: fontMono }}>{table.name}</span>
                        <p style={{ color: C.textDim, fontSize: 10, margin: "2px 0 0" }}>{table.description}</p>
                      </div>
                      <span style={{ color: C.textDim, fontSize: 10, fontFamily: fontMono }}>{table.columns.length} cols</span>
                    </div>

                    {/* Quick badges */}
                    <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                      {pkCols.length > 0 && <span style={{ background: C.amber + "14", color: C.amber, fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 5 }}>PK ×{pkCols.length}</span>}
                      {fkCols.length > 0 && <span style={{ background: C.primary + "14", color: C.primary, fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 5 }}>FK ×{fkCols.length}</span>}
                      {table.columns.some(c => c.type?.includes("JSONB")) && <span style={{ background: C.plum + "14", color: C.plum, fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 5 }}>JSONB</span>}
                      {table.columns.some(c => c.type?.includes("VECTOR")) && <span style={{ background: "#FF6B9D14", color: "#FF6B9D", fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 5 }}>VECTOR</span>}
                    </div>
                  </button>

                  {isExpanded && (
                    <div style={{
                      background: C.bgCard, borderRadius: "0 0 16px 16px",
                      border: `1px solid ${group.color}15`, borderTop: "none",
                      padding: "10px 0",
                    }}>
                      {table.columns.map((col, ci) => (
                        <div key={ci} style={{
                          display: "flex", alignItems: "flex-start", gap: 8,
                          padding: "8px 16px",
                          borderBottom: ci < table.columns.length - 1 ? `1px solid ${C.border}` : "none",
                        }}>
                          <div style={{ width: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                            {col.pk ? <Ico type="key" size={12} color={C.amber} /> :
                             col.fk ? <Ico type="link" size={12} color={C.primary} /> :
                             col.type?.includes("VECTOR") ? <Ico type="vector" size={12} color="#FF6B9D" /> : null}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              <span style={{ color: C.text, fontSize: 12, fontWeight: 600, fontFamily: fontMono }}>{col.name}</span>
                              <span style={{ color: C.textDim, fontSize: 9, fontFamily: fontMono, background: C.card, padding: "1px 5px", borderRadius: 4 }}>{col.type}</span>
                              {col.pk && <span style={{ color: C.amber, fontSize: 8, fontWeight: 700 }}>PK</span>}
                              {col.fk && <span style={{ color: C.primary, fontSize: 8, fontWeight: 700 }}>FK→{col.fk}</span>}
                              {col.unique && <span style={{ color: C.teal, fontSize: 8, fontWeight: 700 }}>UNIQUE</span>}
                              {col.nullable && <span style={{ color: C.textGhost, fontSize: 8 }}>NULL</span>}
                            </div>
                            {col.desc && <p style={{ color: C.textDim, fontSize: 10, margin: "3px 0 0", lineHeight: 1.4 }}>{col.desc}</p>}
                          </div>
                        </div>
                      ))}

                      {/* Rules */}
                      {table.rules && (
                        <div style={{ padding: "10px 16px 4px", borderTop: `1px solid ${C.border}` }}>
                          <p style={{ color: group.color, fontSize: 9, fontWeight: 700, letterSpacing: 0.8, margin: "0 0 6px" }}>REGRAS DE NEGÓCIO</p>
                          {table.rules.map((rule, ri) => (
                            <div key={ri} style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 4 }}>
                              <span style={{ color: group.color, fontSize: 10, marginTop: 1 }}>•</span>
                              <span style={{ color: C.textSec, fontSize: 10, lineHeight: 1.4 }}>{rule}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* RAG Architecture Note */}
        <div style={{
          margin: "0 20px 20px", padding: 18,
          background: `linear-gradient(145deg, #FF6B9D08, ${C.plum}06)`,
          borderRadius: 18, border: `1px solid #FF6B9D12`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Ico type="brain" size={16} color="#FF6B9D" />
            <span style={{ color: "#FF6B9D", fontSize: 12, fontWeight: 700 }}>FLUXO DO RAG POR PET</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { step: "1", text: "Evento acontece (foto, áudio, consulta, diário...)", color: C.green },
              { step: "2", text: "IA Claude processa e extrai informação estruturada", color: C.plum },
              { step: "3", text: "Texto resumido → convertido em embedding VECTOR(1536)", color: "#FF6B9D" },
              { step: "4", text: "Embedding armazenado no pgvector com metadata + pet_id", color: C.amber },
              { step: "5", text: "Query semântica busca contextos relevantes por similaridade", color: C.primary },
              { step: "6", text: "Contextos + pergunta → API Claude → resposta personalizada", color: C.teal },
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                  background: s.color + "18", display: "flex", alignItems: "center", justifyContent: "center",
                  color: s.color, fontSize: 9, fontWeight: 800, fontFamily: fontMono,
                }}>{s.step}</div>
                <span style={{ color: C.textSec, fontSize: 11, lineHeight: 1.4 }}>{s.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p style={{ color: C.textGhost, fontSize: 9, textAlign: "center", padding: "0 20px 20px", fontFamily: fontMono }}>
          PetauLife+ · Supabase PostgreSQL + pgvector · {totalTables} tabelas · {totalColumns} colunas
        </p>

        <style>{`::-webkit-scrollbar{width:0;height:0}`}</style>
      </div>
    </div>
  );
}
