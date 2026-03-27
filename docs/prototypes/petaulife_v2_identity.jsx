import { useState, useRef } from "react";

// ======================== PETAULIFE+ DESIGN SYSTEM v2 ========================
const P = {
  // === BRAND: Teal Petróleo Vibrante ===
  brand:        '#0C9A8D',
  brandLight:   '#14B8A6',
  brandDark:    '#0A7C72',
  brandDeep:    '#086460',
  brandGlow:    '#0C9A8D15',
  brandSoft:    '#0C9A8D08',

  // === ACCENT: Coral vibrante (cor do "+") ===
  accent:       '#FF6F61',
  accentLight:  '#FF9A8F',
  accentDark:   '#E85A4E',
  accentGlow:   '#FF6F6115',

  // === SUPERFÍCIES: Clean e moderno ===
  bg:           '#F8FAFB',
  bgCool:       '#F1F5F7',
  bgDeep:       '#E6ECF0',
  white:        '#FFFFFF',
  snow:         '#FAFCFD',
  card:         '#FFFFFF',
  cardElevated: '#FFFFFF',

  // === SEMÂNTICAS ===
  sage:         '#22C55E',
  sageSoft:     '#22C55E10',
  sky:          '#3B82F6',
  skySoft:      '#3B82F610',
  coral:        '#EF4444',
  coralSoft:    '#EF444410',
  plum:         '#8B5CF6',
  plumSoft:     '#8B5CF610',
  amber:        '#F59E0B',
  amberSoft:    '#F59E0B10',
  rose:         '#EC4899',
  roseSoft:     '#EC489910',
  lime:         '#84CC16',
  limeSoft:     '#84CC1610',

  // === TEXTO ===
  ink:          '#0F172A',
  inkSec:       '#334155',
  inkDim:       '#64748B',
  inkGhost:     '#94A3B8',
  inkMuted:     '#CBD5E1',

  // === ESTRUTURA ===
  border:       '#E2E8F0',
  borderLight:  '#F1F5F9',
  shadow:       '0 2px 12px rgba(15, 23, 42, 0.06)',
  shadowMd:     '0 8px 30px rgba(15, 23, 42, 0.08)',
  shadowLg:     '0 16px 50px rgba(15, 23, 42, 0.12)',
  shadowBrand:  '0 8px 25px rgba(12, 154, 141, 0.30)',
  shadowAccent: '0 4px 15px rgba(255, 111, 97, 0.25)',
};

const fontDisplay = "'Plus Jakarta Sans', -apple-system, sans-serif";
const fontBody = "'Plus Jakarta Sans', -apple-system, sans-serif";
const fontMono = "'JetBrains Mono', monospace";
const fontHand = "'Caveat', cursive";

