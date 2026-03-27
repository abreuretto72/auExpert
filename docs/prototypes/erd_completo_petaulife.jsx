import { useState, useRef } from "react";

const C = {
  bg: "#0B0F18", bgCard: "#111827", card: "#1A2332", cardHover: "#1E2D40",
  primary: "#4A9EE8", green: "#3DD68C", amber: "#E8B44A", coral: "#E86854",
  plum: "#A06ED8", teal: "#3AC4B0", rose: "#E06888", sky: "#5BB8F0",
  orange: "#E89040", pink: "#FF6B9D", lime: "#84CC16", indigo: "#818CF8",
  text: "#E0E8F0", textSec: "#8CA0B8", textDim: "#4A6078", textGhost: "#2A3C50",
  border: "#1E3045", shadow: "0 4px 28px rgba(0,0,0,0.3)",
};
const font = "'Sora', -apple-system, sans-serif";
const fontMono = "'JetBrains Mono', monospace";

// ======================== FULL SCHEMA ========================
const schema = {
  groups: [
    {
      id: "tutor", name: "Tutor e Transações", emoji: "👤", color: C.primary,
      tables: [
        { name: "users", color: C.primary, cols: [
          { n: "id", t: "UUID", k: "PK" },
          { n: "email", t: "VARCHAR(255)", k: "UQ", idx: true },
          { n: "password_hash", t: "VARCHAR(255)" },
          { n: "full_name", t: "VARCHAR(150)" },
          { n: "cpf", t: "VARCHAR(14)", k: "UQ", idx: true },
          { n: "phone", t: "VARCHAR(20)" },
          { n: "birth_date", t: "DATE" },
          { n: "avatar_url", t: "TEXT" },
          { n: "role", t: "ENUM", note: "tutor_owner|assistant" },
          { n: "owner_id", t: "UUID", k: "FK→users" },
          { n: "biometric_enabled", t: "BOOLEAN" },
          { n: "biometric_type", t: "ENUM" },
          { n: "language", t: "VARCHAR(5)" },
          { n: "timezone", t: "VARCHAR(50)" },
          { n: "is_active", t: "BOOLEAN" },
          { n: "created_at", t: "TIMESTAMPTZ" },
          { n: "updated_at", t: "TIMESTAMPTZ" },
        ]},
        { name: "tutor_profiles", color: C.primary, cols: [
          { n: "id", t: "UUID", k: "PK" },
          { n: "user_id", t: "UUID", k: "FK→users", idx: true },
          { n: "address_street", t: "VARCHAR(255)" },
          { n: "address_number", t: "VARCHAR(20)" },
          { n: "address_complement", t: "VARCHAR(100)" },
          { n: "address_neighborhood", t: "VARCHAR(100)" },
          { n: "address_city", t: "VARCHAR(100)" },
          { n: "address_state", t: "VARCHAR(2)" },
          { n: "address_zip", t: "VARCHAR(10)", idx: true },
          { n: "address_country", t: "VARCHAR(3)" },
          { n: "latitude", t: "DECIMAL(10,7)", idx: true },
          { n: "longitude", t: "DECIMAL(10,7)", idx: true },
          { n: "payment_method", t: "ENUM", note: "credit|debit|pix|boleto" },
          { n: "card_last_four", t: "VARCHAR(4)" },
          { n: "card_brand", t: "VARCHAR(20)" },
          { n: "stripe_customer_id", t: "VARCHAR(50)", k: "UQ" },
          { n: "pix_key", t: "VARCHAR(100)" },
          { n: "subscription_tier", t: "ENUM", note: "free|plus|premium" },
          { n: "subscription_expires_at", t: "TIMESTAMPTZ" },
          { n: "pet_credits_balance", t: "INTEGER", note: "Saldo atual" },
          { n: "total_partner_purchases", t: "DECIMAL(10,2)" },
          { n: "referral_code", t: "VARCHAR(20)", k: "UQ" },
          { n: "referred_by", t: "UUID", k: "FK→users" },
        ]},
        { name: "sessions", color: C.primary, cols: [
          { n: "id", t: "UUID", k: "PK" },
          { n: "user_id", t: "UUID", k: "FK→users", idx: true },
          { n: "device_name", t: "VARCHAR(100)" },
          { n: "device_type", t: "ENUM" },
          { n: "platform", t: "ENUM" },
          { n: "ip_address", t: "INET" },
          { n: "auth_method", t: "ENUM" },
          { n: "expires_at", t: "TIMESTAMPTZ", idx: true },
        ]},
        { name: "assistant_permissions", color: C.primary, cols: [
          { n: "id", t: "UUID", k: "PK" },
          { n: "user_id", t: "UUID", k: "FK→users", idx: true },
          { n: "permission", t: "VARCHAR(50)" },
          { n: "granted", t: "BOOLEAN" },
          { n: "granted_by", t: "UUID", k: "FK→users" },
        ]},
      ],
    },
    {
      id: "partners", name: "Parceiros e Marketplace", emoji: "🏪", color: C.orange,
      tables: [
        { name: "partners", color: C.orange, cols: [
          { n: "id", t: "UUID", k: "PK" },
          { n: "name", t: "VARCHAR(200)" },
          { n: "type", t: "ENUM", note: "vet|petshop|hotel|grooming|walker|trainer|insurance" },
          { n: "cnpj", t: "VARCHAR(18)", k: "UQ" },
          { n: "logo_url", t: "TEXT" },
          { n: "address", t: "TEXT" },
          { n: "latitude", t: "DECIMAL(10,7)", idx: true },
          { n: "longitude", t: "DECIMAL(10,7)", idx: true },
          { n: "phone", t: "VARCHAR(20)" },
          { n: "email", t: "VARCHAR(255)" },
          { n: "rating", t: "DECIMAL(2,1)" },
          { n: "is_verified", t: "BOOLEAN" },
          { n: "commission_pct", t: "DECIMAL(4,2)" },
          { n: "is_active", t: "BOOLEAN" },
        ]},
        { name: "partner_services", color: C.orange, cols: [
          { n: "id", t: "UUID", k: "PK" },
          { n: "partner_id", t: "UUID", k: "FK→partners", idx: true },
          { n: "name", t: "VARCHAR(200)" },
          { n: "description", t: "TEXT" },
          { n: "price", t: "DECIMAL(10,2)" },
          { n: "discount_credits", t: "INTEGER", note: "Desconto em Pet-Credits" },
          { n: "discount_proof_of_love", t: "DECIMAL(4,2)", note: "% desconto por cuidado ativo" },
          { n: "category", t: "ENUM" },
          { n: "is_active", t: "BOOLEAN" },
        ]},
        { name: "partner_transactions", color: C.orange, cols: [
          { n: "id", t: "UUID", k: "PK" },
          { n: "user_id", t: "UUID", k: "FK→users", idx: true },
          { n: "pet_id", t: "UUID", k: "FK→pets", idx: true },
          { n: "partner_id", t: "UUID", k: "FK→partners", idx: true },
          { n: "service_id", t: "UUID", k: "FK→partner_services" },
          { n: "amount", t: "DECIMAL(10,2)" },
          { n: "discount_applied", t: "DECIMAL(10,2)" },
          { n: "credits_used", t: "INTEGER" },
          { n: "credits_earned", t: "INTEGER" },
          { n: "payment_method", t: "ENUM" },
          { n: "stripe_payment_id", t: "VARCHAR(50)" },
          { n: "status", t: "ENUM", note: "pending|completed|refunded|cancelled" },
          { n: "invoice_url", t: "TEXT" },
          { n: "rating", t: "INTEGER", note: "1-5 após serviço" },
          { n: "review", t: "TEXT" },
          { n: "created_at", t: "TIMESTAMPTZ", idx: true },
        ]},
        { name: "partner_reviews", color: C.orange, cols: [
          { n: "id", t: "UUID", k: "PK" },
          { n: "transaction_id", t: "UUID", k: "FK→partner_transactions" },
          { n: "user_id", t: "UUID", k: "FK→users" },
          { n: "partner_id", t: "UUID", k: "FK→partners", idx: true },
          { n: "rating", t: "INTEGER" },
          { n: "comment", t: "TEXT" },
          { n: "is_anonymous", t: "BOOLEAN" },
          { n: "created_at", t: "TIMESTAMPTZ" },
        ]},
      ],
    },
    {
      id: "pets", name: "Pets", emoji: "🐾", color: C.green,
      tables: [
        { name: "pets", color: C.green, cols: [
          { n: "id", t: "UUID", k: "PK" },
          { n: "owner_id", t: "UUID", k: "FK→users", idx: true },
          { n: "name", t: "VARCHAR(100)" },
          { n: "species", t: "ENUM", note: "dog|cat ONLY" },
          { n: "breed", t: "VARCHAR(100)" },
          { n: "birth_date", t: "DATE" },
          { n: "sex", t: "ENUM" },
          { n: "is_neutered", t: "BOOLEAN" },
          { n: "weight_kg", t: "DECIMAL(5,2)" },
          { n: "microchip_number", t: "VARCHAR(20)", k: "UQ", idx: true },
          { n: "blood_type", t: "VARCHAR(20)" },
          { n: "photo_url", t: "TEXT" },
          { n: "personality_tags", t: "JSONB" },
          { n: "ai_personality", t: "TEXT" },
          { n: "health_score", t: "INT" },
          { n: "happiness_score", t: "INT" },
          { n: "current_mood", t: "VARCHAR(20)" },
          { n: "is_memorial", t: "BOOLEAN" },
          { n: "created_at", t: "TIMESTAMPTZ" },
        ]},
        { name: "pet_weight_history", color: C.green, cols: [
          { n: "id", t: "UUID", k: "PK" },
          { n: "pet_id", t: "UUID", k: "FK→pets", idx: true },
          { n: "weight_kg", t: "DECIMAL(5,2)" },
          { n: "measured_at", t: "DATE", idx: true },
          { n: "source", t: "ENUM" },
        ]},
      ],
    },
    {
      id: "health", name: "Saúde", emoji: "🏥", color: C.coral,
      tables: [
        { name: "vaccines", color: C.coral, cols: [
          { n: "id", t: "UUID", k: "PK" },
          { n: "pet_id", t: "UUID", k: "FK→pets", idx: true },
          { n: "name", t: "VARCHAR(100)" },
          { n: "laboratory", t: "VARCHAR(100)" },
          { n: "batch_number", t: "VARCHAR(50)" },
          { n: "applied_date", t: "DATE", idx: true },
          { n: "next_due_date", t: "DATE", idx: true },
          { n: "status", t: "ENUM" },
          { n: "vet_name", t: "VARCHAR(150)" },
          { n: "source", t: "ENUM" },
          { n: "ocr_document_id", t: "UUID", k: "FK→ocr_documents" },
        ]},
        { name: "exams", color: C.coral, cols: [
          { n: "id", t: "UUID", k: "PK" },
          { n: "pet_id", t: "UUID", k: "FK→pets", idx: true },
          { n: "name", t: "VARCHAR(150)" },
          { n: "exam_date", t: "DATE", idx: true },
          { n: "status", t: "ENUM" },
          { n: "results", t: "JSONB" },
          { n: "vet_name", t: "VARCHAR(150)" },
          { n: "file_url", t: "TEXT" },
        ]},
        { name: "medications", color: C.coral, cols: [
          { n: "id", t: "UUID", k: "PK" },
          { n: "pet_id", t: "UUID", k: "FK→pets", idx: true },
          { n: "name", t: "VARCHAR(150)" },
          { n: "dosage", t: "VARCHAR(100)" },
          { n: "frequency", t: "VARCHAR(100)" },
          { n: "start_date", t: "DATE" },
          { n: "end_date", t: "DATE" },
          { n: "is_active", t: "BOOLEAN", idx: true },
          { n: "prescribed_by", t: "VARCHAR(150)" },
        ]},
        { name: "allergies", color: C.coral, cols: [
          { n: "id", t: "UUID", k: "PK" },
          { n: "pet_id", t: "UUID", k: "FK→pets", idx: true },
          { n: "name", t: "VARCHAR(100)" },
          { n: "severity", t: "ENUM" },
          { n: "reaction", t: "TEXT" },
          { n: "confirmed", t: "BOOLEAN" },
        ]},
        { name: "surgeries", color: C.coral, cols: [
          { n: "id", t: "UUID", k: "PK" },
          { n: "pet_id", t: "UUID", k: "FK→pets", idx: true },
          { n: "name", t: "VARCHAR(200)" },
          { n: "surgery_date", t: "DATE" },
          { n: "vet_name", t: "VARCHAR(150)" },
          { n: "notes", t: "TEXT" },
          { n: "recovery_status", t: "ENUM" },
        ]},
        { name: "consultations", color: C.coral, cols: [
          { n: "id", t: "UUID", k: "PK" },
          { n: "pet_id", t: "UUID", k: "FK→pets", idx: true },
          { n: "date", t: "DATE", idx: true },
          { n: "type", t: "VARCHAR(50)" },
          { n: "vet_name", t: "VARCHAR(150)" },
          { n: "summary", t: "TEXT" },
          { n: "ai_summary", t: "TEXT", note: "Gerado pelo RAG" },
        ]},
      ],
    },
    {
      id: "ai", name: "Análises IA", emoji: "🧠", color: C.plum,
      tables: [
        { name: "photo_analyses", color: C.plum, cols: [
          { n: "id", t: "UUID", k: "PK" },
          { n: "pet_id", t: "UUID", k: "FK→pets", idx: true },
          { n: "photo_url", t: "TEXT" },
          { n: "analysis_type", t: "ENUM" },
          { n: "health_score", t: "INT" },
          { n: "findings", t: "JSONB" },
          { n: "ai_diary_entry", t: "TEXT" },
          { n: "analyzed_at", t: "TIMESTAMPTZ", idx: true },
        ]},
        { name: "video_analyses", color: C.plum, cols: [
          { n: "id", t: "UUID", k: "PK" },
          { n: "pet_id", t: "UUID", k: "FK→pets", idx: true },
          { n: "video_url", t: "TEXT" },
          { n: "locomotion_score", t: "INT" },
          { n: "energy_score", t: "INT" },
          { n: "findings", t: "JSONB" },
          { n: "analyzed_at", t: "TIMESTAMPTZ", idx: true },
        ]},
        { name: "audio_analyses", color: C.plum, cols: [
          { n: "id", t: "UUID", k: "PK" },
          { n: "pet_id", t: "UUID", k: "FK→pets", idx: true },
          { n: "audio_url", t: "TEXT" },
          { n: "emotions", t: "JSONB" },
          { n: "translation", t: "TEXT" },
          { n: "is_monitoring", t: "BOOLEAN" },
          { n: "analyzed_at", t: "TIMESTAMPTZ", idx: true },
        ]},
        { name: "ocr_documents", color: C.plum, cols: [
          { n: "id", t: "UUID", k: "PK" },
          { n: "pet_id", t: "UUID", k: "FK→pets", idx: true },
          { n: "document_type", t: "ENUM" },
          { n: "image_url", t: "TEXT" },
          { n: "extracted_data", t: "JSONB" },
          { n: "confidence", t: "DECIMAL(3,2)" },
          { n: "processed_at", t: "TIMESTAMPTZ" },
        ]},
      ],
    },
    {
      id: "diary", name: "Diário", emoji: "📖", color: C.amber,
      tables: [
        { name: "diary_entries", color: C.amber, cols: [
          { n: "id", t: "UUID", k: "PK" },
          { n: "pet_id", t: "UUID", k: "FK→pets", idx: true },
          { n: "author_id", t: "UUID", k: "FK→users" },
          { n: "tutor_input", t: "TEXT" },
          { n: "ai_narration", t: "TEXT", note: "Gerado pelo RAG" },
          { n: "mood", t: "VARCHAR(20)" },
          { n: "tags", t: "JSONB" },
          { n: "is_special", t: "BOOLEAN" },
          { n: "photos", t: "JSONB" },
          { n: "entry_date", t: "DATE", idx: true },
        ]},
        { name: "mood_logs", color: C.amber, cols: [
          { n: "id", t: "UUID", k: "PK" },
          { n: "pet_id", t: "UUID", k: "FK→pets", idx: true },
          { n: "mood", t: "VARCHAR(20)" },
          { n: "score", t: "INT" },
          { n: "source", t: "ENUM" },
          { n: "logged_at", t: "TIMESTAMPTZ", idx: true },
        ]},
        { name: "milestones", color: C.amber, cols: [
          { n: "id", t: "UUID", k: "PK" },
          { n: "pet_id", t: "UUID", k: "FK→pets", idx: true },
          { n: "title", t: "VARCHAR(200)" },
          { n: "badge_name", t: "VARCHAR(100)" },
          { n: "milestone_type", t: "ENUM" },
          { n: "milestone_date", t: "DATE" },
        ]},
      ],
    },
    {
      id: "legacy", name: "Legado", emoji: "💎", color: C.rose,
      tables: [
        { name: "time_capsules", color: C.rose, cols: [
          { n: "id", t: "UUID", k: "PK" },
          { n: "pet_id", t: "UUID", k: "FK→pets", idx: true },
          { n: "creator_id", t: "UUID", k: "FK→users" },
          { n: "title", t: "VARCHAR(200)" },
          { n: "content_type", t: "ENUM" },
          { n: "content_encrypted", t: "TEXT" },
          { n: "status", t: "ENUM", note: "locked|unlocked" },
          { n: "unlock_type", t: "ENUM" },
          { n: "unlock_condition", t: "TEXT" },
          { n: "unlock_progress", t: "INT" },
          { n: "is_private", t: "BOOLEAN" },
          { n: "ai_reflection", t: "TEXT", note: "RAG gera no desbloqueio" },
        ]},
        { name: "emotional_testament", color: C.rose, cols: [
          { n: "id", t: "UUID", k: "PK" },
          { n: "pet_id", t: "UUID", k: "FK→pets", idx: true },
          { n: "owner_id", t: "UUID", k: "FK→users" },
          { n: "primary_guardian_id", t: "UUID", k: "FK→co_parents" },
          { n: "personal_letter_enc", t: "TEXT" },
          { n: "critical_info", t: "JSONB" },
          { n: "verification_days", t: "INT" },
          { n: "next_verification", t: "TIMESTAMPTZ", idx: true },
          { n: "activation_status", t: "ENUM" },
        ]},
      ],
    },
    {
      id: "social", name: "Social", emoji: "🤝", color: C.teal,
      tables: [
        { name: "co_parents", color: C.teal, cols: [
          { n: "id", t: "UUID", k: "PK" },
          { n: "pet_id", t: "UUID", k: "FK→pets", idx: true },
          { n: "user_id", t: "UUID", k: "FK→users" },
          { n: "name", t: "VARCHAR(150)" },
          { n: "role", t: "ENUM" },
          { n: "trust_score", t: "DECIMAL(2,1)" },
          { n: "permissions", t: "JSONB" },
        ]},
        { name: "care_schedule", color: C.teal, cols: [
          { n: "id", t: "UUID", k: "PK" },
          { n: "pet_id", t: "UUID", k: "FK→pets" },
          { n: "co_parent_id", t: "UUID", k: "FK→co_parents" },
          { n: "day_of_week", t: "INT" },
          { n: "start_time", t: "TIME" },
          { n: "task", t: "VARCHAR(200)" },
        ]},
        { name: "pet_credits", color: C.teal, cols: [
          { n: "id", t: "UUID", k: "PK" },
          { n: "user_id", t: "UUID", k: "FK→users", idx: true },
          { n: "amount", t: "INT" },
          { n: "reason", t: "VARCHAR(200)" },
          { n: "pet_id", t: "UUID", k: "FK→pets" },
          { n: "transaction_id", t: "UUID", k: "FK→partner_transactions" },
          { n: "created_at", t: "TIMESTAMPTZ", idx: true },
        ]},
        { name: "sos_alerts", color: C.teal, cols: [
          { n: "id", t: "UUID", k: "PK" },
          { n: "pet_id", t: "UUID", k: "FK→pets" },
          { n: "alert_type", t: "ENUM" },
          { n: "latitude", t: "DECIMAL(10,7)", idx: true },
          { n: "longitude", t: "DECIMAL(10,7)", idx: true },
          { n: "status", t: "ENUM" },
          { n: "created_at", t: "TIMESTAMPTZ" },
        ]},
        { name: "playdates", color: C.teal, cols: [
          { n: "id", t: "UUID", k: "PK" },
          { n: "pet_1_id", t: "UUID", k: "FK→pets" },
          { n: "pet_2_id", t: "UUID", k: "FK→pets" },
          { n: "compatibility", t: "INT" },
          { n: "status", t: "ENUM" },
        ]},
      ],
    },
    {
      id: "nutrition", name: "Nutrição", emoji: "🥗", color: C.lime,
      tables: [
        { name: "meals", color: C.lime, cols: [
          { n: "id", t: "UUID", k: "PK" },
          { n: "pet_id", t: "UUID", k: "FK→pets", idx: true },
          { n: "meal_type", t: "ENUM" },
          { n: "items", t: "JSONB" },
          { n: "total_calories", t: "INT" },
          { n: "meal_date", t: "DATE", idx: true },
          { n: "is_completed", t: "BOOLEAN" },
        ]},
        { name: "water_logs", color: C.lime, cols: [
          { n: "id", t: "UUID", k: "PK" },
          { n: "pet_id", t: "UUID", k: "FK→pets" },
          { n: "cups_count", t: "INT" },
          { n: "log_date", t: "DATE", idx: true },
        ]},
      ],
    },
    {
      id: "extras", name: "Viagens, Planos, Conquistas", emoji: "🌟", color: C.sky,
      tables: [
        { name: "trips", color: C.sky, cols: [
          { n: "id", t: "UUID", k: "PK" },
          { n: "pet_id", t: "UUID", k: "FK→pets", idx: true },
          { n: "title", t: "VARCHAR(200)" },
          { n: "destination", t: "VARCHAR(200)" },
          { n: "status", t: "ENUM" },
          { n: "happiness_score", t: "INT" },
          { n: "ai_memory", t: "TEXT", note: "RAG" },
          { n: "pet_friendly", t: "JSONB" },
          { n: "checklist", t: "JSONB" },
        ]},
        { name: "insurance_plans", color: C.sky, cols: [
          { n: "id", t: "UUID", k: "PK" },
          { n: "pet_id", t: "UUID", k: "FK→pets", idx: true },
          { n: "plan_type", t: "ENUM" },
          { n: "provider_name", t: "VARCHAR(150)" },
          { n: "monthly_fee", t: "DECIMAL(8,2)" },
          { n: "coverage", t: "JSONB" },
          { n: "status", t: "ENUM" },
        ]},
        { name: "insurance_claims", color: C.sky, cols: [
          { n: "id", t: "UUID", k: "PK" },
          { n: "plan_id", t: "UUID", k: "FK→insurance_plans" },
          { n: "amount", t: "DECIMAL(10,2)" },
          { n: "status", t: "ENUM" },
          { n: "claim_date", t: "DATE" },
        ]},
        { name: "achievements", color: C.sky, cols: [
          { n: "id", t: "UUID", k: "PK" },
          { n: "name", t: "VARCHAR(100)" },
          { n: "category", t: "ENUM" },
          { n: "rarity", t: "ENUM" },
          { n: "xp_reward", t: "INT" },
          { n: "target_value", t: "INT" },
        ]},
        { name: "user_achievements", color: C.sky, cols: [
          { n: "id", t: "UUID", k: "PK" },
          { n: "pet_id", t: "UUID", k: "FK→pets" },
          { n: "achievement_id", t: "UUID", k: "FK→achievements" },
          { n: "progress", t: "INT" },
          { n: "is_unlocked", t: "BOOLEAN" },
          { n: "unlocked_at", t: "TIMESTAMPTZ" },
        ]},
      ],
    },
    {
      id: "rag", name: "RAG Engine", emoji: "🧬", color: C.pink,
      tables: [
        { name: "pet_embeddings", color: C.pink, cols: [
          { n: "id", t: "UUID", k: "PK" },
          { n: "pet_id", t: "UUID", k: "FK→pets", idx: true },
          { n: "embedding", t: "VECTOR(1536)", note: "pgvector" },
          { n: "content_text", t: "TEXT" },
          { n: "content_type", t: "ENUM" },
          { n: "source_id", t: "UUID" },
          { n: "source_table", t: "VARCHAR(50)" },
          { n: "metadata", t: "JSONB" },
          { n: "importance", t: "DECIMAL(3,2)" },
          { n: "created_at", t: "TIMESTAMPTZ", idx: true },
        ]},
        { name: "rag_conversations", color: C.pink, cols: [
          { n: "id", t: "UUID", k: "PK" },
          { n: "pet_id", t: "UUID", k: "FK→pets", idx: true },
          { n: "user_id", t: "UUID", k: "FK→users" },
          { n: "query", t: "TEXT" },
          { n: "context_ids", t: "JSONB" },
          { n: "response", t: "TEXT" },
          { n: "response_type", t: "ENUM" },
          { n: "tokens_used", t: "INT" },
          { n: "created_at", t: "TIMESTAMPTZ", idx: true },
        ]},
      ],
    },
    {
      id: "system", name: "Sistema", emoji: "⚙️", color: C.indigo,
      tables: [
        { name: "user_preferences", color: C.indigo, cols: [
          { n: "user_id", t: "UUID", k: "PK FK→users" },
          { n: "theme", t: "ENUM" },
          { n: "notifications", t: "JSONB" },
          { n: "weight_unit", t: "ENUM" },
          { n: "temp_unit", t: "ENUM" },
        ]},
        { name: "backups", color: C.indigo, cols: [
          { n: "id", t: "UUID", k: "PK" },
          { n: "user_id", t: "UUID", k: "FK→users" },
          { n: "type", t: "ENUM" },
          { n: "size_bytes", t: "BIGINT" },
          { n: "status", t: "ENUM" },
          { n: "created_at", t: "TIMESTAMPTZ" },
        ]},
        { name: "audit_log", color: C.indigo, cols: [
          { n: "id", t: "UUID", k: "PK" },
          { n: "user_id", t: "UUID", k: "FK→users", idx: true },
          { n: "action", t: "VARCHAR(50)", idx: true },
          { n: "table_name", t: "VARCHAR(50)" },
          { n: "record_id", t: "UUID" },
          { n: "changes", t: "JSONB" },
          { n: "created_at", t: "TIMESTAMPTZ", idx: true },
        ]},
        { name: "notifications_queue", color: C.indigo, cols: [
          { n: "id", t: "UUID", k: "PK" },
          { n: "user_id", t: "UUID", k: "FK→users", idx: true },
          { n: "type", t: "ENUM" },
          { n: "title", t: "VARCHAR(200)" },
          { n: "body", t: "TEXT" },
          { n: "data", t: "JSONB" },
          { n: "is_read", t: "BOOLEAN", idx: true },
          { n: "created_at", t: "TIMESTAMPTZ" },
        ]},
      ],
    },
  ],
};

