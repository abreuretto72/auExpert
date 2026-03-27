import { useState, useRef } from "react";

const C = {
  bg: "#FBF8F4", bgWarm: "#F5EFE7", card: "#FFFFFF", cardAlt: "#FDFAF6",
  primary: "#E8734A", primarySoft: "#E8734A12", primaryDark: "#C45A35",
  green: "#4CAF82", greenSoft: "#4CAF8210", greenMed: "#4CAF8225",
  amber: "#E9A23B", amberSoft: "#E9A23B10",
  red: "#E85454", redSoft: "#E8545410",
  blue: "#4A8FE8", blueSoft: "#4A8FE810",
  pink: "#D4699E", pinkSoft: "#D4699E10",
  purple: "#7E5FD6", purpleSoft: "#7E5FD610",
  teal: "#2AA89A", tealSoft: "#2AA89A10",
  text: "#2C2416", textSec: "#6B5D4F", textDim: "#A89B8C",
  border: "#EDE6DB", borderLight: "#F3EDE4",
  shadow: "0 2px 16px rgba(44,36,22,0.06)",
};

const font = "'Nunito', -apple-system, sans-serif";

// ====== ICONS ======
const Ico = ({ type, size = 20, color = C.textSec }) => {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" };
  const icons = {
    back: <svg {...p}><polyline points="15,18 9,12 15,6"/></svg>,
    share: <svg {...p}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
    qr: <svg {...p}><rect x="2" y="2" width="8" height="8" rx="1"/><rect x="14" y="2" width="8" height="8" rx="1"/><rect x="2" y="14" width="8" height="8" rx="1"/><rect x="14" y="14" width="4" height="4"/><line x1="22" y1="18" x2="22" y2="22"/><line x1="18" y1="22" x2="22" y2="22"/></svg>,
    check: <svg {...p} strokeWidth="2.5"><polyline points="20,6 9,17 4,12"/></svg>,
    alert: <svg {...p}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    clock: <svg {...p}><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>,
    plus: <svg {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    edit: <svg {...p}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    camera: <svg {...p}><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>,
    download: <svg {...p}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
    printer: <svg {...p}><polyline points="6,9 6,2 18,2 18,9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
    shield: <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    heart: <svg {...p}><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
    activity: <svg {...p}><polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/></svg>,
    eye: <svg {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    droplet: <svg {...p}><path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/></svg>,
    thermometer: <svg {...p}><path d="M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z"/></svg>,
    pill: <svg {...p}><path d="M10.5 1.5L3.5 8.5a4.95 4.95 0 007 7l7-7a4.95 4.95 0 00-7-7z"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
    scissors: <svg {...p}><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>,
    weight: <svg {...p}><path d="M12 3a4 4 0 014 4H8a4 4 0 014-4z"/><path d="M4 7h16l-1.5 13a2 2 0 01-2 2h-9a2 2 0 01-2-2z"/></svg>,
    brain: <svg {...p}><path d="M12 2a5 5 0 015 5c0 1.5-.7 2.8-1.7 3.7A5 5 0 0120 15a5 5 0 01-3 4.6V22h-2v-2h-6v2H7v-2.4A5 5 0 014 15a5 5 0 014.7-4.3A5 5 0 017 7a5 5 0 015-5z"/></svg>,
    paw: <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><ellipse cx="12" cy="17" rx="4.5" ry="4"/><circle cx="7" cy="10.5" r="2.2"/><circle cx="17" cy="10.5" r="2.2"/><circle cx="9.5" cy="6.5" r="1.8"/><circle cx="14.5" cy="6.5" r="1.8"/></svg>,
  };
  return icons[type] || null;
};

// ====== SHARED COMPONENTS ======
const Badge = ({ text, color = C.primary, bg, big }) => (
  <span style={{
    background: bg || color + "14", color, fontSize: big ? 13 : 11, fontWeight: 700,
    padding: big ? "5px 14px" : "3px 10px", borderRadius: 20, letterSpacing: 0.2, fontFamily: font,
  }}>{text}</span>
);

const SectionTitle = ({ children, right, icon, iconColor }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "24px 0 12px" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {icon && <Ico type={icon} size={16} color={iconColor || C.primary} />}
      <span style={{ color: C.textDim, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", fontFamily: font }}>{children}</span>
    </div>
    {right}
  </div>
);

const MiniBar = ({ value, max = 100, color, h = 6 }) => (
  <div style={{ height: h, background: C.bgWarm, borderRadius: h, overflow: "hidden", flex: 1 }}>
    <div style={{ height: "100%", width: `${(value / max) * 100}%`, borderRadius: h, background: `linear-gradient(90deg, ${color}90, ${color})`, transition: "width 0.8s ease" }} />
  </div>
);

const CircleScore = ({ value, color, size = 72, label, sub }) => {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.bgWarm} strokeWidth="5" />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1.2s ease" }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color, fontSize: size * 0.26, fontWeight: 800, fontFamily: font }}>{value}</span>
        </div>
      </div>
      {label && <span style={{ color: C.text, fontSize: 11, fontWeight: 700, marginTop: 6, fontFamily: font }}>{label}</span>}
      {sub && <span style={{ color: C.textDim, fontSize: 10, marginTop: 1, fontFamily: font }}>{sub}</span>}
    </div>
  );
};

// Simple weight chart
const WeightChart = ({ data }) => {
  const max = Math.max(...data.map(d => d.v));
  const min = Math.min(...data.map(d => d.v));
  const range = max - min || 1;
  const h = 100;
  const w = 280;
  const pad = 10;
  const points = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((d.v - min) / range) * (h - pad * 2);
    return { x, y, ...d };
  });
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const area = `${line} L${points[points.length-1].x},${h-pad} L${points[0].x},${h-pad} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h + 20}`} style={{ width: "100%", height: "auto" }}>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
        const y = h - pad - f * (h - pad * 2);
        return <line key={i} x1={pad} y1={y} x2={w - pad} y2={y} stroke={C.border} strokeWidth="0.5" />;
      })}
      {/* Area */}
      <path d={area} fill={`url(#wg)`} />
      <defs>
        <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.green} stopOpacity="0.2" />
          <stop offset="100%" stopColor={C.green} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {/* Line */}
      <path d={line} fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Dots + Labels */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill={C.card} stroke={C.green} strokeWidth="2.5" />
          <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="9" fontWeight="700" fill={C.green} fontFamily={font}>{p.v}kg</text>
          <text x={p.x} y={h + 14} textAnchor="middle" fontSize="8" fill={C.textDim} fontFamily={font}>{p.label}</text>
        </g>
      ))}
    </svg>
  );
};