// ======================== LOGO v2 ========================
const PetauLogo = ({ size = "normal", white = false }) => {
  const s = size === "large" ? 1.4 : size === "small" ? 0.7 : 1;
  const textColor = white ? "#fff" : P.ink;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 * s, userSelect: "none" }}>
      <div style={{
        width: 42 * s, height: 42 * s, borderRadius: 14 * s,
        background: `linear-gradient(135deg, ${P.brand}, ${P.brandDark})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: `0 4px 16px ${P.brand}35`,
        position: "relative",
      }}>
        <svg width={22 * s} height={22 * s} viewBox="0 0 24 24" fill="#fff" stroke="none">
          <ellipse cx="12" cy="17" rx="4.5" ry="4"/><circle cx="7" cy="10.5" r="2.2"/>
          <circle cx="17" cy="10.5" r="2.2"/><circle cx="9.5" cy="6.5" r="1.8"/>
          <circle cx="14.5" cy="6.5" r="1.8"/>
        </svg>
      </div>
      <span style={{ fontSize: 23 * s, fontWeight: 800, fontFamily: fontDisplay, color: textColor, letterSpacing: -0.8 * s }}>
        Pet<span style={{ color: white ? "rgba(255,255,255,0.7)" : P.brandDark }}>au</span>Life<span style={{ color: P.accent, fontWeight: 800, fontSize: 24 * s }}>+</span>
      </span>
    </div>
  );
};

// ======================== ICONS ========================
const Ico = ({ type, size = 20, color = P.inkDim }) => {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" };
  const icons = {
    back: <svg {...p}><polyline points="15,18 9,12 15,6"/></svg>,
    eye: <svg {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    eyeOff: <svg {...p}><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
    mail: <svg {...p}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
    lock: <svg {...p}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
    unlock: <svg {...p}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 019.9-1"/></svg>,
    user: <svg {...p}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    check: <svg {...p} strokeWidth="2.5"><polyline points="20,6 9,17 4,12"/></svg>,
    x: <svg {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    plus: <svg {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    menu: <svg {...p}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="16" y2="12"/><line x1="3" y1="18" x2="19" y2="18"/></svg>,
    bell: <svg {...p}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
    heart: <svg {...p}><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
    camera: <svg {...p}><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>,
    settings: <svg {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09"/></svg>,
    help: <svg {...p}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    logout: <svg {...p}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
    shield: <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    fingerprint: <svg {...p} strokeWidth="1.5"><path d="M12 2a10 10 0 0110 10"/><path d="M12 2a10 10 0 00-8 4"/><path d="M2 12a10 10 0 002.5 6.6"/><path d="M12 6a6 6 0 016 6v2"/><path d="M12 6a6 6 0 00-6 6v2"/><path d="M12 10a2 2 0 012 2v4"/><path d="M12 10a2 2 0 00-2 2v4a4 4 0 004 4"/><path d="M6 14v2a6 6 0 003.4 5.4"/></svg>,
    face: <svg {...p}><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>,
    globe: <svg {...p}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
    sparkle: <svg {...p} strokeWidth="1.5"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/></svg>,
    paw: <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><ellipse cx="12" cy="17" rx="4.5" ry="4"/><circle cx="7" cy="10.5" r="2.2"/><circle cx="17" cy="10.5" r="2.2"/><circle cx="9.5" cy="6.5" r="1.8"/><circle cx="14.5" cy="6.5" r="1.8"/></svg>,
    clock: <svg {...p}><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>,
    alert: <svg {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
    arrowRight: <svg {...p}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/></svg>,
  };
  return icons[type] || null;
};

// ======================== SHARED COMPONENTS ========================
const InputField = ({ icon, label, type = "text", value, onChange, placeholder, error }) => {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  const isPass = type === "password";
  return (
    <div style={{ marginBottom: 20 }}>
      {label && <p style={{ color: P.inkSec, fontSize: 13, fontWeight: 700, margin: "0 0 8px", fontFamily: fontBody }}>{label}</p>}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        background: P.white, borderRadius: 16, padding: "15px 18px",
        border: `2px solid ${error ? P.coral : focused ? P.brand : P.border}`,
        transition: "all 0.2s",
        boxShadow: focused ? `0 0 0 4px ${P.brandGlow}` : "none",
      }}>
        <Ico type={icon} size={18} color={error ? P.coral : focused ? P.brand : P.inkGhost} />
        <input
          type={isPass && !show ? "password" : "text"}
          value={value} onChange={onChange} placeholder={placeholder}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontFamily: fontBody, fontSize: 15, color: P.ink }}
        />
        {isPass && (
          <button onClick={() => setShow(!show)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <Ico type={show ? "eyeOff" : "eye"} size={18} color={P.inkGhost} />
          </button>
        )}
      </div>
      {error && <p style={{ color: P.coral, fontSize: 12, fontWeight: 600, margin: "5px 0 0 18px", fontFamily: fontBody }}>{error}</p>}
    </div>
  );
};

const PasswordMeter = ({ password }) => {
  const checks = [
    { ok: password.length >= 8, label: "8+ caracteres" },
    { ok: /[A-Z]/.test(password), label: "Maiúscula" },
    { ok: /[0-9]/.test(password), label: "Número" },
    { ok: /[^A-Za-z0-9]/.test(password), label: "Especial" },
  ];
  const score = checks.filter(c => c.ok).length;
  const barColors = ["", P.coral, P.coral, P.amber, P.sage];
  if (!password) return null;
  return (
    <div style={{ marginTop: -12, marginBottom: 18 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= score ? barColors[score] : P.bgDeep, transition: "all 0.3s" }} />
        ))}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        {checks.map((c, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 4, color: c.ok ? P.sage : P.inkGhost, fontSize: 11, fontWeight: 600, fontFamily: fontBody }}>
            {c.ok ? <Ico type="check" size={11} color={P.sage} /> : <span style={{ width: 11, height: 11, borderRadius: 3, border: `1.5px solid ${P.inkMuted}`, display: "inline-block" }} />}
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
};

// ======================== PET DATA ========================
const petsData = [
  {
    id: "rex", name: "Rex", species: "dog", breed: "Labrador Retriever",
    age: "3 anos", weight: "32 kg", emoji: "🐕", color: P.brand,
    healthScore: 92, mood: "😊", diaryCount: 47, photoCount: 127,
    vaccineAlert: "2 vacinas vencidas",
    lastActivity: "Passeio no parque · Hoje 16:45",
  },
  {
    id: "luna", name: "Luna", species: "cat", breed: "Siamês",
    age: "2 anos", weight: "4.2 kg", emoji: "🐱", color: P.plum,
    healthScore: 98, mood: "😌", diaryCount: 23, photoCount: 85,
    vaccineAlert: null,
    lastActivity: "Dormindo no sol · Hoje 14:00",
  },
];

// ======================== LOGIN SCREEN ========================
const LoginScreen = ({ onLogin, onRegister }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [bioMode, setBioMode] = useState(false);
  const [bioPhase, setBioPhase] = useState(0); // 0=idle, 1=scanning, 2=done

  const handleLogin = () => {
    if (!email.includes("@")) return setError("Email inválido");
    if (password.length < 8) return setError("Mínimo 8 caracteres");
    onLogin();
  };
  const handleBio = () => {
    setBioMode(true); setBioPhase(1);
    setTimeout(() => setBioPhase(2), 2200);
    setTimeout(onLogin, 3200);
  };

  return (
    <div style={{ padding: "0 28px 40px" }}>
      {/* Hero */}
      <div style={{ textAlign: "center", padding: "34px 0 32px" }}>
        <PetauLogo size="large" />
        <p style={{ color: P.inkDim, fontSize: 15, margin: "16px 0 0", fontFamily: fontBody, fontWeight: 500 }}>
          O legado do seu melhor amigo
        </p>
      </div>

      {!bioMode ? (
        <>
          <InputField icon="mail" label="Email" placeholder="seu@email.com"
            value={email} onChange={e => { setEmail(e.target.value); setError(""); }} />
          <InputField icon="lock" label="Senha" type="password" placeholder="Mínimo 8 caracteres"
            value={password} onChange={e => { setPassword(e.target.value); setError(""); }} error={error} />

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: -12, marginBottom: 26 }}>
            <button style={{ background: "none", border: "none", cursor: "pointer", color: P.brand, fontSize: 13, fontWeight: 700, fontFamily: fontBody }}>Esqueceu a senha?</button>
          </div>

          <button onClick={handleLogin} style={{
            width: "100%", padding: "16px", borderRadius: 16, cursor: "pointer",
            background: `linear-gradient(135deg, ${P.brand}, ${P.brandDark})`,
            border: "none", color: "#fff", fontSize: 16, fontWeight: 800,
            fontFamily: fontBody, boxShadow: P.shadowBrand,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>Entrar <Ico type="arrowRight" size={18} color="#fff" /></button>

          <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "28px 0" }}>
            <div style={{ flex: 1, height: 1, background: P.border }} />
            <span style={{ color: P.inkGhost, fontSize: 12, fontFamily: fontBody, fontWeight: 600 }}>ou</span>
            <div style={{ flex: 1, height: 1, background: P.border }} />
          </div>

          <div style={{ display: "flex", gap: 12, marginBottom: 34 }}>
            {[
              { icon: "fingerprint", label: "Digital", color: P.brand },
              { icon: "face", label: "Face ID", color: P.plum },
            ].map((b, i) => (
              <button key={i} onClick={handleBio} style={{
                flex: 1, padding: "18px 10px", borderRadius: 16, cursor: "pointer",
                background: P.white, border: `2px solid ${P.border}`,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                fontFamily: fontBody, fontSize: 12, fontWeight: 700, color: P.inkSec,
                transition: "all 0.15s",
              }}>
                <Ico type={b.icon} size={32} color={b.color} />
                {b.label}
              </button>
            ))}
          </div>

          <div style={{ textAlign: "center" }}>
            <span style={{ color: P.inkDim, fontSize: 14, fontFamily: fontBody }}>Novo por aqui? </span>
            <button onClick={onRegister} style={{ background: "none", border: "none", cursor: "pointer", color: P.brand, fontSize: 14, fontWeight: 800, fontFamily: fontBody }}>Criar conta</button>
          </div>
        </>
      ) : (
        <div style={{ textAlign: "center", padding: "50px 0" }}>
          <div style={{
            width: 130, height: 130, borderRadius: 40, margin: "0 auto",
            background: bioPhase === 2 ? P.sage + "10" : bioPhase === 1 ? P.brandGlow : P.bgDeep,
            border: `3px solid ${bioPhase === 2 ? P.sage + "40" : bioPhase === 1 ? P.brand + "30" : P.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.5s",
            boxShadow: bioPhase === 1 ? `0 0 50px ${P.brand}15` : bioPhase === 2 ? `0 0 50px ${P.sage}15` : "none",
            animation: bioPhase === 1 ? "breathe 2s ease infinite" : "none",
          }}>
            {bioPhase === 2 ? <Ico type="check" size={52} color={P.sage} /> : <Ico type="fingerprint" size={52} color={bioPhase === 1 ? P.brand : P.inkGhost} />}
          </div>
          <p style={{ color: bioPhase === 2 ? P.sage : P.ink, fontSize: 20, fontWeight: 800, margin: "28px 0 8px", fontFamily: fontBody }}>
            {bioPhase === 2 ? "Identidade confirmada!" : "Escaneando..."}
          </p>
          <p style={{ color: P.inkDim, fontSize: 14, margin: 0, fontFamily: fontBody }}>
            {bioPhase === 2 ? "Bem-vinda de volta, Ana! 👋" : "Posicione o dedo no sensor"}
          </p>
          {bioPhase < 2 && (
            <button onClick={() => { setBioMode(false); setBioPhase(0); }} style={{ background: "none", border: "none", cursor: "pointer", color: P.brand, fontSize: 14, fontWeight: 700, fontFamily: fontBody, marginTop: 28 }}>← Usar email e senha</button>
          )}
        </div>
      )}
    </div>
  );
};