// DB Objects
const dbViews = [
  { name: "vw_pet_health_summary", desc: "Score de saúde agregado por pet (vacinas, exames, peso, alergias)", tables: "pets + vaccines + exams + allergies + medications" },
  { name: "vw_pet_happiness_timeline", desc: "Série temporal de felicidade por pet com fontes", tables: "mood_logs + diary_entries + photo/video/audio_analyses" },
  { name: "vw_tutor_financial_summary", desc: "Resumo financeiro: planos, transações, credits, descontos", tables: "tutor_profiles + partner_transactions + insurance_plans + pet_credits" },
  { name: "vw_pet_full_profile", desc: "Perfil completo do pet para QR Code e compartilhamento", tables: "pets + vaccines + allergies + medications + co_parents" },
  { name: "vw_partner_rankings", desc: "Ranking de parceiros por nota e volume de transações", tables: "partners + partner_reviews + partner_transactions" },
  { name: "vw_community_map", desc: "Dados geolocalizados para o mapa da aldeia", tables: "users + tutor_profiles + pets + sos_alerts + partners" },
  { name: "vw_vaccine_alerts", desc: "Vacinas próximas do vencimento ou vencidas", tables: "pets + vaccines WHERE next_due_date <= NOW()+30" },
  { name: "vw_rag_context_by_pet", desc: "Embeddings mais recentes e importantes por pet", tables: "pet_embeddings ORDER BY importance DESC, created_at DESC" },
];

