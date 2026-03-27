import { useState, useRef } from "react";

// ======================== DESIGN TOKENS ========================
const C = {
  bg: "#F5F1E8", bgDeep: "#EAE4D6", cream: "#FFFDF5", warm: "#F8F3E8",
  card: "#FFFFFF", cardAlt: "#FDFAF2",
  lime: "#6BA34A", limeSoft: "#6BA34A08", limeMed: "#6BA34A15", limeGlow: "#6BA34A22",
  orange: "#E08C3A", orangeSoft: "#E08C3A08", orangeMed: "#E08C3A15",
  berry: "#C44E6A", berrySoft: "#C44E6A08",
  sky: "#3E8CC4", skySoft: "#3E8CC408",
  earth: "#9E7A4E", earthSoft: "#9E7A4E08",
  plum: "#7E5AA8", plumSoft: "#7E5AA808",
  teal: "#2E9E8A", tealSoft: "#2E9E8A08",
  coral: "#D4604E", coralSoft: "#D4604E08",
  gold: "#CCA030", goldSoft: "#CCA03008",
  ink: "#2A2218", inkSec: "#5A4E3A", inkDim: "#948770", inkGhost: "#BEB5A2",
  border: "#E0D8C8", borderLight: "#E8E0D2",
  shadow: "0 3px 22px rgba(42,34,24,0.06)",
};
const font = "'Fraunces', Georgia, serif";
const fontSans = "'Nunito', -apple-system, sans-serif";
const fontMono = "'JetBrains Mono', monospace";

// ======================== ICONS ========================
const Ico = ({ type, size = 20, color = C.inkDim }) => {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" };
  const icons = {
    back: <svg {...p}><polyline points="15,18 9,12 15,6"/></svg>,
    check: <svg {...p} strokeWidth="2.5"><polyline points="20,6 9,17 4,12"/></svg>,
    plus: <svg {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    x: <svg {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    alert: <svg {...p}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    clock: <svg {...p}><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>,
    calendar: <svg {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    edit: <svg {...p}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    sparkle: <svg {...p} strokeWidth="1.5"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/></svg>,
    paw: <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><ellipse cx="12" cy="17" rx="4.5" ry="4"/><circle cx="7" cy="10.5" r="2.2"/><circle cx="17" cy="10.5" r="2.2"/><circle cx="9.5" cy="6.5" r="1.8"/><circle cx="14.5" cy="6.5" r="1.8"/></svg>,
    droplet: <svg {...p}><path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/></svg>,
    activity: <svg {...p}><polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/></svg>,
    camera: <svg {...p}><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>,
    search: <svg {...p}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    shield: <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    share: <svg {...p}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
    star: <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>,
    target: <svg {...p}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
    trending: <svg {...p}><polyline points="23,6 13.5,15.5 8.5,10.5 1,18"/><polyline points="17,6 23,6 23,12"/></svg>,
    zap: <svg {...p}><polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/></svg>,
    leaf: <svg {...p}><path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 008 17c2-2 6-4 9-5s5-2 5-5C22 4 19 2 17 2z"/><path d="M2.5 18.5c1-2 3-4 5-4"/></svg>,
  };
  return icons[type] || null;
};

// ======================== COMPONENTS ========================
const Badge = ({ text, color, bg }) => (
  <span style={{ background: bg || color + "14", color, fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 12, fontFamily: fontSans, display: "inline-flex", alignItems: "center", gap: 4 }}>{text}</span>
);

const NutrientBar = ({ label, value, max, unit, color }) => {
  const pct = Math.min((value / max) * 100, 100);
  const isOver = value > max;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ color: C.inkSec, fontSize: 12, fontWeight: 600, fontFamily: fontSans }}>{label}</span>
        <span style={{ color: isOver ? C.coral : color, fontSize: 12, fontWeight: 700, fontFamily: fontMono }}>
          {value}{unit} <span style={{ color: C.inkGhost, fontWeight: 500 }}>/ {max}{unit}</span>
        </span>
      </div>
      <div style={{ height: 6, background: C.bgDeep, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, borderRadius: 3, background: isOver ? C.coral : `linear-gradient(90deg, ${color}80, ${color})`, transition: "width 0.8s ease" }} />
      </div>
    </div>
  );
};

const WaterDrop = ({ filled, onClick }) => (
  <button onClick={onClick} style={{
    width: 32, height: 40, cursor: "pointer", background: "none", border: "none", padding: 0,
    opacity: filled ? 1 : 0.25, transition: "all 0.2s",
    transform: filled ? "scale(1)" : "scale(0.9)",
  }}>
    <svg width="32" height="40" viewBox="0 0 32 40">
      <path d="M16 4C16 4 4 18 4 26a12 12 0 0024 0C28 18 16 4 16 4z"
        fill={filled ? "#4AADE8" : C.inkGhost} opacity={filled ? 0.85 : 0.3} />
      {filled && <ellipse cx="12" cy="22" rx="3" ry="4" fill="rgba(255,255,255,0.25)" />}
    </svg>
  </button>
);

