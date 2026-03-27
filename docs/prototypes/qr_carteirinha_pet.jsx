import { useState, useRef } from "react";

// ======================== DESIGN TOKENS ========================
const C = {
  bg: "#F5F2EC", bgDeep: "#EBE6DC", cream: "#FFFDF6", warm: "#F9F5ED",
  card: "#FFFFFF", cardAlt: "#FDFAF4",
  navy: "#1A2744", navySoft: "#1A274408", navyMed: "#1A274415",
  accent: "#2D6A9F", accentSoft: "#2D6A9F08", accentMed: "#2D6A9F15", accentGlow: "#2D6A9F22",
  teal: "#1D8E7E", tealSoft: "#1D8E7E08",
  ember: "#D4763A", emberSoft: "#D4763A08",
  sage: "#5A8F6B", sageSoft: "#5A8F6B08",
  rose: "#C4556A", roseSoft: "#C4556A08",
  plum: "#7B5AA0", plumSoft: "#7B5AA008",
  gold: "#C49A38", goldSoft: "#C49A3808",
  ink: "#1A2030", inkSec: "#4A5568", inkDim: "#8896A8", inkGhost: "#BCC6D2",
  border: "#DFD8CC", borderLight: "#E8E2D8",
  shadow: "0 3px 20px rgba(26,39,68,0.06)",
  shadowMd: "0 6px 30px rgba(26,39,68,0.08)",
};
const font = "'DM Serif Display', 'Georgia', serif";
const fontSans = "'Outfit', -apple-system, sans-serif";
const fontMono = "'IBM Plex Mono', monospace";

