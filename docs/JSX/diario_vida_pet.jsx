import { useState, useRef, useEffect } from "react";

// ======================== DESIGN TOKENS ========================
const C = {
  bg: "#FAF6F1", bgDeep: "#F2EBE0", cream: "#FFFDF9",
  card: "#FFFFFF", cardAlt: "#FEFCF8",
  ink: "#2A1F14", inkSec: "#5E4D3B", inkDim: "#A3927D", inkGhost: "#C8BAA8",
  primary: "#D4763A", primarySoft: "#D4763A12", primaryGlow: "#D4763A25",
  coral: "#E06B5E", coralSoft: "#E06B5E10",
  sage: "#6B9E7A", sageSoft: "#6B9E7A10", sageMed: "#6B9E7A22",
  sky: "#5B8FCA", skySoft: "#5B8FCA10",
  plum: "#8B6BAE", plumSoft: "#8B6BAE10",
  gold: "#CDA042", goldSoft: "#CDA04210", goldWarm: "#CDA04230",
  rose: "#C97089", roseSoft: "#C9708910",
  teal: "#4A9E92", tealSoft: "#4A9E9210",
  border: "#EAE1D4", borderLight: "#F0E9DE",
  shadow: "0 2px 20px rgba(42,31,20,0.06)",
};
const font = "'Crimson Pro', 'Georgia', serif";
const fontSans = "'DM Sans', -apple-system, sans-serif";
const fontHand = "'Caveat', cursive";

// ======================== ICONS ========================
const Ico = ({ type, size = 20, color = C.inkDim }) => {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" };
  const icons = {
    back: <svg {...p}><polyline points="15,18 9,12 15,6"/></svg>,
    edit: <svg {...p}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    filter: <svg {...p}><polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"/></svg>,
    search: <svg {...p}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    calendar: <svg {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    heart: <svg {...p} fill={color} stroke="none"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
    paw: <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><ellipse cx="12" cy="17" rx="4.5" ry="4"/><circle cx="7" cy="10.5" r="2.2"/><circle cx="17" cy="10.5" r="2.2"/><circle cx="9.5" cy="6.5" r="1.8"/><circle cx="14.5" cy="6.5" r="1.8"/></svg>,
    star: <svg {...p} fill={color} stroke="none"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>,
    camera: <svg {...p}><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>,
    mic: <svg {...p}><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/></svg>,
    shield: <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    gift: <svg {...p}><polyline points="20,12 20,22 4,22 4,12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 110-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 100-5C13 2 12 7 12 7z"/></svg>,
    lock: <svg {...p}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
    unlock: <svg {...p}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 019.9-1"/></svg>,
    clock: <svg {...p}><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>,
    alert: <svg {...p}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    sparkle: <svg {...p} strokeWidth="1.5"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/></svg>,
    trophy: <svg {...p}><path d="M6 9H4a2 2 0 01-2-2V5h4"/><path d="M18 9h2a2 2 0 002-2V5h-4"/><path d="M4 5h16v4a6 6 0 01-6 6h-4a6 6 0 01-6-6V5z"/><path d="M12 15v3"/><path d="M8 21h8"/><path d="M12 18h0"/></svg>,
    book: <svg {...p}><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M4 4.5A2.5 2.5 0 016.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15z"/></svg>,
    sun: <svg {...p}><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
    send: <svg {...p}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/></svg>,
    plus: <svg {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    x: <svg {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  };
  return icons[type] || null;
};

// ======================== MOOD EMOJIS ========================
const moods = {
  ecstatic: { emoji: "🤩", label: "Eufórico", color: "#E8A840", score: 100 },
  happy: { emoji: "😊", label: "Feliz", color: C.sage, score: 80 },
  calm: { emoji: "😌", label: "Calmo", color: C.sky, score: 65 },
  tired: { emoji: "😴", label: "Cansado", color: C.plum, score: 45 },
  anxious: { emoji: "😰", label: "Ansioso", color: C.coral, score: 30 },
  sad: { emoji: "😢", label: "Triste", color: C.rose, score: 15 },
};

// ======================== HAPPINESS CHART ========================
const HappinessChart = ({ data, height = 120 }) => {
  const w = 320, pad = 14;
  const max = 100, min = 0;
  const pts = data.map((d, i) => ({
    x: pad + (i / (data.length - 1)) * (w - pad * 2),
    y: height - pad - ((d.score - min) / (max - min)) * (height - pad * 2 - 10),
    ...d,
  }));
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const smooth = pts.map((p, i) => {
    if (i === 0) return `M${p.x},${p.y}`;
    const prev = pts[i - 1];
    const cpx = (prev.x + p.x) / 2;
    return `C${cpx},${prev.y} ${cpx},${p.y} ${p.x},${p.y}`;
  }).join(" ");
  const area = `${smooth} L${pts[pts.length-1].x},${height-pad} L${pts[0].x},${height-pad} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${height + 22}`} style={{ width: "100%", display: "block" }}>
      <defs>
        <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.sage} stopOpacity="0.25" />
          <stop offset="60%" stopColor={C.gold} stopOpacity="0.08" />
          <stop offset="100%" stopColor={C.coral} stopOpacity="0.03" />
        </linearGradient>
      </defs>
      {/* Zone labels */}
      {[
        { y: height - pad - 0.85 * (height - pad * 2 - 10), label: "Feliz", color: C.sage },
        { y: height - pad - 0.5 * (height - pad * 2 - 10), label: "Calmo", color: C.sky },
        { y: height - pad - 0.2 * (height - pad * 2 - 10), label: "Triste", color: C.coral },
      ].map((z, i) => (
        <g key={i}>
          <line x1={pad} y1={z.y} x2={w - pad} y2={z.y} stroke={C.border} strokeWidth="0.5" strokeDasharray="4,4" />
          <text x={w - pad + 4} y={z.y + 3} fontSize="7" fill={z.color} fontFamily={fontSans} fontWeight="600">{z.label}</text>
        </g>
      ))}
      <path d={area} fill="url(#hg)" />
      <path d={smooth} fill="none" stroke={C.primary} strokeWidth="2.5" strokeLinecap="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="5" fill={C.cream} stroke={p.moodColor || C.primary} strokeWidth="2.5" />
          <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="13">{p.emoji}</text>
          <text x={p.x} y={height + 16} textAnchor="middle" fontSize="8" fill={C.inkDim} fontFamily={fontSans} fontWeight="600">{p.label}</text>
        </g>
      ))}
    </svg>
  );
};