const dbTriggers = [
  { name: "trg_after_insert_any_event", event: "AFTER INSERT", desc: "Gera embedding no RAG automaticamente para cada novo evento (diary, health, analysis, etc.)", tables: "diary_entries, vaccines, exams, consultations, photo/video/audio_analyses, mood_logs, milestones, meals, trips" },
  { name: "trg_update_health_score", event: "AFTER INSERT/UPDATE", desc: "Recalcula health_score do pet quando muda vacina, exame, medicação ou alergia", tables: "vaccines, exams, medications, allergies → pets.health_score" },
  { name: "trg_update_happiness_score", event: "AFTER INSERT", desc: "Recalcula happiness_score quando novo mood_log ou diary com humor é inserido", tables: "mood_logs, diary_entries → pets.happiness_score" },
  { name: "trg_check_vaccine_status", event: "DAILY CRON", desc: "Atualiza status de vacinas (up_to_date→overdue) e envia notificação", tables: "vaccines → notifications_queue" },
  { name: "trg_testament_verification", event: "DAILY CRON", desc: "Verifica se tutor respondeu check periódico. Escala se não responder.", tables: "emotional_testament → notifications_queue" },
  { name: "trg_update_credit_balance", event: "AFTER INSERT", desc: "Atualiza saldo de Pet-Credits no perfil do tutor", tables: "pet_credits → tutor_profiles.pet_credits_balance" },
  { name: "trg_block_assistant_delete", event: "BEFORE DELETE", desc: "Bloqueia qualquer DELETE feito por usuário com role='assistant'", tables: "ALL TABLES" },
  { name: "trg_audit_log", event: "AFTER INSERT/UPDATE/DELETE", desc: "Registra todas as operações no audit_log para GDPR", tables: "ALL TABLES → audit_log" },
  { name: "trg_auto_backup", event: "DAILY CRON 03:00", desc: "Executa backup automático dos dados do tutor", tables: "ALL → backups" },
  { name: "trg_partner_rating_update", event: "AFTER INSERT", desc: "Recalcula rating médio do parceiro após nova review", tables: "partner_reviews → partners.rating" },
];

