import { useState, useRef } from "react";

// ======================== DESIGN TOKENS ========================
const C = {
  bg: "#F6F3EC", bgDeep: "#ECE7DB", cream: "#FFFDF5", warm: "#F9F5EC",
  card: "#FFFFFF", cardAlt: "#FDFAF2",
  primary: "#D4763A", primarySoft: "#D4763A0A", primaryMed: "#D4763A15", primaryDark: "#B8612E",
  sage: "#4A8F5E", sageSoft: "#4A8F5E08",
  sky: "#3A82C4", skySoft: "#3A82C408",
  coral: "#D06050", coralSoft: "#D0605008",
  plum: "#7E5AA8", plumSoft: "#7E5AA808",
  amber: "#CCA030", amberSoft: "#CCA03008",
  rose: "#C0607A", roseSoft: "#C0607A08",
  teal: "#2E9E8A", tealSoft: "#2E9E8A08",
  ink: "#2A1F14", inkSec: "#5A4D3E", inkDim: "#948570", inkGhost: "#BEB5A2",
  border: "#E0D8CA", borderLight: "#E8E0D4",
  shadow: "0 3px 24px rgba(42,31,20,0.06)",
  shadowLg: "0 8px 40px rgba(42,31,20,0.1)",
};
const font = "'DM Serif Display', Georgia, serif";
const fontSans = "'Nunito', -apple-system, sans-serif";
const fontMono = "'JetBrains Mono', monospace";

