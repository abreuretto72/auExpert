import { useState, useRef } from "react";

// ======================== PETAULIFE+ v5 — DESIGN TOKENS (idêntico ao login v5) ========================
const C = {
  bg: "#0F1923", bgCard: "#162231", bgDeep: "#0B1219",
  card: "#1A2B3D", cardHover: "#1E3145", glow: "#2A4A6B",
  accent: "#E8813A", accentLight: "#F09A56", accentDark: "#CC6E2E",
  accentGlow: "#E8813A15", accentMed: "#E8813A30",
  petrol: "#1B8EAD", petrolLight: "#22A8CC", petrolDark: "#15748F",
  petrolGlow: "#1B8EAD20",
  success: "#2ECC71", successSoft: "#2ECC7112",
  danger: "#E74C3C", dangerSoft: "#E74C3C12",
  warning: "#F1C40F", warningSoft: "#F1C40F12",
  purple: "#9B59B6", purpleLight: "#B07CC6", purpleGlow: "#9B59B620",
  gold: "#F39C12", goldSoft: "#F39C1212",
  rose: "#E84393",
  text: "#E8EDF2", textSec: "#8FA3B8", textDim: "#5E7A94", textGhost: "#2E4254",
  placeholder: "#5E7A94",
  border: "#1E3248", borderLight: "#243A50",
  shadowAccent: "0 8px 30px rgba(232,129,58,0.25)",
  shadowLg: "0 16px 50px rgba(0,0,0,0.4)",
};
const font = "'Sora', -apple-system, sans-serif";
const fontMono = "'JetBrains Mono', monospace";