// ======================== TIMELINE DATA ========================
const timelineData = [
  // Março 2026
  {
    id: "m202603", type: "month_summary", month: "Março 2026",
    summary: "Um mês agitado! Rex fez check-up anual, começou suplemento de ômega 3 e fez 2 novos amigos no parque. Humor predominante: feliz.",
    stats: { walks: 24, photos: 18, vet: 1, mood: "happy" },
  },
  {
    id: "e1", type: "diary", date: "26 Mar 2026", time: "16:45", mood: "happy",
    tutor_input: "Hoje o Rex foi ao parque e brincou com a Nina por 40 minutos. Voltou exausto mas feliz.",
    ai_diary: "Hoje foi o MELHOR dia! Encontrei a Nina no parque e corremos tanto que as minhas patas ficaram todas sujas. A Nina é rápida, mas eu sou mais esperto — fingi que ia para a esquerda e fui para a direita. O meu humano ficou rindo. Voltei para casa e dormi no tapete antes de chegar ao sofá. Vida boa demais! 🐾",
    tags: ["Parque", "Nina", "Brincadeira"],
  },
  {
    id: "e2", type: "health", date: "24 Mar 2026", time: "10:00",
    title: "Início do Ômega 3",
    detail: "IA detectou ressecamento no pelo na região lombar durante análise de foto. Suplemento de Ômega 3 (1000mg) prescrito pela Dra. Carla.",
    severity: "low", source: "ai_photo",
  },
  {
    id: "e3", type: "milestone", date: "22 Mar 2026",
    title: "🏅 25 Passeios no Mês!",
    detail: "Rex completou 25 passeios em março. Conquista: 'Patas Incansáveis' desbloqueada!",
    badge: "Patas Incansáveis",
  },
  {
    id: "e4", type: "diary", date: "20 Mar 2026", time: "20:10", mood: "calm",
    tutor_input: "Dia tranquilo em casa. Rex ficou a maior parte do tempo deitado na janela vendo os passarinhos.",
    ai_diary: "Hoje decidi ser um filósofo. Fiquei na janela a observar os passarinhos. Há um vermelho que aparece sempre às 15h — acho que somos amigos. Ele canta, eu ouço. É uma amizade silenciosa mas profunda. O meu humano trouxe-me biscoito enquanto eu meditava. Serviço nota 10. 🐦",
    tags: ["Casa", "Relaxamento"],
  },
  {
    id: "e5", type: "audio", date: "18 Mar 2026", time: "14:30",
    title: "Análise de Latido",
    detail: "IA detectou padrão de ansiedade leve entre 14h-16h. Tradução: \"O meu humano saiu e eu não concordei com esta decisão!\"",
    emotion: "Ansiedade leve (45% alerta, 30% solidão)",
    ai_tip: "Tente deixar um brinquedo interativo ou som ambiente quando sair.",
  },
  {
    id: "e6", type: "photo_analysis", date: "15 Mar 2026", time: "09:15",
    title: "Check-up Visual IA",
    detail: "Score: 92%. Pelo com leve ressecamento lombar. Olhos, pele e postura normais.",
    score: 92,
  },
  {
    id: "e7", type: "health", date: "12 Mar 2026", time: "11:00",
    title: "Consulta — Check-up Anual",
    detail: "Exames de sangue e urina. ALT levemente elevado (92 U/L, ref: 10-88). Repetir em 30 dias. Peso ideal. Dra. Carla Mendes, Clínica VetBem.",
    severity: "medium", source: "vet",
  },
  // Fevereiro 2026
  {
    id: "m202602", type: "month_summary", month: "Fevereiro 2026",
    summary: "Mês mais calmo. Rex descobriu o prazer de roer gravetos e fez amizade com o gato do vizinho. Uma leve dor de barriga no dia 8 mas passou rápido.",
    stats: { walks: 20, photos: 12, vet: 0, mood: "calm" },
  },
  {
    id: "e8", type: "diary", date: "28 Fev 2026", time: "18:30", mood: "ecstatic",
    tutor_input: "Aniversário do Rex! 3 anos! Fizemos bolinho pet e ele amou.",
    ai_diary: "HOJE EU FAÇO 3 ANOS! O meu humano fez um bolo SÓ PARA MIM. Cheirava a frango e banana — os meus dois sabores favoritos do universo inteiro. Comi tão rápido que o bolo nem entendeu o que aconteceu. Depois ganhei um brinquedo novo que faz SQUEAK. Fiz ele tocar 847 vezes. Melhor. Dia. Da. Minha. Vida. 🎂🎉",
    tags: ["Aniversário", "3 anos", "Bolo"],
    isSpecial: true,
  },
  {
    id: "e9", type: "capsule", date: "28 Fev 2026",
    title: "💌 Cápsula do Tempo Desbloqueada!",
    detail: "Mensagem gravada em 28/02/2025 pelo tutor: \"Rex, hoje você faz 2 anos. Quando fizer 3, quero que saiba que você mudou a minha vida. Te amo, companheiro.\"",
    locked: false, recordedDate: "28 Fev 2025",
  },
  {
    id: "e10", type: "diary", date: "14 Fev 2026", time: "12:00", mood: "happy",
    tutor_input: "Rex viu neve pela primeira vez na viagem a Campos do Jordão. Ficou completamente maluco.",
    ai_diary: "O chão estava BRANCO e FRIO e eu NÃO ENTENDI. Tentei comer. Tentei cavar. Tentei latir para ele. Nada funcionou — o chão branco continuava ali. Depois eu corri em círculos e o meu humano fez aquele barulho que ele faz quando está feliz. Descobri que se eu pular, a coisa branca sobe no ar. MÁGICO. ❄️",
    tags: ["Viagem", "Neve", "Campos do Jordão"],
    isSpecial: true,
  },
  {
    id: "e11", type: "health", date: "8 Fev 2026", time: "07:00",
    title: "Desconforto Gastrointestinal",
    detail: "Vômito matinal e fezes moles. Jejum de 12h e dieta branda por 48h. Resolução espontânea. Suspeita: comeu algo no passeio.",
    severity: "low", source: "tutor",
  },
  // Janeiro 2026
  {
    id: "m202601", type: "month_summary", month: "Janeiro 2026",
    summary: "Início de ano com muita energia! Vacinação V10 e Leishmaniose em dia. Rex aprendeu a dar a pata com a mão esquerda.",
    stats: { walks: 26, photos: 22, vet: 2, mood: "happy" },
  },
  {
    id: "e12", type: "milestone", date: "20 Jan 2026",
    title: "🎓 Novo Truque: Pata Esquerda!",
    detail: "Após 12 dias de treino, Rex aprendeu a dar a pata com a mão esquerda. IA registrou 95% de precisão nos últimos 3 dias.",
    badge: "Aprendiz Brilhante",
  },
  {
    id: "e13", type: "capsule", date: "01 Jun 2026",
    title: "🔒 Cápsula do Tempo Trancada",
    detail: "Uma mensagem será desbloqueada quando Rex completar a próxima vacinação em dia.",
    locked: true, unlockCondition: "Todas as vacinas em dia",
  },
  {
    id: "e14", type: "connection", date: "10 Jan 2026",
    title: "🐕 Novo amigo: Toby!",
    detail: "Rex e Toby (Border Collie do André) fizeram o primeiro playdate. Compatibilidade IA: 88%. Brincaram por 1h sem incidentes.",
    pet: "Toby", match: 88,
  },
  {
    id: "e15", type: "video_analysis", date: "5 Jan 2026", time: "15:00",
    title: "Análise de Vídeo IA",
    detail: "Locomoção normal (95%), energia acima da média (80º percentil), sem sinais de dor. Leve comportamento circular nos últimos 5s — monitorar.",
    scores: { locomotion: 95, energy: 80, calm: 70 },
  },
];

