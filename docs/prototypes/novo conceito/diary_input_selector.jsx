import { useState } from "react";

const C = {
  bg: "#0F1923", bgCard: "#162231", bgDeep: "#0B1219",
  card: "#1A2B3D", accent: "#E8813A", accentDark: "#CC6E2E",
  petrol: "#1B8EAD", petrolGlow: "#1B8EAD15",
  success: "#2ECC71", danger: "#E74C3C", purple: "#9B59B6", gold: "#F39C12",
  text: "#E8EDF2", textSec: "#8FA3B8", textDim: "#5E7A94", textGhost: "#2E4254",
  border: "#1E3248", shadowAccent: "0 8px 30px rgba(232,129,58,0.25)",
};
const font = "'Sora', -apple-system, sans-serif";
const fontMono = "'JetBrains Mono', monospace";
const fontHand = "'Caveat', cursive";

const I = {
  x: (s=18,c=C.accent) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  camera: (s=28,c="#fff") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  video: (s=28,c="#fff") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="23,7 16,12 23,17"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>,
  mic: (s=28,c="#fff") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 00-3 3v6a3 3 0 006 0V5a3 3 0 00-3-3z"/><path d="M19 10v1a7 7 0 01-14 0v-1"/><line x1="12" y1="18" x2="12" y2="22"/></svg>,
  ear: (s=28,c="#fff") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8.5a6.5 6.5 0 1113 0c0 6-6 6-6 12"/><path d="M15 8.5a2.5 2.5 0 00-5 0v1a2 2 0 004 0"/></svg>,
  keyboard: (s=28,c="#fff") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="6" y1="8" x2="6" y2="8"/><line x1="10" y1="8" x2="10" y2="8"/><line x1="14" y1="8" x2="14" y2="8"/><line x1="18" y1="8" x2="18" y2="8"/><line x1="6" y1="12" x2="6" y2="12"/><line x1="10" y1="12" x2="10" y2="12"/><line x1="14" y1="12" x2="14" y2="12"/><line x1="18" y1="12" x2="18" y2="12"/><line x1="8" y1="16" x2="16" y2="16"/></svg>,
  imageUp: (s=28,c="#fff") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  scan: (s=28,c="#fff") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 012-2h2"/><path d="M17 3h2a2 2 0 012 2v2"/><path d="M21 17v2a2 2 0 01-2 2h-2"/><path d="M7 21H5a2 2 0 01-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></svg>,
  fileText: (s=28,c="#fff") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  sparkle: (s=14,c=C.purple) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/></svg>,
  dog: (s=20,c=C.accent) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 5.172C10 3.782 8.423 2.679 6.5 3c-2.823.47-4.113 6.006-4 7 .137 1.217.652 2 1.5 2.5V19a2 2 0 002 2h10a2 2 0 002-2v-6.328c.848-.5 1.363-1.283 1.5-2.5.113-.994-1.177-6.53-4-7C13.577 2.679 12 3.782 12 5.172V5.5"/><circle cx="8.5" cy="10" r="1" fill={c} stroke="none"/><circle cx="13.5" cy="10" r="1" fill={c} stroke="none"/></svg>,
};

const entries = [
  { icon: I.camera, label: "Foto", sub: "Tire foto de qualquer coisa", color: C.accent, gradient: `linear-gradient(135deg, ${C.accent}, ${C.accentDark})`, size: "large" },
  { icon: I.video, label: "Vídeo", sub: "Grave o pet em ação", color: C.danger, gradient: `linear-gradient(135deg, #E74C3C, #C0392B)`, size: "large" },
  { icon: I.mic, label: "Falar", sub: "Conte o que aconteceu", color: C.accent, gradient: `linear-gradient(135deg, ${C.accent}DD, ${C.accentDark})`, size: "normal" },
  { icon: I.ear, label: "Ouvir", sub: "Grave som do pet", color: C.petrol, gradient: `linear-gradient(135deg, ${C.petrol}, ${C.petrol}CC)`, size: "normal" },
  { icon: I.keyboard, label: "Escrever", sub: "Digite livremente", color: C.textDim, gradient: `linear-gradient(135deg, ${C.card}, ${C.bgCard})`, size: "normal", border: true },
  { icon: I.imageUp, label: "Galeria", sub: "Upload de mídia", color: C.purple, gradient: `linear-gradient(135deg, ${C.purple}, ${C.purple}CC)`, size: "normal" },
  { icon: I.scan, label: "Scanner", sub: "OCR de documentos", color: C.success, gradient: `linear-gradient(135deg, ${C.success}, ${C.success}CC)`, size: "normal" },
  { icon: I.fileText, label: "Documento", sub: "Upload PDF/arquivo", color: C.gold, gradient: `linear-gradient(135deg, ${C.gold}, ${C.gold}CC)`, size: "normal" },
];

