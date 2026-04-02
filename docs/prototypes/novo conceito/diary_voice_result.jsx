import { useState } from "react";

const C = {
  bg: "#0F1923", bgCard: "#162231", card: "#1A2B3D",
  accent: "#E8813A", accentDark: "#CC6E2E",
  petrol: "#1B8EAD", success: "#2ECC71", danger: "#E74C3C", purple: "#9B59B6", gold: "#F39C12",
  text: "#E8EDF2", textSec: "#8FA3B8", textDim: "#5E7A94", textGhost: "#2E4254",
  border: "#1E3248", shadowAccent: "0 8px 30px rgba(232,129,58,0.25)",
};
const font = "'Sora', -apple-system, sans-serif";
const fontMono = "'JetBrains Mono', monospace";
const fontHand = "'Caveat', cursive";

const I = {
  back: (s=18,c=C.accent) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15,18 9,12 15,6"/></svg>,
  mic: (s=20,c=C.accent) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 00-3 3v6a3 3 0 006 0V5a3 3 0 00-3-3z"/><path d="M19 10v1a7 7 0 01-14 0v-1"/><line x1="12" y1="18" x2="12" y2="22"/></svg>,
  check: (s=14,c=C.success) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12"/></svg>,
  syringe: (s=18,c=C.success) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2l4 4M17 7l3-3M19 9l-8.7 8.7c-.4.4-1 .4-1.4 0L5.3 14.1c-.4-.4-.4-1 0-1.4L14 4M2 22l4-4M7 13l4 4M10 10l4 4"/></svg>,
  weight: (s=18,c=C.petrol) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a4 4 0 014 4H8a4 4 0 014-4z"/><path d="M4 7h16l-1.5 13a2 2 0 01-2 2h-9a2 2 0 01-2-2z"/></svg>,
  stethoscope: (s=18,c=C.success) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4.8 2.3A.3.3 0 105 2H4a2 2 0 00-2 2v5a6 6 0 0012 0V4a2 2 0 00-2-2h-1a.2.2 0 10.3.3"/><path d="M8 15v1a6 6 0 006 6 6 6 0 006-6v-4"/><circle cx="20" cy="10" r="2"/></svg>,
  paw: (s=18,c=C.accent) => <svg width={s} height={s} viewBox="0 0 24 24" fill={c} stroke="none"><ellipse cx="12" cy="17" rx="4.5" ry="4"/><circle cx="7" cy="10.5" r="2.2"/><circle cx="17" cy="10.5" r="2.2"/><circle cx="9.5" cy="6.5" r="1.8"/><circle cx="14.5" cy="6.5" r="1.8"/></svg>,
  sparkle: (s=12,c=C.purple) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/></svg>,
  book: (s=14,c=C.accent) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>,
  heart: (s=14,c=C.success) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
};

const items = [
  { icon: I.syringe(20,C.success), color:C.success, label:"Vacina V10", detail:"Dra. Carla · Hoje", module:"Prontuário", conf:92 },
  { icon: I.weight(20,C.petrol), color:C.petrol, label:"Peso 32kg", detail:"Medido no vet", module:"Prontuário", conf:88 },
  { icon: I.stethoscope(20,C.success), color:C.success, label:"Consulta check-up", detail:"Dra. Carla · VetBem", module:"Prontuário", conf:95 },
  { icon: I.paw(16,C.accent), color:C.accent, label:"Amigo: Golden na clínica", detail:"Interação detectada no texto", module:"Amigos", conf:72 },
];

