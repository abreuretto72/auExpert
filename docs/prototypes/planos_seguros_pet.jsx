import { useState, useRef } from "react";

// ======================== DESIGN TOKENS ========================
const C = {
  bg: "#F6F3ED", bgDeep: "#ECE7DC", cream: "#FFFDF6", warm: "#F8F4EC",
  card: "#FFFFFF", cardAlt: "#FDFAF3",
  navy: "#1E3A5F", navySoft: "#1E3A5F08", navyMed: "#1E3A5F12",
  teal: "#0E8C7F", tealSoft: "#0E8C7F08", tealMed: "#0E8C7F15", tealGlow: "#0E8C7F20",
  emerald: "#2D9E6A", emeraldSoft: "#2D9E6A08",
  sky: "#3A82C4", skySoft: "#3A82C408",
  amber: "#D4963A", amberSoft: "#D4963A08", amberWarm: "#D4963A18",
  coral: "#D06050", coralSoft: "#D0605008",
  plum: "#7E5AA8", plumSoft: "#7E5AA808",
  rose: "#C0607A", roseSoft: "#C0607A08",
  slate: "#6B7E90", slateSoft: "#6B7E9008",
  ink: "#1C2A1E", inkSec: "#485848", inkDim: "#8A9A88", inkGhost: "#B8C6B6",
  border: "#DDD8CB", borderLight: "#E6E0D5",
  shadow: "0 3px 22px rgba(28,42,30,0.06)",
  shadowMd: "0 6px 32px rgba(28,42,30,0.09)",
};
const font = "'DM Serif Display', Georgia, serif";
const fontSans = "'Nunito', -apple-system, sans-serif";
const fontMono = "'JetBrains Mono', monospace";