// ======================== DATA ========================
const todayMeals = [
  {
    time: "08:00", label: "Café da manhã", emoji: "🌅", done: true,
    items: [
      { name: "Royal Canin Labrador Adult", amount: "200g", calories: 340, type: "ração" },
      { name: "Suplemento Ômega 3", amount: "1 cáps.", calories: 10, type: "suplemento" },
    ],
  },
  {
    time: "13:00", label: "Petisco", emoji: "🦴", done: true,
    items: [
      { name: "Cenoura crua", amount: "1 unidade", calories: 25, type: "natural" },
    ],
  },
  {
    time: "18:00", label: "Jantar", emoji: "🌙", done: false,
    items: [
      { name: "Royal Canin Labrador Adult", amount: "200g", calories: 340, type: "ração" },
    ],
  },
  {
    time: "20:30", label: "Petisco noturno", emoji: "🌟", done: false,
    items: [
      { name: "Biscoito PetDog integral", amount: "2 unid.", calories: 40, type: "petisco" },
    ],
  },
];

const weekMenu = [
  { day: "Seg", breakfast: "Ração + Ômega 3", dinner: "Ração + cenoura", treat: "Biscoito", cal: 755 },
  { day: "Ter", breakfast: "Ração + Ômega 3", dinner: "Ração + maçã", treat: "Cenoura", cal: 740 },
  { day: "Qua", breakfast: "Ração + Ômega 3", dinner: "Ração + abóbora", treat: "Biscoito", cal: 760 },
  { day: "Qui", breakfast: "Ração + Ômega 3", dinner: "Ração + cenoura", treat: "Maçã", cal: 745 },
  { day: "Sex", breakfast: "Ração + Ômega 3", dinner: "Ração + batata doce", treat: "Biscoito", cal: 770 },
  { day: "Sáb", breakfast: "Alimentação natural", dinner: "Ração", treat: "Frutas", cal: 780 },
  { day: "Dom", breakfast: "Alimentação natural", dinner: "Ração + legumes", treat: "Biscoito", cal: 790 },
];

const safeIngredients = [
  { name: "Cenoura", emoji: "🥕", safe: true, benefit: "Rica em fibra e betacaroteno. Ajuda na saúde ocular e dental." },
  { name: "Maçã (sem semente)", emoji: "🍎", safe: true, benefit: "Vitaminas A e C. Sempre remover sementes e caroço." },
  { name: "Abóbora", emoji: "🎃", safe: true, benefit: "Excelente para digestão. Rica em fibra solúvel." },
  { name: "Batata doce", emoji: "🍠", safe: true, benefit: "Fonte de energia saudável. Sempre cozida, nunca crua." },
  { name: "Frango (cozido)", emoji: "🍗", safe: "caution", benefit: "⚠️ Rex tem suspeita de alergia a frango. Monitorar." },
  { name: "Chocolate", emoji: "🍫", safe: false, benefit: "TÓXICO! Contém teobromina. Pode ser fatal." },
  { name: "Uva / Passa", emoji: "🍇", safe: false, benefit: "TÓXICO! Causa insuficiência renal aguda." },
  { name: "Cebola / Alho", emoji: "🧅", safe: false, benefit: "TÓXICO! Destrói glóbulos vermelhos." },
  { name: "Abacate", emoji: "🥑", safe: false, benefit: "TÓXICO! Contém persina. Causa vômito e diarreia." },
  { name: "Macadâmia", emoji: "🥜", safe: false, benefit: "TÓXICO! Causa fraqueza, tremores e hipertermia." },
];

const recipes = [
  {
    name: "Bowl Proteico Natural", emoji: "🥣", time: "25 min", difficulty: "Fácil",
    ingredients: ["Peito de peru (200g)", "Arroz integral (100g)", "Cenoura ralada (50g)", "Abóbora cozida (50g)", "Azeite (1 colher chá)"],
    calories: 380, approved: true, color: C.lime,
  },
  {
    name: "Biscoito de Banana & Aveia", emoji: "🍪", time: "40 min", difficulty: "Médio",
    ingredients: ["Banana madura (2)", "Aveia (1 xícara)", "Pasta de amendoim (2 col.)", "Farinha de arroz (½ xícara)"],
    calories: 45, perUnit: true, approved: true, color: C.orange,
  },
  {
    name: "Smoothie Refrescante", emoji: "🥤", time: "5 min", difficulty: "Fácil",
    ingredients: ["Melancia sem semente (100g)", "Água de coco (100ml)", "Gelo (3 cubos)"],
    calories: 35, approved: true, color: C.berry,
  },
];

