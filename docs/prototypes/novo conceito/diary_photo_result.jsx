import { useState } from "react";

const C = {
  bg: "#0F1923", bgCard: "#162231", bgDeep: "#0B1219",
  card: "#1A2B3D", accent: "#E8813A", accentDark: "#CC6E2E",
  petrol: "#1B8EAD", success: "#2ECC71", successSoft: "#2ECC7112",
  danger: "#E74C3C", purple: "#9B59B6", gold: "#F39C12",
  text: "#E8EDF2", textSec: "#8FA3B8", textDim: "#5E7A94", textGhost: "#2E4254",
  border: "#1E3248", shadowAccent: "0 8px 30px rgba(232,129,58,0.25)",
};
const font = "'Sora', -apple-system, sans-serif";
const fontMono = "'JetBrains Mono', monospace";
const fontHand = "'Caveat', cursive";

const I = {
  back: (s=18,c=C.accent) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15,18 9,12 15,6"/></svg>,
  check: (s=14,c=C.success) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12"/></svg>,
  arrowRight: (s=14,c=C.accent) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9,6 15,12 9,18"/></svg>,
  shield: (s=18,c=C.success) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9,12 11,14 15,10"/></svg>,
  syringe: (s=18,c=C.danger) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2l4 4M17 7l3-3M19 9l-8.7 8.7c-.4.4-1 .4-1.4 0L5.3 14.1c-.4-.4-.4-1 0-1.4L14 4M2 22l4-4M7 13l4 4M10 10l4 4"/></svg>,
  receipt: (s=18,c=C.gold) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="12" y2="14"/></svg>,
  weight: (s=18,c=C.petrol) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a4 4 0 014 4H8a4 4 0 014-4z"/><path d="M4 7h16l-1.5 13a2 2 0 01-2 2h-9a2 2 0 01-2-2z"/></svg>,
  stethoscope: (s=18,c=C.success) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4.8 2.3A.3.3 0 105 2H4a2 2 0 00-2 2v5a6 6 0 0012 0V4a2 2 0 00-2-2h-1a.2.2 0 10.3.3"/><path d="M8 15v1a6 6 0 006 6 6 6 0 006-6v-4"/><circle cx="20" cy="10" r="2"/></svg>,
  sparkle: (s=12,c=C.purple) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/></svg>,
  scan: (s=20,c=C.accent) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 012-2h2"/><path d="M17 3h2a2 2 0 012 2v2"/><path d="M21 17v2a2 2 0 01-2 2h-2"/><path d="M7 21H5a2 2 0 01-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></svg>,
  book: (s=14,c=C.accent) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>,
};

// Simulating: tutor photographed a vaccine card + invoice together
const photoClassifications = [
  {
    type: "vaccine", confidence: 95, icon: I.syringe(20, C.success), color: C.success,
    label: "Vacina detectada", module: "Prontuário",
    fields: [
      { key: "Nome", value: "V10 (Polivalente)", conf: 95 },
      { key: "Lab", value: "Vanguard Plus", conf: 92 },
      { key: "Lote", value: "A2847N", conf: 88 },
      { key: "Data", value: "27/03/2026", conf: 97 },
      { key: "Vet", value: "Dra. Carla Mendes", conf: 85 },
    ],
  },
  {
    type: "consultation", confidence: 90, icon: I.stethoscope(20, C.success), color: C.success,
    label: "Consulta detectada", module: "Prontuário",
    fields: [
      { key: "Tipo", value: "Check-up anual", conf: 90 },
      { key: "Vet", value: "Dra. Carla Mendes", conf: 92 },
      { key: "Data", value: "27/03/2026", conf: 97 },
    ],
  },
  {
    type: "expense", confidence: 87, icon: I.receipt(20, C.gold), color: C.gold,
    label: "Nota fiscal detectada", module: "Gastos",
    fields: [
      { key: "Valor", value: "R$ 280,00", conf: 93 },
      { key: "Local", value: "Clínica VetBem", conf: 88 },
      { key: "Itens", value: "Consulta + Vacina V10", conf: 82 },
    ],
  },
  {
    type: "weight", confidence: 78, icon: I.weight(20, C.petrol), color: C.petrol,
    label: "Peso detectado", module: "Prontuário",
    fields: [
      { key: "Peso", value: "32,0 kg", conf: 78 },
    ],
  },
];

