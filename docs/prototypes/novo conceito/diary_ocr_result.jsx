import { useState } from "react";

const C = {
  bg: "#0F1923", bgCard: "#162231", card: "#1A2B3D",
  accent: "#E8813A", accentDark: "#CC6E2E",
  petrol: "#1B8EAD", success: "#2ECC71", danger: "#E74C3C",
  purple: "#9B59B6", gold: "#F39C12",
  text: "#E8EDF2", textSec: "#8FA3B8", textDim: "#5E7A94", textGhost: "#2E4254",
  border: "#1E3248", shadowAccent: "0 8px 30px rgba(232,129,58,0.25)",
};
const font = "'Sora', -apple-system, sans-serif";
const fontMono = "'JetBrains Mono', monospace";

const I = {
  back: (s=18,c=C.accent) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15,18 9,12 15,6"/></svg>,
  check: (s=14,c=C.success) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12"/></svg>,
  scan: (s=22,c=C.success) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 012-2h2"/><path d="M17 3h2a2 2 0 012 2v2"/><path d="M21 17v2a2 2 0 01-2 2h-2"/><path d="M7 21H5a2 2 0 01-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></svg>,
  receipt: (s=20,c=C.gold) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="12" y2="14"/></svg>,
  sparkle: (s=12,c=C.purple) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/></svg>,
  edit: (s=12,c=C.accent) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5z"/></svg>,
};

const fields = [
  { key: "Estabelecimento", value: "Clínica VetBem", conf: 94, editable: true },
  { key: "CNPJ", value: "12.345.678/0001-90", conf: 91, editable: false },
  { key: "Data", value: "27/03/2026", conf: 98, editable: true },
  { key: "Valor Total", value: "R$ 280,00", conf: 96, highlight: true, editable: true },
];

const lineItems = [
  { desc: "Consulta veterinária", qty: "1", price: "R$ 150,00", conf: 92 },
  { desc: "Vacina V10 (Polivalente)", qty: "1", price: "R$ 130,00", conf: 88 },
];

const suggestedLinks = [
  { label: "Vincular à consulta do Rex", color: C.success, active: true },
  { label: "Vincular à vacina V10", color: C.success, active: true },
];