// ======================== ICONS ========================
const Ico = ({ type, size = 20, color = C.inkDim }) => {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" };
  const icons = {
    menu: <svg {...p}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
    x: <svg {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    plus: <svg {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    back: <svg {...p}><polyline points="15,18 9,12 15,6"/></svg>,
    check: <svg {...p} strokeWidth="2.5"><polyline points="20,6 9,17 4,12"/></svg>,
    bell: <svg {...p}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
    settings: <svg {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
    users: <svg {...p}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
    shield: <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    file: <svg {...p}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>,
    help: <svg {...p}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    alert: <svg {...p}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    cloud: <svg {...p}><path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/></svg>,
    logout: <svg {...p}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
    trash: <svg {...p}><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>,
    heart: <svg {...p}><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
    camera: <svg {...p}><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>,
    edit: <svg {...p}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    paw: <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><ellipse cx="12" cy="17" rx="4.5" ry="4"/><circle cx="7" cy="10.5" r="2.2"/><circle cx="17" cy="10.5" r="2.2"/><circle cx="9.5" cy="6.5" r="1.8"/><circle cx="14.5" cy="6.5" r="1.8"/></svg>,
    crown: <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><path d="M2.5 18.5L4 7l4.5 4L12 4l3.5 7L20 7l1.5 11.5z"/></svg>,
    star: <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>,
    activity: <svg {...p}><polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/></svg>,
    clock: <svg {...p}><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>,
    sparkle: <svg {...p} strokeWidth="1.5"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/></svg>,
    download: <svg {...p}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
    moon: <svg {...p}><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>,
    sun: <svg {...p}><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>,
    globe: <svg {...p}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
  };
  return icons[type] || null;
};

// ======================== PET DATA ========================
const petsData = [
  {
    id: "rex", name: "Rex", species: "dog", breed: "Labrador Retriever",
    age: "3 anos", weight: "32 kg", emoji: "🐕",
    color: C.primary, healthScore: 92, mood: "😊", moodLabel: "Feliz",
    vaccineStatus: "3/5", nextVet: "15 Abr 2026",
    lastActivity: "Passeio no parque · Hoje 16:45",
    photos: 127, alerts: 2, alertText: "2 vacinas vencidas",
  },
  {
    id: "luna", name: "Luna", species: "cat", breed: "Siamês",
    age: "2 anos", weight: "4.2 kg", emoji: "🐱",
    color: C.plum, healthScore: 98, mood: "😌", moodLabel: "Calma",
    vaccineStatus: "4/4", nextVet: "20 Mai 2026",
    lastActivity: "Dormiu no sol da janela · Hoje 14:00",
    photos: 85, alerts: 0, alertText: null,
  },
];

// ======================== DRAWER MENU ========================
const DrawerMenu = ({ open, onClose, onNavigate }) => {
  const menuSections = [
    {
      title: null,
      items: [
        { id: "prefs", icon: "settings", label: "Preferências", sub: "Idioma, notificações, tema", color: C.inkSec },
        { id: "assistants", icon: "users", label: "Assistentes", sub: "1 de 2 vagas preenchidas", color: C.sky, badge: "1/2" },
      ],
    },
    {
      title: "LEGAL",
      items: [
        { id: "privacy", icon: "shield", label: "Política de Privacidade", sub: "Como protegemos seus dados", color: C.sage },
        { id: "terms", icon: "file", label: "Termos de Uso", sub: "Regras e condições", color: C.amber },
      ],
    },
    {
      title: "SUPORTE",
      items: [
        { id: "help", icon: "help", label: "Ajuda", sub: "FAQ, tutoriais e contato", color: C.plum },
      ],
    },
    {
      title: "DADOS",
      items: [
        { id: "backup", icon: "cloud", label: "Backup e Restauração", sub: "Último backup: Hoje 03:00", color: C.teal, badge: "Auto" },
        { id: "danger", icon: "alert", label: "Zona de Perigo", sub: "Excluir conta e dados", color: C.coral },
      ],
    },
  ];

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{
        position: "absolute", inset: 0, zIndex: 40,
        background: open ? "rgba(42,31,20,0.4)" : "transparent",
        backdropFilter: open ? "blur(6px)" : "none",
        pointerEvents: open ? "auto" : "none",
        transition: "all 0.35s",
      }} />

      {/* Drawer */}
      <div style={{
        position: "absolute", top: 0, left: 0, bottom: 0, width: "82%", zIndex: 50,
        background: C.bg, borderRadius: "0 28px 28px 0",
        transform: open ? "translateX(0)" : "translateX(-105%)",
        transition: "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
        boxShadow: open ? C.shadowLg : "none",
        overflow: "auto",
      }}>
        {/* Profile header */}
        <div style={{
          padding: "50px 24px 24px",
          background: `linear-gradient(160deg, ${C.primary}10, ${C.cream})`,
          borderBottom: `1px solid ${C.borderLight}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 18,
              background: `linear-gradient(145deg, ${C.primary}, ${C.primaryDark})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, boxShadow: `0 4px 14px ${C.primary}25`,
            }}>👩</div>
            <div>
              <h3 style={{ color: C.ink, fontSize: 18, fontWeight: 700, margin: 0, fontFamily: font }}>Ana Martins</h3>
              <p style={{ color: C.inkDim, fontSize: 12, margin: "3px 0 0" }}>ana.martins@email.com</p>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6 }}>
                <Ico type="crown" size={12} color={C.primary} />
                <span style={{ color: C.primary, fontSize: 10, fontWeight: 800, fontFamily: fontSans }}>TUTORA PROPRIETÁRIA</span>
              </div>
            </div>
          </div>

          {/* Pet summary */}
          <div style={{ display: "flex", gap: 8 }}>
            {petsData.map(pet => (
              <div key={pet.id} style={{
                flex: 1, background: C.card, borderRadius: 14, padding: "10px 12px",
                border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8,
              }}>
                <span style={{ fontSize: 20 }}>{pet.emoji}</span>
                <div>
                  <p style={{ color: C.ink, fontSize: 12, fontWeight: 700, margin: 0, fontFamily: fontSans }}>{pet.name}</p>
                  <p style={{ color: C.inkDim, fontSize: 9, margin: "1px 0 0" }}>{pet.breed}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Menu Items */}
        <div style={{ padding: "10px 14px 30px" }}>
          {menuSections.map((sec, si) => (
            <div key={si}>
              {sec.title && (
                <p style={{ color: C.inkGhost, fontSize: 10, fontWeight: 800, letterSpacing: 1.5, margin: "20px 10px 8px", fontFamily: fontSans }}>{sec.title}</p>
              )}
              {sec.items.map((item) => (
                <button key={item.id} onClick={() => onNavigate(item.id)} style={{
                  display: "flex", alignItems: "center", gap: 14, width: "100%",
                  background: "transparent", border: "none", borderRadius: 16,
                  padding: "13px 12px", cursor: "pointer", textAlign: "left",
                  fontFamily: fontSans, transition: "all 0.15s",
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 13, flexShrink: 0,
                    background: item.color + "0A",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Ico type={item.icon} size={19} color={item.color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: item.color === C.coral ? C.coral : C.ink, fontSize: 14, fontWeight: 700, margin: 0 }}>{item.label}</p>
                    <p style={{ color: C.inkDim, fontSize: 11, margin: "2px 0 0" }}>{item.sub}</p>
                  </div>
                  {item.badge && (
                    <span style={{ background: item.color + "14", color: item.color, fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 10 }}>{item.badge}</span>
                  )}
                </button>
              ))}
            </div>
          ))}

          {/* Logout */}
          <div style={{ marginTop: 14, borderTop: `1px solid ${C.borderLight}`, paddingTop: 14 }}>
            <button onClick={onClose} style={{
              display: "flex", alignItems: "center", gap: 14, width: "100%",
              background: "transparent", border: "none", borderRadius: 16,
              padding: "13px 12px", cursor: "pointer", fontFamily: fontSans,
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 13, background: C.coral + "08", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Ico type="logout" size={19} color={C.coral} />
              </div>
              <div>
                <p style={{ color: C.coral, fontSize: 14, fontWeight: 700, margin: 0 }}>Sair do App</p>
                <p style={{ color: C.inkDim, fontSize: 11, margin: "2px 0 0" }}>Encerrar sessão</p>
              </div>
            </button>
          </div>

          {/* Version */}
          <p style={{ color: C.inkGhost, fontSize: 10, textAlign: "center", margin: "20px 0 0", fontFamily: fontMono }}>
            Rede Solidária Pets v1.0.0
          </p>
        </div>
      </div>
    </>
  );
};

// ======================== SUB-SCREENS (menu items) ========================
const SubScreen = ({ id, onBack }) => {
  const screens = {
    prefs: {
      title: "Preferências", icon: "settings", content: () => (
        <>
          {/* Notifications */}
          <SectionLabel>NOTIFICAÇÕES</SectionLabel>
          {[
            { label: "Alertas de saúde", sub: "Vacinas vencidas, exames pendentes", on: true },
            { label: "Alertas comunitários", sub: "Pet perdido, SOS ração", on: true },
            { label: "Lembretes de cuidado", sub: "Passeio, medicação, alimentação", on: true },
            { label: "Atualizações da rede", sub: "Novos amigos, playdates", on: false },
          ].map((n, i) => <ToggleRow key={i} {...n} />)}

          <SectionLabel>APARÊNCIA</SectionLabel>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {[
              { icon: "sun", label: "Claro", active: true },
              { icon: "moon", label: "Escuro", active: false },
              { icon: "settings", label: "Sistema", active: false },
            ].map((t, i) => (
              <button key={i} style={{
                flex: 1, padding: "14px 8px", borderRadius: 14, cursor: "pointer",
                background: t.active ? C.primary + "12" : C.card,
                border: t.active ? `1.5px solid ${C.primary}30` : `1px solid ${C.border}`,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                fontFamily: fontSans, fontSize: 11, fontWeight: 700, color: t.active ? C.primary : C.inkDim,
              }}>
                <Ico type={t.icon} size={20} color={t.active ? C.primary : C.inkDim} />
                {t.label}
              </button>
            ))}
          </div>

          <SectionLabel>IDIOMA</SectionLabel>
          {[
            { flag: "🇧🇷", label: "Português (Brasil)", active: true },
            { flag: "🇺🇸", label: "English", active: false },
            { flag: "🇪🇸", label: "Español", active: false },
          ].map((l, i) => (
            <button key={i} style={{
              display: "flex", alignItems: "center", gap: 12, width: "100%",
              background: l.active ? C.primary + "08" : C.card,
              borderRadius: 14, padding: "13px 16px", marginBottom: 8,
              border: l.active ? `1.5px solid ${C.primary}25` : `1px solid ${C.border}`,
              cursor: "pointer", fontFamily: fontSans,
            }}>
              <span style={{ fontSize: 22 }}>{l.flag}</span>
              <span style={{ color: l.active ? C.primary : C.inkSec, fontSize: 14, fontWeight: l.active ? 700 : 500, flex: 1 }}>{l.label}</span>
              {l.active && <Ico type="check" size={18} color={C.primary} />}
            </button>
          ))}

          <SectionLabel>UNIDADES</SectionLabel>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1, background: C.card, borderRadius: 14, padding: "12px 14px", border: `1px solid ${C.border}` }}>
              <p style={{ color: C.inkDim, fontSize: 10, fontWeight: 700, margin: "0 0 4px" }}>PESO</p>
              <p style={{ color: C.ink, fontSize: 14, fontWeight: 700, margin: 0 }}>Quilogramas (kg)</p>
            </div>
            <div style={{ flex: 1, background: C.card, borderRadius: 14, padding: "12px 14px", border: `1px solid ${C.border}` }}>
              <p style={{ color: C.inkDim, fontSize: 10, fontWeight: 700, margin: "0 0 4px" }}>TEMPERATURA</p>
              <p style={{ color: C.ink, fontSize: 14, fontWeight: 700, margin: 0 }}>Celsius (°C)</p>
            </div>
          </div>
        </>
      ),
    },
    backup: {
      title: "Backup e Restauração", icon: "cloud", content: () => (
        <>
          <div style={{ background: C.teal + "08", borderRadius: 20, padding: 22, marginBottom: 18, border: `1px solid ${C.teal}12`, textAlign: "center" }}>
            <Ico type="cloud" size={36} color={C.teal} />
            <p style={{ color: C.teal, fontSize: 18, fontWeight: 700, margin: "12px 0 4px", fontFamily: fontSans }}>Backup Automático Ativo</p>
            <p style={{ color: C.inkDim, fontSize: 12, margin: "0 0 14px" }}>Seus dados estão seguros na nuvem</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <span style={{ background: C.teal + "14", color: C.teal, fontSize: 10, fontWeight: 700, padding: "4px 12px", borderRadius: 10 }}>Último: Hoje 03:00</span>
              <span style={{ background: C.sage + "14", color: C.sage, fontSize: 10, fontWeight: 700, padding: "4px 12px", borderRadius: 10 }}>Criptografado</span>
            </div>
          </div>

          <SectionLabel>FREQUÊNCIA</SectionLabel>
          {["Diário (recomendado)", "Semanal", "Apenas manual"].map((f, i) => (
            <button key={i} style={{
              display: "flex", alignItems: "center", gap: 12, width: "100%",
              background: i === 0 ? C.teal + "06" : C.card, borderRadius: 14, padding: "13px 16px",
              border: i === 0 ? `1.5px solid ${C.teal}20` : `1px solid ${C.border}`,
              marginBottom: 8, cursor: "pointer", fontFamily: fontSans,
            }}>
              <div style={{ width: 20, height: 20, borderRadius: 10, border: `2px solid ${i === 0 ? C.teal : C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {i === 0 && <div style={{ width: 10, height: 10, borderRadius: 5, background: C.teal }} />}
              </div>
              <span style={{ color: i === 0 ? C.teal : C.inkSec, fontSize: 13, fontWeight: i === 0 ? 700 : 500 }}>{f}</span>
            </button>
          ))}

          <SectionLabel>O QUE É SALVO</SectionLabel>
          {["Perfis dos pets e dados pessoais", "Prontuário completo de saúde", "Diário de vida e fotos", "Cápsulas do tempo", "Testamento emocional", "Planos, conquistas e nutrição"].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Ico type="check" size={14} color={C.sage} />
              <span style={{ color: C.inkSec, fontSize: 12, fontFamily: fontSans }}>{item}</span>
            </div>
          ))}

          <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
            <button style={{ flex: 1, padding: 14, borderRadius: 14, cursor: "pointer", background: C.teal, border: "none", color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: fontSans, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Ico type="cloud" size={16} color="#fff" /> Fazer Backup Agora
            </button>
            <button style={{ flex: 1, padding: 14, borderRadius: 14, cursor: "pointer", background: C.card, border: `1px solid ${C.border}`, color: C.inkSec, fontSize: 13, fontWeight: 700, fontFamily: fontSans, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Ico type="download" size={16} color={C.inkDim} /> Restaurar
            </button>
          </div>
        </>
      ),
    },
    danger: {
      title: "Zona de Perigo", icon: "alert", content: () => (
        <>
          <div style={{ background: C.coral + "06", borderRadius: 18, padding: "16px 18px", marginBottom: 18, border: `1px solid ${C.coral}12` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Ico type="alert" size={18} color={C.coral} />
              <span style={{ color: C.coral, fontSize: 14, fontWeight: 700 }}>Ações irreversíveis</span>
            </div>
            <p style={{ color: C.inkSec, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
              As ações nesta seção são permanentes e não podem ser desfeitas. Faça um backup antes de prosseguir.
            </p>
          </div>

          {[
            { icon: "trash", label: "Excluir dados de um pet", sub: "Remove todo o histórico, diário e fotos de um pet específico", color: C.coral },
            { icon: "users", label: "Remover todos os assistentes", sub: "Revoga acesso de todos os assistentes imediatamente", color: C.amber },
            { icon: "trash", label: "Excluir minha conta", sub: "Remove permanentemente sua conta e todos os dados", color: C.coral },
          ].map((a, i) => (
            <button key={i} style={{
              display: "flex", alignItems: "center", gap: 14, width: "100%",
              background: C.card, borderRadius: 18, padding: "16px 18px", marginBottom: 10,
              border: `1px solid ${a.color}15`, cursor: "pointer", fontFamily: fontSans, textAlign: "left",
            }}>
              <div style={{ width: 42, height: 42, borderRadius: 14, background: a.color + "08", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Ico type={a.icon} size={20} color={a.color} />
              </div>
              <div>
                <p style={{ color: a.color, fontSize: 14, fontWeight: 700, margin: 0 }}>{a.label}</p>
                <p style={{ color: C.inkDim, fontSize: 11, margin: "3px 0 0", lineHeight: 1.4 }}>{a.sub}</p>
              </div>
            </button>
          ))}

          <p style={{ color: C.inkGhost, fontSize: 11, textAlign: "center", margin: "14px 0 0", lineHeight: 1.6 }}>
            Apenas o tutor proprietário tem acesso a esta seção. Assistentes não podem excluir dados.
          </p>
        </>
      ),
    },
  };

  const s = screens[id];
  if (!s) return (
    <div style={{ padding: "0 20px 30px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 0 20px" }}>
        <button onClick={onBack} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, width: 38, height: 38, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Ico type="back" size={18} color={C.ink} />
        </button>
        <h2 style={{ color: C.ink, fontSize: 20, fontWeight: 700, margin: 0, fontFamily: font }}>
          {id === "privacy" ? "Política de Privacidade" : id === "terms" ? "Termos de Uso" : id === "help" ? "Central de Ajuda" : id === "assistants" ? "Gerenciar Assistentes" : ""}
        </h2>
      </div>
      <div style={{ background: C.card, borderRadius: 20, padding: 22, border: `1px solid ${C.border}`, minHeight: 200 }}>
        <p style={{ color: C.inkSec, fontSize: 14, lineHeight: 1.8, margin: 0, fontFamily: fontSans }}>
          {id === "privacy" && "A Rede Solidária Pets respeita sua privacidade e se compromete a proteger os dados pessoais dos tutores e de seus pets. Todos os dados são criptografados de ponta a ponta, armazenados em servidores seguros e nunca são compartilhados com terceiros sem seu consentimento explícito. Dados de saúde animal podem ser anonimizados e utilizados para pesquisa científica apenas com autorização. Você tem direito de acessar, exportar e excluir todos os seus dados a qualquer momento."}
          {id === "terms" && "Ao utilizar a Rede Solidária Pets, você concorda com estes termos. O app é destinado a tutores de cães e gatos. Cada conta de tutor pode cadastrar múltiplos pets e até 2 assistentes. Assistentes têm acesso a todas as funcionalidades exceto exclusão de dados. O tutor é responsável pelas informações inseridas. A IA fornece sugestões informativas e não substitui consultas veterinárias profissionais. A Rede Solidária Pets não se responsabiliza por diagnósticos baseados exclusivamente nas análises de IA."}
          {id === "help" && "Precisa de ajuda? Explore nosso FAQ, tutoriais em vídeo ou entre em contato com nossa equipe de suporte. Estamos disponíveis de segunda a sexta, das 9h às 18h. Para emergências com pets, utilize o botão SOS na aba Aldeia do app."}
          {id === "assistants" && "Gerencie seus assistentes na tela de Gerenciamento de Acessos. Você pode convidar até 2 assistentes por email. Cada assistente cria sua própria conta com senha e biometria."}
        </p>
      </div>
    </div>
  );

  return (
    <div style={{ padding: "0 20px 30px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 0 20px" }}>
        <button onClick={onBack} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, width: 38, height: 38, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Ico type="back" size={18} color={C.ink} />
        </button>
        <h2 style={{ color: C.ink, fontSize: 20, fontWeight: 700, margin: 0, fontFamily: font }}>{s.title}</h2>
      </div>
      {s.content()}
    </div>
  );
};

const SectionLabel = ({ children }) => (
  <p style={{ color: C.inkGhost, fontSize: 10, fontWeight: 800, letterSpacing: 1.5, margin: "22px 0 10px", fontFamily: fontSans }}>{children}</p>
);

const ToggleRow = ({ label, sub, on }) => {
  const [active, setActive] = useState(on);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: `1px solid ${C.borderLight}` }}>
      <div style={{ flex: 1 }}>
        <p style={{ color: C.ink, fontSize: 13, fontWeight: 600, margin: 0, fontFamily: fontSans }}>{label}</p>
        <p style={{ color: C.inkDim, fontSize: 11, margin: "2px 0 0" }}>{sub}</p>
      </div>
      <button onClick={() => setActive(!active)} style={{
        width: 48, height: 28, borderRadius: 14, cursor: "pointer",
        background: active ? C.sage : C.bgDeep, border: `1px solid ${active ? C.sage : C.border}`,
        position: "relative", transition: "all 0.25s",
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: 11, background: C.cream,
          position: "absolute", top: 2, left: active ? 23 : 2,
          transition: "left 0.25s", boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
        }} />
      </button>
    </div>
  );
};

// ======================== ADD PET MODAL ========================
const AddPetModal = ({ onClose }) => {
  const [step, setStep] = useState(0);
  const [species, setSpecies] = useState(null);
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");

  const dogBreeds = ["Labrador Retriever", "Golden Retriever", "Bulldog Francês", "Poodle", "Pastor Alemão", "Shih Tzu", "Yorkshire", "Rottweiler", "Border Collie", "Vira-lata (SRD)"];
  const catBreeds = ["Siamês", "Persa", "Maine Coon", "Bengal", "Ragdoll", "British Shorthair", "Sphynx", "Angorá", "Abissínio", "Vira-lata (SRD)"];

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 50, background: "rgba(42,31,20,0.5)", backdropFilter: "blur(10px)", display: "flex", alignItems: "flex-end" }}>
      <div style={{ background: C.bg, borderRadius: "32px 32px 0 0", width: "100%", maxHeight: "88%", overflow: "auto", padding: "8px 22px 36px" }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 16px" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: C.inkGhost }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <h3 style={{ color: C.ink, fontSize: 22, fontWeight: 700, margin: 0, fontFamily: font }}>Novo Pet</h3>
          <button onClick={onClose} style={{ background: C.bgDeep, border: "none", borderRadius: 12, width: 36, height: 36, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Ico type="x" size={18} color={C.inkSec} />
          </button>
        </div>

        {/* Progress */}
        <div style={{ display: "flex", gap: 5, margin: "14px 0 22px" }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? C.primary : C.bgDeep, transition: "background 0.3s" }} />
          ))}
        </div>

        {step === 0 && (
          <>
            <p style={{ color: C.inkSec, fontSize: 14, margin: "0 0 18px", fontFamily: fontSans }}>Que tipo de pet você tem?</p>
            <div style={{ display: "flex", gap: 12 }}>
              {[
                { id: "dog", emoji: "🐕", label: "Cachorro", color: C.primary },
                { id: "cat", emoji: "🐱", label: "Gato", color: C.plum },
              ].map(s => (
                <button key={s.id} onClick={() => { setSpecies(s.id); setStep(1); }} style={{
                  flex: 1, padding: "30px 16px", borderRadius: 22, cursor: "pointer",
                  background: C.card, border: `2px solid ${C.border}`,
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
                  fontFamily: fontSans, transition: "all 0.2s",
                }}>
                  <span style={{ fontSize: 52 }}>{s.emoji}</span>
                  <span style={{ color: C.ink, fontSize: 16, fontWeight: 700 }}>{s.label}</span>
                </button>
              ))}
            </div>
            <p style={{ color: C.inkGhost, fontSize: 12, textAlign: "center", margin: "18px 0 0", fontFamily: fontSans }}>
              No momento aceitamos apenas cães e gatos
            </p>
          </>
        )}

        {step === 1 && (
          <>
            <p style={{ color: C.inkSec, fontSize: 14, margin: "0 0 16px", fontFamily: fontSans }}>Informações básicas</p>

            {/* Photo */}
            <div style={{
              width: 90, height: 90, borderRadius: 28, margin: "0 auto 20px",
              background: C.bgDeep, border: `2px dashed ${C.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", flexDirection: "column", gap: 4,
            }}>
              <Ico type="camera" size={24} color={C.inkGhost} />
              <span style={{ color: C.inkGhost, fontSize: 9, fontFamily: fontSans }}>Foto</span>
            </div>

            <div style={{ marginBottom: 14 }}>
              <p style={{ color: C.inkSec, fontSize: 12, fontWeight: 700, margin: "0 0 6px" }}>Nome do pet</p>
              <input value={name} onChange={e => setName(e.target.value)} placeholder={species === "dog" ? "Ex: Rex, Thor, Luna..." : "Ex: Luna, Mimi, Simba..."}
                style={{ width: "100%", padding: "13px 16px", borderRadius: 14, border: `1.5px solid ${C.border}`, background: C.card, fontFamily: fontSans, fontSize: 14, color: C.ink, outline: "none", boxSizing: "border-box" }} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <p style={{ color: C.inkSec, fontSize: 12, fontWeight: 700, margin: "0 0 6px" }}>Raça</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {(species === "dog" ? dogBreeds : catBreeds).map(b => (
                  <button key={b} onClick={() => setBreed(b)} style={{
                    padding: "8px 14px", borderRadius: 12, cursor: "pointer",
                    background: breed === b ? (species === "dog" ? C.primary : C.plum) + "14" : C.card,
                    border: `1.5px solid ${breed === b ? (species === "dog" ? C.primary : C.plum) + "30" : C.border}`,
                    color: breed === b ? (species === "dog" ? C.primary : C.plum) : C.inkSec,
                    fontSize: 12, fontWeight: breed === b ? 700 : 500, fontFamily: fontSans,
                  }}>{b}</button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button onClick={() => setStep(0)} style={{ flex: 1, padding: 14, borderRadius: 14, cursor: "pointer", background: C.card, border: `1px solid ${C.border}`, color: C.inkSec, fontSize: 14, fontWeight: 600, fontFamily: fontSans }}>← Voltar</button>
              <button onClick={() => name && breed && setStep(2)} style={{
                flex: 2, padding: 14, borderRadius: 14, cursor: "pointer",
                background: name && breed ? C.primary : C.bgDeep,
                border: "none", color: name && breed ? "#fff" : C.inkGhost,
                fontSize: 14, fontWeight: 700, fontFamily: fontSans,
                opacity: name && breed ? 1 : 0.5,
              }}>Próximo →</button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <p style={{ color: C.inkSec, fontSize: 14, margin: "0 0 16px", fontFamily: fontSans }}>Detalhes adicionais (opcionais)</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              {[
                { label: "Data de nascimento", placeholder: "DD/MM/AAAA" },
                { label: "Peso (kg)", placeholder: "Ex: 32" },
                { label: "Sexo", placeholder: "Macho / Fêmea" },
                { label: "Castrado?", placeholder: "Sim / Não" },
              ].map((f, i) => (
                <div key={i}>
                  <p style={{ color: C.inkDim, fontSize: 10, fontWeight: 700, margin: "0 0 5px" }}>{f.label}</p>
                  <input placeholder={f.placeholder} style={{
                    width: "100%", padding: "11px 12px", borderRadius: 12,
                    border: `1px solid ${C.border}`, background: C.card,
                    fontFamily: fontSans, fontSize: 13, color: C.ink, outline: "none", boxSizing: "border-box",
                  }} />
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 14 }}>
              <p style={{ color: C.inkDim, fontSize: 10, fontWeight: 700, margin: "0 0 5px" }}>Microchip (opcional)</p>
              <input placeholder="Número do microchip" style={{
                width: "100%", padding: "11px 14px", borderRadius: 12,
                border: `1px solid ${C.border}`, background: C.card,
                fontFamily: fontMono, fontSize: 13, color: C.ink, outline: "none", boxSizing: "border-box",
              }} />
            </div>

            {/* Summary */}
            <div style={{
              background: (species === "dog" ? C.primary : C.plum) + "06",
              borderRadius: 18, padding: "16px 18px", marginBottom: 18,
              border: `1px solid ${(species === "dog" ? C.primary : C.plum)}10`,
              display: "flex", alignItems: "center", gap: 14,
            }}>
              <span style={{ fontSize: 36 }}>{species === "dog" ? "🐕" : "🐱"}</span>
              <div>
                <p style={{ color: C.ink, fontSize: 17, fontWeight: 700, margin: 0, fontFamily: font }}>{name}</p>
                <p style={{ color: C.inkDim, fontSize: 12, margin: "2px 0 0" }}>{breed} · {species === "dog" ? "Cachorro" : "Gato"}</p>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, padding: 14, borderRadius: 14, cursor: "pointer", background: C.card, border: `1px solid ${C.border}`, color: C.inkSec, fontSize: 14, fontWeight: 600, fontFamily: fontSans }}>← Voltar</button>
              <button onClick={onClose} style={{
                flex: 2, padding: 14, borderRadius: 14, cursor: "pointer",
                background: `linear-gradient(135deg, ${species === "dog" ? C.primary : C.plum}, ${species === "dog" ? C.primaryDark : "#6A48A0"})`,
                border: "none", color: "#fff", fontSize: 14, fontWeight: 800, fontFamily: fontSans,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
                <Ico type="paw" size={18} color="#fff" /> Cadastrar {name}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ======================== MAIN APP ========================
export default function MeusPets() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showAddPet, setShowAddPet] = useState(false);
  const [subScreen, setSubScreen] = useState(null);
  const [selectedPet, setSelectedPet] = useState(null);
  const containerRef = useRef();

  const scrollTop = () => { if (containerRef.current) containerRef.current.scrollTop = 0; };
  const navMenu = (id) => { setDrawerOpen(false); setSubScreen(id); scrollTop(); };

  if (subScreen) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", padding: 20, background: `linear-gradient(170deg, #EDE8DC 0%, #E3DACB 50%, #D9D0C0 100%)`, fontFamily: fontSans }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Nunito:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <div ref={containerRef} style={{ width: 400, maxHeight: 820, background: C.bg, borderRadius: 40, overflow: "auto", position: "relative", boxShadow: `0 20px 80px rgba(42,31,20,0.12), 0 0 0 1px ${C.border}` }}>
          <div style={{ position: "sticky", top: 0, zIndex: 30, display: "flex", justifyContent: "center", padding: "8px 0 0", background: `linear-gradient(to bottom, ${C.bg}, transparent)` }}>
            <div style={{ width: 120, height: 28, borderRadius: 20, background: "#1a1a1a" }} />
          </div>
          <SubScreen id={subScreen} onBack={() => { setSubScreen(null); scrollTop(); }} />
          <style>{`::-webkit-scrollbar{width:0;height:0}`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center",
      minHeight: "100vh", padding: 20,
      background: `linear-gradient(170deg, #EDE8DC 0%, #E3DACB 50%, #D9D0C0 100%)`,
      fontFamily: fontSans,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Nunito:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div ref={containerRef} style={{
        width: 400, maxHeight: 820, background: C.bg, borderRadius: 40,
        overflow: "auto", position: "relative",
        boxShadow: `0 20px 80px rgba(42,31,20,0.12), 0 0 0 1px ${C.border}`,
      }}>
        {/* Notch */}
        <div style={{ position: "sticky", top: 0, zIndex: 30, display: "flex", justifyContent: "center", padding: "8px 0 0", background: `linear-gradient(to bottom, ${C.bg}, transparent)` }}>
          <div style={{ width: 120, height: 28, borderRadius: 20, background: "#1a1a1a" }} />
        </div>

        {/* Header */}
        <div style={{ padding: "12px 20px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={() => setDrawerOpen(true)} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, width: 42, height: 42, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: C.shadow }}>
            <Ico type="menu" size={20} color={C.ink} />
          </button>
          <div style={{ textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Ico type="paw" size={18} color={C.primary} />
              <h1 style={{ color: C.ink, fontSize: 19, fontWeight: 700, margin: 0, fontFamily: font }}>
                Rede Solidária <span style={{ color: C.primary }}>Pets</span>
              </h1>
            </div>
          </div>
          <button style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, width: 42, height: 42, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", boxShadow: C.shadow }}>
            <Ico type="bell" size={20} color={C.ink} />
            <div style={{ position: "absolute", top: 8, right: 9, width: 8, height: 8, borderRadius: 4, background: C.coral, border: `2px solid ${C.bg}` }} />
          </button>
        </div>

        {/* Welcome */}
        <div style={{ padding: "20px 20px 6px" }}>
          <p style={{ color: C.inkDim, fontSize: 13, margin: "0 0 2px" }}>Bem-vinda de volta,</p>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h2 style={{ color: C.ink, fontSize: 24, fontWeight: 700, margin: 0, fontFamily: font }}>Ana!</h2>
            <span style={{ fontSize: 22 }}>👋</span>
          </div>
        </div>

        {/* Pet Summary Bar */}
        <div style={{
          margin: "14px 20px 0", padding: "14px 18px",
          background: `linear-gradient(135deg, ${C.primary}0A, ${C.plum}06)`,
          borderRadius: 18, border: `1px solid ${C.primary}0A`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Ico type="heart" size={16} color={C.primary} />
            <span style={{ color: C.inkSec, fontSize: 13, fontWeight: 600 }}>{petsData.length} pets cadastrados</span>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {petsData.map(p => <span key={p.id} style={{ fontSize: 18 }}>{p.emoji}</span>)}
          </div>
        </div>

        {/* Alerts */}
        {petsData.some(p => p.alerts > 0) && (
          <div style={{
            margin: "12px 20px 0", padding: "12px 16px",
            background: C.coral + "06", borderRadius: 16,
            border: `1px solid ${C.coral}12`, display: "flex", alignItems: "center", gap: 10,
          }}>
            <Ico type="alert" size={18} color={C.coral} />
            <p style={{ color: C.coral, fontSize: 12, fontWeight: 700, margin: 0, flex: 1 }}>
              Rex tem {petsData[0].alerts} alertas pendentes
            </p>
            <span style={{ color: C.coral, fontSize: 11 }}>Ver →</span>
          </div>
        )}

        {/* Section Title */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 20px 12px" }}>
          <p style={{ color: C.inkGhost, fontSize: 11, fontWeight: 800, letterSpacing: 1.5, margin: 0 }}>MEUS PETS</p>
          <button onClick={() => setShowAddPet(true)} style={{
            display: "flex", alignItems: "center", gap: 5,
            background: C.primary + "12", border: `1px solid ${C.primary}18`,
            borderRadius: 10, padding: "6px 12px", cursor: "pointer",
          }}>
            <Ico type="plus" size={14} color={C.primary} />
            <span style={{ color: C.primary, fontSize: 11, fontWeight: 800, fontFamily: fontSans }}>Novo Pet</span>
          </button>
        </div>

        {/* Pet Cards */}
        <div style={{ padding: "0 20px" }}>
          {petsData.map((pet) => (
            <button key={pet.id} onClick={() => setSelectedPet(pet.id)} style={{
              width: "100%", textAlign: "left", cursor: "pointer",
              background: C.card, borderRadius: 26, marginBottom: 16,
              border: `1px solid ${C.border}`, overflow: "hidden",
              fontFamily: fontSans, boxShadow: C.shadow, transition: "all 0.2s",
            }}>
              {/* Pet header */}
              <div style={{
                background: `linear-gradient(145deg, ${pet.color}12, ${pet.color}06)`,
                padding: "20px 22px 16px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{
                    width: 68, height: 68, borderRadius: 22,
                    background: C.cream, border: `2.5px solid ${pet.color}30`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 36, boxShadow: `0 4px 16px ${pet.color}12`,
                  }}>{pet.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <h3 style={{ color: C.ink, fontSize: 22, fontWeight: 700, margin: 0, fontFamily: font }}>{pet.name}</h3>
                      <span style={{ fontSize: 20 }}>{pet.mood}</span>
                    </div>
                    <p style={{ color: C.inkDim, fontSize: 12, margin: "4px 0 0" }}>{pet.breed}</p>
                    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                      <span style={{ background: C.card, color: C.inkDim, fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 8, border: `1px solid ${C.borderLight}` }}>{pet.age}</span>
                      <span style={{ background: C.card, color: C.inkDim, fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 8, border: `1px solid ${C.borderLight}` }}>{pet.weight}</span>
                      <span style={{ background: C.card, color: C.inkDim, fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 8, border: `1px solid ${C.borderLight}` }}>{pet.species === "dog" ? "🐕 Cão" : "🐱 Gato"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div style={{ padding: "14px 22px 18px" }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                  <div style={{ flex: 1, background: C.warm, borderRadius: 14, padding: "10px 12px", textAlign: "center" }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 12, margin: "0 auto 6px",
                      background: pet.healthScore >= 90 ? C.sage + "12" : C.amber + "12",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <span style={{ color: pet.healthScore >= 90 ? C.sage : C.amber, fontSize: 14, fontWeight: 800, fontFamily: fontMono }}>{pet.healthScore}</span>
                    </div>
                    <p style={{ color: C.inkDim, fontSize: 9, margin: 0 }}>Saúde IA</p>
                  </div>
                  <div style={{ flex: 1, background: C.warm, borderRadius: 14, padding: "10px 12px", textAlign: "center" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 12, margin: "0 auto 6px", background: C.sky + "10", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ color: C.sky, fontSize: 14, fontWeight: 800 }}>{pet.vaccineStatus}</span>
                    </div>
                    <p style={{ color: C.inkDim, fontSize: 9, margin: 0 }}>Vacinas</p>
                  </div>
                  <div style={{ flex: 1, background: C.warm, borderRadius: 14, padding: "10px 12px", textAlign: "center" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 12, margin: "0 auto 6px", background: C.plum + "10", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ color: C.plum, fontSize: 14, fontWeight: 800 }}>{pet.photos}</span>
                    </div>
                    <p style={{ color: C.inkDim, fontSize: 9, margin: 0 }}>Memórias</p>
                  </div>
                </div>

                {/* Alert or Last Activity */}
                {pet.alerts > 0 ? (
                  <div style={{
                    background: C.coral + "06", borderRadius: 12, padding: "10px 14px",
                    border: `1px solid ${C.coral}10`, display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <Ico type="alert" size={15} color={C.coral} />
                    <span style={{ color: C.coral, fontSize: 12, fontWeight: 700, flex: 1 }}>{pet.alertText}</span>
                  </div>
                ) : (
                  <div style={{
                    background: C.sage + "06", borderRadius: 12, padding: "10px 14px",
                    border: `1px solid ${C.sage}10`, display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <Ico type="check" size={15} color={C.sage} />
                    <span style={{ color: C.sage, fontSize: 12, fontWeight: 600 }}>Tudo em dia!</span>
                  </div>
                )}

                <p style={{ color: C.inkGhost, fontSize: 11, margin: "10px 0 0", display: "flex", alignItems: "center", gap: 5 }}>
                  <Ico type="clock" size={12} color={C.inkGhost} />
                  {pet.lastActivity}
                </p>
              </div>
            </button>
          ))}

          {/* Add Pet Card */}
          <button onClick={() => setShowAddPet(true)} style={{
            width: "100%", background: C.warm, borderRadius: 26, padding: "32px 20px",
            border: `2px dashed ${C.border}`, cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
            marginBottom: 16, fontFamily: fontSans,
          }}>
            <div style={{
              width: 60, height: 60, borderRadius: 20,
              background: C.bgDeep, border: `2px dashed ${C.inkGhost}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Ico type="plus" size={26} color={C.inkGhost} />
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ color: C.inkDim, fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}>Adicionar Novo Pet</p>
              <p style={{ color: C.inkGhost, fontSize: 12, margin: 0 }}>Apenas cães 🐕 e gatos 🐱</p>
            </div>
          </button>
        </div>

        {/* Quick AI insight */}
        <div style={{
          margin: "0 20px 30px", padding: "18px 20px",
          background: `linear-gradient(145deg, ${C.primary}06, ${C.plum}04)`,
          borderRadius: 20, border: `1px solid ${C.primary}08`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <Ico type="sparkle" size={15} color={C.primary} />
            <span style={{ color: C.primary, fontSize: 12, fontWeight: 700 }}>RESUMO DA IA</span>
          </div>
          <p style={{ color: C.inkSec, fontSize: 13, lineHeight: 1.7, margin: 0 }}>
            <b>Rex</b> precisa de atenção nas vacinas (2 vencidas).
            <b> Luna</b> está com saúde perfeita. No geral, seus pets estão
            <span style={{ color: C.sage, fontWeight: 700 }}> bem cuidados</span>. Próxima consulta do Rex: 15 Abr.
          </p>
        </div>

        {/* Drawer */}
        <DrawerMenu open={drawerOpen} onClose={() => setDrawerOpen(false)} onNavigate={navMenu} />

        {/* Add Pet Modal */}
        {showAddPet && <AddPetModal onClose={() => setShowAddPet(false)} />}

        <style>{`::-webkit-scrollbar{width:0;height:0}`}</style>
      </div>
    </div>
  );
}