// ======================== ICONS ========================
const Ico = ({ type, size = 20, color = C.inkDim }) => {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" };
  const icons = {
    back: <svg {...p}><polyline points="15,18 9,12 15,6"/></svg>,
    shield: <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    shieldFill: <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    heart: <svg {...p}><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
    check: <svg {...p} strokeWidth="2.5"><polyline points="20,6 9,17 4,12"/></svg>,
    checkCircle: <svg {...p}><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>,
    x: <svg {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    plus: <svg {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    alert: <svg {...p}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    clock: <svg {...p}><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>,
    calendar: <svg {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    file: <svg {...p}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>,
    phone: <svg {...p}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>,
    dollar: <svg {...p}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
    creditCard: <svg {...p}><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
    star: <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>,
    sparkle: <svg {...p} strokeWidth="1.5"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/></svg>,
    paw: <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><ellipse cx="12" cy="17" rx="4.5" ry="4"/><circle cx="7" cy="10.5" r="2.2"/><circle cx="17" cy="10.5" r="2.2"/><circle cx="9.5" cy="6.5" r="1.8"/><circle cx="14.5" cy="6.5" r="1.8"/></svg>,
    edit: <svg {...p}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    download: <svg {...p}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
    refresh: <svg {...p}><polyline points="23,4 23,10 17,10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>,
    trending: <svg {...p}><polyline points="23,6 13.5,15.5 8.5,10.5 1,18"/><polyline points="17,6 23,6 23,12"/></svg>,
    gift: <svg {...p}><polyline points="20,12 20,22 4,22 4,12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/></svg>,
    umbrella: <svg {...p}><path d="M23 12a11.05 11.05 0 00-22 0"/><path d="M12 12v8a2 2 0 004 0"/><line x1="12" y1="2" x2="12" y2="3"/></svg>,
    activity: <svg {...p}><polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/></svg>,
    zap: <svg {...p}><polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/></svg>,
    home: <svg {...p}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>,
    flower: <svg {...p}><circle cx="12" cy="12" r="3"/><path d="M12 2a4 4 0 014 4 4 4 0 014 4 4 4 0 01-4 4 4 4 0 01-4 4 4 4 0 01-4-4 4 4 0 01-4-4 4 4 0 014-4 4 4 0 014-4z"/></svg>,
  };
  return icons[type] || null;
};

// ======================== COMPONENTS ========================
const Badge = ({ text, color, bg, icon }) => (
  <span style={{
    background: bg || color + "14", color, fontSize: 10, fontWeight: 700,
    padding: "3px 10px", borderRadius: 12, fontFamily: fontSans,
    display: "inline-flex", alignItems: "center", gap: 4,
  }}>{icon}{text}</span>
);

const StatusDot = ({ color = C.emerald }) => (
  <div style={{ width: 8, height: 8, borderRadius: 4, background: color, boxShadow: `0 0 6px ${color}40` }} />
);

// ======================== PLAN DATA ========================
const plans = [
  {
    id: "health", type: "Plano de Saúde", provider: "PetSafe Premium",
    logo: "🛡️", color: C.teal, status: "active",
    number: "PS-2024-087452", holder: "Ana Martins", pet: "Rex",
    startDate: "01/06/2024", renewDate: "01/06/2026",
    monthlyFee: "R$ 189,90", annualFee: "R$ 2.098,80",
    discount: "15% desconto Rede Solidária",
    originalFee: "R$ 223,40",
    coverage: [
      { item: "Consultas de rotina", limit: "Ilimitado", covered: true },
      { item: "Exames laboratoriais", limit: "Até R$ 2.000/ano", covered: true },
      { item: "Cirurgias", limit: "Até R$ 8.000/evento", covered: true },
      { item: "Internação", limit: "Até 5 dias/evento", covered: true },
      { item: "Emergência 24h", limit: "Ilimitado", covered: true },
      { item: "Vacinas", limit: "Protocolo completo anual", covered: true },
      { item: "Fisioterapia", limit: "10 sessões/ano", covered: true },
      { item: "Exames de imagem", limit: "Até R$ 1.500/ano", covered: true },
      { item: "Acupuntura", limit: "Não coberto", covered: false },
      { item: "Estética / Banho", limit: "Não coberto", covered: false },
    ],
    claims: [
      { date: "12/03/2026", desc: "Check-up anual + exames", value: "R$ 480,00", status: "approved", provider: "VetBem" },
      { date: "10/11/2025", desc: "Emergência — reação alérgica", value: "R$ 1.250,00", status: "approved", provider: "PetCenter" },
      { date: "05/01/2026", desc: "Ecocardiograma + Raio-X", value: "R$ 890,00", status: "approved", provider: "VetBem" },
    ],
    totalClaimed: "R$ 2.620,00",
    network: 47,
    hotline: "0800 123 4567",
  },
  {
    id: "funeral", type: "Plano Funerário", provider: "PetMemorial",
    logo: "🕊️", color: C.plum, status: "active",
    number: "PM-2025-003218", holder: "Ana Martins", pet: "Rex",
    startDate: "01/01/2025", renewDate: "01/01/2027",
    monthlyFee: "R$ 49,90", annualFee: "R$ 538,80",
    coverage: [
      { item: "Cremação individual", limit: "Incluído", covered: true },
      { item: "Urna personalizada", limit: "Incluído", covered: true },
      { item: "Remoção / Transporte", limit: "Até 50km", covered: true },
      { item: "Certificado de cremação", limit: "Incluído", covered: true },
      { item: "Memorial digital eterno", limit: "Incluído", covered: true },
      { item: "Suporte emocional ao tutor", limit: "3 sessões", covered: true },
      { item: "Cerimônia de despedida", limit: "Não incluído", covered: false },
      { item: "Sepultamento em cemitério pet", limit: "Não incluído", covered: false },
    ],
    hotline: "(15) 3456-7890",
  },
  {
    id: "wellness", type: "Plano Bem-Estar", provider: "PetClub Gold",
    logo: "✨", color: C.amber, status: "active",
    number: "PC-2025-019847", holder: "Ana Martins", pet: "Rex",
    startDate: "15/03/2025", renewDate: "15/03/2026",
    monthlyFee: "R$ 79,90", annualFee: "R$ 878,80",
    coverage: [
      { item: "Banho + tosa mensal", limit: "1x/mês", covered: true },
      { item: "Escovação profissional", limit: "Trimestral", covered: true },
      { item: "Antiparasitário mensal", limit: "Incluído", covered: true },
      { item: "Vermífugo trimestral", limit: "Incluído", covered: true },
      { item: "Suplemento nutricional", limit: "Ômega 3 mensal", covered: true },
      { item: "Hotel pet (diárias)", limit: "5 diárias/ano", covered: true },
      { item: "Daycare", limit: "Não incluído", covered: false },
    ],
    hotline: "(15) 99888-1234",
  },
  {
    id: "dental", type: "Plano Dental", provider: "OdontoPet",
    logo: "🦷", color: C.sky, status: "inactive",
    note: "Recomendado pela IA com base na idade do Rex",
    monthlyFee: "A partir de R$ 39,90",
  },
];

// ======================== PLAN DETAIL MODAL ========================
const PlanDetail = ({ plan, onClose }) => {
  const [tab, setTab] = useState("cobertura");
  const p = plan;

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 50, background: "rgba(28,42,30,0.45)", backdropFilter: "blur(10px)", display: "flex", alignItems: "flex-end" }}>
      <div style={{ background: C.bg, borderRadius: "32px 32px 0 0", width: "100%", maxHeight: "90%", overflow: "auto", padding: "0 0 30px" }}>
        {/* Header */}
        <div style={{
          background: `linear-gradient(145deg, ${p.color}, ${p.color}DD)`,
          borderRadius: "32px 32px 0 0", padding: "20px 22px", position: "relative",
        }}>
          <button onClick={onClose} style={{
            position: "absolute", top: 16, right: 16,
            background: "rgba(255,255,255,0.18)", border: "none", borderRadius: 12,
            width: 36, height: 36, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}><Ico type="x" size={18} color="#fff" /></button>

          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 18,
              background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, border: "1.5px solid rgba(255,255,255,0.2)",
            }}>{p.logo}</div>
            <div>
              <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, fontWeight: 700, letterSpacing: 0.8, margin: "0 0 4px", fontFamily: fontSans }}>{p.type.toUpperCase()}</p>
              <h2 style={{ color: "#fff", fontSize: 20, fontWeight: 700, margin: 0, fontFamily: font }}>{p.provider}</h2>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            {[
              { label: "Mensal", value: p.monthlyFee },
              { label: "Contrato", value: p.number },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, background: "rgba(255,255,255,0.1)", borderRadius: 12, padding: "10px 12px" }}>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 9, fontWeight: 700, margin: "0 0 3px" }}>{s.label}</p>
                <p style={{ color: "#fff", fontSize: 13, fontWeight: 700, margin: 0, fontFamily: fontSans }}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 5, padding: "16px 22px 0" }}>
          {[
            { id: "cobertura", label: "Cobertura" },
            ...(p.claims ? [{ id: "sinistros", label: "Sinistros" }] : []),
            { id: "dados", label: "Dados" },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: "8px", borderRadius: 10, cursor: "pointer",
              background: tab === t.id ? p.color : C.card,
              border: tab === t.id ? "none" : `1px solid ${C.border}`,
              color: tab === t.id ? "#fff" : C.inkDim,
              fontSize: 11, fontWeight: 700, fontFamily: fontSans,
            }}>{t.label}</button>
          ))}
        </div>

        <div style={{ padding: "14px 22px" }}>
          {tab === "cobertura" && p.coverage && (
            <>
              {p.coverage.filter(c => c.covered).length > 0 && (
                <>
                  <p style={{ color: C.emerald, fontSize: 10, fontWeight: 700, letterSpacing: 1, margin: "0 0 10px" }}>✅ COBERTO</p>
                  {p.coverage.filter(c => c.covered).map((c, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "11px 0",
                      borderBottom: `1px solid ${C.borderLight}`,
                    }}>
                      <div style={{ width: 26, height: 26, borderRadius: 8, background: C.emerald + "10", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Ico type="check" size={13} color={C.emerald} />
                      </div>
                      <span style={{ color: C.ink, fontSize: 13, fontWeight: 600, flex: 1, fontFamily: fontSans }}>{c.item}</span>
                      <span style={{ color: C.emerald, fontSize: 11, fontWeight: 700, fontFamily: fontSans }}>{c.limit}</span>
                    </div>
                  ))}
                </>
              )}

              {p.coverage.filter(c => !c.covered).length > 0 && (
                <>
                  <p style={{ color: C.coral, fontSize: 10, fontWeight: 700, letterSpacing: 1, margin: "18px 0 10px" }}>❌ NÃO COBERTO</p>
                  {p.coverage.filter(c => !c.covered).map((c, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "11px 0",
                      borderBottom: `1px solid ${C.borderLight}`, opacity: 0.6,
                    }}>
                      <div style={{ width: 26, height: 26, borderRadius: 8, background: C.coral + "10", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Ico type="x" size={13} color={C.coral} />
                      </div>
                      <span style={{ color: C.inkDim, fontSize: 13, fontWeight: 600, flex: 1, fontFamily: fontSans }}>{c.item}</span>
                      <span style={{ color: C.coral, fontSize: 11, fontWeight: 600 }}>{c.limit}</span>
                    </div>
                  ))}
                </>
              )}
            </>
          )}

          {tab === "sinistros" && p.claims && (
            <>
              <div style={{
                background: p.color + "08", borderRadius: 16, padding: "14px 16px", marginBottom: 16,
                border: `1px solid ${p.color}12`, display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div>
                  <p style={{ color: C.inkDim, fontSize: 10, fontWeight: 700, letterSpacing: 0.5, margin: "0 0 3px" }}>TOTAL UTILIZADO</p>
                  <p style={{ color: p.color, fontSize: 22, fontWeight: 800, margin: 0, fontFamily: fontMono }}>{p.totalClaimed}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ color: C.inkDim, fontSize: 10, margin: "0 0 3px" }}>Sinistros</p>
                  <p style={{ color: C.ink, fontSize: 18, fontWeight: 800, margin: 0 }}>{p.claims.length}</p>
                </div>
              </div>

              {p.claims.map((cl, i) => (
                <div key={i} style={{
                  background: C.card, borderRadius: 16, padding: "14px 16px", marginBottom: 10,
                  border: `1px solid ${C.border}`, borderLeft: `3px solid ${cl.status === "approved" ? C.emerald : C.amber}`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: C.ink, fontSize: 13, fontWeight: 700, fontFamily: fontSans }}>{cl.desc}</span>
                    <Badge text={cl.status === "approved" ? "Aprovado" : "Pendente"} color={cl.status === "approved" ? C.emerald : C.amber} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: C.inkDim, fontSize: 11 }}>{cl.date} · {cl.provider}</span>
                    <span style={{ color: C.teal, fontSize: 13, fontWeight: 800, fontFamily: fontMono }}>{cl.value}</span>
                  </div>
                </div>
              ))}
            </>
          )}

          {tab === "dados" && (
            <div style={{
              background: C.card, borderRadius: 18, padding: 18,
              border: `1px solid ${C.border}`,
            }}>
              {[
                { label: "Titular", value: p.holder },
                { label: "Pet", value: p.pet },
                { label: "Contrato", value: p.number },
                { label: "Início", value: p.startDate },
                { label: "Renovação", value: p.renewDate },
                { label: "Mensalidade", value: p.monthlyFee },
                { label: "Anual", value: p.annualFee },
                ...(p.hotline ? [{ label: "Central", value: p.hotline }] : []),
                ...(p.network ? [{ label: "Rede credenciada", value: `${p.network} clínicas` }] : []),
              ].map((f, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", padding: "10px 0",
                  borderBottom: i < 8 ? `1px solid ${C.borderLight}` : "none",
                }}>
                  <span style={{ color: C.inkDim, fontSize: 12, fontFamily: fontSans }}>{f.label}</span>
                  <span style={{ color: C.ink, fontSize: 12, fontWeight: 700, fontFamily: f.label === "Central" ? fontMono : fontSans }}>{f.value}</span>
                </div>
              ))}

              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button style={{
                  flex: 1, padding: "11px", borderRadius: 12, cursor: "pointer",
                  background: C.warm, border: `1px solid ${C.border}`,
                  fontFamily: fontSans, fontSize: 12, fontWeight: 700, color: C.inkSec,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}><Ico type="download" size={14} color={C.inkDim} /> Apólice PDF</button>
                <button style={{
                  flex: 1, padding: "11px", borderRadius: 12, cursor: "pointer",
                  background: C.warm, border: `1px solid ${C.border}`,
                  fontFamily: fontSans, fontSize: 12, fontWeight: 700, color: C.inkSec,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}><Ico type="phone" size={14} color={C.inkDim} /> Ligar</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ======================== MAIN APP ========================
export default function PlanosPet() {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const containerRef = useRef();

  const activePlans = plans.filter(p => p.status === "active");
  const totalMonthly = activePlans.reduce((s, p) => {
    const val = parseFloat(p.monthlyFee.replace("R$ ", "").replace(".", "").replace(",", "."));
    return s + (isNaN(val) ? 0 : val);
  }, 0);

  return (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center",
      minHeight: "100vh", padding: 20,
      background: `linear-gradient(170deg, #EBE6DC 0%, #E0DAD0 50%, #D5CFC4 100%)`,
      fontFamily: fontSans,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Nunito:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div ref={containerRef} style={{
        width: 400, maxHeight: 820, background: C.bg, borderRadius: 40,
        overflow: "auto", position: "relative",
        boxShadow: `0 20px 80px rgba(28,42,30,0.12), 0 0 0 1px ${C.border}`,
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
            <h1 style={{ color: C.ink, fontSize: 21, margin: 0, fontWeight: 700, fontFamily: font }}>Planos e Seguros</h1>
            <p style={{ color: C.inkDim, fontSize: 12, margin: "2px 0 0" }}>Proteção completa do Rex</p>
          </div>
          <button style={{
            background: C.teal, border: "none", borderRadius: 14,
            padding: "8px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
          }}>
            <Ico type="plus" size={16} color="#fff" />
            <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>Novo</span>
          </button>
        </div>

        {/* Overview Card */}
        <div style={{
          margin: "16px 20px 0", padding: "22px 20px",
          background: `linear-gradient(145deg, ${C.teal}, ${C.teal}DD)`,
          borderRadius: 24, position: "relative", overflow: "hidden",
          boxShadow: C.shadowMd,
        }}>
          <div style={{ position: "absolute", top: -30, right: -20, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />

          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 18,
              background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center",
              border: "1.5px solid rgba(255,255,255,0.15)",
            }}>
              <Ico type="shieldFill" size={26} color="rgba(255,255,255,0.85)" />
            </div>
            <div>
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 10, fontWeight: 700, letterSpacing: 1, margin: "0 0 4px" }}>PROTEÇÃO ATIVA</p>
              <p style={{ color: "#fff", fontSize: 20, fontWeight: 700, margin: 0, fontFamily: font }}>
                {activePlans.length} planos ativos
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.1)", borderRadius: 14, padding: "12px", textAlign: "center" }}>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 9, fontWeight: 700, margin: "0 0 4px" }}>GASTO MENSAL</p>
              <p style={{ color: "#fff", fontSize: 20, fontWeight: 800, margin: 0, fontFamily: fontMono }}>
                R$ {totalMonthly.toFixed(2).replace(".", ",")}
              </p>
            </div>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.1)", borderRadius: 14, padding: "12px", textAlign: "center" }}>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 9, fontWeight: 700, margin: "0 0 4px" }}>ECONOMIA RSP</p>
              <p style={{ color: "#4DD4A0", fontSize: 20, fontWeight: 800, margin: 0, fontFamily: fontMono }}>
                -R$ 33,50
              </p>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 9, margin: "2px 0 0" }}>15% desconto na rede</p>
            </div>
          </div>
        </div>

        {/* Payment Alert */}
        <div style={{
          margin: "14px 20px 0", padding: "12px 16px", borderRadius: 16,
          background: C.amber + "08", border: `1px solid ${C.amber}15`,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <Ico type="calendar" size={18} color={C.amber} />
          <div style={{ flex: 1 }}>
            <p style={{ color: C.amber, fontSize: 12, fontWeight: 700, margin: 0, fontFamily: fontSans }}>Próximo pagamento</p>
            <p style={{ color: C.inkDim, fontSize: 11, margin: "2px 0 0" }}>01/04/2026 · PetSafe Premium · R$ 189,90</p>
          </div>
          <Ico type="creditCard" size={16} color={C.amber} />
        </div>

        {/* Active Plans */}
        <div style={{ padding: "18px 20px 0" }}>
          <p style={{ color: C.inkDim, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, margin: "0 0 14px", fontFamily: fontSans }}>PLANOS ATIVOS</p>

          {activePlans.map((plan) => (
            <button key={plan.id} onClick={() => setSelectedPlan(plan)} style={{
              width: "100%", textAlign: "left", cursor: "pointer",
              background: C.card, borderRadius: 22, padding: "18px 20px",
              border: `1px solid ${C.border}`, marginBottom: 12,
              fontFamily: fontSans, boxShadow: C.shadow, transition: "all 0.2s",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                <div style={{
                  width: 50, height: 50, borderRadius: 16,
                  background: plan.color + "10", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 24, border: `1.5px solid ${plan.color}18`,
                }}>{plan.logo}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: C.ink, fontSize: 15, fontWeight: 700 }}>{plan.provider}</span>
                    <Badge text="Ativo" color={C.emerald} icon={<StatusDot color={C.emerald} />} />
                  </div>
                  <p style={{ color: C.inkDim, fontSize: 12, margin: "3px 0 0" }}>{plan.type}</p>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1, background: C.warm, borderRadius: 12, padding: "10px 12px" }}>
                  <p style={{ color: C.inkDim, fontSize: 9, fontWeight: 700, margin: "0 0 3px" }}>Mensalidade</p>
                  <p style={{ color: plan.color, fontSize: 15, fontWeight: 800, margin: 0, fontFamily: fontMono }}>{plan.monthlyFee}</p>
                </div>
                <div style={{ flex: 1, background: C.warm, borderRadius: 12, padding: "10px 12px" }}>
                  <p style={{ color: C.inkDim, fontSize: 9, fontWeight: 700, margin: "0 0 3px" }}>Renovação</p>
                  <p style={{ color: C.ink, fontSize: 13, fontWeight: 700, margin: 0 }}>{plan.renewDate}</p>
                </div>
                {plan.claims && (
                  <div style={{ flex: 1, background: C.warm, borderRadius: 12, padding: "10px 12px" }}>
                    <p style={{ color: C.inkDim, fontSize: 9, fontWeight: 700, margin: "0 0 3px" }}>Sinistros</p>
                    <p style={{ color: C.ink, fontSize: 13, fontWeight: 700, margin: 0 }}>{plan.claims.length}</p>
                  </div>
                )}
              </div>

              {/* Quick coverage preview */}
              {plan.coverage && (
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 12 }}>
                  {plan.coverage.filter(c => c.covered).slice(0, 4).map((c, i) => (
                    <span key={i} style={{
                      background: plan.color + "08", color: plan.color,
                      fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 8,
                    }}>✓ {c.item}</span>
                  ))}
                  {plan.coverage.filter(c => c.covered).length > 4 && (
                    <span style={{ color: C.inkDim, fontSize: 9, fontWeight: 600, padding: "3px 6px" }}>
                      +{plan.coverage.filter(c => c.covered).length - 4} mais
                    </span>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Suggested Plans */}
        <div style={{ padding: "6px 20px 0" }}>
          <p style={{ color: C.inkDim, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, margin: "0 0 14px", fontFamily: fontSans }}>RECOMENDADOS PELA IA</p>

          {plans.filter(p => p.status === "inactive").map((plan) => (
            <div key={plan.id} style={{
              background: C.card, borderRadius: 22, padding: "18px 20px",
              border: `2px dashed ${plan.color}25`, marginBottom: 12,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 16,
                  background: plan.color + "10", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22,
                }}>{plan.logo}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: C.ink, fontSize: 14, fontWeight: 700 }}>{plan.provider || plan.type}</span>
                    <Badge text="Sugerido" color={plan.color} icon={<Ico type="sparkle" size={10} color={plan.color} />} />
                  </div>
                  <p style={{ color: C.inkDim, fontSize: 12, margin: "3px 0 0" }}>{plan.type}</p>
                </div>
              </div>

              {plan.note && (
                <div style={{
                  background: plan.color + "06", borderRadius: 12, padding: "10px 14px",
                  border: `1px solid ${plan.color}10`, marginBottom: 12,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <Ico type="sparkle" size={13} color={plan.color} />
                    <span style={{ color: plan.color, fontSize: 11, fontWeight: 700 }}>Por que a IA recomenda</span>
                  </div>
                  <p style={{ color: C.inkSec, fontSize: 12, lineHeight: 1.6, margin: 0 }}>{plan.note}</p>
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ color: plan.color, fontSize: 15, fontWeight: 800, fontFamily: fontMono }}>{plan.monthlyFee}</span>
                <button style={{
                  padding: "9px 20px", borderRadius: 12, cursor: "pointer",
                  background: plan.color, border: "none",
                  color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: fontSans,
                }}>Conhecer Plano</button>
              </div>
            </div>
          ))}
        </div>

        {/* Cost Summary */}
        <div style={{ padding: "6px 20px 0" }}>
          <p style={{ color: C.inkDim, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, margin: "0 0 14px", fontFamily: fontSans }}>RESUMO DE CUSTOS</p>
          <div style={{
            background: C.card, borderRadius: 22, padding: 20,
            border: `1px solid ${C.border}`, boxShadow: C.shadow,
          }}>
            {activePlans.map((p, i) => {
              const val = parseFloat(p.monthlyFee.replace("R$ ", "").replace(".", "").replace(",", "."));
              const pct = (val / totalMonthly) * 100;
              return (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 14 }}>{p.logo}</span>
                      <span style={{ color: C.inkSec, fontSize: 12, fontWeight: 600 }}>{p.provider}</span>
                    </div>
                    <span style={{ color: p.color, fontSize: 12, fontWeight: 800, fontFamily: fontMono }}>{p.monthlyFee}</span>
                  </div>
                  <div style={{ height: 6, background: C.bgDeep, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, borderRadius: 3, background: `linear-gradient(90deg, ${p.color}80, ${p.color})` }} />
                  </div>
                </div>
              );
            })}

            <div style={{
              borderTop: `2px solid ${C.border}`, paddingTop: 14, marginTop: 6,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ color: C.ink, fontSize: 14, fontWeight: 700 }}>Total Mensal</span>
              <div style={{ textAlign: "right" }}>
                <p style={{ color: C.ink, fontSize: 20, fontWeight: 800, margin: 0, fontFamily: fontMono }}>
                  R$ {totalMonthly.toFixed(2).replace(".", ",")}
                </p>
                {plans[0].discount && (
                  <p style={{ color: C.emerald, fontSize: 10, fontWeight: 700, margin: "2px 0 0" }}>
                    {plans[0].discount}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Annual projection */}
        <div style={{
          margin: "16px 20px 0", padding: "16px 18px",
          background: C.teal + "06", borderRadius: 18, border: `1px solid ${C.teal}10`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Ico type="trending" size={16} color={C.teal} />
            <span style={{ color: C.teal, fontSize: 12, fontWeight: 700 }}>Projeção Anual</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ color: C.ink, fontSize: 18, fontWeight: 800, margin: 0, fontFamily: fontMono }}>
                R$ {(totalMonthly * 12).toFixed(2).replace(".", ",")}
              </p>
              <p style={{ color: C.inkDim, fontSize: 11, margin: "2px 0 0" }}>Investimento anual em proteção</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ color: C.emerald, fontSize: 14, fontWeight: 800, margin: 0, fontFamily: fontMono }}>-R$ 402,00</p>
              <p style={{ color: C.emerald, fontSize: 10, margin: "2px 0 0" }}>Economia anual RSP</p>
            </div>
          </div>
        </div>

        {/* Emergency Contacts */}
        <div style={{ padding: "18px 20px 0" }}>
          <p style={{ color: C.inkDim, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, margin: "0 0 12px" }}>CENTRAIS DE ATENDIMENTO</p>
          {activePlans.filter(p => p.hotline).map((p, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 14,
              background: C.card, borderRadius: 16, padding: "12px 16px", marginBottom: 8,
              border: `1px solid ${C.border}`,
            }}>
              <span style={{ fontSize: 20 }}>{p.logo}</span>
              <div style={{ flex: 1 }}>
                <p style={{ color: C.ink, fontSize: 13, fontWeight: 700, margin: 0 }}>{p.provider}</p>
                <p style={{ color: C.inkDim, fontSize: 11, margin: "2px 0 0", fontFamily: fontMono }}>{p.hotline}</p>
              </div>
              <button style={{
                width: 38, height: 38, borderRadius: 12, cursor: "pointer",
                background: p.color + "10", border: `1px solid ${p.color}15`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Ico type="phone" size={16} color={p.color} />
              </button>
            </div>
          ))}
        </div>

        {/* AI Insight */}
        <div style={{
          margin: "16px 20px 0", padding: 20,
          background: `linear-gradient(145deg, ${C.teal}06, ${C.amber}04)`,
          borderRadius: 22, border: `1px solid ${C.teal}10`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Ico type="sparkle" size={16} color={C.teal} />
            <span style={{ color: C.teal, fontSize: 12, fontWeight: 700 }}>ANÁLISE DA IA</span>
          </div>
          <p style={{ color: C.inkSec, fontSize: 13, lineHeight: 1.7, margin: "0 0 12px" }}>
            Rex está <span style={{ color: C.emerald, fontWeight: 700 }}>bem protegido</span> com cobertura de saúde,
            bem-estar e funerária. A IA recomenda adicionar um <span style={{ color: C.sky, fontWeight: 700 }}>plano dental</span> porque
            Labradores têm predisposição a tártaro a partir dos 3 anos. Com os pontos de
            "Proof of Love" acumulados na rede, Rex qualifica-se para um
            <span style={{ color: C.emerald, fontWeight: 700 }}> desconto adicional de 10%</span> no PetSafe Premium na próxima renovação.
          </p>
          <div style={{
            background: C.card, borderRadius: 14, padding: "12px 14px",
            border: `1px solid ${C.border}`,
          }}>
            <p style={{ color: C.inkDim, fontSize: 10, fontWeight: 700, letterSpacing: 0.5, margin: "0 0 6px" }}>ECONOMIA POTENCIAL</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: C.ink, fontSize: 13, fontFamily: fontSans }}>Com desconto "Proof of Love"</span>
              <span style={{ color: C.emerald, fontSize: 15, fontWeight: 800, fontFamily: fontMono }}>-R$ 18,99/mês</span>
            </div>
          </div>
        </div>

        {/* Rex narrative */}
        <div style={{
          margin: "16px 20px 30px", padding: "18px 20px",
          background: `linear-gradient(145deg, ${C.amber}06, ${C.cream})`,
          borderRadius: 20, border: `1px solid ${C.amber}10`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <Ico type="paw" size={15} color={C.amber} />
            <span style={{ color: C.amber, fontSize: 12, fontWeight: 700 }}>Diário do Rex</span>
          </div>
          <p style={{
            color: C.inkSec, fontSize: 15, lineHeight: 1.9, margin: 0,
            fontFamily: "'Caveat', cursive", fontStyle: "italic",
          }}>
            "Eu não sei o que é um 'plano de saúde' mas sei que toda vez que vou ao veterinário,
            o meu humano não fica preocupado com aquele papel que as pessoas chamam de 'conta'.
            Isso me deixa feliz porque significa que posso ser bem cuidado sem ninguém ficar
            stressado. E o melhor: banho e tosa todo mês! Cheiro a flores, o tempo todo! 🛁✨"
          </p>
        </div>

        {/* Plan Detail Modal */}
        {selectedPlan && <PlanDetail plan={selectedPlan} onClose={() => setSelectedPlan(null)} />}

        <style>{`::-webkit-scrollbar{width:0;height:0}`}</style>
      </div>
    </div>
  );
}
