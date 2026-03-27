import { useState, useEffect, useRef } from "react";

// ======================== DESIGN SYSTEM ========================
const C = {
  bg: "#FBF8F4",
  bgWarm: "#F5EFE7",
  card: "#FFFFFF",
  cardHover: "#FFFCF7",
  primary: "#E8734A",
  primarySoft: "#E8734A15",
  primaryDark: "#C45A35",
  amber: "#E9A23B",
  amberSoft: "#E9A23B14",
  green: "#4CAF82",
  greenSoft: "#4CAF8214",
  blue: "#4A8FE8",
  blueSoft: "#4A8FE814",
  red: "#E85454",
  redSoft: "#E8545414",
  pink: "#D4699E",
  pinkSoft: "#D4699E14",
  purple: "#7E5FD6",
  purpleSoft: "#7E5FD614",
  text: "#2C2416",
  textSec: "#6B5D4F",
  textDim: "#A89B8C",
  border: "#EDE6DB",
  borderLight: "#F3EDE4",
  shadow: "0 2px 16px rgba(44,36,22,0.06)",
  shadowLg: "0 8px 32px rgba(44,36,22,0.1)",
};

const font = "'Nunito', 'DM Sans', -apple-system, sans-serif";
const fontDisplay = "'Nunito', 'Fredoka', sans-serif";