export default function DiaryInputSelector() {
  const [tip, setTip] = useState(0);
  const tips = [
    "Tire foto da carteirinha de vacina e eu registro tudo",
    "Fotografe notas fiscais e eu controlo os gastos",
    "Grave o latido do Rex e eu analiso o humor dele",
    "Fotografe a embalagem da ração e eu monto a dieta",
    "Grave um vídeo do Rex e eu analiso a saúde dele",
  ];

  return (
    <div style={{ display:"flex", justifyContent:"center", alignItems:"center", minHeight:"100vh", padding:20, background:`radial-gradient(ellipse at 50% 0%, #162231, #0B1219 70%)`, fontFamily:font }}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Caveat:wght@400;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{ width:400, background:C.bg, borderRadius:44, overflow:"auto", boxShadow:`0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px ${C.border}` }}>
        <div style={{ display:"flex", justifyContent:"center", padding:"8px 0 0" }}><div style={{ width:120, height:28, borderRadius:20, background:"#000" }} /></div>

        {/* Header */}
        <div style={{ padding:"16px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:12, background:C.accent+"10", display:"flex", alignItems:"center", justifyContent:"center" }}>
              {I.dog(20, C.accent)}
            </div>
            <div>
              <span style={{ color:C.text, fontSize:16, fontWeight:700, fontFamily:font }}>Diário do Rex</span>
              <p style={{ color:C.textDim, fontSize:10, margin:"1px 0 0", fontFamily:font }}>O que aconteceu?</p>
            </div>
          </div>
          <button style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, width:36, height:36, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>{I.x()}</button>
        </div>

        <div style={{ padding:"0 20px 30px" }}>
          {/* Main grid — 2 large + 6 normal */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
            {entries.map((e, i) => (
              <button key={i} style={{
                padding: e.size==="large" ? "24px 16px" : "16px 14px",
                borderRadius:18, cursor:"pointer",
                background: e.gradient,
                border: e.border ? `1.5px solid ${C.border}` : "none",
                display:"flex", flexDirection:"column", alignItems:"center", gap: e.size==="large" ? 10 : 6,
                boxShadow: e.size==="large" ? `0 6px 20px ${e.color}30` : "none",
                transition:"transform 0.15s",
              }}>
                <div style={{
                  width: e.size==="large" ? 56 : 44, height: e.size==="large" ? 56 : 44,
                  borderRadius: e.size==="large" ? 18 : 14,
                  background:"rgba(255,255,255,0.15)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                }}>
                  {e.icon(e.size==="large" ? 28 : 22, "#fff")}
                </div>
                <span style={{ color:"#fff", fontSize: e.size==="large" ? 15 : 13, fontWeight:700, fontFamily:font }}>{e.label}</span>
                <span style={{ color:"rgba(255,255,255,0.7)", fontSize:10, fontFamily:font, textAlign:"center" }}>{e.sub}</span>
              </button>
            ))}
          </div>

          {/* AI tip — rotating */}
          <div onClick={() => setTip((tip+1) % tips.length)} style={{
            display:"flex", alignItems:"center", gap:10, padding:"14px 16px",
            background:C.purple+"08", borderRadius:14, border:`1px solid ${C.purple}15`, cursor:"pointer",
            marginBottom:16,
          }}>
            {I.sparkle(14, C.purple)}
            <p style={{ color:C.purple, fontSize:11, fontWeight:600, margin:0, fontFamily:font, lineHeight:1.5, flex:1 }}>
              {tips[tip]}
            </p>
            <span style={{ color:C.purple+"60", fontSize:9, fontFamily:fontMono }}>{tip+1}/{tips.length}</span>
          </div>

          {/* Quick voice bar — always visible */}
          <div style={{
            display:"flex", alignItems:"center", gap:12,
            background:C.card, border:`1.5px solid ${C.border}`, borderRadius:16,
            padding:"12px 16px",
          }}>
            <div style={{
              width:42, height:42, borderRadius:14,
              background:`linear-gradient(135deg, ${C.accent}, ${C.accentDark})`,
              display:"flex", alignItems:"center", justifyContent:"center",
              boxShadow:`0 4px 12px ${C.accent}25`, cursor:"pointer",
            }}>
              {I.mic(22, "#fff")}
            </div>
            <div style={{ flex:1 }}>
              <span style={{ color:C.textDim, fontSize:13, fontFamily:font }}>Ou fale agora...</span>
              <p style={{ color:C.textGhost, fontSize:10, margin:"2px 0 0", fontFamily:font }}>Toque no mic e conte o que aconteceu</p>
            </div>
          </div>

          {/* Recent entries hint */}
          <div style={{ marginTop:18, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
            <div style={{ width:4, height:4, borderRadius:2, background:C.success }} />
            <span style={{ color:C.textGhost, fontSize:10, fontFamily:font }}>127 memórias no diário do Rex</span>
          </div>
        </div>
        <style>{`::-webkit-scrollbar{width:0;height:0}`}</style>
      </div>
    </div>
  );
}