// ======================== MAIN APP ========================
export default function NutricaoPet() {
  const [activeTab, setActiveTab] = useState("hoje");
  const [waterCount, setWaterCount] = useState(4);
  const [searchTerm, setSearchTerm] = useState("");
  const [showRecipe, setShowRecipe] = useState(null);
  const [selectedDay, setSelectedDay] = useState("Seg");
  const containerRef = useRef();

  const totalCalToday = todayMeals.reduce((s, m) => s + m.items.reduce((si, it) => si + it.calories, 0), 0);
  const consumedCal = todayMeals.filter(m => m.done).reduce((s, m) => s + m.items.reduce((si, it) => si + it.calories, 0), 0);
  const targetCal = 780;
  const calPct = Math.round((consumedCal / targetCal) * 100);
  const waterTarget = 7;

  const tabs = [
    { id: "hoje", label: "Hoje", emoji: "📋" },
    { id: "semana", label: "Semana", emoji: "📅" },
    { id: "alimentos", label: "Alimentos", emoji: "🔍" },
    { id: "receitas", label: "Receitas", emoji: "👨‍🍳" },
  ];

  const filteredIngredients = searchTerm
    ? safeIngredients.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : safeIngredients;

  // ====== RECIPE MODAL ======
  const RecipeModal = ({ recipe: r }) => (
    <div style={{ position: "absolute", inset: 0, zIndex: 50, background: "rgba(42,34,24,0.45)", backdropFilter: "blur(10px)", display: "flex", alignItems: "flex-end" }}>
      <div style={{ background: C.bg, borderRadius: "32px 32px 0 0", width: "100%", maxHeight: "82%", overflow: "auto", padding: "8px 22px 32px" }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 16px" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: C.inkGhost }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 20,
            background: r.color + "12", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 30, border: `1.5px solid ${r.color}20`,
          }}>{r.emoji}</div>
          <div style={{ flex: 1 }}>
            <h3 style={{ color: C.ink, fontSize: 18, fontWeight: 700, margin: 0, fontFamily: font }}>{r.name}</h3>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <Badge text={`⏱️ ${r.time}`} color={C.inkDim} />
              <Badge text={r.difficulty} color={r.color} />
              {r.approved && <Badge text="✅ Vet aprovada" color={C.lime} />}
            </div>
          </div>
          <button onClick={() => setShowRecipe(null)} style={{ background: C.bgDeep, border: "none", borderRadius: 10, width: 36, height: 36, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Ico type="x" size={18} color={C.inkSec} />
          </button>
        </div>

        {/* Nutrition quick */}
        <div style={{
          background: r.color + "08", borderRadius: 16, padding: "14px 18px", marginBottom: 18,
          border: `1px solid ${r.color}12`, display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <p style={{ color: C.inkDim, fontSize: 10, fontWeight: 700, letterSpacing: 0.5, margin: 0 }}>CALORIAS</p>
            <p style={{ color: r.color, fontSize: 22, fontWeight: 800, margin: "2px 0 0", fontFamily: fontMono }}>
              {r.calories} kcal{r.perUnit ? "/unid." : ""}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Ico type="shield" size={16} color={C.lime} />
            <span style={{ color: C.lime, fontSize: 12, fontWeight: 700 }}>Segura para Rex</span>
          </div>
        </div>

        {/* Ingredients */}
        <p style={{ color: C.inkDim, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, margin: "0 0 10px" }}>INGREDIENTES</p>
        {r.ingredients.map((ing, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "10px 0",
            borderBottom: i < r.ingredients.length - 1 ? `1px solid ${C.borderLight}` : "none",
          }}>
            <div style={{ width: 24, height: 24, borderRadius: 7, background: C.lime + "12", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Ico type="check" size={13} color={C.lime} />
            </div>
            <span style={{ color: C.ink, fontSize: 13, fontWeight: 600, fontFamily: fontSans }}>{ing}</span>
          </div>
        ))}

        {/* Preparation */}
        <p style={{ color: C.inkDim, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, margin: "18px 0 10px" }}>MODO DE PREPARO</p>
        {[
          "Cozinhe a proteína sem tempero até ficar bem passada.",
          "Cozinhe os legumes no vapor até ficarem macios.",
          "Misture tudo e espere esfriar completamente.",
          "Sirva em porções adequadas ao peso do pet.",
          "Armazene o restante na geladeira por até 3 dias.",
        ].map((step, i) => (
          <div key={i} style={{ display: "flex", gap: 12, marginBottom: 10 }}>
            <div style={{
              width: 24, height: 24, borderRadius: 8, flexShrink: 0,
              background: r.color + "12", display: "flex", alignItems: "center", justifyContent: "center",
              color: r.color, fontSize: 11, fontWeight: 800, fontFamily: fontSans,
            }}>{i + 1}</div>
            <p style={{ color: C.inkSec, fontSize: 13, lineHeight: 1.6, margin: 0, fontFamily: fontSans }}>{step}</p>
          </div>
        ))}

        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          <button style={{
            flex: 1, padding: 14, borderRadius: 14, cursor: "pointer",
            background: r.color, border: "none", color: "#fff",
            fontSize: 13, fontWeight: 700, fontFamily: fontSans,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}><Ico type="calendar" size={16} color="#fff" /> Adicionar ao Cardápio</button>
          <button style={{
            padding: "14px 16px", borderRadius: 14, cursor: "pointer",
            background: C.warm, border: `1px solid ${C.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}><Ico type="share" size={16} color={C.inkDim} /></button>
        </div>
      </div>
    </div>
  );

  // ====== TAB: HOJE ======
  const TabHoje = () => (
    <>
      {/* Calorie Ring */}
      <div style={{
        background: C.card, borderRadius: 24, padding: 22, marginBottom: 16,
        border: `1px solid ${C.border}`, boxShadow: C.shadow,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ position: "relative", width: 90, height: 90 }}>
            <svg width="90" height="90" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="45" cy="45" r="38" fill="none" stroke={C.bgDeep} strokeWidth="7" />
              <circle cx="45" cy="45" r="38" fill="none" stroke={C.lime} strokeWidth="7"
                strokeDasharray={`${2 * Math.PI * 38}`}
                strokeDashoffset={`${2 * Math.PI * 38 * (1 - calPct / 100)}`}
                strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s ease" }} />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: C.lime, fontSize: 20, fontWeight: 800, fontFamily: fontMono }}>{consumedCal}</span>
              <span style={{ color: C.inkDim, fontSize: 9 }}>/{targetCal} kcal</span>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ color: C.inkDim, fontSize: 10, fontWeight: 700, letterSpacing: 0.8, margin: "0 0 6px" }}>NUTRIÇÃO DE HOJE</p>
            <p style={{ color: C.ink, fontSize: 17, fontWeight: 700, margin: "0 0 8px", fontFamily: font }}>{calPct}% da meta diária</p>
            <div style={{ display: "flex", gap: 6 }}>
              <Badge text={`${todayMeals.filter(m => m.done).length}/${todayMeals.length} refeições`} color={C.lime} />
              <Badge text={`${waterCount}/${waterTarget} água`} color={C.sky} />
            </div>
          </div>
        </div>

        {/* Macros */}
        <div style={{ marginTop: 18 }}>
          <NutrientBar label="Proteína" value={62} max={75} unit="g" color={C.coral} />
          <NutrientBar label="Gordura" value={28} max={35} unit="g" color={C.orange} />
          <NutrientBar label="Fibra" value={8} max={12} unit="g" color={C.lime} />
          <NutrientBar label="Carboidrato" value={95} max={120} unit="g" color={C.earth} />
        </div>
      </div>

      {/* Meals Timeline */}
      <p style={{ color: C.inkDim, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, margin: "0 0 12px" }}>REFEIÇÕES DO DIA</p>
      <div style={{ position: "relative", paddingLeft: 24 }}>
        <div style={{ position: "absolute", left: 8, top: 10, bottom: 10, width: 2, background: `linear-gradient(to bottom, ${C.lime}30, ${C.border}, transparent)` }} />

        {todayMeals.map((meal, i) => (
          <div key={i} style={{ position: "relative", marginBottom: 14 }}>
            <div style={{
              position: "absolute", left: -18, top: 8,
              width: 14, height: 14, borderRadius: 7,
              background: meal.done ? C.lime : C.bgDeep,
              border: `2px solid ${meal.done ? C.lime : C.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {meal.done && <Ico type="check" size={8} color="#fff" />}
            </div>
            <div style={{
              background: meal.done ? C.lime + "04" : C.card,
              borderRadius: 18, padding: "14px 16px",
              border: `1px solid ${meal.done ? C.lime + "15" : C.border}`,
              opacity: meal.done ? 1 : 0.8, boxShadow: C.shadow,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 18 }}>{meal.emoji}</span>
                  <div>
                    <p style={{ color: C.ink, fontSize: 13, fontWeight: 700, margin: 0, fontFamily: fontSans }}>{meal.label}</p>
                    <p style={{ color: C.inkDim, fontSize: 11, margin: "1px 0 0", fontFamily: fontMono }}>{meal.time}</p>
                  </div>
                </div>
                <span style={{ color: meal.done ? C.lime : C.inkDim, fontSize: 12, fontWeight: 700, fontFamily: fontMono }}>
                  {meal.items.reduce((s, it) => s + it.calories, 0)} kcal
                </span>
              </div>
              {meal.items.map((item, j) => (
                <div key={j} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "6px 0", borderTop: j > 0 ? `1px solid ${C.borderLight}` : "none",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: 3, flexShrink: 0,
                      background: item.type === "ração" ? C.earth : item.type === "suplemento" ? C.plum : item.type === "natural" ? C.lime : C.orange,
                    }} />
                    <span style={{ color: C.inkSec, fontSize: 12, fontFamily: fontSans }}>{item.name}</span>
                  </div>
                  <span style={{ color: C.inkDim, fontSize: 11, fontFamily: fontMono }}>{item.amount}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        <button style={{
          width: "100%", padding: 14, borderRadius: 16, cursor: "pointer",
          background: C.warm, border: `2px dashed ${C.border}`,
          color: C.inkDim, fontSize: 13, fontWeight: 700, fontFamily: fontSans,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}><Ico type="plus" size={16} color={C.inkDim} /> Adicionar Refeição</button>
      </div>

      {/* Water Tracker */}
      <div style={{
        marginTop: 18, background: C.card, borderRadius: 22, padding: 20,
        border: `1px solid ${C.border}`, boxShadow: C.shadow,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Ico type="droplet" size={18} color={C.sky} />
            <span style={{ color: C.ink, fontSize: 14, fontWeight: 700, fontFamily: fontSans }}>Hidratação</span>
          </div>
          <Badge text={`${waterCount} de ${waterTarget} copos`} color={C.sky} />
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 4 }}>
          {Array.from({ length: waterTarget }).map((_, i) => (
            <WaterDrop key={i} filled={i < waterCount} onClick={() => setWaterCount(i < waterCount ? i : i + 1)} />
          ))}
        </div>
        <p style={{ color: C.inkDim, fontSize: 11, textAlign: "center", margin: "10px 0 0" }}>
          {waterCount >= waterTarget ? "✅ Meta de hidratação atingida!" : `Faltam ${waterTarget - waterCount} copos para a meta`}
        </p>
      </div>

      {/* Allergy Alert */}
      <div style={{
        marginTop: 16, background: C.coral + "06", borderRadius: 18, padding: "14px 18px",
        border: `1px solid ${C.coral}12`, display: "flex", alignItems: "flex-start", gap: 12,
      }}>
        <Ico type="alert" size={20} color={C.coral} />
        <div>
          <p style={{ color: C.coral, fontSize: 12, fontWeight: 700, margin: "0 0 4px" }}>Alerta de Alergia</p>
          <p style={{ color: C.inkSec, fontSize: 12, lineHeight: 1.6, margin: 0, fontFamily: fontSans }}>
            Rex tem <b>suspeita de alergia a frango</b>. Evitar rações e petiscos que contenham frango na composição.
            <b> Alergia severa a picada de inseto</b> — sem relação alimentar.
          </p>
        </div>
      </div>
    </>
  );

  // ====== TAB: SEMANA ======
  const TabSemana = () => (
    <>
      <div style={{
        background: C.card, borderRadius: 22, padding: 20, marginBottom: 16,
        border: `1px solid ${C.border}`, boxShadow: C.shadow,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <Ico type="calendar" size={16} color={C.lime} />
          <span style={{ color: C.ink, fontSize: 15, fontWeight: 700, fontFamily: font }}>Cardápio Semanal</span>
          <div style={{ flex: 1 }} />
          <button style={{ background: C.lime + "12", border: `1px solid ${C.lime}18`, borderRadius: 10, padding: "5px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
            <Ico type="sparkle" size={12} color={C.lime} />
            <span style={{ color: C.lime, fontSize: 10, fontWeight: 700, fontFamily: fontSans }}>IA Gerar</span>
          </button>
        </div>

        {/* Day selector */}
        <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
          {weekMenu.map(d => (
            <button key={d.day} onClick={() => setSelectedDay(d.day)} style={{
              flex: 1, padding: "10px 4px", borderRadius: 12, cursor: "pointer",
              background: selectedDay === d.day ? C.lime : "transparent",
              border: selectedDay === d.day ? "none" : `1px solid ${C.borderLight}`,
              color: selectedDay === d.day ? "#fff" : C.inkDim,
              fontSize: 11, fontWeight: 700, fontFamily: fontSans,
            }}>{d.day}</button>
          ))}
        </div>

        {/* Day detail */}
        {weekMenu.filter(d => d.day === selectedDay).map(day => (
          <div key={day.day}>
            {[
              { label: "Café da Manhã", value: day.breakfast, emoji: "🌅", time: "08:00" },
              { label: "Jantar", value: day.dinner, emoji: "🌙", time: "18:00" },
              { label: "Petisco", value: day.treat, emoji: "🦴", time: "13:00" },
            ].map((meal, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 0",
                borderBottom: i < 2 ? `1px solid ${C.borderLight}` : "none",
              }}>
                <span style={{ fontSize: 20, width: 28, textAlign: "center" }}>{meal.emoji}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ color: C.ink, fontSize: 13, fontWeight: 700, margin: 0, fontFamily: fontSans }}>{meal.label}</p>
                  <p style={{ color: C.inkDim, fontSize: 12, margin: "2px 0 0" }}>{meal.value}</p>
                </div>
                <span style={{ color: C.inkDim, fontSize: 10, fontFamily: fontMono }}>{meal.time}</span>
              </div>
            ))}
            <div style={{
              marginTop: 12, background: C.lime + "08", borderRadius: 12, padding: "10px 14px",
              border: `1px solid ${C.lime}10`, display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ color: C.lime, fontSize: 12, fontWeight: 700 }}>Total do dia</span>
              <span style={{ color: C.lime, fontSize: 16, fontWeight: 800, fontFamily: fontMono }}>{day.cal} kcal</span>
            </div>
          </div>
        ))}
      </div>

      {/* Weekly calories chart */}
      <div style={{
        background: C.card, borderRadius: 22, padding: "18px 14px",
        border: `1px solid ${C.border}`, boxShadow: C.shadow,
      }}>
        <p style={{ color: C.ink, fontSize: 14, fontWeight: 700, margin: "0 0 14px 6px", fontFamily: fontSans }}>Calorias da Semana</p>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 100, padding: "0 6px" }}>
          {weekMenu.map((d, i) => {
            const h = ((d.cal - 700) / 100) * 100;
            const isSelected = d.day === selectedDay;
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <span style={{ color: isSelected ? C.lime : C.inkDim, fontSize: 9, fontWeight: 700, fontFamily: fontMono }}>{d.cal}</span>
                <div style={{
                  width: "100%", height: Math.max(h, 10), borderRadius: 6,
                  background: isSelected
                    ? `linear-gradient(to top, ${C.lime}60, ${C.lime})`
                    : `linear-gradient(to top, ${C.bgDeep}, ${C.border})`,
                  transition: "all 0.3s",
                }} />
                <span style={{ color: isSelected ? C.lime : C.inkDim, fontSize: 10, fontWeight: isSelected ? 800 : 500 }}>{d.day}</span>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 6px 0", borderTop: `1px solid ${C.borderLight}`, marginTop: 10 }}>
          <span style={{ color: C.inkDim, fontSize: 11 }}>Meta diária: {targetCal} kcal</span>
          <span style={{ color: C.lime, fontSize: 11, fontWeight: 700 }}>
            Média: {Math.round(weekMenu.reduce((s, d) => s + d.cal, 0) / 7)} kcal
          </span>
        </div>
      </div>

      {/* AI Suggestion */}
      <div style={{
        marginTop: 16, padding: "16px 18px",
        background: `linear-gradient(135deg, ${C.lime}06, ${C.cream})`,
        borderRadius: 20, border: `1px solid ${C.lime}10`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <Ico type="sparkle" size={14} color={C.lime} />
          <span style={{ color: C.lime, fontSize: 11, fontWeight: 700 }}>SUGESTÃO DA IA</span>
        </div>
        <p style={{ color: C.inkSec, fontSize: 13, lineHeight: 1.7, margin: 0, fontFamily: fontSans }}>
          O cardápio do Rex está <span style={{ color: C.lime, fontWeight: 700 }}>equilibrado</span>.
          Sugestão: incluir <b>sardinha cozida</b> 1x/semana como fonte natural de ômega 3,
          complementando o suplemento. Nos fins de semana, a alimentação natural pode incluir
          <b> batata doce e abobrinha</b> como fontes de fibra e energia.
        </p>
      </div>
    </>
  );

  // ====== TAB: ALIMENTOS ======
  const TabAlimentos = () => (
    <>
      {/* Search */}
      <div style={{
        background: C.card, borderRadius: 16, padding: "10px 16px",
        border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10,
        marginBottom: 16,
      }}>
        <Ico type="search" size={18} color={C.inkDim} />
        <input
          value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          placeholder="Buscar alimento (ex: banana, chocolate...)"
          style={{
            flex: 1, border: "none", background: "transparent", outline: "none",
            fontFamily: fontSans, fontSize: 14, color: C.ink,
          }}
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <Ico type="x" size={16} color={C.inkDim} />
          </button>
        )}
      </div>

      <div style={{
        background: C.sky + "06", borderRadius: 16, padding: "12px 16px", marginBottom: 16,
        border: `1px solid ${C.sky}10`, display: "flex", alignItems: "center", gap: 10,
      }}>
        <Ico type="camera" size={18} color={C.sky} />
        <div style={{ flex: 1 }}>
          <p style={{ color: C.sky, fontSize: 12, fontWeight: 700, margin: 0 }}>Scanner de Alimento</p>
          <p style={{ color: C.inkDim, fontSize: 11, margin: "2px 0 0" }}>Fotografe e a IA identifica se é seguro</p>
        </div>
        <button style={{
          padding: "7px 14px", borderRadius: 10, cursor: "pointer",
          background: C.sky, border: "none", color: "#fff",
          fontSize: 11, fontWeight: 700, fontFamily: fontSans,
        }}>Escanear</button>
      </div>

      {/* Safe */}
      <p style={{ color: C.lime, fontSize: 10, fontWeight: 700, letterSpacing: 1, margin: "0 0 10px" }}>✅ SEGUROS PARA REX</p>
      {filteredIngredients.filter(i => i.safe === true).map((item, idx) => (
        <div key={idx} style={{
          background: C.card, borderRadius: 16, padding: "14px 16px", marginBottom: 8,
          border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.lime}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 20 }}>{item.emoji}</span>
            <span style={{ color: C.ink, fontSize: 14, fontWeight: 700, fontFamily: fontSans }}>{item.name}</span>
            <Badge text="Seguro" color={C.lime} />
          </div>
          <p style={{ color: C.inkDim, fontSize: 12, lineHeight: 1.5, margin: 0, paddingLeft: 30, fontFamily: fontSans }}>{item.benefit}</p>
        </div>
      ))}

      {/* Caution */}
      {filteredIngredients.filter(i => i.safe === "caution").length > 0 && (
        <>
          <p style={{ color: C.amber, fontSize: 10, fontWeight: 700, letterSpacing: 1, margin: "14px 0 10px" }}>⚠️ COM RESTRIÇÃO</p>
          {filteredIngredients.filter(i => i.safe === "caution").map((item, idx) => (
            <div key={idx} style={{
              background: C.amber + "04", borderRadius: 16, padding: "14px 16px", marginBottom: 8,
              border: `1px solid ${C.amber}12`, borderLeft: `3px solid ${C.amber}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 20 }}>{item.emoji}</span>
                <span style={{ color: C.ink, fontSize: 14, fontWeight: 700, fontFamily: fontSans }}>{item.name}</span>
                <Badge text="Cuidado" color={C.amber} />
              </div>
              <p style={{ color: C.inkSec, fontSize: 12, lineHeight: 1.5, margin: 0, paddingLeft: 30, fontFamily: fontSans }}>{item.benefit}</p>
            </div>
          ))}
        </>
      )}

      {/* Toxic */}
      {filteredIngredients.filter(i => i.safe === false).length > 0 && (
        <>
          <p style={{ color: C.coral, fontSize: 10, fontWeight: 700, letterSpacing: 1, margin: "14px 0 10px" }}>🚫 TÓXICOS / PROIBIDOS</p>
          {filteredIngredients.filter(i => i.safe === false).map((item, idx) => (
            <div key={idx} style={{
              background: C.coral + "04", borderRadius: 16, padding: "14px 16px", marginBottom: 8,
              border: `1px solid ${C.coral}10`, borderLeft: `3px solid ${C.coral}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 20 }}>{item.emoji}</span>
                <span style={{ color: C.ink, fontSize: 14, fontWeight: 700, fontFamily: fontSans }}>{item.name}</span>
                <Badge text="TÓXICO" color={C.coral} />
              </div>
              <p style={{ color: C.coral, fontSize: 12, lineHeight: 1.5, margin: 0, paddingLeft: 30, fontWeight: 600, fontFamily: fontSans }}>{item.benefit}</p>
            </div>
          ))}
        </>
      )}
    </>
  );

  // ====== TAB: RECEITAS ======
  const TabReceitas = () => (
    <>
      <p style={{ color: C.inkSec, fontSize: 13, margin: "0 0 16px", lineHeight: 1.6, fontFamily: fontSans }}>
        Receitas aprovadas por veterinários, personalizadas para as necessidades do Rex.
      </p>

      {recipes.map((r, i) => (
        <button key={i} onClick={() => setShowRecipe(r)} style={{
          width: "100%", textAlign: "left", cursor: "pointer",
          background: C.card, borderRadius: 22, padding: 18, marginBottom: 12,
          border: `1px solid ${C.border}`, fontFamily: fontSans,
          boxShadow: C.shadow, transition: "all 0.2s",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
            <div style={{
              width: 54, height: 54, borderRadius: 18,
              background: r.color + "10", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, border: `1.5px solid ${r.color}18`,
            }}>{r.emoji}</div>
            <div style={{ flex: 1 }}>
              <p style={{ color: C.ink, fontSize: 15, fontWeight: 700, margin: 0 }}>{r.name}</p>
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <Badge text={`⏱️ ${r.time}`} color={C.inkDim} />
                <Badge text={r.difficulty} color={r.color} />
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Ico type="zap" size={14} color={r.color} />
              <span style={{ color: r.color, fontSize: 13, fontWeight: 700, fontFamily: fontMono }}>
                {r.calories} kcal{r.perUnit ? "/unid." : ""}
              </span>
            </div>
            {r.approved && (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Ico type="shield" size={13} color={C.lime} />
                <span style={{ color: C.lime, fontSize: 10, fontWeight: 700 }}>Vet aprovada</span>
              </div>
            )}
          </div>
        </button>
      ))}

      {/* Breed recommendation */}
      <div style={{
        background: `linear-gradient(135deg, ${C.earth}06, ${C.cream})`,
        borderRadius: 22, padding: 20, marginTop: 6,
        border: `1px solid ${C.earth}10`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Ico type="sparkle" size={16} color={C.earth} />
          <span style={{ color: C.earth, fontSize: 12, fontWeight: 700 }}>NUTRIÇÃO PARA LABRADORES</span>
        </div>
        <p style={{ color: C.inkSec, fontSize: 13, lineHeight: 1.7, margin: 0, fontFamily: fontSans }}>
          Labradores têm predisposição a <b>obesidade</b> e <b>problemas articulares</b>.
          A dieta ideal inclui proteína magra (25-30%), gordura controlada (12-15%),
          e suplementação de glucosamina e condroitina a partir dos 3 anos.
          Rex está com peso ideal (32 kg) — manter a ração em <b>400g/dia divididos em 2 refeições</b>.
        </p>
      </div>
    </>
  );

  const tabContent = { hoje: TabHoje, semana: TabSemana, alimentos: TabAlimentos, receitas: TabReceitas };
  const ActiveTab = tabContent[activeTab] || TabHoje;

  return (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center",
      minHeight: "100vh", padding: 20,
      background: `linear-gradient(170deg, #ECE7DA 0%, #E2DCCE 50%, #D8D1C2 100%)`,
      fontFamily: fontSans,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@400;500;600;700&family=Nunito:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div ref={containerRef} style={{
        width: 400, maxHeight: 820, background: C.bg, borderRadius: 40,
        overflow: "auto", position: "relative",
        boxShadow: `0 20px 80px rgba(42,34,24,0.12), 0 0 0 1px ${C.border}`,
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
            <h1 style={{ color: C.ink, fontSize: 21, margin: 0, fontWeight: 700, fontFamily: font }}>Nutrição do Rex</h1>
            <p style={{ color: C.inkDim, fontSize: 12, margin: "2px 0 0" }}>Cardápio, alimentos e receitas</p>
          </div>
          <div style={{
            width: 48, height: 48, borderRadius: 16, background: C.lime + "10",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 26, border: `2px solid ${C.lime}20`,
          }}>🥗</div>
        </div>

        {/* Breed info bar */}
        <div style={{
          margin: "14px 20px 0", padding: "12px 16px", borderRadius: 16,
          background: `linear-gradient(135deg, ${C.lime}08, ${C.earth}06)`,
          border: `1px solid ${C.lime}10`,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <Ico type="paw" size={16} color={C.lime} />
          <p style={{ color: C.inkSec, fontSize: 12, margin: 0, flex: 1 }}>
            <span style={{ fontWeight: 700 }}>Labrador · 32 kg · 3 anos</span> · Meta: {targetCal} kcal/dia
          </p>
          <Badge text="Peso ideal ✓" color={C.lime} />
        </div>

        {/* Tabs */}
        <div style={{
          position: "sticky", top: 28, zIndex: 15,
          padding: "16px 20px 10px",
          background: `linear-gradient(to bottom, ${C.bg}, ${C.bg}F5, ${C.bg}00)`,
        }}>
          <div style={{ display: "flex", gap: 5 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                padding: "9px 6px", borderRadius: 12, cursor: "pointer",
                background: activeTab === t.id ? C.lime : C.card,
                border: activeTab === t.id ? "none" : `1px solid ${C.border}`,
                color: activeTab === t.id ? "#fff" : C.inkDim,
                fontSize: 11, fontWeight: 700, fontFamily: fontSans,
                transition: "all 0.2s",
              }}>
                <span style={{ fontSize: 13 }}>{t.emoji}</span> {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "4px 20px 30px" }}>
          <ActiveTab />
        </div>

        {/* Rex narrative */}
        <div style={{
          margin: "0 20px 30px", padding: "18px 20px",
          background: `linear-gradient(145deg, ${C.orange}06, ${C.cream})`,
          borderRadius: 20, border: `1px solid ${C.orange}10`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <Ico type="paw" size={15} color={C.orange} />
            <span style={{ color: C.orange, fontSize: 12, fontWeight: 700, fontFamily: fontSans }}>Diário do Rex</span>
          </div>
          <p style={{
            color: C.inkSec, fontSize: 15, lineHeight: 1.9, margin: 0,
            fontFamily: "'Caveat', cursive", fontStyle: "italic",
          }}>
            "O meu humano pesa a minha comida com uma balança. EU OUVI BEM? Uma BALANÇA!
            Como se 200g fosse suficiente para um atleta como eu! Mas confesso que
            a cenoura do meio-dia não é má... crocante e com gosto de parque. E a água
            fresca é top — eu bebo, espirro, bebo de novo. Sistema perfeito. 🥕💧"
          </p>
        </div>

        {/* Recipe Modal */}
        {showRecipe && <RecipeModal recipe={showRecipe} />}

        <style>{`::-webkit-scrollbar{width:0;height:0}`}</style>
      </div>
    </div>
  );
}