// ======================== EVENT CARDS ========================
const EventTypeConfig = {
  diary: { icon: "book", color: C.primary, label: "Diário IA", bg: C.primarySoft },
  health: { icon: "shield", color: C.coral, label: "Saúde", bg: C.coralSoft },
  milestone: { icon: "trophy", color: C.gold, label: "Conquista", bg: C.goldSoft },
  audio: { icon: "mic", color: C.rose, label: "Áudio IA", bg: C.roseSoft },
  photo_analysis: { icon: "camera", color: C.sage, label: "Foto IA", bg: C.sageSoft },
  video_analysis: { icon: "camera", color: C.sky, label: "Vídeo IA", bg: C.skySoft },
  capsule: { icon: "gift", color: C.plum, label: "Cápsula", bg: C.plumSoft },
  connection: { icon: "heart", color: C.teal, label: "Conexão", bg: C.tealSoft },
  month_summary: { icon: "calendar", color: C.inkDim, label: "Resumo", bg: C.bgDeep },
};

const Badge = ({ text, color, bg }) => (
  <span style={{
    background: bg || color + "14", color, fontSize: 10, fontWeight: 700,
    padding: "3px 9px", borderRadius: 12, letterSpacing: 0.3, fontFamily: fontSans,
  }}>{text}</span>
);

const MoodDot = ({ mood: m, size = 28 }) => {
  const md = moods[m];
  return md ? (
    <div style={{
      width: size, height: size, borderRadius: size, fontSize: size * 0.65,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: md.color + "15", border: `1.5px solid ${md.color}30`,
    }} title={md.label}>{md.emoji}</div>
  ) : null;
};

const ScoreMini = ({ value, color, label }) => (
  <div style={{ textAlign: "center" }}>
    <div style={{
      width: 40, height: 40, borderRadius: 12, background: color + "12",
      display: "flex", alignItems: "center", justifyContent: "center",
      margin: "0 auto 4px",
    }}>
      <span style={{ color, fontSize: 14, fontWeight: 800, fontFamily: fontSans }}>{value}</span>
    </div>
    <span style={{ color: C.inkDim, fontSize: 9, fontFamily: fontSans }}>{label}</span>
  </div>
);

