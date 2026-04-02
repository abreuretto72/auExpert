import { useState } from "react";

const C = {
  bg: "#0F1923", bgCard: "#162231", card: "#1A2B3D",
  accent: "#E8813A", accentDark: "#CC6E2E",
  petrol: "#1B8EAD", success: "#2ECC71", danger: "#E74C3C",
  purple: "#9B59B6", gold: "#F39C12", warning: "#F1C40F",
  text: "#E8EDF2", textSec: "#8FA3B8", textDim: "#5E7A94", textGhost: "#2E4254",
  border: "#1E3248",
};
const font = "'Sora', -apple-system, sans-serif";
const fontMono = "'JetBrains Mono', monospace";
const fontHand = "'Caveat', cursive";

const I = {
  back: (s=18,c=C.accent) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15,18 9,12 15,6"/></svg>,
  ear: (s=22,c=C.petrol) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8.5a6.5 6.5 0 1113 0c0 6-6 6-6 12"/><path d="M15 8.5a2.5 2.5 0 00-5 0v1a2 2 0 004 0"/></svg>,
  check: (s=14,c=C.success) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12"/></svg>,
  alertTriangle: (s=16,c=C.warning) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  sparkle: (s=12,c=C.purple) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/></svg>,
  shield: (s=14,c=C.success) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  book: (s=14,c=C.accent) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>,
};

// Audio waveform bars
const Waveform = ({ active }) => (
  <div style={{ display:"flex", alignItems:"center", gap:2, height:48, padding:"0 4px" }}>
    {Array.from({length:60}).map((_,i) => {
      const h = Math.sin(i * 0.4) * 16 + Math.random() * 12 + 8;
      return <div key={i} style={{
        width:3, height:h, borderRadius:2,
        background: active ? (i < 45 ? C.petrol : C.petrol+"30") : C.petrol+"20",
        transition:"height 0.1s",
      }} />;
    })}
  </div>
);