// ======================== LOGO OFICIAL (idêntico ao login v5, tamanho parametrizado) ========================
const PetauLogo = ({ size = "normal" }) => {
  const s = size === "large" ? 1.35 : size === "small" ? 0.7 : 1;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 * s, userSelect: "none" }}>
      <div style={{
        width: 50 * s, height: 50 * s, borderRadius: 16 * s,
        background: `linear-gradient(135deg, ${C.accent}, ${C.accentDark})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: `0 6px 24px ${C.accent}30`,
      }}>
        <svg width={28 * s} height={28 * s} viewBox="0 0 24 24" fill="#fff" stroke="none">
          <ellipse cx="12" cy="17" rx="4.5" ry="4"/><circle cx="7" cy="10.5" r="2.2"/>
          <circle cx="17" cy="10.5" r="2.2"/><circle cx="9.5" cy="6.5" r="1.8"/>
          <circle cx="14.5" cy="6.5" r="1.8"/>
        </svg>
      </div>
      <span style={{ fontSize: 26 * s, fontWeight: 700, fontFamily: font, color: C.text, letterSpacing: -0.8 }}>
        Pet<span style={{ color: C.petrol }}>au</span>Life<span style={{ color: C.accent }}>+</span>
      </span>
    </div>
  );
};

// ======================== SVG ICON SYSTEM ========================
const I = {
  // === Animals (decorative in avatar, clickable context varies) ===
  dog: (s=24, c=C.accent) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 5.172C10 3.782 8.423 2.679 6.5 3c-2.823.47-4.113 6.006-4 7 .137 1.217.652 2 1.5 2.5V19a2 2 0 002 2h10a2 2 0 002-2v-6.328c.848-.5 1.363-1.283 1.5-2.5.113-.994-1.177-6.53-4-7C13.577 2.679 12 3.782 12 5.172V5.5"/><path d="M14.5 14.5c0 .828-1.12 1.5-2.5 1.5s-2.5-.672-2.5-1.5"/><circle cx="8.5" cy="10" r="1" fill={c} stroke="none"/><circle cx="13.5" cy="10" r="1" fill={c} stroke="none"/></svg>,

  cat: (s=24, c=C.purple) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c4.97 0 9-2.686 9-6v-.8c0-1.3-.3-2.3-1-3.2 0-2-1-3.5-3-4l1-6-4 3c-1.3-.4-2.7-.4-4 0L6 2l1 6c-2 .5-3 2-3 4-.7.9-1 1.9-1 3.2v.8c0 3.314 4.03 6 9 6z"/><circle cx="9" cy="13" r="1" fill={c} stroke="none"/><circle cx="15" cy="13" r="1" fill={c} stroke="none"/><path d="M10 16.5c0 .5.9 1 2 1s2-.5 2-1"/></svg>,

  // === Clickable icons: ALWAYS accent (orange) ===
  menu: (s=22, c=C.accent) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="16" y2="12"/><line x1="3" y1="18" x2="19" y2="18"/></svg>,

  bell: (s=22, c=C.accent) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,

  plus: (s=20, c=C.accent) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,

  x: (s=18, c=C.accent) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,

  back: (s=18, c=C.accent) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15,18 9,12 15,6"/></svg>,

  arrowRight: (s=16, c=C.accent) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9,6 15,12 9,18"/></svg>,

  arrowRightLine: (s=18, c="#fff") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/></svg>,

  settings: (s=20, c=C.accent) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9c.18-.47.04-1-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06c.5.37 1.35.51 1.82.33.47-.18.82-.7 1-1.51V3a2 2 0 014 0v.09c.18.81.53 1.33 1 1.51.47.18 1.32.04 1.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06c-.37.82-.51 1.35-.33 1.82.18.47.7.82 1.51 1H21a2 2 0 010 4h-.09c-.81.18-1.33.53-1.51 1z"/></svg>,

  help: (s=20, c=C.accent) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,

  shield: (s=20, c=C.accent) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,

  fileText: (s=20, c=C.accent) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,

  users: (s=20, c=C.accent) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,

  cloud: (s=20, c=C.accent) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/></svg>,

  logout: (s=20, c=C.accent) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,

  camera: (s=24, c=C.accent) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>,

  mic: (s=20, c=C.accent) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 00-3 3v6a3 3 0 006 0V5a3 3 0 00-3-3z"/><path d="M19 10v1a7 7 0 01-14 0v-1"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>,

  heart: (s=18, c=C.accent) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,

  sparkle: (s=16, c=C.accent) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/></svg>,

  user: (s=26, c="#fff") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,

  // === Decorative icons: semantic colors ===
  alertTriangle: (s=18, c=C.danger) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,

  shieldCheck: (s=16, c=C.success) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9,12 11,14 15,10"/></svg>,

  bookOpen: (s=16, c=C.accent) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>,

  scanEye: (s=16, c=C.purple) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,

  syringe: (s=14, c=C.danger) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2l4 4M17 7l3-3M19 9l-8.7 8.7c-.4.4-1 .4-1.4 0L5.3 14.1c-.4-.4-.4-1 0-1.4L14 4M2 22l4-4M7 13l4 4M10 10l4 4"/></svg>,

  check: (s=14, c=C.success) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12"/></svg>,

  clock: (s=12, c=C.textGhost) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>,

  // === TRASH: ALWAYS RED ===
  trash: (s=20, c=C.danger) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>,

  // === Extra icons for tutor card ===
  mapPin: (s=14, c=C.petrol) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  trophy: (s=16, c=C.gold) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22"/><path d="M18 2H6v7a6 6 0 0012 0V2z"/></svg>,
  calendarDec: (s=14, c=C.textDim) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  mailDec: (s=14, c=C.textDim) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="M22 7l-10 6L2 7"/></svg>,
  pencil: (s=16, c=C.accent) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5z"/></svg>,
};

// ======================== PET DATA ========================
const petsData = [
  {
    id: "rex", name: "Rex", species: "dog", breed: "Labrador Retriever",
    age: "3 anos", weight: "32 kg", color: C.accent,
    healthScore: 92, mood: "Feliz", moodColor: C.success,
    diaryCount: 47, photoCount: 127, vaccinesDue: 2,
    lastActivity: "Passeio no parque", lastTime: "Hoje 16:45",
    aiInsight: "Rex está 15% mais ativo esta semana. Padrão de humor em alta constante.",
  },
  {
    id: "luna", name: "Luna", species: "cat", breed: "Siamês",
    age: "2 anos", weight: "4.2 kg", color: C.purple,
    healthScore: 98, mood: "Calma", moodColor: C.petrol,
    diaryCount: 23, photoCount: 85, vaccinesDue: 0,
    lastActivity: "Dormindo na janela", lastTime: "Hoje 14:00",
    aiInsight: "Luna mantém saúde perfeita. Padrão de sono regular nos últimos 30 dias.",
  },
];

// Breed lists removed — AI identifies breed from photo automatically

// ======================== TUTOR DATA ========================
const tutorData = {
  name: "Ana Martins",
  email: "ana.martins@email.com",
  city: "Salto", state: "SP", country: "Brasil",
  memberSince: "Mar 2026",
  level: 12, xp: 2840, xpNext: 3500,
  title: "Tutora Dedicada",
  proofOfLove: "Prata",
};

// ======================== MAIN APP ========================
export default function MeusPetsHubV5() {
  const [screen, setScreen] = useState("hub"); // hub | profile
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addStep, setAddStep] = useState(0);
  const [addSpecies, setAddSpecies] = useState(null);
  const [addName, setAddName] = useState("");
  const [addBreed, setAddBreed] = useState("");
  const [aiPhase, setAiPhase] = useState("idle"); // idle | scanning | done
  const containerRef = useRef();
  const scrollTop = () => { if (containerRef.current) containerRef.current.scrollTop = 0; };
  const xpPct = (tutorData.xp / tutorData.xpNext) * 100;

  const menuItems = [
    { icon: I.settings, label: "Preferências", sub: "Idioma, tema, notificações" },
    { icon: I.users, label: "Assistentes", sub: "Acesso de cuidadores", badge: "0/2" },
    { icon: I.shield, label: "Privacidade", sub: "Como seus dados são protegidos" },
    { icon: I.fileText, label: "Termos de Uso", sub: "Regras e condições" },
    { icon: I.help, label: "Ajuda e Suporte", sub: "FAQ, tutoriais e contato" },
    { icon: I.cloud, label: "Backup", sub: "Último: Hoje 03:00", badge: "Auto" },
  ];

  return (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center",
      minHeight: "100vh", padding: 20,
      background: `radial-gradient(ellipse at 50% 0%, #162231, #0B1219 70%)`,
      fontFamily: font,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Caveat:wght@400;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div ref={containerRef} style={{
        width: 400, maxHeight: 820, background: C.bg, borderRadius: 44,
        overflow: "auto", position: "relative",
        boxShadow: `0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px ${C.border}`,
      }}>
        {/* Notch */}
        <div style={{ position: "sticky", top: 0, zIndex: 30, display: "flex", justifyContent: "center", padding: "8px 0 0", background: `linear-gradient(to bottom, ${C.bg}, transparent)` }}>
          <div style={{ width: 120, height: 28, borderRadius: 20, background: "#000" }} />
        </div>

        {/* Ambient glow */}
        <div style={{ position: "absolute", top: -50, right: -30, width: 200, height: 200, borderRadius: "50%", background: `radial-gradient(circle, ${C.accent}05, transparent 70%)`, pointerEvents: "none" }} />

        {/* ==================== HUB SCREEN ==================== */}
        {screen === "hub" && (<>
        {/* ===== HEADER ===== */}
        <div style={{ padding: "12px 20px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={() => setDrawerOpen(true)} style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 12, width: 46, height: 46, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {I.menu(22, C.accent)}
          </button>
          {/* Logo oficial — tamanho normal */}
          <PetauLogo size="normal" />
          <button style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 12, width: 46, height: 46, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            {I.bell(22, C.accent)}
            <div style={{ position: "absolute", top: 10, right: 10, width: 8, height: 8, borderRadius: 4, background: C.danger, border: `2px solid ${C.bg}` }} />
          </button>
        </div>

        {/* ===== TUTOR CARD (clicável → perfil) ===== */}
        <button onClick={() => { setScreen("profile"); scrollTop(); }} style={{
          display: "flex", width: "calc(100% - 40px)", margin: "20px 20px 0",
          background: `linear-gradient(145deg, ${C.card}, ${C.bgCard})`,
          borderRadius: 22, border: `1px solid ${C.accent}15`,
          padding: "20px", cursor: "pointer", textAlign: "left",
          position: "relative", overflow: "hidden",
        }}>
          {/* Glow sutil */}
          <div style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, borderRadius: "50%", background: `radial-gradient(circle, ${C.accent}06, transparent 70%)`, pointerEvents: "none" }} />

          {/* Avatar */}
          <div style={{
            width: 60, height: 60, borderRadius: 20, flexShrink: 0,
            background: `linear-gradient(135deg, ${C.accent}, ${C.accentDark})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 4px 16px ${C.accent}25`, marginRight: 16,
          }}>
            {I.user(28, "#fff")}
          </div>

          {/* Info */}
          <div style={{ flex: 1, position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <h3 style={{ color: C.text, fontSize: 18, fontWeight: 700, margin: 0, fontFamily: font }}>{tutorData.name}</h3>
              {I.arrowRight(14, C.accent)}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              {I.mapPin(12, C.petrol)}
              <span style={{ color: C.textDim, fontSize: 11, fontFamily: font }}>{tutorData.city}, {tutorData.state}</span>
              <span style={{ color: C.textGhost, fontSize: 9 }}>·</span>
              {I.calendarDec(11, C.textDim)}
              <span style={{ color: C.textDim, fontSize: 11, fontFamily: font }}>{tutorData.memberSince}</span>
            </div>

            {/* Mini stats */}
            <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
              {[
                { icon: I.heart(12, C.accent), val: petsData.length, lbl: "pets" },
                { icon: I.bookOpen(12, C.accent), val: petsData.reduce((s, p) => s + p.diaryCount, 0), lbl: "diários" },
                { icon: I.scanEye(12, C.purple), val: petsData.reduce((s, p) => s + p.photoCount, 0), lbl: "fotos" },
              ].map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {s.icon}
                  <span style={{ color: C.textSec, fontSize: 11, fontFamily: fontMono, fontWeight: 600 }}>{s.val}</span>
                  <span style={{ color: C.textDim, fontSize: 10, fontFamily: font }}>{s.lbl}</span>
                </div>
              ))}
            </div>

            {/* XP bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {I.trophy(14, C.gold)}
                <span style={{ color: C.gold, fontSize: 11, fontWeight: 700, fontFamily: font }}>Nv.{tutorData.level}</span>
              </div>
              <div style={{ flex: 1, height: 4, borderRadius: 2, background: C.border }}>
                <div style={{ width: `${xpPct}%`, height: "100%", borderRadius: 2, background: `linear-gradient(90deg, ${C.gold}, ${C.accent})` }} />
              </div>
              <span style={{ color: C.textGhost, fontSize: 9, fontFamily: fontMono }}>{tutorData.xp}/{tutorData.xpNext}</span>
            </div>
          </div>
        </button>

        {/* ===== VACCINE ALERT ===== */}
        {petsData.some(p => p.vaccinesDue > 0) && (
          <button style={{
            display: "flex", width: "calc(100% - 40px)", margin: "14px 20px 0",
            padding: "13px 18px", borderRadius: 14,
            background: C.dangerSoft, border: `1px solid ${C.danger}18`,
            alignItems: "center", gap: 12, cursor: "pointer", fontFamily: font, textAlign: "left",
          }}>
            {I.alertTriangle(18, C.danger)}
            <p style={{ color: C.danger, fontSize: 13, fontWeight: 700, margin: 0, flex: 1 }}>Rex tem 2 vacinas vencidas</p>
            {I.arrowRight(14, C.danger)}
          </button>
        )}

        {/* ===== SECTION HEADER ===== */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "26px 22px 14px" }}>
          <p style={{ color: C.textGhost, fontSize: 11, fontWeight: 700, letterSpacing: 2, margin: 0, fontFamily: font }}>MEUS PETS</p>
          <button onClick={() => { setShowAdd(true); setAddStep(0); setAddSpecies(null); setAddName(""); setAddBreed(""); setAiPhase("idle"); }} style={{
            display: "flex", alignItems: "center", gap: 6,
            background: C.accent + "12", border: `1px solid ${C.accent}22`,
            borderRadius: 10, padding: "8px 14px", cursor: "pointer",
          }}>
            {I.plus(14, C.accent)}
            <span style={{ color: C.accent, fontSize: 11, fontWeight: 700, fontFamily: font }}>Novo Pet</span>
          </button>
        </div>

        {/* ===== PET CARDS ===== */}
        <div style={{ padding: "0 20px" }}>
          {petsData.map(pet => (
            <div key={pet.id} style={{
              background: C.card, borderRadius: 22, marginBottom: 14,
              border: `1px solid ${C.border}`, overflow: "hidden", cursor: "pointer",
            }}>
              {/* Header */}
              <div style={{ padding: "22px 22px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  {/* Avatar SVG */}
                  <div style={{
                    width: 68, height: 68, borderRadius: 22,
                    background: C.bgCard, border: `2.5px solid ${pet.color}25`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: `0 0 24px ${pet.color}08`,
                  }}>
                    {pet.species === "dog" ? I.dog(36, pet.color) : I.cat(36, pet.color)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <h3 style={{ color: C.text, fontSize: 22, fontWeight: 700, margin: 0, fontFamily: font }}>{pet.name}</h3>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, background: pet.moodColor + "12", padding: "3px 10px", borderRadius: 8 }}>
                        <div style={{ width: 6, height: 6, borderRadius: 3, background: pet.moodColor }} />
                        <span style={{ color: pet.moodColor, fontSize: 10, fontWeight: 700, fontFamily: font }}>{pet.mood}</span>
                      </div>
                    </div>
                    <p style={{ color: C.textDim, fontSize: 13, margin: "4px 0 0", fontFamily: font }}>{pet.breed}</p>
                    <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                      {[pet.age, pet.weight, pet.species === "dog" ? "Cão" : "Gato"].map((tag, i) => (
                        <span key={i} style={{ background: C.bgCard, color: C.textDim, fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 8, fontFamily: font, border: `1px solid ${C.border}` }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div style={{ padding: "0 22px 18px" }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                  {[
                    { value: pet.healthScore, label: "Saúde IA", color: pet.healthScore >= 90 ? C.success : C.warning, icon: I.shieldCheck(16, pet.healthScore >= 90 ? C.success : C.warning) },
                    { value: pet.diaryCount, label: "Diário", color: C.accent, icon: I.bookOpen(16, C.accent) },
                    { value: pet.photoCount, label: "Fotos", color: C.purple, icon: I.scanEye(16, C.purple) },
                  ].map((s, i) => (
                    <div key={i} style={{ flex: 1, background: C.bgCard, borderRadius: 16, padding: "14px 8px", textAlign: "center", border: `1px solid ${C.border}` }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 6 }}>
                        {s.icon}
                        <span style={{ color: s.color, fontSize: 18, fontWeight: 800, fontFamily: fontMono }}>{s.value}</span>
                      </div>
                      <p style={{ color: C.textDim, fontSize: 9, margin: 0, fontFamily: font, fontWeight: 600 }}>{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Status bar */}
                {pet.vaccinesDue > 0 ? (
                  <div style={{ background: C.dangerSoft, borderRadius: 12, padding: "10px 14px", border: `1px solid ${C.danger}10`, display: "flex", alignItems: "center", gap: 8 }}>
                    {I.syringe(14, C.danger)}
                    <span style={{ color: C.danger, fontSize: 12, fontWeight: 700, fontFamily: font }}>{pet.vaccinesDue} vacinas vencidas</span>
                  </div>
                ) : (
                  <div style={{ background: C.successSoft, borderRadius: 12, padding: "10px 14px", border: `1px solid ${C.success}10`, display: "flex", alignItems: "center", gap: 8 }}>
                    {I.check(14, C.success)}
                    <span style={{ color: C.success, fontSize: 12, fontWeight: 700, fontFamily: font }}>Tudo em dia!</span>
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
                  {I.clock(11, C.textGhost)}
                  <span style={{ color: C.textGhost, fontSize: 11, fontFamily: font }}>{pet.lastActivity}</span>
                  <span style={{ color: C.textGhost, fontSize: 10, fontFamily: fontMono, marginLeft: "auto" }}>{pet.lastTime}</span>
                </div>
              </div>
            </div>
          ))}

          {/* Add pet placeholder */}
          <button onClick={() => { setShowAdd(true); setAddStep(0); }} style={{
            width: "100%", background: C.accent + "06", borderRadius: 22, padding: "36px 20px",
            border: `2px dashed ${C.accent}40`, cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginBottom: 14,
          }}>
            <div style={{ width: 58, height: 58, borderRadius: 18, background: C.accent + "10", border: `2px dashed ${C.accent}50`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {I.plus(26, C.accent)}
            </div>
            <p style={{ color: C.text, fontSize: 15, fontWeight: 700, margin: 0, fontFamily: font }}>Adicionar Novo Pet</p>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {I.dog(16, C.accent + "80")}
              <span style={{ color: C.textDim, fontSize: 12, fontFamily: font }}>Apenas cães e gatos</span>
              {I.cat(16, C.accent + "80")}
            </div>
          </button>
        </div>

        {/* ===== AI INSIGHT ===== */}
        <div style={{
          margin: "6px 20px 28px", padding: 20,
          background: C.card, borderRadius: 20, border: `1px solid ${C.accent}12`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            {I.sparkle(16, C.accent)}
            <span style={{ color: C.accent, fontSize: 12, fontWeight: 700, fontFamily: font, letterSpacing: 0.5 }}>INSIGHT DA IA</span>
          </div>
          <p style={{ color: C.textSec, fontSize: 13, lineHeight: 1.7, margin: 0, fontFamily: font }}>
            <b style={{ color: C.text }}>Rex</b> precisa de atenção nas vacinas.
            <b style={{ color: C.text }}> Luna</b> está com saúde perfeita.
            Seus pets estão <span style={{ color: C.success, fontWeight: 700 }}>bem cuidados</span>.
          </p>
        </div>

        </>)}

        {/* ==================== PROFILE SCREEN ==================== */}
        {screen === "profile" && (
          <div style={{ padding: "0 20px 40px" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 0 26px" }}>
              <button onClick={() => { setScreen("hub"); scrollTop(); }} style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 12, width: 42, height: 42, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {I.back(18, C.accent)}
              </button>
              <h2 style={{ color: C.text, fontSize: 22, fontWeight: 700, margin: 0, fontFamily: font, flex: 1 }}>Perfil do Tutor</h2>
              <button style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 12, width: 42, height: 42, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {I.pencil(16, C.accent)}
              </button>
            </div>

            {/* Avatar + Name */}
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{
                width: 100, height: 100, borderRadius: 32, margin: "0 auto 16px",
                background: `linear-gradient(135deg, ${C.accent}, ${C.accentDark})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: C.shadowAccent, position: "relative",
              }}>
                {I.user(48, "#fff")}
                <button style={{
                  position: "absolute", bottom: -4, right: -4,
                  width: 32, height: 32, borderRadius: 10,
                  background: C.card, border: `2px solid ${C.bg}`,
                  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                }}>
                  {I.camera(16, C.accent)}
                </button>
              </div>
              <h2 style={{ color: C.text, fontSize: 24, fontWeight: 700, margin: "0 0 4px", fontFamily: font }}>{tutorData.name}</h2>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginBottom: 4 }}>
                {I.mailDec(12, C.textDim)}
                <span style={{ color: C.textDim, fontSize: 12, fontFamily: font }}>{tutorData.email}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                {I.mapPin(12, C.petrol)}
                <span style={{ color: C.petrol, fontSize: 12, fontFamily: font }}>{tutorData.city}, {tutorData.state} — {tutorData.country}</span>
              </div>
            </div>

            {/* Level + XP card */}
            <div style={{
              background: `linear-gradient(135deg, ${C.gold}06, ${C.accent}04)`,
              borderRadius: 20, padding: 20, marginBottom: 14,
              border: `1px solid ${C.gold}12`,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {I.trophy(18, C.gold)}
                  <span style={{ color: C.gold, fontSize: 16, fontWeight: 800, fontFamily: font }}>Nível {tutorData.level}</span>
                </div>
                <span style={{ color: C.textDim, fontSize: 11, fontFamily: font }}>{tutorData.title}</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: C.border, marginBottom: 8 }}>
                <div style={{ width: `${xpPct}%`, height: "100%", borderRadius: 3, background: `linear-gradient(90deg, ${C.gold}, ${C.accent})` }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: C.textDim, fontSize: 10, fontFamily: fontMono }}>{tutorData.xp} XP</span>
                <span style={{ color: C.textGhost, fontSize: 10, fontFamily: fontMono }}>Próximo nível: {tutorData.xpNext} XP</span>
              </div>
            </div>

            {/* Proof of Love */}
            <div style={{
              background: C.card, borderRadius: 18, padding: "16px 20px", marginBottom: 14,
              border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 14,
            }}>
              <div style={{ width: 42, height: 42, borderRadius: 14, background: C.gold + "10", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {I.heart(20, C.gold)}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ color: C.text, fontSize: 14, fontWeight: 700, margin: 0, fontFamily: font }}>Proof of Love</p>
                <p style={{ color: C.textDim, fontSize: 11, margin: "2px 0 0", fontFamily: font }}>Nível {tutorData.proofOfLove} — 10% desconto em parceiros</p>
              </div>
              {I.arrowRight(14, C.accent)}
            </div>

            {/* Stats grid */}
            <p style={{ color: C.textGhost, fontSize: 11, fontWeight: 700, letterSpacing: 2, margin: "20px 0 12px", fontFamily: font }}>ESTATÍSTICAS</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              {[
                { label: "Pets", value: petsData.length, icon: I.heart(16, C.accent), color: C.accent },
                { label: "Diários", value: petsData.reduce((s,p) => s + p.diaryCount, 0), icon: I.bookOpen(16, C.accent), color: C.accent },
                { label: "Análises IA", value: petsData.reduce((s,p) => s + p.photoCount, 0), icon: I.scanEye(16, C.purple), color: C.purple },
                { label: "Vacinas", value: petsData.reduce((s,p) => s + (p.vaccinesDue > 0 ? 0 : 1), 0) + "/" + petsData.length + " em dia", icon: I.shieldCheck(16, C.success), color: C.success },
              ].map((s, i) => (
                <div key={i} style={{ background: C.card, borderRadius: 16, padding: "16px 14px", border: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    {s.icon}
                    <span style={{ color: C.textDim, fontSize: 11, fontWeight: 600, fontFamily: font }}>{s.label}</span>
                  </div>
                  <p style={{ color: s.color, fontSize: 20, fontWeight: 800, margin: 0, fontFamily: fontMono }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* My pets in profile */}
            <p style={{ color: C.textGhost, fontSize: 11, fontWeight: 700, letterSpacing: 2, margin: "20px 0 12px", fontFamily: font }}>MEUS PETS</p>
            {petsData.map(pet => (
              <div key={pet.id} style={{
                background: C.card, borderRadius: 16, padding: "14px 16px", marginBottom: 10,
                border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 14, cursor: "pointer",
              }}>
                <div style={{ width: 48, height: 48, borderRadius: 16, background: pet.color + "10", border: `2px solid ${pet.color}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {pet.species === "dog" ? I.dog(26, pet.color) : I.cat(26, pet.color)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <p style={{ color: C.text, fontSize: 15, fontWeight: 700, margin: 0, fontFamily: font }}>{pet.name}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 3, background: pet.moodColor + "12", padding: "2px 8px", borderRadius: 6 }}>
                      <div style={{ width: 5, height: 5, borderRadius: 3, background: pet.moodColor }} />
                      <span style={{ color: pet.moodColor, fontSize: 9, fontWeight: 700, fontFamily: font }}>{pet.mood}</span>
                    </div>
                  </div>
                  <p style={{ color: C.textDim, fontSize: 11, margin: "2px 0 0", fontFamily: font }}>{pet.breed} · {pet.age}</p>
                </div>
                <span style={{ color: pet.healthScore >= 90 ? C.success : C.warning, fontSize: 16, fontWeight: 800, fontFamily: fontMono }}>{pet.healthScore}</span>
                {I.arrowRight(14, C.accent)}
              </div>
            ))}

            {/* Account info */}
            <p style={{ color: C.textGhost, fontSize: 11, fontWeight: 700, letterSpacing: 2, margin: "20px 0 12px", fontFamily: font }}>CONTA</p>
            {[
              { icon: I.mailDec(16, C.textDim), label: "Email", value: tutorData.email },
              { icon: I.mapPin(16, C.petrol), label: "Localização", value: `${tutorData.city}, ${tutorData.state}` },
              { icon: I.calendarDec(16, C.textDim), label: "Membro desde", value: tutorData.memberSince },
            ].map((item, i) => (
              <div key={i} style={{
                background: C.card, borderRadius: 14, padding: "14px 16px", marginBottom: 8,
                border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12,
              }}>
                {item.icon}
                <div style={{ flex: 1 }}>
                  <p style={{ color: C.textDim, fontSize: 10, fontWeight: 600, margin: 0, fontFamily: font }}>{item.label}</p>
                  <p style={{ color: C.text, fontSize: 13, fontWeight: 600, margin: "2px 0 0", fontFamily: font }}>{item.value}</p>
                </div>
                {I.pencil(14, C.accent)}
              </div>
            ))}
          </div>
        )}

        {/* ===== DRAWER ===== */}
        <div onClick={() => setDrawerOpen(false)} style={{
          position: "absolute", inset: 0, zIndex: 40,
          background: drawerOpen ? "rgba(0,0,0,0.55)" : "transparent",
          backdropFilter: drawerOpen ? "blur(6px)" : "none",
          pointerEvents: drawerOpen ? "auto" : "none", transition: "all 0.35s",
        }} />
        <div style={{
          position: "absolute", top: 0, left: 0, bottom: 0, width: "84%", zIndex: 50,
          background: C.bgCard, borderRadius: "0 28px 28px 0",
          transform: drawerOpen ? "translateX(0)" : "translateX(-105%)",
          transition: "transform 0.35s cubic-bezier(0.4,0,0.2,1)",
          boxShadow: drawerOpen ? C.shadowLg : "none", overflow: "auto",
        }}>
          {/* Profile */}
          <div style={{ padding: "52px 22px 24px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 18,
                background: `linear-gradient(135deg, ${C.accent}, ${C.accentDark})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: C.shadowAccent,
              }}>
                {I.user(26, "#fff")}
              </div>
              <div>
                <h3 style={{ color: C.text, fontSize: 18, fontWeight: 700, margin: 0, fontFamily: font }}>Ana Martins</h3>
                <p style={{ color: C.textDim, fontSize: 12, margin: "4px 0 0", fontFamily: font }}>ana.martins@email.com</p>
              </div>
            </div>
            {/* Mini pet cards */}
            <div style={{ display: "flex", gap: 8 }}>
              {petsData.map(pet => (
                <div key={pet.id} style={{ flex: 1, background: C.card, borderRadius: 12, padding: "10px 12px", border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: pet.color + "12", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {pet.species === "dog" ? I.dog(16, pet.color) : I.cat(16, pet.color)}
                  </div>
                  <div>
                    <p style={{ color: C.text, fontSize: 12, fontWeight: 700, margin: 0, fontFamily: font }}>{pet.name}</p>
                    <p style={{ color: C.textDim, fontSize: 9, margin: "1px 0 0", fontFamily: font }}>{pet.breed}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Menu items — all icons orange (clickable) */}
          <div style={{ padding: "10px 12px 0" }}>
            {menuItems.map((item, i) => (
              <button key={i} style={{
                display: "flex", alignItems: "center", gap: 14, width: "100%",
                background: "transparent", border: "none", borderRadius: 14,
                padding: "14px 12px", cursor: "pointer", fontFamily: font, textAlign: "left",
              }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: C.accent + "08", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {item.icon(20, C.accent)}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: C.text, fontSize: 14, fontWeight: 700, margin: 0 }}>{item.label}</p>
                  <p style={{ color: C.textDim, fontSize: 11, margin: "3px 0 0" }}>{item.sub}</p>
                </div>
                {item.badge && (
                  <span style={{ background: C.accent + "12", color: C.accent, fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 8, fontFamily: font }}>{item.badge}</span>
                )}
              </button>
            ))}
          </div>

          {/* Danger zone — red */}
          <div style={{ margin: "8px 12px 0", borderTop: `1px solid ${C.border}`, padding: "12px 0 0" }}>
            <button style={{
              display: "flex", alignItems: "center", gap: 14, width: "100%",
              background: "transparent", border: "none", borderRadius: 14,
              padding: "14px 12px", cursor: "pointer", fontFamily: font, textAlign: "left",
            }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: C.danger + "08", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {I.trash(20, C.danger)}
              </div>
              <div>
                <p style={{ color: C.danger, fontSize: 14, fontWeight: 700, margin: 0 }}>Zona de Perigo</p>
                <p style={{ color: C.textDim, fontSize: 11, margin: "3px 0 0" }}>Excluir conta e dados</p>
              </div>
            </button>
          </div>

          {/* Logout */}
          <div style={{ margin: "4px 12px 0", borderTop: `1px solid ${C.border}`, padding: "12px 0 30px" }}>
            <button onClick={() => setDrawerOpen(false)} style={{
              display: "flex", alignItems: "center", gap: 14, width: "100%",
              background: "transparent", border: "none", borderRadius: 14,
              padding: "14px 12px", cursor: "pointer", fontFamily: font,
            }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: C.accent + "08", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {I.logout(20, C.accent)}
              </div>
              <p style={{ color: C.text, fontSize: 14, fontWeight: 700, margin: 0 }}>Sair do App</p>
            </button>
            <p style={{ color: C.textGhost, fontSize: 10, textAlign: "center", margin: "20px 0 0", fontFamily: fontMono }}>PetauLife+ v1.0.0-beta</p>
          </div>
        </div>

        {/* ===== ADD PET MODAL — AI-FIRST FLOW ===== */}
        {showAdd && (
          <div style={{ position: "absolute", inset: 0, zIndex: 55, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(10px)", display: "flex", alignItems: "flex-end" }}>
            <div style={{ background: C.bgCard, borderRadius: "26px 26px 0 0", width: "100%", maxHeight: "88%", overflow: "auto", padding: "8px 24px 36px" }}>
              {/* Handle */}
              <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 18px" }}>
                <div style={{ width: 40, height: 5, borderRadius: 3, background: C.textGhost }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <h3 style={{ color: C.text, fontSize: 22, fontWeight: 700, margin: 0, fontFamily: font }}>Novo Pet</h3>
                <button onClick={() => setShowAdd(false)} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, width: 38, height: 38, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {I.x(16, C.accent)}
                </button>
              </div>
              <div style={{ display: "flex", gap: 5, margin: "14px 0 26px" }}>
                {[0,1,2].map(i => <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= addStep ? C.accent : C.border, transition: "all 0.3s" }} />)}
              </div>

              {/* ── STEP 0: Espécie ── */}
              {addStep === 0 && (
                <>
                  <p style={{ color: C.textSec, fontSize: 14, margin: "0 0 20px", fontFamily: font }}>Que tipo de pet você tem?</p>
                  <div style={{ display: "flex", gap: 14 }}>
                    {[
                      { id: "dog", label: "Cachorro", icon: (s, c) => I.dog(s, c), color: C.accent },
                      { id: "cat", label: "Gato", icon: (s, c) => I.cat(s, c), color: C.purple },
                    ].map(s => (
                      <button key={s.id} onClick={() => { setAddSpecies(s.id); setAddStep(1); setAiPhase("idle"); }} style={{
                        flex: 1, padding: "36px 16px", borderRadius: 22, cursor: "pointer",
                        background: C.card, border: `1.5px solid ${C.border}`,
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 14, fontFamily: font,
                      }}>
                        <div style={{ width: 80, height: 80, borderRadius: 24, background: s.color + "10", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {s.icon(48, s.color)}
                        </div>
                        <span style={{ color: C.text, fontSize: 16, fontWeight: 700 }}>{s.label}</span>
                      </button>
                    ))}
                  </div>
                  <p style={{ color: C.textGhost, fontSize: 11, textAlign: "center", margin: "18px 0 0", fontFamily: font }}>No momento aceitamos apenas cães e gatos</p>
                </>
              )}

              {/* ── STEP 1: Foto + Análise IA ── */}
              {addStep === 1 && (
                <>
                  {aiPhase === "idle" && (
                    <>
                      <div style={{ textAlign: "center", marginBottom: 20 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
                          {I.sparkle(16, C.purple)}
                          <span style={{ color: C.purple, fontSize: 13, fontWeight: 700, fontFamily: font }}>IA vai identificar tudo</span>
                        </div>
                        <p style={{ color: C.textDim, fontSize: 13, margin: 0, fontFamily: font, lineHeight: 1.6 }}>
                          Tire uma foto do seu {addSpecies === "dog" ? "cachorro" : "gato"} e nossa IA vai
                          identificar a raça, idade estimada, porte e mais.
                        </p>
                      </div>

                      {/* Camera area */}
                      <button onClick={() => {
                        setAiPhase("scanning");
                        setTimeout(() => setAiPhase("done"), 3000);
                      }} style={{
                        width: "100%", padding: "48px 20px", borderRadius: 22, cursor: "pointer",
                        background: `linear-gradient(180deg, ${C.card}, ${C.bgCard})`,
                        border: `2px dashed ${C.accent}40`,
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
                        marginBottom: 20, position: "relative", overflow: "hidden",
                      }}>
                        <div style={{
                          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
                          width: 120, height: 120, borderRadius: "50%",
                          background: `radial-gradient(circle, ${C.accent}08, transparent 70%)`,
                          pointerEvents: "none",
                        }} />
                        <div style={{
                          width: 72, height: 72, borderRadius: 24,
                          background: C.accent + "12", border: `2px solid ${C.accent}30`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          position: "relative", zIndex: 1,
                        }}>
                          {I.camera(32, C.accent)}
                        </div>
                        <span style={{ color: C.accent, fontSize: 16, fontWeight: 700, fontFamily: font, position: "relative", zIndex: 1 }}>Tirar Foto do Pet</span>
                        <span style={{ color: C.textDim, fontSize: 12, fontFamily: font, position: "relative", zIndex: 1 }}>ou selecionar da galeria</span>
                      </button>

                      <button onClick={() => setAddStep(0)} style={{
                        width: "100%", padding: 14, borderRadius: 14, cursor: "pointer",
                        background: C.card, border: `1.5px solid ${C.border}`,
                        color: C.textSec, fontSize: 14, fontWeight: 600, fontFamily: font,
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      }}>
                        {I.back(14, C.accent)} Voltar
                      </button>
                    </>
                  )}

                  {aiPhase === "scanning" && (
                    <div style={{ textAlign: "center", padding: "20px 0" }}>
                      {/* Simulated photo */}
                      <div style={{
                        width: 140, height: 140, borderRadius: 30, margin: "0 auto 24px",
                        background: `linear-gradient(135deg, ${(addSpecies === "dog" ? C.accent : C.purple)}15, ${C.card})`,
                        border: `3px solid ${(addSpecies === "dog" ? C.accent : C.purple)}25`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        animation: "breathe 2s ease infinite",
                        boxShadow: `0 0 40px ${(addSpecies === "dog" ? C.accent : C.purple)}10`,
                      }}>
                        {addSpecies === "dog" ? I.dog(60, C.accent) : I.cat(60, C.purple)}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 12 }}>
                        {I.sparkle(16, C.purple)}
                        <span style={{ color: C.purple, fontSize: 15, fontWeight: 700, fontFamily: font }}>Analisando...</span>
                      </div>

                      {/* Scanning lines */}
                      {["Identificando raça...", "Estimando idade...", "Analisando porte e peso...", "Verificando saúde visual..."].map((line, i) => (
                        <div key={i} style={{
                          display: "flex", alignItems: "center", gap: 10, justifyContent: "center",
                          marginBottom: 8, opacity: 1,
                          animation: `fadeSlideIn 0.4s ease ${i * 0.5}s both`,
                        }}>
                          <div style={{
                            width: 8, height: 8, borderRadius: 4,
                            background: C.purple,
                            animation: `pulse 1s ease ${i * 0.5}s infinite`,
                          }} />
                          <span style={{ color: C.textSec, fontSize: 13, fontFamily: font }}>{line}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {aiPhase === "done" && (
                    <>
                      {/* Photo + AI badge */}
                      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
                        <div style={{
                          width: 90, height: 90, borderRadius: 26,
                          background: `linear-gradient(135deg, ${(addSpecies === "dog" ? C.accent : C.purple)}12, ${C.card})`,
                          border: `2.5px solid ${(addSpecies === "dog" ? C.accent : C.purple)}30`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          position: "relative",
                        }}>
                          {addSpecies === "dog" ? I.dog(46, C.accent) : I.cat(46, C.purple)}
                          <div style={{
                            position: "absolute", bottom: -4, right: -4,
                            width: 24, height: 24, borderRadius: 8,
                            background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            boxShadow: `0 2px 8px ${C.purple}40`,
                          }}>
                            {I.sparkle(12, "#fff")}
                          </div>
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                            {I.check(14, C.success)}
                            <span style={{ color: C.success, fontSize: 12, fontWeight: 700, fontFamily: font }}>Análise completa</span>
                          </div>
                          <p style={{ color: C.textDim, fontSize: 11, margin: 0, fontFamily: font, lineHeight: 1.5 }}>
                            A IA identificou as informações abaixo.
                            <br/>Você pode editar se necessário.
                          </p>
                        </div>
                      </div>

                      {/* AI findings cards */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
                        {[
                          { label: "Raça", value: addSpecies === "dog" ? "Labrador Retriever" : "Siamês", icon: I.sparkle(12, C.purple), conf: "97%" },
                          { label: "Idade estimada", value: addSpecies === "dog" ? "~2-3 anos" : "~1-2 anos", icon: I.clock(12, C.petrol), conf: "85%" },
                          { label: "Porte", value: addSpecies === "dog" ? "Grande" : "Médio", icon: I.shieldCheck(12, C.success), conf: "92%" },
                          { label: "Peso estimado", value: addSpecies === "dog" ? "~28-34 kg" : "~3.5-5 kg", icon: I.shieldCheck(12, C.success), conf: "80%" },
                          { label: "Sexo", value: "Não identificado", icon: I.help(12, C.textDim), conf: "—" },
                          { label: "Saúde visual", value: "Aparentemente saudável", icon: I.check(12, C.success), conf: "90%" },
                        ].map((f, i) => (
                          <div key={i} style={{
                            background: C.card, borderRadius: 14, padding: "12px 14px",
                            border: `1px solid ${C.border}`,
                          }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                              <span style={{ color: C.textDim, fontSize: 10, fontWeight: 700, fontFamily: font }}>{f.label}</span>
                              <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                                {f.icon}
                                <span style={{ color: C.textGhost, fontSize: 9, fontFamily: fontMono }}>{f.conf}</span>
                              </div>
                            </div>
                            <p style={{ color: C.text, fontSize: 13, fontWeight: 700, margin: 0, fontFamily: font }}>{f.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Disclaimer */}
                      <div style={{
                        background: C.purple + "08", borderRadius: 12, padding: "10px 14px",
                        border: `1px solid ${C.purple}15`, marginBottom: 22,
                        display: "flex", alignItems: "flex-start", gap: 10,
                      }}>
                        {I.sparkle(14, C.purple)}
                        <p style={{ color: C.textDim, fontSize: 11, margin: 0, fontFamily: font, lineHeight: 1.5 }}>
                          Análise feita por IA. Confirme ou edite os dados na próxima etapa.
                        </p>
                      </div>

                      <div style={{ display: "flex", gap: 10 }}>
                        <button onClick={() => setAiPhase("idle")} style={{
                          flex: 1, padding: 14, borderRadius: 14, cursor: "pointer",
                          background: C.card, border: `1.5px solid ${C.border}`,
                          color: C.textSec, fontSize: 14, fontWeight: 600, fontFamily: font,
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        }}>
                          {I.camera(16, C.accent)} Nova foto
                        </button>
                        <button onClick={() => {
                          setAddBreed(addSpecies === "dog" ? "Labrador Retriever" : "Siamês");
                          setAddStep(2);
                        }} style={{
                          flex: 2, padding: 14, borderRadius: 14, cursor: "pointer",
                          background: `linear-gradient(135deg, ${C.accent}, ${C.accentDark})`,
                          border: "none", color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: font,
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                          boxShadow: C.shadowAccent,
                        }}>
                          Confirmar {I.arrowRight(14, "#fff")}
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* ── STEP 2: Nome + Confirmar ── */}
              {addStep === 2 && (
                <>
                  {/* AI summary card */}
                  <div style={{
                    background: (addSpecies === "dog" ? C.accent : C.purple) + "06",
                    borderRadius: 18, padding: 18, marginBottom: 22,
                    border: `1px solid ${(addSpecies === "dog" ? C.accent : C.purple)}12`,
                    display: "flex", alignItems: "center", gap: 14,
                  }}>
                    <div style={{ width: 52, height: 52, borderRadius: 16, background: (addSpecies === "dog" ? C.accent : C.purple) + "12", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {addSpecies === "dog" ? I.dog(28, C.accent) : I.cat(28, C.purple)}
                    </div>
                    <div>
                      <p style={{ color: C.text, fontSize: 14, fontWeight: 700, margin: 0, fontFamily: font }}>{addBreed}</p>
                      <p style={{ color: C.textDim, fontSize: 11, margin: "2px 0 0", fontFamily: font }}>
                        {addSpecies === "dog" ? "~2-3 anos · Grande · ~30 kg" : "~1-2 anos · Médio · ~4 kg"}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                        {I.sparkle(10, C.purple)}
                        <span style={{ color: C.purple, fontSize: 9, fontWeight: 700, fontFamily: font }}>Identificado pela IA</span>
                      </div>
                    </div>
                  </div>

                  {/* Name input */}
                  <p style={{ color: C.textSec, fontSize: 13, fontWeight: 700, margin: "0 0 8px", fontFamily: font }}>Agora dê um nome ao seu pet</p>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 12,
                    background: C.card, borderRadius: 14, padding: "0 18px", height: 56,
                    border: `1.5px solid ${addName ? C.accent : C.border}`,
                    marginBottom: 22,
                    boxShadow: addName ? `0 0 0 3px ${C.accentMed}` : "none",
                    transition: "all 0.25s",
                  }}>
                    {addSpecies === "dog" ? I.dog(18, C.accent) : I.cat(18, C.purple)}
                    <input value={addName} onChange={e => setAddName(e.target.value)}
                      placeholder={addSpecies === "dog" ? "Como ele se chama?" : "Como ela se chama?"}
                      autoFocus
                      style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontFamily: font, fontSize: 16, color: C.text, height: "100%", fontWeight: 600 }} />
                    {I.mic(20, C.accent)}
                  </div>

                  {/* Optional edits */}
                  <p style={{ color: C.textGhost, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, margin: "0 0 12px", fontFamily: font }}>AJUSTES OPCIONAIS</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 22 }}>
                    {[
                      { l: "Nascimento exato", p: "DD/MM/AAAA (se souber)" },
                      { l: "Peso real (kg)", p: addSpecies === "dog" ? "IA estimou ~30" : "IA estimou ~4" },
                      { l: "Sexo", p: "Macho / Fêmea" },
                      { l: "Castrado?", p: "Sim / Não" },
                    ].map((f, i) => (
                      <div key={i}>
                        <p style={{ color: C.textDim, fontSize: 10, fontWeight: 700, margin: "0 0 6px", fontFamily: font }}>{f.l}</p>
                        <input placeholder={f.p} style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: `1.5px solid ${C.border}`, background: C.card, fontFamily: font, fontSize: 12, color: C.text, outline: "none", boxSizing: "border-box" }} />
                      </div>
                    ))}
                  </div>

                  {/* Final preview */}
                  {addName && (
                    <div style={{
                      background: C.card, borderRadius: 18, padding: 18, marginBottom: 22,
                      border: `1px solid ${C.border}`,
                      display: "flex", alignItems: "center", gap: 16,
                    }}>
                      <div style={{ width: 56, height: 56, borderRadius: 18, background: (addSpecies === "dog" ? C.accent : C.purple) + "12", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {addSpecies === "dog" ? I.dog(30, C.accent) : I.cat(30, C.purple)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ color: C.text, fontSize: 20, fontWeight: 700, margin: 0, fontFamily: font }}>{addName}</p>
                        <p style={{ color: C.textDim, fontSize: 12, margin: "3px 0 0", fontFamily: font }}>{addBreed}</p>
                      </div>
                      {I.check(18, C.success)}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => { setAddStep(1); setAiPhase("done"); }} style={{
                      flex: 1, padding: 14, borderRadius: 14, cursor: "pointer",
                      background: C.card, border: `1.5px solid ${C.border}`,
                      color: C.textSec, fontSize: 14, fontWeight: 600, fontFamily: font,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}>
                      {I.back(14, C.accent)} Voltar
                    </button>
                    <button onClick={() => setShowAdd(false)} disabled={!addName} style={{
                      flex: 2, padding: 14, borderRadius: 14, cursor: addName ? "pointer" : "default",
                      background: addName ? `linear-gradient(135deg, ${addSpecies === "dog" ? C.accent : C.purple}, ${addSpecies === "dog" ? C.accentDark : "#7D3FA0"})` : C.card,
                      border: addName ? "none" : `1.5px solid ${C.border}`,
                      color: addName ? "#fff" : C.textGhost,
                      fontSize: 14, fontWeight: 700, fontFamily: font,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      boxShadow: addName ? (addSpecies === "dog" ? C.shadowAccent : `0 8px 25px ${C.purple}30`) : "none",
                      opacity: addName ? 1 : 0.5,
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff" stroke="none"><ellipse cx="12" cy="17" rx="4.5" ry="4"/><circle cx="7" cy="10.5" r="2.2"/><circle cx="17" cy="10.5" r="2.2"/><circle cx="9.5" cy="6.5" r="1.8"/><circle cx="14.5" cy="6.5" r="1.8"/></svg>
                      Cadastrar {addName || "Pet"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <style>{`
          ::-webkit-scrollbar{width:0;height:0}
          input::placeholder{color:${C.placeholder} !important;opacity:1 !important}
          @keyframes breathe{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.04);opacity:0.85}}
          @keyframes fadeSlideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
          @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.8)}}
        `}</style>
      </div>
    </div>
  );
}