// ====== MAIN SCREEN ======
export default function ProntuarioSaude() {
  const [activeTab, setActiveTab] = useState("geral");
  const [expandedVax, setExpandedVax] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const containerRef = useRef();

  const tabs = [
    { id: "geral", label: "Geral" },
    { id: "vacinas", label: "Vacinas" },
    { id: "exames", label: "Exames" },
    { id: "remedios", label: "Remédios" },
    { id: "consultas", label: "Consultas" },
    { id: "cirurgias", label: "Cirurgias" },
  ];

  const vaccines = [
    { name: "V10 (Polivalente)", lab: "Vanguard Plus", batch: "A2847N", vet: "Dra. Carla Mendes", clinic: "Clínica VetBem", date: "15/01/2026", next: "15/01/2027", status: "ok", dose: "3ª dose" },
    { name: "Antirrábica", lab: "Defensor", batch: "R9812K", vet: "Dr. Paulo Freitas", clinic: "PetCenter Salto", date: "20/03/2025", next: "20/03/2026", status: "overdue", dose: "Reforço anual" },
    { name: "Giárdia", lab: "GiardiaVax", batch: "G4421B", vet: "Dra. Carla Mendes", clinic: "Clínica VetBem", date: "10/06/2025", next: "10/12/2025", status: "overdue", dose: "2ª dose" },
    { name: "Gripe Canina", lab: "Bronchi-Shield", batch: "BS773M", vet: "Dra. Carla Mendes", clinic: "Clínica VetBem", date: "05/09/2025", next: "05/09/2026", status: "ok", dose: "Reforço anual" },
    { name: "Leishmaniose", lab: "Leish-Tec", batch: "LT102X", vet: "Dr. Paulo Freitas", clinic: "PetCenter Salto", date: "01/02/2026", next: "01/02/2027", status: "ok", dose: "Reforço anual" },
  ];

  const exams = [
    { name: "Hemograma Completo", date: "12/03/2026", status: "normal", results: [
      { item: "Hemácias", val: "6.8", ref: "5.5-8.5 M/µL", ok: true },
      { item: "Hemoglobina", val: "15.2", ref: "12-18 g/dL", ok: true },
      { item: "Leucócitos", val: "11.400", ref: "6.000-17.000 /µL", ok: true },
      { item: "Plaquetas", val: "285.000", ref: "200.000-500.000 /µL", ok: true },
    ]},
    { name: "Bioquímico Hepático", date: "12/03/2026", status: "attention", results: [
      { item: "ALT (TGP)", val: "92", ref: "10-88 U/L", ok: false },
      { item: "FA", val: "145", ref: "20-150 U/L", ok: true },
      { item: "Albumina", val: "3.1", ref: "2.6-4.0 g/dL", ok: true },
    ]},
    { name: "Urinálise", date: "12/03/2026", status: "normal", results: [
      { item: "pH", val: "6.5", ref: "5.5-7.5", ok: true },
      { item: "Proteína", val: "Neg", ref: "Negativo", ok: true },
      { item: "Densidade", val: "1.035", ref: "1.015-1.045", ok: true },
    ]},
    { name: "Ecocardiograma", date: "05/01/2026", status: "normal", results: [] },
    { name: "Raio-X Torácico", date: "05/01/2026", status: "normal", results: [] },
  ];

  const medications = [
    { name: "Simparic 40mg", type: "Antiparasitário", freq: "Mensal", start: "01/01/2026", end: "Contínuo", active: true, notes: "Pulgas e carrapatos. Dar com alimento." },
    { name: "Ômega 3 (1000mg)", type: "Suplemento", freq: "Diário", start: "15/03/2026", end: "15/06/2026", active: true, notes: "Recomendado pela IA — ressecamento do pelo na região lombar." },
    { name: "Drontal Plus", type: "Vermífugo", freq: "Trimestral", start: "01/03/2026", end: "Próxima: 01/06/2026", active: true, notes: "Vermifugação de rotina." },
    { name: "Prednisolona 20mg", type: "Anti-inflamatório", freq: "2x/dia por 7 dias", start: "10/11/2025", end: "17/11/2025", active: false, notes: "Reação alérgica a picada de inseto." },
  ];

  const consultations = [
    { date: "12/03/2026", vet: "Dra. Carla Mendes", clinic: "Clínica VetBem", type: "Check-up anual", summary: "Exames de sangue e urina realizados. ALT levemente elevado — repetir em 30 dias. Peso ideal. Pelo com leve ressecamento, suplementar ômega 3.", color: C.green },
    { date: "10/11/2025", vet: "Dr. Paulo Freitas", clinic: "PetCenter Salto", type: "Emergência", summary: "Reação alérgica severa a picada de inseto. Edema no focinho. Tratamento com prednisolona por 7 dias. Evolução satisfatória.", color: C.red },
    { date: "05/01/2026", vet: "Dra. Carla Mendes", clinic: "Clínica VetBem", type: "Cardiologia", summary: "Ecocardiograma e raio-X torácico normais. Sem sopros ou arritmias. Coração saudável.", color: C.blue },
  ];

  const surgeries = [
    { name: "Castração (Orquiectomia)", date: "15/08/2024", vet: "Dra. Carla Mendes", clinic: "Clínica VetBem", anesthesia: "Isoflurano + Propofol", notes: "Procedimento sem intercorrências. Recuperação em 10 dias. Pontos reabsorvíveis.", status: "Recuperado" },
    { name: "Remoção de corpo estranho", date: "02/05/2025", vet: "Dr. Paulo Freitas", clinic: "PetCenter Salto", anesthesia: "Isoflurano", notes: "Ingestão de meia de borracha. Gastrotomia. Recuperação em 14 dias.", status: "Recuperado" },
  ];

  const allergies = [
    { name: "Picada de inseto", severity: "Alta", reaction: "Edema facial", color: C.red },
    { name: "Frango (suspeita)", severity: "Baixa", reaction: "Coceira leve", color: C.amber },
  ];

  const weightData = [
    { v: 28, label: "Jul" }, { v: 29.5, label: "Ago" }, { v: 30, label: "Set" },
    { v: 31.2, label: "Out" }, { v: 31.8, label: "Nov" }, { v: 32.5, label: "Dez" },
    { v: 32, label: "Jan" }, { v: 31.5, label: "Fev" }, { v: 32, label: "Mar" },
  ];

  // ====== QR MODAL ======
  const QRModal = () => (
    <div style={{
      position: "absolute", inset: 0, zIndex: 50,
      background: "rgba(44,36,22,0.5)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 30,
    }} onClick={() => setShowQR(false)}>
      <div onClick={e => e.stopPropagation()} style={{
        background: C.card, borderRadius: 28, padding: 32, width: "100%",
        textAlign: "center", boxShadow: C.shadowLg,
      }}>
        <div style={{
          width: 160, height: 160, borderRadius: 20, margin: "0 auto 20px",
          background: C.bg, border: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative",
        }}>
          {/* QR pattern */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(9,1fr)", gap: 2, width: 110, height: 110 }}>
            {Array.from({ length: 81 }).map((_, i) => {
              const row = Math.floor(i / 9), col = i % 9;
              const isCorner = (row < 3 && col < 3) || (row < 3 && col > 5) || (row > 5 && col < 3);
              const isFill = isCorner || Math.random() > 0.45;
              return <div key={i} style={{ borderRadius: 2, background: isFill ? C.text : C.bgWarm }} />;
            })}
          </div>
          <div style={{
            position: "absolute", background: C.card, borderRadius: 10, padding: 4,
            boxShadow: C.shadow,
          }}>
            <Ico type="paw" size={22} color={C.primary} />
          </div>
        </div>
        <h3 style={{ color: C.text, fontSize: 18, fontWeight: 800, margin: "0 0 6px", fontFamily: font }}>Prontuário do Rex</h3>
        <p style={{ color: C.textDim, fontSize: 13, margin: "0 0 20px", lineHeight: 1.5 }}>
          Escaneie para acessar o histórico completo de saúde. Válido por 24h.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{
            flex: 1, padding: "12px", borderRadius: 14, cursor: "pointer",
            background: C.bg, border: `1px solid ${C.border}`, fontFamily: font,
            fontSize: 13, fontWeight: 700, color: C.text,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}><Ico type="download" size={16} color={C.text} /> PDF</button>
          <button style={{
            flex: 1, padding: "12px", borderRadius: 14, cursor: "pointer",
            background: C.primary, border: "none", fontFamily: font,
            fontSize: 13, fontWeight: 700, color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}><Ico type="share" size={16} color="#fff" /> Enviar</button>
        </div>
      </div>
    </div>
  );

  // ====== TAB: GERAL ======
  const TabGeral = () => (
    <>
      {/* AI Health Score */}
      <div style={{
        background: C.card, borderRadius: 24, padding: 22, marginBottom: 16,
        border: `1px solid ${C.border}`, boxShadow: C.shadow,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
          <Ico type="brain" size={18} color={C.primary} />
          <span style={{ color: C.primary, fontSize: 13, fontWeight: 700, fontFamily: font }}>Score de Saúde IA</span>
          <span style={{ color: C.textDim, fontSize: 11, marginLeft: "auto" }}>Atualizado hoje</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 18 }}>
          <CircleScore value={92} color={C.green} size={78} label="Geral" sub="Excelente" />
          <CircleScore value={100} color={C.green} size={62} label="Vacinas" sub="3/5 em dia" />
          <CircleScore value={85} color={C.amber} size={62} label="Exames" sub="ALT elevado" />
          <CircleScore value={95} color={C.green} size={62} label="Peso" sub="Ideal" />
        </div>
        <div style={{
          background: C.amberSoft, borderRadius: 14, padding: "12px 14px",
          border: `1px solid ${C.amber}15`, display: "flex", alignItems: "flex-start", gap: 10,
        }}>
          <Ico type="alert" size={18} color={C.amber} />
          <div>
            <p style={{ color: C.text, fontSize: 12, fontWeight: 700, margin: "0 0 2px", fontFamily: font }}>2 pontos de atenção</p>
            <p style={{ color: C.textSec, fontSize: 12, margin: 0, lineHeight: 1.5 }}>
              Antirrábica e Giárdia vencidas · ALT (TGP) levemente acima do normal
            </p>
          </div>
        </div>
      </div>

      {/* Pet Info Card */}
      <div style={{
        background: C.card, borderRadius: 22, padding: 18, marginBottom: 16,
        border: `1px solid ${C.border}`, boxShadow: C.shadow,
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { label: "Espécie", value: "Canino", emoji: "🐕" },
            { label: "Raça", value: "Labrador Retriever" },
            { label: "Nascimento", value: "12/03/2023" },
            { label: "Idade", value: "3 anos" },
            { label: "Sexo", value: "Macho (Castrado)" },
            { label: "Peso atual", value: "32 kg" },
            { label: "Microchip", value: "985...4721" },
            { label: "Tipo sanguíneo", value: "DEA 1.1 Neg" },
          ].map((f, i) => (
            <div key={i} style={{ background: C.bg, borderRadius: 14, padding: "10px 14px" }}>
              <p style={{ color: C.textDim, fontSize: 10, margin: 0, fontWeight: 600, letterSpacing: 0.3 }}>{f.label}</p>
              <p style={{ color: C.text, fontSize: 13, fontWeight: 700, margin: "3px 0 0", fontFamily: font }}>{f.value} {f.emoji || ""}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Allergies */}
      <SectionTitle icon="alert" iconColor={C.red}>Alergias e Sensibilidades</SectionTitle>
      <div style={{ display: "flex", gap: 10 }}>
        {allergies.map((a, i) => (
          <div key={i} style={{
            flex: 1, background: C.card, borderRadius: 16, padding: "14px 16px",
            border: `1px solid ${C.border}`, borderLeft: `3px solid ${a.color}`,
          }}>
            <p style={{ color: C.text, fontSize: 13, fontWeight: 700, margin: "0 0 4px", fontFamily: font }}>{a.name}</p>
            <p style={{ color: C.textDim, fontSize: 11, margin: "0 0 6px" }}>{a.reaction}</p>
            <Badge text={`Risco ${a.severity}`} color={a.color} />
          </div>
        ))}
      </div>

      {/* Weight Chart */}
      <SectionTitle icon="weight" iconColor={C.green}>Evolução do Peso</SectionTitle>
      <div style={{
        background: C.card, borderRadius: 22, padding: "18px 14px 10px",
        border: `1px solid ${C.border}`, boxShadow: C.shadow,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 6px", marginBottom: 8 }}>
          <div>
            <span style={{ color: C.text, fontSize: 22, fontWeight: 800, fontFamily: font }}>32 kg</span>
            <span style={{ color: C.green, fontSize: 12, fontWeight: 600, marginLeft: 8 }}>Peso ideal ✓</span>
          </div>
          <Badge text="Faixa: 29-34 kg" color={C.green} />
        </div>
        <WeightChart data={weightData} />
      </div>

      {/* Quick Stats */}
      <SectionTitle icon="activity" iconColor={C.blue}>Resumo do Prontuário</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        {[
          { n: "5", label: "Vacinas", sub: "3 em dia", color: C.green },
          { n: "5", label: "Exames", sub: "1 atenção", color: C.amber },
          { n: "3", label: "Consultas", sub: "Último: Mar", color: C.blue },
          { n: "4", label: "Remédios", sub: "3 ativos", color: C.purple },
          { n: "2", label: "Cirurgias", sub: "Recuperado", color: C.teal },
          { n: "2", label: "Alergias", sub: "1 severa", color: C.red },
        ].map((s, i) => (
          <div key={i} style={{
            background: C.card, borderRadius: 16, padding: "14px 12px", textAlign: "center",
            border: `1px solid ${C.border}`,
          }}>
            <p style={{ color: s.color, fontSize: 24, fontWeight: 800, margin: 0, fontFamily: font }}>{s.n}</p>
            <p style={{ color: C.text, fontSize: 11, fontWeight: 700, margin: "2px 0 1px" }}>{s.label}</p>
            <p style={{ color: C.textDim, fontSize: 10, margin: 0 }}>{s.sub}</p>
          </div>
        ))}
      </div>
    </>
  );

  // ====== TAB: VACINAS ======
  const TabVacinas = () => (
    <>
      {/* Vaccine progress */}
      <div style={{
        background: C.card, borderRadius: 22, padding: 20, marginBottom: 16,
        border: `1px solid ${C.border}`, boxShadow: C.shadow,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <span style={{ color: C.text, fontSize: 15, fontWeight: 700, fontFamily: font }}>Carteira de Vacinação</span>
          <Badge text="3/5 em dia" color={C.green} big />
        </div>
        <MiniBar value={60} color={C.green} h={8} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          <span style={{ color: C.green, fontSize: 11, fontWeight: 600 }}>3 atualizadas</span>
          <span style={{ color: C.red, fontSize: 11, fontWeight: 600 }}>2 vencidas</span>
        </div>
      </div>

      {vaccines.map((v, i) => (
        <div key={i} style={{ marginBottom: 10 }}>
          <button onClick={() => setExpandedVax(expandedVax === i ? null : i)} style={{
            width: "100%", background: C.card, borderRadius: expandedVax === i ? "18px 18px 0 0" : 18,
            padding: "14px 18px", border: `1px solid ${C.border}`,
            borderBottom: expandedVax === i ? `1px dashed ${C.borderLight}` : `1px solid ${C.border}`,
            borderLeft: `3px solid ${v.status === "ok" ? C.green : C.red}`,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 14,
            textAlign: "left", fontFamily: font, transition: "all 0.2s",
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: v.status === "ok" ? C.greenSoft : C.redSoft,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {v.status === "ok"
                ? <Ico type="check" size={18} color={C.green} />
                : <Ico type="alert" size={18} color={C.red} />}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ color: C.text, fontSize: 14, fontWeight: 700, margin: 0 }}>{v.name}</p>
              <p style={{ color: C.textDim, fontSize: 11, margin: "2px 0 0" }}>Aplicada: {v.date} · {v.dose}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <Badge text={v.status === "ok" ? "Em dia" : "Vencida"} color={v.status === "ok" ? C.green : C.red} />
              <p style={{ color: C.textDim, fontSize: 10, margin: "4px 0 0" }}>Próx: {v.next}</p>
            </div>
          </button>

          {expandedVax === i && (
            <div style={{
              background: C.cardAlt, borderRadius: "0 0 18px 18px",
              padding: "14px 18px", border: `1px solid ${C.border}`, borderTop: "none",
              borderLeft: `3px solid ${v.status === "ok" ? C.green : C.red}`,
            }}>
              {[
                { label: "Laboratório", value: v.lab },
                { label: "Lote", value: v.batch },
                { label: "Veterinário", value: v.vet },
                { label: "Clínica", value: v.clinic },
              ].map((d, j) => (
                <div key={j} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ color: C.textDim, fontSize: 12 }}>{d.label}</span>
                  <span style={{ color: C.text, fontSize: 12, fontWeight: 600 }}>{d.value}</span>
                </div>
              ))}
              {v.status === "overdue" && (
                <button style={{
                  width: "100%", marginTop: 10, padding: "10px", borderRadius: 12,
                  background: C.red, border: "none", color: "#fff",
                  fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: font,
                }}>Agendar Revacinação</button>
              )}
            </div>
          )}
        </div>
      ))}

      <button style={{
        width: "100%", padding: "14px", borderRadius: 16, marginTop: 6,
        background: C.bg, border: `2px dashed ${C.border}`, cursor: "pointer",
        color: C.primary, fontSize: 13, fontWeight: 700, fontFamily: font,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      }}>
        <Ico type="camera" size={18} color={C.primary} /> Digitalizar Carteira (OCR)
      </button>
    </>
  );

  // ====== TAB: EXAMES ======
  const [expandedExam, setExpandedExam] = useState(null);
  const TabExames = () => (
    <>
      {exams.map((ex, i) => (
        <div key={i} style={{ marginBottom: 10 }}>
          <button onClick={() => setExpandedExam(expandedExam === i ? null : i)} style={{
            width: "100%", background: C.card,
            borderRadius: expandedExam === i ? "18px 18px 0 0" : 18,
            padding: "14px 18px", border: `1px solid ${C.border}`,
            borderBottom: expandedExam === i ? `1px dashed ${C.borderLight}` : `1px solid ${C.border}`,
            borderLeft: `3px solid ${ex.status === "normal" ? C.green : C.amber}`,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 14,
            textAlign: "left", fontFamily: font,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: ex.status === "normal" ? C.greenSoft : C.amberSoft,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Ico type={ex.status === "normal" ? "check" : "eye"} size={18} color={ex.status === "normal" ? C.green : C.amber} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ color: C.text, fontSize: 14, fontWeight: 700, margin: 0 }}>{ex.name}</p>
              <p style={{ color: C.textDim, fontSize: 11, margin: "2px 0 0" }}>{ex.date}</p>
            </div>
            <Badge text={ex.status === "normal" ? "Normal" : "Atenção"} color={ex.status === "normal" ? C.green : C.amber} />
          </button>

          {expandedExam === i && ex.results.length > 0 && (
            <div style={{
              background: C.cardAlt, borderRadius: "0 0 18px 18px",
              padding: "14px 18px", border: `1px solid ${C.border}`, borderTop: "none",
              borderLeft: `3px solid ${ex.status === "normal" ? C.green : C.amber}`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, padding: "0 0 8px", borderBottom: `1px solid ${C.borderLight}` }}>
                <span style={{ color: C.textDim, fontSize: 10, fontWeight: 700, letterSpacing: 0.5 }}>PARÂMETRO</span>
                <div style={{ display: "flex", gap: 40 }}>
                  <span style={{ color: C.textDim, fontSize: 10, fontWeight: 700, letterSpacing: 0.5 }}>RESULTADO</span>
                  <span style={{ color: C.textDim, fontSize: 10, fontWeight: 700, letterSpacing: 0.5 }}>REFERÊNCIA</span>
                </div>
              </div>
              {ex.results.map((r, j) => (
                <div key={j} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ color: C.text, fontSize: 12, fontWeight: 600, flex: 1 }}>{r.item}</span>
                  <span style={{ color: r.ok ? C.green : C.red, fontSize: 13, fontWeight: 700, width: 70, textAlign: "right" }}>{r.val} {!r.ok && "⚠️"}</span>
                  <span style={{ color: C.textDim, fontSize: 10, width: 100, textAlign: "right" }}>{r.ref}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      <button style={{
        width: "100%", padding: "14px", borderRadius: 16, marginTop: 6,
        background: C.bg, border: `2px dashed ${C.border}`, cursor: "pointer",
        color: C.primary, fontSize: 13, fontWeight: 700, fontFamily: font,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      }}>
        <Ico type="camera" size={18} color={C.primary} /> Digitalizar Exame (OCR)
      </button>
    </>
  );

  // ====== TAB: REMEDIOS ======
  const TabRemedios = () => (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <div style={{ flex: 1, background: C.greenSoft, borderRadius: 16, padding: "14px 16px", border: `1px solid ${C.green}15`, textAlign: "center" }}>
          <p style={{ color: C.green, fontSize: 22, fontWeight: 800, margin: 0, fontFamily: font }}>3</p>
          <p style={{ color: C.textDim, fontSize: 11, margin: "2px 0 0" }}>Ativos</p>
        </div>
        <div style={{ flex: 1, background: C.bg, borderRadius: 16, padding: "14px 16px", border: `1px solid ${C.border}`, textAlign: "center" }}>
          <p style={{ color: C.textDim, fontSize: 22, fontWeight: 800, margin: 0, fontFamily: font }}>1</p>
          <p style={{ color: C.textDim, fontSize: 11, margin: "2px 0 0" }}>Encerrado</p>
        </div>
      </div>

      {medications.map((m, i) => (
        <div key={i} style={{
          background: C.card, borderRadius: 20, padding: 18, marginBottom: 12,
          border: `1px solid ${C.border}`, opacity: m.active ? 1 : 0.55,
          boxShadow: m.active ? C.shadow : "none",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 14, flexShrink: 0,
              background: m.active ? C.purpleSoft : C.bgWarm,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Ico type="pill" size={20} color={m.active ? C.purple : C.textDim} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ color: C.text, fontSize: 14, fontWeight: 700, margin: 0, fontFamily: font }}>{m.name}</p>
              <p style={{ color: C.textDim, fontSize: 11, margin: "2px 0 0" }}>{m.type}</p>
            </div>
            <Badge text={m.active ? "Ativo" : "Encerrado"} color={m.active ? C.green : C.textDim} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            <div style={{ background: C.bg, borderRadius: 10, padding: "8px 12px" }}>
              <p style={{ color: C.textDim, fontSize: 10, margin: 0 }}>Frequência</p>
              <p style={{ color: C.text, fontSize: 12, fontWeight: 600, margin: "2px 0 0" }}>{m.freq}</p>
            </div>
            <div style={{ background: C.bg, borderRadius: 10, padding: "8px 12px" }}>
              <p style={{ color: C.textDim, fontSize: 10, margin: 0 }}>Período</p>
              <p style={{ color: C.text, fontSize: 12, fontWeight: 600, margin: "2px 0 0" }}>{m.start} → {m.end}</p>
            </div>
          </div>
          <p style={{ color: C.textSec, fontSize: 12, lineHeight: 1.5, margin: 0, fontStyle: "italic" }}>
            📝 {m.notes}
          </p>
        </div>
      ))}
    </>
  );

  // ====== TAB: CONSULTAS ======
  const TabConsultas = () => (
    <>
      <div style={{ position: "relative", paddingLeft: 24 }}>
        {/* Timeline line */}
        <div style={{ position: "absolute", left: 9, top: 8, bottom: 8, width: 2, background: C.border }} />

        {consultations.map((c, i) => (
          <div key={i} style={{ position: "relative", marginBottom: 20 }}>
            {/* Dot */}
            <div style={{
              position: "absolute", left: -18, top: 6,
              width: 16, height: 16, borderRadius: "50%",
              background: C.card, border: `3px solid ${c.color}`,
            }} />
            <div style={{
              background: C.card, borderRadius: 20, padding: 18,
              border: `1px solid ${C.border}`, boxShadow: C.shadow,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <Badge text={c.type} color={c.color} big />
                <span style={{ color: C.textDim, fontSize: 12, fontWeight: 600 }}>{c.date}</span>
              </div>
              <p style={{ color: C.text, fontSize: 14, fontWeight: 700, margin: "0 0 4px", fontFamily: font }}>{c.vet}</p>
              <p style={{ color: C.textDim, fontSize: 12, margin: "0 0 12px" }}>{c.clinic}</p>
              <div style={{ background: C.bg, borderRadius: 14, padding: "12px 14px" }}>
                <p style={{ color: C.textSec, fontSize: 13, lineHeight: 1.6, margin: 0 }}>{c.summary}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );

  // ====== TAB: CIRURGIAS ======
  const TabCirurgias = () => (
    <>
      {surgeries.map((s, i) => (
        <div key={i} style={{
          background: C.card, borderRadius: 22, padding: 20, marginBottom: 14,
          border: `1px solid ${C.border}`, boxShadow: C.shadow,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14,
              background: C.tealSoft, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Ico type="scissors" size={20} color={C.teal} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ color: C.text, fontSize: 15, fontWeight: 700, margin: 0, fontFamily: font }}>{s.name}</p>
              <p style={{ color: C.textDim, fontSize: 12, margin: "2px 0 0" }}>{s.date}</p>
            </div>
            <Badge text={s.status} color={C.green} big />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            {[
              { label: "Veterinário", value: s.vet },
              { label: "Clínica", value: s.clinic },
              { label: "Anestesia", value: s.anesthesia },
              { label: "Status", value: s.status },
            ].map((d, j) => (
              <div key={j} style={{ background: C.bg, borderRadius: 12, padding: "8px 12px" }}>
                <p style={{ color: C.textDim, fontSize: 10, margin: 0 }}>{d.label}</p>
                <p style={{ color: C.text, fontSize: 12, fontWeight: 600, margin: "2px 0 0" }}>{d.value}</p>
              </div>
            ))}
          </div>

          <div style={{ background: C.bg, borderRadius: 14, padding: "12px 14px" }}>
            <p style={{ color: C.textSec, fontSize: 13, lineHeight: 1.6, margin: 0 }}>📝 {s.notes}</p>
          </div>
        </div>
      ))}
    </>
  );

  const tabContent = {
    geral: TabGeral,
    vacinas: TabVacinas,
    exames: TabExames,
    remedios: TabRemedios,
    consultas: TabConsultas,
    cirurgias: TabCirurgias,
  };
  const ActiveTab = tabContent[activeTab] || TabGeral;

  return (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center",
      minHeight: "100vh", padding: 20, fontFamily: font,
      background: `linear-gradient(160deg, #F5EFE7 0%, #EDE6DB 50%, #E8E0D4 100%)`,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <div ref={containerRef} style={{
        width: 400, maxHeight: 800, background: C.bg, borderRadius: 40,
        overflow: "auto", position: "relative",
        boxShadow: `0 20px 60px rgba(44,36,22,0.12), 0 0 0 1px ${C.border}`,
      }}>
        {/* Notch */}
        <div style={{ position: "sticky", top: 0, zIndex: 30, display: "flex", justifyContent: "center", padding: "8px 0 0", background: `linear-gradient(to bottom, ${C.bg}, transparent)` }}>
          <div style={{ width: 120, height: 28, borderRadius: 20, background: "#1a1a1a" }} />
        </div>

        {/* Header */}
        <div style={{
          padding: "12px 20px 16px", display: "flex", alignItems: "center", gap: 12,
          position: "sticky", top: 28, zIndex: 20,
          background: `linear-gradient(to bottom, ${C.bg}, ${C.bg}F8, ${C.bg}00)`,
        }}>
          <button style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, width: 38, height: 38, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Ico type="back" size={18} color={C.text} />
          </button>
          <div style={{ flex: 1 }}>
            <h2 style={{ color: C.text, fontSize: 19, margin: 0, fontWeight: 800, fontFamily: font }}>Prontuário de Saúde</h2>
            <p style={{ color: C.textDim, fontSize: 12, margin: "1px 0 0" }}>Rex · Labrador · 3 anos</p>
          </div>
          <button onClick={() => setShowQR(true)} style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
            padding: "7px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
          }}>
            <Ico type="qr" size={16} color={C.primary} />
            <span style={{ color: C.primary, fontSize: 11, fontWeight: 700 }}>QR</span>
          </button>
        </div>

        {/* Pet Avatar + Quick Stats */}
        <div style={{ padding: "0 20px 8px", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 22, flexShrink: 0,
            background: C.primarySoft, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 36, border: `2.5px solid ${C.primary}`, boxShadow: `0 4px 16px ${C.primary}15`,
          }}>🐕</div>
          <div style={{ display: "flex", gap: 8, flex: 1 }}>
            {[
              { icon: "shield", label: "Vacinação", val: "60%", color: C.amber },
              { icon: "heart", label: "Saúde IA", val: "92%", color: C.green },
              { icon: "activity", label: "Peso", val: "32kg", color: C.blue },
            ].map((s, i) => (
              <div key={i} style={{
                flex: 1, background: C.card, borderRadius: 14, padding: "10px 8px",
                border: `1px solid ${C.border}`, textAlign: "center",
              }}>
                <Ico type={s.icon} size={16} color={s.color} />
                <p style={{ color: s.color, fontSize: 15, fontWeight: 800, margin: "4px 0 0", fontFamily: font }}>{s.val}</p>
                <p style={{ color: C.textDim, fontSize: 9, margin: "1px 0 0" }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{
          position: "sticky", top: 70, zIndex: 15,
          padding: "14px 20px 10px",
          background: `linear-gradient(to bottom, ${C.bg}, ${C.bg}F5, ${C.bg}00)`,
        }}>
          <div style={{ display: "flex", gap: 6, overflow: "auto", paddingBottom: 2 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => { setActiveTab(t.id); setExpandedVax(null); setExpandedExam(null); }}
                style={{
                  padding: "8px 16px", borderRadius: 12, cursor: "pointer", whiteSpace: "nowrap",
                  background: activeTab === t.id ? C.primary : C.card,
                  border: activeTab === t.id ? "none" : `1px solid ${C.border}`,
                  color: activeTab === t.id ? "#fff" : C.textSec,
                  fontSize: 12, fontWeight: 700, fontFamily: font,
                  transition: "all 0.2s",
                }}>{t.label}</button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div style={{ padding: "6px 20px 30px" }}>
          <ActiveTab />
        </div>

        {/* QR Modal */}
        {showQR && <QRModal />}

        {/* FAB - Add Record */}
        <button style={{
          position: "sticky", bottom: 20, float: "right", marginRight: 20,
          width: 54, height: 54, borderRadius: 18, cursor: "pointer",
          background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`,
          border: "none", display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 6px 20px ${C.primary}40`, zIndex: 10,
        }}>
          <Ico type="plus" size={24} color="#fff" />
        </button>

        <style>{`::-webkit-scrollbar{width:0;height:0}`}</style>
      </div>
    </div>
  );
}
