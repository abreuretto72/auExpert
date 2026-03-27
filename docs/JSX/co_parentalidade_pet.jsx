import { useState, useRef } from "react";

// ======================== DESIGN TOKENS ========================
const C = {
  bg: "#F7F3ED", bgDeep: "#EDE7DC", cream: "#FFFDF8",
  card: "#FFFFFF", cardWarm: "#FDFAF5",
  ink: "#2D2218", inkSec: "#5C4A38", inkDim: "#9E8D7A", inkGhost: "#C4B6A4",
  terra: "#C4754B", terraSoft: "#C4754B10", terraGlow: "#C4754B20",
  forest: "#5A8F6B", forestSoft: "#5A8F6B10",
  ocean: "#4B7FB5", oceanSoft: "#4B7FB510",
  sun: "#D4A03E", sunSoft: "#D4A03E10", sunWarm: "#D4A03E25",
  berry: "#A45D8C", berrySoft: "#A45D8C10",
  coral: "#D06854", coralSoft: "#D0685410",
  stone: "#7A8B7E", stoneSoft: "#7A8B7E10",
  rose: "#C9707D", roseSoft: "#C9707D10",
  border: "#E6DDD0", borderLight: "#EDE7DC",
  shadow: "0 3px 20px rgba(45,34,24,0.06)",
};
const font = "'Literata', 'Georgia', serif";
const fontSans = "'Outfit', -apple-system, sans-serif";

