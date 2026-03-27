import { useState, useRef } from "react";

// ======================== DESIGN TOKENS ========================
const C = {
  bg: "#F8F5F0", bgDeep: "#EDE8DF", cream: "#FFFDF7", warm: "#F3EDE2",
  card: "#FFFFFF", cardAlt: "#FDFAF4",
  ink: "#2B1E12", inkSec: "#5A4636", inkDim: "#978571", inkGhost: "#C4B6A2",
  shield: "#C45A3A", shieldSoft: "#C45A3A0C", shieldMed: "#C45A3A18", shieldGlow: "#C45A3A25",
  sage: "#5A8F6B", sageSoft: "#5A8F6B0C",
  ocean: "#4A7DB2", oceanSoft: "#4A7DB20C",
  amber: "#C49A38", amberSoft: "#C49A380C", amberWarm: "#C49A3820",
  plum: "#8A5FA0", plumSoft: "#8A5FA00C",
  rose: "#B85A6A", roseSoft: "#B85A6A0C",
  teal: "#3A9E8C", tealSoft: "#3A9E8C0C",
  text: "#2B1E12", textSec: "#6B5A48", textDim: "#A3927E", textGhost: "#CFC2B0",
  border: "#E6DDD0", borderLight: "#EDE6DA",
  shadow: "0 3px 24px rgba(43,30,18,0.06)",
};
const font = "'Playfair Display', 'Georgia', serif";
const fontSans = "'Nunito', -apple-system, sans-serif";
const fontHand = "'Caveat', cursive";

// ======================== ICONS ========================
const Ico = ({ type, size = 20, color = C.inkDim }) => {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" };
  const icons = {
    back: <svg {...p}><polyline points="15,18 9,12 15,6"/></svg>,
    shield: <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    shieldFill: <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    heart: <svg {...p}><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
    heartFill: <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
    user: <svg {...p}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    users: <svg {...p}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
    check: <svg {...p} strokeWidth="2.5"><polyline points="20,6 9,17 4,12"/></svg>,
    checkCircle: <svg {...p}><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>,
    alert: <svg {...p}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    key: <svg {...p}><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>,
    lock: <svg {...p}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
    unlock: <svg {...p}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 019.9-1"/></svg>,
    edit: <svg {...p}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    phone: <svg {...p}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>,
    mail: <svg {...p}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
    map: <svg {...p}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
    file: <svg {...p}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>,
    download: <svg {...p}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
    clock: <svg {...p}><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>,
    calendar: <svg {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    camera: <svg {...p}><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>,
    gift: <svg {...p}><polyline points="20,12 20,22 4,22 4,12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 110-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 100-5C13 2 12 7 12 7z"/></svg>,
    play: <svg {...p}><polygon points="5,3 19,12 5,21" fill={color} stroke="none"/></svg>,
    bell: <svg {...p}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
    paw: <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><ellipse cx="12" cy="17" rx="4.5" ry="4"/><circle cx="7" cy="10.5" r="2.2"/><circle cx="17" cy="10.5" r="2.2"/><circle cx="9.5" cy="6.5" r="1.8"/><circle cx="14.5" cy="6.5" r="1.8"/></svg>,
    x: <svg {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    plus: <svg {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    refresh: <svg {...p}><polyline points="23,4 23,10 17,10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>,
    eye: <svg {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    send: <svg {...p}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/></svg>,
  };
  return icons[type] || null;
};

// ======================== COMPONENTS ========================
const Badge = ({ text, color, bg, icon }) => (
  <span style={{
    background: bg || color + "14", color, fontSize: 11, fontWeight: 700,
    padding: "4px 12px", borderRadius: 14, fontFamily: fontSans,
    display: "inline-flex", alignItems: "center", gap: 5,
  }}>{icon}{text}</span>
);

const Avatar = ({ emoji, size = 48, bg, ring, ringColor }) => (
  <div style={{
    width: size, height: size, borderRadius: size * 0.35, flexShrink: 0,
    background: bg || C.shieldSoft, display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: size * 0.52, border: ring ? `2.5px solid ${ringColor || C.shield}` : "none",
    boxShadow: ring ? `0 3px 14px ${(ringColor || C.shield)}18` : "none",
  }}>{emoji}</div>
);

const StatusDot = ({ active }) => (
  <div style={{
    width: 10, height: 10, borderRadius: 5,
    background: active ? C.sage : C.textGhost,
    boxShadow: active ? `0 0 8px ${C.sage}40` : "none",
  }} />
);

const ProgressRing = ({ value, size = 56, color = C.sage, strokeW = 5 }) => {
  const r = (size - strokeW * 2) / 2;
  const circ = 2 * Math.PI * r;
  const off = circ - (value / 100) * circ;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.borderLight} strokeWidth={strokeW} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeW}
          strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color, fontSize: size * 0.28, fontWeight: 800, fontFamily: fontSans }}>{value}%</span>
      </div>
    </div>
  );
};

