import { useState, useEffect, useRef } from "react";

const COLORS = {
  bg: "#0A0E1A",
  card: "#131829",
  cardHover: "#1A2035",
  accent: "#6C5CE7",
  accentSoft: "#6C5CE720",
  green: "#00D68F",
  greenSoft: "#00D68F18",
  orange: "#FDCB6E",
  orangeSoft: "#FDCB6E18",
  red: "#FF6B6B",
  redSoft: "#FF6B6B18",
  blue: "#74B9FF",
  blueSoft: "#74B9FF18",
  pink: "#FD79A8",
  pinkSoft: "#FD79A818",
  text: "#F0F0F5",
  textMuted: "#8892B0",
  textDim: "#5A6380",
  border: "#1E2740",
};

const PawIcon = ({ size = 20, color = COLORS.accent }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <ellipse cx="12" cy="17" rx="5" ry="4.5" />
    <circle cx="6" cy="10" r="2.5" />
    <circle cx="18" cy="10" r="2.5" />
    <circle cx="9" cy="6" r="2" />
    <circle cx="15" cy="6" r="2" />
  </svg>
);

const Icon = ({ type, size = 22, color = COLORS.textMuted }) => {
  const icons = {
    camera: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    ),
    video: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
        <rect x="2" y="4" width="15" height="16" rx="2" />
        <path d="M17 9l5-3v12l-5-3" />
      </svg>
    ),
    mic: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
        <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
        <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
      </svg>
    ),
    scan: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
        <path d="M2 7V2h5M17 2h5v5M22 17v5h-5M7 22H2v-5" />
        <rect x="6" y="6" width="12" height="12" rx="1" />
      </svg>
    ),
    heart: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    ),
    alert: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    check: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    ),
    back: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
    ),
    activity: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
        <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
      </svg>
    ),
    brain: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
        <path d="M12 2a5 5 0 015 5c0 1.5-.7 2.8-1.7 3.7A5 5 0 0120 15a5 5 0 01-3 4.6V22h-2v-2h-6v2H7v-2.4A5 5 0 014 15a5 5 0 014.7-4.3A5 5 0 017 7a5 5 0 015-5z" />
      </svg>
    ),
    doc: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14,2 14,8 20,8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
    share: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
        <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
    ),
  };
  return icons[type] || null;
};

// Simple bar chart
const MiniChart = ({ data, color, height = 60 }) => {
  const max = Math.max(...data);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height }}>
      {data.map((v, i) => (
        <div key={i} style={{
          flex: 1, borderRadius: 3,
          height: `${(v / max) * 100}%`,
          background: `linear-gradient(to top, ${color}40, ${color})`,
          minHeight: 4,
          transition: "height 0.6s ease",
        }} />
      ))}
    </div>
  );
};

const CircularProgress = ({ value, color, size = 80, label }) => {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={COLORS.border} strokeWidth="6" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ color, fontSize: 18, fontWeight: 700 }}>{value}%</span>
        {label && <span style={{ color: COLORS.textMuted, fontSize: 9, marginTop: 2 }}>{label}</span>}
      </div>
    </div>
  );
};

const WaveformVisualizer = ({ active }) => {
  const bars = 32;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2, height: 60, padding: "0 20px" }}>
      {Array.from({ length: bars }).map((_, i) => {
        const h = active ? 10 + Math.random() * 50 : 8;
        return (
          <div key={i} style={{
            width: 3, borderRadius: 2,
            height: active ? h : 8,
            background: active
              ? `linear-gradient(to top, ${COLORS.accent}, ${COLORS.pink})`
              : COLORS.border,
            transition: `height ${0.1 + Math.random() * 0.15}s ease`,
          }} />
        );
      })}
    </div>
  );
};

// =============== SCREENS ===============

