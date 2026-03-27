import { useState, useRef, useEffect } from "react";

// ======================== DESIGN TOKENS ========================
const C = {
  bg: "#16131E", bgCard: "#1E1A2A", bgDeep: "#0E0B15",
  card: "#231F32", cardGlow: "#2A2540", cardLight: "#2E2945",
  gold: "#E4B84A", goldSoft: "#E4B84A10", goldMed: "#E4B84A20", goldWarm: "#E4B84A35", goldBright: "#F5D06B",
  violet: "#9B72CF", violetSoft: "#9B72CF10", violetMed: "#9B72CF20", violetDeep: "#7B55B0",
  rose: "#E87B9A", roseSoft: "#E87B9A10",
  teal: "#5AC4B6", tealSoft: "#5AC4B610",
  sky: "#6BA4E8", skySoft: "#6BA4E810",
  ember: "#E8954A", emberSoft: "#E8954A10",
  text: "#EDE8F5", textSec: "#A89DBF", textDim: "#5E5475", textGhost: "#3A3250",
  border: "#2E2845", borderLight: "#352F4A",
  shadow: "0 4px 30px rgba(0,0,0,0.4)",
};
const font = "'Cormorant Garamond', 'Georgia', serif";
const fontSans = "'Quicksand', -apple-system, sans-serif";
const fontHand = "'Caveat', cursive";

// ======================== ICONS ========================
const Ico = ({ type, size = 20, color = C.textDim }) => {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" };
  const icons = {
    back: <svg {...p}><polyline points="15,18 9,12 15,6"/></svg>,
    lock: <svg {...p}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
    unlock: <svg {...p}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 019.9-1"/></svg>,
    plus: <svg {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    x: <svg {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    gift: <svg {...p}><polyline points="20,12 20,22 4,22 4,12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 110-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 100-5C13 2 12 7 12 7z"/></svg>,
    mail: <svg {...p}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
    video: <svg {...p}><rect x="2" y="4" width="15" height="16" rx="2"/><path d="M17 9l5-3v12l-5-3"/></svg>,
    mic: <svg {...p}><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/></svg>,
    camera: <svg {...p}><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>,
    calendar: <svg {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    clock: <svg {...p}><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>,
    heart: <svg {...p} fill={color} stroke="none"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
    star: <svg {...p} fill={color} stroke="none"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>,
    sparkle: <svg {...p} strokeWidth="1.5"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/></svg>,
    paw: <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><ellipse cx="12" cy="17" rx="4.5" ry="4"/><circle cx="7" cy="10.5" r="2.2"/><circle cx="17" cy="10.5" r="2.2"/><circle cx="9.5" cy="6.5" r="1.8"/><circle cx="14.5" cy="6.5" r="1.8"/></svg>,
    edit: <svg {...p}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    send: <svg {...p}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/></svg>,
    play: <svg {...p} fill={color} stroke="none"><polygon points="6,3 20,12 6,21"/></svg>,
    eye: <svg {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    shield: <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    check: <svg {...p} strokeWidth="2.5"><polyline points="20,6 9,17 4,12"/></svg>,
  };
  return icons[type] || null;
};

// ======================== SPARKLE PARTICLES ========================
const Particles = ({ color = C.gold, count = 12 }) => (
  <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} style={{
        position: "absolute",
        left: `${10 + Math.random() * 80}%`,
        top: `${10 + Math.random() * 80}%`,
        width: 3 + Math.random() * 4,
        height: 3 + Math.random() * 4,
        borderRadius: "50%",
        background: color,
        opacity: 0.15 + Math.random() * 0.35,
        animation: `float${i % 3} ${3 + Math.random() * 4}s ease-in-out infinite`,
        animationDelay: `${Math.random() * 3}s`,
      }} />
    ))}
  </div>
);