export default function DiaryPetAudioResult() {
  const [playing, setPlaying] = useState(false);

  const analysis = {
    duration: "8s",
    pattern: "Latido de ansiedade",
    confidence: 84,
    emotion: "Ansioso",
    emotionColor: C.warning,
    intensity: "Moderada",
    details: [
      { label: "Frequência", value: "Alta (3-4 latidos/s)", color: C.warning },
      { label: "Intervalos", value: "Curtos e regulares", color: C.warning },
      { label: "Tom", value: "Agudo, repetitivo", color: C.danger },
      { label: "Volume", value: "Médio-alto", color: C.gold },
    ],
    interpretation: "Rex está demonstrando padrão de ansiedade de separação. Os latidos são curtos, agudos e com intervalos regulares — típico de quando o tutor sai de casa.",
    history: "Este é o 4º registro de ansiedade nas últimas 2 semanas. O padrão sempre ocorre entre 14h-16h, horário em que o tutor costuma sair.",
    suggestions: [
      "Deixar brinquedo interativo quando sair",
      "Som ambiente (música calma ou TV)",
      "Passeio de 20min antes de sair",
    ],
  };

  return (
    <div style={{ display:"flex", justifyContent:"center", alignItems:"center", minHeight:"100vh", padding:20, background:`radial-gradient(ellipse at 50% 0%, #162231, #0B1219 70%)`, fontFamily:font }}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Caveat:wght@400;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{ width:400, maxHeight:820, background:C.bg, borderRadius:44, overflow:"auto", boxShadow:`0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px ${C.border}` }}>
        <div style={{ display:"flex", justifyContent:"center", padding:"8px 0 0" }}><div style={{ width:120, height:28, borderRadius:20, background:"#000" }} /></div>

        <div style={{ padding:"12px 20px 0", display:"flex", alignItems:"center", gap:12 }}>
          <button style={{ background:C.card, border:`1.5px solid ${C.border}`, borderRadius:12, width:42, height:42, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>{I.back()}</button>
          <div style={{ flex:1 }}>
            <h2 style={{ color:C.text, fontSize:16, fontWeight:700, margin:0, fontFamily:font }}>IA analisou o som</h2>
            <p style={{ color:C.textDim, fontSize:10, margin:"1px 0 0", fontFamily:font }}>Diário do Rex</p>
          </div>
          {I.ear(22, C.petrol)}
        </div>

        <div style={{ padding:"14px 20px 30px" }}>
          {/* Audio player */}
          <div style={{
            background:C.petrol+"08", borderRadius:20, padding:"18px", marginBottom:16,
            border:`1.5px solid ${C.petrol}20`,
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
              <button onClick={() => setPlaying(!playing)} style={{
                width:48, height:48, borderRadius:16,
                background:`linear-gradient(135deg, ${C.petrol}, ${C.petrol}CC)`,
                border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                boxShadow:`0 4px 16px ${C.petrol}30`,
              }}>
                {playing ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><polygon points="5,3 19,12 5,21"/></svg>
                )}
              </button>
              <div style={{ flex:1 }}>
                <span style={{ color:C.text, fontSize:13, fontWeight:700, fontFamily:font }}>Latido do Rex</span>
                <div style={{ display:"flex", gap:8, marginTop:2 }}>
                  <span style={{ color:C.petrol, fontSize:10, fontFamily:fontMono }}>{analysis.duration}</span>
                  <span style={{ color:C.textGhost }}>·</span>
                  <span style={{ color:C.textDim, fontSize:10, fontFamily:font }}>Gravado agora</span>
                </div>
              </div>
            </div>
            <Waveform active={playing} />
          </div>

          {/* Main result */}
          <div style={{
            background:C.card, borderRadius:20, padding:"20px", marginBottom:14,
            border:`1px solid ${analysis.emotionColor}20`,
          }}>
            {/* Pattern + emotion */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
              <div>
                <span style={{ color:C.textGhost, fontSize:10, fontWeight:700, letterSpacing:2, fontFamily:font }}>PADRÃO DETECTADO</span>
                <h3 style={{ color:analysis.emotionColor, fontSize:20, fontWeight:800, margin:"4px 0 0", fontFamily:font }}>{analysis.pattern}</h3>
              </div>
              <div style={{ textAlign:"right" }}>
                <span style={{ color:analysis.emotionColor, fontSize:22, fontWeight:800, fontFamily:fontMono }}>{analysis.confidence}%</span>
                <p style={{ color:C.textDim, fontSize:9, margin:"2px 0 0", fontFamily:font }}>confiança</p>
              </div>
            </div>

            {/* Emotion + intensity */}
            <div style={{ display:"flex", gap:8, marginBottom:16 }}>
              <div style={{ flex:1, background:analysis.emotionColor+"10", borderRadius:12, padding:"10px 14px", border:`1px solid ${analysis.emotionColor}15` }}>
                <span style={{ color:C.textGhost, fontSize:9, fontFamily:font }}>Emoção</span>
                <p style={{ color:analysis.emotionColor, fontSize:15, fontWeight:700, margin:"2px 0 0", fontFamily:font }}>{analysis.emotion}</p>
              </div>
              <div style={{ flex:1, background:C.bgCard, borderRadius:12, padding:"10px 14px", border:`1px solid ${C.border}` }}>
                <span style={{ color:C.textGhost, fontSize:9, fontFamily:font }}>Intensidade</span>
                <p style={{ color:C.text, fontSize:15, fontWeight:700, margin:"2px 0 0", fontFamily:font }}>{analysis.intensity}</p>
              </div>
            </div>

            {/* Detail chips */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:14 }}>
              {analysis.details.map((d,i) => (
                <div key={i} style={{ background:C.bgCard, borderRadius:10, padding:"8px 12px", border:`1px solid ${C.border}` }}>
                  <span style={{ color:C.textGhost, fontSize:9, fontFamily:font }}>{d.label}</span>
                  <p style={{ color:d.color, fontSize:11, fontWeight:600, margin:"2px 0 0", fontFamily:font }}>{d.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Interpretation */}
          <div style={{
            background:C.purple+"08", borderRadius:16, padding:"14px 16px",
            border:`1px solid ${C.purple}12`, marginBottom:10,
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
              {I.sparkle(12, C.purple)}
              <span style={{ color:C.purple, fontSize:10, fontWeight:700, fontFamily:font }}>INTERPRETAÇÃO DA IA</span>
            </div>
            <p style={{ color:C.textSec, fontSize:12, lineHeight:1.7, margin:0, fontFamily:font }}>{analysis.interpretation}</p>
          </div>

          {/* History pattern */}
          <div style={{
            background:C.warning+"06", borderRadius:14, padding:"12px 16px",
            border:`1px solid ${C.warning}12`, marginBottom:14,
            display:"flex", alignItems:"flex-start", gap:10,
          }}>
            {I.alertTriangle(16, C.warning)}
            <div>
              <span style={{ color:C.warning, fontSize:11, fontWeight:700, fontFamily:font }}>Padrão recorrente</span>
              <p style={{ color:C.textSec, fontSize:11, lineHeight:1.5, margin:"4px 0 0", fontFamily:font }}>{analysis.history}</p>
            </div>
          </div>

          {/* Suggestions */}
          <p style={{ color:C.textGhost, fontSize:10, fontWeight:700, letterSpacing:2, margin:"0 0 8px", fontFamily:font }}>SUGESTÕES DA IA</p>
          {analysis.suggestions.map((s, i) => (
            <div key={i} style={{
              display:"flex", alignItems:"center", gap:10, padding:"10px 14px",
              background:C.card, borderRadius:12, border:`1px solid ${C.border}`, marginBottom:6,
            }}>
              <div style={{ width:24, height:24, borderRadius:8, background:C.success+"12", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <span style={{ color:C.success, fontSize:12, fontWeight:700, fontFamily:fontMono }}>{i+1}</span>
              </div>
              <span style={{ color:C.textSec, fontSize:12, fontFamily:font }}>{s}</span>
            </div>
          ))}

          {/* AI narration */}
          <div style={{
            background:C.card, borderRadius:14, padding:"14px 16px",
            border:`1px solid ${C.accent}10`, marginTop:14, marginBottom:14,
          }}>
            <span style={{ color:C.textGhost, fontSize:10, fontWeight:700, fontFamily:font }}>NARRAÇÃO DO REX</span>
            <p style={{ color:C.text, fontSize:14, lineHeight:1.6, margin:"6px 0 0", fontFamily:fontHand, fontWeight:600 }}>
              "O meu humano saiu e eu NÃO concordei com esta decisão! Latei umas 50 vezes pra ele voltar. Não funcionou. Mas eu NÃO vou desistir."
            </p>
          </div>

          {/* Bottom */}
          <div style={{ display:"flex", gap:8 }}>
            <button style={{
              flex:1, padding:14, borderRadius:14, cursor:"pointer",
              background:C.card, border:`1.5px solid ${C.border}`,
              color:C.textDim, fontSize:12, fontWeight:600, fontFamily:font,
              display:"flex", alignItems:"center", justifyContent:"center", gap:6,
            }}>
              {I.shield(14, C.success)} Registrar no Prontuário
            </button>
            <button style={{
              flex:1, padding:14, borderRadius:14, cursor:"pointer",
              background:`linear-gradient(135deg, ${C.accent}, ${C.accentDark})`,
              border:"none", color:"#fff", fontSize:12, fontWeight:700, fontFamily:font,
              display:"flex", alignItems:"center", justifyContent:"center", gap:6,
            }}>
              {I.book(14, "#fff")} Salvar no diário
            </button>
          </div>
        </div>
        <style>{`::-webkit-scrollbar{width:0;height:0}`}</style>
      </div>
    </div>
  );
}