const HomeScreen = ({ onNavigate }) => {
  const analysisTypes = [
    { id: "photo", icon: "camera", label: "Análise\nde Foto", desc: "Saúde visual", color: COLORS.green, bg: COLORS.greenSoft },
    { id: "video", icon: "video", label: "Análise\nde Vídeo", desc: "Comportamento", color: COLORS.blue, bg: COLORS.blueSoft },
    { id: "audio", icon: "mic", label: "Análise\nde Áudio", desc: "Vocalizações", color: COLORS.pink, bg: COLORS.pinkSoft },
    { id: "ocr", icon: "scan", label: "Scanner\nOCR", desc: "Documentos", color: COLORS.orange, bg: COLORS.orangeSoft },
  ];

  return (
    <div style={{ padding: "0 20px 30px" }}>
      <div style={{ padding: "24px 0 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ color: COLORS.textMuted, fontSize: 13, margin: 0 }}>Olá, tutor de</p>
          <h1 style={{ color: COLORS.text, fontSize: 24, margin: "4px 0 0", fontWeight: 700, letterSpacing: "-0.5px" }}>
            Rex 🐕
          </h1>
        </div>
        <div style={{
          width: 48, height: 48, borderRadius: 16, overflow: "hidden",
          background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.pink})`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: 24 }}>🐕</span>
        </div>
      </div>

      {/* Status Card */}
      <div style={{
        background: `linear-gradient(135deg, ${COLORS.accent}25, ${COLORS.pink}15)`,
        borderRadius: 20, padding: 20, marginBottom: 24,
        border: `1px solid ${COLORS.accent}30`,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <p style={{ color: COLORS.textMuted, fontSize: 12, margin: 0 }}>Status de Saúde IA</p>
            <p style={{ color: COLORS.green, fontSize: 20, fontWeight: 700, margin: "4px 0 0" }}>Saudável ✓</p>
          </div>
          <CircularProgress value={87} color={COLORS.green} size={64} label="score" />
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {[
            { label: "Última foto", value: "Hoje", c: COLORS.green },
            { label: "Último áudio", value: "3 dias", c: COLORS.orange },
            { label: "Alertas", value: "0", c: COLORS.green },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, background: COLORS.bg + "80", borderRadius: 12, padding: "10px 12px" }}>
              <p style={{ color: COLORS.textDim, fontSize: 10, margin: 0 }}>{s.label}</p>
              <p style={{ color: s.c, fontSize: 14, fontWeight: 600, margin: "2px 0 0" }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Analysis Grid */}
      <p style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 14px" }}>
        Iniciar análise
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {analysisTypes.map((a) => (
          <button key={a.id} onClick={() => onNavigate(`collect_${a.id}`)}
            style={{
              background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 20,
              padding: "22px 18px", cursor: "pointer", textAlign: "left",
              transition: "all 0.2s", position: "relative", overflow: "hidden",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = a.color + "60"; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.transform = "none"; }}
          >
            <div style={{
              position: "absolute", top: -20, right: -20, width: 80, height: 80,
              borderRadius: "50%", background: a.bg,
            }} />
            <div style={{
              width: 44, height: 44, borderRadius: 14, background: a.bg,
              display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14,
            }}>
              <Icon type={a.icon} color={a.color} size={22} />
            </div>
            <p style={{ color: COLORS.text, fontSize: 14, fontWeight: 600, margin: 0, whiteSpace: "pre-line", lineHeight: 1.3 }}>{a.label}</p>
            <p style={{ color: COLORS.textDim, fontSize: 11, margin: "4px 0 0" }}>{a.desc}</p>
          </button>
        ))}
      </div>

      {/* Recent Activity */}
      <p style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", margin: "28px 0 14px" }}>
        Análises recentes
      </p>
      {[
        { type: "Foto - Pele", time: "Hoje 14:32", status: "Normal", color: COLORS.green, icon: "camera" },
        { type: "Áudio - Latido", time: "Ontem 18:10", status: "Ansiedade leve", color: COLORS.orange, icon: "mic" },
        { type: "OCR - Vacina", time: "23 Mar", status: "Digitalizado", color: COLORS.blue, icon: "scan" },
      ].map((item, i) => (
        <button key={i} onClick={() => onNavigate(i === 0 ? "result_photo" : i === 1 ? "result_audio" : "result_ocr")}
          style={{
            display: "flex", alignItems: "center", gap: 14, width: "100%",
            background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16,
            padding: "14px 16px", marginBottom: 8, cursor: "pointer", transition: "all 0.2s",
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = item.color + "40"}
          onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.border}
        >
          <div style={{ width: 40, height: 40, borderRadius: 12, background: item.color + "18",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon type={item.icon} color={item.color} size={18} />
          </div>
          <div style={{ flex: 1, textAlign: "left" }}>
            <p style={{ color: COLORS.text, fontSize: 14, fontWeight: 500, margin: 0 }}>{item.type}</p>
            <p style={{ color: COLORS.textDim, fontSize: 11, margin: "2px 0 0" }}>{item.time}</p>
          </div>
          <span style={{
            background: item.color + "18", color: item.color,
            fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20,
          }}>{item.status}</span>
        </button>
      ))}
    </div>
  );
};

// ===== PHOTO COLLECTION =====
const PhotoCollectScreen = ({ onNavigate }) => {
  const [step, setStep] = useState(0); // 0=select, 1=options, 2=analyzing
  const [selectedArea, setSelectedArea] = useState(null);

  const areas = [
    { id: "skin", label: "Pele e Pelo", emoji: "🔍", desc: "Dermatites, fungos, parasitas" },
    { id: "eyes", label: "Olhos", emoji: "👁️", desc: "Opacidade, vermelhidão, secreção" },
    { id: "teeth", label: "Dentes e Boca", emoji: "🦷", desc: "Gengivas, tártaro, lesões" },
    { id: "body", label: "Corpo Geral", emoji: "🐕", desc: "Postura, peso, condição física" },
    { id: "wound", label: "Ferida / Lesão", emoji: "🩹", desc: "Análise de gravidade" },
    { id: "full", label: "Check-up Completo", emoji: "✨", desc: "Análise de corpo inteiro" },
  ];

  useEffect(() => {
    if (step === 2) {
      const t = setTimeout(() => onNavigate("result_photo"), 2500);
      return () => clearTimeout(t);
    }
  }, [step]);

  return (
    <div style={{ padding: "0 20px 30px" }}>
      <div style={{ padding: "16px 0", display: "flex", alignItems: "center", gap: 14 }}>
        <button onClick={() => step > 0 ? setStep(step - 1) : onNavigate("home")}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <Icon type="back" color={COLORS.text} />
        </button>
        <div>
          <h2 style={{ color: COLORS.text, fontSize: 18, margin: 0, fontWeight: 700 }}>Análise de Foto</h2>
          <p style={{ color: COLORS.textDim, fontSize: 12, margin: 0 }}>Passo {step + 1} de 3</p>
        </div>
      </div>

      {/* Progress */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i <= step ? COLORS.green : COLORS.border,
            transition: "background 0.3s",
          }} />
        ))}
      </div>

      {step === 0 && (
        <>
          <p style={{ color: COLORS.textMuted, fontSize: 14, margin: "0 0 18px", lineHeight: 1.5 }}>
            O que você quer que a IA analise?
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {areas.map(a => (
              <button key={a.id} onClick={() => { setSelectedArea(a.id); setStep(1); }}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16,
                  padding: "16px 18px", cursor: "pointer", textAlign: "left", transition: "all 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.green + "50"; e.currentTarget.style.background = COLORS.cardHover; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.background = COLORS.card; }}
              >
                <span style={{ fontSize: 28, width: 44, textAlign: "center" }}>{a.emoji}</span>
                <div>
                  <p style={{ color: COLORS.text, fontSize: 15, fontWeight: 600, margin: 0 }}>{a.label}</p>
                  <p style={{ color: COLORS.textDim, fontSize: 12, margin: "2px 0 0" }}>{a.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <div style={{
            background: COLORS.card, borderRadius: 24, padding: 4,
            border: `1px solid ${COLORS.border}`, marginBottom: 20,
            aspectRatio: "4/3", display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", inset: 0,
              background: `radial-gradient(circle at center, ${COLORS.green}08, transparent 70%)`,
            }} />
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: 72, height: 72, borderRadius: "50%",
                background: COLORS.greenSoft, display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px", border: `2px dashed ${COLORS.green}40`,
              }}>
                <Icon type="camera" color={COLORS.green} size={30} />
              </div>
              <p style={{ color: COLORS.text, fontSize: 16, fontWeight: 600, margin: "0 0 6px" }}>Toque para fotografar</p>
              <p style={{ color: COLORS.textDim, fontSize: 12, margin: 0, maxWidth: 220 }}>
                Posicione a câmera focando na área selecionada com boa iluminação
              </p>
            </div>
          </div>

          <div style={{
            background: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 16,
            border: `1px solid ${COLORS.border}`,
          }}>
            <p style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", margin: "0 0 10px" }}>
              Dicas para melhor resultado
            </p>
            {["Boa iluminação natural", "Foto nítida e próxima", "Pet calmo e parado", "Sem filtros ou edição"].map((tip, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Icon type="check" color={COLORS.green} size={14} />
                <span style={{ color: COLORS.textMuted, fontSize: 13 }}>{tip}</span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button style={{
              flex: 1, padding: "14px", borderRadius: 14, cursor: "pointer",
              background: COLORS.card, border: `1px solid ${COLORS.border}`, color: COLORS.text,
              fontSize: 14, fontWeight: 600,
            }}>
              📁 Galeria
            </button>
            <button onClick={() => setStep(2)} style={{
              flex: 2, padding: "14px", borderRadius: 14, cursor: "pointer",
              background: `linear-gradient(135deg, ${COLORS.green}, ${COLORS.green}CC)`,
              border: "none", color: "#000", fontSize: 14, fontWeight: 700,
            }}>
              📸 Tirar Foto
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <div style={{
            width: 100, height: 100, borderRadius: "50%", margin: "0 auto 24px",
            background: COLORS.greenSoft, display: "flex", alignItems: "center", justifyContent: "center",
            animation: "pulse 1.5s ease infinite",
          }}>
            <Icon type="brain" color={COLORS.green} size={44} />
          </div>
          <p style={{ color: COLORS.text, fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>Analisando...</p>
          <p style={{ color: COLORS.textMuted, fontSize: 14, margin: "0 0 32px" }}>A IA está examinando a imagem</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 260, margin: "0 auto", textAlign: "left" }}>
            {["Detectando áreas de interesse", "Comparando com base de dados", "Gerando relatório"].map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: "50%",
                  background: i < 2 ? COLORS.green : COLORS.accent + "30",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {i < 2 ? <Icon type="check" color="#000" size={14} /> : (
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%",
                      border: `2px solid ${COLORS.accent}`, borderTopColor: "transparent",
                      animation: "spin 0.8s linear infinite",
                    }} />
                  )}
                </div>
                <span style={{ color: i < 2 ? COLORS.text : COLORS.textDim, fontSize: 13 }}>{s}</span>
              </div>
            ))}
          </div>
          <style>{`
            @keyframes pulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.05); opacity: 0.8; } }
            @keyframes spin { to { transform: rotate(360deg); } }
          `}</style>
        </div>
      )}
    </div>
  );
};

// ===== PHOTO RESULT =====
const PhotoResultScreen = ({ onNavigate }) => {
  const findings = [
    { area: "Pele", status: "normal", label: "Saudável", detail: "Sem irritações, fungos ou parasitas visíveis", color: COLORS.green },
    { area: "Pelo", status: "attention", label: "Atenção leve", detail: "Leve ressecamento na região lombar. Recomendado suplemento de ômega 3", color: COLORS.orange },
    { area: "Olhos", status: "normal", label: "Saudável", detail: "Sem opacidade, secreção ou vermelhidão", color: COLORS.green },
    { area: "Postura", status: "normal", label: "Normal", detail: "Sem sinais de dor ou desconforto articular", color: COLORS.green },
  ];

  return (
    <div style={{ padding: "0 20px 30px" }}>
      <div style={{ padding: "16px 0", display: "flex", alignItems: "center", gap: 14 }}>
        <button onClick={() => onNavigate("home")}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <Icon type="back" color={COLORS.text} />
        </button>
        <div style={{ flex: 1 }}>
          <h2 style={{ color: COLORS.text, fontSize: 18, margin: 0, fontWeight: 700 }}>Resultado da Análise</h2>
          <p style={{ color: COLORS.textDim, fontSize: 12, margin: 0 }}>Foto · Hoje 14:32</p>
        </div>
        <button style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <Icon type="share" color={COLORS.textMuted} size={16} />
          <span style={{ color: COLORS.textMuted, fontSize: 12 }}>Enviar ao vet</span>
        </button>
      </div>

      {/* Score Card */}
      <div style={{
        background: `linear-gradient(135deg, ${COLORS.green}15, ${COLORS.blue}10)`,
        borderRadius: 24, padding: 24, marginBottom: 20,
        border: `1px solid ${COLORS.green}20`, textAlign: "center",
      }}>
        <CircularProgress value={92} color={COLORS.green} size={90} label="saúde" />
        <p style={{ color: COLORS.text, fontSize: 20, fontWeight: 700, margin: "16px 0 4px" }}>Rex está bem! 🎉</p>
        <p style={{ color: COLORS.textMuted, fontSize: 13, margin: 0 }}>
          Apenas 1 ponto de atenção leve identificado
        </p>
      </div>

      {/* Findings */}
      <p style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 12px" }}>
        Resultados detalhados
      </p>
      {findings.map((f, i) => (
        <div key={i} style={{
          background: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 10,
          border: `1px solid ${COLORS.border}`, borderLeft: `3px solid ${f.color}`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ color: COLORS.text, fontSize: 15, fontWeight: 600 }}>{f.area}</span>
            <span style={{
              background: f.color + "18", color: f.color,
              fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
            }}>{f.label}</span>
          </div>
          <p style={{ color: COLORS.textMuted, fontSize: 13, margin: 0, lineHeight: 1.5 }}>{f.detail}</p>
        </div>
      ))}

      {/* AI Diary Entry */}
      <div style={{
        background: `linear-gradient(135deg, ${COLORS.accent}12, ${COLORS.pink}08)`,
        borderRadius: 20, padding: 20, marginTop: 20,
        border: `1px solid ${COLORS.accent}20`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <PawIcon size={18} color={COLORS.accent} />
          <span style={{ color: COLORS.accent, fontSize: 13, fontWeight: 600 }}>Diário do Rex</span>
        </div>
        <p style={{ color: COLORS.text, fontSize: 14, lineHeight: 1.7, margin: 0, fontStyle: "italic" }}>
          "Hoje o meu humano ficou a olhar-me muito de perto. Acho que gostou do meu pelo,
          apesar de ele dizer que estou a precisar de 'ómega 3' — não sei o que é isso mas se
          for tão bom como bifes, aceito! 😄"
        </p>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button onClick={() => onNavigate("home")} style={{
          flex: 1, padding: 14, borderRadius: 14, cursor: "pointer",
          background: COLORS.card, border: `1px solid ${COLORS.border}`,
          color: COLORS.text, fontSize: 14, fontWeight: 600,
        }}>
          Início
        </button>
        <button onClick={() => onNavigate("collect_photo")} style={{
          flex: 1, padding: 14, borderRadius: 14, cursor: "pointer",
          background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.pink})`,
          border: "none", color: "#fff", fontSize: 14, fontWeight: 700,
        }}>
          Nova Análise
        </button>
      </div>
    </div>
  );
};