// ======================== CAPSULE DATA ========================
const capsules = [
  {
    id: "c1", status: "unlocked", type: "text",
    title: "Para o Rex aos 3 anos",
    createdDate: "28 Fev 2025", unlockDate: "28 Fev 2026",
    unlockCondition: "Aniversário de 3 anos",
    author: "Ana (Tutora)",
    message: "Rex, hoje você faz 2 anos e já é o melhor amigo que eu poderia pedir. Quando você fizer 3, quero que este espaço guarde o que eu sinto agora: um amor tão grande que não cabe em palavras. Você me ensinou a ter paciência, a rir todos os dias e a valorizar os momentos simples — como deitar no sofá juntos no fim da tarde. Obrigada por existir na minha vida. Com todo o amor do mundo, Ana.",
    aiReflection: "Quando esta cápsula foi criada, Rex tinha 2 anos e pesava 29kg. Nesse dia ele brincou no parque por 45 minutos e dormiu no colo da Ana. Hoje, aos 3 anos, Rex pesa 32kg, tem 34 amigos pet e já viveu 127 aventuras registradas neste diário. A promessa da Ana foi cumprida: Rex é profundamente amado.",
    emotion: "love",
  },
  {
    id: "c2", status: "unlocked", type: "audio",
    title: "A voz da Ana para o Rex",
    createdDate: "25 Dez 2025", unlockDate: "01 Jan 2026",
    unlockCondition: "Ano Novo 2026",
    author: "Ana (Tutora)",
    duration: "1:23",
    transcript: "\"Rex, meu amor, hoje é Natal e você está dormindo embaixo da árvore com a bolinha vermelha na boca. Você não sabe, mas esta é a nossa primeira grande festa juntos. Que venham muitas mais...\"",
    aiReflection: "Gravado na véspera de Natal enquanto Rex dormia. A análise de áudio detectou emoção na voz da Ana — tom suave, pausas longas. Rex acordou 3 minutos depois e foi lamber a mão dela.",
    emotion: "tenderness",
  },
  {
    id: "c3", status: "locked", type: "text",
    title: "Quando todas as vacinas estiverem em dia",
    createdDate: "15 Mar 2026", unlockDate: null,
    unlockCondition: "Todas as 5 vacinas atualizadas",
    unlockProgress: 60,
    author: "Ana (Tutora)",
    preview: "Uma surpresa especial aguarda Rex quando ele completar...",
    emotion: "surprise",
  },
  {
    id: "c4", status: "locked", type: "video",
    title: "Para o Rex aos 5 anos",
    createdDate: "12 Mar 2026", unlockDate: "12 Mar 2028",
    unlockCondition: "Aniversário de 5 anos",
    daysUntil: 716,
    author: "Ana (Tutora)",
    duration: "2:47",
    preview: "Um vídeo da família inteira com uma mensagem especial...",
    emotion: "love",
  },
  {
    id: "c5", status: "locked", type: "text",
    title: "Para a Maria (Tutora de Reserva)",
    createdDate: "20 Jan 2026", unlockDate: null,
    unlockCondition: "Ativação do Testamento Emocional",
    author: "Ana (Tutora)",
    preview: "Instruções e palavras de carinho para quem cuidar do Rex...",
    emotion: "care",
    isPrivate: true,
  },
  {
    id: "c6", status: "locked", type: "photo",
    title: "Galeria Secreta: Primeiro Ano",
    createdDate: "28 Fev 2024", unlockDate: "28 Fev 2027",
    unlockCondition: "Aniversário de 4 anos",
    daysUntil: 350,
    author: "Ana (Tutora)",
    photos: 24,
    preview: "24 fotos do primeiro ano de vida do Rex, uma para cada...",
    emotion: "nostalgia",
  },
];

// ======================== EMOTION CONFIGS ========================
const emotionConfig = {
  love: { emoji: "💕", color: C.rose, glow: C.rose + "30" },
  tenderness: { emoji: "🤲", color: C.violet, glow: C.violet + "30" },
  surprise: { emoji: "🎁", color: C.gold, glow: C.gold + "30" },
  care: { emoji: "🛡️", color: C.teal, glow: C.teal + "30" },
  nostalgia: { emoji: "📷", color: C.ember, glow: C.ember + "30" },
  joy: { emoji: "✨", color: C.goldBright, glow: C.goldBright + "30" },
};

