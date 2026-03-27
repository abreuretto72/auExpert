import { useState, useRef } from "react";

// ======================== DESIGN TOKENS ========================
const C = {
  bg: "#F4F1EB", bgDeep: "#E8E3D8", cream: "#FFFDF6", warm: "#F8F4EC",
  card: "#FFFFFF", cardAlt: "#FDFAF3",
  sky: "#3B8ECF", skySoft: "#3B8ECF08", skyMed: "#3B8ECF15", skyGlow: "#3B8ECF22",
  ocean: "#2A7DB8", oceanDeep: "#1C5F8F",
  sand: "#D4A855", sandSoft: "#D4A85508", sandWarm: "#D4A85520",
  forest: "#4A8F5E", forestSoft: "#4A8F5E08",
  coral: "#E07254", coralSoft: "#E0725408",
  plum: "#8565B0", plumSoft: "#8565B008",
  rose: "#CF6882", roseSoft: "#CF688208",
  mint: "#3AAEA0", mintSoft: "#3AAEA008",
  ink: "#1E2A1A", inkSec: "#4A5842", inkDim: "#8B9A82", inkGhost: "#BCC8B6",
  border: "#DDD8CC", borderLight: "#E6E1D6",
  shadow: "0 3px 22px rgba(30,42,26,0.06)",
  shadowMd: "0 6px 32px rgba(30,42,26,0.09)",
};
const font = "'Fraunces', 'Georgia', serif";
const fontSans = "'Nunito', -apple-system, sans-serif";
const fontMono = "'JetBrains Mono', monospace";