// ======================== ICONS ========================
const Ico = ({ type, size = 20, color = C.textSec, fill = "none" }) => {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill, stroke: color, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" };
  const icons = {
    home: <svg {...p}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>,
    map: <svg {...p}><polygon points="1,6 1,22 8,18 16,22 23,18 23,2 16,6 8,2"/></svg>,
    heart: <svg {...p}><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
    bell: <svg {...p}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
    user: <svg {...p}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    users: <svg {...p}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
    search: <svg {...p}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    send: <svg {...p}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/></svg>,
    plus: <svg {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    star: <svg {...p} fill={color} stroke="none"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>,
    gift: <svg {...p}><polyline points="20,12 20,22 4,22 4,12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 110-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 100-5C13 2 12 7 12 7z"/></svg>,
    shield: <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    alert: <svg {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
    camera: <svg {...p}><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>,
    chat: <svg {...p}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
    clock: <svg {...p}><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>,
    paw: <svg {...p} fill={color} stroke="none"><ellipse cx="12" cy="17" rx="4.5" ry="4"/><circle cx="7" cy="10.5" r="2.2"/><circle cx="17" cy="10.5" r="2.2"/><circle cx="9.5" cy="6.5" r="1.8"/><circle cx="14.5" cy="6.5" r="1.8"/></svg>,
    tree: <svg {...p}><path d="M12 22V8"/><path d="M5 12l7-10 7 10"/><path d="M3 17l9-7 9 7"/></svg>,
    medal: <svg {...p}><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>,
    swap: <svg {...p}><polyline points="16,3 21,3 21,8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="8,21 3,21 3,16"/><line x1="20" y1="4" x2="3" y2="21"/></svg>,
    location: <svg {...p}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
    back: <svg {...p}><polyline points="15,18 9,12 15,6"/></svg>,
    more: <svg {...p}><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>,
    check: <svg {...p} strokeWidth="2.5"><polyline points="20,6 9,17 4,12"/></svg>,
    bookmark: <svg {...p}><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>,
    droplet: <svg {...p}><path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/></svg>,
    candle: <svg {...p}><rect x="9" y="12" width="6" height="10" rx="1"/><path d="M12 2c2 3 2 5 0 7-2-2-2-4 0-7"/><line x1="12" y1="9" x2="12" y2="12"/></svg>,
  };
  return icons[type] || null;
};

// ======================== SHARED COMPONENTS ========================
const Avatar = ({ emoji, size = 44, bg = C.primarySoft, ring = false, ringColor = C.primary }) => (
  <div style={{
    width: size, height: size, borderRadius: size * 0.38, flexShrink: 0,
    background: bg, display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: size * 0.52, border: ring ? `2.5px solid ${ringColor}` : "none",
  }}>{emoji}</div>
);

const Badge = ({ text, color = C.primary, bg }) => (
  <span style={{
    background: bg || color + "14", color, fontSize: 11, fontWeight: 700,
    padding: "3px 10px", borderRadius: 20, letterSpacing: 0.2,
  }}>{text}</span>
);

const Btn = ({ children, color = C.primary, outline, full, small, onClick, style: s }) => (
  <button onClick={onClick} style={{
    padding: small ? "8px 16px" : "13px 24px",
    borderRadius: 14, cursor: "pointer", fontFamily: font,
    background: outline ? "transparent" : color,
    border: outline ? `1.5px solid ${color}30` : "none",
    color: outline ? color : "#fff",
    fontSize: small ? 12 : 14, fontWeight: 700,
    width: full ? "100%" : "auto",
    transition: "all 0.2s", ...s,
  }}>{children}</button>
);

const TabBar = ({ active, onTab }) => {
  const tabs = [
    { id: "feed", icon: "home", label: "Início" },
    { id: "map", icon: "map", label: "Aldeia" },
    { id: "sos", icon: "bell", label: "SOS" },
    { id: "credits", icon: "star", label: "Créditos" },
    { id: "profile", icon: "paw", label: "Pet" },
  ];
  return (
    <div style={{
      position: "sticky", bottom: 0, zIndex: 20,
      background: `linear-gradient(to top, ${C.bg} 80%, transparent)`,
      padding: "12px 16px 20px",
    }}>
      <div style={{
        display: "flex", background: C.card, borderRadius: 22,
        border: `1px solid ${C.border}`, padding: 4, boxShadow: C.shadow,
      }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => onTab(t.id)} style={{
            flex: 1, padding: "10px 0", borderRadius: 18, cursor: "pointer",
            background: active === t.id ? C.primarySoft : "transparent",
            border: "none", display: "flex", flexDirection: "column",
            alignItems: "center", gap: 3, transition: "all 0.2s",
          }}>
            <Ico type={t.icon} size={20} color={active === t.id ? C.primary : C.textDim}
              fill={active === t.id && t.icon === "paw" ? C.primary : "none"} />
            <span style={{
              fontSize: 10, fontWeight: active === t.id ? 700 : 500,
              color: active === t.id ? C.primary : C.textDim, fontFamily: font,
            }}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const Header = ({ title, subtitle, back, onBack, right }) => (
  <div style={{
    padding: "16px 20px 12px", display: "flex", alignItems: "center", gap: 12,
    position: "sticky", top: 28, zIndex: 15,
    background: `linear-gradient(to bottom, ${C.bg}, ${C.bg}F5, ${C.bg}00)`,
  }}>
    {back && (
      <button onClick={onBack} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, width: 36, height: 36, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Ico type="back" size={18} color={C.text} />
      </button>
    )}
    <div style={{ flex: 1 }}>
      <h2 style={{ color: C.text, fontSize: 20, margin: 0, fontWeight: 800, fontFamily: fontDisplay }}>{title}</h2>
      {subtitle && <p style={{ color: C.textDim, fontSize: 12, margin: "2px 0 0" }}>{subtitle}</p>}
    </div>
    {right}
  </div>
);

// ======================== FEED SCREEN ========================
const FeedScreen = ({ onNav }) => {
  const stories = [
    { name: "Rex", emoji: "🐕", hasNew: true, color: C.primary },
    { name: "Luna", emoji: "🐱", hasNew: true, color: C.pink },
    { name: "Thor", emoji: "🐕‍🦺", hasNew: false, color: C.blue },
    { name: "Mel", emoji: "🐩", hasNew: true, color: C.amber },
    { name: "Pipoca", emoji: "🐹", hasNew: false, color: C.green },
    { name: "Simba", emoji: "🦁", hasNew: true, color: C.purple },
  ];

  const posts = [
    {
      pet: "Rex", tutor: "Ana M.", emoji: "🐕", time: "2h", type: "diary",
      text: "\"Hoje eu fui ao parque e encontrei um esquilo! Fiquei olhando 47 minutos sem piscar. O meu humano disse que sou 'obcecado'. Eu digo que sou FOCADO. 🐿️\"",
      tag: "Diário IA", tagColor: C.purple, likes: 34, comments: 12,
    },
    {
      pet: "Luna", tutor: "Carlos R.", emoji: "🐱", time: "4h", type: "health",
      text: "Luna fez check-up completo hoje! A IA detectou tudo normal, score de saúde 94%. Prontuário atualizado automaticamente via OCR da carteira de vacinação.",
      tag: "Saúde", tagColor: C.green, likes: 22, comments: 5,
      health: { score: 94, label: "Excelente" },
    },
    {
      pet: "Thor", tutor: "Maria L.", emoji: "🐕‍🦺", time: "5h", type: "favor",
      text: "Preciso de alguém para passear com o Thor amanhã das 14h às 15h. Ele é super tranquilo e adora caminhar devagar. Ofereço 3 Pet-Credits!",
      tag: "Pedido de Ajuda", tagColor: C.amber, likes: 8, comments: 15,
      credits: 3,
    },
    {
      pet: "Mel", tutor: "João P.", emoji: "🐩", time: "8h", type: "memorial",
      text: "Hoje faz 1 ano que a Mel nos deixou. Ela foi a melhor amiga durante 14 anos. Este espaço mantém as memórias dela vivas para sempre. Saudades eternas. 🕯️",
      tag: "Memorial", tagColor: C.pink, likes: 89, comments: 31,
    },
  ];

  return (
    <div style={{ paddingBottom: 10 }}>
      {/* Top Bar */}
      <div style={{ padding: "16px 20px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Ico type="paw" size={26} color={C.primary} fill={C.primary} />
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, fontFamily: fontDisplay, color: C.text }}>
            Rede Solidária <span style={{ color: C.primary }}>Pets</span>
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => onNav("notifications")} style={{ width: 38, height: 38, borderRadius: 12, background: C.card, border: `1px solid ${C.border}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            <Ico type="bell" size={18} color={C.textSec} />
            <div style={{ position: "absolute", top: 6, right: 7, width: 8, height: 8, borderRadius: "50%", background: C.red, border: `2px solid ${C.bg}` }} />
          </button>
          <button style={{ width: 38, height: 38, borderRadius: 12, background: C.card, border: `1px solid ${C.border}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Ico type="chat" size={18} color={C.textSec} />
          </button>
        </div>
      </div>

      {/* SOS Alert Banner */}
      <div onClick={() => onNav("sos")} style={{
        margin: "10px 20px 14px", padding: "12px 16px", borderRadius: 16, cursor: "pointer",
        background: `linear-gradient(135deg, ${C.red}12, ${C.amber}10)`,
        border: `1px solid ${C.red}25`, display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: C.redSoft, display: "flex", alignItems: "center", justifyContent: "center", animation: "pulse 2s ease infinite" }}>
          <span style={{ fontSize: 20 }}>🚨</span>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ color: C.red, fontSize: 13, fontWeight: 700, margin: 0 }}>Pet perdido perto de você!</p>
          <p style={{ color: C.textDim, fontSize: 11, margin: "2px 0 0" }}>Bingo, Labrador preto · 800m · há 25min</p>
        </div>
        <Ico type="back" size={16} color={C.red} />
      </div>

      {/* Stories */}
      <div style={{ padding: "0 0 16px", overflow: "auto" }}>
        <div style={{ display: "flex", gap: 14, padding: "0 20px" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <div style={{
              width: 56, height: 56, borderRadius: 20, background: C.primarySoft,
              display: "flex", alignItems: "center", justifyContent: "center",
              border: `2px dashed ${C.primary}40`,
            }}>
              <Ico type="plus" size={22} color={C.primary} />
            </div>
            <span style={{ fontSize: 10, color: C.textDim, fontFamily: font }}>Novo</span>
          </div>
          {stories.map((s, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <div style={{
                width: 56, height: 56, borderRadius: 20,
                background: s.color + "12", display: "flex", alignItems: "center", justifyContent: "center",
                border: s.hasNew ? `2.5px solid ${s.color}` : `2px solid ${C.border}`,
                fontSize: 28,
              }}>{s.emoji}</div>
              <span style={{ fontSize: 10, color: s.hasNew ? C.text : C.textDim, fontWeight: s.hasNew ? 600 : 400, fontFamily: font }}>{s.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ padding: "0 20px 18px" }}>
        <div style={{ display: "flex", gap: 8, overflow: "auto" }}>
          {[
            { label: "Playdates", emoji: "🐾", action: "playdates" },
            { label: "SafeSwap", emoji: "🤝", action: "safeswap" },
            { label: "Doação Sangue", emoji: "🩸", action: "blood" },
            { label: "Genealogia", emoji: "🌳", action: "genealogy" },
          ].map((q, i) => (
            <button key={i} onClick={() => onNav(q.action)} style={{
              padding: "10px 16px", borderRadius: 14, cursor: "pointer", whiteSpace: "nowrap",
              background: C.card, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 6,
              fontFamily: font, fontSize: 12, fontWeight: 600, color: C.text, transition: "all 0.2s",
            }}>
              <span>{q.emoji}</span> {q.label}
            </button>
          ))}
        </div>
      </div>

      {/* Posts */}
      {posts.map((post, i) => (
        <div key={i} style={{
          margin: "0 20px 16px", background: C.card, borderRadius: 22,
          border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: C.shadow,
        }}>
          <div style={{ padding: "16px 18px 0" }}>
            {/* Post header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <Avatar emoji={post.emoji} size={42} bg={post.tagColor + "15"} ring ringColor={post.tagColor} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: C.text, fontSize: 14, fontWeight: 700, fontFamily: font }}>{post.pet}</span>
                  <Badge text={post.tag} color={post.tagColor} />
                </div>
                <p style={{ color: C.textDim, fontSize: 11, margin: "2px 0 0" }}>por {post.tutor} · {post.time}</p>
              </div>
              <button style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <Ico type="more" size={18} color={C.textDim} />
              </button>
            </div>

            {/* Post content */}
            <p style={{
              color: post.type === "diary" ? C.text : C.textSec,
              fontSize: 14, lineHeight: 1.7, margin: "0 0 14px",
              fontStyle: post.type === "diary" ? "italic" : "normal",
              fontFamily: font,
            }}>{post.text}</p>

            {/* Health card */}
            {post.health && (
              <div style={{
                background: C.greenSoft, borderRadius: 14, padding: "12px 16px", marginBottom: 14,
                display: "flex", alignItems: "center", gap: 14, border: `1px solid ${C.green}20`,
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14, background: C.green + "20",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ color: C.green, fontSize: 18, fontWeight: 800 }}>{post.health.score}</span>
                </div>
                <div>
                  <p style={{ color: C.green, fontSize: 13, fontWeight: 700, margin: 0 }}>Score de Saúde: {post.health.label}</p>
                  <p style={{ color: C.textDim, fontSize: 11, margin: "2px 0 0" }}>Análise IA · Todas vacinas em dia</p>
                </div>
              </div>
            )}

            {/* Credits card */}
            {post.credits && (
              <div style={{
                background: C.amberSoft, borderRadius: 14, padding: "12px 16px", marginBottom: 14,
                display: "flex", alignItems: "center", justifyContent: "space-between",
                border: `1px solid ${C.amber}20`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Ico type="star" size={20} color={C.amber} fill={C.amber} />
                  <span style={{ color: C.amber, fontSize: 13, fontWeight: 700 }}>{post.credits} Pet-Credits</span>
                </div>
                <Btn small color={C.amber} onClick={() => {}}>Aceitar</Btn>
              </div>
            )}

            {/* Memorial candle */}
            {post.type === "memorial" && (
              <div style={{
                background: C.pinkSoft, borderRadius: 14, padding: "14px 16px", marginBottom: 14,
                textAlign: "center", border: `1px solid ${C.pink}15`,
              }}>
                <span style={{ fontSize: 28 }}>🕯️</span>
                <p style={{ color: C.pink, fontSize: 12, fontWeight: 600, margin: "6px 0 0" }}>
                  Memorial eterno · 47 pessoas acenderam uma vela
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{
            display: "flex", borderTop: `1px solid ${C.borderLight}`, padding: "0",
          }}>
            {[
              { icon: "heart", label: post.likes, color: post.type === "memorial" ? C.pink : C.textDim },
              { icon: "chat", label: post.comments, color: C.textDim },
              { icon: "send", label: "", color: C.textDim },
              { icon: "bookmark", label: "", color: C.textDim },
            ].map((a, j) => (
              <button key={j} style={{
                flex: a.label !== "" ? 1.2 : 0.8, padding: "12px 0",
                background: "none", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                borderRight: j < 3 ? `1px solid ${C.borderLight}` : "none",
              }}>
                <Ico type={a.icon} size={17} color={a.color} />
                {a.label !== "" && <span style={{ color: C.textDim, fontSize: 12, fontWeight: 600, fontFamily: font }}>{a.label}</span>}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// ======================== MAP SCREEN ========================
const MapScreen = ({ onNav }) => {
  const pins = [
    { x: 25, y: 30, emoji: "🐕", name: "Rex", type: "walk", color: C.green },
    { x: 55, y: 20, emoji: "🐱", name: "Luna", type: "home", color: C.blue },
    { x: 70, y: 55, emoji: "🚨", name: "Bingo", type: "lost", color: C.red },
    { x: 40, y: 65, emoji: "🐩", name: "Mel", type: "play", color: C.amber },
    { x: 15, y: 50, emoji: "🐕‍🦺", name: "Thor", type: "vet", color: C.purple },
    { x: 80, y: 35, emoji: "🏪", name: "PetShop", type: "shop", color: C.primary },
    { x: 60, y: 75, emoji: "🏥", name: "Clínica", type: "vet", color: C.green },
  ];

  return (
    <div style={{ paddingBottom: 10 }}>
      <Header title="Aldeia Pet" subtitle="Salto, SP · 12 pets por perto" />

      {/* Map Area */}
      <div style={{
        margin: "0 20px 16px", height: 280, borderRadius: 24, overflow: "hidden",
        background: `linear-gradient(160deg, #E8E4DA 0%, #D4CEBC 40%, #C8D4BC 100%)`,
        position: "relative", border: `1px solid ${C.border}`,
      }}>
        {/* Roads */}
        <div style={{ position: "absolute", inset: 0, opacity: 0.2 }}>
          <div style={{ position: "absolute", top: "40%", left: 0, right: 0, height: 3, background: "#999", transform: "rotate(-5deg)" }} />
          <div style={{ position: "absolute", top: 0, bottom: 0, left: "35%", width: 3, background: "#999", transform: "rotate(3deg)" }} />
          <div style={{ position: "absolute", top: "70%", left: "20%", right: "10%", height: 2, background: "#999", transform: "rotate(8deg)" }} />
        </div>
        {/* Parks */}
        <div style={{ position: "absolute", top: "50%", left: "45%", width: 60, height: 40, borderRadius: 20, background: "#A8C89A40" }} />
        <div style={{ position: "absolute", top: "15%", left: "10%", width: 40, height: 30, borderRadius: 15, background: "#A8C89A30" }} />

        {pins.map((pin, i) => (
          <div key={i} style={{
            position: "absolute", left: `${pin.x}%`, top: `${pin.y}%`,
            transform: "translate(-50%, -50%)", cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center",
            animation: pin.type === "lost" ? "bounce 1s ease infinite" : "none",
          }}>
            {pin.type === "lost" && (
              <div style={{
                position: "absolute", width: 56, height: 56, borderRadius: "50%",
                border: `2px solid ${C.red}`, animation: "ping 1.5s ease infinite", opacity: 0.5,
              }} />
            )}
            <div style={{
              width: 40, height: 40, borderRadius: 14, fontSize: 20,
              background: C.card, border: `2px solid ${pin.color}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 2px 8px ${pin.color}30`,
            }}>{pin.emoji}</div>
            <span style={{
              fontSize: 9, fontWeight: 700, color: C.card, marginTop: 3,
              background: pin.color, padding: "1px 6px", borderRadius: 6,
              fontFamily: font,
            }}>{pin.name}</span>
          </div>
        ))}

        {/* Legend */}
        <div style={{
          position: "absolute", bottom: 10, left: 10, background: C.card + "E0",
          borderRadius: 12, padding: "8px 12px", display: "flex", gap: 10,
          backdropFilter: "blur(8px)",
        }}>
          {[
            { color: C.green, label: "Passeando" },
            { color: C.red, label: "Perdido" },
            { color: C.amber, label: "Playdate" },
          ].map((l, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: l.color }} />
              <span style={{ fontSize: 9, color: C.textSec, fontFamily: font }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Nearby Needs */}
      <div style={{ padding: "0 20px" }}>
        <p style={{ color: C.textDim, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 12px" }}>
          A aldeia precisa de você
        </p>
        {[
          { emoji: "🚨", title: "Bingo está perdido!", sub: "Labrador preto, 3 anos · 800m de você", color: C.red, action: "Ajudar na busca", urgent: true },
          { emoji: "🦴", title: "SOS Ração!", sub: "Família Silva · sem ração para 2 gatos · 400m", color: C.amber, action: "Tenho ração" },
          { emoji: "🐾", title: "Playdate no Parque", sub: "3 cães compatíveis com Rex · Hoje 16h", color: C.green, action: "Participar" },
          { emoji: "💊", title: "Vermífugo disponível", sub: "Carlos oferece Drontal · 600m · Grátis", color: C.blue, action: "Pedir" },
        ].map((item, i) => (
          <div key={i} style={{
            background: C.card, borderRadius: 18, padding: "14px 16px", marginBottom: 10,
            border: `1px solid ${item.urgent ? item.color + "30" : C.border}`,
            display: "flex", alignItems: "center", gap: 14,
            boxShadow: item.urgent ? `0 0 20px ${item.color}10` : "none",
          }}>
            <Avatar emoji={item.emoji} size={44} bg={item.color + "14"} />
            <div style={{ flex: 1 }}>
              <p style={{ color: C.text, fontSize: 14, fontWeight: 700, margin: 0, fontFamily: font }}>{item.title}</p>
              <p style={{ color: C.textDim, fontSize: 11, margin: "3px 0 0" }}>{item.sub}</p>
            </div>
            <Btn small color={item.color}>{item.action}</Btn>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes ping { 0% { transform: scale(1); opacity: 0.5; } 100% { transform: scale(2.5); opacity: 0; } }
        @keyframes bounce { 0%,100% { transform: translate(-50%,-50%); } 50% { transform: translate(-50%,-58%); } }
      `}</style>
    </div>
  );
};

// ======================== SOS SCREEN ========================
const SOSScreen = ({ onNav }) => (
  <div style={{ paddingBottom: 10 }}>
    <Header title="Central SOS" subtitle="Alertas e emergências" back onBack={() => onNav("feed")} />
    <div style={{ padding: "0 20px" }}>
      {/* Panic Button */}
      <div style={{
        background: `linear-gradient(135deg, ${C.red}10, ${C.amber}08)`,
        borderRadius: 24, padding: 28, marginBottom: 20, textAlign: "center",
        border: `1px solid ${C.red}20`,
      }}>
        <button style={{
          width: 100, height: 100, borderRadius: "50%", cursor: "pointer",
          background: `linear-gradient(135deg, ${C.red}, ${C.primaryDark})`,
          border: `4px solid ${C.red}30`, display: "flex", alignItems: "center",
          justifyContent: "center", margin: "0 auto 16px",
          boxShadow: `0 0 40px ${C.red}30`,
        }}>
          <span style={{ fontSize: 40 }}>🆘</span>
        </button>
        <p style={{ color: C.text, fontSize: 18, fontWeight: 800, margin: "0 0 6px", fontFamily: fontDisplay }}>Botão de Pânico</p>
        <p style={{ color: C.textSec, fontSize: 13, margin: 0, lineHeight: 1.5 }}>
          Envia alerta para todos num raio de 2km e abre chat de busca coordenada
        </p>
      </div>

      {/* SOS Options */}
      <p style={{ color: C.textDim, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 12px" }}>
        Tipo de emergência
      </p>
      {[
        { emoji: "🔍", title: "Pet Perdido", desc: "Alerta de fuga com foto e localização", color: C.red },
        { emoji: "🦴", title: "SOS Ração", desc: "Acabou a comida? Peça ajuda aos vizinhos", color: C.amber },
        { emoji: "💊", title: "SOS Medicamento", desc: "Medicamento urgente que acabou", color: C.purple },
        { emoji: "🏥", title: "Emergência Veterinária", desc: "Encontre clínicas abertas agora", color: C.green },
        { emoji: "🩸", title: "Doação de Sangue", desc: "Urgente: pet precisa de transfusão", color: C.red },
        { emoji: "🏠", title: "Abrigo Temporário", desc: "Preciso de alguém para cuidar do meu pet", color: C.blue },
      ].map((item, i) => (
        <div key={i} style={{
          background: C.card, borderRadius: 18, padding: "16px 18px", marginBottom: 10,
          border: `1px solid ${C.border}`, cursor: "pointer", display: "flex", alignItems: "center", gap: 14,
          transition: "all 0.2s",
        }}>
          <Avatar emoji={item.emoji} size={48} bg={item.color + "12"} />
          <div style={{ flex: 1 }}>
            <p style={{ color: C.text, fontSize: 14, fontWeight: 700, margin: 0, fontFamily: font }}>{item.title}</p>
            <p style={{ color: C.textDim, fontSize: 12, margin: "3px 0 0" }}>{item.desc}</p>
          </div>
          <Ico type="back" size={16} color={C.textDim} />
        </div>
      ))}
    </div>
  </div>
);

// ======================== CREDITS SCREEN ========================
const CreditsScreen = ({ onNav }) => (
  <div style={{ paddingBottom: 10 }}>
    <Header title="Pet-Credits" subtitle="Sua moeda de cuidado" />
    <div style={{ padding: "0 20px" }}>
      {/* Balance Card */}
      <div style={{
        background: `linear-gradient(135deg, ${C.amber}, ${C.primary})`,
        borderRadius: 24, padding: 28, marginBottom: 20, color: "#fff",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "#ffffff15" }} />
        <div style={{ position: "absolute", bottom: -20, left: -20, width: 80, height: 80, borderRadius: "50%", background: "#ffffff10" }} />
        <p style={{ fontSize: 12, fontWeight: 600, margin: "0 0 6px", opacity: 0.85 }}>Seu saldo</p>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 42, fontWeight: 800, fontFamily: fontDisplay }}>27</span>
          <span style={{ fontSize: 16, fontWeight: 600, opacity: 0.8 }}>Pet-Credits</span>
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
          <div style={{ background: "#ffffff20", borderRadius: 12, padding: "10px 14px", flex: 1 }}>
            <p style={{ fontSize: 10, margin: 0, opacity: 0.7 }}>Ganhos este mês</p>
            <p style={{ fontSize: 18, fontWeight: 800, margin: "2px 0 0" }}>+12</p>
          </div>
          <div style={{ background: "#ffffff20", borderRadius: 12, padding: "10px 14px", flex: 1 }}>
            <p style={{ fontSize: 10, margin: 0, opacity: 0.7 }}>Usados este mês</p>
            <p style={{ fontSize: 18, fontWeight: 800, margin: "2px 0 0" }}>-5</p>
          </div>
        </div>
      </div>

      {/* How to earn */}
      <p style={{ color: C.textDim, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 12px" }}>
        Como ganhar créditos
      </p>
      {[
        { emoji: "🚶", title: "Passear o pet de alguém", credits: "+3", done: true },
        { emoji: "🦴", title: "Doar ração", credits: "+2", done: false },
        { emoji: "🏥", title: "Consulta de rotina em dia", credits: "+2", done: true },
        { emoji: "🧴", title: "Dia de escovagem", credits: "+1", done: false },
        { emoji: "🩸", title: "Doação de sangue", credits: "+5", done: false },
        { emoji: "🏠", title: "Cuidar de pet de vizinho", credits: "+4", done: false },
      ].map((item, i) => (
        <div key={i} style={{
          background: C.card, borderRadius: 16, padding: "14px 16px", marginBottom: 8,
          border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 14,
          opacity: item.done ? 0.6 : 1,
        }}>
          <span style={{ fontSize: 24 }}>{item.emoji}</span>
          <div style={{ flex: 1 }}>
            <p style={{ color: C.text, fontSize: 14, fontWeight: 600, margin: 0, fontFamily: font }}>{item.title}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Badge text={item.credits} color={C.amber} />
            {item.done && <Ico type="check" size={16} color={C.green} />}
          </div>
        </div>
      ))}

      {/* Redeem */}
      <p style={{ color: C.textDim, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: "20px 0 12px" }}>
        Trocar créditos
      </p>
      {[
        { title: "10% desconto PetShop", cost: 10, partner: "PetLove" },
        { title: "Consulta veterinária", cost: 20, partner: "VetBem" },
        { title: "Seguro saúde -15%", cost: 30, partner: "PetSafe" },
      ].map((item, i) => (
        <div key={i} style={{
          background: C.card, borderRadius: 16, padding: "14px 16px", marginBottom: 8,
          border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 14,
        }}>
          <Ico type="gift" size={22} color={C.primary} />
          <div style={{ flex: 1 }}>
            <p style={{ color: C.text, fontSize: 14, fontWeight: 600, margin: 0, fontFamily: font }}>{item.title}</p>
            <p style={{ color: C.textDim, fontSize: 11, margin: "2px 0 0" }}>{item.partner}</p>
          </div>
          <Btn small color={C.primary} outline>{item.cost} ⭐</Btn>
        </div>
      ))}
    </div>
  </div>
);

// ======================== PET PROFILE SCREEN ========================
const ProfileScreen = ({ onNav }) => (
  <div style={{ paddingBottom: 10 }}>
    {/* Profile Header */}
    <div style={{
      background: `linear-gradient(180deg, ${C.primary}12, ${C.bg})`,
      padding: "20px 20px 0", textAlign: "center",
    }}>
      <div style={{
        width: 90, height: 90, borderRadius: 30, margin: "0 auto 14px",
        background: C.primarySoft, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 48, border: `3px solid ${C.primary}`,
        boxShadow: `0 4px 20px ${C.primary}20`,
      }}>🐕</div>
      <h2 style={{ color: C.text, fontSize: 24, fontWeight: 800, margin: "0 0 2px", fontFamily: fontDisplay }}>Rex</h2>
      <p style={{ color: C.textSec, fontSize: 13, margin: "0 0 8px" }}>Labrador Retriever · 3 anos · 32kg</p>
      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 18 }}>
        <Badge text="😄 Feliz hoje" color={C.green} />
        <Badge text="Score 92" color={C.primary} />
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {[
          { n: "127", label: "Memórias" },
          { n: "34", label: "Amigos Pet" },
          { n: "27", label: "Credits" },
          { n: "8", label: "Padrinhos" },
        ].map((s, i) => (
          <div key={i} style={{
            flex: 1, background: C.card, borderRadius: 16, padding: "12px 8px",
            border: `1px solid ${C.border}`,
          }}>
            <p style={{ color: C.text, fontSize: 18, fontWeight: 800, margin: 0, fontFamily: fontDisplay }}>{s.n}</p>
            <p style={{ color: C.textDim, fontSize: 10, margin: "2px 0 0" }}>{s.label}</p>
          </div>
        ))}
      </div>
    </div>

    {/* Menu */}
    <div style={{ padding: "0 20px" }}>
      <p style={{ color: C.textDim, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 12px" }}>
        Perfil completo
      </p>
      {[
        { emoji: "📋", title: "Prontuário de Saúde", sub: "Vacinas, exames, consultas", color: C.green },
        { emoji: "📖", title: "Diário de Vida", sub: "Timeline completa com IA", color: C.purple },
        { emoji: "🌳", title: "Árvore Genealógica", sub: "Ancestrais e irmãos de ninhada", color: C.amber, action: "genealogy" },
        { emoji: "👨‍👩‍👧", title: "Co-Parentalidade", sub: "8 padrinhos e tios do Rex", color: C.blue },
        { emoji: "📊", title: "Gráfico de Felicidade", sub: "Evolução emocional ao longo do tempo", color: C.pink },
        { emoji: "💌", title: "Cápsula do Tempo", sub: "3 mensagens para o futuro", color: C.primary },
        { emoji: "🛡️", title: "Testamento Emocional", sub: "Tutor reserva: Maria Santos", color: C.red },
        { emoji: "🏅", title: "Conquistas", sub: "12 de 30 emblemas", color: C.amber },
        { emoji: "🔗", title: "QR Code / Carteirinha", sub: "Compartilhar com veterinário", color: C.text },
      ].map((item, i) => (
        <div key={i} onClick={() => item.action && onNav(item.action)} style={{
          background: C.card, borderRadius: 18, padding: "15px 18px", marginBottom: 8,
          border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 14,
          cursor: "pointer", transition: "all 0.2s",
        }}>
          <Avatar emoji={item.emoji} size={44} bg={item.color + "12"} />
          <div style={{ flex: 1 }}>
            <p style={{ color: C.text, fontSize: 14, fontWeight: 700, margin: 0, fontFamily: font }}>{item.title}</p>
            <p style={{ color: C.textDim, fontSize: 12, margin: "3px 0 0" }}>{item.sub}</p>
          </div>
          <Ico type="back" size={16} color={C.textDim} />
        </div>
      ))}
    </div>
  </div>
);

// ======================== GENEALOGY SCREEN ========================
const GenealogyScreen = ({ onNav }) => (
  <div style={{ paddingBottom: 30 }}>
    <Header title="Árvore Genealógica" subtitle="A família do Rex" back onBack={() => onNav("profile")} />
    <div style={{ padding: "0 20px" }}>
      {/* Tree Visualization */}
      <div style={{
        background: C.card, borderRadius: 24, padding: 24, marginBottom: 20,
        border: `1px solid ${C.border}`, textAlign: "center", position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at center, ${C.green}06, transparent 70%)` }} />

        {/* Grandparents */}
        <p style={{ color: C.textDim, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 10px" }}>Avós</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 40, marginBottom: 8 }}>
          {[{ name: "Duke", emoji: "🐕" }, { name: "Bella", emoji: "🐕" }].map((g, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <Avatar emoji={g.emoji} size={36} bg={C.amberSoft} />
              <span style={{ fontSize: 10, color: C.textSec, fontFamily: font }}>{g.name}</span>
            </div>
          ))}
        </div>
        {/* Connector lines */}
        <div style={{ width: 2, height: 20, background: C.border, margin: "0 auto" }} />

        {/* Parents */}
        <p style={{ color: C.textDim, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: "8px 0 10px" }}>Pais</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 50, marginBottom: 8 }}>
          {[{ name: "Max (Pai)", emoji: "🐕", known: true }, { name: "Daisy (Mãe)", emoji: "🐕", known: true }].map((p2, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <Avatar emoji={p2.emoji} size={44} bg={C.greenSoft} ring ringColor={C.green} />
              <span style={{ fontSize: 11, fontWeight: 600, color: C.text, fontFamily: font }}>{p2.name}</span>
              {p2.known && <Badge text="Encontrado!" color={C.green} />}
            </div>
          ))}
        </div>
        <div style={{ width: 2, height: 20, background: C.border, margin: "0 auto" }} />

        {/* Rex + Siblings */}
        <p style={{ color: C.textDim, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: "8px 0 10px" }}>Ninhada</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
          {[
            { name: "Rex (Você!)", emoji: "🐕", highlight: true },
            { name: "Bob", emoji: "🐕", found: true },
            { name: "Lola", emoji: "🐕", found: true },
            { name: "Irmão 4", emoji: "❓", found: false },
          ].map((s, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: 65 }}>
              <Avatar emoji={s.emoji} size={s.highlight ? 52 : 40}
                bg={s.highlight ? C.primarySoft : s.found ? C.blueSoft : C.bgWarm}
                ring={s.highlight} ringColor={C.primary} />
              <span style={{ fontSize: 10, fontWeight: s.highlight ? 700 : 500, color: s.highlight ? C.primary : C.textSec, fontFamily: font, textAlign: "center" }}>{s.name}</span>
              {s.found && <Badge text="Encontrado" color={C.blue} />}
              {!s.found && !s.highlight && <Badge text="Procurando..." color={C.textDim} />}
            </div>
          ))}
        </div>
      </div>

      {/* Genetic Health */}
      <div style={{
        background: C.greenSoft, borderRadius: 20, padding: 18, marginBottom: 16,
        border: `1px solid ${C.green}20`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Ico type="shield" size={18} color={C.green} />
          <span style={{ color: C.green, fontSize: 13, fontWeight: 700, fontFamily: font }}>Mural Genético de Saúde</span>
        </div>
        <p style={{ color: C.textSec, fontSize: 13, lineHeight: 1.6, margin: "0 0 12px" }}>
          Dados compartilhados da família revelam predisposição para:
        </p>
        {[
          { condition: "Displasia coxofemoral", risk: "Moderado", color: C.amber },
          { condition: "Obesidade", risk: "Alto", color: C.red },
          { condition: "Problemas oculares", risk: "Baixo", color: C.green },
        ].map((c, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ color: C.text, fontSize: 13, fontFamily: font }}>{c.condition}</span>
            <Badge text={`Risco ${c.risk}`} color={c.color} />
          </div>
        ))}
      </div>

      {/* Found siblings */}
      <p style={{ color: C.textDim, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 12px" }}>
        Irmãos encontrados
      </p>
      {[
        { name: "Bob", tutor: "Fernanda C.", city: "Salto, SP", emoji: "🐕", dist: "2.3km" },
        { name: "Lola", tutor: "Ricardo M.", city: "Itu, SP", emoji: "🐕", dist: "15km" },
      ].map((s, i) => (
        <div key={i} style={{
          background: C.card, borderRadius: 18, padding: "14px 18px", marginBottom: 10,
          border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 14,
        }}>
          <Avatar emoji={s.emoji} size={48} bg={C.blueSoft} ring ringColor={C.blue} />
          <div style={{ flex: 1 }}>
            <p style={{ color: C.text, fontSize: 14, fontWeight: 700, margin: 0, fontFamily: font }}>{s.name}</p>
            <p style={{ color: C.textDim, fontSize: 12, margin: "2px 0 0" }}>Tutor: {s.tutor} · {s.city}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ color: C.blue, fontSize: 12, fontWeight: 600, margin: "0 0 4px" }}>{s.dist}</p>
            <Btn small color={C.blue} outline>Conectar</Btn>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ======================== PLAYDATES SCREEN ========================
const PlaydatesScreen = ({ onNav }) => (
  <div style={{ paddingBottom: 30 }}>
    <Header title="Playdates" subtitle="Encontros seguros por temperamento" back onBack={() => onNav("feed")} />
    <div style={{ padding: "0 20px" }}>
      <p style={{ color: C.textSec, fontSize: 13, lineHeight: 1.6, margin: "0 0 18px" }}>
        A IA combina pets por energia, tamanho e personalidade para encontros seguros e divertidos.
      </p>

      <p style={{ color: C.textDim, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 12px" }}>
        Compatíveis com Rex
      </p>
      {[
        { name: "Nina", breed: "Golden Retriever", emoji: "🐕", match: 95, traits: ["Brincalhona", "Energia alta", "Sociável"], dist: "500m", tutor: "Paula" },
        { name: "Toby", breed: "Border Collie", emoji: "🐕‍🦺", match: 88, traits: ["Ativo", "Obediente", "Amigável"], dist: "1.2km", tutor: "André" },
        { name: "Pipoca", breed: "Beagle", emoji: "🐕", match: 82, traits: ["Curiosa", "Energia média", "Dócil"], dist: "800m", tutor: "Camila" },
      ].map((p2, i) => (
        <div key={i} style={{
          background: C.card, borderRadius: 22, padding: 18, marginBottom: 12,
          border: `1px solid ${C.border}`, boxShadow: C.shadow,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
            <Avatar emoji={p2.emoji} size={52} bg={C.greenSoft} ring ringColor={C.green} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: C.text, fontSize: 16, fontWeight: 700, fontFamily: font }}>{p2.name}</span>
                <Badge text={`${p2.match}% match`} color={C.green} />
              </div>
              <p style={{ color: C.textDim, fontSize: 12, margin: "2px 0 0" }}>{p2.breed} · {p2.dist} · Tutor: {p2.tutor}</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
            {p2.traits.map(t => (
              <span key={t} style={{
                background: C.bgWarm, color: C.textSec, fontSize: 11, fontWeight: 600,
                padding: "4px 10px", borderRadius: 10, fontFamily: font,
              }}>{t}</span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn small color={C.green} style={{ flex: 1 }}>Convidar para Playdate</Btn>
            <Btn small color={C.textDim} outline>Ver perfil</Btn>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ======================== SAFESWAP SCREEN ========================
const SafeSwapScreen = ({ onNav }) => (
  <div style={{ paddingBottom: 30 }}>
    <Header title="SafeSwap" subtitle="Troca de cuidados entre vizinhos" back onBack={() => onNav("feed")}
      right={<Badge text="Índice de Aldeia: 4.8 ⭐" color={C.amber} />}
    />
    <div style={{ padding: "0 20px" }}>
      <div style={{
        background: `linear-gradient(135deg, ${C.blue}10, ${C.green}08)`,
        borderRadius: 22, padding: 20, marginBottom: 20,
        border: `1px solid ${C.blue}20`,
      }}>
        <Ico type="swap" size={28} color={C.blue} />
        <p style={{ color: C.text, fontSize: 15, fontWeight: 700, margin: "12px 0 6px", fontFamily: fontDisplay }}>
          Eu cuido do seu, você cuida do meu
        </p>
        <p style={{ color: C.textSec, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
          Em vez de pagar hotéis caros, troque cuidados com vizinhos avaliados e de confiança.
        </p>
      </div>

      <p style={{ color: C.textDim, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 12px" }}>
        Vizinhos disponíveis
      </p>
      {[
        { name: "Maria Santos", emoji: "👩", rating: 4.9, reviews: 23, pets: "2 gatos", dist: "300m", dates: "28-31 Mar" },
        { name: "Carlos Lima", emoji: "👨", rating: 4.7, reviews: 15, pets: "1 cão", dist: "600m", dates: "01-05 Abr" },
        { name: "Fernanda Rocha", emoji: "👩", rating: 5.0, reviews: 31, pets: "1 gato, 1 cão", dist: "1km", dates: "Flexível" },
      ].map((v, i) => (
        <div key={i} style={{
          background: C.card, borderRadius: 20, padding: 18, marginBottom: 12,
          border: `1px solid ${C.border}`, boxShadow: C.shadow,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
            <Avatar emoji={v.emoji} size={48} bg={C.blueSoft} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: C.text, fontSize: 14, fontWeight: 700 }}>{v.name}</span>
                <span style={{ color: C.amber, fontSize: 12, fontWeight: 700 }}>⭐ {v.rating}</span>
                <span style={{ color: C.textDim, fontSize: 11 }}>({v.reviews})</span>
              </div>
              <p style={{ color: C.textDim, fontSize: 12, margin: "3px 0 0" }}>{v.pets} · {v.dist}</p>
            </div>
            <Badge text={v.dates} color={C.blue} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn small color={C.blue} style={{ flex: 1 }}>Propor Troca</Btn>
            <Btn small color={C.textDim} outline>Mensagem</Btn>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ======================== BLOOD DONATION SCREEN ========================
const BloodScreen = ({ onNav }) => (
  <div style={{ paddingBottom: 30 }}>
    <Header title="Doação de Sangue" subtitle="Rede de doadores pet" back onBack={() => onNav("feed")} />
    <div style={{ padding: "0 20px" }}>
      <div style={{
        background: `linear-gradient(135deg, ${C.red}10, ${C.pink}08)`,
        borderRadius: 22, padding: 24, marginBottom: 20, textAlign: "center",
        border: `1px solid ${C.red}20`,
      }}>
        <span style={{ fontSize: 48 }}>🩸</span>
        <p style={{ color: C.text, fontSize: 18, fontWeight: 800, margin: "12px 0 6px", fontFamily: fontDisplay }}>
          Rex é doador compatível!
        </p>
        <p style={{ color: C.textSec, fontSize: 13, margin: "0 0 16px", lineHeight: 1.5 }}>
          Tipo sanguíneo: DEA 1.1 Negativo<br />
          Peso e saúde adequados para doação
        </p>
        <Btn color={C.red} full>Cadastrar como Doador</Btn>
      </div>

      <p style={{ color: C.textDim, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 12px" }}>
        Pedidos urgentes na região
      </p>
      {[
        { pet: "Thor", breed: "Pastor Alemão", type: "DEA 1.1 Neg", emoji: "🐕‍🦺", dist: "3km", urgency: "Urgente" },
        { pet: "Mia", breed: "Persa", type: "Tipo A", emoji: "🐱", dist: "5km", urgency: "Moderado" },
      ].map((r, i) => (
        <div key={i} style={{
          background: C.card, borderRadius: 18, padding: "16px 18px", marginBottom: 10,
          border: `1px solid ${i === 0 ? C.red + "30" : C.border}`, display: "flex", alignItems: "center", gap: 14,
        }}>
          <Avatar emoji={r.emoji} size={48} bg={C.redSoft} />
          <div style={{ flex: 1 }}>
            <p style={{ color: C.text, fontSize: 14, fontWeight: 700, margin: 0 }}>{r.pet} precisa de sangue</p>
            <p style={{ color: C.textDim, fontSize: 12, margin: "2px 0 0" }}>{r.breed} · {r.type} · {r.dist}</p>
          </div>
          <Badge text={r.urgency} color={i === 0 ? C.red : C.amber} />
        </div>
      ))}
    </div>
  </div>
);

// ======================== NOTIFICATIONS SCREEN ========================
const NotificationsScreen = ({ onNav }) => (
  <div style={{ paddingBottom: 30 }}>
    <Header title="Notificações" back onBack={() => onNav("feed")} />
    <div style={{ padding: "0 20px" }}>
      {[
        { emoji: "🚨", title: "Pet perdido perto de você!", sub: "Bingo, Labrador preto · 800m · Agora", color: C.red, time: "2min" },
        { emoji: "🐾", title: "Nina quer um playdate com Rex!", sub: "95% compatível · Paula convidou", color: C.green, time: "1h" },
        { emoji: "⭐", title: "+3 Pet-Credits recebidos", sub: "Por passear o Thor ontem", color: C.amber, time: "3h" },
        { emoji: "💉", title: "Vacina Antirrábica vencida!", sub: "Agende a consulta do Rex", color: C.red, time: "5h" },
        { emoji: "🐕", title: "Irmão encontrado!", sub: "Bob pode ser irmão de ninhada do Rex", color: C.blue, time: "1d" },
        { emoji: "💌", title: "Cápsula do tempo desbloqueada!", sub: "Mensagem que você gravou há 1 ano", color: C.purple, time: "2d" },
        { emoji: "🕯️", title: "47 pessoas acenderam uma vela para Mel", sub: "Memorial da Mel teve 12 novas visitas", color: C.pink, time: "3d" },
      ].map((n, i) => (
        <div key={i} style={{
          background: i < 2 ? n.color + "06" : C.card,
          borderRadius: 18, padding: "14px 16px", marginBottom: 8,
          border: `1px solid ${i < 2 ? n.color + "20" : C.border}`,
          display: "flex", alignItems: "center", gap: 14, cursor: "pointer",
        }}>
          <Avatar emoji={n.emoji} size={44} bg={n.color + "14"} />
          <div style={{ flex: 1 }}>
            <p style={{ color: C.text, fontSize: 13, fontWeight: 700, margin: 0, fontFamily: font }}>{n.title}</p>
            <p style={{ color: C.textDim, fontSize: 11, margin: "3px 0 0" }}>{n.sub}</p>
          </div>
          <span style={{ color: C.textDim, fontSize: 10, flexShrink: 0 }}>{n.time}</span>
        </div>
      ))}
    </div>
  </div>
);

// ======================== MAIN APP ========================
export default function RedeSolidariaPets() {
  const [screen, setScreen] = useState("feed");
  const [tab, setTab] = useState("feed");
  const containerRef = useRef();

  const nav = (s) => {
    setScreen(s);
    if (["feed", "map", "sos", "credits", "profile"].includes(s)) setTab(s);
    if (containerRef.current) containerRef.current.scrollTop = 0;
  };

  const screens = {
    feed: FeedScreen,
    map: MapScreen,
    sos: SOSScreen,
    credits: CreditsScreen,
    profile: ProfileScreen,
    genealogy: GenealogyScreen,
    playdates: PlaydatesScreen,
    safeswap: SafeSwapScreen,
    blood: BloodScreen,
    notifications: NotificationsScreen,
  };

  const Screen = screens[screen] || FeedScreen;
  const showTabs = ["feed", "map", "sos", "credits", "profile"].includes(screen);

  return (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center",
      minHeight: "100vh", padding: 20, fontFamily: font,
      background: `linear-gradient(160deg, #F5EFE7 0%, #EDE6DB 50%, #E8E0D4 100%)`,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <div ref={containerRef} style={{
        width: 400, maxHeight: 800, background: C.bg, borderRadius: 40,
        overflow: "auto", position: "relative",
        boxShadow: `0 20px 60px rgba(44,36,22,0.12), 0 0 0 1px ${C.border}`,
      }}>
        {/* Notch */}
        <div style={{
          position: "sticky", top: 0, zIndex: 30,
          display: "flex", justifyContent: "center", padding: "8px 0 0",
          background: `linear-gradient(to bottom, ${C.bg}, transparent)`,
        }}>
          <div style={{ width: 120, height: 28, borderRadius: 20, background: "#1a1a1a" }} />
        </div>

        <Screen onNav={nav} />

        {showTabs && <TabBar active={tab} onTab={nav} />}
      </div>

      <style>{`
        @keyframes pulse { 0%,100% { transform: scale(1); opacity:1; } 50% { transform: scale(1.03); opacity:0.85; } }
        * { -webkit-tap-highlight-color: transparent; }
        ::-webkit-scrollbar { width: 0; height: 0; }
      `}</style>
    </div>
  );
}