// ===== AUDIO COLLECTION =====
const AudioCollectScreen = ({ onNavigate }) => {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef(null);

  const toggleRecord = () => {
    if (!recording) {
      setRecording(true);
      setSeconds(0);
      intervalRef.current = setInterval(() => setSeconds(p => p + 1), 1000);
    } else {
      setRecording(false);
      clearInterval(intervalRef.current);
      setTimeout(() => onNavigate("result_audio"), 2000);
    }
  };

  useEffect(() => () => clearInterval(intervalRef.current), []);
  const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div style={{ padding: "0 20px 30px" }}>
      <div style={{ padding: "16px 0", display: "flex", alignItems: "center", gap: 14 }}>
        <button onClick={() => onNavigate("home")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <Icon type="back" color={COLORS.text} />
        </button>
        <h2 style={{ color: COLORS.text, fontSize: 18, margin: 0, fontWeight: 700 }}>Análise de Áudio</h2>
      </div>

      <div style={{ textAlign: "center", padding: "40px 0" }}>
        <div style={{
          width: 140, height: 140, borderRadius: "50%", margin: "0 auto 30px",
          background: recording ? `radial-gradient(circle, ${COLORS.pink}30, transparent)` : COLORS.card,
          border: `2px solid ${recording ? COLORS.pink : COLORS.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.3s",
          animation: recording ? "pulse 1.5s ease infinite" : "none",
        }}>
          <button onClick={toggleRecord} style={{
            width: 80, height: 80, borderRadius: "50%", cursor: "pointer",
            background: recording ? `linear-gradient(135deg, ${COLORS.red}, ${COLORS.pink})` : `linear-gradient(135deg, ${COLORS.pink}, ${COLORS.accent})`,
            border: "none", display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.3s",
          }}>
            {recording ? (
              <div style={{ width: 24, height: 24, borderRadius: 4, background: "#fff" }} />
            ) : (
              <Icon type="mic" color="#fff" size={32} />
            )}
          </button>
        </div>

        <p style={{ color: COLORS.text, fontSize: 36, fontWeight: 700, margin: "0 0 6px", fontVariantNumeric: "tabular-nums" }}>
          {formatTime(seconds)}
        </p>
        <p style={{ color: recording ? COLORS.pink : COLORS.textMuted, fontSize: 14, margin: "0 0 24px" }}>
          {recording ? "Gravando... Toque para parar" : "Toque para gravar o som do pet"}
        </p>

        <WaveformVisualizer active={recording} />
      </div>

      <div style={{
        background: COLORS.card, borderRadius: 16, padding: 16,
        border: `1px solid ${COLORS.border}`,
      }}>
        <p style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", margin: "0 0 10px" }}>
          A IA consegue identificar
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {["Latido de alerta", "Ansiedade", "Brincadeira", "Dor", "Medo", "Solidão", "Miado", "Ronronar"].map(t => (
            <span key={t} style={{
              background: COLORS.pinkSoft, color: COLORS.pink,
              fontSize: 12, padding: "5px 12px", borderRadius: 20, fontWeight: 500,
            }}>{t}</span>
          ))}
        </div>
      </div>

      <div style={{
        background: COLORS.card, borderRadius: 16, padding: 16, marginTop: 12,
        border: `1px solid ${COLORS.border}`,
      }}>
        <p style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", margin: "0 0 10px" }}>
          Modo monitor (em breve)
        </p>
        <p style={{ color: COLORS.textDim, fontSize: 13, lineHeight: 1.5, margin: 0 }}>
          Deixe um dispositivo em casa escutando o dia todo. Receba alertas se a IA detectar sinais de estresse ou dor.
        </p>
      </div>

      <style>{`@keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.04); } }`}</style>
    </div>
  );
};

// ===== AUDIO RESULT =====
const AudioResultScreen = ({ onNavigate }) => {
  const emotions = [
    { label: "Alerta", pct: 45, color: COLORS.orange },
    { label: "Brincadeira", pct: 30, color: COLORS.green },
    { label: "Ansiedade", pct: 15, color: COLORS.red },
    { label: "Fome", pct: 10, color: COLORS.blue },
  ];

  return (
    <div style={{ padding: "0 20px 30px" }}>
      <div style={{ padding: "16px 0", display: "flex", alignItems: "center", gap: 14 }}>
        <button onClick={() => onNavigate("home")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <Icon type="back" color={COLORS.text} />
        </button>
        <div style={{ flex: 1 }}>
          <h2 style={{ color: COLORS.text, fontSize: 18, margin: 0, fontWeight: 700 }}>Resultado do Áudio</h2>
          <p style={{ color: COLORS.textDim, fontSize: 12, margin: 0 }}>Ontem 18:10 · 00:47</p>
        </div>
      </div>

      {/* Translation Card */}
      <div style={{
        background: `linear-gradient(135deg, ${COLORS.pink}15, ${COLORS.accent}10)`,
        borderRadius: 24, padding: 24, marginBottom: 20,
        border: `1px solid ${COLORS.pink}20`, textAlign: "center",
      }}>
        <span style={{ fontSize: 48, display: "block", marginBottom: 12 }}>🗣️</span>
        <p style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 8px" }}>
          Tradução do latido
        </p>
        <p style={{ color: COLORS.text, fontSize: 18, lineHeight: 1.6, margin: 0, fontStyle: "italic", fontWeight: 500 }}>
          "Tem alguém aí fora! Estou a avisar porque sou responsável. Mas também queria brincar um bocadinho..."
        </p>
      </div>

      {/* Emotion Breakdown */}
      <p style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 14px" }}>
        Emoções detectadas
      </p>
      <div style={{
        background: COLORS.card, borderRadius: 20, padding: 20, marginBottom: 20,
        border: `1px solid ${COLORS.border}`,
      }}>
        {emotions.map((e, i) => (
          <div key={i} style={{ marginBottom: i < emotions.length - 1 ? 16 : 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ color: COLORS.text, fontSize: 14, fontWeight: 500 }}>{e.label}</span>
              <span style={{ color: e.color, fontSize: 14, fontWeight: 700 }}>{e.pct}%</span>
            </div>
            <div style={{ height: 8, background: COLORS.bg, borderRadius: 4, overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${e.pct}%`, borderRadius: 4,
                background: `linear-gradient(to right, ${e.color}80, ${e.color})`,
                transition: "width 1s ease",
              }} />
            </div>
          </div>
        ))}
      </div>

      {/* Audio Pattern */}
      <p style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 14px" }}>
        Padrão da semana
      </p>
      <div style={{
        background: COLORS.card, borderRadius: 20, padding: 20, marginBottom: 20,
        border: `1px solid ${COLORS.border}`,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ color: COLORS.textDim, fontSize: 12 }}>Latidos / dia</span>
          <span style={{ color: COLORS.orange, fontSize: 12, fontWeight: 600 }}>↓ 12% vs semana anterior</span>
        </div>
        <MiniChart data={[35, 28, 42, 22, 18, 30, 24]} color={COLORS.pink} height={70} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map(d => (
            <span key={d} style={{ color: COLORS.textDim, fontSize: 10, flex: 1, textAlign: "center" }}>{d}</span>
          ))}
        </div>
      </div>

      {/* Insight */}
      <div style={{
        background: COLORS.orangeSoft, borderRadius: 16, padding: 16,
        border: `1px solid ${COLORS.orange}20`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Icon type="alert" color={COLORS.orange} size={18} />
          <span style={{ color: COLORS.orange, fontSize: 13, fontWeight: 600 }}>Insight da IA</span>
        </div>
        <p style={{ color: COLORS.text, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
          Rex late mais entre 14h-16h (quando você está fora). O padrão sugere ansiedade leve
          de separação. Tente deixar um brinquedo interativo nesse horário.
        </p>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button onClick={() => onNavigate("home")} style={{
          flex: 1, padding: 14, borderRadius: 14, cursor: "pointer",
          background: COLORS.card, border: `1px solid ${COLORS.border}`,
          color: COLORS.text, fontSize: 14, fontWeight: 600,
        }}>Início</button>
        <button onClick={() => onNavigate("collect_audio")} style={{
          flex: 1, padding: 14, borderRadius: 14, cursor: "pointer",
          background: `linear-gradient(135deg, ${COLORS.pink}, ${COLORS.accent})`,
          border: "none", color: "#fff", fontSize: 14, fontWeight: 700,
        }}>Nova Gravação</button>
      </div>
    </div>
  );
};

// ===== OCR COLLECTION =====
const OCRCollectScreen = ({ onNavigate }) => {
  const [selected, setSelected] = useState(null);
  const docTypes = [
    { id: "vaccine", emoji: "💉", label: "Carteira de Vacinação", desc: "Digitaliza vacinas e datas" },
    { id: "prescription", emoji: "📋", label: "Receita Veterinária", desc: "Extrai medicamentos e dosagens" },
    { id: "exam", emoji: "🔬", label: "Resultado de Exame", desc: "Hemograma, bioquímico, etc." },
    { id: "invoice", emoji: "🧾", label: "Nota Fiscal", desc: "Registra gastos com o pet" },
    { id: "pedigree", emoji: "📜", label: "Pedigree / Documento", desc: "Documentos de origem" },
  ];

  return (
    <div style={{ padding: "0 20px 30px" }}>
      <div style={{ padding: "16px 0", display: "flex", alignItems: "center", gap: 14 }}>
        <button onClick={() => onNavigate("home")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <Icon type="back" color={COLORS.text} />
        </button>
        <h2 style={{ color: COLORS.text, fontSize: 18, margin: 0, fontWeight: 700 }}>Scanner de Documentos</h2>
      </div>

      <p style={{ color: COLORS.textMuted, fontSize: 14, margin: "0 0 18px", lineHeight: 1.5 }}>
        Fotografe o documento e a IA extrai os dados automaticamente para o prontuário.
      </p>

      {docTypes.map(d => (
        <button key={d.id} onClick={() => setSelected(d.id)}
          style={{
            display: "flex", alignItems: "center", gap: 14, width: "100%",
            background: selected === d.id ? COLORS.orange + "10" : COLORS.card,
            border: `1px solid ${selected === d.id ? COLORS.orange + "40" : COLORS.border}`,
            borderRadius: 16, padding: "16px 18px", marginBottom: 10,
            cursor: "pointer", textAlign: "left", transition: "all 0.2s",
          }}
        >
          <span style={{ fontSize: 28, width: 44, textAlign: "center" }}>{d.emoji}</span>
          <div style={{ flex: 1 }}>
            <p style={{ color: COLORS.text, fontSize: 15, fontWeight: 600, margin: 0 }}>{d.label}</p>
            <p style={{ color: COLORS.textDim, fontSize: 12, margin: "2px 0 0" }}>{d.desc}</p>
          </div>
          {selected === d.id && <Icon type="check" color={COLORS.orange} size={20} />}
        </button>
      ))}

      <button onClick={() => selected && onNavigate("result_ocr")}
        style={{
          width: "100%", padding: 16, borderRadius: 16, cursor: selected ? "pointer" : "default",
          background: selected ? `linear-gradient(135deg, ${COLORS.orange}, ${COLORS.orange}CC)` : COLORS.card,
          border: selected ? "none" : `1px solid ${COLORS.border}`,
          color: selected ? "#000" : COLORS.textDim,
          fontSize: 15, fontWeight: 700, marginTop: 10,
          opacity: selected ? 1 : 0.5, transition: "all 0.3s",
        }}>
        📸 Fotografar Documento
      </button>
    </div>
  );
};

// ===== OCR RESULT =====
const OCRResultScreen = ({ onNavigate }) => {
  const vaccines = [
    { name: "V10 (Polivalente)", date: "15/01/2026", next: "15/01/2027", status: "ok" },
    { name: "Antirrábica", date: "20/03/2025", next: "20/03/2026", status: "overdue" },
    { name: "Giárdia", date: "10/06/2025", next: "10/12/2025", status: "overdue" },
    { name: "Gripe Canina", date: "05/09/2025", next: "05/09/2026", status: "ok" },
  ];

  return (
    <div style={{ padding: "0 20px 30px" }}>
      <div style={{ padding: "16px 0", display: "flex", alignItems: "center", gap: 14 }}>
        <button onClick={() => onNavigate("home")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <Icon type="back" color={COLORS.text} />
        </button>
        <div style={{ flex: 1 }}>
          <h2 style={{ color: COLORS.text, fontSize: 18, margin: 0, fontWeight: 700 }}>Documento Digitalizado</h2>
          <p style={{ color: COLORS.textDim, fontSize: 12, margin: 0 }}>Carteira de Vacinação</p>
        </div>
        <button style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <Icon type="doc" color={COLORS.textMuted} size={16} />
          <span style={{ color: COLORS.textMuted, fontSize: 12 }}>PDF</span>
        </button>
      </div>

      {/* Extracted Info */}
      <div style={{
        background: COLORS.card, borderRadius: 20, padding: 20, marginBottom: 20,
        border: `1px solid ${COLORS.border}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <Icon type="check" color={COLORS.green} size={18} />
          <span style={{ color: COLORS.green, fontSize: 14, fontWeight: 600 }}>Dados extraídos com sucesso</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { label: "Pet", value: "Rex" },
            { label: "Espécie", value: "Canino" },
            { label: "Raça", value: "Labrador" },
            { label: "Microchip", value: "985...4721" },
          ].map((f, i) => (
            <div key={i} style={{ background: COLORS.bg, borderRadius: 12, padding: "10px 14px" }}>
              <p style={{ color: COLORS.textDim, fontSize: 10, margin: 0 }}>{f.label}</p>
              <p style={{ color: COLORS.text, fontSize: 14, fontWeight: 600, margin: "2px 0 0" }}>{f.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Vaccines */}
      <p style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 12px" }}>
        Vacinas identificadas
      </p>
      {vaccines.map((v, i) => (
        <div key={i} style={{
          background: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 10,
          border: `1px solid ${COLORS.border}`,
          borderLeft: `3px solid ${v.status === "ok" ? COLORS.green : COLORS.red}`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ color: COLORS.text, fontSize: 14, fontWeight: 600, margin: "0 0 4px" }}>{v.name}</p>
              <p style={{ color: COLORS.textDim, fontSize: 12, margin: 0 }}>Aplicada: {v.date}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ color: v.status === "ok" ? COLORS.green : COLORS.red, fontSize: 12, fontWeight: 600, margin: "0 0 4px" }}>
                {v.status === "ok" ? "Em dia ✓" : "Vencida ⚠️"}
              </p>
              <p style={{ color: COLORS.textDim, fontSize: 11, margin: 0 }}>Próxima: {v.next}</p>
            </div>
          </div>
        </div>
      ))}

      {/* Alert */}
      <div style={{
        background: COLORS.redSoft, borderRadius: 16, padding: 16, marginTop: 10,
        border: `1px solid ${COLORS.red}20`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Icon type="alert" color={COLORS.red} size={18} />
          <span style={{ color: COLORS.red, fontSize: 13, fontWeight: 600 }}>Ação necessária</span>
        </div>
        <p style={{ color: COLORS.text, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
          2 vacinas estão vencidas (Antirrábica e Giárdia). Recomendamos agendar uma consulta.
          Os dados já foram salvos no prontuário do Rex.
        </p>
      </div>

      <button onClick={() => onNavigate("home")} style={{
        width: "100%", padding: 16, borderRadius: 16, cursor: "pointer", marginTop: 20,
        background: `linear-gradient(135deg, ${COLORS.orange}, ${COLORS.orange}CC)`,
        border: "none", color: "#000", fontSize: 15, fontWeight: 700,
      }}>
        Salvar no Prontuário
      </button>
    </div>
  );
};

// ===== VIDEO COLLECTION =====
const VideoCollectScreen = ({ onNavigate }) => {
  const [recording, setRec] = useState(false);
  const [sec, setSec] = useState(0);
  const ref = useRef();

  const toggle = () => {
    if (!recording) { setRec(true); setSec(0); ref.current = setInterval(() => setSec(p => p+1), 1000); }
    else { setRec(false); clearInterval(ref.current); setTimeout(() => onNavigate("result_video"), 1500); }
  };
  useEffect(() => () => clearInterval(ref.current), []);

  return (
    <div style={{ padding: "0 20px 30px" }}>
      <div style={{ padding: "16px 0", display: "flex", alignItems: "center", gap: 14 }}>
        <button onClick={() => onNavigate("home")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <Icon type="back" color={COLORS.text} />
        </button>
        <h2 style={{ color: COLORS.text, fontSize: 18, margin: 0, fontWeight: 700 }}>Análise de Vídeo</h2>
      </div>

      <div style={{
        background: COLORS.card, borderRadius: 24, aspectRatio: "4/3", marginBottom: 20,
        border: `1px solid ${recording ? COLORS.blue : COLORS.border}`,
        display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden",
        transition: "border-color 0.3s",
      }}>
        {recording && (
          <div style={{ position: "absolute", top: 16, left: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: COLORS.red, animation: "pulse 1s ease infinite" }} />
            <span style={{ color: COLORS.red, fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
              {`${Math.floor(sec/60).toString().padStart(2,"0")}:${(sec%60).toString().padStart(2,"0")}`}
            </span>
          </div>
        )}
        <div style={{ textAlign: "center" }}>
          <span style={{ fontSize: 48, display: "block", marginBottom: 12 }}>{recording ? "🎬" : "🎥"}</span>
          <p style={{ color: recording ? COLORS.blue : COLORS.textMuted, fontSize: 14, margin: 0 }}>
            {recording ? "Gravando comportamento..." : "Grave 30s do pet em atividade"}
          </p>
        </div>
      </div>

      <p style={{ color: COLORS.textMuted, fontSize: 13, textAlign: "center", margin: "0 0 10px", lineHeight: 1.5 }}>
        A IA analisa locomoção, postura, energia e sinais de dor ou estresse
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 24 }}>
        {["Locomoção", "Postura", "Energia", "Estresse", "Interação social"].map(t => (
          <span key={t} style={{
            background: COLORS.blueSoft, color: COLORS.blue,
            fontSize: 12, padding: "5px 12px", borderRadius: 20, fontWeight: 500,
          }}>{t}</span>
        ))}
      </div>

      <button onClick={toggle} style={{
        width: "100%", padding: 16, borderRadius: 16, cursor: "pointer",
        background: recording ? `linear-gradient(135deg, ${COLORS.red}, ${COLORS.pink})` : `linear-gradient(135deg, ${COLORS.blue}, ${COLORS.accent})`,
        border: "none", color: "#fff", fontSize: 15, fontWeight: 700,
      }}>
        {recording ? "⏹ Parar Gravação" : "▶ Iniciar Gravação"}
      </button>
      <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
};

// ===== VIDEO RESULT =====
const VideoResultScreen = ({ onNavigate }) => (
  <div style={{ padding: "0 20px 30px" }}>
    <div style={{ padding: "16px 0", display: "flex", alignItems: "center", gap: 14 }}>
      <button onClick={() => onNavigate("home")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
        <Icon type="back" color={COLORS.text} />
      </button>
      <h2 style={{ color: COLORS.text, fontSize: 18, margin: 0, fontWeight: 700 }}>Resultado do Vídeo</h2>
    </div>

    <div style={{
      background: `linear-gradient(135deg, ${COLORS.blue}15, ${COLORS.green}10)`,
      borderRadius: 24, padding: 24, marginBottom: 20,
      border: `1px solid ${COLORS.blue}20`, textAlign: "center",
    }}>
      <div style={{ display: "flex", justifyContent: "center", gap: 20, marginBottom: 16 }}>
        <CircularProgress value={95} color={COLORS.green} size={70} label="locomoção" />
        <CircularProgress value={80} color={COLORS.blue} size={70} label="energia" />
        <CircularProgress value={70} color={COLORS.orange} size={70} label="calma" />
      </div>
      <p style={{ color: COLORS.text, fontSize: 16, fontWeight: 600, margin: 0 }}>
        Movimentação normal, energia alta
      </p>
    </div>

    <p style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 12px" }}>
      O que a IA detectou
    </p>
    {[
      { icon: "✅", title: "Locomoção", text: "Sem claudicação. Apoio simétrico nas 4 patas.", color: COLORS.green },
      { icon: "⚡", title: "Nível de energia", text: "Acima da média para a idade. 80º percentil para Labradores de 3 anos.", color: COLORS.blue },
      { icon: "⚠️", title: "Comportamento repetitivo", text: "Notado leve padrão circular nos últimos 5s. Monitorar em próximos vídeos.", color: COLORS.orange },
    ].map((f, i) => (
      <div key={i} style={{
        background: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 10,
        border: `1px solid ${COLORS.border}`, borderLeft: `3px solid ${f.color}`,
      }}>
        <p style={{ color: COLORS.text, fontSize: 14, fontWeight: 600, margin: "0 0 4px" }}>{f.icon} {f.title}</p>
        <p style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 1.5, margin: 0 }}>{f.text}</p>
      </div>
    ))}

    <div style={{
      background: `linear-gradient(135deg, ${COLORS.accent}12, ${COLORS.pink}08)`,
      borderRadius: 20, padding: 20, marginTop: 16, border: `1px solid ${COLORS.accent}20`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <PawIcon size={18} color={COLORS.accent} />
        <span style={{ color: COLORS.accent, fontSize: 13, fontWeight: 600 }}>Diário do Rex</span>
      </div>
      <p style={{ color: COLORS.text, fontSize: 14, lineHeight: 1.7, margin: 0, fontStyle: "italic" }}>
        "Hoje corri MUITO. Acho que bati o meu recorde pessoal. O meu humano ficou olhando eu rodar
        no final — acho que ficou impressionado com a minha técnica! 🏃"
      </p>
    </div>

    <button onClick={() => onNavigate("home")} style={{
      width: "100%", padding: 16, borderRadius: 16, cursor: "pointer", marginTop: 20,
      background: `linear-gradient(135deg, ${COLORS.blue}, ${COLORS.accent})`,
      border: "none", color: "#fff", fontSize: 15, fontWeight: 700,
    }}>Voltar ao Início</button>
  </div>
);

// ===== MAIN APP =====
export default function PetAIApp() {
  const [screen, setScreen] = useState("home");
  const containerRef = useRef();

  const navigate = (s) => {
    setScreen(s);
    if (containerRef.current) containerRef.current.scrollTop = 0;
  };

  const screens = {
    home: HomeScreen,
    collect_photo: PhotoCollectScreen,
    collect_video: VideoCollectScreen,
    collect_audio: AudioCollectScreen,
    collect_ocr: OCRCollectScreen,
    result_photo: PhotoResultScreen,
    result_video: VideoResultScreen,
    result_audio: AudioResultScreen,
    result_ocr: OCRResultScreen,
  };

  const Screen = screens[screen] || HomeScreen;

  return (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center",
      minHeight: "100vh", background: "#050810", padding: 20,
      fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <div ref={containerRef} style={{
        width: 390, maxHeight: 780,
        background: COLORS.bg, borderRadius: 40,
        overflow: "auto", position: "relative",
        boxShadow: `0 0 60px ${COLORS.accent}15, 0 0 120px ${COLORS.bg}`,
        border: `1px solid ${COLORS.border}`,
      }}>
        {/* Notch */}
        <div style={{
          position: "sticky", top: 0, zIndex: 10,
          display: "flex", justifyContent: "center", padding: "8px 0 0",
          background: `linear-gradient(to bottom, ${COLORS.bg}, ${COLORS.bg}F0, transparent)`,
        }}>
          <div style={{ width: 120, height: 28, borderRadius: 20, background: "#000" }} />
        </div>

        <Screen onNavigate={navigate} />

        {/* Bottom Nav */}
        {screen === "home" && (
          <div style={{
            position: "sticky", bottom: 0,
            background: `linear-gradient(to top, ${COLORS.bg}, ${COLORS.bg}F0, transparent)`,
            padding: "20px 20px 24px", display: "flex", justifyContent: "center",
          }}>
            <div style={{
              display: "flex", gap: 0, background: COLORS.card,
              borderRadius: 20, border: `1px solid ${COLORS.border}`, padding: 4, width: "100%",
            }}>
              {[
                { icon: "heart", label: "Início", active: true },
                { icon: "activity", label: "Saúde" },
                { icon: "brain", label: "IA" },
                { icon: "doc", label: "Docs" },
              ].map((tab, i) => (
                <button key={i} style={{
                  flex: 1, padding: "10px 0", borderRadius: 16, cursor: "pointer",
                  background: tab.active ? COLORS.accent + "20" : "transparent",
                  border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                }}>
                  <Icon type={tab.icon} color={tab.active ? COLORS.accent : COLORS.textDim} size={20} />
                  <span style={{ color: tab.active ? COLORS.accent : COLORS.textDim, fontSize: 10, fontWeight: 500 }}>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
