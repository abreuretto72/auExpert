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
  video: (s=20,c=C.danger) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="23,7 16,12 23,17"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>,
  check: (s=14,c=C.success) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12"/></svg>,
  alertTriangle: (s=16,c=C.warning) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  sparkle: (s=12,c=C.purple) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/></svg>,
  activity: (s=16,c) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/></svg>,
  shield: (s=14,c=C.success) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  paw: (s=14,c=C.accent) => <svg width={s} height={s} viewBox="0 0 24 24" fill={c} stroke="none"><ellipse cx="12" cy="17" rx="4.5" ry="4"/><circle cx="7" cy="10.5" r="2.2"/><circle cx="17" cy="10.5" r="2.2"/><circle cx="9.5" cy="6.5" r="1.8"/><circle cx="14.5" cy="6.5" r="1.8"/></svg>,
  book: (s=14,c=C.accent) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>,
};

const ScoreBar = ({ label, value, color, max=100 }) => (
  <div style={{ marginBottom:12 }}>
    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
      <span style={{ color:C.textDim, fontSize:11, fontFamily:font }}>{label}</span>
      <span style={{ color, fontSize:12, fontWeight:700, fontFamily:fontMono }}>{value}%</span>
    </div>
    <div style={{ height:6, borderRadius:3, background:C.bgCard }}>
      <div style={{ width:`${value}%`, height:"100%", borderRadius:3, background:`linear-gradient(90deg, ${color}90, ${color})`, transition:"width 0.8s ease" }} />
    </div>
  </div>
);