// ======================== MAIN APP ========================
export default function TestamentoEmocional() {
  const [activeTab, setActiveTab] = useState("visao");
  const [showSim, setShowSim] = useState(false);
  const [showLetter, setShowLetter] = useState(false);
  const containerRef = useRef();

  const tabs = [
    { id: "visao", label: "Visão Geral" },
    { id: "tutor", label: "Tutor Reserva" },
    { id: "info", label: "Info Crítica" },
    { id: "carta", label: "Carta" },
    { id: "protocolo", label: "Protocolo" },
  ];

  const completionItems = [
    { label: "Tutor de reserva escolhido", done: true, icon: "user" },
    { label: "Informações críticas preenchidas", done: true, icon: "file" },
    { label: "Carta pessoal escrita", done: true, icon: "mail" },
    { label: "Protocolo de emergência definido", done: true, icon: "bell" },
    { label: "Contatos de emergência atualizados", done: true, icon: "phone" },
    { label: "Cápsula do tempo para tutor reserva", done: true, icon: "gift" },
    { label: "Documento legal anexado", done: false, icon: "file" },
    { label: "Verificação periódica ativa", done: true, icon: "refresh" },
  ];

  const completionPct = Math.round((completionItems.filter(i => i.done).length / completionItems.length) * 100);

  // ====== TAB: VISÃO GERAL ======
  const TabVisao = () => (
    <>
      {/* Hero Shield */}
      <div style={{
        background: `linear-gradient(160deg, ${C.shieldSoft}, ${C.cream})`,
        borderRadius: 26, padding: "28px 24px", marginBottom: 16,
        border: `1px solid ${C.shield}12`, position: "relative", overflow: "hidden",
        textAlign: "center",
      }}>
        <div style={{
          position: "absolute", top: -40, right: -40, width: 180, height: 180,
          borderRadius: "50%", background: `radial-gradient(circle, ${C.shield}06, transparent)`,
        }} />
        <div style={{
          width: 80, height: 80, borderRadius: 26, margin: "0 auto 18px",
          background: C.cream, border: `2px solid ${C.shield}25`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 6px 24px ${C.shield}12`,
        }}>
          <Ico type="shieldFill" size={38} color={C.shield} />
        </div>
        <h2 style={{ color: C.ink, fontSize: 22, fontWeight: 700, margin: "0 0 6px", fontFamily: font }}>
          Testamento Emocional
        </h2>
        <p style={{ color: C.textSec, fontSize: 14, margin: "0 0 4px", fontFamily: fontSans }}>
          A proteção mais importante para o Rex
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 14 }}>
          <Badge text="Ativo" color={C.sage} icon={<StatusDot active />} />
          <Badge text="Última revisão: 15 Mar 2026" color={C.textDim} />
        </div>
      </div>

      {/* Completion */}
      <div style={{
        background: C.card, borderRadius: 22, padding: 20, marginBottom: 16,
        border: `1px solid ${C.border}`, boxShadow: C.shadow,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18 }}>
          <ProgressRing value={completionPct} size={64} color={completionPct === 100 ? C.sage : C.amber} />
          <div>
            <p style={{ color: C.ink, fontSize: 16, fontWeight: 700, margin: "0 0 4px", fontFamily: fontSans }}>
              Proteção {completionPct === 100 ? "completa" : "quase completa"}
            </p>
            <p style={{ color: C.textDim, fontSize: 12, margin: 0 }}>
              {completionItems.filter(i => i.done).length} de {completionItems.length} itens configurados
            </p>
          </div>
        </div>

        {completionItems.map((item, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "10px 0",
            borderBottom: i < completionItems.length - 1 ? `1px solid ${C.borderLight}` : "none",
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              background: item.done ? C.sage + "14" : C.amber + "14",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {item.done
                ? <Ico type="check" size={14} color={C.sage} />
                : <Ico type="alert" size={14} color={C.amber} />}
            </div>
            <span style={{
              color: item.done ? C.inkSec : C.amber, fontSize: 13, fontWeight: 600,
              fontFamily: fontSans, flex: 1,
              textDecoration: item.done ? "none" : "none",
            }}>{item.label}</span>
            {!item.done && (
              <button style={{
                padding: "5px 12px", borderRadius: 10, cursor: "pointer",
                background: C.amber + "14", border: `1px solid ${C.amber}20`,
                color: C.amber, fontSize: 11, fontWeight: 700, fontFamily: fontSans,
              }}>Completar</button>
            )}
          </div>
        ))}
      </div>

      {/* Quick summary cards */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <div style={{
          flex: 1, background: C.card, borderRadius: 18, padding: "16px 14px",
          border: `1px solid ${C.border}`, textAlign: "center",
        }}>
          <Avatar emoji="👩‍🦰" size={44} bg={C.shield + "10"} ring ringColor={C.shield} />
          <p style={{ color: C.ink, fontSize: 13, fontWeight: 700, margin: "8px 0 2px", fontFamily: fontSans }}>Maria Santos</p>
          <p style={{ color: C.textDim, fontSize: 10, margin: 0 }}>Tutora de Reserva</p>
        </div>
        <div style={{
          flex: 1, background: C.card, borderRadius: 18, padding: "16px 14px",
          border: `1px solid ${C.border}`, textAlign: "center",
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 16, margin: "0 auto",
            background: C.sage + "10", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Ico type="checkCircle" size={24} color={C.sage} />
          </div>
          <p style={{ color: C.ink, fontSize: 13, fontWeight: 700, margin: "8px 0 2px", fontFamily: fontSans }}>Verificação</p>
          <p style={{ color: C.sage, fontSize: 10, fontWeight: 600, margin: 0 }}>Ativa · a cada 90 dias</p>
        </div>
        <div style={{
          flex: 1, background: C.card, borderRadius: 18, padding: "16px 14px",
          border: `1px solid ${C.border}`, textAlign: "center",
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 16, margin: "0 auto",
            background: C.plum + "10", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Ico type="gift" size={24} color={C.plum} />
          </div>
          <p style={{ color: C.ink, fontSize: 13, fontWeight: 700, margin: "8px 0 2px", fontFamily: fontSans }}>Cápsulas</p>
          <p style={{ color: C.textDim, fontSize: 10, margin: 0 }}>1 trancada para Maria</p>
        </div>
      </div>

      {/* Simulation */}
      <button onClick={() => setShowSim(true)} style={{
        width: "100%", padding: "16px 20px", borderRadius: 18, cursor: "pointer",
        background: C.card, border: `1px solid ${C.shield}18`,
        display: "flex", alignItems: "center", gap: 14,
        fontFamily: fontSans, textAlign: "left",
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 14,
          background: C.shield + "10", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Ico type="eye" size={20} color={C.shield} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ color: C.ink, fontSize: 14, fontWeight: 700, margin: 0 }}>Simular Ativação</p>
          <p style={{ color: C.textDim, fontSize: 12, margin: "3px 0 0" }}>
            Veja exatamente o que Maria receberá
          </p>
        </div>
        <Ico type="back" size={16} color={C.textDim} />
      </button>
    </>
  );

  // ====== TAB: TUTOR RESERVA ======
  const TabTutor = () => (
    <>
      {/* Primary guardian */}
      <div style={{
        background: C.card, borderRadius: 24, padding: 22, marginBottom: 16,
        border: `1px solid ${C.shield}15`, boxShadow: C.shadow,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18 }}>
          <Avatar emoji="👩‍🦰" size={64} bg={C.shield + "10"} ring ringColor={C.shield} />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h3 style={{ color: C.ink, fontSize: 20, fontWeight: 700, margin: 0, fontFamily: font }}>Maria Santos</h3>
            </div>
            <p style={{ color: C.textDim, fontSize: 13, margin: "4px 0 8px", fontFamily: fontSans }}>Irmã da tutora · Salto, SP</p>
            <div style={{ display: "flex", gap: 6 }}>
              <Badge text="Tutora de Reserva" color={C.shield} />
              <Badge text="Verificada" color={C.sage} icon={<Ico type="check" size={10} color={C.sage} />} />
            </div>
          </div>
        </div>

        {/* Contact */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {[
            { icon: "phone", label: "(15) 99734-5678", color: C.sage },
            { icon: "mail", label: "maria@email.com", color: C.ocean },
          ].map((c, i) => (
            <div key={i} style={{
              flex: 1, background: C.warm, borderRadius: 14, padding: "10px 12px",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <Ico type={c.icon} size={15} color={c.color} />
              <span style={{ color: C.inkSec, fontSize: 11, fontWeight: 600, fontFamily: fontSans }}>{c.label}</span>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
          {[
            { label: "Confiança", value: "4.9 ⭐", color: C.amber },
            { label: "Atividades", value: "45", color: C.ink },
            { label: "Desde", value: "Jun 2023", color: C.ink },
          ].map((s, i) => (
            <div key={i} style={{ background: C.warm, borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
              <p style={{ color: s.color, fontSize: 16, fontWeight: 800, margin: 0, fontFamily: fontSans }}>{s.value}</p>
              <p style={{ color: C.textDim, fontSize: 10, margin: "2px 0 0" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Relationship with Rex */}
        <div style={{
          background: C.sageSoft, borderRadius: 16, padding: "14px 16px",
          border: `1px solid ${C.sage}12`,
        }}>
          <p style={{ color: C.sage, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, margin: "0 0 6px", fontFamily: fontSans }}>RELAÇÃO COM O REX</p>
          <p style={{ color: C.inkSec, fontSize: 13, lineHeight: 1.7, margin: 0, fontFamily: fontSans }}>
            Maria conhece o Rex desde filhote. Já cuidou dele em 5 viagens da Ana, deu banhos,
            levou ao veterinário e sabe todas as suas manias. Rex fica calmo e feliz com ela.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button style={{
            flex: 1, padding: "12px", borderRadius: 14, cursor: "pointer",
            background: C.warm, border: `1px solid ${C.border}`,
            fontFamily: fontSans, fontSize: 12, fontWeight: 700, color: C.inkSec,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}><Ico type="send" size={14} color={C.inkDim} /> Mensagem</button>
          <button style={{
            flex: 1, padding: "12px", borderRadius: 14, cursor: "pointer",
            background: C.warm, border: `1px solid ${C.border}`,
            fontFamily: fontSans, fontSize: 12, fontWeight: 700, color: C.inkSec,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}><Ico type="key" size={14} color={C.inkDim} /> Permissões</button>
        </div>
      </div>

      {/* Backup guardians */}
      <p style={{ color: C.textDim, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", margin: "0 0 12px", fontFamily: fontSans }}>
        Segundo e terceiro na linha de sucessão
      </p>
      {[
        { name: "Lúcia Martins", role: "Mãe da tutora", emoji: "👵", order: "2º", trust: 5.0 },
        { name: "Carlos Lima", role: "Padrinho do Rex", emoji: "👨", order: "3º", trust: 4.8 },
      ].map((g, i) => (
        <div key={i} style={{
          background: C.card, borderRadius: 18, padding: "14px 18px", marginBottom: 10,
          border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 14,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10, background: C.amber + "14",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: C.amber, fontSize: 13, fontWeight: 800, fontFamily: fontSans,
          }}>{g.order}</div>
          <Avatar emoji={g.emoji} size={44} bg={C.warm} />
          <div style={{ flex: 1 }}>
            <p style={{ color: C.ink, fontSize: 14, fontWeight: 700, margin: 0, fontFamily: fontSans }}>{g.name}</p>
            <p style={{ color: C.textDim, fontSize: 12, margin: "2px 0 0" }}>{g.role} · ⭐ {g.trust}</p>
          </div>
          <Ico type="edit" size={16} color={C.textDim} />
        </div>
      ))}

      <button style={{
        width: "100%", padding: "14px", borderRadius: 16, marginTop: 6,
        background: C.warm, border: `2px dashed ${C.border}`, cursor: "pointer",
        color: C.textDim, fontSize: 13, fontWeight: 700, fontFamily: fontSans,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      }}>
        <Ico type="plus" size={16} color={C.textDim} /> Adicionar outro na linha de sucessão
      </button>
    </>
  );

  // ====== TAB: INFO CRÍTICA ======
  const TabInfo = () => {
    const sections = [
      { title: "Emergências e Alergias", icon: "alert", color: C.shield, items: [
        { emoji: "⚠️", label: "Alergia severa", value: "Picada de inseto — pode causar edema facial. Levar ao vet imediatamente." },
        { emoji: "⚠️", label: "Alergia leve", value: "Suspeita de frango — causa coceira. Evitar rações com frango." },
        { emoji: "🆘", label: "Emergência 24h", value: "PetCenter Salto · (15) 3421-9999" },
      ]},
      { title: "Medicação", icon: "file", color: C.plum, items: [
        { emoji: "💊", label: "Simparic 40mg", value: "Mensal, para pulgas e carrapatos. Dar com comida. Próxima: 01/04." },
        { emoji: "💊", label: "Ômega 3 1000mg", value: "Diário, de manhã. Para pelo ressecado. Até junho/2026." },
        { emoji: "💊", label: "Drontal Plus", value: "Trimestral. Vermífugo. Próximo: 01/06/2026." },
      ]},
      { title: "Alimentação", icon: "heartFill", color: C.amber, items: [
        { emoji: "🍖", label: "Ração", value: "Royal Canin Labrador Adult. 200g 2x/dia (8h e 18h)." },
        { emoji: "🥕", label: "Petiscos permitidos", value: "Cenoura, maçã sem semente, biscoito para cães." },
        { emoji: "🚫", label: "PROIBIDO", value: "Chocolate, uvas, cebola, alho, abacate, macadâmia." },
        { emoji: "💧", label: "Água", value: "Trocar 3x ao dia. Ele prefere água fresca, não gelada." },
      ]},
      { title: "Personalidade e Medos", icon: "heartFill", color: C.rose, items: [
        { emoji: "😰", label: "Medo de fogos", value: "Fica muito agitado. Colocar música clássica e ficar junto." },
        { emoji: "😰", label: "Ansiedade sozinho", value: "Não deixar >4h sem companhia. Deixar brinquedo interativo." },
        { emoji: "😊", label: "Brincadeiras favoritas", value: "Buscar bolinha, cabo de guerra, correr no parque." },
        { emoji: "🧸", label: "Objetos essenciais", value: "Bolinha amarela de tennis (dorme com ela), manta azul." },
        { emoji: "🛋️", label: "Rotina de sono", value: "Dorme no sofá da sala. Gosta de luz acesa no corredor." },
      ]},
      { title: "Rotina Diária", icon: "clock", color: C.ocean, items: [
        { emoji: "🌅", label: "Manhã (7h)", value: "Passeio de 30min. Ração. Brincadeira curta." },
        { emoji: "☀️", label: "Meio-dia", value: "Petisco leve. Gosta de deitar na janela e ver passarinhos." },
        { emoji: "🌆", label: "Tarde (17:30)", value: "Segundo passeio. Jantar às 18h. Brincadeira." },
        { emoji: "🌙", label: "Noite (21h)", value: "Última saída. Escovação 3x/semana. Manta no sofá." },
      ]},
      { title: "Saúde e Veterinário", icon: "shieldFill", color: C.teal, items: [
        { emoji: "🩺", label: "Vet de confiança", value: "Dra. Carla Mendes · VetBem · (15) 3412-5678" },
        { emoji: "🩸", label: "Tipo sanguíneo", value: "DEA 1.1 Negativo. Doador compatível." },
        { emoji: "📋", label: "Microchip", value: "985...4721 · Registrado no nome de Ana Martins" },
        { emoji: "🔬", label: "Atenção", value: "ALT levemente elevado (92 U/L). Repetir exame em abril." },
      ]},
    ];

    return (
      <>
        <div style={{
          background: C.shieldSoft, borderRadius: 18, padding: "14px 18px", marginBottom: 18,
          border: `1px solid ${C.shield}10`, display: "flex", alignItems: "center", gap: 12,
        }}>
          <Ico type="alert" size={20} color={C.shield} />
          <p style={{ color: C.inkSec, fontSize: 13, lineHeight: 1.6, margin: 0, fontFamily: fontSans }}>
            Estas informações serão transferidas automaticamente para o tutor de reserva
            em caso de ativação. <span style={{ fontWeight: 700, color: C.shield }}>Mantenha sempre atualizado.</span>
          </p>
        </div>

        {sections.map((sec, si) => (
          <div key={si} style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Ico type={sec.icon} size={16} color={sec.color} />
              <span style={{ color: C.textDim, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", fontFamily: fontSans }}>
                {sec.title}
              </span>
              <div style={{ flex: 1 }} />
              <button style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                <Ico type="edit" size={14} color={C.textDim} />
              </button>
            </div>
            <div style={{
              background: C.card, borderRadius: 20, padding: "4px 0",
              border: `1px solid ${C.border}`, boxShadow: C.shadow,
            }}>
              {sec.items.map((item, ii) => (
                <div key={ii} style={{
                  display: "flex", gap: 12, padding: "13px 18px",
                  borderBottom: ii < sec.items.length - 1 ? `1px solid ${C.borderLight}` : "none",
                }}>
                  <span style={{ fontSize: 18, width: 24, textAlign: "center", flexShrink: 0 }}>{item.emoji}</span>
                  <div>
                    <p style={{ color: C.ink, fontSize: 12, fontWeight: 700, margin: "0 0 3px", fontFamily: fontSans }}>{item.label}</p>
                    <p style={{ color: C.textSec, fontSize: 13, lineHeight: 1.6, margin: 0, fontFamily: fontSans }}>{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </>
    );
  };

  // ====== TAB: CARTA ======
  const TabCarta = () => (
    <>
      <div style={{
        background: `linear-gradient(160deg, ${C.roseSoft}, ${C.cream})`,
        borderRadius: 26, padding: "28px 24px", marginBottom: 18,
        border: `1px solid ${C.rose}10`, position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -20, right: -20, fontSize: 100, opacity: 0.04, transform: "rotate(15deg)" }}>💌</div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 24 }}>✉️</span>
          <div>
            <p style={{ color: C.rose, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, margin: 0, fontFamily: fontSans }}>CARTA PARA O PRÓXIMO TUTOR</p>
            <p style={{ color: C.textDim, fontSize: 11, margin: "3px 0 0" }}>Última edição: 15 Mar 2026</p>
          </div>
        </div>

        <div style={{
          background: C.cream, borderRadius: 20, padding: "24px 22px",
          border: `1px solid ${C.rose}08`, boxShadow: "inset 0 2px 8px rgba(0,0,0,0.02)",
        }}>
          <p style={{
            color: C.ink, fontSize: 18, lineHeight: 2, margin: 0,
            fontFamily: fontHand,
          }}>
            Maria, minha irmã querida,{"\n\n"}
            Se você está lendo isso, significa que eu não posso mais cuidar do Rex.
            Mas sei que ele está em boas mãos porque ninguém conhece o coração dele
            como você.{"\n\n"}
            Ele gosta de deitar no tapete da sala às 15h quando o sol bate na janela.
            Sempre dá a pata esquerda primeiro — ele é canhoto, como nós. Quando ele
            ficar quieto demais, não é tristeza: ele está "meditando" na janela,
            observando o passarinho vermelho que aparece às 15h.{"\n\n"}
            Ele entende tudo o que você fala, especialmente quando você está triste.
            Nesses dias, ele vai deitar a cabeça no seu colo sem pedir nada em
            troca. Deixa ele. É a forma dele de dizer "estou aqui".{"\n\n"}
            A bolinha amarela é sagrada — ele dorme com ela todas as noites. Se
            perder, compra outra igual, mas não joga a velha fora.{"\n\n"}
            Cuide dele como eu cuidei. E quando sentir saudade de mim, olhe
            para ele dormir — eu estou ali, no sorriso torto dele.{"\n\n"}
            Com todo o amor do mundo,{"\n"}
            Ana 💛
          </p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button style={{
          flex: 1, padding: "13px", borderRadius: 14, cursor: "pointer",
          background: C.card, border: `1px solid ${C.border}`,
          fontFamily: fontSans, fontSize: 13, fontWeight: 700, color: C.inkSec,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}><Ico type="edit" size={16} color={C.inkDim} /> Editar</button>
        <button style={{
          flex: 1, padding: "13px", borderRadius: 14, cursor: "pointer",
          background: C.card, border: `1px solid ${C.border}`,
          fontFamily: fontSans, fontSize: 13, fontWeight: 700, color: C.inkSec,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}><Ico type="camera" size={16} color={C.inkDim} /> Gravar Vídeo</button>
      </div>

      {/* AI Narration */}
      <div style={{
        marginTop: 18, padding: "18px 20px",
        background: `linear-gradient(135deg, ${C.amber}06, ${C.warm})`,
        borderRadius: 20, border: `1px solid ${C.amber}10`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Ico type="paw" size={16} color={C.amber} />
          <span style={{ color: C.amber, fontSize: 12, fontWeight: 700, fontFamily: fontSans }}>Se o Rex pudesse falar...</span>
        </div>
        <p style={{
          color: C.inkSec, fontSize: 16, lineHeight: 1.9, margin: 0,
          fontFamily: fontHand, fontStyle: "italic",
        }}>
          "Se a minha humana não puder mais estar comigo, eu sei que a Maria vai me dar
          colo e biscoitos na hora certa. Ela cheira a casa e a segurança. Eu vou ficar
          bem, porque o amor que a Ana me deu vive dentro de mim para sempre. 🐾"
        </p>
      </div>
    </>
  );

  // ====== TAB: PROTOCOLO ======
  const TabProtocolo = () => (
    <>
      {/* Verification System */}
      <div style={{
        background: C.card, borderRadius: 22, padding: 20, marginBottom: 16,
        border: `1px solid ${C.border}`, boxShadow: C.shadow,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 14,
            background: C.sage + "10", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Ico type="refresh" size={20} color={C.sage} />
          </div>
          <div>
            <p style={{ color: C.ink, fontSize: 15, fontWeight: 700, margin: 0, fontFamily: fontSans }}>Verificação Periódica</p>
            <p style={{ color: C.sage, fontSize: 12, fontWeight: 600, margin: "2px 0 0" }}>Ativa · A cada 90 dias</p>
          </div>
        </div>

        <p style={{ color: C.textSec, fontSize: 13, lineHeight: 1.7, margin: "0 0 16px", fontFamily: fontSans }}>
          A cada 90 dias, o app envia uma notificação pedindo confirmação de que você está bem.
          Se não responder em 7 dias, o tutor de reserva é automaticamente notificado.
        </p>

        <div style={{
          background: C.warm, borderRadius: 14, padding: "14px 16px",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <Ico type="calendar" size={18} color={C.sage} />
          <div>
            <p style={{ color: C.ink, fontSize: 13, fontWeight: 700, margin: 0, fontFamily: fontSans }}>Próxima verificação</p>
            <p style={{ color: C.textDim, fontSize: 12, margin: "2px 0 0" }}>13 de Junho, 2026 (79 dias)</p>
          </div>
        </div>
      </div>

      {/* Activation Flow */}
      <p style={{ color: C.textDim, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", margin: "0 0 14px", fontFamily: fontSans }}>
        Fluxo de Ativação
      </p>

      <div style={{ position: "relative", paddingLeft: 28 }}>
        <div style={{ position: "absolute", left: 10, top: 12, bottom: 12, width: 2, background: C.border }} />

        {[
          { step: 1, title: "Notificação de verificação", desc: "App envia push perguntando se está tudo bem", icon: "bell", color: C.ocean, time: "Dia 0" },
          { step: 2, title: "Sem resposta em 48h", desc: "Segunda notificação + SMS automático para você", icon: "phone", color: C.amber, time: "Dia 2" },
          { step: 3, title: "Sem resposta em 5 dias", desc: "Alerta discreto enviado aos contatos de emergência", icon: "users", color: C.amber, time: "Dia 5" },
          { step: 4, title: "Sem resposta em 7 dias", desc: "Tutor de reserva é notificado oficialmente e recebe acesso parcial", icon: "key", color: C.shield, time: "Dia 7" },
          { step: 5, title: "Confirmação do tutor reserva", desc: "Maria confirma a situação e recebe acesso total ao perfil do Rex", icon: "shield", color: C.shield, time: "Dia 7+" },
          { step: 6, title: "Transferência completa", desc: "Prontuário, diário, cápsulas, rede de cuidadores e carta são transferidos", icon: "heartFill", color: C.rose, time: "Imediato" },
        ].map((s, i) => (
          <div key={i} style={{ position: "relative", marginBottom: 18 }}>
            <div style={{
              position: "absolute", left: -22, top: 4,
              width: 22, height: 22, borderRadius: 11,
              background: C.cream, border: `2.5px solid ${s.color}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 800, color: s.color, fontFamily: fontSans,
            }}>{s.step}</div>
            <div style={{
              background: C.card, borderRadius: 18, padding: "14px 18px",
              border: `1px solid ${C.border}`, boxShadow: C.shadow,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: C.ink, fontSize: 14, fontWeight: 700, fontFamily: fontSans }}>{s.title}</span>
                <span style={{
                  color: s.color, fontSize: 10, fontWeight: 700, fontFamily: fontSans,
                  background: s.color + "12", padding: "3px 8px", borderRadius: 8,
                }}>{s.time}</span>
              </div>
              <p style={{ color: C.textDim, fontSize: 12, lineHeight: 1.5, margin: 0, fontFamily: fontSans }}>{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Emergency Contacts */}
      <p style={{ color: C.textDim, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", margin: "8px 0 14px", fontFamily: fontSans }}>
        Contatos de Emergência
      </p>
      {[
        { name: "Maria Santos", role: "Tutora de Reserva", phone: "(15) 99734-5678", emoji: "👩‍🦰", order: 1 },
        { name: "Lúcia Martins", role: "2ª na sucessão", phone: "(15) 99312-8765", emoji: "👵", order: 2 },
        { name: "Dra. Carla Mendes", role: "Veterinária", phone: "(15) 3412-5678", emoji: "👩‍⚕️", order: 3 },
      ].map((c, i) => (
        <div key={i} style={{
          background: C.card, borderRadius: 16, padding: "12px 16px", marginBottom: 8,
          border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{
            width: 26, height: 26, borderRadius: 8, background: C.shield + "12",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: C.shield, fontSize: 12, fontWeight: 800, fontFamily: fontSans,
          }}>{c.order}</div>
          <Avatar emoji={c.emoji} size={38} bg={C.warm} />
          <div style={{ flex: 1 }}>
            <p style={{ color: C.ink, fontSize: 13, fontWeight: 700, margin: 0, fontFamily: fontSans }}>{c.name}</p>
            <p style={{ color: C.textDim, fontSize: 11, margin: "2px 0 0" }}>{c.role} · {c.phone}</p>
          </div>
        </div>
      ))}

      {/* Legal document */}
      <div style={{
        marginTop: 14, background: C.amber + "08", borderRadius: 18, padding: "16px 18px",
        border: `1px solid ${C.amber}15`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <Ico type="file" size={18} color={C.amber} />
          <span style={{ color: C.amber, fontSize: 13, fontWeight: 700, fontFamily: fontSans }}>Documento Legal</span>
          <Badge text="Pendente" color={C.amber} />
        </div>
        <p style={{ color: C.textSec, fontSize: 12, lineHeight: 1.6, margin: "0 0 12px", fontFamily: fontSans }}>
          Opcionalmente, anexe um documento legal de guarda responsável assinado por ambas as partes
          para dar validade jurídica à transferência de cuidados.
        </p>
        <button style={{
          padding: "10px 18px", borderRadius: 12, cursor: "pointer",
          background: C.amber + "14", border: `1px solid ${C.amber}20`,
          fontFamily: fontSans, fontSize: 12, fontWeight: 700, color: C.amber,
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <Ico type="download" size={14} color={C.amber} /> Baixar Modelo de Documento
        </button>
      </div>
    </>
  );

  // ====== SIMULATION MODAL ======
  const SimulationModal = () => {
    const [simStep, setSimStep] = useState(0);
    const steps = [
      { title: "Notificação Enviada", desc: "O app enviou a verificação periódica. Você não respondeu.", emoji: "📱", color: C.ocean },
      { title: "SMS de Segurança", desc: "Após 48h sem resposta, um SMS foi enviado para seu telefone.", emoji: "📨", color: C.amber },
      { title: "Alerta aos Contatos", desc: "Lúcia e Dra. Carla foram notificadas discretamente.", emoji: "👥", color: C.amber },
      { title: "Maria Notificada", desc: "Maria recebeu o alerta oficial como tutora de reserva.", emoji: "🛡️", color: C.shield },
      { title: "Acesso Transferido", desc: "Maria agora tem acesso total ao Rex: prontuário, diário, memórias e carta pessoal.", emoji: "💛", color: C.sage },
    ];

    return (
      <div style={{ position: "absolute", inset: 0, zIndex: 50, background: "rgba(43,30,18,0.5)", backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-end" }}>
        <div style={{ background: C.bg, borderRadius: "28px 28px 0 0", width: "100%", maxHeight: "80%", overflow: "auto", padding: "8px 22px 30px" }}>
          <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 16px" }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: C.textGhost }} />
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <h3 style={{ color: C.ink, fontSize: 20, fontWeight: 700, margin: 0, fontFamily: font }}>Simulação de Ativação</h3>
            <button onClick={() => setShowSim(false)} style={{ background: C.warm, border: "none", borderRadius: 10, width: 36, height: 36, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Ico type="x" size={18} color={C.inkSec} />
            </button>
          </div>
          <p style={{ color: C.textDim, fontSize: 13, margin: "4px 0 20px", fontFamily: fontSans }}>
            Isto é apenas uma simulação. Nenhuma ação real será executada.
          </p>

          {/* Progress */}
          <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
            {steps.map((_, i) => (
              <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= simStep ? steps[simStep].color : C.borderLight, transition: "background 0.4s" }} />
            ))}
          </div>

          {/* Current step */}
          <div style={{
            background: C.card, borderRadius: 24, padding: 28, textAlign: "center",
            border: `1px solid ${steps[simStep].color}18`, marginBottom: 20,
          }}>
            <span style={{ fontSize: 48, display: "block", marginBottom: 16 }}>{steps[simStep].emoji}</span>
            <h4 style={{ color: C.ink, fontSize: 18, fontWeight: 700, margin: "0 0 8px", fontFamily: font }}>
              {steps[simStep].title}
            </h4>
            <p style={{ color: C.textSec, fontSize: 14, lineHeight: 1.6, margin: 0, fontFamily: fontSans }}>
              {steps[simStep].desc}
            </p>
          </div>

          {/* Navigation */}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => simStep > 0 && setSimStep(simStep - 1)} style={{
              flex: 1, padding: 14, borderRadius: 14, cursor: simStep > 0 ? "pointer" : "default",
              background: C.card, border: `1px solid ${C.border}`,
              color: simStep > 0 ? C.inkSec : C.textGhost, fontSize: 14, fontWeight: 600, fontFamily: fontSans,
              opacity: simStep > 0 ? 1 : 0.4,
            }}>← Anterior</button>
            {simStep < steps.length - 1 ? (
              <button onClick={() => setSimStep(simStep + 1)} style={{
                flex: 1, padding: 14, borderRadius: 14, cursor: "pointer",
                background: steps[simStep].color, border: "none",
                color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: fontSans,
              }}>Próximo →</button>
            ) : (
              <button onClick={() => setShowSim(false)} style={{
                flex: 1, padding: 14, borderRadius: 14, cursor: "pointer",
                background: C.sage, border: "none",
                color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: fontSans,
              }}>Concluir Simulação</button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const tabContent = { visao: TabVisao, tutor: TabTutor, info: TabInfo, carta: TabCarta, protocolo: TabProtocolo };
  const ActiveTab = tabContent[activeTab] || TabVisao;

  return (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center",
      minHeight: "100vh", padding: 20,
      background: `linear-gradient(170deg, #EDE8DF 0%, #E3DACB 50%, #D9D0C0 100%)`,
      fontFamily: fontSans,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Nunito:wght@400;500;600;700;800&family=Caveat:wght@400;600;700&display=swap" rel="stylesheet" />

      <div ref={containerRef} style={{
        width: 400, maxHeight: 820, background: C.bg, borderRadius: 40,
        overflow: "auto", position: "relative",
        boxShadow: `0 20px 80px rgba(43,30,18,0.12), 0 0 0 1px ${C.border}`,
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
            <h1 style={{ color: C.ink, fontSize: 20, margin: 0, fontWeight: 700, fontFamily: font }}>Testamento Emocional</h1>
            <p style={{ color: C.textDim, fontSize: 12, margin: "2px 0 0" }}>Proteção e legado do Rex</p>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 4, padding: "6px 12px",
            borderRadius: 10, background: C.sage + "14",
          }}>
            <StatusDot active />
            <span style={{ color: C.sage, fontSize: 11, fontWeight: 700 }}>Ativo</span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          position: "sticky", top: 28, zIndex: 15,
          padding: "16px 20px 10px",
          background: `linear-gradient(to bottom, ${C.bg}, ${C.bg}F5, ${C.bg}00)`,
        }}>
          <div style={{ display: "flex", gap: 4, overflow: "auto" }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                padding: "8px 14px", borderRadius: 12, cursor: "pointer", whiteSpace: "nowrap",
                background: activeTab === t.id ? C.shield : C.card,
                border: activeTab === t.id ? "none" : `1px solid ${C.border}`,
                color: activeTab === t.id ? "#fff" : C.inkDim,
                fontSize: 12, fontWeight: 700, fontFamily: fontSans,
                transition: "all 0.2s",
              }}>{t.label}</button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "4px 20px 30px" }}>
          <ActiveTab />
        </div>

        {showSim && <SimulationModal />}

        <style>{`::-webkit-scrollbar{width:0;height:0}`}</style>
      </div>
    </div>
  );
}