const dbFunctions = [
  { name: "fn_search_rag(pet_id, query, limit)", returns: "SETOF pet_embeddings", desc: "Busca semântica por similaridade cosine no pgvector filtrando por pet_id" },
  { name: "fn_generate_embedding(text)", returns: "VECTOR(1536)", desc: "Chama API externa para gerar embedding do texto (Edge Function)" },
  { name: "fn_calculate_health_score(pet_id)", returns: "INTEGER", desc: "Calcula score 0-100 baseado em vacinas, exames, peso, alergias e medicações" },
  { name: "fn_calculate_happiness(pet_id, period)", returns: "INTEGER", desc: "Calcula score de felicidade por período com pesos por fonte" },
  { name: "fn_match_playdates(pet_id)", returns: "SETOF pets", desc: "Retorna pets compatíveis por raça, energia, personalidade e localização" },
  { name: "fn_check_food_safety(ingredient)", returns: "JSONB", desc: "Verifica se ingrediente é seguro para cães/gatos com nível de risco" },
  { name: "fn_generate_qr_token(pet_id, scope, ttl)", returns: "VARCHAR", desc: "Gera token JWT temporário para QR Code com escopo de dados e TTL" },
  { name: "fn_apply_partner_discount(user_id, service_id)", returns: "JSONB", desc: "Calcula desconto por Pet-Credits + Proof of Love + assinatura" },
  { name: "fn_process_testament_escalation(testament_id)", returns: "VOID", desc: "Escalona ativação do testamento: notifica contatos → guardian → transfere" },
  { name: "fn_get_pet_rag_context(pet_id, query, max_tokens)", returns: "TEXT", desc: "Monta contexto RAG completo para enviar à API Claude com limite de tokens" },
  { name: "fn_sync_capsule_progress(capsule_id)", returns: "VOID", desc: "Atualiza progresso de desbloqueio de cápsulas baseado em condições" },
  { name: "fn_notify_nearby_users(lat, lng, radius, type)", returns: "VOID", desc: "Envia push para usuários dentro do raio (SOS, pet perdido)" },
];