// ======================== ICONS ========================
const Ico = ({ type, size = 20, color = C.inkDim }) => {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" };
  const icons = {
    back: <svg {...p}><polyline points="15,18 9,12 15,6"/></svg>,
    qr: <svg {...p}><rect x="2" y="2" width="7" height="7" rx="1"/><rect x="15" y="2" width="7" height="7" rx="1"/><rect x="2" y="15" width="7" height="7" rx="1"/><rect x="15" y="15" width="4" height="4"/><line x1="22" y1="19" x2="22" y2="22"/><line x1="19" y1="22" x2="22" y2="22"/></svg>,
    share: <svg {...p}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
    download: <svg {...p}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
    printer: <svg {...p}><polyline points="6,9 6,2 18,2 18,9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
    shield: <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    check: <svg {...p} strokeWidth="2.5"><polyline points="20,6 9,17 4,12"/></svg>,
    alert: <svg {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
    heart: <svg {...p}><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
    file: <svg {...p}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>,
    camera: <svg {...p}><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>,
    scan: <svg {...p}><path d="M2 7V2h5M17 2h5v5M22 17v5h-5M7 22H2v-5"/><rect x="7" y="7" width="10" height="10" rx="1"/></svg>,
    phone: <svg {...p}><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>,
    wifi: <svg {...p}><path d="M5 12.55a11 11 0 0114.08 0"/><path d="M1.42 9a16 16 0 0121.16 0"/><path d="M8.53 16.11a6 6 0 016.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>,
    clock: <svg {...p}><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>,
    map: <svg {...p}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
    copy: <svg {...p}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>,
    eye: <svg {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    paw: <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><ellipse cx="12" cy="17" rx="4.5" ry="4"/><circle cx="7" cy="10.5" r="2.2"/><circle cx="17" cy="10.5" r="2.2"/><circle cx="9.5" cy="6.5" r="1.8"/><circle cx="14.5" cy="6.5" r="1.8"/></svg>,
    x: <svg {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    plus: <svg {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    refresh: <svg {...p}><polyline points="23,4 23,10 17,10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>,
    link: <svg {...p}><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>,
  };
  return icons[type] || null;
};

// ======================== QR CODE COMPONENT ========================
const QRCode = ({ size = 160, color = C.navy, centerEmoji = "🐕" }) => {
  const grid = 11;
  const cellSize = size / grid;
  // Deterministic pattern
  const pattern = [
    1,1,1,0,1,0,1,0,1,1,1,
    1,0,1,0,0,1,0,0,1,0,1,
    1,1,1,0,1,1,1,0,1,1,1,
    0,0,0,0,1,0,0,0,0,0,0,
    1,0,1,1,0,1,0,1,1,0,1,
    0,1,0,0,1,0,1,0,0,1,0,
    1,0,1,1,0,1,0,1,1,0,1,
    0,0,0,0,0,0,1,0,0,0,0,
    1,1,1,0,1,0,1,0,1,1,1,
    1,0,1,0,1,1,0,0,1,0,1,
    1,1,1,0,0,1,1,0,1,1,1,
  ];

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size}>
        {pattern.map((val, i) => {
          const row = Math.floor(i / grid), col = i % grid;
          const cx = Math.floor(grid/2), cy = Math.floor(grid/2);
          const inCenter = Math.abs(row - cy) <= 1 && Math.abs(col - cx) <= 1;
          if (inCenter) return null;
          return val ? (
            <rect key={i} x={col * cellSize + 1} y={row * cellSize + 1}
              width={cellSize - 2} height={cellSize - 2} rx={2.5}
              fill={color} opacity={0.85 + Math.random() * 0.15} />
          ) : null;
        })}
      </svg>
      <div style={{
        position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        width: cellSize * 3 + 4, height: cellSize * 3 + 4, borderRadius: 10,
        background: C.cream, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 24, border: `2px solid ${C.accent}20`,
        boxShadow: `0 2px 8px rgba(0,0,0,0.06)`,
      }}>{centerEmoji}</div>
    </div>
  );
};

// ======================== DIGITAL ID CARD ========================
const DigitalIDCard = ({ flipped, onFlip }) => (
  <div onClick={onFlip} style={{
    perspective: "1000px", cursor: "pointer",
    width: "100%", height: 220, marginBottom: 16,
  }}>
    <div style={{
      width: "100%", height: "100%", position: "relative",
      transition: "transform 0.7s", transformStyle: "preserve-3d",
      transform: flipped ? "rotateY(180deg)" : "none",
    }}>
      {/* FRONT */}
      <div style={{
        position: "absolute", inset: 0, backfaceVisibility: "hidden",
        background: `linear-gradient(145deg, ${C.navy}, #243B5C)`,
        borderRadius: 22, padding: "20px 22px", overflow: "hidden",
        boxShadow: C.shadowMd,
      }}>
        {/* Holographic line */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 4,
          background: `linear-gradient(90deg, ${C.accent}, ${C.teal}, ${C.plum}, ${C.ember}, ${C.accent})`,
        }} />
        {/* Watermark */}
        <div style={{ position: "absolute", bottom: -20, right: -20, opacity: 0.04 }}>
          <Ico type="paw" size={140} color="#fff" />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Ico type="paw" size={16} color={C.accent} />
              <span style={{ color: "#fff", fontSize: 10, fontWeight: 700, letterSpacing: 2, fontFamily: fontSans, opacity: 0.7 }}>REDE SOLIDÁRIA PETS</span>
            </div>
            <h2 style={{ color: "#fff", fontSize: 24, fontWeight: 700, margin: "0", fontFamily: font, letterSpacing: -0.3 }}>Carteirinha Digital</h2>
          </div>
          <div style={{
            width: 56, height: 56, borderRadius: 18,
            background: "rgba(255,255,255,0.1)", backdropFilter: "blur(4px)",
            border: "1.5px solid rgba(255,255,255,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 30,
          }}>🐕</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
          {[
            { label: "NOME", value: "Rex" },
            { label: "RAÇA", value: "Labrador Retriever" },
            { label: "NASCIMENTO", value: "12/03/2023" },
            { label: "MICROCHIP", value: "985 112 003 004 721" },
            { label: "TUTOR", value: "Ana Martins" },
            { label: "SANGUE", value: "DEA 1.1 Neg" },
          ].map((f, i) => (
            <div key={i}>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 8, fontWeight: 700, letterSpacing: 1.5, margin: "0 0 2px", fontFamily: fontSans }}>{f.label}</p>
              <p style={{ color: "#fff", fontSize: 12, fontWeight: 600, margin: 0, fontFamily: fontSans }}>{f.value}</p>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: "#4DD4A0", boxShadow: "0 0 6px #4DD4A040" }} />
            <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 10, fontFamily: fontSans }}>Verificada · Ativa</span>
          </div>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 9, fontFamily: fontMono }}>ID: RSP-2023-04721</span>
        </div>
      </div>

      {/* BACK */}
      <div style={{
        position: "absolute", inset: 0, backfaceVisibility: "hidden",
        transform: "rotateY(180deg)",
        background: `linear-gradient(145deg, #243B5C, ${C.navy})`,
        borderRadius: 22, padding: 22, overflow: "hidden",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        boxShadow: C.shadowMd,
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, ${C.ember}, ${C.plum}, ${C.teal}, ${C.accent}, ${C.ember})` }} />
        <QRCode size={140} color="rgba(255,255,255,0.9)" centerEmoji="🐕" />
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 600, margin: "14px 0 4px", fontFamily: fontSans }}>Escaneie para ver o prontuário completo</p>
        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 9, margin: 0, fontFamily: fontMono }}>Válido por 24h · Gerado em 26/03/2026 16:45</p>
        <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
          <div style={{ padding: "4px 10px", borderRadius: 8, background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 4 }}>
            <Ico type="shield" size={12} color="rgba(255,255,255,0.5)" />
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 9, fontFamily: fontSans }}>Criptografado</span>
          </div>
          <div style={{ padding: "4px 10px", borderRadius: 8, background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 4 }}>
            <Ico type="refresh" size={12} color="rgba(255,255,255,0.5)" />
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 9, fontFamily: fontSans }}>Auto-renova</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ======================== MAIN APP ========================
export default function QRCarteirinha() {
  const [activeTab, setActiveTab] = useState("carteira");
  const [flipped, setFlipped] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const containerRef = useRef();

  const tabs = [
    { id: "carteira", label: "Carteirinha", icon: "scan" },
    { id: "vacinas", label: "Vacinas", icon: "shield" },
    { id: "emergencia", label: "Emergência", icon: "alert" },
    { id: "docs", label: "Documentos", icon: "file" },
  ];

  const vaccines = [
    { name: "V10 (Polivalente)", date: "15/01/2026", next: "15/01/2027", status: "ok", batch: "A2847N" },
    { name: "Antirrábica", date: "20/03/2025", next: "20/03/2026", status: "overdue", batch: "R9812K" },
    { name: "Giárdia", date: "10/06/2025", next: "10/12/2025", status: "overdue", batch: "G4421B" },
    { name: "Gripe Canina", date: "05/09/2025", next: "05/09/2026", status: "ok", batch: "BS773M" },
    { name: "Leishmaniose", date: "01/02/2026", next: "01/02/2027", status: "ok", batch: "LT102X" },
  ];

  const documents = [
    { name: "Carteira de Vacinação", type: "OCR", date: "15 Mar 2026", icon: "💉", color: C.teal, pages: 3 },
    { name: "Hemograma Completo", type: "OCR", date: "12 Mar 2026", icon: "🔬", color: C.accent, pages: 2 },
    { name: "Bioquímico Hepático", type: "OCR", date: "12 Mar 2026", icon: "🧪", color: C.plum, pages: 1 },
    { name: "Ecocardiograma", type: "PDF", date: "05 Jan 2026", icon: "❤️", color: C.rose, pages: 4 },
    { name: "Raio-X Torácico", type: "Imagem", date: "05 Jan 2026", icon: "🩻", color: C.inkDim, pages: 2 },
    { name: "Receita — Ômega 3", type: "OCR", date: "24 Mar 2026", icon: "📋", color: C.ember, pages: 1 },
    { name: "Pedigree / Registro", type: "PDF", date: "Mar 2023", icon: "📜", color: C.gold, pages: 1 },
    { name: "Nota Fiscal — VetBem", type: "OCR", date: "12 Mar 2026", icon: "🧾", color: C.inkDim, pages: 1 },
  ];

  // ====== SHARE MODAL ======
  const ShareModal = () => (
    <div style={{ position: "absolute", inset: 0, zIndex: 50, background: "rgba(26,32,48,0.45)", backdropFilter: "blur(10px)", display: "flex", alignItems: "flex-end" }}>
      <div style={{ background: C.bg, borderRadius: "28px 28px 0 0", width: "100%", padding: "8px 22px 32px" }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 18px" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: C.inkGhost }} />
        </div>
        <h3 style={{ color: C.ink, fontSize: 18, fontWeight: 700, margin: "0 0 4px", fontFamily: font }}>Compartilhar Dados</h3>
        <p style={{ color: C.inkDim, fontSize: 13, margin: "0 0 20px", fontFamily: fontSans }}>
          Escolha o que compartilhar e como enviar
        </p>

        {/* What to share */}
        <p style={{ color: C.inkDim, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, margin: "0 0 10px", fontFamily: fontSans }}>O QUE COMPARTILHAR</p>
        {[
          { label: "Carteirinha completa", desc: "Dados básicos + microchip + tutor", checked: true },
          { label: "Prontuário de saúde", desc: "Vacinas, exames, alergias, medicação", checked: true },
          { label: "Informações de emergência", desc: "Alergias, vet de confiança, contatos", checked: true },
          { label: "Documentos digitalizados", desc: "Exames, receitas, pedigree", checked: false },
        ].map((item, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "12px 0",
            borderBottom: `1px solid ${C.borderLight}`,
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: 7, flexShrink: 0,
              background: item.checked ? C.accent : C.bgDeep,
              border: item.checked ? "none" : `2px solid ${C.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {item.checked && <Ico type="check" size={14} color="#fff" />}
            </div>
            <div>
              <p style={{ color: C.ink, fontSize: 13, fontWeight: 600, margin: 0, fontFamily: fontSans }}>{item.label}</p>
              <p style={{ color: C.inkDim, fontSize: 11, margin: "2px 0 0" }}>{item.desc}</p>
            </div>
          </div>
        ))}

        {/* Access settings */}
        <p style={{ color: C.inkDim, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, margin: "18px 0 10px", fontFamily: fontSans }}>CONFIGURAÇÕES DE ACESSO</p>
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {[
            { label: "24 horas", active: true },
            { label: "7 dias", active: false },
            { label: "30 dias", active: false },
            { label: "Permanente", active: false },
          ].map((o, i) => (
            <button key={i} style={{
              flex: 1, padding: "9px 4px", borderRadius: 10, cursor: "pointer",
              background: o.active ? C.accent : C.card,
              border: o.active ? "none" : `1px solid ${C.border}`,
              color: o.active ? "#fff" : C.inkDim,
              fontSize: 11, fontWeight: 700, fontFamily: fontSans,
            }}>{o.label}</button>
          ))}
        </div>

        {/* Share methods */}
        <p style={{ color: C.inkDim, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, margin: "0 0 10px", fontFamily: fontSans }}>COMO ENVIAR</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 18 }}>
          {[
            { icon: "qr", label: "QR Code", color: C.navy },
            { icon: "link", label: "Link", color: C.accent },
            { icon: "share", label: "WhatsApp", color: C.sage },
            { icon: "file", label: "PDF", color: C.ember },
            { icon: "printer", label: "Imprimir", color: C.plum },
            { icon: "wifi", label: "NFC", color: C.teal },
          ].map((m, i) => (
            <button key={i} onClick={() => setShowShare(false)} style={{
              padding: "14px 8px", borderRadius: 14, cursor: "pointer",
              background: C.card, border: `1px solid ${C.border}`,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
              fontFamily: fontSans, fontSize: 11, fontWeight: 600, color: C.inkSec,
            }}>
              <Ico type={m.icon} size={20} color={m.color} />
              {m.label}
            </button>
          ))}
        </div>

        <button onClick={() => setShowShare(false)} style={{
          width: "100%", padding: 14, borderRadius: 14, cursor: "pointer",
          background: C.card, border: `1px solid ${C.border}`,
          color: C.inkDim, fontSize: 13, fontWeight: 600, fontFamily: fontSans,
        }}>Cancelar</button>
      </div>
    </div>
  );

  // ====== TAB: CARTEIRA ======
  const TabCarteira = () => (
    <>
      <p style={{ color: C.inkDim, fontSize: 12, textAlign: "center", margin: "0 0 10px", fontFamily: fontSans }}>
        Toque na carteirinha para ver o QR Code
      </p>
      <DigitalIDCard flipped={flipped} onFlip={() => setFlipped(!flipped)} />

      {/* Quick Actions */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[
          { icon: "share", label: "Compartilhar", color: C.accent, action: () => setShowShare(true) },
          { icon: "download", label: "Baixar PDF", color: C.ember },
          { icon: "printer", label: "Imprimir", color: C.plum },
          { icon: "wifi", label: "NFC", color: C.teal },
        ].map((a, i) => (
          <button key={i} onClick={a.action} style={{
            flex: 1, padding: "12px 4px", borderRadius: 14, cursor: "pointer",
            background: C.card, border: `1px solid ${C.border}`,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
            fontFamily: fontSans, fontSize: 10, fontWeight: 600, color: C.inkSec,
            boxShadow: C.shadow,
          }}>
            <Ico type={a.icon} size={18} color={a.color} />
            {a.label}
          </button>
        ))}
      </div>

      {/* Microchip Details */}
      <div style={{
        background: C.card, borderRadius: 20, padding: 18,
        border: `1px solid ${C.border}`, marginBottom: 16, boxShadow: C.shadow,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: C.accentSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Ico type="scan" size={18} color={C.accent} />
          </div>
          <div>
            <p style={{ color: C.ink, fontSize: 14, fontWeight: 700, margin: 0, fontFamily: fontSans }}>Microchip</p>
            <p style={{ color: C.inkDim, fontSize: 11, margin: "2px 0 0" }}>Identificação eletrônica</p>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            { label: "Número", value: "985 112 003 004 721" },
            { label: "Padrão", value: "ISO 11784/11785" },
            { label: "Implantado em", value: "15/04/2023" },
            { label: "Registrado por", value: "Dra. Carla Mendes" },
          ].map((f, i) => (
            <div key={i} style={{ background: C.warm, borderRadius: 12, padding: "10px 12px" }}>
              <p style={{ color: C.inkDim, fontSize: 9, fontWeight: 700, letterSpacing: 0.5, margin: "0 0 3px", fontFamily: fontSans }}>{f.label}</p>
              <p style={{ color: C.ink, fontSize: 12, fontWeight: 600, margin: 0, fontFamily: i === 0 ? fontMono : fontSans }}>{f.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* QR Types */}
      <p style={{ color: C.inkDim, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, margin: "0 0 12px", fontFamily: fontSans }}>TIPOS DE QR CODE</p>
      {[
        { title: "Prontuário Completo", desc: "Saúde, vacinas, exames, alergias", icon: "shield", color: C.accent, access: "Veterinários" },
        { title: "Pet Perdido", desc: "Dados essenciais + contato do tutor", icon: "alert", color: C.rose, access: "Público" },
        { title: "Emergência Médica", desc: "Alergias, medicação, vet de confiança", icon: "heart", color: C.ember, access: "Qualquer pessoa" },
        { title: "Check-in Daycare/Hotel", desc: "Dados básicos + alimentação + rotina", icon: "map", color: C.sage, access: "Estabelecimentos" },
      ].map((q, i) => (
        <button key={i} onClick={() => setShowShare(true)} style={{
          display: "flex", alignItems: "center", gap: 14, width: "100%",
          background: C.card, borderRadius: 18, padding: "14px 16px", marginBottom: 10,
          border: `1px solid ${C.border}`, cursor: "pointer", textAlign: "left",
          fontFamily: fontSans, boxShadow: C.shadow,
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 14,
            background: q.color + "08", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Ico type={q.icon} size={20} color={q.color} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ color: C.ink, fontSize: 13, fontWeight: 700, margin: 0 }}>{q.title}</p>
            <p style={{ color: C.inkDim, fontSize: 11, margin: "3px 0 0" }}>{q.desc}</p>
          </div>
          <span style={{
            background: q.color + "10", color: q.color, fontSize: 9, fontWeight: 700,
            padding: "3px 8px", borderRadius: 8, fontFamily: fontSans,
          }}>{q.access}</span>
        </button>
      ))}
    </>
  );

  // ====== TAB: VACINAS ======
  const TabVacinas = () => (
    <>
      {/* Vaccine card visual */}
      <div style={{
        background: C.card, borderRadius: 22, padding: 20, marginBottom: 16,
        border: `1px solid ${C.border}`, boxShadow: C.shadow,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 22 }}>💉</span>
            <span style={{ color: C.ink, fontSize: 15, fontWeight: 700, fontFamily: fontSans }}>Carteira de Vacinação Digital</span>
          </div>
          <span style={{
            background: C.sage + "14", color: C.sage, fontSize: 10, fontWeight: 700,
            padding: "3px 10px", borderRadius: 8,
          }}>3/5 em dia</span>
        </div>

        {vaccines.map((v, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "12px 0",
            borderBottom: i < vaccines.length - 1 ? `1px solid ${C.borderLight}` : "none",
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9, flexShrink: 0,
              background: v.status === "ok" ? C.sage + "10" : C.rose + "10",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {v.status === "ok"
                ? <Ico type="check" size={15} color={C.sage} />
                : <Ico type="alert" size={15} color={C.rose} />}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ color: C.ink, fontSize: 13, fontWeight: 600, margin: 0, fontFamily: fontSans }}>{v.name}</p>
              <p style={{ color: C.inkDim, fontSize: 10, margin: "2px 0 0", fontFamily: fontMono }}>Lote: {v.batch} · {v.date}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{
                color: v.status === "ok" ? C.sage : C.rose, fontSize: 10, fontWeight: 700,
              }}>{v.status === "ok" ? "Em dia" : "Vencida"}</span>
              <p style={{ color: C.inkDim, fontSize: 9, margin: "2px 0 0" }}>Próx: {v.next}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => setShowShare(true)} style={{
          flex: 1, padding: "13px", borderRadius: 14, cursor: "pointer",
          background: C.accent, border: "none",
          fontFamily: fontSans, fontSize: 13, fontWeight: 700, color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}><Ico type="qr" size={16} color="#fff" /> QR para Vet</button>
        <button style={{
          flex: 1, padding: "13px", borderRadius: 14, cursor: "pointer",
          background: C.card, border: `1px solid ${C.border}`,
          fontFamily: fontSans, fontSize: 13, fontWeight: 700, color: C.inkSec,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}><Ico type="download" size={16} color={C.inkDim} /> PDF</button>
      </div>
    </>
  );

  // ====== TAB: EMERGENCIA ======
  const TabEmergencia = () => (
    <>
      <div style={{
        background: `linear-gradient(145deg, ${C.rose}08, ${C.cream})`,
        borderRadius: 24, padding: 22, marginBottom: 16,
        border: `1px solid ${C.rose}12`, textAlign: "center",
      }}>
        <p style={{ color: C.rose, fontSize: 11, fontWeight: 700, letterSpacing: 1, margin: "0 0 12px", fontFamily: fontSans }}>CARTÃO DE EMERGÊNCIA</p>
        <p style={{ color: C.inkDim, fontSize: 12, margin: "0 0 16px", fontFamily: fontSans }}>
          QR de acesso público. Quem encontrar o Rex pode escanear e ver as informações essenciais.
        </p>
        <div style={{
          background: C.cream, borderRadius: 20, padding: 20, display: "inline-block",
          border: `1px solid ${C.border}`, boxShadow: C.shadow,
        }}>
          <QRCode size={130} color={C.rose} centerEmoji="🆘" />
        </div>
        <p style={{ color: C.inkDim, fontSize: 10, margin: "12px 0 0", fontFamily: fontMono }}>
          Este QR não expira · Sem dados sensíveis
        </p>
      </div>

      {/* What shows when scanned */}
      <p style={{ color: C.inkDim, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, margin: "0 0 12px", fontFamily: fontSans }}>
        O QUE APARECE AO ESCANEAR
      </p>
      <div style={{
        background: C.card, borderRadius: 20, overflow: "hidden",
        border: `1px solid ${C.border}`, boxShadow: C.shadow, marginBottom: 16,
      }}>
        {/* Preview header */}
        <div style={{
          background: `linear-gradient(135deg, ${C.rose}, ${C.ember})`,
          padding: "16px 18px", display: "flex", alignItems: "center", gap: 12,
        }}>
          <span style={{ fontSize: 30 }}>🐕</span>
          <div>
            <p style={{ color: "#fff", fontSize: 18, fontWeight: 700, margin: 0, fontFamily: fontSans }}>Rex</p>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, margin: "2px 0 0" }}>Labrador · Macho · 3 anos</p>
          </div>
        </div>
        <div style={{ padding: "16px 18px" }}>
          {[
            { emoji: "⚠️", label: "ALERGIA SEVERA", value: "Picada de inseto — edema facial", color: C.rose },
            { emoji: "💊", label: "Medicação", value: "Simparic 40mg (mensal), Ômega 3 (diário)" },
            { emoji: "📞", label: "Tutor", value: "Ana Martins · (15) 99812-3456" },
            { emoji: "🏥", label: "Veterinário", value: "Dra. Carla · VetBem · (15) 3412-5678" },
            { emoji: "🆘", label: "Emergência 24h", value: "PetCenter · (15) 3421-9999" },
            { emoji: "🔖", label: "Microchip", value: "985 112 003 004 721" },
          ].map((item, i) => (
            <div key={i} style={{
              display: "flex", gap: 10, padding: "10px 0",
              borderBottom: i < 5 ? `1px solid ${C.borderLight}` : "none",
            }}>
              <span style={{ fontSize: 16, width: 22, flexShrink: 0 }}>{item.emoji}</span>
              <div>
                <p style={{ color: item.color || C.inkDim, fontSize: 10, fontWeight: 700, letterSpacing: 0.5, margin: "0 0 2px", fontFamily: fontSans }}>{item.label}</p>
                <p style={{ color: C.ink, fontSize: 13, fontWeight: 600, margin: 0, fontFamily: fontSans }}>{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8 }}>
        <button style={{
          flex: 1, padding: "13px", borderRadius: 14, cursor: "pointer",
          background: C.rose, border: "none",
          fontFamily: fontSans, fontSize: 13, fontWeight: 700, color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}><Ico type="printer" size={16} color="#fff" /> Imprimir Tag</button>
        <button style={{
          flex: 1, padding: "13px", borderRadius: 14, cursor: "pointer",
          background: C.card, border: `1px solid ${C.border}`,
          fontFamily: fontSans, fontSize: 13, fontWeight: 700, color: C.inkSec,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}><Ico type="phone" size={16} color={C.inkDim} /> Para Coleira</button>
      </div>

      <p style={{ color: C.inkDim, fontSize: 11, textAlign: "center", margin: "14px 0 0", lineHeight: 1.6, fontFamily: fontSans }}>
        Recomendado: imprima e cole na coleira, guia ou caixa de transporte
      </p>
    </>
  );

  // ====== TAB: DOCS ======
  const TabDocs = () => (
    <>
      <div style={{
        background: C.card, borderRadius: 20, padding: "14px 18px", marginBottom: 16,
        border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{
          width: 42, height: 42, borderRadius: 14,
          background: C.accent + "08", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Ico type="camera" size={20} color={C.accent} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ color: C.ink, fontSize: 14, fontWeight: 700, margin: 0, fontFamily: fontSans }}>Digitalizar Documento</p>
          <p style={{ color: C.inkDim, fontSize: 11, margin: "2px 0 0" }}>OCR extrai dados automaticamente</p>
        </div>
        <div style={{
          width: 38, height: 38, borderRadius: 12, background: C.accent,
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
        }}>
          <Ico type="plus" size={18} color="#fff" />
        </div>
      </div>

      <p style={{ color: C.inkDim, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, margin: "0 0 12px", fontFamily: fontSans }}>
        DOCUMENTOS DIGITALIZADOS ({documents.length})
      </p>

      {documents.map((doc, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: 14,
          background: C.card, borderRadius: 18, padding: "14px 16px", marginBottom: 8,
          border: `1px solid ${C.border}`, cursor: "pointer", boxShadow: C.shadow,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: doc.color + "08", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20,
          }}>{doc.icon}</div>
          <div style={{ flex: 1 }}>
            <p style={{ color: C.ink, fontSize: 13, fontWeight: 700, margin: 0, fontFamily: fontSans }}>{doc.name}</p>
            <p style={{ color: C.inkDim, fontSize: 11, margin: "3px 0 0" }}>{doc.date} · {doc.pages} pág.</p>
          </div>
          <span style={{
            background: doc.type === "OCR" ? C.accent + "10" : C.plum + "10",
            color: doc.type === "OCR" ? C.accent : C.plum,
            fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 8, fontFamily: fontSans,
          }}>{doc.type}</span>
        </div>
      ))}

      {/* Storage info */}
      <div style={{
        background: C.warm, borderRadius: 16, padding: "14px 18px", marginTop: 12,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <Ico type="file" size={18} color={C.inkDim} />
        <div style={{ flex: 1 }}>
          <p style={{ color: C.inkSec, fontSize: 12, fontWeight: 600, margin: 0, fontFamily: fontSans }}>Armazenamento</p>
          <div style={{ height: 4, background: C.bgDeep, borderRadius: 2, marginTop: 6, overflow: "hidden" }}>
            <div style={{ height: "100%", width: "23%", borderRadius: 2, background: C.accent }} />
          </div>
        </div>
        <span style={{ color: C.inkDim, fontSize: 11, fontFamily: fontMono }}>23 MB / 100 MB</span>
      </div>
    </>
  );

  const tabContent = { carteira: TabCarteira, vacinas: TabVacinas, emergencia: TabEmergencia, docs: TabDocs };
  const ActiveTab = tabContent[activeTab] || TabCarteira;

  return (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center",
      minHeight: "100vh", padding: 20,
      background: `linear-gradient(170deg, #E8E2D6 0%, #DDD6C8 50%, #D2CBBC 100%)`,
      fontFamily: fontSans,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Outfit:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div ref={containerRef} style={{
        width: 400, maxHeight: 820, background: C.bg, borderRadius: 40,
        overflow: "auto", position: "relative",
        boxShadow: `0 20px 80px rgba(26,39,68,0.12), 0 0 0 1px ${C.border}`,
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
            <h1 style={{ color: C.ink, fontSize: 20, margin: 0, fontWeight: 700, fontFamily: font }}>Identidade Digital</h1>
            <p style={{ color: C.inkDim, fontSize: 12, margin: "2px 0 0" }}>QR Code · Carteirinha · Documentos</p>
          </div>
          <button onClick={() => setShowShare(true)} style={{
            background: C.accent, border: "none", borderRadius: 12,
            padding: "8px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
          }}>
            <Ico type="share" size={15} color="#fff" />
            <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>Enviar</span>
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          position: "sticky", top: 28, zIndex: 15,
          padding: "16px 20px 10px",
          background: `linear-gradient(to bottom, ${C.bg}, ${C.bg}F5, ${C.bg}00)`,
        }}>
          <div style={{ display: "flex", gap: 5 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                padding: "9px 6px", borderRadius: 12, cursor: "pointer",
                background: activeTab === t.id ? C.accent : C.card,
                border: activeTab === t.id ? "none" : `1px solid ${C.border}`,
                color: activeTab === t.id ? "#fff" : C.inkDim,
                fontSize: 11, fontWeight: 700, fontFamily: fontSans,
                transition: "all 0.2s",
              }}>
                <Ico type={t.icon} size={14} color={activeTab === t.id ? "#fff" : C.inkDim} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "4px 20px 30px" }}>
          <ActiveTab />
        </div>

        {showShare && <ShareModal />}

        <style>{`::-webkit-scrollbar{width:0;height:0}`}</style>
      </div>
    </div>
  );
}