export default function DiaryVideoResult() {
  const [playing, setPlaying] = useState(false);

  const analysis = {
    duration: "24s",
    scores: [
      { label:"Locomoção", value:95, color:C.success },
      { label:"Energia", value:82, color:C.accent },
      { label:"Calma", value:68, color:C.petrol },
      { label:"Postura", value:90, color:C.success },
    ],
    mood: "Brincalhão", moodColor: C.accent, moodConf: 91,
    behavior: "Normal — ativo e saudável",
    alerts: [
      { text:"Leve pausa na pata traseira direita no segundo 18", severity:"low", color:C.warning },
    ],
    connection: { detected: true, pet:"Golden Retriever", interaction:"Brincadeira ativa" },
  };

  return (
    <div style={{ display:"flex", justifyContent:"center", alignItems:"center", minHeight:"100vh", padding:20, background:`radial-gradient(ellipse at 50% 0%, #162231, #0B1219 70%)`, fontFamily:font }}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Caveat:wght@400;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{ width:400, maxHeight:820, background:C.bg, borderRadius:44, overflow:"auto", boxShadow:`0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px ${C.border}` }}>
        <div style={{ display:"flex", justifyContent:"center", padding:"8px 0 0" }}><div style={{ width:120, height:28, borderRadius:20, background:"#000" }} /></div>

        <div style={{ padding:"12px 20px 0", display:"flex", alignItems:"center", gap:12 }}>
          <button style={{ background:C.card, border:`1.5px solid ${C.border}`, borderRadius:12, width:42, height:42, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>{I.back()}</button>
          <div style={{ flex:1 }}>
            <h2 style={{ color:C.text, fontSize:16, fontWeight:700, margin:0, fontFamily:font }}>IA analisou o vídeo</h2>
            <p style={{ color:C.textDim, fontSize:10, margin:"1px 0 0", fontFamily:font }}>Diário do Rex</p>
          </div>
          {I.video(20, C.danger)}
        </div>

        <div style={{ padding:"14px 20px 30px" }}>
          {/* Video player area */}
          <div style={{
            height:200, borderRadius:20, marginBottom:16, position:"relative", overflow:"hidden",
            background:`linear-gradient(180deg, ${C.card}, ${C.bgCard})`,
            border:`1px solid ${C.border}`,
          }}>
            {/* Play button overlay */}
            <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <button onClick={() => setPlaying(!playing)} style={{
                width:56, height:56, borderRadius:18,
                background:"rgba(0,0,0,0.5)", backdropFilter:"blur(4px)",
                border:"2px solid rgba(255,255,255,0.3)", cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                {playing ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><polygon points="5,3 19,12 5,21"/></svg>
                )}
              </button>
            </div>
            {/* Duration */}
            <div style={{ position:"absolute", bottom:12, right:12, background:"rgba(0,0,0,0.6)", borderRadius:6, padding:"3px 8px" }}>
              <span style={{ color:"#fff", fontSize:10, fontFamily:fontMono }}>{analysis.duration}</span>
            </div>
            {/* Thumbnail placeholder */}
            <div style={{ position:"absolute", top:12, left:12, display:"flex", alignItems:"center", gap:6, background:"rgba(0,0,0,0.4)", borderRadius:8, padding:"4px 10px" }}>
              {I.paw(12, "#fff")}
              <span style={{ color:"#fff", fontSize:10, fontFamily:font }}>Rex no parque</span>
            </div>
          </div>

          {/* Scores */}
          <div style={{ background:C.card, borderRadius:18, padding:"18px 16px", marginBottom:14, border:`1px solid ${C.border}` }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
              {I.activity(16, C.accent)}
              <span style={{ color:C.text, fontSize:13, fontWeight:700, fontFamily:font }}>Análise de Movimento</span>
              <span style={{ color:C.success, fontSize:10, fontWeight:600, fontFamily:font, marginLeft:"auto", background:C.success+"12", padding:"2px 8px", borderRadius:6 }}>{analysis.behavior}</span>
            </div>
            {analysis.scores.map((s, i) => <ScoreBar key={i} {...s} />)}
          </div>

          {/* Mood */}
          <div style={{
            display:"flex", alignItems:"center", gap:12, padding:"14px 16px",
            background:analysis.moodColor+"08", borderRadius:14, border:`1px solid ${analysis.moodColor}15`, marginBottom:10,
          }}>
            <div style={{ width:40, height:40, borderRadius:12, background:analysis.moodColor+"15", display:"flex", alignItems:"center", justifyContent:"center" }}>
              {I.paw(18, analysis.moodColor)}
            </div>
            <div style={{ flex:1 }}>
              <span style={{ color:analysis.moodColor, fontSize:14, fontWeight:700, fontFamily:font }}>Humor: {analysis.mood}</span>
              <p style={{ color:C.textDim, fontSize:10, margin:"2px 0 0", fontFamily:font }}>Inferido do vídeo</p>
            </div>
            <span style={{ color:analysis.moodColor, fontSize:14, fontWeight:700, fontFamily:fontMono }}>{analysis.moodConf}%</span>
          </div>

          {/* Alert */}
          {analysis.alerts.map((a, i) => (
            <div key={i} style={{
              display:"flex", alignItems:"flex-start", gap:10, padding:"12px 14px",
              background:a.color+"06", borderRadius:12, border:`1px solid ${a.color}15`, marginBottom:10,
            }}>
              {I.alertTriangle(16, a.color)}
              <div>
                <span style={{ color:a.color, fontSize:11, fontWeight:700, fontFamily:font }}>Observação</span>
                <p style={{ color:C.textSec, fontSize:11, lineHeight:1.5, margin:"2px 0 0", fontFamily:font }}>{a.text}</p>
              </div>
            </div>
          ))}

          {/* Connection detected */}
          {analysis.connection.detected && (
            <div style={{
              display:"flex", alignItems:"center", gap:10, padding:"12px 14px",
              background:C.petrol+"08", borderRadius:12, border:`1px solid ${C.petrol}15`, marginBottom:14,
            }}>
              {I.paw(14, C.petrol)}
              <div style={{ flex:1 }}>
                <span style={{ color:C.petrol, fontSize:12, fontWeight:700, fontFamily:font }}>Outro pet detectado: {analysis.connection.pet}</span>
                <p style={{ color:C.textDim, fontSize:10, margin:"2px 0 0", fontFamily:font }}>{analysis.connection.interaction}</p>
              </div>
              <button style={{ background:C.petrol+"12", border:`1px solid ${C.petrol}25`, borderRadius:8, padding:"4px 10px", cursor:"pointer" }}>
                <span style={{ color:C.petrol, fontSize:10, fontWeight:700, fontFamily:font }}>Registrar amigo</span>
              </button>
            </div>
          )}

          {/* AI narration */}
          <div style={{
            background:C.purple+"08", borderRadius:14, padding:"12px 16px",
            border:`1px solid ${C.purple}12`, marginBottom:14,
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
              {I.sparkle(12, C.purple)}
              <span style={{ color:C.purple, fontSize:10, fontWeight:700, fontFamily:font }}>NARRAÇÃO IA</span>
            </div>
            <p style={{ color:C.text, fontSize:13, lineHeight:1.6, margin:0, fontFamily:fontHand, fontWeight:600 }}>
              "Corri com um golden enorme no parque! Ele era rápido, mas eu sou mais esperto. A gente brincou tanto que minhas patas ficaram todas sujas. Melhor tarde do mundo!"
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
              {I.shield(14, C.warning)} Prontuário
            </button>
            <button style={{
              flex:1.5, padding:14, borderRadius:14, cursor:"pointer",
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
