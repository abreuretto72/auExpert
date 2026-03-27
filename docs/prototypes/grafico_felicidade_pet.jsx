import { useState, useRef } from "react";

// ======================== DESIGN TOKENS ========================
const C = {
  bg: "#0F1923", bgCard: "#162231", bgDeep: "#0B1219",
  card: "#1A2B3D", cardHover: "#1E3145", cardGlow: "#1F3448",
  glow: "#2A4A6B",
  joy: "#FFD166", joySoft: "#FFD16615", joyMed: "#FFD16630",
  happy: "#06D6A0", happySoft: "#06D6A012", happyMed: "#06D6A025",
  calm: "#118AB2", calmSoft: "#118AB212", calmMed: "#118AB225",
  tired: "#8338EC", tiredSoft: "#8338EC12",
  anxious: "#EF476F", anxiousSoft: "#EF476F12", anxiousMed: "#EF476F25",
  sad: "#7B8794", sadSoft: "#7B879412",
  accent: "#06D6A0",
  text: "#E8EDF2", textSec: "#8FA3B8", textDim: "#4E6378", textGhost: "#2E4254",
  border: "#1E3248", borderLight: "#243A50",
  shadow: "0 4px 24px rgba(0,0,0,0.3)",
};
const font = "'Sora', -apple-system, sans-serif";
const fontMono = "'JetBrains Mono', monospace";

const moods = {
  ecstatic: { emoji: "🤩", label: "Eufórico", color: C.joy, score: 100 },
  happy: { emoji: "😊", label: "Feliz", color: C.happy, score: 80 },
  calm: { emoji: "😌", label: "Calmo", color: C.calm, score: 60 },
  tired: { emoji: "😴", label: "Cansado", color: C.tired, score: 40 },
  anxious: { emoji: "😰", label: "Ansioso", color: C.anxious, score: 25 },
  sad: { emoji: "😢", label: "Triste", color: C.sad, score: 10 },
};