// ======================== ICONS ========================
const Ico = ({ type, size = 20, color = C.inkDim }) => {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" };
  const icons = {
    back: <svg {...p}><polyline points="15,18 9,12 15,6"/></svg>,
    map: <svg {...p}><polygon points="1,6 1,22 8,18 16,22 23,18 23,2 16,6 8,2"/></svg>,
    mapPin: <svg {...p}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
    compass: <svg {...p}><circle cx="12" cy="12" r="10"/><polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88" fill={color} stroke="none"/></svg>,
    plane: <svg {...p}><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3.5 20.5 3 18.5 3.5 17 5L13.5 8.5 5 6.7l-1.3 1.3 5.3 3.2-2.5 2.5-2.2-.8-1 1 2.8 1.5 1.5 2.8 1-1-.8-2.2 2.5-2.5 3.2 5.3z"/></svg>,
    car: <svg {...p}><path d="M5 17h14M5 17a2 2 0 01-2-2V9a2 2 0 012-2h1l2-3h8l2 3h1a2 2 0 012 2v6a2 2 0 01-2 2"/><circle cx="7.5" cy="17" r="2"/><circle cx="16.5" cy="17" r="2"/></svg>,
    camera: <svg {...p}><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>,
    heart: <svg {...p}><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
    heartFill: <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
    check: <svg {...p} strokeWidth="2.5"><polyline points="20,6 9,17 4,12"/></svg>,
    plus: <svg {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    x: <svg {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    calendar: <svg {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    clock: <svg {...p}><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>,
    star: <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>,
    shield: <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    alert: <svg {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
    sun: <svg {...p}><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>,
    moon: <svg {...p}><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>,
    paw: <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><ellipse cx="12" cy="17" rx="4.5" ry="4"/><circle cx="7" cy="10.5" r="2.2"/><circle cx="17" cy="10.5" r="2.2"/><circle cx="9.5" cy="6.5" r="1.8"/><circle cx="14.5" cy="6.5" r="1.8"/></svg>,
    share: <svg {...p}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
    sparkle: <svg {...p} strokeWidth="1.5"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/></svg>,
    file: <svg {...p}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>,
    bed: <svg {...p}><path d="M2 17V7h20v10"/><path d="M2 12h20"/><path d="M6 12V8"/><rect x="6" y="8" width="4" height="4" rx="1"/></svg>,
    utensils: <svg {...p}><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3"/><path d="M18 15v7"/></svg>,
    tree: <svg {...p}><path d="M12 22v-8"/><path d="M5 12l7-10 7 10"/><path d="M3 17l9-7 9 7"/></svg>,
    wave: <svg {...p}><path d="M2 12c1.5-3 4-5 6-5s3.5 2 5 2 3.5-2 5-2 4.5 2 6 5"/></svg>,
    mountain: <svg {...p}><path d="M8 21l4.5-9 3.5 4 4-8"/><path d="M2 21h20"/></svg>,
    tent: <svg {...p}><path d="M3.5 21L12 3l8.5 18"/><path d="M12 3v18"/><path d="M9.5 21l2.5-6 2.5 6"/></svg>,
    edit: <svg {...p}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  };
  return icons[type] || null;
};

// ======================== DATA ========================
const trips = [
  {
    id: "t1", status: "completed", title: "Campos do Jordão",
    subtitle: "Serra da Mantiqueira, SP",
    dates: "12-15 Fev 2026", days: 4, distance: "180 km",
    emoji: "🏔️", cover: `linear-gradient(145deg, #6B9E7A, #4A7D5C)`,
    mood: "ecstatic", moodEmoji: "🤩", score: 95,
    highlights: ["Primeira neve do Rex!", "Trilha no Horto Florestal", "Hotel pet-friendly Quinta das Flores"],
    photos: 47, entries: 8,
    aiMemory: "Rex viu neve pela primeira vez e ficou absolutamente maluco. Correu em círculos, tentou comer a neve e fez o meu humano rir por 20 minutos. Na trilha, encontrou um esquilo e ficou em posição de estátua por 3 minutos. Melhor viagem da minha vida! ❄️",
    petFriendly: { hotel: true, restaurant: true, trails: true, transport: true },
    checklist: { vaccine: true, antiparasitic: true, food: true, water: true, docs: true, toys: true, meds: true, bed: true },
  },
  {
    id: "t2", status: "completed", title: "Praia de Maresias",
    subtitle: "São Sebastião, SP",
    dates: "20-22 Dez 2025", days: 3, distance: "210 km",
    emoji: "🏖️", cover: `linear-gradient(145deg, #3B8ECF, #2A7DB8)`,
    mood: "happy", moodEmoji: "😊", score: 82,
    highlights: ["Praia pet-friendly", "Rex nadou pela primeira vez", "Pousada Mar & Patas"],
    photos: 35, entries: 6,
    aiMemory: "O mar é ENORME. Eu entrei com medo, depois com curiosidade, depois com ALEGRIA. A água é salgada — isso é estranho mas aceito. Cavei 4 buracos na areia e o meu humano ficou orgulhoso de todos. 🌊",
    petFriendly: { hotel: true, restaurant: true, trails: false, transport: true },
  },
  {
    id: "t3", status: "active", title: "Fazenda Santa Rita",
    subtitle: "Itu, SP",
    dates: "25-28 Mar 2026", days: 4, distance: "45 km",
    emoji: "🌾", cover: `linear-gradient(145deg, #C49A38, #A88230)`,
    mood: "happy", moodEmoji: "😊", score: null,
    highlights: ["Espaço pet enorme", "Lago para banho", "Trilha na mata"],
    photos: 12, entries: 2,
    aiMemory: null,
    petFriendly: { hotel: true, restaurant: true, trails: true, transport: true },
    daysLeft: 2,
  },
  {
    id: "t4", status: "planned", title: "Serra Gaúcha",
    subtitle: "Gramado e Canela, RS",
    dates: "15-20 Jul 2026", days: 6, distance: "920 km",
    emoji: "🍷", cover: `linear-gradient(145deg, #8565B0, #6A4E90)`,
    mood: null, moodEmoji: null, score: null,
    highlights: ["Hotéis pet-friendly pesquisados", "Vinícolas com área pet", "Parque do Caracol"],
    photos: 0, entries: 0,
    aiMemory: null,
    petFriendly: { hotel: true, restaurant: true, trails: true, transport: true },
    daysUntil: 111,
  },
];

const petFriendlyNearby = [
  { name: "Parque da Cidade", type: "Parque", dist: "2 km", rating: 4.8, emoji: "🌳", features: ["Área cercada", "Bebedouro", "Sombra"], color: C.forest },
  { name: "Café com Patas", type: "Restaurante", dist: "800m", rating: 4.6, emoji: "☕", features: ["Menu pet", "Água", "Petiscos"], color: C.sand },
  { name: "Hotel Fazenda Pets", type: "Hospedagem", dist: "12 km", rating: 4.9, emoji: "🏡", features: ["Piscina pet", "Trilhas", "Área livre"], color: C.sky },
  { name: "Pet Beach Maresias", type: "Praia", dist: "210 km", rating: 4.5, emoji: "🏖️", features: ["Areia pet", "Chuveiro", "Sombra"], color: C.ocean },
];

const checklistTemplate = [
  { cat: "Saúde", icon: "shield", color: C.coral, items: [
    { label: "Vacinas em dia", key: "vac" },
    { label: "Antiparasitário aplicado", key: "anti" },
    { label: "Atestado de saúde para viagem", key: "attest" },
    { label: "Carteirinha digital atualizada", key: "card" },
    { label: "Remédios (se aplicável)", key: "meds" },
  ]},
  { cat: "Alimentação", icon: "utensils", color: C.sand, items: [
    { label: "Ração suficiente para os dias", key: "food" },
    { label: "Potes de água e comida", key: "bowls" },
    { label: "Petiscos para a viagem", key: "treats" },
    { label: "Água potável", key: "water" },
  ]},
  { cat: "Conforto", icon: "bed", color: C.plum, items: [
    { label: "Caminha / manta do pet", key: "bed" },
    { label: "Brinquedos favoritos", key: "toys" },
    { label: "Bolinha amarela (essencial!)", key: "ball" },
    { label: "Guia e coleira", key: "leash" },
    { label: "Caixa de transporte", key: "crate" },
  ]},
  { cat: "Documentos", icon: "file", color: C.sky, items: [
    { label: "QR Code da carteirinha", key: "qr" },
    { label: "Contato do vet no celular", key: "vet" },
    { label: "Endereço do vet mais próximo no destino", key: "vetDest" },
    { label: "Seguro viagem pet (se tiver)", key: "insurance" },
  ]},
];

// ======================== TRIP CARD ========================
const TripCard = ({ trip: t, onClick }) => {
  const isActive = t.status === "active";
  const isPlanned = t.status === "planned";
  return (
    <button onClick={() => onClick(t)} style={{
      width: "100%", textAlign: "left", cursor: "pointer",
      background: C.card, borderRadius: 24, overflow: "hidden",
      border: isActive ? `2px solid ${C.forest}30` : `1px solid ${C.border}`,
      fontFamily: fontSans, boxShadow: isActive ? C.shadowMd : C.shadow,
      marginBottom: 14, transition: "all 0.2s",
    }}>
      {/* Cover */}
      <div style={{
        height: 90, background: t.cover, position: "relative",
        display: "flex", alignItems: "flex-end", padding: "0 18px 12px",
      }}>
        {isActive && (
          <div style={{
            position: "absolute", top: 12, right: 12,
            background: "rgba(255,255,255,0.2)", backdropFilter: "blur(6px)",
            borderRadius: 10, padding: "4px 12px", display: "flex", alignItems: "center", gap: 5,
          }}>
            <div style={{ width: 7, height: 7, borderRadius: 4, background: "#4DD4A0", animation: "blink 1.5s ease infinite" }} />
            <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>Em andamento</span>
          </div>
        )}
        {isPlanned && (
          <div style={{
            position: "absolute", top: 12, right: 12,
            background: "rgba(255,255,255,0.2)", backdropFilter: "blur(6px)",
            borderRadius: 10, padding: "4px 12px",
          }}>
            <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>{t.daysUntil} dias</span>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 30 }}>{t.emoji}</span>
          <div>
            <p style={{ color: "#fff", fontSize: 17, fontWeight: 700, margin: 0, textShadow: "0 1px 4px rgba(0,0,0,0.3)" }}>{t.title}</p>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, margin: "2px 0 0" }}>{t.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: "14px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Ico type="calendar" size={13} color={C.inkDim} />
            <span style={{ color: C.inkSec, fontSize: 12, fontWeight: 600 }}>{t.dates}</span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <span style={{ background: C.bgDeep, color: C.inkDim, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 8 }}>{t.days} dias</span>
            <span style={{ background: C.bgDeep, color: C.inkDim, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 8 }}>{t.distance}</span>
          </div>
        </div>

        {/* Pet friendly badges */}
        <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
          {t.petFriendly.hotel && <span style={{ background: C.forestSoft, color: C.forest, fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 8 }}>🏨 Hotel</span>}
          {t.petFriendly.restaurant && <span style={{ background: C.sandSoft, color: C.sand, fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 8 }}>🍽️ Rest.</span>}
          {t.petFriendly.trails && <span style={{ background: C.forestSoft, color: C.forest, fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 8 }}>🥾 Trilhas</span>}
          {t.petFriendly.transport && <span style={{ background: C.skySoft, color: C.sky, fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 8 }}>🚗 Transp.</span>}
        </div>

        {/* Score / Photos */}
        {t.status === "completed" && (
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 16 }}>{t.moodEmoji}</span>
              <span style={{ color: C.forest, fontSize: 13, fontWeight: 800, fontFamily: fontMono }}>{t.score}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Ico type="camera" size={13} color={C.inkDim} />
              <span style={{ color: C.inkDim, fontSize: 11 }}>{t.photos}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Ico type="edit" size={13} color={C.inkDim} />
              <span style={{ color: C.inkDim, fontSize: 11 }}>{t.entries} registros</span>
            </div>
          </div>
        )}

        {isActive && (
          <div style={{
            background: C.forest + "08", borderRadius: 12, padding: "10px 14px",
            border: `1px solid ${C.forest}12`, display: "flex", alignItems: "center", gap: 8,
          }}>
            <Ico type="sparkle" size={14} color={C.forest} />
            <span style={{ color: C.forest, fontSize: 12, fontWeight: 600 }}>Dia {t.days - t.daysLeft + 1} de {t.days} · {t.photos} fotos registradas</span>
          </div>
        )}
      </div>
    </button>
  );
};

// ======================== TRIP DETAIL MODAL ========================
const TripDetail = ({ trip: t, onClose }) => {
  const [tab, setTab] = useState("resumo");
  const [checks, setChecks] = useState({});

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 50, background: "rgba(30,42,26,0.45)", backdropFilter: "blur(10px)", display: "flex", alignItems: "flex-end" }}>
      <div style={{ background: C.bg, borderRadius: "32px 32px 0 0", width: "100%", maxHeight: "90%", overflow: "auto", padding: "0 0 30px" }}>
        {/* Cover */}
        <div style={{
          height: 140, background: t.cover, position: "relative",
          borderRadius: "32px 32px 0 0", overflow: "hidden",
          display: "flex", alignItems: "flex-end", padding: "0 22px 18px",
        }}>
          <button onClick={onClose} style={{
            position: "absolute", top: 16, right: 16,
            background: "rgba(255,255,255,0.2)", backdropFilter: "blur(6px)",
            border: "none", borderRadius: 12, width: 36, height: 36, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Ico type="x" size={18} color="#fff" />
          </button>
          <div>
            <span style={{ fontSize: 36 }}>{t.emoji}</span>
            <h2 style={{ color: "#fff", fontSize: 24, fontWeight: 700, margin: "6px 0 2px", fontFamily: font, textShadow: "0 2px 6px rgba(0,0,0,0.3)" }}>{t.title}</h2>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, margin: 0 }}>{t.subtitle} · {t.dates}</p>
          </div>
        </div>

        {/* Inner tabs */}
        <div style={{ display: "flex", gap: 5, padding: "16px 22px 0", overflow: "auto" }}>
          {[
            { id: "resumo", label: "Resumo" },
            { id: "checklist", label: "Checklist" },
            ...(t.status !== "planned" ? [{ id: "memorias", label: "Memórias" }] : []),
            { id: "locais", label: "Locais" },
          ].map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id)} style={{
              padding: "7px 14px", borderRadius: 10, cursor: "pointer",
              background: tab === tb.id ? C.sky : C.card,
              border: tab === tb.id ? "none" : `1px solid ${C.border}`,
              color: tab === tb.id ? "#fff" : C.inkDim,
              fontSize: 11, fontWeight: 700, fontFamily: fontSans,
            }}>{tb.label}</button>
          ))}
        </div>

        <div style={{ padding: "14px 22px" }}>
          {tab === "resumo" && (
            <>
              {/* Stats */}
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                {[
                  { label: "Dias", value: t.days, emoji: "📅" },
                  { label: "Distância", value: t.distance, emoji: "🚗" },
                  { label: "Fotos", value: t.photos, emoji: "📸" },
                  { label: "Diário", value: t.entries, emoji: "📖" },
                ].map((s, i) => (
                  <div key={i} style={{
                    flex: 1, background: C.card, borderRadius: 16, padding: "12px 8px",
                    border: `1px solid ${C.border}`, textAlign: "center",
                  }}>
                    <span style={{ fontSize: 18 }}>{s.emoji}</span>
                    <p style={{ color: C.ink, fontSize: 14, fontWeight: 800, margin: "4px 0 0", fontFamily: fontSans }}>{s.value}</p>
                    <p style={{ color: C.inkDim, fontSize: 9, margin: "2px 0 0" }}>{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Highlights */}
              <p style={{ color: C.inkDim, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, margin: "0 0 10px", fontFamily: fontSans }}>DESTAQUES</p>
              {t.highlights.map((h, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 10, marginBottom: 8,
                  background: C.card, borderRadius: 14, padding: "10px 14px",
                  border: `1px solid ${C.border}`,
                }}>
                  <Ico type="star" size={14} color={C.sand} />
                  <span style={{ color: C.ink, fontSize: 13, fontWeight: 600, fontFamily: fontSans }}>{h}</span>
                </div>
              ))}

              {/* Score */}
              {t.score && (
                <div style={{
                  marginTop: 14, background: C.forest + "08", borderRadius: 18, padding: "16px 18px",
                  border: `1px solid ${C.forest}12`, display: "flex", alignItems: "center", gap: 14,
                }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 16, background: C.forest + "15",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <span style={{ color: C.forest, fontSize: 20, fontWeight: 800, fontFamily: fontMono }}>{t.score}</span>
                  </div>
                  <div>
                    <p style={{ color: C.forest, fontSize: 14, fontWeight: 700, margin: 0, fontFamily: fontSans }}>Score de Felicidade na Viagem</p>
                    <p style={{ color: C.inkDim, fontSize: 12, margin: "3px 0 0" }}>{t.moodEmoji} Humor predominante durante a viagem</p>
                  </div>
                </div>
              )}

              {/* AI Memory */}
              {t.aiMemory && (
                <div style={{
                  marginTop: 16, padding: "18px 20px",
                  background: `linear-gradient(145deg, ${C.sand}06, ${C.cream})`,
                  borderRadius: 20, border: `1px solid ${C.sand}10`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <Ico type="paw" size={15} color={C.sand} />
                    <span style={{ color: C.sand, fontSize: 12, fontWeight: 700, fontFamily: fontSans }}>Rex narra a viagem</span>
                  </div>
                  <p style={{ color: C.inkSec, fontSize: 15, lineHeight: 1.9, margin: 0, fontFamily: "'Caveat', cursive", fontStyle: "italic" }}>
                    "{t.aiMemory}"
                  </p>
                </div>
              )}
            </>
          )}

          {tab === "checklist" && (
            <>
              <p style={{ color: C.inkDim, fontSize: 12, margin: "0 0 16px", lineHeight: 1.6, fontFamily: fontSans }}>
                Tudo o que o Rex precisa para uma viagem segura e feliz
              </p>
              {checklistTemplate.map((cat, ci) => (
                <div key={ci} style={{ marginBottom: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <Ico type={cat.icon} size={15} color={cat.color} />
                    <span style={{ color: C.inkDim, fontSize: 11, fontWeight: 700, letterSpacing: 1, fontFamily: fontSans }}>{cat.cat.toUpperCase()}</span>
                  </div>
                  {cat.items.map((item, ii) => (
                    <button key={ii} onClick={() => setChecks(s => ({ ...s, [item.key]: !s[item.key] }))}
                      style={{
                        display: "flex", alignItems: "center", gap: 12, width: "100%",
                        background: checks[item.key] ? C.forest + "06" : C.card,
                        borderRadius: 14, padding: "12px 14px", marginBottom: 6,
                        border: `1px solid ${checks[item.key] ? C.forest + "20" : C.border}`,
                        cursor: "pointer", fontFamily: fontSans, textAlign: "left",
                      }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: 7, flexShrink: 0,
                        background: checks[item.key] ? C.forest : C.bgDeep,
                        border: checks[item.key] ? "none" : `2px solid ${C.border}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {checks[item.key] && <Ico type="check" size={14} color="#fff" />}
                      </div>
                      <span style={{
                        color: checks[item.key] ? C.inkDim : C.ink, fontSize: 13, fontWeight: 600,
                        textDecoration: checks[item.key] ? "line-through" : "none",
                      }}>{item.label}</span>
                    </button>
                  ))}
                </div>
              ))}
            </>
          )}

          {tab === "memorias" && (
            <>
              {/* Photo grid mock */}
              <p style={{ color: C.inkDim, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, margin: "0 0 12px", fontFamily: fontSans }}>
                GALERIA ({t.photos} fotos)
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 18 }}>
                {Array.from({ length: Math.min(9, t.photos) }).map((_, i) => {
                  const hues = [142, 200, 35, 280, 15, 180, 90, 320, 50];
                  return (
                    <div key={i} style={{
                      aspectRatio: "1", borderRadius: 14,
                      background: `linear-gradient(${135 + i * 20}deg, hsl(${hues[i]}, 40%, 70%), hsl(${hues[i]}, 50%, 55%))`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 24, position: "relative",
                    }}>
                      {["🐕", "🏔️", "❄️", "🌲", "😊", "🐾", "🌅", "🏖️", "🎉"][i]}
                      {i === 8 && t.photos > 9 && (
                        <div style={{
                          position: "absolute", inset: 0, borderRadius: 14,
                          background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <span style={{ color: "#fff", fontSize: 16, fontWeight: 800 }}>+{t.photos - 9}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Diary entries */}
              <p style={{ color: C.inkDim, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, margin: "0 0 12px", fontFamily: fontSans }}>
                DIÁRIO DA VIAGEM ({t.entries} entradas)
              </p>
              {[
                { day: "Dia 1", text: "Chegamos! Rex ficou maluco com o cheiro do ar da montanha.", emoji: "🏔️" },
                { day: "Dia 2", text: "Trilha no Horto Florestal. Rex encontrou um esquilo.", emoji: "🐿️" },
                { day: "Dia 3", text: "NEVE! Rex correu, pulou, comeu neve e dormiu 12 horas depois.", emoji: "❄️" },
              ].map((entry, i) => (
                <div key={i} style={{
                  background: C.card, borderRadius: 16, padding: "12px 16px", marginBottom: 8,
                  border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12,
                }}>
                  <span style={{ fontSize: 24 }}>{entry.emoji}</span>
                  <div>
                    <p style={{ color: C.sky, fontSize: 10, fontWeight: 700, margin: "0 0 2px", letterSpacing: 0.5 }}>{entry.day}</p>
                    <p style={{ color: C.inkSec, fontSize: 13, lineHeight: 1.5, margin: 0, fontFamily: fontSans }}>{entry.text}</p>
                  </div>
                </div>
              ))}
            </>
          )}

          {tab === "locais" && (
            <>
              <p style={{ color: C.inkDim, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, margin: "0 0 12px", fontFamily: fontSans }}>
                LOCAIS PET-FRIENDLY VISITADOS
              </p>
              {[
                { name: "Hotel Quinta das Flores", type: "Hospedagem", rating: 4.9, emoji: "🏨", note: "Área pet livre, bowl em todos quartos" },
                { name: "Horto Florestal", type: "Trilha", rating: 4.7, emoji: "🌲", note: "Pets na guia permitidos. Trilha de 3km" },
                { name: "Restaurante Montanhês", type: "Restaurante", rating: 4.5, emoji: "🍽️", note: "Área externa pet-friendly, água disponível" },
                { name: "Praça São Benedito", type: "Parque", rating: 4.6, emoji: "🌳", note: "Ampla, gramada, outros cães frequentam" },
              ].map((l, i) => (
                <div key={i} style={{
                  background: C.card, borderRadius: 18, padding: "14px 16px", marginBottom: 10,
                  border: `1px solid ${C.border}`, boxShadow: C.shadow,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                    <span style={{ fontSize: 22 }}>{l.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ color: C.ink, fontSize: 14, fontWeight: 700, margin: 0, fontFamily: fontSans }}>{l.name}</p>
                      <p style={{ color: C.inkDim, fontSize: 11, margin: "2px 0 0" }}>{l.type}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <Ico type="star" size={12} color={C.sand} />
                      <span style={{ color: C.sand, fontSize: 13, fontWeight: 700, fontFamily: fontMono }}>{l.rating}</span>
                    </div>
                  </div>
                  <p style={{ color: C.inkDim, fontSize: 12, margin: 0, lineHeight: 1.5, fontFamily: fontSans }}>🐾 {l.note}</p>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ======================== MAIN APP ========================
export default function ViagensPet() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedTrip, setSelectedTrip] = useState(null);
  const containerRef = useRef();

  const filtered = activeFilter === "all" ? trips : trips.filter(t => t.status === activeFilter);
  const totalKm = trips.filter(t => t.status === "completed").reduce((s, t) => s + parseInt(t.distance), 0);
  const totalPhotos = trips.reduce((s, t) => s + t.photos, 0);
  const totalDays = trips.filter(t => t.status !== "planned").reduce((s, t) => s + t.days, 0);

  return (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center",
      minHeight: "100vh", padding: 20,
      background: `linear-gradient(170deg, #E8E3D8 0%, #DDD6C8 50%, #D2CBBC 100%)`,
      fontFamily: fontSans,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@400;500;600;700&family=Nunito:wght@400;500;600;700;800&family=Caveat:wght@400;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div ref={containerRef} style={{
        width: 400, maxHeight: 820, background: C.bg, borderRadius: 40,
        overflow: "auto", position: "relative",
        boxShadow: `0 20px 80px rgba(30,42,26,0.12), 0 0 0 1px ${C.border}`,
      }}>
        {/* Notch */}
        <div style={{ position: "sticky", top: 0, zIndex: 30, display: "flex", justifyContent: "center", padding: "8px 0 0", background: `linear-gradient(to bottom, ${C.bg}, transparent)` }}>
          <div style={{ width: 120, height: 28, borderRadius: 20, background: "#1a1a1a" }} />
        </div>

        {/* Header */}
        <div style={{ padding: "12px 20px 6px", display: "flex", alignItems: "center", gap: 12 }}>
          <button style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, width: 38, height: 38, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Ico type="back" size={18} color={C.ink} />
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ color: C.ink, fontSize: 21, margin: 0, fontWeight: 700, fontFamily: font }}>Viagens do Rex</h1>
            <p style={{ color: C.inkDim, fontSize: 12, margin: "2px 0 0" }}>Roteiros, registros e memórias</p>
          </div>
          <button style={{
            background: C.sky, border: "none", borderRadius: 14,
            padding: "8px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
          }}>
            <Ico type="plus" size={16} color="#fff" />
            <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>Nova</span>
          </button>
        </div>

        {/* Stats Banner */}
        <div style={{
          margin: "16px 20px 0", padding: "20px 18px",
          background: `linear-gradient(145deg, ${C.sky}, ${C.oceanDeep})`,
          borderRadius: 24, position: "relative", overflow: "hidden",
          boxShadow: C.shadowMd,
        }}>
          <div style={{ position: "absolute", top: -30, right: -20, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
          <div style={{ position: "absolute", bottom: -20, left: -10, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />

          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 18,
              background: "rgba(255,255,255,0.12)", backdropFilter: "blur(4px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 26, border: "1.5px solid rgba(255,255,255,0.15)",
            }}>✈️</div>
            <div>
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 10, fontWeight: 700, letterSpacing: 1, margin: "0 0 4px" }}>DIÁRIO DE VIAGENS</p>
              <p style={{ color: "#fff", fontSize: 20, fontWeight: 700, margin: 0, fontFamily: font }}>
                {trips.filter(t => t.status === "completed").length} viagens concluídas
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            {[
              { value: `${totalKm} km`, label: "Percorridos", emoji: "🛣️" },
              { value: `${totalDays} dias`, label: "De aventura", emoji: "⛺" },
              { value: totalPhotos, label: "Fotos", emoji: "📸" },
            ].map((s, i) => (
              <div key={i} style={{
                flex: 1, background: "rgba(255,255,255,0.1)", borderRadius: 14, padding: "10px 8px",
                textAlign: "center", backdropFilter: "blur(4px)",
              }}>
                <span style={{ fontSize: 16 }}>{s.emoji}</span>
                <p style={{ color: "#fff", fontSize: 14, fontWeight: 800, margin: "4px 0 0" }}>{s.value}</p>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 9, margin: "2px 0 0" }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Active Trip Alert */}
        {trips.find(t => t.status === "active") && (
          <div onClick={() => setSelectedTrip(trips.find(t => t.status === "active"))} style={{
            margin: "14px 20px 0", padding: "14px 18px", borderRadius: 18, cursor: "pointer",
            background: C.forest + "08", border: `1.5px solid ${C.forest}20`,
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: C.forest, animation: "blink 1.5s ease infinite" }} />
            <div style={{ flex: 1 }}>
              <p style={{ color: C.forest, fontSize: 13, fontWeight: 700, margin: 0 }}>Viagem em andamento!</p>
              <p style={{ color: C.inkDim, fontSize: 11, margin: "2px 0 0" }}>Fazenda Santa Rita · Dia 2 de 4</p>
            </div>
            <span style={{ color: C.forest, fontSize: 12, fontWeight: 700 }}>Ver →</span>
          </div>
        )}

        {/* Filters */}
        <div style={{ padding: "16px 20px 0", display: "flex", gap: 6 }}>
          {[
            { id: "all", label: `Todas (${trips.length})` },
            { id: "active", label: "Ativa" },
            { id: "completed", label: "Concluídas" },
            { id: "planned", label: "Planejadas" },
          ].map(f => (
            <button key={f.id} onClick={() => setActiveFilter(f.id)} style={{
              flex: 1, padding: "8px 4px", borderRadius: 10, cursor: "pointer",
              background: activeFilter === f.id ? C.sky + "18" : C.card,
              border: activeFilter === f.id ? `1px solid ${C.sky}30` : `1px solid ${C.border}`,
              color: activeFilter === f.id ? C.sky : C.inkDim,
              fontSize: 10, fontWeight: 700, fontFamily: fontSans,
            }}>{f.label}</button>
          ))}
        </div>

        {/* Trip List */}
        <div style={{ padding: "16px 20px 0" }}>
          {filtered.map(t => (
            <TripCard key={t.id} trip={t} onClick={setSelectedTrip} />
          ))}
        </div>

        {/* Pet-Friendly Nearby */}
        <div style={{ padding: "6px 20px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Ico type="mapPin" size={16} color={C.forest} />
            <span style={{ color: C.inkDim, fontSize: 11, fontWeight: 700, letterSpacing: 1.2 }}>PET-FRIENDLY PERTO DE VOCÊ</span>
          </div>
          <div style={{ display: "flex", gap: 10, overflow: "auto", paddingBottom: 4 }}>
            {petFriendlyNearby.map((p, i) => (
              <div key={i} style={{
                minWidth: 160, background: C.card, borderRadius: 20, padding: 16,
                border: `1px solid ${C.border}`, flexShrink: 0, boxShadow: C.shadow,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: 28 }}>{p.emoji}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <Ico type="star" size={11} color={C.sand} />
                    <span style={{ color: C.sand, fontSize: 12, fontWeight: 700, fontFamily: fontMono }}>{p.rating}</span>
                  </div>
                </div>
                <p style={{ color: C.ink, fontSize: 13, fontWeight: 700, margin: "0 0 3px", fontFamily: fontSans }}>{p.name}</p>
                <p style={{ color: C.inkDim, fontSize: 10, margin: "0 0 8px" }}>{p.type} · {p.dist}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {p.features.map(f => (
                    <span key={f} style={{
                      background: p.color + "08", color: p.color, fontSize: 8, fontWeight: 700,
                      padding: "2px 6px", borderRadius: 6,
                    }}>{f}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Travel Tips */}
        <div style={{
          margin: "18px 20px 0", padding: 20,
          background: `linear-gradient(145deg, ${C.sky}06, ${C.sand}04)`,
          borderRadius: 22, border: `1px solid ${C.sky}10`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Ico type="sparkle" size={16} color={C.sky} />
            <span style={{ color: C.sky, fontSize: 12, fontWeight: 700, fontFamily: fontSans }}>DICAS DA IA PARA A PRÓXIMA VIAGEM</span>
          </div>
          {[
            { emoji: "🌡️", text: "Rex se adapta melhor a climas frios. Evitar destinos com temperatura >35°C." },
            { emoji: "⏱️", text: "Pausas a cada 2h em viagens de carro. Rex fica ansioso após 3h contínuas." },
            { emoji: "🏨", text: "Sempre confirmar política pet do hotel por telefone, não apenas pelo site." },
            { emoji: "💊", text: "Aplicar antiparasitário 48h antes de viagens para áreas rurais ou praias." },
            { emoji: "🧸", text: "Nunca esquecer a bolinha amarela. Rex não dorme sem ela em ambientes novos." },
          ].map((tip, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 16, width: 22, flexShrink: 0 }}>{tip.emoji}</span>
              <p style={{ color: C.inkSec, fontSize: 12, lineHeight: 1.6, margin: 0, fontFamily: fontSans }}>{tip.text}</p>
            </div>
          ))}
        </div>

        {/* Rex narrative */}
        <div style={{
          margin: "16px 20px 30px", padding: "18px 20px",
          background: `linear-gradient(145deg, ${C.sand}06, ${C.cream})`,
          borderRadius: 20, border: `1px solid ${C.sand}10`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <Ico type="paw" size={15} color={C.sand} />
            <span style={{ color: C.sand, fontSize: 12, fontWeight: 700, fontFamily: fontSans }}>Diário do Rex</span>
          </div>
          <p style={{
            color: C.inkSec, fontSize: 15, lineHeight: 1.9, margin: 0,
            fontFamily: "'Caveat', cursive", fontStyle: "italic",
          }}>
            "Eu adoro quando o meu humano pega aquela mala grande e começa a colocar
            as minhas coisas dentro. Significa AVENTURA! Cheiros novos, chão diferente,
            e muitas fotos onde eu finjo que não estou a posar mas estou. A melhor parte?
            No carro eu vou com a janela aberta e o vento faz as minhas orelhas voar. 🚗💨"
          </p>
        </div>

        {/* Trip Detail Modal */}
        {selectedTrip && <TripDetail trip={selectedTrip} onClose={() => setSelectedTrip(null)} />}

        <style>{`
          ::-webkit-scrollbar{width:0;height:0}
          @keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}
        `}</style>
      </div>
    </div>
  );
}