const dbIndexes = [
  { name: "idx_pet_embeddings_vector", table: "pet_embeddings", type: "ivfflat (pgvector)", cols: "embedding", note: "Busca vetorial por similaridade cosine" },
  { name: "idx_pet_embeddings_pet_type", table: "pet_embeddings", type: "btree", cols: "pet_id, content_type", note: "Filtro por pet e tipo de conteúdo" },
  { name: "idx_geo_tutors", table: "tutor_profiles", type: "gist", cols: "latitude, longitude", note: "Busca geoespacial para mapa" },
  { name: "idx_geo_partners", table: "partners", type: "gist", cols: "latitude, longitude", note: "Busca parceiros por proximidade" },
  { name: "idx_geo_sos", table: "sos_alerts", type: "gist", cols: "latitude, longitude", note: "Alertas SOS por localização" },
  { name: "idx_vaccines_due", table: "vaccines", type: "btree", cols: "pet_id, next_due_date", note: "Vacinas a vencer" },
  { name: "idx_mood_timeline", table: "mood_logs", type: "btree", cols: "pet_id, logged_at DESC", note: "Timeline de humor" },
  { name: "idx_diary_timeline", table: "diary_entries", type: "btree", cols: "pet_id, entry_date DESC", note: "Timeline do diário" },
  { name: "idx_transactions_user", table: "partner_transactions", type: "btree", cols: "user_id, created_at DESC", note: "Histórico de compras" },
  { name: "idx_audit_user_action", table: "audit_log", type: "btree", cols: "user_id, action, created_at DESC", note: "Busca em log de auditoria" },
  { name: "idx_notifications_unread", table: "notifications_queue", type: "btree", cols: "user_id, is_read, created_at DESC", note: "Notificações não lidas" },
];