// ======================== ICONS ========================
const Ico = ({ type, size = 20, color = C.textDim }) => {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" };
  const icons = {
    back: <svg {...p}><polyline points="15,18 9,12 15,6"/></svg>,
    share: <svg {...p}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
    sparkle: <svg {...p} strokeWidth="1.5"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/></svg>,
    sun: <svg {...p}><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>,
    trending: <svg {...p}><polyline points="23,6 13.5,15.5 8.5,10.5 1,18"/><polyline points="17,6 23,6 23,12"/></svg>,
    trendDown: <svg {...p}><polyline points="23,18 13.5,8.5 8.5,13.5 1,6"/><polyline points="17,18 23,18 23,12"/></svg>,
    heart: <svg {...p}><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
    activity: <svg {...p}><polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/></svg>,
    camera: <svg {...p}><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>,
    mic: <svg {...p}><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/></svg>,
    video: <svg {...p}><rect x="2" y="4" width="15" height="16" rx="2"/><path d="M17 9l5-3v12l-5-3"/></svg>,
    edit: <svg {...p}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    calendar: <svg {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    paw: <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><ellipse cx="12" cy="17" rx="4.5" ry="4"/><circle cx="7" cy="10.5" r="2.2"/><circle cx="17" cy="10.5" r="2.2"/><circle cx="9.5" cy="6.5" r="1.8"/><circle cx="14.5" cy="6.5" r="1.8"/></svg>,
    zap: <svg {...p}><polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/></svg>,
    moon: <svg {...p}><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>,
    cloud: <svg {...p}><path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/></svg>,
    info: <svg {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  };
  return icons[type] || null;
};

// ======================== MAIN HAPPINESS CURVE ========================
const HappinessCurve = ({ data, height = 180, period }) => {
  const w = 340, padX = 12, padY = 16;
  const max = 100, min = 0;
  const chartH = height - padY * 2 - 10;
  const chartW = w - padX * 2;

  const pts = data.map((d, i) => ({
    x: padX + (i / (data.length - 1)) * chartW,
    y: padY + chartH - ((d.score - min) / (max - min)) * chartH,
    ...d,
  }));

  // Smooth bezier
  const bezier = pts.map((p, i) => {
    if (i === 0) return `M${p.x},${p.y}`;
    const prev = pts[i - 1];
    const cpx = (prev.x + p.x) / 2;
    return `C${cpx},${prev.y} ${cpx},${p.y} ${p.x},${p.y}`;
  }).join(" ");

  const area = `${bezier} L${pts[pts.length-1].x},${height - padY} L${pts[0].x},${height - padY} Z`;

  // Zone bands
  const zones = [
    { y1: 0, y2: 20, color: C.joy, label: "Eufórico" },
    { y1: 20, y2: 40, color: C.happy, label: "Feliz" },
    { y1: 40, y2: 60, color: C.calm, label: "Calmo" },
    { y1: 60, y2: 80, color: C.tired, label: "Cansado" },
    { y1: 80, y2: 100, color: C.anxious, label: "Triste" },
  ];

  return (
    <svg viewBox={`0 0 ${w} ${height + 20}`} style={{ width: "100%", display: "block" }}>
      <defs>
        <linearGradient id="curveGrad" x1="0" y1="0" x2="1" y2="0">
          {pts.map((p, i) => (
            <stop key={i} offset={`${(i / (pts.length - 1)) * 100}%`} stopColor={p.moodColor} />
          ))}
        </linearGradient>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.happy} stopOpacity="0.2" />
          <stop offset="50%" stopColor={C.calm} stopOpacity="0.06" />
          <stop offset="100%" stopColor={C.bgDeep} stopOpacity="0" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" />
        </filter>
      </defs>

      {/* Zone lines */}
      {[20, 40, 60, 80].map((pct, i) => {
        const y = padY + chartH - (pct / 100) * chartH;
        return <line key={i} x1={padX} y1={y} x2={w - padX} y2={y} stroke={C.border} strokeWidth="0.5" />;
      })}

      {/* Zone labels */}
      {[
        { pct: 90, label: "🤩", col: C.joy },
        { pct: 70, label: "😊", col: C.happy },
        { pct: 50, label: "😌", col: C.calm },
        { pct: 30, label: "😴", col: C.tired },
        { pct: 10, label: "😢", col: C.sad },
      ].map((z, i) => {
        const y = padY + chartH - (z.pct / 100) * chartH;
        return <text key={i} x={w - 4} y={y + 5} textAnchor="end" fontSize="11">{z.label}</text>;
      })}

      {/* Area fill */}
      <path d={area} fill="url(#areaGrad)" />

      {/* Glow line */}
      <path d={bezier} fill="none" stroke="url(#curveGrad)" strokeWidth="4" strokeLinecap="round" opacity="0.3" filter="url(#glow)" />

      {/* Main line */}
      <path d={bezier} fill="none" stroke="url(#curveGrad)" strokeWidth="2.5" strokeLinecap="round" />

      {/* Dots */}
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="6" fill={C.bgCard} stroke={p.moodColor} strokeWidth="2.5" />
          <circle cx={p.x} cy={p.y} r="2.5" fill={p.moodColor} />
          {p.event && (
            <>
              <line x1={p.x} y1={p.y + 8} x2={p.x} y2={height - padY} stroke={p.moodColor} strokeWidth="0.5" strokeDasharray="2,3" opacity="0.4" />
              <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize="13">{p.eventEmoji}</text>
            </>
          )}
          <text x={p.x} y={height + 14} textAnchor="middle" fontSize="9" fill={C.textDim} fontFamily={font} fontWeight="600">
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
};

// ======================== MOOD DONUT ========================
const MoodDonut = ({ data, size = 130 }) => {
  const cx = size / 2, cy = size / 2, r = (size - 20) / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      {data.map((d, i) => {
        const dash = (d.pct / 100) * circ;
        const gap = circ - dash;
        const seg = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={d.color} strokeWidth="12" strokeLinecap="round"
            strokeDasharray={`${dash - 2} ${gap + 2}`}
            strokeDashoffset={-offset}
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        );
        offset += dash;
        return seg;
      })}
      <circle cx={cx} cy={cy} r={r - 14} fill={C.bgCard} />
    </svg>
  );
};

// ======================== MINI SPARKLINE ========================
const Sparkline = ({ data, color, w = 80, h = 28 }) => {
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - 2 - ((v - min) / range) * (h - 4),
  }));
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
};