export default function DiaryVoiceResult() {
  const [confirmed, setConfirmed] = useState({});
  const toggle = (i) => setConfirmed(p => ({ ...p, [i]: !p[i] }));

  return (
    <div style={{ display:"flex", justifyContent:"center", alignItems:"center", minHeight:"100vh", padding:20, background:`radial-gradient(ellipse at 50% 0%, #162231, #0B1219 70%)`, fontFamily:font }}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Caveat:wght@400;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{ width:400, maxHeight:820, background:C.bg, borderRadius:44, overflow:"auto", boxShadow:`0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px ${C.border}` }}>
        <div style={{ display:"flex", justifyContent:"center", padding:"8px 0 0" }}><div style={{ width:120, height:28, borderRadius:20, background:"#000" }} /></div>

        <div style={{ padding:"12px 20px 0", display:"flex", alignItems:"center", gap:12 }}>
          <button style={{ background:C.card, border:`1.5px solid ${C.border}`, borderRadius:12, width:42, height:42, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>{I.back()}</button>
          <div style={{ flex:1 }}>
            <h2 style={{ color:C.text, fontSize:16, fontWeight:700, margin:0, fontFamily:font }}>IA entendeu sua fala</h2>
            <p style={{ color:C.textDim, fontSize:10, margin:"1px 0 0", fontFamily:font }}>Diário do Rex</p>
          </div>
          {I.mic(20, C.accent)}
        </div>

        <div style={{ padding:"14px 20px 30px" }}>
          {/* Voice waveform visual */}
          <div style={{
            background:C.card, borderRadius:18, padding:"16px 18px", marginBottom:14,
            border:`1px solid ${C.accent}15`,
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
              <div style={{ width:32, height:32, borderRadius:10, background:`linear-gradient(135deg, ${C.accent}, ${C.accentDark})`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                {I.mic(16, "#fff")}
              </div>
              <div style={{ flex:1 }}>
                <span style={{ color:C.textDim, fontSize:10, fontFamily:font }}>Transcrição de voz</span>
                <span style={{ color:C.textGhost, fontSize:9, fontFamily:fontMono, marginLeft:8 }}>12s</span>
              </div>
              {I.check(14, C.success)}
            </div>
            {/* Fake waveform */}
            <div style={{ display:"flex", alignItems:"center", gap:1.5, height:28, marginBottom:12 }}>
              {Array.from({length:50}).map((_,i) => {
                const h = Math.random() * 24 + 4;
                return <div key={i} style={{ width:3, height:h, borderRadius:2, background:`${C.accent}${i<42?"60":"20"}` }} />;
              })}
            </div>
            <p style={{ color:C.text, fontSize:14, lineHeight:1.7, margin:0, fontFamily:font }}>
              "Voltei do vet com o Rex. Dra. Carla fez check-up, tomou V10, peso 32 quilos. Tudo ok. Ah, e ele fez amizade com um golden na sala de espera."
            </p>
          </div>

          {/* AI narration */}
          <div style={{
            background:C.purple+"08", borderRadius:14, padding:"12px 16px",
            border:`1px solid ${C.purple}12`, marginBottom:16,
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
              {I.sparkle(12, C.purple)}
              <span style={{ color:C.purple, fontSize:10, fontWeight:700, fontFamily:font }}>NARRAÇÃO IA</span>
            </div>
            <p style={{ color:C.text, fontSize:13, lineHeight:1.6, margin:0, fontFamily:fontHand, fontWeight:600 }}>
              "Fui no vet hoje! Levei uma picadinha mas fui corajoso. Peso 32 quilos de puro músculo. E fiz um amigo golden — ele era enorme mas gentil. Dia produtivo!"
            </p>
          </div>

          {/* Mood detected */}
          <div style={{
            display:"flex", alignItems:"center", gap:10, padding:"10px 14px",
            background:C.success+"08", borderRadius:12, border:`1px solid ${C.success}12`, marginBottom:16,
          }}>
            {I.heart(14, C.success)}
            <span style={{ color:C.success, fontSize:12, fontWeight:600, fontFamily:font }}>Humor detectado: Calmo</span>
            <span style={{ color:C.success, fontSize:10, fontFamily:fontMono, marginLeft:"auto" }}>87%</span>
          </div>

          {/* Detected items */}
          <p style={{ color:C.textGhost, fontSize:10, fontWeight:700, letterSpacing:2, margin:"0 0 10px", fontFamily:font }}>IA DETECTOU {items.length} ITENS</p>

          {items.map((it, i) => {
            const on = confirmed[i];
            return (
              <button key={i} onClick={() => toggle(i)} style={{
                width:"100%", display:"flex", alignItems:"center", gap:12,
                padding:"14px 16px", borderRadius:14, marginBottom:8, cursor:"pointer",
                background: on ? it.color+"08" : C.card,
                border:`1.5px solid ${on ? it.color+"30" : C.border}`,
                textAlign:"left", transition:"all 0.2s",
              }}>
                <div style={{ width:40, height:40, borderRadius:12, background:it.color+"12", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  {it.icon}
                </div>
                <div style={{ flex:1 }}>
                  <span style={{ color:on?it.color:C.text, fontSize:13, fontWeight:700, fontFamily:font }}>{it.label}</span>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:2 }}>
                    <span style={{ color:C.textDim, fontSize:10, fontFamily:font }}>{it.detail}</span>
                    <span style={{ color:it.color, fontSize:9, fontFamily:fontMono }}>{it.conf}%</span>
                  </div>
                </div>
                <div style={{
                  width:28, height:28, borderRadius:8,
                  background:on ? it.color+"20" : C.bgCard,
                  border:`1.5px solid ${on ? it.color+"40" : C.border}`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                }}>
                  {on && I.check(12, it.color)}
                </div>
              </button>
            );
          })}

          {/* Bottom */}
          <div style={{ display:"flex", gap:8, marginTop:14 }}>
            <button style={{
              flex:1, padding:14, borderRadius:14, cursor:"pointer",
              background:C.card, border:`1.5px solid ${C.border}`,
              color:C.textDim, fontSize:13, fontWeight:600, fontFamily:font,
              display:"flex", alignItems:"center", justifyContent:"center", gap:6,
            }}>
              {I.book(14, C.accent)} Só diário
            </button>
            <button style={{
              flex:1.5, padding:14, borderRadius:14, cursor:"pointer",
              background:`linear-gradient(135deg, ${C.accent}, ${C.accentDark})`,
              border:"none", color:"#fff", fontSize:13, fontWeight:700, fontFamily:font,
              display:"flex", alignItems:"center", justifyContent:"center", gap:6,
              boxShadow:C.shadowAccent,
            }}>
              {I.check(14, "#fff")} Salvar selecionados
            </button>
          </div>
        </div>
        <style>{`::-webkit-scrollbar{width:0;height:0}`}</style>
      </div>
    </div>
  );
}
