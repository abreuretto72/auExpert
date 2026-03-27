import { useState, useRef } from "react";

const C = {
  bg: "#0C1117", bgCard: "#131C28", card: "#1A2535", cardHover: "#1E2D40",
  primary: "#4A9EE8", green: "#3DD68C", amber: "#E8B44A", coral: "#E86854",
  plum: "#A06ED8", teal: "#3AC4B0", rose: "#E06888", sky: "#5BB8F0",
  orange: "#E89040", pink: "#FF6B9D", lime: "#84CC16", indigo: "#818CF8",
  cyan: "#22D3EE",
  text: "#E0E8F0", textSec: "#8CA0B8", textDim: "#4A6078", textGhost: "#2A3C50",
  border: "#1E3045",
};
const font = "'Sora', -apple-system, sans-serif";
const fontMono = "'JetBrains Mono', monospace";

const Ico = ({ type, size = 16, color = C.textDim }) => {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" };
  const icons = {
    bucket: <svg {...p}><path d="M4 6h16M4 6c0 1.1 3.6 2 8 2s8-.9 8-2M4 6v12c0 1.1 3.6 2 8 2s8-.9 8-2V6"/><path d="M4 12c0 1.1 3.6 2 8 2s8-.9 8-2"/></svg>,
    compress: <svg {...p}><polyline points="4,14 10,14 10,20"/><polyline points="20,10 14,10 14,4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>,
    image: <svg {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>,
    video: <svg {...p}><rect x="2" y="4" width="15" height="16" rx="2"/><path d="M17 9l5-3v12l-5-3"/></svg>,
    mic: <svg {...p}><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/></svg>,
    file: <svg {...p}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>,
    globe: <svg {...p}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
    zap: <svg {...p}><polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/></svg>,
    shield: <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    arrow: <svg {...p}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/></svg>,
    arrowDown: <svg {...p}><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19,12 12,19 5,12"/></svg>,
    chat: <svg {...p}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
    brain: <svg {...p}><path d="M12 2a5 5 0 015 5c0 1.5-.7 2.8-1.7 3.7A5 5 0 0120 15a5 5 0 01-3 4.6V22h-2v-2h-6v2H7v-2.4A5 5 0 014 15a5 5 0 014.7-4.3A5 5 0 017 7a5 5 0 015-5z"/></svg>,
    server: <svg {...p}><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>,
    cache: <svg {...p}><polyline points="23,4 23,10 17,10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>,
    lock: <svg {...p}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
    cloud: <svg {...p}><path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/></svg>,
    check: <svg {...p} strokeWidth="2.5"><polyline points="20,6 9,17 4,12"/></svg>,
    user: <svg {...p}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  };
  return icons[type] || null;
};

// ======================== DATA ========================
const buckets = [
  {
    name: "pet-photos", icon: "image", color: C.green, access: "private",
    description: "Fotos de perfil, diário, análises IA, memoriais",
    inputFormat: "JPG/PNG/HEIC (até 12MB)", outputFormat: "WebP",
    compression: { quality: "80%", savings: "~70%", sizes: ["thumb 150px", "medium 600px", "original 1200px"] },
    avgSize: { before: "3.5 MB", after: "350 KB (medium)" },
    policy: "RLS: owner + assistants(view_photos) + co_parents(perm)",
    cdn: true, ttl: "30 dias",
    tables: ["pets.photo_url", "diary_entries.photos", "photo_analyses.photo_url"],
  },
  {
    name: "pet-videos", icon: "video", color: C.sky, access: "private",
    description: "Análise comportamental, cápsulas do tempo, diário",
    inputFormat: "MP4/MOV/HEVC (até 100MB, max 3min)",
    outputFormat: "H.264/MP4",
    compression: { quality: "Bitrate adaptativo", savings: "~60%", sizes: ["preview 480p 1Mbps", "standard 720p 2.5Mbps"] },
    avgSize: { before: "45 MB", after: "8 MB (standard)" },
    policy: "RLS: owner + assistants + co_parents(perm). Cápsulas: criptografadas",
    cdn: true, ttl: "7 dias",
    tables: ["video_analyses.video_url", "time_capsules.content_url", "diary_entries.video_url"],
    extra: "Thumbnail auto-gerado do 1º frame (WebP 400px)",
  },
  {
    name: "pet-audio", icon: "mic", color: C.rose, access: "private",
    description: "Vocalizações, latidos, mensagens de voz, cápsulas",
    inputFormat: "WAV/M4A/OGG (até 25MB, max 5min)",
    outputFormat: "AAC/M4A",
    compression: { quality: "64 kbps", savings: "~80%", sizes: ["mono 64kbps"] },
    avgSize: { before: "12 MB", after: "600 KB" },
    policy: "RLS: owner + assistants. Monitor mode: acesso exclusivo owner",
    cdn: false, ttl: "N/A",
    tables: ["audio_analyses.audio_url", "time_capsules.content_url"],
    extra: "Waveform visual gerado no upload para UI",
  },
  {
    name: "pet-documents", icon: "file", color: C.amber, access: "private",
    description: "OCR: carteiras, receitas, exames, pedigrees, notas fiscais",
    inputFormat: "JPG/PNG/PDF (até 15MB)",
    outputFormat: "PNG otimizado / PDF comprimido",
    compression: { quality: "Lossless para OCR", savings: "~40%", sizes: ["optimized", "original mantido"] },
    avgSize: { before: "5 MB", after: "2 MB" },
    policy: "RLS: owner + assistants. Compartilhável via QR token temporário (JWT 24h)",
    cdn: false, ttl: "N/A",
    tables: ["ocr_documents.image_url", "exams.file_url", "insurance_claims.invoice_url"],
    extra: "Original mantido para re-processamento OCR futuro",
  },
  {
    name: "avatars", icon: "user", color: C.plum, access: "public",
    description: "Fotos de perfil de tutores, assistentes e co-parents",
    inputFormat: "JPG/PNG (até 5MB)",
    outputFormat: "WebP",
    compression: { quality: "75%", savings: "~75%", sizes: ["400px único"] },
    avgSize: { before: "2 MB", after: "50 KB" },
    policy: "Público (apenas leitura). Upload: autenticado",
    cdn: true, ttl: "90 dias",
    tables: ["users.avatar_url"],
  },
  {
    name: "public-assets", icon: "cloud", color: C.teal, access: "public",
    description: "Logos de parceiros, ícones de conquistas, assets do app",
    inputFormat: "SVG/PNG/WebP",
    outputFormat: "WebP / SVG",
    compression: { quality: "Máxima", savings: "~85%", sizes: ["optimized"] },
    avgSize: { before: "500 KB", after: "30 KB" },
    policy: "Público. Cache agressivo. Imutável (versionado)",
    cdn: true, ttl: "365 dias",
    tables: ["partners.logo_url", "achievements.icon_url"],
  },
];

const compressionPipeline = [
  { step: 1, label: "Upload", desc: "Tutor faz upload do arquivo original pelo app", icon: "user", color: C.primary },
  { step: 2, label: "Edge Function", desc: "Supabase Edge Function intercepta o upload", icon: "zap", color: C.amber },
  { step: 3, label: "Detecção", desc: "Identifica tipo (imagem/vídeo/áudio/doc) e valida tamanho", icon: "shield", color: C.green },
  { step: 4, label: "Compressão", desc: "Sharp (img) · FFmpeg (vídeo/áudio) · pdf-lib (docs)", icon: "compress", color: C.coral },
  { step: 5, label: "Variantes", desc: "Gera thumb + medium + original (fotos) ou preview + standard (vídeo)", icon: "image", color: C.plum },
  { step: 6, label: "Storage", desc: "Salva todas as versões no bucket correto do Supabase", icon: "bucket", color: C.teal },
  { step: 7, label: "CDN", desc: "Assets públicos e fotos frequentes servidos via CDN com cache", icon: "cloud", color: C.sky },
  { step: 8, label: "URLs", desc: "Retorna URLs otimizadas para o app. Original em cold storage.", icon: "check", color: C.green },
];

const translationFlow = [
  { step: 1, label: "Tutor A envia mensagem", desc: "Mensagem em português: 'O Rex tomou a vacina V10 hoje!'", icon: "chat", color: C.primary, lang: "🇧🇷 PT-BR" },
  { step: 2, label: "Armazena original", desc: "Salva no banco com idioma original (pt-BR) e metadata", icon: "server", color: C.amber, lang: "original" },
  { step: 3, label: "Detecta idioma destino", desc: "Consulta user.language do Tutor B → 'en-US'", icon: "globe", color: C.teal, lang: "🇺🇸 EN-US" },
  { step: 4, label: "Claude API traduz", desc: "Tradução contextual pet-aware: preserva termos veterinários, nomes, doses", icon: "brain", color: C.plum, lang: "AI" },
  { step: 5, label: "Cache da tradução", desc: "Armazena versão traduzida para não reprocessar. Cache por par de idiomas.", icon: "cache", color: C.orange, lang: "cached" },
  { step: 6, label: "Entrega no dispositivo", desc: "Tutor B recebe: 'Rex got his V10 vaccine today!'", icon: "chat", color: C.green, lang: "🇺🇸 EN-US" },
];

const translatedContent = [
  { type: "Mensagens de chat", desc: "Chat direto, grupos de co-parentalidade, SOS", translated: true, color: C.green },
  { type: "Comentários no feed", desc: "Posts do diário, conquistas, memorial", translated: true, color: C.green },
  { type: "Alertas SOS", desc: "Pet perdido, emergências — para toda a comunidade", translated: true, color: C.green },
  { type: "Narrações IA do pet", desc: "Geradas já no idioma do tutor pelo RAG", translated: true, color: C.green, note: "Gerado, não traduzido" },
  { type: "Playdates e SafeSwap", desc: "Convites, propostas de troca, descrições", translated: true, color: C.green },
  { type: "Reviews de parceiros", desc: "Avaliações de veterinários, petshops", translated: true, color: C.green },
  { type: "Nomes de conquistas", desc: "Badges, emblemas, títulos de nível", translated: true, color: C.green },
  { type: "Insights da IA", desc: "Alertas preditivos, dicas, relatórios", translated: true, color: C.green, note: "Gerado no idioma" },
  { type: "Nomes de pets e pessoas", desc: "Rex, Luna, Ana, Maria — nunca traduzidos", translated: false, color: C.coral },
  { type: "Dados médicos", desc: "Doses, lotes, valores, medicamentos, raças", translated: false, color: C.coral },
  { type: "Endereços e telefones", desc: "Informações de contato literais", translated: false, color: C.coral },
  { type: "Cápsulas do tempo", desc: "Preserva autenticidade emocional do autor", translated: false, color: C.coral },
];

const dbChanges = [
  { table: "messages (NOVA)", desc: "Tabela de mensagens entre tutores com suporte a tradução", color: C.primary,
    cols: "id UUID PK · chat_id UUID FK→chats · sender_id UUID FK→users · pet_id UUID FK→pets · original_text TEXT · original_lang VARCHAR(5) · translations JSONB {en:'...', es:'...', fr:'...'} · media_urls JSONB · media_bucket VARCHAR(50) · message_type ENUM(text|image|audio|video|system) · created_at TIMESTAMPTZ" },
  { table: "chats (NOVA)", desc: "Conversas entre tutores (via pets)", color: C.primary,
    cols: "id UUID PK · type ENUM(direct|group|sos|coparenting|playdate|safeswap) · name VARCHAR(100) · pet_ids JSONB · participant_ids JSONB · created_at TIMESTAMPTZ · last_message_at TIMESTAMPTZ" },
  { table: "chat_participants (NOVA)", desc: "Participantes de cada conversa", color: C.primary,
    cols: "id UUID PK · chat_id UUID FK→chats · user_id UUID FK→users · role ENUM(owner|member) · muted BOOLEAN · last_read_at TIMESTAMPTZ" },
  { table: "translation_cache (NOVA)", desc: "Cache de traduções para evitar reprocessamento", color: C.plum,
    cols: "id UUID PK · source_hash VARCHAR(64) IDX · source_lang VARCHAR(5) · target_lang VARCHAR(5) · translated_text TEXT · context VARCHAR(20) · tokens_used INT · cached_at TIMESTAMPTZ · expires_at TIMESTAMPTZ" },
  { table: "media_files (NOVA)", desc: "Registro de todas as mídias com versões comprimidas", color: C.teal,
    cols: "id UUID PK · pet_id UUID FK→pets IDX · uploaded_by UUID FK→users · bucket_name VARCHAR(50) IDX · original_path TEXT · original_size_bytes BIGINT · compressed_paths JSONB {thumb:'...', medium:'...', original:'...'} · compressed_size_bytes BIGINT · format_input VARCHAR(10) · format_output VARCHAR(10) · compression_ratio DECIMAL(4,2) · width INT · height INT · duration_seconds INT · mime_type VARCHAR(50) · is_encrypted BOOLEAN · source_table VARCHAR(50) · source_id UUID · created_at TIMESTAMPTZ" },
];

const newFunctions = [
  { name: "fn_compress_media(file, bucket, options)", returns: "media_files", desc: "Edge Function: recebe upload, comprime com Sharp/FFmpeg, gera variantes, salva no bucket, retorna registro media_files", color: C.coral },
  { name: "fn_translate_message(text, source_lang, target_lang, context)", returns: "TEXT", desc: "Verifica cache → se miss, chama Claude API com contexto pet-aware → salva no cache → retorna tradução", color: C.plum },
  { name: "fn_get_translated_message(message_id, user_id)", returns: "TEXT", desc: "Retorna mensagem no idioma do usuário. Busca em translations JSONB ou gera sob demanda", color: C.primary },
  { name: "fn_cleanup_media_orphans()", returns: "VOID", desc: "CRON semanal: remove mídias não referenciadas por nenhuma tabela (limpeza de storage)", color: C.amber },
  { name: "fn_calculate_storage_usage(user_id)", returns: "JSONB", desc: "Calcula uso por bucket: {photos: 45MB, videos: 120MB, audio: 8MB, docs: 12MB, total: 185MB}", color: C.teal },
  { name: "fn_generate_media_variants(media_id)", returns: "VOID", desc: "Regenera variantes comprimidas caso algoritmo mude (re-compressão em batch)", color: C.orange },
];

const newTriggers = [
  { name: "trg_compress_on_upload", event: "AFTER INSERT ON media_files", desc: "Dispara compressão automática via Edge Function quando nova mídia é registrada", color: C.coral },
  { name: "trg_translate_on_message", event: "AFTER INSERT ON messages", desc: "Para cada participante com idioma diferente, dispara tradução assíncrona e popula translations JSONB", color: C.plum },
  { name: "trg_update_storage_quota", event: "AFTER INSERT/DELETE ON media_files", desc: "Atualiza contagem de storage usado por tutor no tutor_profiles", color: C.teal },
  { name: "trg_cdn_invalidate", event: "AFTER UPDATE ON media_files", desc: "Invalida cache CDN quando mídia é atualizada ou excluída", color: C.sky },
  { name: "trg_encrypt_capsule_media", event: "BEFORE INSERT ON media_files", desc: "Se source_table='time_capsules', aplica criptografia AES-256 antes de salvar", color: C.rose },
];

const newIndexes = [
  { name: "idx_media_pet_bucket", table: "media_files", cols: "pet_id, bucket_name, created_at DESC", type: "btree", note: "Galeria de mídias por pet e tipo" },
  { name: "idx_media_source", table: "media_files", cols: "source_table, source_id", type: "btree", note: "Busca mídia por tabela de origem" },
  { name: "idx_translation_cache_hash", table: "translation_cache", cols: "source_hash, source_lang, target_lang", type: "btree UNIQUE", note: "Lookup rápido de tradução em cache" },
  { name: "idx_messages_chat_time", table: "messages", cols: "chat_id, created_at DESC", type: "btree", note: "Timeline de mensagens por conversa" },
  { name: "idx_chat_participants_user", table: "chat_participants", cols: "user_id, last_read_at", type: "btree", note: "Chats do usuário com não-lidas" },
];

const storageQuotas = [
  { tier: "Free", photos: "500 MB", videos: "1 GB", audio: "200 MB", docs: "300 MB", total: "2 GB", color: C.textDim },
  { tier: "Plus", photos: "5 GB", videos: "10 GB", audio: "2 GB", docs: "3 GB", total: "20 GB", color: C.primary },
  { tier: "Premium", photos: "25 GB", videos: "50 GB", audio: "10 GB", docs: "15 GB", total: "100 GB", color: C.amber },
];

// ======================== MAIN APP ========================
export default function MediaTranslationArch() {
  const [activeTab, setActiveTab] = useState("buckets");
  const [expandedBucket, setExpandedBucket] = useState(null);
  const containerRef = useRef();

  const tabs = [
    { id: "buckets", label: "Buckets", count: buckets.length, color: C.teal },
    { id: "pipeline", label: "Pipeline", count: compressionPipeline.length, color: C.coral },
    { id: "translation", label: "Tradução", count: translationFlow.length, color: C.plum },
    { id: "schema", label: "Schema", count: dbChanges.length + newFunctions.length, color: C.primary },
    { id: "quotas", label: "Quotas", count: storageQuotas.length, color: C.amber },
  ];

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", padding: 20, background: `radial-gradient(ellipse at 30% 20%, #141E2C, ${C.bgCard} 60%, #06080C)`, fontFamily: font }}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div ref={containerRef} style={{ width: 440, maxHeight: 860, background: C.bg, borderRadius: 20, overflow: "auto", position: "relative", boxShadow: `0 20px 80px rgba(0,0,0,0.5), 0 0 0 1px ${C.border}` }}>

        {/* Header */}
        <div style={{ position: "sticky", top: 0, zIndex: 20, background: `linear-gradient(to bottom, ${C.bg}, ${C.bg}F8, ${C.bg}00)`, padding: "16px 18px 8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Ico type="bucket" size={18} color={C.teal} />
            <div>
              <h1 style={{ color: C.text, fontSize: 15, fontWeight: 700, margin: 0 }}>PetauLife+ · Mídia e Tradução</h1>
              <p style={{ color: C.textDim, fontSize: 10, margin: "2px 0 0" }}>Storage comprimido + comunicação multilíngue</p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 3 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                flex: 1, padding: "7px 4px", borderRadius: 8, cursor: "pointer",
                background: activeTab === t.id ? t.color + "18" : C.card,
                border: activeTab === t.id ? `1px solid ${t.color}28` : `1px solid ${C.border}`,
                color: activeTab === t.id ? t.color : C.textDim,
                fontSize: 9, fontWeight: 700,
              }}>{t.label}</button>
            ))}
          </div>
        </div>

        <div style={{ padding: "8px 18px 24px" }}>

          {/* ====== BUCKETS ====== */}
          {activeTab === "buckets" && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <Ico type="bucket" size={18} color={C.teal} />
                <h2 style={{ color: C.text, fontSize: 14, fontWeight: 700, margin: 0 }}>Supabase Storage Buckets ({buckets.length})</h2>
              </div>

              {buckets.map((b, i) => {
                const isExp = expandedBucket === b.name;
                return (
                  <div key={i} style={{ marginBottom: 8 }}>
                    <button onClick={() => setExpandedBucket(isExp ? null : b.name)} style={{
                      width: "100%", textAlign: "left", cursor: "pointer",
                      background: isExp ? b.color + "06" : C.card,
                      borderRadius: isExp ? "14px 14px 0 0" : 14, padding: "14px 16px",
                      border: `1px solid ${isExp ? b.color + "20" : C.border}`,
                      borderBottom: isExp ? `1px dashed ${C.border}` : undefined,
                      fontFamily: font,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 12, background: b.color + "12", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Ico type={b.icon} size={18} color={b.color} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ color: b.color, fontSize: 13, fontWeight: 700, fontFamily: fontMono }}>{b.name}</span>
                            <span style={{ background: b.access === "private" ? C.coral + "14" : C.green + "14", color: b.access === "private" ? C.coral : C.green, fontSize: 7, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>{b.access}</span>
                            {b.cdn && <span style={{ background: C.sky + "14", color: C.sky, fontSize: 7, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>CDN</span>}
                          </div>
                          <p style={{ color: C.textDim, fontSize: 10, margin: "3px 0 0" }}>{b.description}</p>
                        </div>
                      </div>

                      {/* Compression stats */}
                      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                        <span style={{ background: C.coral + "10", color: C.coral, fontSize: 8, fontWeight: 700, padding: "3px 8px", borderRadius: 6 }}>
                          {b.avgSize.before} → {b.avgSize.after}
                        </span>
                        <span style={{ background: C.green + "10", color: C.green, fontSize: 8, fontWeight: 700, padding: "3px 8px", borderRadius: 6 }}>
                          -{b.compression.savings}
                        </span>
                        <span style={{ background: b.color + "10", color: b.color, fontSize: 8, fontWeight: 700, padding: "3px 8px", borderRadius: 6 }}>
                          → {b.outputFormat}
                        </span>
                      </div>
                    </button>

                    {isExp && (
                      <div style={{ background: C.bgCard, borderRadius: "0 0 14px 14px", border: `1px solid ${b.color}12`, borderTop: "none", padding: "14px 16px" }}>
                        {[
                          { label: "Input", value: b.inputFormat },
                          { label: "Output", value: b.outputFormat },
                          { label: "Qualidade", value: b.compression.quality },
                          { label: "Variantes", value: b.compression.sizes.join(" · ") },
                          { label: "Política RLS", value: b.policy },
                          { label: "Tabelas vinculadas", value: b.tables.join(" · ") },
                          ...(b.cdn ? [{ label: "CDN Cache TTL", value: b.ttl }] : []),
                          ...(b.extra ? [{ label: "Extra", value: b.extra }] : []),
                        ].map((d, j) => (
                          <div key={j} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
                            <span style={{ color: C.textDim, fontSize: 9, fontWeight: 700, width: 65, flexShrink: 0, letterSpacing: 0.3 }}>{d.label}</span>
                            <span style={{ color: C.textSec, fontSize: 10, lineHeight: 1.4, fontFamily: d.label === "Tabelas vinculadas" ? fontMono : font }}>{d.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {/* ====== PIPELINE ====== */}
          {activeTab === "pipeline" && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <Ico type="compress" size={18} color={C.coral} />
                <h2 style={{ color: C.text, fontSize: 14, fontWeight: 700, margin: 0 }}>Pipeline de Compressão</h2>
              </div>

              <div style={{ position: "relative", paddingLeft: 28 }}>
                <div style={{ position: "absolute", left: 10, top: 12, bottom: 12, width: 2, background: `linear-gradient(to bottom, ${C.coral}30, ${C.green}30)` }} />

                {compressionPipeline.map((s, i) => (
                  <div key={i} style={{ position: "relative", marginBottom: 14 }}>
                    <div style={{
                      position: "absolute", left: -22, top: 4,
                      width: 22, height: 22, borderRadius: 7,
                      background: s.color + "15", border: `2px solid ${s.color}30`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: s.color, fontSize: 9, fontWeight: 800, fontFamily: fontMono,
                    }}>{s.step}</div>
                    <div style={{ background: C.card, borderRadius: 14, padding: "12px 16px", border: `1px solid ${C.border}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <Ico type={s.icon} size={14} color={s.color} />
                        <span style={{ color: s.color, fontSize: 12, fontWeight: 700 }}>{s.label}</span>
                      </div>
                      <p style={{ color: C.textSec, fontSize: 11, lineHeight: 1.5, margin: 0 }}>{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tech Stack */}
              <div style={{ background: C.card, borderRadius: 14, padding: 16, marginTop: 8, border: `1px solid ${C.border}` }}>
                <p style={{ color: C.textDim, fontSize: 9, fontWeight: 700, letterSpacing: 1, margin: "0 0 10px" }}>STACK DE COMPRESSÃO</p>
                {[
                  { tool: "Sharp", use: "Imagens: resize, WebP, qualidade, thumbnails", color: C.green },
                  { tool: "FFmpeg", use: "Vídeo: H.264, bitrate adaptativo, thumbnails", color: C.sky },
                  { tool: "FFmpeg", use: "Áudio: AAC, mono 64kbps, waveform data", color: C.rose },
                  { tool: "pdf-lib", use: "PDFs: compressão, otimização de fontes", color: C.amber },
                  { tool: "Supabase Edge", use: "Runtime: Deno, executa compressão server-side", color: C.teal },
                ].map((t, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ color: t.color, fontSize: 10, fontWeight: 800, fontFamily: fontMono, width: 60, flexShrink: 0 }}>{t.tool}</span>
                    <span style={{ color: C.textSec, fontSize: 10 }}>{t.use}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ====== TRANSLATION ====== */}
          {activeTab === "translation" && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <Ico type="globe" size={18} color={C.plum} />
                <h2 style={{ color: C.text, fontSize: 14, fontWeight: 700, margin: 0 }}>Sistema de Tradução Automática</h2>
              </div>

              {/* Flow */}
              <div style={{ position: "relative", paddingLeft: 28, marginBottom: 18 }}>
                <div style={{ position: "absolute", left: 10, top: 12, bottom: 12, width: 2, background: `linear-gradient(to bottom, ${C.primary}30, ${C.green}30)` }} />
                {translationFlow.map((s, i) => (
                  <div key={i} style={{ position: "relative", marginBottom: 12 }}>
                    <div style={{
                      position: "absolute", left: -22, top: 4,
                      width: 22, height: 22, borderRadius: 7,
                      background: s.color + "15", border: `2px solid ${s.color}30`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: s.color, fontSize: 9, fontWeight: 800, fontFamily: fontMono,
                    }}>{s.step}</div>
                    <div style={{ background: C.card, borderRadius: 14, padding: "12px 16px", border: `1px solid ${C.border}` }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Ico type={s.icon} size={14} color={s.color} />
                          <span style={{ color: s.color, fontSize: 11, fontWeight: 700 }}>{s.label}</span>
                        </div>
                        <span style={{ background: s.color + "12", color: s.color, fontSize: 8, fontWeight: 700, padding: "2px 8px", borderRadius: 6 }}>{s.lang}</span>
                      </div>
                      <p style={{ color: C.textSec, fontSize: 10, lineHeight: 1.5, margin: 0 }}>{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* What gets translated */}
              <p style={{ color: C.textDim, fontSize: 9, fontWeight: 700, letterSpacing: 1, margin: "0 0 10px" }}>O QUE É TRADUZIDO (E O QUE NÃO É)</p>
              {translatedContent.map((tc, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
                  borderBottom: i < translatedContent.length - 1 ? `1px solid ${C.border}` : "none",
                }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                    background: tc.translated ? C.green + "12" : C.coral + "12",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {tc.translated ? <Ico type="check" size={10} color={C.green} /> : <span style={{ color: C.coral, fontSize: 10 }}>✕</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: C.text, fontSize: 11, fontWeight: 600 }}>{tc.type}</span>
                    <p style={{ color: C.textDim, fontSize: 9, margin: "1px 0 0" }}>{tc.desc}</p>
                  </div>
                  {tc.note && <span style={{ color: C.plum, fontSize: 7, fontWeight: 700, fontStyle: "italic" }}>{tc.note}</span>}
                </div>
              ))}

              {/* Claude advantage */}
              <div style={{ background: C.plum + "08", borderRadius: 14, padding: 14, marginTop: 14, border: `1px solid ${C.plum}12` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <Ico type="brain" size={14} color={C.plum} />
                  <span style={{ color: C.plum, fontSize: 10, fontWeight: 700 }}>POR QUE CLAUDE E NÃO GOOGLE TRANSLATE</span>
                </div>
                {[
                  "Entende contexto pet: 'V10' não é traduzida, é nome de vacina",
                  "Mantém termos veterinários universais (Simparic, Drontal...)",
                  "Tom emocional preservado: mensagens de luto, celebração, cuidado",
                  "Nomes de raças mantidos no idioma original quando é padrão (Labrador Retriever)",
                  "Unidades adaptadas: kg→lb se tutor usa imperial system",
                ].map((t, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 4 }}>
                    <span style={{ color: C.plum, fontSize: 9, marginTop: 2 }}>•</span>
                    <span style={{ color: C.textSec, fontSize: 10, lineHeight: 1.4 }}>{t}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ====== SCHEMA CHANGES ====== */}
          {activeTab === "schema" && (
            <>
              <p style={{ color: C.primary, fontSize: 10, fontWeight: 700, letterSpacing: 1, margin: "0 0 12px" }}>NOVAS TABELAS ({dbChanges.length})</p>
              {dbChanges.map((t, i) => (
                <div key={i} style={{ background: C.card, borderRadius: 12, padding: "12px 14px", marginBottom: 8, border: `1px solid ${C.border}`, borderLeft: `3px solid ${t.color}` }}>
                  <p style={{ color: t.color, fontSize: 11, fontWeight: 700, margin: "0 0 3px", fontFamily: fontMono }}>{t.table}</p>
                  <p style={{ color: C.textSec, fontSize: 10, margin: "0 0 6px" }}>{t.desc}</p>
                  <p style={{ color: C.textDim, fontSize: 8, margin: 0, fontFamily: fontMono, lineHeight: 1.6, wordBreak: "break-all" }}>{t.cols}</p>
                </div>
              ))}

              <p style={{ color: C.plum, fontSize: 10, fontWeight: 700, letterSpacing: 1, margin: "16px 0 12px" }}>NOVAS FUNCTIONS ({newFunctions.length})</p>
              {newFunctions.map((fn, i) => (
                <div key={i} style={{ background: C.card, borderRadius: 12, padding: "12px 14px", marginBottom: 8, border: `1px solid ${C.border}`, borderLeft: `3px solid ${fn.color}` }}>
                  <p style={{ color: fn.color, fontSize: 10, fontWeight: 700, margin: "0 0 2px", fontFamily: fontMono }}>{fn.name}</p>
                  <span style={{ background: fn.color + "12", color: fn.color, fontSize: 7, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>→ {fn.returns}</span>
                  <p style={{ color: C.textSec, fontSize: 10, margin: "6px 0 0", lineHeight: 1.4 }}>{fn.desc}</p>
                </div>
              ))}

              <p style={{ color: C.coral, fontSize: 10, fontWeight: 700, letterSpacing: 1, margin: "16px 0 12px" }}>NOVOS TRIGGERS ({newTriggers.length})</p>
              {newTriggers.map((tr, i) => (
                <div key={i} style={{ background: C.card, borderRadius: 12, padding: "12px 14px", marginBottom: 8, border: `1px solid ${C.border}`, borderLeft: `3px solid ${tr.color}` }}>
                  <p style={{ color: tr.color, fontSize: 10, fontWeight: 700, margin: "0 0 2px", fontFamily: fontMono }}>{tr.name}</p>
                  <span style={{ background: tr.color + "12", color: tr.color, fontSize: 7, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>{tr.event}</span>
                  <p style={{ color: C.textSec, fontSize: 10, margin: "6px 0 0", lineHeight: 1.4 }}>{tr.desc}</p>
                </div>
              ))}

              <p style={{ color: C.teal, fontSize: 10, fontWeight: 700, letterSpacing: 1, margin: "16px 0 12px" }}>NOVOS INDEXES ({newIndexes.length})</p>
              {newIndexes.map((idx, i) => (
                <div key={i} style={{ background: C.card, borderRadius: 12, padding: "12px 14px", marginBottom: 8, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.teal}` }}>
                  <p style={{ color: C.teal, fontSize: 10, fontWeight: 700, margin: "0 0 4px", fontFamily: fontMono }}>{idx.name}</p>
                  <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                    <span style={{ background: C.teal + "12", color: C.teal, fontSize: 7, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>{idx.type}</span>
                    <span style={{ background: C.amber + "12", color: C.amber, fontSize: 7, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>{idx.table}</span>
                  </div>
                  <p style={{ color: C.textDim, fontSize: 9, margin: "0 0 2px", fontFamily: fontMono }}>ON ({idx.cols})</p>
                  <p style={{ color: C.textSec, fontSize: 10, margin: "2px 0 0" }}>{idx.note}</p>
                </div>
              ))}
            </>
          )}

          {/* ====== QUOTAS ====== */}
          {activeTab === "quotas" && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <Ico type="server" size={18} color={C.amber} />
                <h2 style={{ color: C.text, fontSize: 14, fontWeight: 700, margin: 0 }}>Quotas de Storage por Plano</h2>
              </div>

              {storageQuotas.map((q, i) => (
                <div key={i} style={{
                  background: C.card, borderRadius: 16, padding: 16, marginBottom: 10,
                  border: `1px solid ${q.color}15`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <span style={{ color: q.color, fontSize: 16, fontWeight: 800 }}>{q.tier}</span>
                    <span style={{ color: q.color, fontSize: 14, fontWeight: 800, fontFamily: fontMono }}>{q.total}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[
                      { label: "Fotos", value: q.photos, color: C.green },
                      { label: "Vídeos", value: q.videos, color: C.sky },
                      { label: "Áudio", value: q.audio, color: C.rose },
                      { label: "Docs", value: q.docs, color: C.amber },
                    ].map((s, j) => (
                      <div key={j} style={{ flex: 1, background: s.color + "08", borderRadius: 8, padding: "8px 4px", textAlign: "center" }}>
                        <p style={{ color: s.color, fontSize: 11, fontWeight: 700, margin: 0, fontFamily: fontMono }}>{s.value}</p>
                        <p style={{ color: C.textDim, fontSize: 7, margin: "2px 0 0" }}>{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div style={{ background: C.green + "08", borderRadius: 14, padding: 14, border: `1px solid ${C.green}12` }}>
                <p style={{ color: C.green, fontSize: 10, fontWeight: 700, letterSpacing: 0.5, margin: "0 0 6px" }}>IMPACTO DA COMPRESSÃO</p>
                <p style={{ color: C.textSec, fontSize: 11, lineHeight: 1.6, margin: 0 }}>
                  Com compressão ativa, um tutor no plano <b>Free (2 GB)</b> pode armazenar em média:
                  <b> ~1.400 fotos</b> (WebP medium) + <b>~25 vídeos</b> de 3min (720p) + <b>~300 áudios</b> de 1min + <b>~150 documentos</b> OCR.
                  Isso equivale a <b>~2 anos de uso intenso</b> sem precisar de upgrade.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <p style={{ color: C.textGhost, fontSize: 8, textAlign: "center", padding: "0 18px 16px", fontFamily: fontMono }}>
          PetauLife+ · 6 buckets · WebP+H.264+AAC · Claude Translation · {dbChanges.length} novas tabelas · {newFunctions.length} functions · {newTriggers.length} triggers
        </p>

        <style>{`::-webkit-scrollbar{width:0;height:0}`}</style>
      </div>
    </div>
  );
}