// ======================== CAPSULE DETAIL MODAL ========================
const CapsuleDetail = ({ capsule: c, onClose }) => {
  const [revealed, setRevealed] = useState(c.status === "unlocked");
  const [showAI, setShowAI] = useState(false);
  const em = emotionConfig[c.emotion] || emotionConfig.love;

  if (c.status === "locked") {
    return (
      <div style={{ position: "absolute", inset: 0, zIndex: 50, background: "rgba(14,11,21,0.7)", backdropFilter: "blur(12px)", display: "flex", alignItems: "flex-end" }}>
        <div style={{ background: C.bg, borderRadius: "32px 32px 0 0", width: "100%", maxHeight: "85%", overflow: "auto", padding: "8px 22px 36px" }}>
          <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 20px" }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: C.textGhost }} />
          </div>

          <div style={{ textAlign: "center", padding: "20px 0 30px", position: "relative" }}>
            <Particles color={em.color} count={8} />
            <div style={{
              width: 100, height: 100, borderRadius: 32, margin: "0 auto 20px",
              background: `radial-gradient(circle, ${em.glow}, ${C.card})`,
              border: `2px solid ${em.color}30`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 0 40px ${em.color}15`,
            }}>
              <Ico type="lock" size={40} color={em.color} />
            </div>
            <h2 style={{ color: C.text, fontSize: 22, fontWeight: 700, margin: "0 0 8px", fontFamily: font }}>{c.title}</h2>
            <p style={{ color: C.textDim, fontSize: 13, margin: "0 0 20px", fontFamily: fontSans }}>
              Criada em {c.createdDate} por {c.author}
            </p>

            {/* Unlock condition */}
            <div style={{
              background: C.card, borderRadius: 20, padding: 20,
              border: `1px solid ${C.border}`, textAlign: "left",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <Ico type="clock" size={16} color={em.color} />
                <span style={{ color: em.color, fontSize: 12, fontWeight: 700, fontFamily: fontSans, letterSpacing: 0.5 }}>CONDIÇÃO DE DESBLOQUEIO</span>
              </div>
              <p style={{ color: C.text, fontSize: 16, fontWeight: 600, margin: "0 0 12px", fontFamily: fontSans }}>{c.unlockCondition}</p>

              {c.unlockProgress != null && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: C.textDim, fontSize: 11, fontFamily: fontSans }}>Progresso</span>
                    <span style={{ color: em.color, fontSize: 12, fontWeight: 700, fontFamily: fontSans }}>{c.unlockProgress}%</span>
                  </div>
                  <div style={{ height: 6, background: C.bgDeep, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${c.unlockProgress}%`, borderRadius: 3, background: `linear-gradient(90deg, ${em.color}80, ${em.color})`, transition: "width 1s ease" }} />
                  </div>
                </div>
              )}

              {c.daysUntil && (
                <div style={{
                  background: em.color + "10", borderRadius: 14, padding: "14px 16px",
                  border: `1px solid ${em.color}15`, textAlign: "center",
                }}>
                  <span style={{ color: em.color, fontSize: 32, fontWeight: 800, fontFamily: fontSans }}>{c.daysUntil}</span>
                  <p style={{ color: C.textSec, fontSize: 12, margin: "4px 0 0" }}>dias restantes</p>
                </div>
              )}

              {c.preview && (
                <div style={{ marginTop: 14, padding: "14px", background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}` }}>
                  <p style={{ color: C.textDim, fontSize: 13, fontStyle: "italic", lineHeight: 1.6, margin: 0, fontFamily: fontSans }}>
                    "{c.preview}"
                  </p>
                </div>
              )}
            </div>

            {c.type === "video" && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 14, color: C.textDim, fontSize: 12 }}>
                <Ico type="video" size={15} color={C.textDim} />
                <span>Vídeo · {c.duration}</span>
              </div>
            )}
            {c.type === "photo" && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 14, color: C.textDim, fontSize: 12 }}>
                <Ico type="camera" size={15} color={C.textDim} />
                <span>{c.photos} fotos secretas</span>
              </div>
            )}
            {c.isPrivate && (
              <div style={{
                marginTop: 14, padding: "10px 16px", borderRadius: 12,
                background: C.tealSoft, border: `1px solid ${C.teal}15`,
                display: "inline-flex", alignItems: "center", gap: 6,
              }}>
                <Ico type="shield" size={14} color={C.teal} />
                <span style={{ color: C.teal, fontSize: 11, fontWeight: 700, fontFamily: fontSans }}>Cápsula privada · Ligada ao Testamento Emocional</span>
              </div>
            )}
          </div>

          <button onClick={onClose} style={{
            width: "100%", padding: 15, borderRadius: 16, cursor: "pointer",
            background: C.card, border: `1px solid ${C.border}`,
            color: C.textSec, fontSize: 14, fontWeight: 600, fontFamily: fontSans,
          }}>Fechar</button>
        </div>
      </div>
    );
  }

  // UNLOCKED capsule
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 50, background: "rgba(14,11,21,0.75)", backdropFilter: "blur(12px)", display: "flex", alignItems: "flex-end" }}>
      <div style={{ background: C.bg, borderRadius: "32px 32px 0 0", width: "100%", maxHeight: "90%", overflow: "auto", padding: "8px 22px 36px" }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 16px" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: C.textGhost }} />
        </div>

        {!revealed ? (
          /* Reveal animation */
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ position: "relative", display: "inline-block" }}>
              <Particles color={C.gold} count={20} />
              <div style={{
                width: 120, height: 120, borderRadius: 36, margin: "0 auto 24px",
                background: `radial-gradient(circle, ${C.gold}20, ${C.card})`,
                border: `2px solid ${C.gold}40`,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 0 60px ${C.gold}20`,
                animation: "glow 2s ease-in-out infinite",
              }}>
                <span style={{ fontSize: 54 }}>💌</span>
              </div>
            </div>
            <h2 style={{ color: C.gold, fontSize: 24, fontWeight: 700, margin: "0 0 8px", fontFamily: font }}>{c.title}</h2>
            <p style={{ color: C.textSec, fontSize: 14, margin: "0 0 6px", fontFamily: fontSans }}>
              Criada em {c.createdDate}
            </p>
            <p style={{ color: C.textDim, fontSize: 13, margin: "0 0 30px", fontFamily: fontSans }}>
              Desbloqueada em {c.unlockDate}
            </p>
            <button onClick={() => setRevealed(true)} style={{
              padding: "16px 40px", borderRadius: 18, cursor: "pointer",
              background: `linear-gradient(135deg, ${C.gold}, ${C.goldBright})`,
              border: "none", color: C.bgDeep, fontSize: 16, fontWeight: 800,
              fontFamily: fontSans, boxShadow: `0 4px 20px ${C.gold}40`,
              display: "inline-flex", alignItems: "center", gap: 10,
            }}>
              <Ico type="unlock" size={20} color={C.bgDeep} /> Abrir Cápsula
            </button>
          </div>
        ) : (
          /* Revealed content */
          <div style={{ padding: "10px 0" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 28 }}>{em.emoji}</span>
                <div>
                  <h2 style={{ color: C.text, fontSize: 19, fontWeight: 700, margin: 0, fontFamily: font }}>{c.title}</h2>
                  <p style={{ color: C.textDim, fontSize: 11, margin: "2px 0 0", fontFamily: fontSans }}>
                    {c.createdDate} → {c.unlockDate} · {c.author}
                  </p>
                </div>
              </div>
              <button onClick={onClose} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, width: 36, height: 36, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Ico type="x" size={18} color={C.textSec} />
              </button>
            </div>

            {/* Audio player mock */}
            {c.type === "audio" && (
              <div style={{
                background: C.card, borderRadius: 20, padding: 20, marginBottom: 18,
                border: `1px solid ${C.border}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                  <button style={{
                    width: 52, height: 52, borderRadius: 16, cursor: "pointer",
                    background: `linear-gradient(135deg, ${em.color}, ${em.color}CC)`,
                    border: "none", display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: `0 4px 16px ${em.color}30`,
                  }}>
                    <Ico type="play" size={22} color="#fff" />
                  </button>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 2, height: 30 }}>
                      {Array.from({ length: 40 }).map((_, i) => (
                        <div key={i} style={{
                          width: 2.5, borderRadius: 1.5,
                          height: 6 + Math.sin(i * 0.5) * 12 + Math.random() * 8,
                          background: i < 28 ? em.color : C.textGhost,
                          transition: "height 0.2s",
                        }} />
                      ))}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                      <span style={{ color: em.color, fontSize: 11, fontFamily: fontSans, fontWeight: 600 }}>1:05</span>
                      <span style={{ color: C.textDim, fontSize: 11, fontFamily: fontSans }}>{c.duration}</span>
                    </div>
                  </div>
                </div>
                {c.transcript && (
                  <div style={{
                    background: C.bgCard, borderRadius: 14, padding: "14px 16px",
                    border: `1px solid ${C.border}`,
                  }}>
                    <p style={{ color: C.textDim, fontSize: 10, fontWeight: 700, letterSpacing: 0.8, margin: "0 0 6px", fontFamily: fontSans }}>TRANSCRIÇÃO</p>
                    <p style={{ color: C.textSec, fontSize: 14, lineHeight: 1.8, margin: 0, fontFamily: fontHand, fontStyle: "italic" }}>
                      {c.transcript}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Text message */}
            {c.message && (
              <div style={{
                background: `linear-gradient(160deg, ${em.color}08, ${C.gold}04)`,
                borderRadius: 24, padding: "24px 22px", marginBottom: 18,
                border: `1px solid ${em.color}15`,
                position: "relative", overflow: "hidden",
              }}>
                <Particles color={em.color} count={6} />
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                  <span style={{ fontSize: 18 }}>✉️</span>
                  <span style={{ color: em.color, fontSize: 12, fontWeight: 700, fontFamily: fontSans, letterSpacing: 0.5 }}>MENSAGEM DO TUTOR</span>
                </div>
                <p style={{
                  color: C.text, fontSize: 17, lineHeight: 2, margin: 0,
                  fontFamily: fontHand, position: "relative", zIndex: 1,
                }}>{c.message}</p>
              </div>
            )}

            {/* AI Reflection */}
            {c.aiReflection && (
              <div>
                <button onClick={() => setShowAI(!showAI)} style={{
                  width: "100%", padding: "14px 18px", borderRadius: 18,
                  background: C.card, border: `1px solid ${C.border}`, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 10, textAlign: "left",
                  fontFamily: fontSans,
                }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 12,
                    background: C.violetSoft, display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Ico type="sparkle" size={18} color={C.violet} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: C.violet, fontSize: 12, fontWeight: 700 }}>Reflexão da IA</span>
                    <p style={{ color: C.textDim, fontSize: 11, margin: "2px 0 0" }}>O que mudou desde que esta cápsula foi criada</p>
                  </div>
                  <span style={{ color: C.textDim, fontSize: 16, transform: showAI ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>▶</span>
                </button>

                {showAI && (
                  <div style={{
                    background: C.violetSoft, borderRadius: "0 0 18px 18px", padding: "16px 20px",
                    border: `1px solid ${C.violet}12`, borderTop: "none", marginTop: -4,
                  }}>
                    <p style={{ color: C.textSec, fontSize: 14, lineHeight: 1.8, margin: 0, fontFamily: fontSans }}>
                      {c.aiReflection}
                    </p>
                  </div>
                )}
              </div>
            )}

            <button onClick={onClose} style={{
              width: "100%", padding: 15, borderRadius: 16, cursor: "pointer", marginTop: 18,
              background: `linear-gradient(135deg, ${em.color}20, ${C.card})`,
              border: `1px solid ${em.color}20`,
              color: em.color, fontSize: 14, fontWeight: 700, fontFamily: fontSans,
            }}>Fechar Cápsula</button>
          </div>
        )}
      </div>
      <style>{`@keyframes glow{0%,100%{box-shadow:0 0 30px ${C.gold}15}50%{box-shadow:0 0 60px ${C.gold}30}}`}</style>
    </div>
  );
};

// ======================== NEW CAPSULE MODAL ========================
const NewCapsuleModal = ({ onClose }) => {
  const [step, setStep] = useState(0);
  const [capsuleType, setCapsuleType] = useState(null);
  const [condition, setCondition] = useState(null);
  const [message, setMessage] = useState("");

  const types = [
    { id: "text", emoji: "✉️", label: "Mensagem escrita", desc: "Escreva com o coração", color: C.rose },
    { id: "audio", emoji: "🎙️", label: "Mensagem de voz", desc: "Grave sua voz para o futuro", color: C.violet },
    { id: "video", emoji: "🎬", label: "Vídeo", desc: "Um momento em movimento", color: C.sky },
    { id: "photo", emoji: "📷", label: "Galeria secreta", desc: "Fotos que contam uma história", color: C.ember },
  ];

  const conditions = [
    { id: "birthday", emoji: "🎂", label: "Aniversário do pet", desc: "Escolha qual aniversário", color: C.gold },
    { id: "date", emoji: "📅", label: "Data específica", desc: "Natal, Ano Novo, datas especiais", color: C.sky },
    { id: "health", emoji: "💉", label: "Meta de saúde", desc: "Vacinas em dia, peso ideal...", color: C.teal },
    { id: "milestone", emoji: "🏅", label: "Conquista", desc: "Novo truque, 100 passeios...", color: C.ember },
    { id: "succession", emoji: "🛡️", label: "Testamento emocional", desc: "Só abre em caso de sucessão", color: C.rose },
  ];

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 50, background: "rgba(14,11,21,0.7)", backdropFilter: "blur(12px)", display: "flex", alignItems: "flex-end" }}>
      <div style={{ background: C.bg, borderRadius: "32px 32px 0 0", width: "100%", maxHeight: "88%", overflow: "auto", padding: "8px 22px 36px" }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 16px" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: C.textGhost }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div>
            <h3 style={{ color: C.text, fontSize: 20, fontWeight: 700, margin: 0, fontFamily: font }}>Nova Cápsula do Tempo</h3>
            <p style={{ color: C.textDim, fontSize: 12, margin: "4px 0 0", fontFamily: fontSans }}>Passo {step + 1} de 3</p>
          </div>
          <button onClick={onClose} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, width: 36, height: 36, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Ico type="x" size={18} color={C.textSec} />
          </button>
        </div>

        {/* Progress */}
        <div style={{ display: "flex", gap: 5, margin: "12px 0 24px" }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? C.gold : C.textGhost, transition: "background 0.3s" }} />
          ))}
        </div>

        {step === 0 && (
          <>
            <p style={{ color: C.textSec, fontSize: 14, margin: "0 0 18px", fontFamily: fontSans }}>Que tipo de memória você quer guardar?</p>
            {types.map(t => (
              <button key={t.id} onClick={() => { setCapsuleType(t.id); setStep(1); }} style={{
                display: "flex", alignItems: "center", gap: 14, width: "100%",
                background: C.card, border: `1px solid ${C.border}`, borderRadius: 18,
                padding: "16px 18px", marginBottom: 10, cursor: "pointer", textAlign: "left",
                fontFamily: fontSans, transition: "all 0.2s",
              }}>
                <div style={{
                  width: 50, height: 50, borderRadius: 16, flexShrink: 0,
                  background: t.color + "12", border: `1.5px solid ${t.color}25`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 24,
                }}>{t.emoji}</div>
                <div>
                  <p style={{ color: C.text, fontSize: 15, fontWeight: 700, margin: 0 }}>{t.label}</p>
                  <p style={{ color: C.textDim, fontSize: 12, margin: "3px 0 0" }}>{t.desc}</p>
                </div>
              </button>
            ))}
          </>
        )}

        {step === 1 && (
          <>
            <p style={{ color: C.textSec, fontSize: 14, margin: "0 0 18px", fontFamily: fontSans }}>Quando a cápsula deve ser aberta?</p>
            {conditions.map(cn => (
              <button key={cn.id} onClick={() => { setCondition(cn.id); setStep(2); }} style={{
                display: "flex", alignItems: "center", gap: 14, width: "100%",
                background: condition === cn.id ? cn.color + "10" : C.card,
                border: `1px solid ${condition === cn.id ? cn.color + "30" : C.border}`,
                borderRadius: 18, padding: "16px 18px", marginBottom: 10,
                cursor: "pointer", textAlign: "left", fontFamily: fontSans,
              }}>
                <div style={{
                  width: 46, height: 46, borderRadius: 14, flexShrink: 0,
                  background: cn.color + "12", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22,
                }}>{cn.emoji}</div>
                <div>
                  <p style={{ color: C.text, fontSize: 14, fontWeight: 700, margin: 0 }}>{cn.label}</p>
                  <p style={{ color: C.textDim, fontSize: 12, margin: "3px 0 0" }}>{cn.desc}</p>
                </div>
              </button>
            ))}
            <button onClick={() => setStep(0)} style={{
              width: "100%", padding: 13, borderRadius: 14, cursor: "pointer", marginTop: 6,
              background: "transparent", border: `1px solid ${C.border}`,
              color: C.textDim, fontSize: 13, fontWeight: 600, fontFamily: fontSans,
            }}>← Voltar</button>
          </>
        )}

        {step === 2 && (
          <>
            <p style={{ color: C.textSec, fontSize: 14, margin: "0 0 18px", fontFamily: fontSans }}>
              {capsuleType === "text" ? "Escreva sua mensagem para o futuro" : capsuleType === "audio" ? "Grave sua mensagem de voz" : capsuleType === "video" ? "Grave ou selecione um vídeo" : "Selecione as fotos"}
            </p>

            {capsuleType === "text" && (
              <textarea
                value={message} onChange={e => setMessage(e.target.value)}
                placeholder="Rex, quando você ler isso..."
                style={{
                  width: "100%", minHeight: 140, padding: "16px 18px", borderRadius: 18,
                  border: `1px solid ${C.border}`, background: C.card, resize: "vertical",
                  fontFamily: fontHand, fontSize: 16, color: C.text, lineHeight: 1.8,
                  outline: "none", boxSizing: "border-box",
                }}
              />
            )}

            {capsuleType === "audio" && (
              <div style={{
                background: C.card, borderRadius: 22, padding: 30, textAlign: "center",
                border: `1px solid ${C.border}`,
              }}>
                <div style={{
                  width: 80, height: 80, borderRadius: "50%", margin: "0 auto 16px",
                  background: `radial-gradient(circle, ${C.violet}30, ${C.card})`,
                  border: `2px solid ${C.violet}40`, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Ico type="mic" size={32} color={C.violet} />
                </div>
                <p style={{ color: C.text, fontSize: 15, fontWeight: 600, margin: "0 0 4px", fontFamily: fontSans }}>Toque para gravar</p>
                <p style={{ color: C.textDim, fontSize: 12, margin: 0, fontFamily: fontSans }}>Máximo de 5 minutos</p>
              </div>
            )}

            {(capsuleType === "video" || capsuleType === "photo") && (
              <div style={{
                background: C.card, borderRadius: 22, padding: 30, textAlign: "center",
                border: `2px dashed ${C.border}`,
              }}>
                <Ico type={capsuleType === "video" ? "video" : "camera"} size={36} color={C.textDim} />
                <p style={{ color: C.text, fontSize: 14, fontWeight: 600, margin: "12px 0 4px", fontFamily: fontSans }}>
                  {capsuleType === "video" ? "Gravar ou selecionar vídeo" : "Selecionar fotos"}
                </p>
                <p style={{ color: C.textDim, fontSize: 12, margin: 0 }}>{capsuleType === "video" ? "Máximo de 3 minutos" : "Até 30 fotos"}</p>
              </div>
            )}

            {/* Title input */}
            <input
              placeholder="Título da cápsula (ex: Para o Rex aos 5 anos)"
              style={{
                width: "100%", padding: "14px 16px", borderRadius: 14, marginTop: 16,
                border: `1px solid ${C.border}`, background: C.card,
                fontFamily: fontSans, fontSize: 14, color: C.text,
                outline: "none", boxSizing: "border-box",
              }}
            />

            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button onClick={() => setStep(1)} style={{
                flex: 1, padding: 14, borderRadius: 16, cursor: "pointer",
                background: C.card, border: `1px solid ${C.border}`,
                color: C.textSec, fontSize: 14, fontWeight: 600, fontFamily: fontSans,
              }}>← Voltar</button>
              <button onClick={onClose} style={{
                flex: 2, padding: 14, borderRadius: 16, cursor: "pointer",
                background: `linear-gradient(135deg, ${C.gold}, ${C.goldBright})`,
                border: "none", color: C.bgDeep, fontSize: 14, fontWeight: 800, fontFamily: fontSans,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
                <Ico type="lock" size={18} color={C.bgDeep} /> Selar Cápsula
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ======================== MAIN APP ========================
export default function CapsulaTempo() {
  const [selectedCapsule, setSelectedCapsule] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState("all");
  const containerRef = useRef();

  const locked = capsules.filter(c => c.status === "locked");
  const unlocked = capsules.filter(c => c.status === "unlocked");
  const filtered = filter === "all" ? capsules : filter === "locked" ? locked : unlocked;

  return (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center",
      minHeight: "100vh", padding: 20,
      background: `radial-gradient(ellipse at 50% 30%, #1E1835, ${C.bgDeep} 60%, #08060E)`,
      fontFamily: fontSans,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Quicksand:wght@400;500;600;700&family=Caveat:wght@400;600;700&display=swap" rel="stylesheet" />

      <div ref={containerRef} style={{
        width: 400, maxHeight: 820, background: C.bg, borderRadius: 40,
        overflow: "auto", position: "relative",
        boxShadow: `0 20px 80px rgba(0,0,0,0.6), 0 0 0 1px ${C.border}`,
      }}>
        {/* Notch */}
        <div style={{ position: "sticky", top: 0, zIndex: 30, display: "flex", justifyContent: "center", padding: "8px 0 0", background: `linear-gradient(to bottom, ${C.bg}, transparent)` }}>
          <div style={{ width: 120, height: 28, borderRadius: 20, background: "#000" }} />
        </div>

        {/* Header */}
        <div style={{ padding: "12px 20px 6px", display: "flex", alignItems: "center", gap: 12 }}>
          <button style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, width: 38, height: 38, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Ico type="back" size={18} color={C.text} />
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ color: C.text, fontSize: 21, margin: 0, fontWeight: 700, fontFamily: font, letterSpacing: -0.3 }}>Cápsulas do Tempo</h1>
            <p style={{ color: C.textDim, fontSize: 12, margin: "2px 0 0" }}>Mensagens para o futuro do Rex</p>
          </div>
          <button onClick={() => setShowNew(true)} style={{
            background: `linear-gradient(135deg, ${C.gold}, ${C.goldBright})`,
            border: "none", borderRadius: 14, padding: "9px 16px", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
            boxShadow: `0 4px 16px ${C.gold}30`,
          }}>
            <Ico type="plus" size={16} color={C.bgDeep} />
            <span style={{ color: C.bgDeep, fontSize: 12, fontWeight: 800 }}>Nova</span>
          </button>
        </div>

        {/* Hero / Stats */}
        <div style={{
          margin: "16px 20px 0", padding: "22px 20px",
          background: `linear-gradient(145deg, ${C.card}, ${C.cardGlow})`,
          borderRadius: 26, border: `1px solid ${C.border}`,
          position: "relative", overflow: "hidden",
        }}>
          <Particles color={C.gold} count={10} />
          <div style={{ display: "flex", alignItems: "center", gap: 18, position: "relative", zIndex: 1 }}>
            <div style={{
              width: 72, height: 72, borderRadius: 24,
              background: `radial-gradient(circle, ${C.gold}15, ${C.card})`,
              border: `2px solid ${C.gold}30`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 36, boxShadow: `0 0 30px ${C.gold}12`,
            }}>⏳</div>
            <div>
              <p style={{ color: C.textDim, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, margin: "0 0 6px" }}>CÁPSULAS CRIADAS</p>
              <div style={{ display: "flex", gap: 16 }}>
                <div>
                  <span style={{ color: C.gold, fontSize: 28, fontWeight: 800 }}>{capsules.length}</span>
                  <p style={{ color: C.textDim, fontSize: 10, margin: "2px 0 0" }}>Total</p>
                </div>
                <div style={{ width: 1, background: C.border }} />
                <div>
                  <span style={{ color: C.violet, fontSize: 28, fontWeight: 800 }}>{locked.length}</span>
                  <p style={{ color: C.textDim, fontSize: 10, margin: "2px 0 0" }}>Trancadas</p>
                </div>
                <div style={{ width: 1, background: C.border }} />
                <div>
                  <span style={{ color: C.teal, fontSize: 28, fontWeight: 800 }}>{unlocked.length}</span>
                  <p style={{ color: C.textDim, fontSize: 10, margin: "2px 0 0" }}>Abertas</p>
                </div>
              </div>
            </div>
          </div>

          {/* Next unlock */}
          <div style={{
            marginTop: 18, padding: "12px 16px", borderRadius: 14,
            background: C.gold + "08", border: `1px solid ${C.gold}12`,
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <Ico type="clock" size={16} color={C.gold} />
            <p style={{ color: C.textSec, fontSize: 12, margin: 0, flex: 1 }}>
              Próximo desbloqueio: <span style={{ color: C.gold, fontWeight: 700 }}>Vacinas em dia</span> (60%)
            </p>
          </div>
        </div>

        {/* Filter */}
        <div style={{ padding: "18px 20px 0", display: "flex", gap: 6 }}>
          {[
            { id: "all", label: `Todas (${capsules.length})` },
            { id: "locked", label: `🔒 Trancadas (${locked.length})` },
            { id: "unlocked", label: `💌 Abertas (${unlocked.length})` },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              flex: 1, padding: "9px 6px", borderRadius: 12, cursor: "pointer",
              background: filter === f.id ? C.gold + "18" : C.card,
              border: filter === f.id ? `1px solid ${C.gold}30` : `1px solid ${C.border}`,
              color: filter === f.id ? C.gold : C.textDim,
              fontSize: 11, fontWeight: 700, fontFamily: fontSans,
              transition: "all 0.2s",
            }}>{f.label}</button>
          ))}
        </div>

        {/* Timeline */}
        <div style={{ padding: "20px 20px 0", position: "relative" }}>
          <div style={{
            position: "absolute", left: 29, top: 30, bottom: 30,
            width: 2, background: `linear-gradient(to bottom, ${C.gold}30, ${C.violet}20, ${C.border}, transparent)`,
          }} />

          {filtered.map((c, i) => {
            const em = emotionConfig[c.emotion] || emotionConfig.love;
            const isLocked = c.status === "locked";
            return (
              <div key={c.id} style={{ position: "relative", paddingLeft: 36, marginBottom: 18 }}>
                {/* Timeline dot */}
                <div style={{
                  position: "absolute", left: 0, top: 10,
                  width: 20, height: 20, borderRadius: 10,
                  background: isLocked ? C.bgCard : C.bg,
                  border: `2.5px solid ${isLocked ? C.violet : C.gold}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  zIndex: 2, boxShadow: `0 0 12px ${isLocked ? C.violet : C.gold}15`,
                }}>
                  <div style={{ width: 7, height: 7, borderRadius: 4, background: isLocked ? C.violet : C.gold }} />
                </div>

                <button onClick={() => setSelectedCapsule(c)} style={{
                  width: "100%", textAlign: "left", cursor: "pointer",
                  background: C.card, borderRadius: 22, padding: "18px 20px",
                  border: `1px solid ${isLocked ? C.violet + "20" : C.gold + "20"}`,
                  position: "relative", overflow: "hidden", fontFamily: fontSans,
                  transition: "all 0.25s", boxShadow: C.shadow,
                }}>
                  {/* Glow effect */}
                  <div style={{
                    position: "absolute", top: -30, right: -30, width: 100, height: 100,
                    borderRadius: "50%", background: `radial-gradient(circle, ${isLocked ? C.violet : C.gold}08, transparent)`,
                  }} />

                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 16, flexShrink: 0,
                      background: isLocked ? C.violetSoft : C.goldSoft,
                      border: `1.5px solid ${isLocked ? C.violet + "25" : C.gold + "25"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 22,
                    }}>
                      {isLocked ? "🔒" : "💌"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ color: C.text, fontSize: 15, fontWeight: 700, margin: 0 }}>{c.title}</p>
                      <p style={{ color: C.textDim, fontSize: 11, margin: "3px 0 0" }}>
                        {c.createdDate} · {c.author}
                      </p>
                    </div>
                    <div style={{
                      padding: "4px 10px", borderRadius: 10,
                      background: isLocked ? C.violetSoft : C.goldSoft,
                    }}>
                      <span style={{ color: isLocked ? C.violet : C.gold, fontSize: 10, fontWeight: 700 }}>
                        {c.type === "text" ? "✉️" : c.type === "audio" ? "🎙️" : c.type === "video" ? "🎬" : "📷"}
                      </span>
                    </div>
                  </div>

                  {/* Condition / Status */}
                  <div style={{
                    background: C.bgCard, borderRadius: 14, padding: "10px 14px",
                    border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10,
                  }}>
                    <Ico type={isLocked ? "lock" : "unlock"} size={15} color={isLocked ? C.violet : C.gold} />
                    <div style={{ flex: 1 }}>
                      <p style={{ color: C.textSec, fontSize: 12, fontWeight: 600, margin: 0 }}>{c.unlockCondition}</p>
                      {isLocked && c.daysUntil && (
                        <p style={{ color: C.textDim, fontSize: 10, margin: "2px 0 0" }}>{c.daysUntil} dias restantes</p>
                      )}
                      {!isLocked && (
                        <p style={{ color: C.gold, fontSize: 10, margin: "2px 0 0" }}>Desbloqueada em {c.unlockDate}</p>
                      )}
                    </div>

                    {c.unlockProgress != null && (
                      <div style={{ width: 50 }}>
                        <div style={{ height: 4, background: C.bgDeep, borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${c.unlockProgress}%`, borderRadius: 2, background: C.violet }} />
                        </div>
                        <p style={{ color: C.violet, fontSize: 9, fontWeight: 700, textAlign: "right", margin: "3px 0 0" }}>{c.unlockProgress}%</p>
                      </div>
                    )}
                  </div>

                  {c.isPrivate && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 10 }}>
                      <Ico type="shield" size={12} color={C.teal} />
                      <span style={{ color: C.teal, fontSize: 10, fontWeight: 700 }}>Cápsula privada · Testamento</span>
                    </div>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* AI Emotional Note */}
        <div style={{
          margin: "10px 20px 0", padding: 20,
          background: `linear-gradient(145deg, ${C.violet}06, ${C.gold}04)`,
          borderRadius: 22, border: `1px solid ${C.violet}12`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Ico type="paw" size={16} color={C.gold} />
            <span style={{ color: C.gold, fontSize: 12, fontWeight: 700, letterSpacing: 0.5 }}>DIÁRIO DO REX</span>
          </div>
          <p style={{
            color: C.textSec, fontSize: 16, lineHeight: 1.9, margin: 0,
            fontFamily: fontHand, fontStyle: "italic",
          }}>
            "O meu humano fica às vezes a olhar para o telemóvel com os olhos brilhantes. Acho que está a escrever coisas sobre mim para o futuro. Não sei o que é o futuro, mas se tiver biscoitos e colo, eu aceito. 💛"
          </p>
        </div>

        {/* Tips */}
        <div style={{
          margin: "18px 20px 0", padding: 18,
          background: C.card, borderRadius: 20, border: `1px solid ${C.border}`,
        }}>
          <p style={{ color: C.textDim, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, margin: "0 0 12px" }}>IDEIAS PARA CÁPSULAS</p>
          {[
            { emoji: "🎂", text: "Grave uma mensagem para cada aniversário" },
            { emoji: "🏅", text: "Celebre cada novo truque aprendido" },
            { emoji: "✈️", text: "Guarde memórias de viagens juntos" },
            { emoji: "🤝", text: "Escreva para quem cuidará dele um dia" },
            { emoji: "📊", text: "Compare como ele era vs como é agora" },
          ].map((tip, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 16 }}>{tip.emoji}</span>
              <span style={{ color: C.textSec, fontSize: 12, fontFamily: fontSans }}>{tip.text}</span>
            </div>
          ))}
        </div>

        {/* Bottom spacer */}
        <div style={{ height: 30 }} />

        {/* Modals */}
        {selectedCapsule && <CapsuleDetail capsule={selectedCapsule} onClose={() => setSelectedCapsule(null)} />}
        {showNew && <NewCapsuleModal onClose={() => setShowNew(false)} />}

        <style>{`
          ::-webkit-scrollbar{width:0;height:0}
          @keyframes float0{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
          @keyframes float1{0%,100%{transform:translateY(0) translateX(0)}50%{transform:translateY(-5px) translateX(3px)}}
          @keyframes float2{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        `}</style>
      </div>
    </div>
  );
}
