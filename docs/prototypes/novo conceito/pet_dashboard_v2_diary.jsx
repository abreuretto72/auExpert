import { useState } from "react";

const C = {
  bg: "#0F1923", bgCard: "#162231", bgDeep: "#0B1219",
  card: "#1A2B3D", accent: "#E8813A", accentDark: "#CC6E2E",
  accentGlow: "#E8813A15",
  petrol: "#1B8EAD", success: "#2ECC71", successSoft: "#2ECC7112",
  danger: "#E74C3C", dangerSoft: "#E74C3C12",
  purple: "#9B59B6", gold: "#F39C12", warning: "#F1C40F",
  text: "#E8EDF2", textSec: "#8FA3B8", textDim: "#5E7A94", textGhost: "#2E4254",
  border: "#1E3248", shadowAccent: "0 8px 30px rgba(232,129,58,0.25)",
};
const font = "'Sora', -apple-system, sans-serif";
const fontMono = "'JetBrains Mono', monospace";
const fontHand = "'Caveat', cursive";

const I = {
  back: (s=18,c=C.accent) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15,18 9,12 15,6"/></svg>,
  settings: (s=18,c=C.accent) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9c.18-.47.04-1-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06c.5.37 1.35.51 1.82.33.47-.18.82-.7 1-1.51V3a2 2 0 014 0v.09c.18.81.53 1.33 1 1.51.47.18 1.32.04 1.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06c-.37.82-.51 1.35-.33 1.82.18.47.7.82 1.51 1H21a2 2 0 010 4h-.09c-.81.18-1.33.53-1.51 1z"/></svg>,
  dog: (s=32,c=C.accent) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 5.172C10 3.782 8.423 2.679 6.5 3c-2.823.47-4.113 6.006-4 7 .137 1.217.652 2 1.5 2.5V19a2 2 0 002 2h10a2 2 0 002-2v-6.328c.848-.5 1.363-1.283 1.5-2.5.113-.994-1.177-6.53-4-7C13.577 2.679 12 3.782 12 5.172V5.5"/><circle cx="8.5" cy="10" r="1" fill={c} stroke="none"/><circle cx="13.5" cy="10" r="1" fill={c} stroke="none"/></svg>,
  camera: (s=22,c="#fff") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  mic: (s=18,c="#fff") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 00-3 3v6a3 3 0 006 0V5a3 3 0 00-3-3z"/><path d="M19 10v1a7 7 0 01-14 0v-1"/><line x1="12" y1="18" x2="12" y2="22"/></svg>,
  plus: (s=20,c="#fff") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  shield: (s=16,c=C.success) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9,12 11,14 15,10"/></svg>,
  utensils: (s=16,c=C.petrol) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg>,
  receipt: (s=16,c=C.gold) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="12" y2="14"/></svg>,
  paw: (s=16,c=C.accent) => <svg width={s} height={s} viewBox="0 0 24 24" fill={c} stroke="none"><ellipse cx="12" cy="17" rx="4.5" ry="4"/><circle cx="7" cy="10.5" r="2.2"/><circle cx="17" cy="10.5" r="2.2"/><circle cx="9.5" cy="6.5" r="1.8"/><circle cx="14.5" cy="6.5" r="1.8"/></svg>,
  trophy: (s=16,c=C.gold) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22M18 2H6v7a6 6 0 0012 0V2z"/></svg>,
  heart: (s=16,c=C.danger) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
  sparkle: (s=12,c=C.purple) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/></svg>,
  arrowRight: (s=12,c=C.accent) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9,6 15,12 9,18"/></svg>,
  syringe: (s=12,c=C.danger) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2l4 4M17 7l3-3M19 9l-8.7 8.7c-.4.4-1 .4-1.4 0L5.3 14.1c-.4-.4-.4-1 0-1.4L14 4M2 22l4-4M7 13l4 4M10 10l4 4"/></svg>,
  more: (s=16,c=C.textDim) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="1" fill={c}/><circle cx="19" cy="12" r="1" fill={c}/><circle cx="5" cy="12" r="1" fill={c}/></svg>,
};

const diaryFilter = ["Tudo","Momentos","Saúde","IA","Marcos"];

const diaryEntries = [
  { time:"Hoje 16:45", text:"Corri no parque com o Thor. Corremos tanto que minhas patas ficaram todas sujas. Mas foi INCRÍVEL!", mood:"Feliz", moodColor:C.success, tags:["Momento","Amigos"], hasPhoto:true },
  { time:"Hoje 10:00", text:"Fui no vet hoje. Levei uma picadinha mas fui corajoso. A doutora disse que estou saudável.", mood:"Calmo", moodColor:C.petrol, tags:["Saúde","Vacina"], modules:["Prontuário","Gastos"] },
  { time:"Ontem 18:30", text:"O papai comprou ração nova! Cheira diferente. Aprovei em 3 segundos. Quero mais.", mood:"Feliz", moodColor:C.success, tags:["Nutrição"], modules:["Nutrição"] },
  { time:"Ontem 14:00", text:"Fiquei sozinho e latei muito. Depois dormi no sofá. Quando o papai voltou, fingi que estava dormindo.", mood:"Ansioso", moodColor:C.warning, tags:["IA","Humor"] },
];