// ======================== INDIVIDUAL CARDS ========================
const MonthSummaryCard = ({ e }) => (
  <div style={{
    background: `linear-gradient(135deg, ${C.bgDeep}, ${C.cream})`,
    borderRadius: 22, padding: "20px 22px", marginBottom: 8,
    border: `1px solid ${C.border}`, position: "relative", overflow: "hidden",
  }}>
    <div style={{ position: "absolute", top: -20, right: -10, opacity: 0.06, fontSize: 100 }}>📅</div>
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
      <Ico type="calendar" size={18} color={C.primary} />
      <span style={{ color: C.primary, fontSize: 18, fontWeight: 700, fontFamily: font, letterSpacing: -0.3 }}>{e.month}</span>
    </div>
    <p style={{ color: C.inkSec, fontSize: 14, lineHeight: 1.7, margin: "0 0 16px", fontFamily: font }}>{e.summary}</p>
    <div style={{ display: "flex", gap: 10 }}>
      {[
        { n: e.stats.walks, label: "Passeios", emoji: "🐾" },
        { n: e.stats.photos, label: "Fotos", emoji: "📸" },
        { n: e.stats.vet, label: "Vet", emoji: "🏥" },
        { n: moods[e.stats.mood]?.emoji, label: "Humor", emoji: "" },
      ].map((s, i) => (
        <div key={i} style={{
          flex: 1, background: C.cream, borderRadius: 14, padding: "10px 8px",
          textAlign: "center", border: `1px solid ${C.borderLight}`,
        }}>
          <span style={{ fontSize: 16 }}>{s.emoji}{s.n}</span>
          <p style={{ color: C.inkDim, fontSize: 9, margin: "3px 0 0", fontFamily: fontSans }}>{s.label}</p>
        </div>
      ))}
    </div>
  </div>
);