export default function DiaryPhotoResult() {
  const [confirmed, setConfirmed] = useState({});
  const toggleConfirm = (i) => setConfirmed(prev => ({ ...prev, [i]: !prev[i] }));
  const allConfirmed = Object.keys(confirmed).length === photoClassifications.length && Object.values(confirmed).every(v => v);

  return (
    <div style={{ display:"flex", justifyContent:"center", alignItems:"center", minHeight:"100vh", padding:20, background:`radial-gradient(ellipse at 50% 0%, #162231, #0B1219 70%)`, fontFamily:font }}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Caveat:wght@400;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{ width:400, maxHeight:820, background:C.bg, borderRadius:44, overflow:"auto", boxShadow:`0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px ${C.border}` }}>
        <div style={{ display:"flex", justifyContent:"center", padding:"8px 0 0" }}><div style={{ width:120, height:28, borderRadius:20, background:"#000" }} /></div>

        {/* Header */}
        <div style={{ padding:"12px 20px 0", display:"flex", alignItems:"center", gap:12 }}>
          <button style={{ background:C.card, border:`1.5px solid ${C.border}`, borderRadius:12, width:42, height:42, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>{I.back()}</button>
          <div style={{ flex:1 }}>
            <h2 style={{ color:C.text, fontSize:16, fontWeight:700, margin:0, fontFamily:font }}>IA analisou a foto</h2>
            <p style={{ color:C.textDim, fontSize:10, margin:"1px 0 0", fontFamily:font }}>Diário do Rex</p>
          </div>
          {I.scan(20, C.accent)}
        </div>

        <div style={{ padding:"14px 20px 30px" }}>
          {/* Photo preview */}
          <div style={{
            height:160, borderRadius:20, marginBottom:16, position:"relative", overflow:"hidden",
            background:`linear-gradient(135deg, ${C.card}, ${C.bgCard})`,
            border:`1px solid ${C.border}`,
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <div style={{ textAlign:"center" }}>
              {I.scan(36, C.accent)}
              <p style={{ color:C.textDim, fontSize:11, margin:"8px 0 0", fontFamily:font }}>Foto da carteirinha + nota fiscal</p>
            </div>
            {/* Confidence badge */}
            <div style={{
              position:"absolute", top:12, right:12, background:C.success+"18",
              border:`1px solid ${C.success}30`, borderRadius:10, padding:"4px 10px",
              display:"flex", alignItems:"center", gap:4,
            }}>
              {I.sparkle(10, C.success)}
              <span style={{ color:C.success, fontSize:10, fontWeight:700, fontFamily:fontMono }}>4 itens detectados</span>
            </div>
          </div>

          {/* AI narration preview */}
          <div style={{
            background:C.purple+"08", borderRadius:14, padding:"12px 16px",
            border:`1px solid ${C.purple}12`, marginBottom:16,
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
              {I.sparkle(12, C.purple)}
              <span style={{ color:C.purple, fontSize:10, fontWeight:700, fontFamily:font }}>NARRAÇÃO IA</span>
            </div>
            <p style={{ color:C.text, fontSize:13, lineHeight:1.6, margin:0, fontFamily:fontHand, fontWeight:600 }}>
              "Hoje fui no vet. Levei uma picadinha mas fui corajoso. A doutora disse que estou saudável e forte. 32 quilos de puro músculo e fofura!"
            </p>
          </div>

          {/* Classification cards */}
          <p style={{ color:C.textGhost, fontSize:10, fontWeight:700, letterSpacing:2, margin:"0 0 10px", fontFamily:font }}>ITENS DETECTADOS</p>

          {photoClassifications.map((cls, i) => {
            const isConfirmed = confirmed[i];
            return (
              <div key={i} style={{
                background: isConfirmed ? cls.color+"08" : C.card,
                borderRadius:16, padding:"14px 16px", marginBottom:8,
                border:`1.5px solid ${isConfirmed ? cls.color+"30" : C.border}`,
                transition:"all 0.2s",
              }}>
                {/* Header */}
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                  <div style={{ width:36, height:36, borderRadius:12, background:cls.color+"12", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {cls.icon}
                  </div>
                  <div style={{ flex:1 }}>
                    <span style={{ color:cls.color, fontSize:13, fontWeight:700, fontFamily:font }}>{cls.label}</span>
                    <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:2 }}>
                      <span style={{ color:C.textDim, fontSize:10, fontFamily:font }}>Destino: {cls.module}</span>
                      <span style={{ color:cls.color, fontSize:10, fontWeight:700, fontFamily:fontMono }}>{cls.confidence}%</span>
                    </div>
                  </div>
                  {isConfirmed && I.check(16, cls.color)}
                </div>

                {/* Fields */}
                <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:12 }}>
                  {cls.fields.map((f, j) => (
                    <div key={j} style={{
                      background:C.bgCard, borderRadius:8, padding:"6px 10px",
                      border:`1px solid ${C.border}`, flex:"1 1 calc(50% - 6px)", minWidth:120,
                    }}>
                      <span style={{ color:C.textGhost, fontSize:9, fontFamily:font, display:"block" }}>{f.key}</span>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                        <span style={{ color:C.text, fontSize:12, fontWeight:600, fontFamily:font }}>{f.value}</span>
                        <span style={{ color:f.conf>=90?C.success:f.conf>=80?C.gold:C.textDim, fontSize:9, fontFamily:fontMono }}>{f.conf}%</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <button onClick={() => toggleConfirm(i)} style={{
                  width:"100%", padding:"10px", borderRadius:10, cursor:"pointer",
                  background: isConfirmed ? cls.color+"15" : cls.color+"10",
                  border:`1px solid ${cls.color}${isConfirmed?"40":"20"}`,
                  color:cls.color, fontSize:12, fontWeight:700, fontFamily:font,
                  display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                }}>
                  {isConfirmed ? I.check(12, cls.color) : null}
                  {isConfirmed ? `Registrado no ${cls.module}` : `Registrar no ${cls.module}`}
                </button>
              </div>
            );
          })}

          {/* Bottom actions */}
          <div style={{ display:"flex", gap:8, marginTop:14 }}>
            <button style={{
              flex:1, padding:14, borderRadius:14, cursor:"pointer",
              background:C.card, border:`1.5px solid ${C.border}`,
              color:C.textDim, fontSize:13, fontWeight:600, fontFamily:font,
              display:"flex", alignItems:"center", justifyContent:"center", gap:6,
            }}>
              {I.book(14, C.accent)}
              Só salvar no diário
            </button>
            <button style={{
              flex:1.5, padding:14, borderRadius:14, cursor:"pointer",
              background:`linear-gradient(135deg, ${C.accent}, ${C.accentDark})`,
              border:"none", color:"#fff", fontSize:13, fontWeight:700, fontFamily:font,
              display:"flex", alignItems:"center", justifyContent:"center", gap:6,
              boxShadow:C.shadowAccent,
            }}>
              {I.check(14, "#fff")}
              Salvar tudo
            </button>
          </div>
        </div>
        <style>{`::-webkit-scrollbar{width:0;height:0}`}</style>
      </div>
    </div>
  );
}