// ======================== COMPONENTS ========================
const totalTables = schema.groups.reduce((s, g) => s + g.tables.length, 0);
const totalCols = schema.groups.reduce((s, g) => s + g.tables.reduce((st, t) => st + t.cols.length, 0), 0);

export default function ERDDiagram() {
  const [activeGroup, setActiveGroup] = useState("tutor");
  const [expandedTable, setExpandedTable] = useState(null);
  const [activeSection, setActiveSection] = useState("tables");
  const containerRef = useRef();

  const group = schema.groups.find(g => g.id === activeGroup);

  const sections = [
    { id: "tables", label: "Tabelas", count: totalTables },
    { id: "views", label: "Views", count: dbViews.length },
    { id: "triggers", label: "Triggers", count: dbTriggers.length },
    { id: "functions", label: "Functions", count: dbFunctions.length },
    { id: "indexes", label: "Indexes", count: dbIndexes.length },
  ];

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", padding: 20, background: `radial-gradient(ellipse at 30% 20%, #141E2C, ${C.bgCard} 60%, #06080C)`, fontFamily: font }}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div ref={containerRef} style={{ width: 440, maxHeight: 860, background: C.bg, borderRadius: 20, overflow: "auto", position: "relative", boxShadow: `0 20px 80px rgba(0,0,0,0.5), 0 0 0 1px ${C.border}` }}>

        {/* Header */}
        <div style={{ position: "sticky", top: 0, zIndex: 20, background: `linear-gradient(to bottom, ${C.bg}, ${C.bg}F8, ${C.bg}00)`, padding: "16px 18px 8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 18 }}>🗄️</span>
            <h1 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: 0 }}>PetauLife+ · Diagrama de Dados Completo</h1>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
            {[
              { label: "Tabelas", value: totalTables, color: C.green },
              { label: "Colunas", value: totalCols, color: C.amber },
              { label: "Views", value: dbViews.length, color: C.primary },
              { label: "Triggers", value: dbTriggers.length, color: C.coral },
              { label: "Functions", value: dbFunctions.length, color: C.plum },
              { label: "Indexes", value: dbIndexes.length, color: C.teal },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, background: C.card, borderRadius: 8, padding: "6px 4px", textAlign: "center", border: `1px solid ${C.border}` }}>
                <p style={{ color: s.color, fontSize: 13, fontWeight: 800, margin: 0, fontFamily: fontMono }}>{s.value}</p>
                <p style={{ color: C.textDim, fontSize: 7, margin: "1px 0 0" }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Section tabs */}
          <div style={{ display: "flex", gap: 3, marginBottom: 8 }}>
            {sections.map(sec => (
              <button key={sec.id} onClick={() => setActiveSection(sec.id)} style={{
                flex: 1, padding: "6px 4px", borderRadius: 8, cursor: "pointer",
                background: activeSection === sec.id ? C.primary + "20" : C.card,
                border: activeSection === sec.id ? `1px solid ${C.primary}30` : `1px solid ${C.border}`,
                color: activeSection === sec.id ? C.primary : C.textDim,
                fontSize: 9, fontWeight: 700, fontFamily: font,
              }}>{sec.label} ({sec.count})</button>
            ))}
          </div>

          {/* Group tabs for tables */}
          {activeSection === "tables" && (
            <div style={{ display: "flex", gap: 3, overflow: "auto", paddingBottom: 2 }}>
              {schema.groups.map(g => (
                <button key={g.id} onClick={() => { setActiveGroup(g.id); setExpandedTable(null); }} style={{
                  display: "flex", alignItems: "center", gap: 3, padding: "5px 8px",
                  borderRadius: 7, cursor: "pointer", whiteSpace: "nowrap",
                  background: activeGroup === g.id ? g.color + "18" : "transparent",
                  border: activeGroup === g.id ? `1px solid ${g.color}25` : `1px solid transparent`,
                  color: activeGroup === g.id ? g.color : C.textDim,
                  fontSize: 9, fontWeight: 700,
                }}>
                  <span style={{ fontSize: 10 }}>{g.emoji}</span>{g.name.split(" ")[0]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: "6px 18px 24px" }}>

          {/* ====== TABLES ====== */}
          {activeSection === "tables" && group && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 18 }}>{group.emoji}</span>
                <div>
                  <h2 style={{ color: C.text, fontSize: 14, fontWeight: 700, margin: 0 }}>{group.name}</h2>
                  <p style={{ color: C.textDim, fontSize: 10, margin: "2px 0 0", fontFamily: fontMono }}>{group.tables.length} tabelas · {group.tables.reduce((s, t) => s + t.cols.length, 0)} colunas</p>
                </div>
              </div>

              {group.tables.map((table) => {
                const isExp = expandedTable === table.name;
                return (
                  <div key={table.name} style={{ marginBottom: 8 }}>
                    <button onClick={() => setExpandedTable(isExp ? null : table.name)} style={{
                      width: "100%", textAlign: "left", cursor: "pointer",
                      background: isExp ? table.color + "06" : C.card,
                      borderRadius: isExp ? "12px 12px 0 0" : 12,
                      padding: "10px 14px",
                      border: `1px solid ${isExp ? table.color + "20" : C.border}`,
                      borderBottom: isExp ? `1px dashed ${C.border}` : undefined,
                      fontFamily: font,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: table.color, flexShrink: 0 }} />
                        <span style={{ color: table.color, fontSize: 12, fontWeight: 700, fontFamily: fontMono, flex: 1 }}>{table.name}</span>
                        <span style={{ color: C.textDim, fontSize: 9, fontFamily: fontMono }}>{table.cols.length}</span>
                      </div>
                      {/* FK badges */}
                      <div style={{ display: "flex", gap: 3, marginTop: 6, flexWrap: "wrap" }}>
                        {table.cols.filter(c => c.k?.includes("FK")).map((c, i) => (
                          <span key={i} style={{ background: C.primary + "10", color: C.primary, fontSize: 7, fontWeight: 700, padding: "1px 5px", borderRadius: 4, fontFamily: fontMono }}>
                            {c.n}→{c.k.split("→")[1]}
                          </span>
                        ))}
                      </div>
                    </button>

                    {isExp && (
                      <div style={{ background: C.bgCard, borderRadius: "0 0 12px 12px", border: `1px solid ${table.color}12`, borderTop: "none", padding: "6px 0" }}>
                        {table.cols.map((col, ci) => (
                          <div key={ci} style={{
                            display: "flex", alignItems: "center", gap: 6,
                            padding: "5px 14px", borderBottom: ci < table.cols.length - 1 ? `1px solid ${C.border}` : "none",
                          }}>
                            <div style={{ width: 12, display: "flex", justifyContent: "center", flexShrink: 0 }}>
                              {col.k?.includes("PK") && <span style={{ color: C.amber, fontSize: 8, fontWeight: 800 }}>🔑</span>}
                              {col.k?.includes("FK") && !col.k?.includes("PK") && <span style={{ color: C.primary, fontSize: 8 }}>🔗</span>}
                              {col.k?.includes("UQ") && <span style={{ color: C.teal, fontSize: 8 }}>◆</span>}
                            </div>
                            <span style={{ color: C.text, fontSize: 10, fontWeight: 600, fontFamily: fontMono, width: 110, flexShrink: 0 }}>{col.n}</span>
                            <span style={{ color: C.textDim, fontSize: 8, fontFamily: fontMono, flex: 1 }}>{col.t}</span>
                            {col.idx && <span style={{ color: C.teal, fontSize: 7, fontWeight: 700 }}>IDX</span>}
                            {col.k?.includes("FK") && <span style={{ color: C.primary, fontSize: 7, fontFamily: fontMono }}>{col.k.split("→")[1]}</span>}
                            {col.note && <span style={{ color: table.color, fontSize: 7, fontStyle: "italic", maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{col.note}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {/* ====== VIEWS ====== */}
          {activeSection === "views" && (
            <>
              <p style={{ color: C.primary, fontSize: 11, fontWeight: 700, letterSpacing: 1, margin: "0 0 12px" }}>DATABASE VIEWS ({dbViews.length})</p>
              {dbViews.map((v, i) => (
                <div key={i} style={{ background: C.card, borderRadius: 12, padding: "12px 14px", marginBottom: 8, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.primary}` }}>
                  <p style={{ color: C.primary, fontSize: 11, fontWeight: 700, margin: "0 0 4px", fontFamily: fontMono }}>{v.name}</p>
                  <p style={{ color: C.textSec, fontSize: 10, lineHeight: 1.5, margin: "0 0 6px" }}>{v.desc}</p>
                  <p style={{ color: C.textDim, fontSize: 8, margin: 0, fontFamily: fontMono }}>FROM: {v.tables}</p>
                </div>
              ))}
            </>
          )}

          {/* ====== TRIGGERS ====== */}
          {activeSection === "triggers" && (
            <>
              <p style={{ color: C.coral, fontSize: 11, fontWeight: 700, letterSpacing: 1, margin: "0 0 12px" }}>TRIGGERS ({dbTriggers.length})</p>
              {dbTriggers.map((tr, i) => (
                <div key={i} style={{ background: C.card, borderRadius: 12, padding: "12px 14px", marginBottom: 8, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.coral}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span style={{ color: C.coral, fontSize: 11, fontWeight: 700, fontFamily: fontMono }}>{tr.name}</span>
                  </div>
                  <span style={{ background: C.coral + "14", color: C.coral, fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 4, fontFamily: fontMono }}>{tr.event}</span>
                  <p style={{ color: C.textSec, fontSize: 10, lineHeight: 1.5, margin: "6px 0 4px" }}>{tr.desc}</p>
                  <p style={{ color: C.textDim, fontSize: 8, margin: 0, fontFamily: fontMono }}>TABLES: {tr.tables}</p>
                </div>
              ))}
            </>
          )}

          {/* ====== FUNCTIONS ====== */}
          {activeSection === "functions" && (
            <>
              <p style={{ color: C.plum, fontSize: 11, fontWeight: 700, letterSpacing: 1, margin: "0 0 12px" }}>FUNCTIONS ({dbFunctions.length})</p>
              {dbFunctions.map((fn, i) => (
                <div key={i} style={{ background: C.card, borderRadius: 12, padding: "12px 14px", marginBottom: 8, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.plum}` }}>
                  <p style={{ color: C.plum, fontSize: 10, fontWeight: 700, margin: "0 0 2px", fontFamily: fontMono }}>{fn.name}</p>
                  <span style={{ background: C.plum + "14", color: C.plum, fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 4, fontFamily: fontMono }}>→ {fn.returns}</span>
                  <p style={{ color: C.textSec, fontSize: 10, lineHeight: 1.5, margin: "6px 0 0" }}>{fn.desc}</p>
                </div>
              ))}
            </>
          )}

          {/* ====== INDEXES ====== */}
          {activeSection === "indexes" && (
            <>
              <p style={{ color: C.teal, fontSize: 11, fontWeight: 700, letterSpacing: 1, margin: "0 0 12px" }}>INDEXES ({dbIndexes.length})</p>
              {dbIndexes.map((idx, i) => (
                <div key={i} style={{ background: C.card, borderRadius: 12, padding: "12px 14px", marginBottom: 8, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.teal}` }}>
                  <p style={{ color: C.teal, fontSize: 10, fontWeight: 700, margin: "0 0 4px", fontFamily: fontMono }}>{idx.name}</p>
                  <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                    <span style={{ background: C.teal + "14", color: C.teal, fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 4, fontFamily: fontMono }}>{idx.type}</span>
                    <span style={{ background: C.amber + "14", color: C.amber, fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 4, fontFamily: fontMono }}>{idx.table}</span>
                  </div>
                  <p style={{ color: C.textDim, fontSize: 9, margin: "0 0 2px", fontFamily: fontMono }}>ON ({idx.cols})</p>
                  <p style={{ color: C.textSec, fontSize: 10, margin: "4px 0 0" }}>{idx.note}</p>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Relationship Map */}
        <div style={{ margin: "0 18px 16px", padding: 16, background: C.card, borderRadius: 14, border: `1px solid ${C.border}` }}>
          <p style={{ color: C.text, fontSize: 12, fontWeight: 700, margin: "0 0 10px" }}>🔗 Mapa de Relacionamentos Principais</p>
          <div style={{ fontSize: 9, color: C.textSec, lineHeight: 2, fontFamily: fontMono }}>
            <span style={{ color: C.primary }}>users</span> 1──N <span style={{ color: C.green }}>pets</span> 1──N <span style={{ color: C.coral }}>vaccines</span><br/>
            <span style={{ color: C.primary }}>users</span> 1──N <span style={{ color: C.green }}>pets</span> 1──N <span style={{ color: C.coral }}>exams</span><br/>
            <span style={{ color: C.primary }}>users</span> 1──N <span style={{ color: C.green }}>pets</span> 1──N <span style={{ color: C.coral }}>medications</span><br/>
            <span style={{ color: C.primary }}>users</span> 1──N <span style={{ color: C.green }}>pets</span> 1──N <span style={{ color: C.coral }}>allergies</span><br/>
            <span style={{ color: C.primary }}>users</span> 1──N <span style={{ color: C.green }}>pets</span> 1──N <span style={{ color: C.coral }}>surgeries</span><br/>
            <span style={{ color: C.primary }}>users</span> 1──N <span style={{ color: C.green }}>pets</span> 1──N <span style={{ color: C.coral }}>consultations</span><br/>
            <span style={{ color: C.primary }}>users</span> 1──N <span style={{ color: C.green }}>pets</span> 1──N <span style={{ color: C.plum }}>photo_analyses</span><br/>
            <span style={{ color: C.primary }}>users</span> 1──N <span style={{ color: C.green }}>pets</span> 1──N <span style={{ color: C.plum }}>video_analyses</span><br/>
            <span style={{ color: C.primary }}>users</span> 1──N <span style={{ color: C.green }}>pets</span> 1──N <span style={{ color: C.plum }}>audio_analyses</span><br/>
            <span style={{ color: C.primary }}>users</span> 1──N <span style={{ color: C.green }}>pets</span> 1──N <span style={{ color: C.plum }}>ocr_documents</span><br/>
            <span style={{ color: C.primary }}>users</span> 1──N <span style={{ color: C.green }}>pets</span> 1──N <span style={{ color: C.amber }}>diary_entries</span><br/>
            <span style={{ color: C.primary }}>users</span> 1──N <span style={{ color: C.green }}>pets</span> 1──N <span style={{ color: C.amber }}>mood_logs</span><br/>
            <span style={{ color: C.primary }}>users</span> 1──N <span style={{ color: C.green }}>pets</span> 1──N <span style={{ color: C.amber }}>milestones</span><br/>
            <span style={{ color: C.primary }}>users</span> 1──N <span style={{ color: C.green }}>pets</span> 1──N <span style={{ color: C.rose }}>time_capsules</span><br/>
            <span style={{ color: C.primary }}>users</span> 1──N <span style={{ color: C.green }}>pets</span> 1──1 <span style={{ color: C.rose }}>emotional_testament</span><br/>
            <span style={{ color: C.primary }}>users</span> 1──N <span style={{ color: C.green }}>pets</span> 1──N <span style={{ color: C.teal }}>co_parents</span><br/>
            <span style={{ color: C.primary }}>users</span> 1──N <span style={{ color: C.green }}>pets</span> 1──N <span style={{ color: C.lime }}>meals</span><br/>
            <span style={{ color: C.primary }}>users</span> 1──N <span style={{ color: C.green }}>pets</span> 1──N <span style={{ color: C.sky }}>trips</span><br/>
            <span style={{ color: C.primary }}>users</span> 1──N <span style={{ color: C.green }}>pets</span> 1──N <span style={{ color: C.sky }}>insurance_plans</span> 1──N <span style={{ color: C.sky }}>insurance_claims</span><br/>
            <span style={{ color: C.primary }}>users</span> 1──N <span style={{ color: C.green }}>pets</span> 1──N <span style={{ color: C.pink }}>pet_embeddings</span> (RAG)<br/>
            <span style={{ color: C.primary }}>users</span> 1──1 <span style={{ color: C.primary }}>tutor_profiles</span> 1──N <span style={{ color: C.orange }}>partner_transactions</span><br/>
            <span style={{ color: C.orange }}>partners</span> 1──N <span style={{ color: C.orange }}>partner_services</span><br/>
            <span style={{ color: C.orange }}>partners</span> 1──N <span style={{ color: C.orange }}>partner_transactions</span><br/>
            <span style={{ color: C.orange }}>partner_transactions</span> 1──1 <span style={{ color: C.orange }}>partner_reviews</span><br/>
            <span style={{ color: C.primary }}>users</span> 1──2 <span style={{ color: C.primary }}>assistant_permissions</span> (max 2 assistants)<br/>
            <span style={{ color: C.teal }}>pet_credits</span> N──1 <span style={{ color: C.orange }}>partner_transactions</span> (créditos por compra)<br/>
          </div>
        </div>

        {/* Footer */}
        <p style={{ color: C.textGhost, fontSize: 8, textAlign: "center", padding: "0 18px 16px", fontFamily: fontMono }}>
          PetauLife+ · Supabase PostgreSQL + pgvector · {totalTables} tabelas · {totalCols} colunas · {dbViews.length} views · {dbTriggers.length} triggers · {dbFunctions.length} functions · {dbIndexes.length} indexes
        </p>

        <style>{`::-webkit-scrollbar{width:0;height:0}`}</style>
      </div>
    </div>
  );
}