// ======================== REGISTER SCREEN ========================
const RegisterScreen = ({ onBack, onDone }) => {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(""); const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState("");
  const [country, setCountry] = useState("BRA"); const [city, setCity] = useState("");
  const [lang, setLang] = useState("pt-BR"); const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");

  const countries = [
    { code: "BRA", flag: "🇧🇷", name: "Brasil" }, { code: "USA", flag: "🇺🇸", name: "EUA" },
    { code: "PRT", flag: "🇵🇹", name: "Portugal" }, { code: "ESP", flag: "🇪🇸", name: "España" },
    { code: "FRA", flag: "🇫🇷", name: "France" }, { code: "DEU", flag: "🇩🇪", name: "Germany" },
    { code: "ITA", flag: "🇮🇹", name: "Italia" }, { code: "GBR", flag: "🇬🇧", name: "UK" },
  ];

  const handleNext = () => {
    if (step === 0) {
      if (!name) return setError("name");
      if (!email.includes("@")) return setError("email");
      if (password.length < 8) return setError("pass");
      if (password !== confirm) return setError("confirm");
      setError(""); setStep(1);
    } else {
      if (!city) return setError("city");
      if (!agreed) return setError("terms");
      onDone();
    }
  };

  return (
    <div style={{ padding: "0 28px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 0 24px" }}>
        <button onClick={step === 0 ? onBack : () => setStep(0)} style={{ background: P.white, border: `2px solid ${P.border}`, borderRadius: 14, width: 42, height: 42, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Ico type="back" size={18} color={P.ink} />
        </button>
        <div style={{ flex: 1 }}>
          <h2 style={{ color: P.ink, fontSize: 24, fontWeight: 800, margin: 0, fontFamily: fontDisplay }}>Criar Conta</h2>
          <p style={{ color: P.inkDim, fontSize: 13, margin: "3px 0 0", fontFamily: fontBody }}>Passo {step + 1} de 2</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
        {[0, 1].map(i => (
          <div key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: i <= step ? `linear-gradient(90deg, ${P.brand}, ${P.brandLight})` : P.bgDeep, transition: "all 0.4s" }} />
        ))}
      </div>

      {step === 0 ? (
        <>
          <InputField icon="user" label="Nome completo" placeholder="Ana Martins" value={name} onChange={e => setName(e.target.value)} error={error === "name" ? "Obrigatório" : ""} />
          <InputField icon="mail" label="Email" placeholder="ana@email.com" value={email} onChange={e => setEmail(e.target.value)} error={error === "email" ? "Email inválido" : ""} />
          <InputField icon="lock" label="Senha" type="password" placeholder="Mínimo 8 caracteres" value={password} onChange={e => setPassword(e.target.value)} error={error === "pass" ? "Mínimo 8 caracteres" : ""} />
          <PasswordMeter password={password} />
          <InputField icon="lock" label="Confirmar senha" type="password" placeholder="Repita a senha" value={confirm} onChange={e => setConfirm(e.target.value)} error={error === "confirm" ? "Não coincidem" : ""} />
        </>
      ) : (
        <>
          <p style={{ color: P.inkSec, fontSize: 13, fontWeight: 700, margin: "0 0 10px", fontFamily: fontBody }}>País</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
            {countries.map(c => (
              <button key={c.code} onClick={() => setCountry(c.code)} style={{
                padding: "9px 14px", borderRadius: 12, cursor: "pointer",
                background: country === c.code ? P.brandGlow : P.white,
                border: `2px solid ${country === c.code ? P.brand + "40" : P.border}`,
                display: "flex", alignItems: "center", gap: 6,
                fontFamily: fontBody, fontSize: 12, fontWeight: country === c.code ? 700 : 500,
                color: country === c.code ? P.brand : P.inkSec,
              }}>
                <span style={{ fontSize: 16 }}>{c.flag}</span>{c.name}
              </button>
            ))}
          </div>

          <InputField icon="globe" label="Cidade" placeholder="Ex: Salto, São Paulo" value={city} onChange={e => setCity(e.target.value)} error={error === "city" ? "Obrigatória" : ""} />

          <p style={{ color: P.inkSec, fontSize: 13, fontWeight: 700, margin: "0 0 10px", fontFamily: fontBody }}>Idioma do app</p>
          <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
            {[{ code: "pt-BR", flag: "🇧🇷", name: "Português" }, { code: "en-US", flag: "🇺🇸", name: "English" }].map(l => (
              <button key={l.code} onClick={() => setLang(l.code)} style={{
                flex: 1, padding: "14px", borderRadius: 14, cursor: "pointer",
                background: lang === l.code ? P.brandGlow : P.white,
                border: `2px solid ${lang === l.code ? P.brand + "40" : P.border}`,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                fontFamily: fontBody, fontSize: 14, fontWeight: lang === l.code ? 700 : 500,
                color: lang === l.code ? P.brand : P.inkSec,
              }}>
                <span style={{ fontSize: 20 }}>{l.flag}</span>{l.name}
              </button>
            ))}
          </div>

          <button onClick={() => setAgreed(!agreed)} style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 26, background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
            <div style={{ width: 24, height: 24, borderRadius: 8, flexShrink: 0, marginTop: 1, background: agreed ? P.brand : P.white, border: agreed ? "none" : `2px solid ${error === "terms" ? P.coral : P.border}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
              {agreed && <Ico type="check" size={14} color="#fff" />}
            </div>
            <span style={{ color: P.inkSec, fontSize: 13, lineHeight: 1.5, fontFamily: fontBody }}>
              Li e concordo com os <span style={{ color: P.brand, fontWeight: 700 }}>Termos de Uso</span> e <span style={{ color: P.brand, fontWeight: 700 }}>Política de Privacidade</span>
            </span>
          </button>
        </>
      )}

      <button onClick={handleNext} style={{
        width: "100%", padding: "16px", borderRadius: 16, cursor: "pointer",
        background: `linear-gradient(135deg, ${P.brand}, ${P.brandDark})`,
        border: "none", color: "#fff", fontSize: 16, fontWeight: 800,
        fontFamily: fontBody, boxShadow: P.shadowBrand,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      }}>{step === 0 ? "Próximo" : "Criar Conta"} <Ico type="arrowRight" size={18} color="#fff" /></button>
    </div>
  );
};

// ======================== MEUS PETS HUB ========================
const HubScreen = ({ onLogout }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addStep, setAddStep] = useState(0);
  const [addSpecies, setAddSpecies] = useState(null);
  const [addName, setAddName] = useState(""); const [addBreed, setAddBreed] = useState("");

  const dogBreeds = ["Labrador", "Golden Retriever", "Bulldog Francês", "Poodle", "Pastor Alemão", "Shih Tzu", "Yorkshire", "Rottweiler", "Border Collie", "SRD (Vira-lata)"];
  const catBreeds = ["Siamês", "Persa", "Maine Coon", "Bengal", "Ragdoll", "British Shorthair", "Sphynx", "Angorá", "Abissínio", "SRD (Vira-lata)"];

  return (
    <>
      {/* Header */}
      <div style={{ padding: "12px 20px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={() => setDrawerOpen(true)} style={{ background: P.white, border: `2px solid ${P.border}`, borderRadius: 14, width: 44, height: 44, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: P.shadow }}>
          <Ico type="menu" size={20} color={P.ink} />
        </button>
        <PetauLogo />
        <button style={{ background: P.white, border: `2px solid ${P.border}`, borderRadius: 14, width: 44, height: 44, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", boxShadow: P.shadow }}>
          <Ico type="bell" size={20} color={P.ink} />
          <div style={{ position: "absolute", top: 9, right: 10, width: 8, height: 8, borderRadius: 4, background: P.accent, border: `2px solid ${P.bg}` }} />
        </button>
      </div>

      {/* Welcome */}
      <div style={{ padding: "24px 22px 6px" }}>
        <p style={{ color: P.inkDim, fontSize: 14, margin: "0 0 2px", fontFamily: fontBody, fontWeight: 500 }}>Bem-vinda de volta,</p>
        <h2 style={{ color: P.ink, fontSize: 28, fontWeight: 800, margin: 0, fontFamily: fontDisplay, display: "flex", alignItems: "center", gap: 8 }}>
          Ana! <span style={{ fontSize: 24 }}>👋</span>
        </h2>
      </div>

      {/* Stats bar */}
      <div style={{
        margin: "18px 20px 0", padding: "16px 20px",
        background: `linear-gradient(135deg, ${P.brand}, ${P.brandDark})`,
        borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: P.shadowBrand,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Ico type="paw" size={20} color="rgba(255,255,255,0.8)" />
          <span style={{ color: "#fff", fontSize: 15, fontWeight: 700, fontFamily: fontBody }}>{petsData.length} pets cadastrados</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {petsData.map(p => <span key={p.id} style={{ fontSize: 22, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.15))" }}>{p.emoji}</span>)}
        </div>
      </div>

      {/* Vaccine alert */}
      {petsData.some(p => p.vaccineAlert) && (
        <div style={{
          margin: "14px 20px 0", padding: "13px 18px", borderRadius: 16,
          background: P.coralSoft, border: `1.5px solid ${P.coral}18`,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <Ico type="alert" size={18} color={P.coral} />
          <p style={{ color: P.coral, fontSize: 13, fontWeight: 700, margin: 0, flex: 1, fontFamily: fontBody }}>Rex tem 2 vacinas vencidas</p>
          <span style={{ color: P.coral, fontSize: 12, fontWeight: 700 }}>Ver →</span>
        </div>
      )}

      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 22px 14px" }}>
        <p style={{ color: P.inkGhost, fontSize: 11, fontWeight: 800, letterSpacing: 1.8, margin: 0, fontFamily: fontBody }}>MEUS PETS</p>
        <button onClick={() => { setShowAdd(true); setAddStep(0); setAddSpecies(null); setAddName(""); setAddBreed(""); }} style={{
          display: "flex", alignItems: "center", gap: 6,
          background: P.brandGlow, border: `1.5px solid ${P.brand}20`,
          borderRadius: 12, padding: "8px 16px", cursor: "pointer",
        }}>
          <Ico type="plus" size={14} color={P.brand} />
          <span style={{ color: P.brand, fontSize: 12, fontWeight: 800, fontFamily: fontBody }}>Novo Pet</span>
        </button>
      </div>

      {/* Pet cards */}
      <div style={{ padding: "0 20px" }}>
        {petsData.map(pet => (
          <div key={pet.id} style={{
            background: P.white, borderRadius: 24, marginBottom: 16,
            border: `1.5px solid ${P.border}`, overflow: "hidden",
            boxShadow: P.shadowMd, cursor: "pointer",
          }}>
            {/* Pet header */}
            <div style={{ padding: "22px 22px 16px", background: `linear-gradient(135deg, ${pet.color}06, ${pet.color}02)` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{
                  width: 70, height: 70, borderRadius: 22,
                  background: P.snow, border: `3px solid ${pet.color}20`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 38, boxShadow: `0 4px 16px ${pet.color}10`,
                }}>{pet.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h3 style={{ color: P.ink, fontSize: 24, fontWeight: 800, margin: 0, fontFamily: fontDisplay }}>{pet.name}</h3>
                    <span style={{ fontSize: 22 }}>{pet.mood}</span>
                  </div>
                  <p style={{ color: P.inkDim, fontSize: 13, margin: "4px 0 0", fontFamily: fontBody, fontWeight: 500 }}>{pet.breed}</p>
                  <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                    {[pet.age, pet.weight, pet.species === "dog" ? "🐕 Cão" : "🐱 Gato"].map((tag, i) => (
                      <span key={i} style={{ background: P.bg, color: P.inkDim, fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 8, fontFamily: fontBody }}>{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div style={{ padding: "14px 22px 20px" }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                {[
                  { value: pet.healthScore, label: "Saúde IA", color: pet.healthScore >= 90 ? P.sage : P.amber, icon: "shield" },
                  { value: pet.diaryCount, label: "Diário", color: P.brand, icon: "sparkle" },
                  { value: pet.photoCount, label: "Fotos", color: P.plum, icon: "camera" },
                ].map((s, i) => (
                  <div key={i} style={{ flex: 1, background: P.bg, borderRadius: 16, padding: "14px 8px", textAlign: "center" }}>
                    <span style={{ color: s.color, fontSize: 18, fontWeight: 800, fontFamily: fontMono }}>{s.value}</span>
                    <p style={{ color: P.inkDim, fontSize: 10, margin: "4px 0 0", fontFamily: fontBody, fontWeight: 600 }}>{s.label}</p>
                  </div>
                ))}
              </div>

              {pet.vaccineAlert ? (
                <div style={{ background: P.coralSoft, borderRadius: 14, padding: "10px 14px", border: `1px solid ${P.coral}08`, display: "flex", alignItems: "center", gap: 8 }}>
                  <Ico type="alert" size={15} color={P.coral} />
                  <span style={{ color: P.coral, fontSize: 12, fontWeight: 700, fontFamily: fontBody }}>{pet.vaccineAlert}</span>
                </div>
              ) : (
                <div style={{ background: P.sageSoft, borderRadius: 14, padding: "10px 14px", border: `1px solid ${P.sage}08`, display: "flex", alignItems: "center", gap: 8 }}>
                  <Ico type="check" size={15} color={P.sage} />
                  <span style={{ color: P.sage, fontSize: 12, fontWeight: 700, fontFamily: fontBody }}>Tudo em dia!</span>
                </div>
              )}

              <p style={{ color: P.inkGhost, fontSize: 12, margin: "10px 0 0", display: "flex", alignItems: "center", gap: 5, fontFamily: fontBody }}>
                <Ico type="clock" size={12} color={P.inkGhost} />{pet.lastActivity}
              </p>
            </div>
          </div>
        ))}

        {/* Add pet card */}
        <button onClick={() => { setShowAdd(true); setAddStep(0); }} style={{
          width: "100%", background: P.snow, borderRadius: 24, padding: "36px 20px",
          border: `2px dashed ${P.border}`, cursor: "pointer",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginBottom: 16, fontFamily: fontBody,
        }}>
          <div style={{ width: 60, height: 60, borderRadius: 20, background: P.bgDeep, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Ico type="plus" size={26} color={P.inkGhost} />
          </div>
          <p style={{ color: P.inkDim, fontSize: 16, fontWeight: 700, margin: 0 }}>Adicionar Novo Pet</p>
          <p style={{ color: P.inkGhost, fontSize: 13, margin: 0 }}>Apenas cães 🐕 e gatos 🐱</p>
        </button>
      </div>

      {/* AI insight */}
      <div style={{
        margin: "4px 20px 30px", padding: "20px",
        background: P.white, borderRadius: 22, border: `1.5px solid ${P.brand}12`,
        boxShadow: P.shadow,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Ico type="sparkle" size={16} color={P.brand} />
          <span style={{ color: P.brand, fontSize: 13, fontWeight: 800, fontFamily: fontBody }}>INSIGHT DA IA</span>
        </div>
        <p style={{ color: P.inkSec, fontSize: 14, lineHeight: 1.7, margin: 0, fontFamily: fontBody }}>
          <b>Rex</b> precisa de atenção nas vacinas. <b>Luna</b> está com saúde perfeita.
          No geral, seus pets estão <span style={{ color: P.sage, fontWeight: 700 }}>bem cuidados</span>. 🐾
        </p>
      </div>

      {/* Drawer */}
      <div onClick={() => setDrawerOpen(false)} style={{ position: "absolute", inset: 0, zIndex: 40, background: drawerOpen ? "rgba(15,23,42,0.3)" : "transparent", backdropFilter: drawerOpen ? "blur(6px)" : "none", pointerEvents: drawerOpen ? "auto" : "none", transition: "all 0.35s" }} />
      <div style={{
        position: "absolute", top: 0, left: 0, bottom: 0, width: "82%", zIndex: 50,
        background: P.bg, borderRadius: "0 28px 28px 0",
        transform: drawerOpen ? "translateX(0)" : "translateX(-105%)",
        transition: "transform 0.35s cubic-bezier(0.4,0,0.2,1)",
        boxShadow: drawerOpen ? P.shadowLg : "none", overflow: "auto",
      }}>
        <div style={{ padding: "50px 22px 22px", background: `linear-gradient(160deg, ${P.brand}08, ${P.bg})`, borderBottom: `1px solid ${P.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: 18, background: `linear-gradient(135deg, ${P.brand}, ${P.brandDark})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, boxShadow: P.shadowBrand }}>👩</div>
            <div>
              <h3 style={{ color: P.ink, fontSize: 18, fontWeight: 800, margin: 0, fontFamily: fontDisplay }}>Ana Martins</h3>
              <p style={{ color: P.inkDim, fontSize: 12, margin: "3px 0 0", fontFamily: fontBody }}>ana.martins@email.com</p>
            </div>
          </div>
        </div>
        <div style={{ padding: "12px 14px 30px" }}>
          {[
            { icon: "settings", label: "Preferências", sub: "Idioma, tema, notificações", color: P.inkSec },
            { icon: "help", label: "Ajuda", sub: "FAQ, tutoriais e contato", color: P.plum },
            { icon: "shield", label: "Privacidade", sub: "Dados e consentimentos", color: P.brand },
          ].map((item, i) => (
            <button key={i} style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", background: "transparent", border: "none", borderRadius: 16, padding: "14px 12px", cursor: "pointer", fontFamily: fontBody, textAlign: "left" }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: item.color + "0A", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Ico type={item.icon} size={20} color={item.color} />
              </div>
              <div>
                <p style={{ color: P.ink, fontSize: 15, fontWeight: 700, margin: 0 }}>{item.label}</p>
                <p style={{ color: P.inkDim, fontSize: 12, margin: "2px 0 0" }}>{item.sub}</p>
              </div>
            </button>
          ))}
          <div style={{ marginTop: 16, borderTop: `1px solid ${P.border}`, paddingTop: 16 }}>
            <button onClick={() => { setDrawerOpen(false); setTimeout(onLogout, 300); }} style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", background: "transparent", border: "none", borderRadius: 16, padding: "14px 12px", cursor: "pointer", fontFamily: fontBody }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: P.coral + "0A", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Ico type="logout" size={20} color={P.coral} />
              </div>
              <p style={{ color: P.coral, fontSize: 15, fontWeight: 700, margin: 0 }}>Sair do App</p>
            </button>
          </div>
          <p style={{ color: P.inkMuted, fontSize: 10, textAlign: "center", margin: "28px 0 0", fontFamily: fontMono }}>PetauLife+ v1.0.0-beta</p>
        </div>
      </div>

      {/* Add Pet Modal */}
      {showAdd && (
        <div style={{ position: "absolute", inset: 0, zIndex: 55, background: "rgba(15,23,42,0.4)", backdropFilter: "blur(10px)", display: "flex", alignItems: "flex-end" }}>
          <div style={{ background: P.bg, borderRadius: "28px 28px 0 0", width: "100%", maxHeight: "85%", overflow: "auto", padding: "8px 24px 36px" }}>
            <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 18px" }}><div style={{ width: 40, height: 5, borderRadius: 3, background: P.inkMuted }} /></div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <h3 style={{ color: P.ink, fontSize: 24, fontWeight: 800, margin: 0, fontFamily: fontDisplay }}>Novo Pet</h3>
              <button onClick={() => setShowAdd(false)} style={{ background: P.bgDeep, border: "none", borderRadius: 12, width: 38, height: 38, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Ico type="x" size={18} color={P.inkSec} /></button>
            </div>
            <div style={{ display: "flex", gap: 5, margin: "16px 0 26px" }}>
              {[0,1,2].map(i => <div key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: i <= addStep ? `linear-gradient(90deg, ${P.brand}, ${P.brandLight})` : P.bgDeep, transition: "all 0.3s" }} />)}
            </div>

            {addStep === 0 && (
              <>
                <p style={{ color: P.inkSec, fontSize: 15, margin: "0 0 20px", fontFamily: fontBody, fontWeight: 500 }}>Que tipo de pet você tem?</p>
                <div style={{ display: "flex", gap: 14 }}>
                  {[{ id: "dog", emoji: "🐕", label: "Cachorro", color: P.brand }, { id: "cat", emoji: "🐱", label: "Gato", color: P.plum }].map(s => (
                    <button key={s.id} onClick={() => { setAddSpecies(s.id); setAddStep(1); setAddBreed(""); }} style={{
                      flex: 1, padding: "36px 16px", borderRadius: 24, cursor: "pointer",
                      background: P.white, border: `2px solid ${P.border}`,
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 14, fontFamily: fontBody,
                    }}>
                      <span style={{ fontSize: 58 }}>{s.emoji}</span>
                      <span style={{ color: P.ink, fontSize: 17, fontWeight: 800 }}>{s.label}</span>
                    </button>
                  ))}
                </div>
                <p style={{ color: P.inkGhost, fontSize: 12, textAlign: "center", margin: "20px 0 0", fontFamily: fontBody }}>No momento aceitamos apenas cães e gatos</p>
              </>
            )}

            {addStep === 1 && (
              <>
                <div style={{ width: 84, height: 84, borderRadius: 26, margin: "0 auto 22px", background: P.bgDeep, border: `2px dashed ${P.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, cursor: "pointer" }}>
                  <Ico type="camera" size={26} color={P.inkGhost} />
                  <span style={{ color: P.inkGhost, fontSize: 10, fontFamily: fontBody }}>Foto</span>
                </div>
                <InputField icon="paw" label="Nome do pet" placeholder={addSpecies === "dog" ? "Ex: Rex, Thor..." : "Ex: Luna, Mimi..."} value={addName} onChange={e => setAddName(e.target.value)} />
                <p style={{ color: P.inkSec, fontSize: 13, fontWeight: 700, margin: "0 0 10px", fontFamily: fontBody }}>Raça</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 22 }}>
                  {(addSpecies === "dog" ? dogBreeds : catBreeds).map(b => (
                    <button key={b} onClick={() => setAddBreed(b)} style={{
                      padding: "9px 14px", borderRadius: 12, cursor: "pointer",
                      background: addBreed === b ? (addSpecies === "dog" ? P.brand : P.plum) + "12" : P.white,
                      border: `2px solid ${addBreed === b ? (addSpecies === "dog" ? P.brand : P.plum) + "35" : P.border}`,
                      color: addBreed === b ? (addSpecies === "dog" ? P.brand : P.plum) : P.inkSec,
                      fontSize: 12, fontWeight: addBreed === b ? 700 : 500, fontFamily: fontBody,
                    }}>{b}</button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setAddStep(0)} style={{ flex: 1, padding: 15, borderRadius: 16, cursor: "pointer", background: P.white, border: `2px solid ${P.border}`, color: P.inkSec, fontSize: 15, fontWeight: 600, fontFamily: fontBody }}>← Voltar</button>
                  <button onClick={() => addName && addBreed && setAddStep(2)} style={{
                    flex: 2, padding: 15, borderRadius: 16, cursor: "pointer",
                    background: addName && addBreed ? `linear-gradient(135deg, ${P.brand}, ${P.brandDark})` : P.bgDeep,
                    border: "none", color: addName && addBreed ? "#fff" : P.inkGhost,
                    fontSize: 15, fontWeight: 800, fontFamily: fontBody, opacity: addName && addBreed ? 1 : 0.6,
                  }}>Próximo →</button>
                </div>
              </>
            )}

            {addStep === 2 && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
                  {[{ l: "Nascimento", p: "DD/MM/AAAA" }, { l: "Peso (kg)", p: "Ex: 32" }, { l: "Sexo", p: "Macho / Fêmea" }, { l: "Castrado?", p: "Sim / Não" }].map((f, i) => (
                    <div key={i}>
                      <p style={{ color: P.inkDim, fontSize: 11, fontWeight: 700, margin: "0 0 6px", fontFamily: fontBody }}>{f.l}</p>
                      <input placeholder={f.p} style={{ width: "100%", padding: "13px 14px", borderRadius: 14, border: `2px solid ${P.border}`, background: P.white, fontFamily: fontBody, fontSize: 14, color: P.ink, outline: "none", boxSizing: "border-box" }} />
                    </div>
                  ))}
                </div>

                <div style={{
                  background: `linear-gradient(135deg, ${(addSpecies === "dog" ? P.brand : P.plum)}08, transparent)`,
                  borderRadius: 20, padding: "20px", marginBottom: 22,
                  border: `1.5px solid ${(addSpecies === "dog" ? P.brand : P.plum)}12`,
                  display: "flex", alignItems: "center", gap: 16,
                }}>
                  <span style={{ fontSize: 42 }}>{addSpecies === "dog" ? "🐕" : "🐱"}</span>
                  <div>
                    <p style={{ color: P.ink, fontSize: 20, fontWeight: 800, margin: 0, fontFamily: fontDisplay }}>{addName}</p>
                    <p style={{ color: P.inkDim, fontSize: 13, margin: "3px 0 0", fontFamily: fontBody }}>{addBreed} · {addSpecies === "dog" ? "Cachorro" : "Gato"}</p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setAddStep(1)} style={{ flex: 1, padding: 15, borderRadius: 16, cursor: "pointer", background: P.white, border: `2px solid ${P.border}`, color: P.inkSec, fontSize: 15, fontWeight: 600, fontFamily: fontBody }}>← Voltar</button>
                  <button onClick={() => setShowAdd(false)} style={{
                    flex: 2, padding: 15, borderRadius: 16, cursor: "pointer",
                    background: `linear-gradient(135deg, ${addSpecies === "dog" ? P.brand : P.plum}, ${addSpecies === "dog" ? P.brandDark : "#6040A0"})`,
                    border: "none", color: "#fff", fontSize: 15, fontWeight: 800, fontFamily: fontBody,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    boxShadow: addSpecies === "dog" ? P.shadowBrand : `0 8px 25px ${P.plum}30`,
                  }}>
                    <Ico type="paw" size={18} color="#fff" /> Cadastrar {addName}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

// ======================== MAIN APP ========================
export default function PetauLifeV2() {
  const [screen, setScreen] = useState("login");
  const containerRef = useRef();
  const scrollTop = () => { if (containerRef.current) containerRef.current.scrollTop = 0; };

  return (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center",
      minHeight: "100vh", padding: 20,
      background: `linear-gradient(170deg, #E2E8F0, #CBD5E1, #E2E8F0)`,
      fontFamily: fontBody,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Caveat:wght@400;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div ref={containerRef} style={{
        width: 400, maxHeight: 820, background: P.bg, borderRadius: 44,
        overflow: "auto", position: "relative",
        boxShadow: `0 24px 80px rgba(15,23,42,0.15), 0 0 0 1px ${P.border}`,
      }}>
        <div style={{ position: "sticky", top: 0, zIndex: 30, display: "flex", justifyContent: "center", padding: "8px 0 0", background: `linear-gradient(to bottom, ${P.bg}, transparent)` }}>
          <div style={{ width: 120, height: 28, borderRadius: 20, background: "#111827" }} />
        </div>

        {screen === "login" && <LoginScreen onLogin={() => { setScreen("hub"); scrollTop(); }} onRegister={() => { setScreen("register"); scrollTop(); }} />}
        {screen === "register" && <RegisterScreen onBack={() => { setScreen("login"); scrollTop(); }} onDone={() => { setScreen("hub"); scrollTop(); }} />}
        {screen === "hub" && <HubScreen onLogout={() => { setScreen("login"); scrollTop(); }} />}

        <style>{`
          ::-webkit-scrollbar{width:0;height:0}
          @keyframes breathe{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.04);opacity:0.8}}
        `}</style>
      </div>
    </div>
  );
}