const lenses = [
  { icon: I.shield(16,C.success), label:"Prontuário", badge:"2", badgeColor:C.danger, color:C.success },
  { icon: I.utensils(16,C.petrol), label:"Nutrição", badge:null, color:C.petrol },
  { icon: I.receipt(16,C.gold), label:"Gastos", badge:"R$910", badgeColor:C.gold, color:C.gold },
  { icon: I.paw(14,C.accent), label:"Amigos", badge:"5", badgeColor:C.accent, color:C.accent },
  { icon: I.trophy(16,C.gold), label:"Conquistas", badge:"12", badgeColor:C.gold, color:C.gold },
  { icon: I.heart(16,C.danger), label:"Felicidade", badge:null, color:C.danger },
  { icon: I.more(16,C.textDim), label:"Mais...", badge:null, color:C.textDim },
];

export default function PetDashboardV2() {
  const [filter, setFilter] = useState(0);

  return (
    <div style={{ display:"flex", justifyContent:"center", alignItems:"center", minHeight:"100vh", padding:20, background:`radial-gradient(ellipse at 50% 0%, #162231, #0B1219 70%)`, fontFamily:font }}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Caveat:wght@400;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{ width:400, maxHeight:820, background:C.bg, borderRadius:44, overflow:"auto", position:"relative", boxShadow:`0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px ${C.border}` }}>
        <div style={{ display:"flex", justifyContent:"center", padding:"8px 0 0" }}><div style={{ width:120, height:28, borderRadius:20, background:"#000" }} /></div>

        {/* Header */}
        <div style={{ padding:"12px 20px 0", display:"flex", alignItems:"center", gap:12 }}>
          <button style={{ background:C.card, border:`1.5px solid ${C.border}`, borderRadius:12, width:42, height:42, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>{I.back()}</button>
          <div style={{ flex:1 }}>
            <h2 style={{ color:C.text, fontSize:20, fontWeight:800, margin:0, fontFamily:font }}>Rex</h2>
            <p style={{ color:C.textDim, fontSize:11, margin:"1px 0 0", fontFamily:font }}>Labrador Retriever · 3 anos</p>
          </div>
          <button style={{ background:C.card, border:`1.5px solid ${C.border}`, borderRadius:12, width:42, height:42, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>{I.settings()}</button>
        </div>

        {/* Pet hero + quick stats */}
        <div style={{ padding:"16px 20px 0", display:"flex", alignItems:"center", gap:16 }}>
          <div style={{
            width:72, height:72, borderRadius:24, background:C.bgCard,
            border:`2.5px solid ${C.accent}25`, display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            {I.dog(36, C.accent)}
          </div>
          <div style={{ display:"flex", gap:8, flex:1 }}>
            {[
              { label:"Saúde", value:"92", color:C.success, icon:I.shield(14,C.success) },
              { label:"Humor", value:"Feliz", color:C.success, dot:true },
              { label:"Diário", value:"127", color:C.accent, icon:I.sparkle(10,C.accent) },
            ].map((s,i) => (
              <div key={i} style={{ flex:1, background:C.card, borderRadius:14, padding:"10px 6px", textAlign:"center", border:`1px solid ${C.border}` }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:4, marginBottom:4 }}>
                  {s.icon}
                  {s.dot && <div style={{ width:6, height:6, borderRadius:3, background:s.color }} />}
                  <span style={{ color:s.color, fontSize:14, fontWeight:800, fontFamily:fontMono }}>{s.value}</span>
                </div>
                <span style={{ color:C.textDim, fontSize:8, fontFamily:font }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Vaccine alert */}
        <button style={{
          display:"flex", width:"calc(100% - 40px)", margin:"12px 20px 0",
          padding:"10px 14px", borderRadius:12,
          background:C.dangerSoft, border:`1px solid ${C.danger}18`,
          alignItems:"center", gap:10, cursor:"pointer", fontFamily:font,
        }}>
          {I.syringe(12, C.danger)}
          <span style={{ color:C.danger, fontSize:11, fontWeight:700, flex:1 }}>2 vacinas vencidas</span>
          {I.arrowRight(12, C.danger)}
        </button>

        {/* DIARY — protagonist section */}
        <div style={{ padding:"18px 20px 0" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
            <p style={{ color:C.textGhost, fontSize:10, fontWeight:700, letterSpacing:2, margin:0, fontFamily:font }}>DIÁRIO DO REX</p>
            <span style={{ color:C.textDim, fontSize:10, fontFamily:font }}>127 memórias</span>
          </div>

          {/* Diary filters */}
          <div style={{ display:"flex", gap:5, marginBottom:14, overflowX:"auto", paddingBottom:2 }}>
            {diaryFilter.map((f,i) => (
              <button key={i} onClick={() => setFilter(i)} style={{
                padding:"6px 12px", borderRadius:8, cursor:"pointer", whiteSpace:"nowrap",
                background:filter===i?C.accent+"12":C.card,
                border:`1px solid ${filter===i?C.accent+"25":C.border}`,
                color:filter===i?C.accent:C.textDim, fontSize:10, fontWeight:600, fontFamily:font,
              }}>{f}</button>
            ))}
          </div>

          {/* Diary entries */}
          <div style={{ position:"relative" }}>
            {/* Timeline line */}
            <div style={{ position:"absolute", left:5, top:8, bottom:8, width:2, background:`linear-gradient(to bottom, ${C.accent}30, ${C.border}, transparent)` }} />

            {diaryEntries.map((e, i) => (
              <div key={i} style={{ position:"relative", paddingLeft:24, marginBottom:12 }}>
                {/* Dot */}
                <div style={{ position:"absolute", left:0, top:6, width:12, height:12, borderRadius:6, background:C.bg, border:`2px solid ${e.moodColor}`, zIndex:2 }}>
                  <div style={{ width:4, height:4, borderRadius:2, background:e.moodColor, margin:"2px auto" }} />
                </div>
                {/* Card */}
                <div style={{ background:C.card, borderRadius:14, padding:"12px 14px", border:`1px solid ${C.border}` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
                    <span style={{ color:C.textDim, fontSize:9, fontFamily:fontMono }}>{e.time}</span>
                    <div style={{ display:"flex", alignItems:"center", gap:3, background:e.moodColor+"12", padding:"1px 6px", borderRadius:4 }}>
                      <div style={{ width:4, height:4, borderRadius:2, background:e.moodColor }} />
                      <span style={{ color:e.moodColor, fontSize:8, fontWeight:700, fontFamily:font }}>{e.mood}</span>
                    </div>
                    {e.hasPhoto && <span style={{ color:C.purple, fontSize:8, fontWeight:600, fontFamily:font, background:C.purple+"10", padding:"1px 6px", borderRadius:4 }}>foto</span>}
                  </div>
                  <p style={{ color:C.text, fontSize:12, lineHeight:1.6, margin:"0 0 6px", fontFamily:fontHand, fontWeight:500, fontSize:13 }}>{e.text}</p>
                  <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                    {e.tags.map((t,j) => <span key={j} style={{ color:C.textGhost, fontSize:8, background:C.bgCard, padding:"2px 6px", borderRadius:4, fontFamily:font }}>{t}</span>)}
                    {e.modules && e.modules.map((m,j) => <span key={j} style={{ color:C.success, fontSize:8, background:C.success+"08", padding:"2px 6px", borderRadius:4, fontFamily:font }}>{m}</span>)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* LENSES — consultation modules */}
        <div style={{ padding:"12px 20px 0" }}>
          <p style={{ color:C.textGhost, fontSize:10, fontWeight:700, letterSpacing:2, margin:"0 0 10px", fontFamily:font }}>LENTES DO REX</p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:8, marginBottom:24 }}>
            {lenses.map((l,i) => (
              <button key={i} style={{
                background:C.card, borderRadius:14, padding:"14px 6px", cursor:"pointer",
                border:`1px solid ${C.border}`, display:"flex", flexDirection:"column",
                alignItems:"center", gap:6, position:"relative",
              }}>
                <div style={{ width:36, height:36, borderRadius:12, background:l.color+"10", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {l.icon}
                </div>
                <span style={{ color:C.textDim, fontSize:9, fontWeight:600, fontFamily:font }}>{l.label}</span>
                {l.badge && (
                  <div style={{
                    position:"absolute", top:6, right:6,
                    background:l.badgeColor+"18", border:`1px solid ${l.badgeColor}30`,
                    borderRadius:6, padding:"1px 5px", minWidth:16, textAlign:"center",
                  }}>
                    <span style={{ color:l.badgeColor, fontSize:8, fontWeight:700, fontFamily:fontMono }}>{l.badge}</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* FAB — the entry point */}
        <button style={{
          position:"sticky", bottom:20, float:"right", marginRight:20,
          width:60, height:60, borderRadius:20, cursor:"pointer",
          background:`linear-gradient(135deg, ${C.accent}, ${C.accentDark})`,
          border:"none", display:"flex", alignItems:"center", justifyContent:"center",
          boxShadow:`0 8px 30px ${C.accent}40`, zIndex:10,
        }}>
          {I.camera(24, "#fff")}
        </button>

        <div style={{ height:20 }} />
        <style>{`::-webkit-scrollbar{width:0;height:0}`}</style>
      </div>
    </div>
  );
}