// ======================== HEATMAP CALENDAR ========================
const MoodCalendar = ({ month, data }) => {
  const days = ["S", "T", "Q", "Q", "S", "S", "D"];
  const startDay = 6; // March 2026 starts Saturday
  const cells = Array(startDay).fill(null).concat(data);
  const colorForScore = (s) => {
    if (s >= 85) return C.joy;
    if (s >= 70) return C.happy;
    if (s >= 55) return C.calm;
    if (s >= 35) return C.tired;
    if (s >= 15) return C.anxious;
    return C.sad;
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 6 }}>
        {days.map((d, i) => (
          <div key={i} style={{ textAlign: "center", color: C.textDim, fontSize: 9, fontWeight: 700, fontFamily: font, padding: "2px 0" }}>{d}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
        {cells.map((score, i) => (
          <div key={i} style={{
            aspectRatio: "1", borderRadius: 6,
            background: score !== null ? colorForScore(score) + "35" : "transparent",
            border: score !== null ? `1px solid ${colorForScore(score)}25` : "none",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 9, fontWeight: 600, color: score !== null ? colorForScore(score) : "transparent",
            fontFamily: fontMono,
          }}>
            {score !== null ? (i - startDay + 1) : ""}
          </div>
        ))}
      </div>
    </div>
  );
};

// ======================== MAIN APP ========================
export default function GraficoFelicidade() {
  const [period, setPeriod] = useState("6m");
  const [selectedMood, setSelectedMood] = useState(null);
  const containerRef = useRef();

  const periods = [
    { id: "1m", label: "1 Mês" },
    { id: "3m", label: "3 Meses" },
    { id: "6m", label: "6 Meses" },
    { id: "1y", label: "1 Ano" },
    { id: "all", label: "Tudo" },
  ];

  const curveData6m = [
    { label: "Out", score: 68, moodColor: C.calm, mood: "calm" },
    { label: "Nov", score: 32, moodColor: C.anxious, mood: "anxious", event: true, eventEmoji: "🏥" },
    { label: "Dez", score: 72, moodColor: C.happy, mood: "happy" },
    { label: "Jan", score: 82, moodColor: C.happy, mood: "happy", event: true, eventEmoji: "🎓" },
    { label: "Fev", score: 95, moodColor: C.joy, mood: "ecstatic", event: true, eventEmoji: "🎂" },
    { label: "Mar", score: 78, moodColor: C.happy, mood: "happy" },
  ];

  const curveData1y = [
    { label: "Abr", score: 60, moodColor: C.calm, mood: "calm" },
    { label: "Mai", score: 75, moodColor: C.happy, mood: "happy" },
    { label: "Jun", score: 70, moodColor: C.happy, mood: "happy" },
    { label: "Jul", score: 65, moodColor: C.calm, mood: "calm" },
    { label: "Ago", score: 55, moodColor: C.calm, mood: "calm" },
    { label: "Set", score: 72, moodColor: C.happy, mood: "happy" },
    ...curveData6m,
  ];

  const curveData = period === "1y" || period === "all" ? curveData1y : curveData6m;

  const moodDistribution = [
    { mood: "happy", pct: 38, color: C.happy, label: "Feliz", emoji: "😊", days: 44 },
    { mood: "calm", pct: 25, color: C.calm, label: "Calmo", emoji: "😌", days: 29 },
    { mood: "ecstatic", pct: 15, color: C.joy, label: "Eufórico", emoji: "🤩", days: 17 },
    { mood: "tired", pct: 12, color: C.tired, label: "Cansado", emoji: "😴", days: 14 },
    { mood: "anxious", pct: 7, color: C.anxious, label: "Ansioso", emoji: "😰", days: 8 },
    { mood: "sad", pct: 3, color: C.sad, label: "Triste", emoji: "😢", days: 3 },
  ];

  const marchCalendar = [
    85, 78, 72, 80, 88, 70, 65,
    75, 82, 90, 68, 78, 74, 82,
    92, 85, 78, 70, 80, 88, 75,
    72, 80, 85, 78, 82, null, null,
    null, null, null,
  ];

  const factors = [
    { label: "Passeios longos", impact: 92, trend: "up", color: C.happy, sparkData: [60, 70, 65, 80, 85, 92] },
    { label: "Brincar com outros cães", impact: 88, trend: "up", color: C.joy, sparkData: [50, 60, 75, 80, 70, 88] },
    { label: "Rotina estável", impact: 85, trend: "up", color: C.calm, sparkData: [70, 72, 75, 80, 82, 85] },
    { label: "Presença do tutor", impact: 82, trend: "stable", color: C.happy, sparkData: [80, 78, 82, 80, 84, 82] },
    { label: "Ficar sozinho >4h", impact: -72, trend: "down", color: C.anxious, sparkData: [40, 35, 38, 30, 32, 28] },
    { label: "Barulhos fortes", impact: -65, trend: "down", color: C.anxious, sparkData: [45, 40, 35, 42, 30, 35] },
    { label: "Mudança de rotina", impact: -58, trend: "down", color: C.tired, sparkData: [55, 45, 50, 40, 48, 42] },
  ];

  const emotionalEvents = [
    { date: "28 Fev", emoji: "🎂", title: "Aniversário de 3 anos", score: 98, delta: "+23", mood: "ecstatic", desc: "Maior pico de felicidade registrado. Bolo, brinquedo novo e família reunida." },
    { date: "20 Jan", emoji: "🎓", title: "Aprendeu pata esquerda", score: 88, delta: "+12", mood: "happy", desc: "Conquista após 12 dias de treino. Alegria visível na análise de vídeo." },
    { date: "14 Fev", emoji: "❄️", title: "Primeira neve", score: 92, delta: "+18", mood: "ecstatic", desc: "Viagem a Campos do Jordão. Excitação extrema detectada por áudio e vídeo." },
    { date: "10 Nov", emoji: "🏥", title: "Reação alérgica", score: 28, delta: "-45", mood: "sad", desc: "Emergência veterinária. Menor score registrado. Recuperação em 7 dias." },
    { date: "18 Mar", emoji: "😰", title: "Ansiedade detectada", score: 42, delta: "-15", mood: "anxious", desc: "Latidos entre 14h-16h. IA detectou padrão de ansiedade de separação." },
  ];

  const breedComparison = {
    rex: { happiness: 76, energy: 82, calm: 58, social: 90 },
    breed: { happiness: 72, energy: 78, calm: 62, social: 85 },
  };

  const streaks = [
    { label: "Dias felizes seguidos", value: 12, best: 18, color: C.happy, emoji: "🔥" },
    { label: "Dias sem ansiedade", value: 8, best: 23, color: C.calm, emoji: "✨" },
    { label: "Semanas com score >70", value: 4, best: 6, color: C.joy, emoji: "⭐" },
  ];

  const sources = [
    { icon: "edit", label: "Diário do tutor", entries: 87, pct: 35, color: C.joy },
    { icon: "camera", label: "Análise de foto", entries: 52, pct: 25, color: C.happy },
    { icon: "mic", label: "Análise de áudio", entries: 38, pct: 20, color: C.anxious },
    { icon: "video", label: "Análise de vídeo", entries: 24, pct: 12, color: C.calm },
    { icon: "activity", label: "Eventos de saúde", entries: 14, pct: 8, color: C.tired },
  ];

  const currentScore = 78;
  const previousScore = 72;
  const delta = currentScore - previousScore;

  return (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center",
      minHeight: "100vh", padding: 20,
      background: `radial-gradient(ellipse at 30% 20%, #142636, ${C.bgDeep} 60%, #0A0F15)`,
      fontFamily: font,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div ref={containerRef} style={{
        width: 400, maxHeight: 820, background: C.bg, borderRadius: 40,
        overflow: "auto", position: "relative",
        boxShadow: `0 20px 80px rgba(0,0,0,0.5), 0 0 0 1px ${C.border}`,
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
            <h1 style={{ color: C.text, fontSize: 20, margin: 0, fontWeight: 700, letterSpacing: -0.5 }}>Gráfico de Felicidade</h1>
            <p style={{ color: C.textDim, fontSize: 12, margin: "2px 0 0" }}>Evolução emocional do Rex</p>
          </div>
          <button style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <Ico type="share" size={15} color={C.textSec} />
            <span style={{ color: C.textSec, fontSize: 11, fontWeight: 600 }}>Partilhar</span>
          </button>
        </div>

        {/* Current Score Hero */}
        <div style={{
          margin: "16px 20px 0", padding: "24px 22px",
          background: `linear-gradient(145deg, ${C.card}, ${C.cardGlow})`,
          borderRadius: 24, border: `1px solid ${C.border}`,
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: `radial-gradient(circle, ${C.happy}08, transparent 70%)` }} />
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ position: "relative" }}>
              <svg width="90" height="90" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="45" cy="45" r="38" fill="none" stroke={C.border} strokeWidth="6" />
                <circle cx="45" cy="45" r="38" fill="none" stroke={C.happy} strokeWidth="6"
                  strokeDasharray={`${2 * Math.PI * 38}`}
                  strokeDashoffset={`${2 * Math.PI * 38 * (1 - currentScore / 100)}`}
                  strokeLinecap="round" style={{ transition: "stroke-dashoffset 1.2s ease" }} />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: C.text, fontSize: 28, fontWeight: 800, fontFamily: fontMono }}>{currentScore}</span>
              </div>
            </div>
            <div>
              <p style={{ color: C.textSec, fontSize: 11, fontWeight: 600, letterSpacing: 0.5, margin: "0 0 4px" }}>SCORE ATUAL DE FELICIDADE</p>
              <p style={{ color: C.happy, fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>😊 Feliz</p>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 3, padding: "3px 10px",
                  borderRadius: 10, background: delta >= 0 ? C.happySoft : C.anxiousSoft,
                }}>
                  <Ico type={delta >= 0 ? "trending" : "trendDown"} size={13} color={delta >= 0 ? C.happy : C.anxious} />
                  <span style={{ color: delta >= 0 ? C.happy : C.anxious, fontSize: 12, fontWeight: 700, fontFamily: fontMono }}>
                    {delta >= 0 ? "+" : ""}{delta}
                  </span>
                </div>
                <span style={{ color: C.textDim, fontSize: 11 }}>vs mês anterior</span>
              </div>
            </div>
          </div>

          {/* AI summary */}
          <div style={{
            marginTop: 18, padding: "12px 14px", borderRadius: 14,
            background: `linear-gradient(135deg, ${C.happy}08, ${C.joy}05)`,
            border: `1px solid ${C.happy}12`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <Ico type="sparkle" size={14} color={C.happy} />
              <span style={{ color: C.happy, fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>INSIGHT DA IA</span>
            </div>
            <p style={{ color: C.textSec, fontSize: 13, lineHeight: 1.7, margin: 0 }}>
              Rex está <span style={{ color: C.happy, fontWeight: 600 }}>8% mais feliz</span> que no mês passado.
              Os passeios com a Nina e a rotina estável são os principais fatores positivos.
              Único ponto de atenção: ansiedade leve nas tardes sozinho.
            </p>
          </div>
        </div>

        {/* Period Selector */}
        <div style={{ padding: "18px 20px 0" }}>
          <div style={{ display: "flex", gap: 4, background: C.card, borderRadius: 14, padding: 3, border: `1px solid ${C.border}` }}>
            {periods.map(pr => (
              <button key={pr.id} onClick={() => setPeriod(pr.id)} style={{
                flex: 1, padding: "8px 4px", borderRadius: 11, cursor: "pointer",
                background: period === pr.id ? C.happy : "transparent",
                border: "none", color: period === pr.id ? C.bgDeep : C.textDim,
                fontSize: 11, fontWeight: 700, fontFamily: font, transition: "all 0.2s",
              }}>{pr.label}</button>
            ))}
          </div>
        </div>

        {/* Main Curve */}
        <div style={{
          margin: "16px 20px 0", padding: "18px 8px 6px",
          background: C.card, borderRadius: 22, border: `1px solid ${C.border}`,
          boxShadow: C.shadow,
        }}>
          <div style={{ padding: "0 12px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: C.text, fontSize: 14, fontWeight: 700 }}>Curva Emocional</span>
            <span style={{ color: C.textDim, fontSize: 10 }}>🏥 Eventos marcados na curva</span>
          </div>
          <HappinessCurve data={curveData} height={170} period={period} />
        </div>

        {/* Mood Distribution */}
        <div style={{ margin: "18px 20px 0", display: "flex", gap: 12 }}>
          {/* Donut */}
          <div style={{
            background: C.card, borderRadius: 22, padding: 18,
            border: `1px solid ${C.border}`, flex: 1,
            display: "flex", flexDirection: "column", alignItems: "center",
          }}>
            <span style={{ color: C.textDim, fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>DISTRIBUIÇÃO</span>
            <div style={{ position: "relative" }}>
              <MoodDonut data={moodDistribution} size={110} />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ textAlign: "center" }}>
                  <span style={{ color: C.text, fontSize: 18, fontWeight: 800, fontFamily: fontMono }}>115</span>
                  <p style={{ color: C.textDim, fontSize: 8, margin: "1px 0 0" }}>registros</p>
                </div>
              </div>
            </div>
          </div>

          {/* Mood list */}
          <div style={{
            background: C.card, borderRadius: 22, padding: "14px 16px",
            border: `1px solid ${C.border}`, flex: 1.5,
          }}>
            {moodDistribution.map((m, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "5px 0",
                borderBottom: i < moodDistribution.length - 1 ? `1px solid ${C.border}` : "none",
              }}>
                <span style={{ fontSize: 16, width: 22 }}>{m.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: C.textSec, fontSize: 11, fontWeight: 600 }}>{m.label}</span>
                    <span style={{ color: m.color, fontSize: 11, fontWeight: 700, fontFamily: fontMono }}>{m.pct}%</span>
                  </div>
                  <div style={{ height: 3, background: C.bgDeep, borderRadius: 2, marginTop: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${m.pct}%`, borderRadius: 2, background: m.color, transition: "width 0.8s ease" }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Streaks */}
        <div style={{ padding: "18px 20px 0" }}>
          <span style={{ color: C.textDim, fontSize: 11, fontWeight: 700, letterSpacing: 1.2 }}>SEQUÊNCIAS</span>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            {streaks.map((s, i) => (
              <div key={i} style={{
                flex: 1, background: C.card, borderRadius: 18, padding: "14px 10px",
                border: `1px solid ${C.border}`, textAlign: "center",
              }}>
                <span style={{ fontSize: 20 }}>{s.emoji}</span>
                <p style={{ color: s.color, fontSize: 22, fontWeight: 800, margin: "6px 0 2px", fontFamily: fontMono }}>{s.value}</p>
                <p style={{ color: C.textDim, fontSize: 9, margin: "0 0 4px" }}>{s.label}</p>
                <span style={{ color: C.textDim, fontSize: 9, fontFamily: fontMono }}>Recorde: {s.best}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Heatmap */}
        <div style={{
          margin: "18px 20px 0", padding: 18,
          background: C.card, borderRadius: 22, border: `1px solid ${C.border}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Ico type="calendar" size={16} color={C.happy} />
              <span style={{ color: C.text, fontSize: 14, fontWeight: 700 }}>Março 2026</span>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {[C.sad, C.anxious, C.tired, C.calm, C.happy, C.joy].map((c, i) => (
                <div key={i} style={{ width: 10, height: 10, borderRadius: 3, background: c + "45" }} />
              ))}
            </div>
          </div>
          <MoodCalendar month="Março 2026" data={marchCalendar} />
          <p style={{ color: C.textDim, fontSize: 10, textAlign: "center", margin: "10px 0 0" }}>
            Cada dia é colorido pelo score emocional médio
          </p>
        </div>

        {/* Correlation Factors */}
        <div style={{ padding: "18px 20px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <Ico type="zap" size={16} color={C.joy} />
            <span style={{ color: C.textDim, fontSize: 11, fontWeight: 700, letterSpacing: 1.2 }}>O QUE INFLUENCIA A FELICIDADE</span>
          </div>

          {/* Positive */}
          <p style={{ color: C.happy, fontSize: 11, fontWeight: 700, margin: "0 0 8px" }}>↑ Aumenta felicidade</p>
          {factors.filter(f => f.impact > 0).map((f, i) => (
            <div key={i} style={{
              background: C.card, borderRadius: 16, padding: "12px 14px", marginBottom: 8,
              border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{f.label}</span>
                  <span style={{ color: f.color, fontSize: 13, fontWeight: 800, fontFamily: fontMono }}>+{f.impact}%</span>
                </div>
                <div style={{ height: 4, background: C.bgDeep, borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${f.impact}%`, borderRadius: 2, background: `linear-gradient(90deg, ${f.color}60, ${f.color})`, transition: "width 0.8s ease" }} />
                </div>
              </div>
              <Sparkline data={f.sparkData} color={f.color} w={60} h={24} />
            </div>
          ))}

          {/* Negative */}
          <p style={{ color: C.anxious, fontSize: 11, fontWeight: 700, margin: "14px 0 8px" }}>↓ Diminui felicidade</p>
          {factors.filter(f => f.impact < 0).map((f, i) => (
            <div key={i} style={{
              background: C.card, borderRadius: 16, padding: "12px 14px", marginBottom: 8,
              border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{f.label}</span>
                  <span style={{ color: C.anxious, fontSize: 13, fontWeight: 800, fontFamily: fontMono }}>{f.impact}%</span>
                </div>
                <div style={{ height: 4, background: C.bgDeep, borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.abs(f.impact)}%`, borderRadius: 2, background: `linear-gradient(90deg, ${C.anxious}60, ${C.anxious})`, transition: "width 0.8s ease" }} />
                </div>
              </div>
              <Sparkline data={f.sparkData} color={C.anxious} w={60} h={24} />
            </div>
          ))}
        </div>

        {/* Notable Events */}
        <div style={{ padding: "18px 20px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <Ico type="activity" size={16} color={C.joy} />
            <span style={{ color: C.textDim, fontSize: 11, fontWeight: 700, letterSpacing: 1.2 }}>EVENTOS EMOCIONAIS MARCANTES</span>
          </div>

          {emotionalEvents.map((ev, i) => {
            const moodData = moods[ev.mood];
            const isPositive = parseInt(ev.delta) > 0;
            return (
              <div key={i} style={{
                background: C.card, borderRadius: 20, padding: "16px 18px", marginBottom: 10,
                border: `1px solid ${C.border}`,
                borderLeft: `3px solid ${moodData?.color || C.textDim}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 24 }}>{ev.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: C.text, fontSize: 14, fontWeight: 700 }}>{ev.title}</span>
                    <p style={{ color: C.textDim, fontSize: 11, margin: "2px 0 0" }}>{ev.date}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ color: moodData?.color, fontSize: 18, fontWeight: 800, fontFamily: fontMono }}>{ev.score}</span>
                    <div style={{
                      display: "inline-flex", alignItems: "center", gap: 3, marginLeft: 6,
                      padding: "2px 8px", borderRadius: 8,
                      background: isPositive ? C.happySoft : C.anxiousSoft,
                    }}>
                      <span style={{ color: isPositive ? C.happy : C.anxious, fontSize: 11, fontWeight: 700, fontFamily: fontMono }}>{ev.delta}</span>
                    </div>
                  </div>
                </div>
                <p style={{ color: C.textDim, fontSize: 12, lineHeight: 1.6, margin: 0 }}>{ev.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Breed Comparison */}
        <div style={{
          margin: "18px 20px 0", padding: 20,
          background: C.card, borderRadius: 22, border: `1px solid ${C.border}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Ico type="paw" size={16} color={C.joy} />
            <span style={{ color: C.text, fontSize: 14, fontWeight: 700 }}>Rex vs Labradores (média)</span>
          </div>

          {[
            { label: "Felicidade", key: "happiness", color: C.happy },
            { label: "Energia", key: "energy", color: C.joy },
            { label: "Calma", key: "calm", color: C.calm },
            { label: "Sociabilidade", key: "social", color: C.tired },
          ].map((attr, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ color: C.textSec, fontSize: 12, fontWeight: 600 }}>{attr.label}</span>
                <div style={{ display: "flex", gap: 12 }}>
                  <span style={{ color: attr.color, fontSize: 12, fontWeight: 700, fontFamily: fontMono }}>Rex: {breedComparison.rex[attr.key]}%</span>
                  <span style={{ color: C.textDim, fontSize: 12, fontFamily: fontMono }}>Média: {breedComparison.breed[attr.key]}%</span>
                </div>
              </div>
              <div style={{ position: "relative", height: 8, background: C.bgDeep, borderRadius: 4 }}>
                {/* Breed average marker */}
                <div style={{
                  position: "absolute", left: `${breedComparison.breed[attr.key]}%`, top: -2,
                  width: 2, height: 12, background: C.textDim, borderRadius: 1,
                }} />
                {/* Rex bar */}
                <div style={{
                  height: "100%", width: `${breedComparison.rex[attr.key]}%`, borderRadius: 4,
                  background: `linear-gradient(90deg, ${attr.color}70, ${attr.color})`,
                  transition: "width 0.8s ease",
                }} />
              </div>
            </div>
          ))}

          <div style={{
            background: C.happySoft, borderRadius: 12, padding: "10px 14px", marginTop: 6,
            border: `1px solid ${C.happy}12`,
          }}>
            <p style={{ color: C.textSec, fontSize: 12, lineHeight: 1.6, margin: 0 }}>
              <span style={{ color: C.happy, fontWeight: 700 }}>Rex está acima da média</span> em felicidade e sociabilidade comparado com outros Labradores de 3 anos na plataforma.
            </p>
          </div>
        </div>

        {/* Data Sources */}
        <div style={{ padding: "18px 20px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <Ico type="info" size={16} color={C.textDim} />
            <span style={{ color: C.textDim, fontSize: 11, fontWeight: 700, letterSpacing: 1.2 }}>FONTES DOS DADOS</span>
          </div>

          <div style={{
            background: C.card, borderRadius: 20, padding: "16px 18px",
            border: `1px solid ${C.border}`,
          }}>
            {sources.map((s, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "10px 0",
                borderBottom: i < sources.length - 1 ? `1px solid ${C.border}` : "none",
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: s.color + "12", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Ico type={s.icon} size={16} color={s.color} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: C.textSec, fontSize: 12, fontWeight: 600 }}>{s.label}</span>
                    <span style={{ color: s.color, fontSize: 12, fontWeight: 700, fontFamily: fontMono }}>{s.pct}%</span>
                  </div>
                  <div style={{ height: 3, background: C.bgDeep, borderRadius: 2, marginTop: 5, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${s.pct}%`, borderRadius: 2, background: s.color, transition: "width 0.6s ease" }} />
                  </div>
                </div>
                <span style={{ color: C.textDim, fontSize: 10, fontFamily: fontMono, width: 36, textAlign: "right" }}>{s.entries}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Emotional Report */}
        <div style={{
          margin: "18px 20px 30px", padding: 22,
          background: `linear-gradient(145deg, ${C.happy}08, ${C.joy}05, ${C.calm}04)`,
          borderRadius: 24, border: `1px solid ${C.happy}12`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <Ico type="paw" size={17} color={C.happy} />
            <span style={{ color: C.happy, fontSize: 13, fontWeight: 700 }}>Relatório Emocional do Rex</span>
          </div>
          <p style={{ color: C.textSec, fontSize: 14, lineHeight: 1.9, margin: "0 0 16px" }}>
            Nos últimos 6 meses, Rex viveu uma jornada emocional marcante. O ponto mais baixo
            foi em <span style={{ color: C.anxious, fontWeight: 600 }}>novembro</span> com a reação alérgica,
            mas a recuperação foi rápida. O <span style={{ color: C.joy, fontWeight: 600 }}>aniversário em fevereiro</span> foi
            o dia mais feliz já registrado. A tendência geral é <span style={{ color: C.happy, fontWeight: 600 }}>claramente positiva</span> — Rex está
            cada vez mais confiante e alegre. A única atenção necessária é a
            <span style={{ color: C.anxious, fontWeight: 600 }}> ansiedade leve nas tardes</span> quando fica sozinho,
            que pode ser reduzida com brinquedos interativos e música ambiente.
          </p>
          <div style={{
            background: C.bgCard, borderRadius: 14, padding: "14px 16px",
            border: `1px solid ${C.border}`,
          }}>
            <p style={{ color: C.textDim, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, margin: "0 0 6px" }}>PREVISÃO DA IA PARA ABRIL</p>
            <p style={{ color: C.text, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
              Se a rotina atual de passeios e playdates com a Nina se mantiver, o score de felicidade
              deve <span style={{ color: C.happy, fontWeight: 700 }}>subir para 82-85</span> no próximo mês. A primavera
              também tende a aumentar o nível de energia e sociabilidade.
            </p>
          </div>
        </div>

        <style>{`::-webkit-scrollbar{width:0;height:0}`}</style>
      </div>
    </div>
  );
}