export default function DiaryOCRResult() {
  const [editing, setEditing] = useState(null);

  return (
    <div style={{ display:"flex", justifyContent:"center", alignItems:"center", minHeight:"100vh", padding:20, background:`radial-gradient(ellipse at 50% 0%, #162231, #0B1219 70%)`, fontFamily:font }}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{ width:400, maxHeight:820, background:C.bg, borderRadius:44, overflow:"auto", boxShadow:`0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px ${C.border}` }}>
        <div style={{ display:"flex", justifyContent:"center", padding:"8px 0 0" }}><div style={{ width:120, height:28, borderRadius:20, background:"#000" }} /></div>

        <div style={{ padding:"12px 20px 0", display:"flex", alignItems:"center", gap:12 }}>
          <button style={{ background:C.card, border:`1.5px solid ${C.border}`, borderRadius:12, width:42, height:42, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>{I.back()}</button>
          <div style={{ flex:1 }}>
            <h2 style={{ color:C.text, fontSize:16, fontWeight:700, margin:0, fontFamily:font }}>Scanner OCR</h2>
            <p style={{ color:C.textDim, fontSize:10, margin:"1px 0 0", fontFamily:font }}>Nota fiscal detectada</p>
          </div>
          {I.scan(22, C.success)}
        </div>

        <div style={{ padding:"14px 20px 30px" }}>
          {/* Document preview */}
          <div style={{
            height:140, borderRadius:18, marginBottom:14, position:"relative",
            background:`linear-gradient(135deg, ${C.card}, ${C.bgCard})`,
            border:`1.5px solid ${C.success}20`, overflow:"hidden",
          }}>
            {/* Scan lines animation visual */}
            <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"center", gap:4 }}>
              {I.receipt(36, C.gold)}
              <span style={{ color:C.textDim, fontSize:11, fontFamily:font }}>Nota Fiscal — Clínica VetBem</span>
            </div>
            <div style={{ position:"absolute", top:10, right:10, background:C.success+"18", borderRadius:8, padding:"3px 10px", display:"flex", alignItems:"center", gap:4 }}>
              {I.check(10, C.success)}
              <span style={{ color:C.success, fontSize:9, fontWeight:700, fontFamily:fontMono }}>Leitura OK</span>
            </div>
            {/* Scan corners */}
            {[{top:8,left:8},{top:8,right:8},{bottom:8,left:8},{bottom:8,right:8}].map((pos,i) => (
              <div key={i} style={{ position:"absolute", ...pos, width:20, height:20, borderRadius:2 }}>
                <div style={{ position:"absolute", top:0, left:i%2===0?0:undefined, right:i%2===1?0:undefined, width:20, height:2, background:C.success+"60" }} />
                <div style={{ position:"absolute", top:i<2?0:undefined, bottom:i>=2?0:undefined, left:i%2===0?0:undefined, right:i%2===1?0:undefined, width:2, height:20, background:C.success+"60" }} />
              </div>
            ))}
          </div>

          {/* Extracted fields */}
          <p style={{ color:C.textGhost, fontSize:10, fontWeight:700, letterSpacing:2, margin:"0 0 10px", fontFamily:font }}>DADOS EXTRAÍDOS</p>
          {fields.map((f, i) => (
            <div key={i} style={{
              display:"flex", alignItems:"center", gap:10, padding:"12px 14px",
              background: f.highlight ? C.gold+"08" : C.card,
              borderRadius:12, border:`1px solid ${f.highlight ? C.gold+"20" : C.border}`, marginBottom:6,
            }}>
              <div style={{ flex:1 }}>
                <span style={{ color:C.textGhost, fontSize:9, fontFamily:font }}>{f.key}</span>
                <p style={{ color: f.highlight ? C.gold : C.text, fontSize: f.highlight ? 18 : 14, fontWeight: f.highlight ? 800 : 600, margin:"2px 0 0", fontFamily: f.highlight ? fontMono : font }}>{f.value}</p>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ color:f.conf>=90?C.success:f.conf>=80?C.gold:C.textDim, fontSize:10, fontFamily:fontMono }}>{f.conf}%</span>
                {f.editable && (
                  <button style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:6, width:24, height:24, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {I.edit(10, C.accent)}
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Line items */}
          <p style={{ color:C.textGhost, fontSize:10, fontWeight:700, letterSpacing:2, margin:"16px 0 10px", fontFamily:font }}>ITENS DA NOTA</p>
          <div style={{ background:C.card, borderRadius:14, border:`1px solid ${C.border}`, overflow:"hidden", marginBottom:14 }}>
            {/* Header */}
            <div style={{ display:"flex", padding:"8px 14px", background:C.bgCard, borderBottom:`1px solid ${C.border}` }}>
              <span style={{ flex:3, color:C.textGhost, fontSize:9, fontWeight:700, fontFamily:font }}>Descrição</span>
              <span style={{ flex:0.5, color:C.textGhost, fontSize:9, fontWeight:700, fontFamily:font, textAlign:"center" }}>Qtd</span>
              <span style={{ flex:1, color:C.textGhost, fontSize:9, fontWeight:700, fontFamily:font, textAlign:"right" }}>Valor</span>
              <span style={{ width:30, color:C.textGhost, fontSize:9, fontFamily:font, textAlign:"right" }}>%</span>
            </div>
            {lineItems.map((it, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", padding:"10px 14px", borderBottom:i<lineItems.length-1?`1px solid ${C.border}`:"none" }}>
                <span style={{ flex:3, color:C.text, fontSize:12, fontWeight:600, fontFamily:font }}>{it.desc}</span>
                <span style={{ flex:0.5, color:C.textDim, fontSize:11, fontFamily:fontMono, textAlign:"center" }}>{it.qty}</span>
                <span style={{ flex:1, color:C.gold, fontSize:12, fontWeight:700, fontFamily:fontMono, textAlign:"right" }}>{it.price}</span>
                <span style={{ width:30, color:it.conf>=90?C.success:C.gold, fontSize:9, fontFamily:fontMono, textAlign:"right" }}>{it.conf}%</span>
              </div>
            ))}
            {/* Total */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", background:C.gold+"06", borderTop:`1px solid ${C.gold}15` }}>
              <span style={{ color:C.textDim, fontSize:12, fontWeight:700, fontFamily:font }}>Total</span>
              <span style={{ color:C.gold, fontSize:16, fontWeight:800, fontFamily:fontMono }}>R$ 280,00</span>
            </div>
          </div>

          {/* Auto-link suggestions */}
          <p style={{ color:C.textGhost, fontSize:10, fontWeight:700, letterSpacing:2, margin:"0 0 10px", fontFamily:font }}>VÍNCULOS AUTOMÁTICOS</p>
          <div style={{ background:C.purple+"06", borderRadius:14, padding:"12px 14px", border:`1px solid ${C.purple}10`, marginBottom:14 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
              {I.sparkle(12, C.purple)}
              <span style={{ color:C.purple, fontSize:10, fontWeight:700, fontFamily:font }}>IA detectou registros relacionados</span>
            </div>
            {suggestedLinks.map((lk, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 0", borderBottom:i<suggestedLinks.length-1?`1px solid ${C.border}`:"none" }}>
                {I.check(12, lk.color)}
                <span style={{ color:C.textSec, fontSize:12, fontFamily:font, flex:1 }}>{lk.label}</span>
                <span style={{ color:C.success, fontSize:9, fontWeight:700, fontFamily:font, background:C.success+"12", padding:"2px 8px", borderRadius:6 }}>Vinculado</span>
              </div>
            ))}
          </div>

          {/* Category */}
          <div style={{
            display:"flex", alignItems:"center", gap:10, padding:"12px 14px",
            background:C.card, borderRadius:12, border:`1px solid ${C.border}`, marginBottom:16,
          }}>
            <span style={{ color:C.textDim, fontSize:11, fontFamily:font }}>Categoria:</span>
            <span style={{ color:C.success, fontSize:12, fontWeight:700, fontFamily:font, background:C.success+"12", padding:"3px 10px", borderRadius:8 }}>Saúde</span>
            <span style={{ color:C.textGhost, fontSize:10, fontFamily:font, marginLeft:"auto" }}>Sugerida pela IA</span>
          </div>

          {/* Bottom */}
          <button style={{
            width:"100%", padding:16, borderRadius:14, cursor:"pointer",
            background:`linear-gradient(135deg, ${C.accent}, ${C.accentDark})`,
            border:"none", color:"#fff", fontSize:14, fontWeight:700, fontFamily:font,
            display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            boxShadow:C.shadowAccent,
          }}>
            {I.check(14, "#fff")} Registrar gasto de R$ 280,00
          </button>
          <button style={{
            width:"100%", padding:12, borderRadius:14, cursor:"pointer", marginTop:8,
            background:"transparent", border:`1.5px solid ${C.border}`,
            color:C.textDim, fontSize:12, fontWeight:600, fontFamily:font,
          }}>Só salvar no diário</button>
        </div>
        <style>{`::-webkit-scrollbar{width:0;height:0}`}</style>
      </div>
    </div>
  );
}