// ======================== ICONS ========================
const Ico = ({ type, size = 20, color = C.inkDim }) => {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" };
  const icons = {
    back: <svg {...p}><polyline points="15,18 9,12 15,6"/></svg>,
    plus: <svg {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    x: <svg {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    check: <svg {...p} strokeWidth="2.5"><polyline points="20,6 9,17 4,12"/></svg>,
    shield: <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    heart: <svg {...p}><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
    users: <svg {...p}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
    user: <svg {...p}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    star: <svg {...p} fill={color} stroke="none"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>,
    calendar: <svg {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    clock: <svg {...p}><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>,
    bell: <svg {...p}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
    key: <svg {...p}><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>,
    eye: <svg {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    edit: <svg {...p}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    send: <svg {...p}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/></svg>,
    phone: <svg {...p}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>,
    map: <svg {...p}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
    alert: <svg {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
    home: <svg {...p}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>,
    paw: <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><ellipse cx="12" cy="17" rx="4.5" ry="4"/><circle cx="7" cy="10.5" r="2.2"/><circle cx="17" cy="10.5" r="2.2"/><circle cx="9.5" cy="6.5" r="1.8"/><circle cx="14.5" cy="6.5" r="1.8"/></svg>,
    link: <svg {...p}><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>,
    camera: <svg {...p}><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>,
    gift: <svg {...p}><polyline points="20,12 20,22 4,22 4,12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 110-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 100-5C13 2 12 7 12 7z"/></svg>,
    settings: <svg {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  };
  return icons[type] || null;
};

// ======================== SHARED COMPONENTS ========================
const Badge = ({ text, color, bg, big }) => (
  <span style={{
    background: bg || color + "14", color, fontSize: big ? 12 : 10, fontWeight: 700,
    padding: big ? "5px 14px" : "3px 10px", borderRadius: 14, letterSpacing: 0.2, fontFamily: fontSans,
  }}>{text}</span>
);

const Avatar = ({ emoji, size = 48, bg = C.terraSoft, ring, ringColor = C.terra, initials, photo }) => (
  <div style={{
    width: size, height: size, borderRadius: size * 0.35, flexShrink: 0,
    background: photo ? `url(${photo}) center/cover` : bg,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: initials ? size * 0.36 : size * 0.52,
    fontWeight: 700, color: initials ? ringColor : undefined,
    fontFamily: fontSans,
    border: ring ? `2.5px solid ${ringColor}` : "none",
    boxShadow: ring ? `0 2px 12px ${ringColor}20` : "none",
  }}>{initials || emoji}</div>
);

const SectionHead = ({ children, icon, iconColor, right }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "26px 0 14px" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {icon && <Ico type={icon} size={15} color={iconColor || C.terra} />}
      <span style={{ color: C.inkDim, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", fontFamily: fontSans }}>{children}</span>
    </div>
    {right}
  </div>
);

// ======================== FAMILY CIRCLE VISUALIZATION ========================
const FamilyCircle = ({ members, pet }) => {
  const centerX = 160, centerY = 115, radius = 80;
  const outer = members.filter(m => m.role !== "tutor_principal");
  return (
    <div style={{
      background: `radial-gradient(ellipse at center, ${C.forest}06, transparent 70%)`,
      borderRadius: 24, padding: "20px 0 16px", position: "relative",
      border: `1px solid ${C.border}`, overflow: "hidden",
    }}>
      {/* Decorative rings */}
      <svg viewBox="0 0 320 230" style={{ width: "100%", display: "block" }}>
        <defs>
          <radialGradient id="cg" cx="50%" cy="48%" r="50%">
            <stop offset="0%" stopColor={C.terra} stopOpacity="0.04" />
            <stop offset="100%" stopColor={C.forest} stopOpacity="0.02" />
          </radialGradient>
        </defs>
        <circle cx={centerX} cy={centerY} r={radius + 30} fill="none" stroke={C.border} strokeWidth="0.5" strokeDasharray="4,6" />
        <circle cx={centerX} cy={centerY} r={radius} fill="none" stroke={C.terra} strokeWidth="0.8" strokeDasharray="3,5" opacity="0.3" />
        <circle cx={centerX} cy={centerY} r="30" fill="url(#cg)" stroke={C.terra} strokeWidth="1.5" opacity="0.5" />

        {/* Connection lines */}
        {outer.map((m, i) => {
          const angle = (i / outer.length) * Math.PI * 2 - Math.PI / 2;
          const x = centerX + Math.cos(angle) * (radius + 30);
          const y = centerY + Math.sin(angle) * (radius + 30);
          return (
            <line key={`l${i}`} x1={centerX} y1={centerY} x2={x} y2={y}
              stroke={m.color || C.inkGhost} strokeWidth="1" strokeDasharray="3,4" opacity="0.35" />
          );
        })}

        {/* Center pet */}
        <circle cx={centerX} cy={centerY} r="26" fill={C.cream} stroke={C.terra} strokeWidth="2" />
        <text x={centerX} y={centerY + 8} textAnchor="middle" fontSize="26">{pet.emoji}</text>

        {/* Tutor principal — closest ring */}
        {members.filter(m => m.role === "tutor_principal").map((m, i) => {
          const x = centerX, y = centerY - radius + 8;
          return (
            <g key="tp">
              <circle cx={x} cy={y} r="20" fill={C.cream} stroke={C.terra} strokeWidth="2" />
              <text x={x} y={y + 6} textAnchor="middle" fontSize="16">{m.emoji}</text>
              <text x={x} y={y + 28} textAnchor="middle" fontSize="8" fontWeight="700" fill={C.terra} fontFamily={fontSans}>TUTOR</text>
            </g>
          );
        })}

        {/* Outer members */}
        {outer.map((m, i) => {
          const angle = (i / outer.length) * Math.PI * 2 - Math.PI / 2;
          const x = centerX + Math.cos(angle) * (radius + 30);
          const y = centerY + Math.sin(angle) * (radius + 30);
          return (
            <g key={`m${i}`}>
              <circle cx={x} cy={y} r="18" fill={C.cream} stroke={m.color || C.inkGhost} strokeWidth="1.5" />
              <text x={x} y={y + 5} textAnchor="middle" fontSize="15">{m.emoji}</text>
              <text x={x} y={y + 25} textAnchor="middle" fontSize="7" fontWeight="600" fill={C.inkDim} fontFamily={fontSans}>
                {m.shortName}
              </text>
            </g>
          );
        })}
      </svg>

      <p style={{ color: C.inkDim, fontSize: 11, textAlign: "center", margin: "4px 0 0", fontFamily: fontSans }}>
        A rede de cuidado do {pet.name}
      </p>
    </div>
  );
};

// ======================== PERMISSIONS MODAL ========================
const PermissionsModal = ({ member, onClose }) => {
  const perms = [
    { key: "health", label: "Ver prontuário de saúde", icon: "shield", enabled: true },
    { key: "diary", label: "Escrever no diário", icon: "edit", enabled: member.role === "tutor_reserva" || member.role === "tutor_principal" },
    { key: "photos", label: "Adicionar fotos e vídeos", icon: "camera", enabled: true },
    { key: "calendar", label: "Ver e editar agenda de cuidados", icon: "calendar", enabled: member.role !== "vizinho" },
    { key: "location", label: "Ver localização do pet", icon: "map", enabled: member.role !== "vizinho" },
    { key: "emergency", label: "Receber alertas de emergência", icon: "bell", enabled: true },
    { key: "contacts", label: "Ver contatos dos outros cuidadores", icon: "phone", enabled: member.role === "tutor_reserva" },
    { key: "succession", label: "Acesso total em caso de sucessão", icon: "key", enabled: member.role === "tutor_reserva" },
  ];

  const [states, setStates] = useState(perms.reduce((a, p) => ({ ...a, [p.key]: p.enabled }), {}));

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 50,
      background: "rgba(45,34,24,0.45)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "flex-end",
    }}>
      <div style={{
        background: C.bg, borderRadius: "28px 28px 0 0", width: "100%",
        maxHeight: "80%", overflow: "auto", padding: "8px 22px 30px",
        boxShadow: "0 -10px 40px rgba(45,34,24,0.15)",
      }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 16px" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: C.inkGhost }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
          <Avatar emoji={member.emoji} size={50} bg={member.color + "15"} ring ringColor={member.color} />
          <div style={{ flex: 1 }}>
            <h3 style={{ color: C.ink, fontSize: 18, fontWeight: 700, margin: 0, fontFamily: font }}>{member.name}</h3>
            <p style={{ color: C.inkDim, fontSize: 12, margin: "2px 0 0", fontFamily: fontSans }}>{member.roleLabel}</p>
          </div>
          <button onClick={onClose} style={{ background: C.bgDeep, border: "none", borderRadius: 10, width: 36, height: 36, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Ico type="x" size={18} color={C.inkSec} />
          </button>
        </div>

        <p style={{ color: C.inkDim, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", margin: "0 0 14px", fontFamily: fontSans }}>
          Permissões de acesso
        </p>

        {perms.map((pm) => (
          <div key={pm.key} style={{
            display: "flex", alignItems: "center", gap: 14, padding: "14px 0",
            borderBottom: `1px solid ${C.borderLight}`,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12, flexShrink: 0,
              background: states[pm.key] ? C.forest + "10" : C.bgDeep,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Ico type={pm.icon} size={17} color={states[pm.key] ? C.forest : C.inkGhost} />
            </div>
            <span style={{
              flex: 1, color: states[pm.key] ? C.ink : C.inkDim,
              fontSize: 13, fontWeight: 600, fontFamily: fontSans,
            }}>{pm.label}</span>
            <button onClick={() => setStates(s => ({ ...s, [pm.key]: !s[pm.key] }))} style={{
              width: 48, height: 28, borderRadius: 14, cursor: "pointer",
              background: states[pm.key] ? C.forest : C.bgDeep,
              border: `1px solid ${states[pm.key] ? C.forest : C.border}`,
              position: "relative", transition: "all 0.25s",
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: 11, background: C.cream,
                position: "absolute", top: 2,
                left: states[pm.key] ? 23 : 2,
                transition: "left 0.25s", boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
              }} />
            </button>
          </div>
        ))}

        {member.role === "tutor_reserva" && (
          <div style={{
            background: C.coralSoft, borderRadius: 16, padding: "14px 16px", marginTop: 20,
            border: `1px solid ${C.coral}15`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <Ico type="shield" size={16} color={C.coral} />
              <span style={{ color: C.coral, fontSize: 12, fontWeight: 700, fontFamily: fontSans }}>Tutor de Reserva</span>
            </div>
            <p style={{ color: C.inkSec, fontSize: 12, lineHeight: 1.6, margin: 0, fontFamily: fontSans }}>
              Em caso de impossibilidade do tutor principal, esta pessoa receberá acesso total ao perfil, prontuário, memórias e todas as informações do Rex automaticamente.
            </p>
          </div>
        )}

        <button onClick={onClose} style={{
          width: "100%", padding: "14px", borderRadius: 16, cursor: "pointer", marginTop: 20,
          background: C.terra, border: "none", color: "#fff",
          fontSize: 14, fontWeight: 700, fontFamily: fontSans,
        }}>Salvar Permissões</button>
      </div>
    </div>
  );
};

// ======================== INVITE MODAL ========================
const InviteModal = ({ onClose }) => {
  const [selectedRole, setSelectedRole] = useState(null);
  const roles = [
    { id: "padrinho", emoji: "🤲", label: "Padrinho / Madrinha", desc: "Cuida quando você viaja, ajuda no dia a dia", color: C.ocean },
    { id: "passeador", emoji: "🚶", label: "Passeador(a)", desc: "Pessoa que passeia regularmente com o pet", color: C.forest },
    { id: "veterinario", emoji: "🩺", label: "Veterinário(a)", desc: "Profissional de saúde com acesso ao prontuário", color: C.coral },
    { id: "vizinho", emoji: "🏠", label: "Vizinho(a)", desc: "Ajuda em emergências, SOS ração, olha de vez em quando", color: C.sun },
    { id: "familiar", emoji: "👨‍👩‍👧", label: "Familiar", desc: "Membro da família que convive com o pet", color: C.berry },
    { id: "tutor_reserva", emoji: "🛡️", label: "Tutor de Reserva", desc: "Assume os cuidados caso algo aconteça com você", color: C.coral },
  ];

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 50,
      background: "rgba(45,34,24,0.45)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "flex-end",
    }}>
      <div style={{
        background: C.bg, borderRadius: "28px 28px 0 0", width: "100%",
        maxHeight: "85%", overflow: "auto", padding: "8px 22px 30px",
        boxShadow: "0 -10px 40px rgba(45,34,24,0.15)",
      }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 16px" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: C.inkGhost }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <h3 style={{ color: C.ink, fontSize: 20, fontWeight: 700, margin: 0, fontFamily: font }}>Convidar Cuidador</h3>
          <button onClick={onClose} style={{ background: C.bgDeep, border: "none", borderRadius: 10, width: 36, height: 36, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Ico type="x" size={18} color={C.inkSec} />
          </button>
        </div>
        <p style={{ color: C.inkDim, fontSize: 13, margin: "4px 0 20px", lineHeight: 1.5, fontFamily: fontSans }}>
          Escolha o papel desta pessoa na vida do Rex
        </p>

        {roles.map(r => (
          <button key={r.id} onClick={() => setSelectedRole(r.id)} style={{
            display: "flex", alignItems: "center", gap: 14, width: "100%",
            background: selectedRole === r.id ? r.color + "10" : C.card,
            border: `1.5px solid ${selectedRole === r.id ? r.color + "40" : C.border}`,
            borderRadius: 18, padding: "14px 16px", marginBottom: 10,
            cursor: "pointer", textAlign: "left", fontFamily: fontSans,
            transition: "all 0.2s",
          }}>
            <div style={{
              width: 46, height: 46, borderRadius: 15, flexShrink: 0,
              background: r.color + "12", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, border: selectedRole === r.id ? `2px solid ${r.color}40` : "none",
            }}>{r.emoji}</div>
            <div style={{ flex: 1 }}>
              <p style={{ color: C.ink, fontSize: 14, fontWeight: 700, margin: 0 }}>{r.label}</p>
              <p style={{ color: C.inkDim, fontSize: 12, margin: "3px 0 0" }}>{r.desc}</p>
            </div>
            {selectedRole === r.id && <Ico type="check" size={20} color={r.color} />}
          </button>
        ))}

        {selectedRole && (
          <>
            <p style={{ color: C.inkDim, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", margin: "20px 0 10px", fontFamily: fontSans }}>
              Como enviar o convite
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              {[
                { icon: "link", label: "Copiar Link", color: C.ocean },
                { icon: "send", label: "WhatsApp", color: C.forest },
                { icon: "phone", label: "SMS", color: C.stone },
              ].map((m, i) => (
                <button key={i} onClick={onClose} style={{
                  flex: 1, padding: "14px 8px", borderRadius: 16, cursor: "pointer",
                  background: C.card, border: `1px solid ${C.border}`,
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                  fontFamily: fontSans, fontSize: 11, fontWeight: 600, color: C.inkSec,
                }}>
                  <Ico type={m.icon} size={20} color={m.color} />
                  {m.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ======================== MAIN SCREEN ========================
export default function CoParentalidade() {
  const [activeTab, setActiveTab] = useState("equipe");
  const [showPerms, setShowPerms] = useState(null);
  const [showInvite, setShowInvite] = useState(false);
  const containerRef = useRef();

  const pet = { name: "Rex", emoji: "🐕", breed: "Labrador" };

  const members = [
    {
      id: "ana", name: "Ana Martins", emoji: "👩", role: "tutor_principal",
      roleLabel: "Tutora Principal", color: C.terra,
      shortName: "Ana", since: "Mar 2023",
      phone: "(15) 99812-3456", trust: 5.0, activities: 127,
      lastAction: "Passeio no parque · Hoje 16:45",
    },
    {
      id: "maria", name: "Maria Santos", emoji: "👩‍🦰", role: "tutor_reserva",
      roleLabel: "Tutora de Reserva", color: C.coral,
      shortName: "Maria", since: "Jun 2023",
      phone: "(15) 99734-5678", trust: 4.9, activities: 45,
      lastAction: "Deu banho no Rex · Ontem",
      relation: "Irmã da tutora",
    },
    {
      id: "carlos", name: "Carlos Lima", emoji: "👨", role: "padrinho",
      roleLabel: "Padrinho", color: C.ocean,
      shortName: "Carlos", since: "Set 2023",
      phone: "(15) 99645-1234", trust: 4.8, activities: 34,
      lastAction: "Passeio de 40min · 3 dias atrás",
      relation: "Vizinho do prédio",
    },
    {
      id: "paula", name: "Paula Ribeiro", emoji: "👩‍🦱", role: "passeadora",
      roleLabel: "Passeadora", color: C.forest,
      shortName: "Paula", since: "Jan 2024",
      phone: "(15) 99556-7890", trust: 4.7, activities: 89,
      lastAction: "Passeio matinal · Hoje 08:00",
      relation: "Passeadora profissional",
    },
    {
      id: "drcarla", name: "Dra. Carla Mendes", emoji: "👩‍⚕️", role: "veterinario",
      roleLabel: "Veterinária", color: C.coral,
      shortName: "Dra.Carla", since: "Mar 2023",
      phone: "(15) 3412-5678", trust: 5.0, activities: 12,
      lastAction: "Consulta check-up · 12 Mar",
      relation: "Clínica VetBem",
    },
    {
      id: "pedro", name: "Pedro Alves", emoji: "👦", role: "vizinho",
      roleLabel: "Vizinho", color: C.sun,
      shortName: "Pedro", since: "Nov 2024",
      phone: "(15) 99478-2345", trust: 4.5, activities: 8,
      lastAction: "Deu petisco · 5 dias atrás",
      relation: "Vizinho do 3º andar",
    },
    {
      id: "lucia", name: "Lúcia Martins", emoji: "👵", role: "familiar",
      roleLabel: "Familiar (Avó)", color: C.berry,
      shortName: "Lúcia", since: "Mar 2023",
      phone: "(15) 99312-8765", trust: 5.0, activities: 22,
      lastAction: "Ficou com Rex no feriado · 2 semanas",
      relation: "Mãe da tutora",
    },
  ];

  const careSchedule = [
    { day: "Seg", slots: [
      { time: "07:00", task: "Passeio matinal", who: "Paula", emoji: "👩‍🦱", color: C.forest },
      { time: "12:00", task: "Almoço e água", who: "Ana", emoji: "👩", color: C.terra },
      { time: "17:30", task: "Passeio tarde", who: "Ana", emoji: "👩", color: C.terra },
    ]},
    { day: "Ter", slots: [
      { time: "07:00", task: "Passeio matinal", who: "Paula", emoji: "👩‍🦱", color: C.forest },
      { time: "12:00", task: "Almoço e água", who: "Ana", emoji: "👩", color: C.terra },
      { time: "17:30", task: "Passeio tarde", who: "Carlos", emoji: "👨", color: C.ocean },
    ]},
    { day: "Qua", slots: [
      { time: "07:00", task: "Passeio matinal", who: "Paula", emoji: "👩‍🦱", color: C.forest },
      { time: "10:00", task: "Escovação", who: "Ana", emoji: "👩", color: C.terra },
      { time: "17:30", task: "Passeio tarde", who: "Ana", emoji: "👩", color: C.terra },
    ]},
    { day: "Qui", slots: [
      { time: "07:00", task: "Passeio matinal", who: "Paula", emoji: "👩‍🦱", color: C.forest },
      { time: "17:30", task: "Passeio tarde", who: "Carlos", emoji: "👨", color: C.ocean },
    ]},
    { day: "Sex", slots: [
      { time: "07:00", task: "Passeio matinal", who: "Paula", emoji: "👩‍🦱", color: C.forest },
      { time: "14:00", task: "Playdate (Nina)", who: "Ana", emoji: "👩", color: C.terra },
      { time: "17:30", task: "Passeio tarde", who: "Ana", emoji: "👩", color: C.terra },
    ]},
    { day: "Sáb", slots: [
      { time: "09:00", task: "Passeio longo", who: "Ana", emoji: "👩", color: C.terra },
      { time: "15:00", task: "Brincadeira parque", who: "Carlos", emoji: "👨", color: C.ocean },
    ]},
    { day: "Dom", slots: [
      { time: "10:00", task: "Passeio com a família", who: "Lúcia", emoji: "👵", color: C.berry },
    ]},
  ];

  const recentActivity = [
    { who: "Paula", emoji: "👩‍🦱", action: "Passeio matinal de 35min", time: "Hoje 08:00", color: C.forest, type: "walk" },
    { who: "Ana", emoji: "👩", action: "Registrou humor: 😊 Feliz", time: "Hoje 07:30", color: C.terra, type: "mood" },
    { who: "Carlos", emoji: "👨", action: "Adicionou foto no diário", time: "Ontem 18:20", color: C.ocean, type: "photo" },
    { who: "Maria", emoji: "👩‍🦰", action: "Deu banho completo", time: "Ontem 14:00", color: C.coral, type: "care" },
    { who: "Dra. Carla", emoji: "👩‍⚕️", action: "Atualizou prontuário", time: "12 Mar", color: C.coral, type: "health" },
    { who: "Pedro", emoji: "👦", action: "Deu petisco na portaria", time: "21 Mar", color: C.sun, type: "treat" },
    { who: "Lúcia", emoji: "👵", action: "Ficou 3 dias com Rex (feriado)", time: "15-17 Mar", color: C.berry, type: "stay" },
  ];

  const tabs = [
    { id: "equipe", label: "Equipe" },
    { id: "agenda", label: "Agenda" },
    { id: "atividades", label: "Atividades" },
    { id: "sucessao", label: "Sucessão" },
  ];

  // ====== TAB: EQUIPE ======
  const TabEquipe = () => (
    <>
      <FamilyCircle members={members} pet={pet} />

      <SectionHead icon="users" iconColor={C.terra}>Cuidadores ({members.length})</SectionHead>

      {members.map((m) => (
        <div key={m.id} style={{
          background: C.card, borderRadius: 22, padding: 18, marginBottom: 12,
          border: `1px solid ${C.border}`, boxShadow: C.shadow,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
            <Avatar emoji={m.emoji} size={52} bg={m.color + "12"} ring ringColor={m.color} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ color: C.ink, fontSize: 15, fontWeight: 700, fontFamily: fontSans }}>{m.name}</span>
                <Badge text={m.roleLabel} color={m.color} />
              </div>
              <p style={{ color: C.inkDim, fontSize: 12, margin: "3px 0 0", fontFamily: fontSans }}>
                {m.relation ? `${m.relation} · ` : ""}Desde {m.since}
              </p>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <div style={{ flex: 1, background: C.bgDeep, borderRadius: 12, padding: "8px 10px", textAlign: "center" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                <Ico type="star" size={12} color={C.sun} />
                <span style={{ color: C.sun, fontSize: 14, fontWeight: 800, fontFamily: fontSans }}>{m.trust}</span>
              </div>
              <p style={{ color: C.inkDim, fontSize: 9, margin: "2px 0 0", fontFamily: fontSans }}>Confiança</p>
            </div>
            <div style={{ flex: 1, background: C.bgDeep, borderRadius: 12, padding: "8px 10px", textAlign: "center" }}>
              <span style={{ color: C.ink, fontSize: 14, fontWeight: 800, fontFamily: fontSans }}>{m.activities}</span>
              <p style={{ color: C.inkDim, fontSize: 9, margin: "2px 0 0", fontFamily: fontSans }}>Atividades</p>
            </div>
            <div style={{ flex: 1.8, background: C.bgDeep, borderRadius: 12, padding: "8px 10px" }}>
              <p style={{ color: C.inkDim, fontSize: 9, margin: "0 0 2px", fontFamily: fontSans }}>Última ação</p>
              <p style={{ color: C.inkSec, fontSize: 11, fontWeight: 600, margin: 0, fontFamily: fontSans }}>{m.lastAction}</p>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowPerms(m)} style={{
              flex: 1, padding: "10px", borderRadius: 12, cursor: "pointer",
              background: C.bgDeep, border: `1px solid ${C.border}`,
              fontFamily: fontSans, fontSize: 12, fontWeight: 600, color: C.inkSec,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              <Ico type="key" size={14} color={C.inkDim} /> Permissões
            </button>
            <button style={{
              flex: 1, padding: "10px", borderRadius: 12, cursor: "pointer",
              background: C.bgDeep, border: `1px solid ${C.border}`,
              fontFamily: fontSans, fontSize: 12, fontWeight: 600, color: C.inkSec,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              <Ico type="send" size={14} color={C.inkDim} /> Mensagem
            </button>
            <button style={{
              padding: "10px 12px", borderRadius: 12, cursor: "pointer",
              background: C.bgDeep, border: `1px solid ${C.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Ico type="phone" size={14} color={C.inkDim} />
            </button>
          </div>
        </div>
      ))}
    </>
  );

  // ====== TAB: AGENDA ======
  const [selectedDay, setSelectedDay] = useState("Seg");
  const TabAgenda = () => (
    <>
      <div style={{
        background: C.card, borderRadius: 22, padding: 18, marginBottom: 16,
        border: `1px solid ${C.border}`, boxShadow: C.shadow,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <Ico type="calendar" size={18} color={C.terra} />
          <span style={{ color: C.ink, fontSize: 15, fontWeight: 700, fontFamily: font }}>Agenda Semanal de Cuidados</span>
        </div>

        {/* Day selector */}
        <div style={{ display: "flex", gap: 4, marginBottom: 18 }}>
          {careSchedule.map(d => (
            <button key={d.day} onClick={() => setSelectedDay(d.day)} style={{
              flex: 1, padding: "10px 4px", borderRadius: 12, cursor: "pointer",
              background: selectedDay === d.day ? C.terra : "transparent",
              border: selectedDay === d.day ? "none" : `1px solid ${C.borderLight}`,
              color: selectedDay === d.day ? "#fff" : C.inkDim,
              fontSize: 12, fontWeight: 700, fontFamily: fontSans,
              transition: "all 0.2s",
            }}>{d.day}</button>
          ))}
        </div>

        {/* Day schedule */}
        {careSchedule.filter(d => d.day === selectedDay).map(day => (
          <div key={day.day} style={{ position: "relative", paddingLeft: 20 }}>
            <div style={{ position: "absolute", left: 6, top: 8, bottom: 8, width: 2, background: C.border }} />
            {day.slots.map((s, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 12, marginBottom: 14,
                position: "relative",
              }}>
                <div style={{
                  position: "absolute", left: -17, width: 12, height: 12, borderRadius: 6,
                  background: C.cream, border: `2.5px solid ${s.color}`,
                }} />
                <span style={{ color: C.inkDim, fontSize: 12, fontWeight: 700, fontFamily: fontSans, width: 42, flexShrink: 0 }}>{s.time}</span>
                <div style={{
                  flex: 1, background: s.color + "08", borderRadius: 14, padding: "10px 14px",
                  border: `1px solid ${s.color}15`, display: "flex", alignItems: "center", gap: 10,
                }}>
                  <span style={{ fontSize: 18 }}>{s.emoji}</span>
                  <div>
                    <p style={{ color: C.ink, fontSize: 13, fontWeight: 600, margin: 0, fontFamily: fontSans }}>{s.task}</p>
                    <p style={{ color: C.inkDim, fontSize: 11, margin: "2px 0 0", fontFamily: fontSans }}>{s.who}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Coverage Stats */}
      <div style={{
        background: C.card, borderRadius: 20, padding: 18,
        border: `1px solid ${C.border}`, boxShadow: C.shadow,
      }}>
        <p style={{ color: C.inkDim, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", margin: "0 0 14px", fontFamily: fontSans }}>
          Cobertura semanal por cuidador
        </p>
        {[
          { name: "Ana (Tutora)", pct: 45, color: C.terra },
          { name: "Paula (Passeadora)", pct: 30, color: C.forest },
          { name: "Carlos (Padrinho)", pct: 15, color: C.ocean },
          { name: "Lúcia (Avó)", pct: 10, color: C.berry },
        ].map((c, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ color: C.inkSec, fontSize: 12, fontWeight: 600, fontFamily: fontSans }}>{c.name}</span>
              <span style={{ color: c.color, fontSize: 12, fontWeight: 700, fontFamily: fontSans }}>{c.pct}%</span>
            </div>
            <div style={{ height: 7, background: C.bgDeep, borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${c.pct}%`, borderRadius: 4, background: `linear-gradient(90deg, ${c.color}80, ${c.color})`, transition: "width 0.8s ease" }} />
            </div>
          </div>
        ))}
      </div>
    </>
  );

  // ====== TAB: ATIVIDADES ======
  const TabAtividades = () => (
    <>
      <div style={{
        background: `linear-gradient(135deg, ${C.terraSoft}, ${C.forestSoft})`,
        borderRadius: 20, padding: 18, marginBottom: 16,
        border: `1px solid ${C.terra}12`,
      }}>
        <p style={{ color: C.ink, fontSize: 15, fontWeight: 700, margin: "0 0 4px", fontFamily: font }}>Livro de Vida Coletivo</p>
        <p style={{ color: C.inkDim, fontSize: 13, lineHeight: 1.6, margin: 0, fontFamily: fontSans }}>
          Todos os cuidadores contribuem para a história do Rex. Cada ação é registrada automaticamente.
        </p>
      </div>

      <div style={{ position: "relative", paddingLeft: 22 }}>
        <div style={{ position: "absolute", left: 8, top: 8, bottom: 8, width: 2, background: `linear-gradient(to bottom, ${C.terra}30, ${C.border}, transparent)` }} />

        {recentActivity.map((a, i) => (
          <div key={i} style={{ position: "relative", marginBottom: 14 }}>
            <div style={{
              position: "absolute", left: -16, top: 6, width: 14, height: 14, borderRadius: 7,
              background: C.cream, border: `2.5px solid ${a.color}`,
            }} />
            <div style={{
              background: C.card, borderRadius: 18, padding: "14px 16px",
              border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12,
            }}>
              <Avatar emoji={a.emoji} size={40} bg={a.color + "12"} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: C.ink, fontSize: 13, fontWeight: 700, fontFamily: fontSans }}>{a.who}</span>
                </div>
                <p style={{ color: C.inkSec, fontSize: 12, margin: "2px 0 0", fontFamily: fontSans }}>{a.action}</p>
              </div>
              <span style={{ color: C.inkDim, fontSize: 10, fontFamily: fontSans, flexShrink: 0 }}>{a.time}</span>
            </div>
          </div>
        ))}

        <div style={{ textAlign: "center", padding: "12px 0" }}>
          <Ico type="paw" size={20} color={C.inkGhost} />
          <p style={{ color: C.inkGhost, fontSize: 12, margin: "6px 0 0", fontFamily: fontSans, fontStyle: "italic" }}>
            A aldeia cuida do Rex junta
          </p>
        </div>
      </div>
    </>
  );

  // ====== TAB: SUCESSÃO ======
  const TabSucessao = () => (
    <>
      {/* Emergency Card */}
      <div style={{
        background: `linear-gradient(135deg, ${C.coral}10, ${C.rose}06)`,
        borderRadius: 24, padding: 24, marginBottom: 18,
        border: `1px solid ${C.coral}18`, textAlign: "center",
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 20, margin: "0 auto 16px",
          background: C.cream, border: `2px solid ${C.coral}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 4px 20px ${C.coral}15`,
        }}>
          <Ico type="shield" size={30} color={C.coral} />
        </div>
        <h3 style={{ color: C.ink, fontSize: 19, fontWeight: 700, margin: "0 0 8px", fontFamily: font }}>Testamento Emocional</h3>
        <p style={{ color: C.inkSec, fontSize: 13, lineHeight: 1.7, margin: "0 0 18px", fontFamily: fontSans }}>
          Se algo acontecer com você, todas as informações do Rex — prontuário, memórias, diário e preferências — serão transferidas automaticamente para o tutor de reserva.
        </p>
        <Badge text="✓ Configurado" color={C.forest} big />
      </div>

      {/* Current successor */}
      <SectionHead icon="shield" iconColor={C.coral}>Tutor de Reserva Atual</SectionHead>
      <div style={{
        background: C.card, borderRadius: 22, padding: 20, marginBottom: 16,
        border: `1px solid ${C.coral}18`, boxShadow: C.shadow,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <Avatar emoji="👩‍🦰" size={56} bg={C.coral + "12"} ring ringColor={C.coral} />
          <div style={{ flex: 1 }}>
            <span style={{ color: C.ink, fontSize: 16, fontWeight: 700, fontFamily: fontSans }}>Maria Santos</span>
            <p style={{ color: C.inkDim, fontSize: 12, margin: "3px 0 0", fontFamily: fontSans }}>Irmã da tutora · Desde Jun 2023</p>
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <Badge text="Tutor de Reserva" color={C.coral} />
              <Badge text="Acesso Total" color={C.forest} />
            </div>
          </div>
        </div>

        {/* What transfers */}
        <p style={{ color: C.inkDim, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", margin: "0 0 10px", fontFamily: fontSans }}>
          O que será transferido
        </p>
        {[
          { icon: "shield", label: "Prontuário completo de saúde", desc: "Vacinas, exames, alergias, cirurgias", color: C.coral },
          { icon: "edit", label: "Diário de Vida com todas as memórias", desc: "127 entradas, fotos, vídeos, áudios", color: C.terra },
          { icon: "heart", label: "Informações emocionais", desc: "Medos, traumas, brinquedo favorito, rotina", color: C.rose },
          { icon: "users", label: "Rede de cuidadores", desc: "Contatos de todos os padrinhos e vet", color: C.ocean },
          { icon: "calendar", label: "Agenda de cuidados", desc: "Horários de passeio, medicação, alimentação", color: C.forest },
          { icon: "gift", label: "Cápsulas do Tempo", desc: "3 mensagens pendentes de desbloqueio", color: C.berry },
        ].map((item, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "10px 0",
            borderBottom: i < 5 ? `1px solid ${C.borderLight}` : "none",
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: item.color + "10", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Ico type={item.icon} size={16} color={item.color} />
            </div>
            <div>
              <p style={{ color: C.ink, fontSize: 13, fontWeight: 600, margin: 0, fontFamily: fontSans }}>{item.label}</p>
              <p style={{ color: C.inkDim, fontSize: 11, margin: "2px 0 0", fontFamily: fontSans }}>{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Emergency Info */}
      <SectionHead icon="alert" iconColor={C.coral}>Informações Críticas para o Novo Tutor</SectionHead>
      <div style={{
        background: C.card, borderRadius: 20, padding: 18,
        border: `1px solid ${C.border}`, boxShadow: C.shadow,
      }}>
        {[
          { label: "⚠️ Alergias", value: "Picada de inseto (severa), Frango (suspeita)" },
          { label: "💊 Medicação contínua", value: "Simparic 40mg mensal, Ômega 3 diário" },
          { label: "🍖 Alimentação", value: "Ração Royal Canin Labrador 2x/dia, 200g cada" },
          { label: "😰 Medos e Traumas", value: "Medo de fogos de artifício, ansiedade quando sozinho >4h" },
          { label: "🧸 Favoritos", value: "Bolinha amarela de tennis, graveto do parque, colo no sofá" },
          { label: "🚫 Não pode", value: "Chocolate, uvas, cebola. Não gosta de gatos no focinho." },
          { label: "🏥 Vet de confiança", value: "Dra. Carla Mendes · VetBem · (15) 3412-5678" },
          { label: "🆘 Emergência 24h", value: "PetCenter Salto · (15) 3421-9999" },
        ].map((item, i) => (
          <div key={i} style={{
            padding: "12px 0",
            borderBottom: i < 7 ? `1px solid ${C.borderLight}` : "none",
          }}>
            <p style={{ color: C.inkDim, fontSize: 11, fontWeight: 700, margin: "0 0 4px", fontFamily: fontSans }}>{item.label}</p>
            <p style={{ color: C.ink, fontSize: 13, fontWeight: 600, margin: 0, lineHeight: 1.5, fontFamily: fontSans }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Message to successor */}
      <SectionHead icon="gift" iconColor={C.berry}>Mensagem para o Próximo Tutor</SectionHead>
      <div style={{
        background: `linear-gradient(145deg, ${C.berrySoft}, ${C.roseSoft})`,
        borderRadius: 22, padding: 20, border: `1px solid ${C.berry}15`,
      }}>
        <p style={{
          color: C.ink, fontSize: 16, lineHeight: 1.9, margin: "0 0 14px",
          fontFamily: "'Caveat', cursive", fontStyle: "italic",
        }}>
          "Maria, se você está lendo isso, cuide do Rex como eu cuidei. Ele gosta de deitar no tapete
          da sala às 15h quando o sol bate. Sempre dá a pata esquerda primeiro. E nunca se esqueça:
          ele entende tudo o que você fala, especialmente quando você está triste. Ele vai cuidar de
          você também. Com amor, Ana."
        </p>
        <button style={{
          padding: "10px 18px", borderRadius: 12, cursor: "pointer",
          background: C.berry + "15", border: `1px solid ${C.berry}25`,
          fontFamily: fontSans, fontSize: 12, fontWeight: 700, color: C.berry,
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <Ico type="edit" size={14} color={C.berry} /> Editar Mensagem
        </button>
      </div>
    </>
  );

  const tabContent = { equipe: TabEquipe, agenda: TabAgenda, atividades: TabAtividades, sucessao: TabSucessao };
  const ActiveTab = tabContent[activeTab] || TabEquipe;

  return (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center",
      minHeight: "100vh", padding: 20,
      background: `linear-gradient(170deg, #EDE7DC 0%, #E3DACB 50%, #D9D0C0 100%)`,
      fontFamily: fontSans,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Literata:wght@400;600;700&family=Outfit:wght@400;500;600;700;800&family=Caveat:wght@400;600&display=swap" rel="stylesheet" />

      <div ref={containerRef} style={{
        width: 400, maxHeight: 820, background: C.bg, borderRadius: 40,
        overflow: "auto", position: "relative",
        boxShadow: `0 20px 80px rgba(45,34,24,0.15), 0 0 0 1px ${C.border}`,
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
            <h1 style={{ color: C.ink, fontSize: 20, margin: 0, fontWeight: 700, fontFamily: font, letterSpacing: -0.3 }}>Co-Parentalidade</h1>
            <p style={{ color: C.inkDim, fontSize: 12, margin: "1px 0 0" }}>A aldeia do Rex · 7 cuidadores</p>
          </div>
          <button onClick={() => setShowInvite(true)} style={{
            background: C.terra, border: "none", borderRadius: 12,
            padding: "8px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
          }}>
            <Ico type="plus" size={16} color="#fff" />
            <span style={{ color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: fontSans }}>Convidar</span>
          </button>
        </div>

        {/* Pet card */}
        <div style={{
          margin: "14px 20px 0", padding: "16px 18px",
          background: `linear-gradient(135deg, ${C.terraGlow}, ${C.sunSoft})`,
          borderRadius: 20, border: `1px solid ${C.terra}12`,
          display: "flex", alignItems: "center", gap: 14,
        }}>
          <div style={{
            width: 54, height: 54, borderRadius: 18, background: C.cream,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 30, border: `2px solid ${C.terra}30`,
          }}>🐕</div>
          <div style={{ flex: 1 }}>
            <span style={{ color: C.ink, fontSize: 17, fontWeight: 700, fontFamily: font }}>Rex</span>
            <p style={{ color: C.inkDim, fontSize: 12, margin: "2px 0 0", fontFamily: fontSans }}>Labrador · 3 anos · 32kg</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
              <Ico type="shield" size={14} color={C.forest} />
              <span style={{ color: C.forest, fontSize: 13, fontWeight: 700, fontFamily: fontSans }}>Protegido</span>
            </div>
            <p style={{ color: C.inkDim, fontSize: 10, margin: "2px 0 0", fontFamily: fontSans }}>Sucessão ativa</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          position: "sticky", top: 28, zIndex: 15,
          padding: "16px 20px 10px",
          background: `linear-gradient(to bottom, ${C.bg}, ${C.bg}F5, ${C.bg}00)`,
        }}>
          <div style={{ display: "flex", gap: 6 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                flex: 1, padding: "9px 6px", borderRadius: 12, cursor: "pointer",
                background: activeTab === t.id ? C.terra : C.card,
                border: activeTab === t.id ? "none" : `1px solid ${C.border}`,
                color: activeTab === t.id ? "#fff" : C.inkSec,
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

        {/* Modals */}
        {showPerms && <PermissionsModal member={showPerms} onClose={() => setShowPerms(null)} />}
        {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}

        <style>{`::-webkit-scrollbar{width:0;height:0}`}</style>
      </div>
    </div>
  );
}