const DiaryCard = ({ e }) => (
  <div style={{
    background: C.card, borderRadius: 22, overflow: "hidden",
    border: `1px solid ${C.border}`, boxShadow: C.shadow,
  }}>
    {e.isSpecial && (
      <div style={{
        background: `linear-gradient(135deg, ${C.gold}15, ${C.primary}08)`,
        padding: "8px 20px", display: "flex", alignItems: "center", gap: 6,
        borderBottom: `1px solid ${C.goldWarm}`,
      }}>
        <Ico type="star" size={13} color={C.gold} />
        <span style={{ color: C.gold, fontSize: 11, fontWeight: 700, fontFamily: fontSans }}>Momento Especial</span>
      </div>
    )}
    <div style={{ padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <MoodDot mood={e.mood} size={30} />
          <div>
            <span style={{ color: C.ink, fontSize: 13, fontWeight: 700, fontFamily: fontSans }}>{e.date}</span>
            <span style={{ color: C.inkDim, fontSize: 11, marginLeft: 6 }}>{e.time}</span>
          </div>
        </div>
        <Badge text="Diário IA" color={C.primary} />
      </div>

      {/* Tutor input */}
      <div style={{
        background: C.bgDeep, borderRadius: 14, padding: "12px 16px", marginBottom: 14,
        borderLeft: `3px solid ${C.inkGhost}`,
      }}>
        <p style={{ color: C.inkDim, fontSize: 10, fontWeight: 700, margin: "0 0 4px", fontFamily: fontSans, textTransform: "uppercase", letterSpacing: 0.8 }}>
          O que o tutor escreveu
        </p>
        <p style={{ color: C.inkSec, fontSize: 13, lineHeight: 1.6, margin: 0, fontFamily: fontSans }}>{e.tutor_input}</p>
      </div>

      {/* AI Diary */}
      <div style={{
        background: `linear-gradient(145deg, ${C.primarySoft}, ${C.goldSoft})`,
        borderRadius: 16, padding: "16px 18px",
        border: `1px solid ${C.primary}12`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <Ico type="paw" size={15} color={C.primary} />
          <span style={{ color: C.primary, fontSize: 12, fontWeight: 700, fontFamily: fontSans }}>Rex narra</span>
          <Ico type="sparkle" size={13} color={C.gold} />
        </div>
        <p style={{
          color: C.ink, fontSize: 15, lineHeight: 1.8, margin: 0,
          fontFamily: fontHand, fontWeight: 400, letterSpacing: 0.2,
        }}>{e.ai_diary}</p>
      </div>

      {/* Tags */}
      {e.tags && (
        <div style={{ display: "flex", gap: 6, marginTop: 14, flexWrap: "wrap" }}>
          {e.tags.map(t => (
            <span key={t} style={{
              background: C.bgDeep, color: C.inkDim, fontSize: 11, fontWeight: 600,
              padding: "4px 10px", borderRadius: 10, fontFamily: fontSans,
            }}>#{t}</span>
          ))}
        </div>
      )}
    </div>
  </div>
);

const HealthCard = ({ e }) => {
  const sevColors = { low: C.sage, medium: C.gold, high: C.coral };
  const sevLabels = { low: "Baixa", medium: "Média", high: "Alta" };
  const sourceLabels = { vet: "Veterinário", ai_photo: "IA · Foto", ai_audio: "IA · Áudio", tutor: "Relato do tutor" };
  return (
    <div style={{
      background: C.card, borderRadius: 20, padding: "16px 20px",
      border: `1px solid ${C.border}`, borderLeft: `3px solid ${sevColors[e.severity] || C.sage}`,
      boxShadow: C.shadow,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: C.coralSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Ico type="shield" size={17} color={C.coral} />
          </div>
          <div>
            <span style={{ color: C.ink, fontSize: 13, fontWeight: 700, fontFamily: fontSans }}>{e.date}</span>
            {e.time && <span style={{ color: C.inkDim, fontSize: 11, marginLeft: 6 }}>{e.time}</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <Badge text={sevLabels[e.severity]} color={sevColors[e.severity]} />
          {e.source && <Badge text={sourceLabels[e.source]} color={C.sky} />}
        </div>
      </div>
      <p style={{ color: C.ink, fontSize: 15, fontWeight: 700, margin: "0 0 6px", fontFamily: font }}>{e.title}</p>
      <p style={{ color: C.inkSec, fontSize: 13, lineHeight: 1.7, margin: 0, fontFamily: fontSans }}>{e.detail}</p>
    </div>
  );
};

const MilestoneCard = ({ e }) => (
  <div style={{
    background: `linear-gradient(135deg, ${C.goldSoft}, ${C.cream})`,
    borderRadius: 20, padding: "18px 20px", border: `1px solid ${C.gold}20`,
    boxShadow: C.shadow, textAlign: "center",
  }}>
    <p style={{ fontSize: 20, margin: "0 0 6px" }}>{e.title}</p>
    <p style={{ color: C.inkSec, fontSize: 13, lineHeight: 1.6, margin: "0 0 10px", fontFamily: fontSans }}>{e.detail}</p>
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: C.goldWarm, color: C.gold, fontFamily: fontSans,
      fontSize: 12, fontWeight: 700, padding: "6px 16px", borderRadius: 20,
    }}>
      <Ico type="trophy" size={14} color={C.gold} /> {e.badge}
    </span>
    <p style={{ color: C.inkDim, fontSize: 11, margin: "10px 0 0", fontFamily: fontSans }}>{e.date}</p>
  </div>
);

const AudioCard = ({ e }) => (
  <div style={{
    background: C.card, borderRadius: 20, padding: "16px 20px",
    border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.rose}`,
    boxShadow: C.shadow,
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: C.roseSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Ico type="mic" size={17} color={C.rose} />
      </div>
      <div style={{ flex: 1 }}>
        <span style={{ color: C.ink, fontSize: 13, fontWeight: 700, fontFamily: fontSans }}>{e.title}</span>
        <p style={{ color: C.inkDim, fontSize: 11, margin: "1px 0 0" }}>{e.date} · {e.time}</p>
      </div>
      <Badge text="Áudio IA" color={C.rose} />
    </div>
    <p style={{ color: C.inkSec, fontSize: 13, lineHeight: 1.6, margin: "0 0 10px", fontFamily: fontSans }}>{e.detail}</p>
    <div style={{
      background: C.roseSoft, borderRadius: 12, padding: "10px 14px",
      border: `1px solid ${C.rose}12`,
    }}>
      <p style={{ color: C.rose, fontSize: 11, fontWeight: 700, margin: "0 0 3px", fontFamily: fontSans }}>Emoção detectada</p>
      <p style={{ color: C.inkSec, fontSize: 12, margin: 0, fontFamily: fontSans }}>{e.emotion}</p>
    </div>
    {e.ai_tip && (
      <div style={{
        background: C.sageSoft, borderRadius: 12, padding: "10px 14px", marginTop: 8,
        border: `1px solid ${C.sage}12`,
      }}>
        <p style={{ color: C.sage, fontSize: 11, fontWeight: 700, margin: "0 0 3px", fontFamily: fontSans }}>💡 Dica da IA</p>
        <p style={{ color: C.inkSec, fontSize: 12, margin: 0, fontFamily: fontSans }}>{e.ai_tip}</p>
      </div>
    )}
  </div>
);

const AnalysisCard = ({ e, isVideo }) => (
  <div style={{
    background: C.card, borderRadius: 20, padding: "16px 20px",
    border: `1px solid ${C.border}`, borderLeft: `3px solid ${isVideo ? C.sky : C.sage}`,
    boxShadow: C.shadow,
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: isVideo ? C.skySoft : C.sageSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Ico type="camera" size={17} color={isVideo ? C.sky : C.sage} />
      </div>
      <div style={{ flex: 1 }}>
        <span style={{ color: C.ink, fontSize: 13, fontWeight: 700, fontFamily: fontSans }}>{e.title}</span>
        <p style={{ color: C.inkDim, fontSize: 11, margin: "1px 0 0" }}>{e.date} · {e.time}</p>
      </div>
      <Badge text={isVideo ? "Vídeo IA" : "Foto IA"} color={isVideo ? C.sky : C.sage} />
    </div>
    <p style={{ color: C.inkSec, fontSize: 13, lineHeight: 1.6, margin: "0 0 12px", fontFamily: fontSans }}>{e.detail}</p>
    {e.score && (
      <div style={{ display: "flex", alignItems: "center", gap: 10, background: C.sageSoft, borderRadius: 12, padding: "10px 14px" }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: C.sage + "20", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: C.sage, fontSize: 16, fontWeight: 800, fontFamily: fontSans }}>{e.score}</span>
        </div>
        <span style={{ color: C.sage, fontSize: 13, fontWeight: 600, fontFamily: fontSans }}>Score de Saúde Visual</span>
      </div>
    )}
    {e.scores && (
      <div style={{ display: "flex", justifyContent: "center", gap: 18, background: C.skySoft, borderRadius: 12, padding: "12px" }}>
        <ScoreMini value={`${e.scores.locomotion}%`} color={C.sage} label="Locomoção" />
        <ScoreMini value={`${e.scores.energy}%`} color={C.sky} label="Energia" />
        <ScoreMini value={`${e.scores.calm}%`} color={C.gold} label="Calma" />
      </div>
    )}
  </div>
);

const CapsuleCard = ({ e }) => (
  <div style={{
    background: e.locked
      ? `linear-gradient(135deg, ${C.plumSoft}, ${C.bgDeep})`
      : `linear-gradient(135deg, ${C.plumSoft}, ${C.goldSoft})`,
    borderRadius: 22, padding: "20px", border: `1px solid ${C.plum}18`,
    boxShadow: C.shadow, textAlign: "center", position: "relative",
  }}>
    <div style={{ fontSize: 36, marginBottom: 10 }}>{e.locked ? "🔒" : "💌"}</div>
    <p style={{ color: C.plum, fontSize: 16, fontWeight: 700, margin: "0 0 8px", fontFamily: font }}>{e.title}</p>
    {e.locked ? (
      <>
        <p style={{ color: C.inkDim, fontSize: 13, lineHeight: 1.6, margin: "0 0 12px", fontFamily: fontSans }}>{e.detail}</p>
        <div style={{ background: C.plum + "12", borderRadius: 12, padding: "10px", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Ico type="lock" size={14} color={C.plum} />
          <span style={{ color: C.plum, fontSize: 11, fontWeight: 700, fontFamily: fontSans }}>Condição: {e.unlockCondition}</span>
        </div>
      </>
    ) : (
      <>
        <div style={{
          background: C.cream, borderRadius: 16, padding: "16px", margin: "0 0 12px",
          border: `1px solid ${C.gold}20`,
        }}>
          <p style={{ color: C.ink, fontSize: 15, lineHeight: 1.8, margin: 0, fontFamily: fontHand, fontStyle: "italic" }}>
            {e.detail.replace("Mensagem gravada em 28/02/2025 pelo tutor: ", "").replace(/"/g, "")}
          </p>
        </div>
        <p style={{ color: C.inkDim, fontSize: 11, margin: 0, fontFamily: fontSans }}>
          Gravada em {e.recordedDate} · Desbloqueada em {e.date}
        </p>
      </>
    )}
  </div>
);

const ConnectionCard = ({ e }) => (
  <div style={{
    background: C.card, borderRadius: 20, padding: "16px 20px",
    border: `1px solid ${C.border}`, boxShadow: C.shadow,
    display: "flex", alignItems: "center", gap: 14,
  }}>
    <div style={{
      width: 50, height: 50, borderRadius: 16, background: C.tealSoft,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 26, border: `2px solid ${C.teal}30`,
    }}>🐕‍🦺</div>
    <div style={{ flex: 1 }}>
      <p style={{ color: C.ink, fontSize: 14, fontWeight: 700, margin: "0 0 3px", fontFamily: fontSans }}>{e.title}</p>
      <p style={{ color: C.inkDim, fontSize: 12, margin: "0 0 6px", fontFamily: fontSans }}>{e.detail}</p>
      <div style={{ display: "flex", gap: 6 }}>
        <Badge text={`${e.match}% match`} color={C.teal} />
        <Badge text={e.date} color={C.inkDim} />
      </div>
    </div>
  </div>
);

// ======================== NEW ENTRY MODAL ========================
const NewEntryModal = ({ onClose }) => {
  const [text, setText] = useState("");
  const [mood, setMood] = useState("happy");
  const [preview, setPreview] = useState(null);

  const generatePreview = () => {
    const previews = {
      "": "Escreva algo sobre o dia do Rex para a IA narrar...",
      default: `Hoje foi um dia interessante! O meu humano escreveu algo sobre mim e eu me senti muito especial. Acho que ele gosta de mim — na verdade, tenho certeza. Dei a patinha em troca, que é a minha forma de dizer "eu também te amo". 🐾`,
    };
    setPreview(text ? previews.default : null);
  };

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 50,
      background: "rgba(42,31,20,0.45)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}>
      <div style={{
        background: C.bg, borderRadius: "28px 28px 0 0", width: "100%",
        maxHeight: "85%", overflow: "auto", padding: "8px 22px 30px",
        boxShadow: "0 -10px 40px rgba(42,31,20,0.15)",
      }}>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 16px" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: C.inkGhost }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h3 style={{ color: C.ink, fontSize: 20, fontWeight: 700, margin: 0, fontFamily: font }}>Nova Entrada no Diário</h3>
          <button onClick={onClose} style={{ background: C.bgDeep, border: "none", borderRadius: 10, width: 34, height: 34, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Ico type="x" size={18} color={C.inkSec} />
          </button>
        </div>

        {/* Date */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18, background: C.bgDeep, borderRadius: 12, padding: "10px 14px" }}>
          <Ico type="calendar" size={16} color={C.inkDim} />
          <span style={{ color: C.ink, fontSize: 13, fontWeight: 600, fontFamily: fontSans }}>26 de Março, 2026 · 16:45</span>
        </div>

        {/* Mood selector */}
        <p style={{ color: C.inkDim, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 10px", fontFamily: fontSans }}>
          Como o Rex está hoje?
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {Object.entries(moods).map(([key, m]) => (
            <button key={key} onClick={() => setMood(key)} style={{
              flex: 1, padding: "10px 4px", borderRadius: 14, cursor: "pointer",
              background: mood === key ? m.color + "18" : C.cream,
              border: mood === key ? `2px solid ${m.color}40` : `1px solid ${C.borderLight}`,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              transition: "all 0.2s",
            }}>
              <span style={{ fontSize: 22 }}>{m.emoji}</span>
              <span style={{ fontSize: 9, fontWeight: 600, color: mood === key ? m.color : C.inkDim, fontFamily: fontSans }}>{m.label}</span>
            </button>
          ))}
        </div>

        {/* Text input */}
        <p style={{ color: C.inkDim, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 10px", fontFamily: fontSans }}>
          O que aconteceu hoje?
        </p>
        <textarea
          value={text} onChange={e => { setText(e.target.value); setPreview(null); }}
          placeholder="Ex: Hoje o Rex foi ao parque, brincou com a Nina e tomou banho..."
          style={{
            width: "100%", minHeight: 90, padding: "14px 16px", borderRadius: 16,
            border: `1px solid ${C.border}`, background: C.cream, resize: "vertical",
            fontFamily: fontSans, fontSize: 14, color: C.ink, lineHeight: 1.6,
            outline: "none", boxSizing: "border-box",
          }}
        />

        {/* Attachments */}
        <div style={{ display: "flex", gap: 8, margin: "14px 0 18px" }}>
          {[
            { icon: "camera", label: "Foto" },
            { icon: "mic", label: "Áudio" },
            { icon: "camera", label: "Vídeo" },
          ].map((a, i) => (
            <button key={i} style={{
              flex: 1, padding: "10px", borderRadius: 12, cursor: "pointer",
              background: C.cream, border: `1px solid ${C.borderLight}`,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              fontFamily: fontSans, fontSize: 12, fontWeight: 600, color: C.inkSec,
            }}>
              <Ico type={a.icon} size={16} color={C.inkDim} /> {a.label}
            </button>
          ))}
        </div>

        {/* Tags */}
        <p style={{ color: C.inkDim, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 10px", fontFamily: fontSans }}>
          Tags
        </p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
          {["Parque", "Casa", "Viagem", "Brincadeira", "Banho", "Passeio", "Veterinário", "Amigos"].map(t => (
            <button key={t} style={{
              padding: "6px 14px", borderRadius: 10, cursor: "pointer",
              background: C.cream, border: `1px solid ${C.borderLight}`,
              fontFamily: fontSans, fontSize: 12, color: C.inkSec, fontWeight: 500,
            }}>#{t}</button>
          ))}
        </div>

        {/* Generate AI button */}
        <button onClick={generatePreview} style={{
          width: "100%", padding: "14px", borderRadius: 16, cursor: "pointer",
          background: text ? `linear-gradient(135deg, ${C.primary}, ${C.gold})` : C.bgDeep,
          border: "none", color: text ? "#fff" : C.inkDim,
          fontSize: 14, fontWeight: 700, fontFamily: fontSans,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          opacity: text ? 1 : 0.6, transition: "all 0.3s",
        }}>
          <Ico type="sparkle" size={18} color={text ? "#fff" : C.inkDim} />
          Gerar Narração do Rex com IA
        </button>

        {/* AI Preview */}
        {preview && (
          <div style={{
            background: `linear-gradient(145deg, ${C.primarySoft}, ${C.goldSoft})`,
            borderRadius: 18, padding: "18px 20px", marginTop: 16,
            border: `1px solid ${C.primary}15`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <Ico type="paw" size={15} color={C.primary} />
              <span style={{ color: C.primary, fontSize: 12, fontWeight: 700, fontFamily: fontSans }}>Preview — Rex narra</span>
            </div>
            <p style={{
              color: C.ink, fontSize: 16, lineHeight: 1.8, margin: "0 0 14px",
              fontFamily: fontHand,
            }}>{preview}</p>
            <button onClick={onClose} style={{
              width: "100%", padding: "13px", borderRadius: 14, cursor: "pointer",
              background: C.sage, border: "none", color: "#fff",
              fontSize: 14, fontWeight: 700, fontFamily: fontSans,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              <Ico type="send" size={16} color="#fff" /> Publicar no Diário
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ======================== MAIN APP ========================
export default function DiarioVidaPet() {
  const [filter, setFilter] = useState("all");
  const [showNew, setShowNew] = useState(false);
  const [showGraph, setShowGraph] = useState(true);
  const containerRef = useRef();

  const filters = [
    { id: "all", label: "Tudo", icon: "book" },
    { id: "diary", label: "Diário", icon: "edit" },
    { id: "health", label: "Saúde", icon: "shield" },
    { id: "analysis", label: "IA", icon: "sparkle" },
    { id: "milestone", label: "Marcos", icon: "trophy" },
    { id: "capsule", label: "Cápsulas", icon: "gift" },
  ];

  const happinessData = [
    { label: "Out", score: 70, emoji: "😌", moodColor: C.sky },
    { label: "Nov", score: 40, emoji: "😰", moodColor: C.coral },
    { label: "Dez", score: 75, emoji: "😊", moodColor: C.sage },
    { label: "Jan", score: 85, emoji: "😊", moodColor: C.sage },
    { label: "Fev", score: 95, emoji: "🤩", moodColor: "#E8A840" },
    { label: "Mar", score: 80, emoji: "😊", moodColor: C.sage },
  ];

  const filtered = timelineData.filter(e => {
    if (filter === "all") return true;
    if (filter === "diary") return e.type === "diary";
    if (filter === "health") return e.type === "health";
    if (filter === "analysis") return ["audio", "photo_analysis", "video_analysis"].includes(e.type);
    if (filter === "milestone") return e.type === "milestone" || e.type === "connection";
    if (filter === "capsule") return e.type === "capsule";
    return true;
  });

  const renderEvent = (e) => {
    switch (e.type) {
      case "month_summary": return <MonthSummaryCard e={e} />;
      case "diary": return <DiaryCard e={e} />;
      case "health": return <HealthCard e={e} />;
      case "milestone": return <MilestoneCard e={e} />;
      case "audio": return <AudioCard e={e} />;
      case "photo_analysis": return <AnalysisCard e={e} isVideo={false} />;
      case "video_analysis": return <AnalysisCard e={e} isVideo={true} />;
      case "capsule": return <CapsuleCard e={e} />;
      case "connection": return <ConnectionCard e={e} />;
      default: return null;
    }
  };

  return (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center",
      minHeight: "100vh", padding: 20,
      background: `linear-gradient(170deg, #F0E8DB 0%, #E6DDD0 50%, #DDD4C5 100%)`,
      fontFamily: fontSans,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=DM+Sans:wght@400;500;600;700&family=Caveat:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div ref={containerRef} style={{
        width: 400, maxHeight: 820, background: C.bg, borderRadius: 40,
        overflow: "auto", position: "relative",
        boxShadow: `0 20px 80px rgba(42,31,20,0.15), 0 0 0 1px ${C.border}`,
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
            <h1 style={{ color: C.ink, fontSize: 21, margin: 0, fontWeight: 700, fontFamily: font, letterSpacing: -0.3 }}>Diário de Vida</h1>
            <p style={{ color: C.inkDim, fontSize: 12, margin: "1px 0 0" }}>Rex · 127 memórias · desde Mar 2023</p>
          </div>
          <div style={{
            width: 48, height: 48, borderRadius: 16, background: C.primarySoft,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 26, border: `2px solid ${C.primary}30`,
          }}>🐕</div>
        </div>

        {/* AI Personality Insight */}
        <div style={{
          margin: "14px 20px 0", padding: "14px 18px",
          background: `linear-gradient(135deg, ${C.primaryGlow}, ${C.goldSoft})`,
          borderRadius: 18, border: `1px solid ${C.primary}12`,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 14, background: C.cream,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: `1px solid ${C.primary}15`,
          }}>
            <Ico type="sparkle" size={20} color={C.primary} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ color: C.primary, fontSize: 11, fontWeight: 700, margin: "0 0 3px", letterSpacing: 0.5 }}>PERSONALIDADE IA</p>
            <p style={{ color: C.ink, fontSize: 13, lineHeight: 1.5, margin: 0, fontFamily: font }}>
              Rex é <b>brincalhão</b>, <b>curioso</b> e levemente <b>ansioso</b> quando sozinho. Adora rotina e pessoas novas.
            </p>
          </div>
        </div>

        {/* Happiness Graph Toggle */}
        <div style={{ padding: "18px 20px 0" }}>
          <button onClick={() => setShowGraph(!showGraph)} style={{
            display: "flex", alignItems: "center", gap: 8, background: "none",
            border: "none", cursor: "pointer", padding: 0, marginBottom: 10,
          }}>
            <Ico type="heart" size={16} color={C.primary} />
            <span style={{ color: C.ink, fontSize: 13, fontWeight: 700, fontFamily: font }}>Gráfico de Felicidade</span>
            <span style={{ color: C.inkDim, fontSize: 11, transform: showGraph ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▶</span>
          </button>

          {showGraph && (
            <div style={{
              background: C.card, borderRadius: 22, padding: "16px 10px 6px",
              border: `1px solid ${C.border}`, boxShadow: C.shadow, marginBottom: 4,
            }}>
              <HappinessChart data={happinessData} height={110} />
              <p style={{ color: C.inkDim, fontSize: 10, textAlign: "center", margin: "6px 0 2px" }}>
                Baseado em humor diário, análises de IA e eventos de saúde
              </p>
            </div>
          )}
        </div>

        {/* Filters */}
        <div style={{
          position: "sticky", top: 28, zIndex: 15,
          padding: "14px 20px 10px",
          background: `linear-gradient(to bottom, ${C.bg}, ${C.bg}F5, ${C.bg}00)`,
        }}>
          <div style={{ display: "flex", gap: 6, overflow: "auto", paddingBottom: 2 }}>
            {filters.map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)} style={{
                display: "flex", alignItems: "center", gap: 5, padding: "8px 14px",
                borderRadius: 12, cursor: "pointer", whiteSpace: "nowrap",
                background: filter === f.id ? C.primary : C.card,
                border: filter === f.id ? "none" : `1px solid ${C.border}`,
                color: filter === f.id ? "#fff" : C.inkSec,
                fontSize: 12, fontWeight: 700, fontFamily: fontSans,
                transition: "all 0.2s",
              }}>
                <Ico type={f.icon} size={14} color={filter === f.id ? "#fff" : C.inkDim} />
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div style={{ padding: "4px 20px 100px", position: "relative" }}>
          {/* Timeline line */}
          <div style={{
            position: "absolute", left: 28, top: 20, bottom: 100,
            width: 2, background: `linear-gradient(to bottom, ${C.primary}30, ${C.border}, transparent)`,
          }} />

          {filtered.map((e, i) => {
            const conf = EventTypeConfig[e.type] || {};
            const isMonth = e.type === "month_summary";
            return (
              <div key={e.id} style={{ position: "relative", marginBottom: 18, paddingLeft: isMonth ? 0 : 30 }}>
                {/* Timeline dot */}
                {!isMonth && (
                  <div style={{
                    position: "absolute", left: 0, top: 8,
                    width: 18, height: 18, borderRadius: 9,
                    background: C.bg, border: `2.5px solid ${conf.color || C.inkDim}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    zIndex: 2,
                  }}>
                    <div style={{ width: 7, height: 7, borderRadius: 4, background: conf.color || C.inkDim }} />
                  </div>
                )}
                {renderEvent(e)}
              </div>
            );
          })}

          {/* End of timeline */}
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <Ico type="paw" size={24} color={C.inkGhost} />
            <p style={{ color: C.inkGhost, fontSize: 13, margin: "8px 0 0", fontFamily: font, fontStyle: "italic" }}>
              A história do Rex continua sendo escrita...
            </p>
          </div>
        </div>

        {/* FAB - New Entry */}
        <button onClick={() => setShowNew(true)} style={{
          position: "sticky", bottom: 24, float: "right", marginRight: 20,
          width: 56, height: 56, borderRadius: 18, cursor: "pointer",
          background: `linear-gradient(135deg, ${C.primary}, ${C.gold})`,
          border: "none", display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 8px 24px ${C.primary}40`, zIndex: 10,
        }}>
          <Ico type="edit" size={24} color="#fff" />
        </button>

        {/* New Entry Modal */}
        {showNew && <NewEntryModal onClose={() => setShowNew(false)} />}

        <style>{`::-webkit-scrollbar{width:0;height:0}`}</style>
      </div>
    </div>
  );
}
