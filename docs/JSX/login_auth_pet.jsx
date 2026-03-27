import { useState, useRef, useEffect } from "react";

// ======================== DESIGN TOKENS ========================
const C = {
  bg: "#F7F4EE", bgDeep: "#EDE8DC", cream: "#FFFDF6", warm: "#FAF6ED",
  card: "#FFFFFF", cardAlt: "#FDFAF3",
  primary: "#D4763A", primarySoft: "#D4763A0A", primaryMed: "#D4763A15", primaryGlow: "#D4763A22",
  primaryDark: "#B8612E",
  sage: "#4A8F5E", sageSoft: "#4A8F5E08",
  sky: "#3A82C4", skySoft: "#3A82C408",
  coral: "#D06050", coralSoft: "#D0605008",
  plum: "#7E5AA8", plumSoft: "#7E5AA808",
  amber: "#CCA030", amberSoft: "#CCA03008",
  ink: "#2A1F14", inkSec: "#5A4D3E", inkDim: "#948570", inkGhost: "#BEB5A2",
  border: "#E0D8CA", borderLight: "#E8E0D4",
  shadow: "0 3px 24px rgba(42,31,20,0.06)",
  shadowLg: "0 12px 48px rgba(42,31,20,0.12)",
};
const font = "'DM Serif Display', Georgia, serif";
const fontSans = "'Nunito', -apple-system, sans-serif";
const fontMono = "'JetBrains Mono', monospace";

// ======================== ICONS ========================
const Ico = ({ type, size = 20, color = C.inkDim }) => {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" };
  const icons = {
    back: <svg {...p}><polyline points="15,18 9,12 15,6"/></svg>,
    eye: <svg {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    eyeOff: <svg {...p}><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
    mail: <svg {...p}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
    lock: <svg {...p}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
    unlock: <svg {...p}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 019.9-1"/></svg>,
    user: <svg {...p}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    users: <svg {...p}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
    shield: <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    check: <svg {...p} strokeWidth="2.5"><polyline points="20,6 9,17 4,12"/></svg>,
    x: <svg {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    plus: <svg {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    alert: <svg {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
    fingerprint: <svg {...p} strokeWidth="1.5"><path d="M12 2a10 10 0 0110 10"/><path d="M12 2a10 10 0 00-8 4"/><path d="M2 12a10 10 0 002.5 6.6"/><path d="M12 6a6 6 0 016 6v2"/><path d="M12 6a6 6 0 00-6 6v2"/><path d="M12 10a2 2 0 012 2v4"/><path d="M12 10a2 2 0 00-2 2v4a4 4 0 004 4"/><path d="M6 14v2a6 6 0 003.4 5.4"/></svg>,
    face: <svg {...p}><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>,
    settings: <svg {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
    trash: <svg {...p}><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>,
    edit: <svg {...p}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    key: <svg {...p}><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>,
    logout: <svg {...p}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
    phone: <svg {...p}><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>,
    paw: <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><ellipse cx="12" cy="17" rx="4.5" ry="4"/><circle cx="7" cy="10.5" r="2.2"/><circle cx="17" cy="10.5" r="2.2"/><circle cx="9.5" cy="6.5" r="1.8"/><circle cx="14.5" cy="6.5" r="1.8"/></svg>,
    crown: <svg {...p} fill={color} stroke="none"><path d="M2.5 18.5L4 7l4.5 4L12 4l3.5 7L20 7l1.5 11.5z"/></svg>,
    send: <svg {...p}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/></svg>,
  };
  return icons[type] || null;
};

// ======================== COMPONENTS ========================
const Badge = ({ text, color, bg, icon }) => (
  <span style={{ background: bg || color + "14", color, fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 12, fontFamily: fontSans, display: "inline-flex", alignItems: "center", gap: 4 }}>{icon}{text}</span>
);

const InputField = ({ icon, label, type = "text", value, onChange, placeholder, error, right }) => {
  const [show, setShow] = useState(false);
  const isPass = type === "password";
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <p style={{ color: C.inkSec, fontSize: 12, fontWeight: 700, margin: "0 0 6px", fontFamily: fontSans }}>{label}</p>}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        background: C.card, borderRadius: 14, padding: "12px 16px",
        border: `1.5px solid ${error ? C.coral : C.border}`,
        transition: "border-color 0.2s",
      }}>
        <Ico type={icon} size={18} color={error ? C.coral : C.inkDim} />
        <input
          type={isPass && !show ? "password" : "text"}
          value={value} onChange={onChange} placeholder={placeholder}
          style={{
            flex: 1, border: "none", background: "transparent", outline: "none",
            fontFamily: fontSans, fontSize: 14, color: C.ink,
          }}
        />
        {isPass && (
          <button onClick={() => setShow(!show)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <Ico type={show ? "eyeOff" : "eye"} size={18} color={C.inkGhost} />
          </button>
        )}
        {right}
      </div>
      {error && <p style={{ color: C.coral, fontSize: 11, fontWeight: 600, margin: "4px 0 0 16px", fontFamily: fontSans }}>{error}</p>}
    </div>
  );
};

const PasswordStrength = ({ password }) => {
  const checks = [
    { label: "Mínimo 8 caracteres", ok: password.length >= 8 },
    { label: "Uma letra maiúscula", ok: /[A-Z]/.test(password) },
    { label: "Um número", ok: /[0-9]/.test(password) },
    { label: "Um caractere especial", ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.ok).length;
  const colors = ["", C.coral, C.coral, C.amber, C.sage];
  const labels = ["", "Fraca", "Fraca", "Média", "Forte"];

  return (
    <div style={{ marginTop: -8, marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i <= score ? colors[score] : C.bgDeep,
            transition: "background 0.3s",
          }} />
        ))}
      </div>
      {password.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ color: colors[score], fontSize: 11, fontWeight: 700, fontFamily: fontSans }}>{labels[score]}</span>
        </div>
      )}
      {password.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {checks.map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{
                width: 14, height: 14, borderRadius: 4, flexShrink: 0,
                background: c.ok ? C.sage + "18" : C.bgDeep,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {c.ok && <Ico type="check" size={9} color={C.sage} />}
              </div>
              <span style={{ color: c.ok ? C.sage : C.inkDim, fontSize: 10, fontFamily: fontSans }}>{c.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ======================== BIOMETRIC ANIMATION ========================
const BiometricScan = ({ type = "fingerprint", scanning, success }) => (
  <div style={{
    width: 120, height: 120, borderRadius: 36, margin: "0 auto",
    background: success ? C.sage + "12" : scanning ? C.primary + "08" : C.bgDeep,
    border: `2.5px solid ${success ? C.sage + "40" : scanning ? C.primary + "30" : C.border}`,
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "all 0.4s",
    boxShadow: scanning ? `0 0 40px ${C.primary}15` : success ? `0 0 40px ${C.sage}15` : "none",
    animation: scanning ? "pulse 1.5s ease infinite" : "none",
  }}>
    {success
      ? <Ico type="check" size={48} color={C.sage} />
      : <Ico type={type} size={48} color={scanning ? C.primary : C.inkGhost} />
    }
  </div>
);

// ======================== SCREENS ========================

// LOGIN SCREEN
const LoginScreen = ({ onLogin, onRegister, onForgot }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [bioScanning, setBioScanning] = useState(false);
  const [bioSuccess, setBioSuccess] = useState(false);
  const [showBio, setShowBio] = useState(false);

  const handleLogin = () => {
    if (!email.includes("@")) return setError("Email inválido");
    if (password.length < 8) return setError("Senha deve ter no mínimo 8 caracteres");
    setError("");
    onLogin({ email, role: email.includes("tutor") ? "tutor" : "assistant" });
  };

  const handleBio = () => {
    setShowBio(true);
    setBioScanning(true);
    setTimeout(() => { setBioScanning(false); setBioSuccess(true); }, 2200);
    setTimeout(() => onLogin({ email: "ana@email.com", role: "tutor" }), 3200);
  };

  return (
    <div style={{ padding: "0 28px 40px", minHeight: "100%" }}>
      {/* Logo Area */}
      <div style={{ textAlign: "center", padding: "30px 0 24px" }}>
        <div style={{
          width: 80, height: 80, borderRadius: 26, margin: "0 auto 18px",
          background: `linear-gradient(145deg, ${C.primary}, ${C.primaryDark})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 8px 24px ${C.primary}30`,
        }}>
          <Ico type="paw" size={38} color="#fff" />
        </div>
        <h1 style={{ color: C.ink, fontSize: 26, fontWeight: 700, margin: "0 0 4px", fontFamily: font }}>
          Rede Solidária <span style={{ color: C.primary }}>Pets</span>
        </h1>
        <p style={{ color: C.inkDim, fontSize: 13, margin: 0, fontFamily: fontSans }}>
          O legado do seu melhor amigo
        </p>
      </div>

      {!showBio ? (
        <>
          {/* Form */}
          <InputField icon="mail" label="Email" placeholder="seu@email.com"
            value={email} onChange={e => { setEmail(e.target.value); setError(""); }} />

          <InputField icon="lock" label="Senha" type="password" placeholder="Mínimo 8 caracteres"
            value={password} onChange={e => { setPassword(e.target.value); setError(""); }}
            error={error} />

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: -8, marginBottom: 20 }}>
            <button onClick={onForgot} style={{ background: "none", border: "none", cursor: "pointer", color: C.primary, fontSize: 12, fontWeight: 700, fontFamily: fontSans }}>
              Esqueceu a senha?
            </button>
          </div>

          {/* Login Button */}
          <button onClick={handleLogin} style={{
            width: "100%", padding: "15px", borderRadius: 16, cursor: "pointer",
            background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`,
            border: "none", color: "#fff", fontSize: 15, fontWeight: 800,
            fontFamily: fontSans, boxShadow: `0 4px 16px ${C.primary}30`,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            <Ico type="unlock" size={18} color="#fff" /> Entrar
          </button>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "24px 0" }}>
            <div style={{ flex: 1, height: 1, background: C.border }} />
            <span style={{ color: C.inkGhost, fontSize: 11, fontFamily: fontSans }}>ou entre com</span>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>

          {/* Biometric Options */}
          <div style={{ display: "flex", gap: 10, marginBottom: 28 }}>
            <button onClick={handleBio} style={{
              flex: 1, padding: "14px", borderRadius: 14, cursor: "pointer",
              background: C.card, border: `1.5px solid ${C.border}`,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
              fontFamily: fontSans, fontSize: 11, fontWeight: 700, color: C.inkSec,
              transition: "all 0.2s",
            }}>
              <Ico type="fingerprint" size={28} color={C.primary} />
              Impressão Digital
            </button>
            <button onClick={handleBio} style={{
              flex: 1, padding: "14px", borderRadius: 14, cursor: "pointer",
              background: C.card, border: `1.5px solid ${C.border}`,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
              fontFamily: fontSans, fontSize: 11, fontWeight: 700, color: C.inkSec,
            }}>
              <Ico type="face" size={28} color={C.plum} />
              Reconhecimento Facial
            </button>
          </div>

          {/* Register */}
          <div style={{ textAlign: "center" }}>
            <span style={{ color: C.inkDim, fontSize: 13, fontFamily: fontSans }}>Não tem conta? </span>
            <button onClick={onRegister} style={{ background: "none", border: "none", cursor: "pointer", color: C.primary, fontSize: 13, fontWeight: 800, fontFamily: fontSans }}>
              Criar conta
            </button>
          </div>
        </>
      ) : (
        /* Biometric Scanning */
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <BiometricScan scanning={bioScanning} success={bioSuccess} />
          <p style={{ color: bioSuccess ? C.sage : C.ink, fontSize: 18, fontWeight: 700, margin: "24px 0 6px", fontFamily: fontSans }}>
            {bioSuccess ? "Identidade confirmada!" : "Escaneando..."}
          </p>
          <p style={{ color: C.inkDim, fontSize: 13, margin: "0 0 24px" }}>
            {bioSuccess ? "Bem-vinda de volta, Ana!" : "Posicione o dedo no sensor"}
          </p>
          {!bioSuccess && (
            <button onClick={() => setShowBio(false)} style={{
              background: "none", border: "none", cursor: "pointer",
              color: C.primary, fontSize: 13, fontWeight: 700, fontFamily: fontSans,
            }}>Usar senha →</button>
          )}
        </div>
      )}
    </div>
  );
};

// REGISTER SCREEN
const RegisterScreen = ({ onBack, onRegister }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = () => {
    if (!name) return setError("nome");
    if (!email.includes("@")) return setError("email");
    if (password.length < 8) return setError("senha");
    if (password !== confirm) return setError("confirmar");
    if (!agreed) return setError("termos");
    onRegister();
  };

  return (
    <div style={{ padding: "0 28px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 0 20px" }}>
        <button onClick={onBack} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, width: 38, height: 38, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Ico type="back" size={18} color={C.ink} />
        </button>
        <div>
          <h2 style={{ color: C.ink, fontSize: 22, fontWeight: 700, margin: 0, fontFamily: font }}>Criar Conta</h2>
          <p style={{ color: C.inkDim, fontSize: 12, margin: "2px 0 0" }}>Conta de Tutor (proprietário)</p>
        </div>
      </div>

      {/* Role Badge */}
      <div style={{
        background: C.primarySoft, borderRadius: 16, padding: "14px 18px", marginBottom: 22,
        border: `1px solid ${C.primary}10`, display: "flex", alignItems: "center", gap: 12,
      }}>
        <Ico type="crown" size={20} color={C.primary} />
        <div>
          <p style={{ color: C.primary, fontSize: 12, fontWeight: 700, margin: 0, fontFamily: fontSans }}>Conta de Tutor</p>
          <p style={{ color: C.inkDim, fontSize: 11, margin: "2px 0 0" }}>Acesso total · Pode convidar até 2 assistentes</p>
        </div>
      </div>

      <InputField icon="user" label="Nome completo" placeholder="Ana Martins"
        value={name} onChange={e => setName(e.target.value)} error={error === "nome" ? "Nome obrigatório" : ""} />

      <InputField icon="mail" label="Email" placeholder="ana@email.com"
        value={email} onChange={e => setEmail(e.target.value)} error={error === "email" ? "Email inválido" : ""} />

      <InputField icon="lock" label="Senha" type="password" placeholder="Mínimo 8 caracteres"
        value={password} onChange={e => setPassword(e.target.value)} error={error === "senha" ? "Mínimo 8 caracteres" : ""} />

      <PasswordStrength password={password} />

      <InputField icon="lock" label="Confirmar senha" type="password" placeholder="Repita a senha"
        value={confirm} onChange={e => setConfirm(e.target.value)} error={error === "confirmar" ? "Senhas não coincidem" : ""} />

      {/* Terms */}
      <button onClick={() => setAgreed(!agreed)} style={{
        display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 22,
        background: "none", border: "none", cursor: "pointer", textAlign: "left",
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1,
          background: agreed ? C.primary : C.bgDeep,
          border: agreed ? "none" : `2px solid ${error === "termos" ? C.coral : C.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {agreed && <Ico type="check" size={13} color="#fff" />}
        </div>
        <span style={{ color: C.inkSec, fontSize: 12, lineHeight: 1.5, fontFamily: fontSans }}>
          Li e concordo com os <span style={{ color: C.primary, fontWeight: 700 }}>Termos de Uso</span> e
          a <span style={{ color: C.primary, fontWeight: 700 }}>Política de Privacidade</span>
        </span>
      </button>

      <button onClick={handleRegister} style={{
        width: "100%", padding: "15px", borderRadius: 16, cursor: "pointer",
        background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`,
        border: "none", color: "#fff", fontSize: 15, fontWeight: 800,
        fontFamily: fontSans, boxShadow: `0 4px 16px ${C.primary}30`,
      }}>Criar Conta de Tutor</button>

      <p style={{ color: C.inkDim, fontSize: 11, textAlign: "center", margin: "16px 0 0", lineHeight: 1.5, fontFamily: fontSans }}>
        Após criar a conta, você poderá configurar a biometria e convidar até 2 assistentes.
      </p>
    </div>
  );
};

// ASSISTANT MANAGEMENT SCREEN
const AssistantScreen = ({ onBack }) => {
  const [showInvite, setShowInvite] = useState(false);
  const [invEmail, setInvEmail] = useState("");

  const assistants = [
    {
      id: 1, name: "Maria Santos", email: "maria.santos@email.com",
      role: "Assistente", status: "active", since: "15 Jun 2023",
      avatar: "👩‍🦰", biometric: true,
      permissions: {
        view_health: true, edit_health: true,
        view_diary: true, edit_diary: true,
        view_photos: true, add_photos: true,
        manage_calendar: true, view_finances: true,
        manage_plans: true, delete_data: false,
      },
    },
    {
      id: 2, name: null, email: null,
      role: "Vaga disponível", status: "empty",
    },
  ];

  const permissionLabels = [
    { key: "view_health", label: "Ver prontuário de saúde", icon: "shield", group: "Saúde" },
    { key: "edit_health", label: "Editar prontuário", icon: "edit", group: "Saúde" },
    { key: "view_diary", label: "Ver diário de vida", icon: "eye", group: "Conteúdo" },
    { key: "edit_diary", label: "Escrever no diário", icon: "edit", group: "Conteúdo" },
    { key: "view_photos", label: "Ver fotos e vídeos", icon: "eye", group: "Conteúdo" },
    { key: "add_photos", label: "Adicionar fotos e vídeos", icon: "plus", group: "Conteúdo" },
    { key: "manage_calendar", label: "Gerenciar agenda de cuidados", icon: "settings", group: "Gestão" },
    { key: "view_finances", label: "Ver planos e seguros", icon: "eye", group: "Gestão" },
    { key: "manage_plans", label: "Gerenciar planos", icon: "settings", group: "Gestão" },
    { key: "delete_data", label: "Excluir dados", icon: "trash", group: "Restrição", locked: true },
  ];

  return (
    <div style={{ padding: "0 20px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 0 20px" }}>
        <button onClick={onBack} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, width: 38, height: 38, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Ico type="back" size={18} color={C.ink} />
        </button>
        <div style={{ flex: 1 }}>
          <h2 style={{ color: C.ink, fontSize: 20, fontWeight: 700, margin: 0, fontFamily: font }}>Gerenciar Acessos</h2>
          <p style={{ color: C.inkDim, fontSize: 12, margin: "2px 0 0" }}>Tutor e assistentes</p>
        </div>
      </div>

      {/* Tutor Card (Owner) */}
      <div style={{
        background: `linear-gradient(145deg, ${C.primary}08, ${C.cream})`,
        borderRadius: 22, padding: 20, marginBottom: 16,
        border: `1px solid ${C.primary}12`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 18,
            background: C.primary + "12", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, border: `2.5px solid ${C.primary}30`,
            boxShadow: `0 4px 14px ${C.primary}15`,
          }}>👩</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: C.ink, fontSize: 16, fontWeight: 700, fontFamily: fontSans }}>Ana Martins</span>
              <Badge text="Proprietária" color={C.primary} icon={<Ico type="crown" size={10} color={C.primary} />} />
            </div>
            <p style={{ color: C.inkDim, fontSize: 12, margin: "3px 0 0" }}>ana.martins@email.com</p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {[
            { icon: "shield", label: "Acesso total", color: C.sage },
            { icon: "fingerprint", label: "Biometria ativa", color: C.plum },
            { icon: "users", label: "1/2 assistentes", color: C.sky },
          ].map((s, i) => (
            <div key={i} style={{
              flex: 1, background: C.card, borderRadius: 12, padding: "10px 8px",
              border: `1px solid ${C.border}`, textAlign: "center",
            }}>
              <Ico type={s.icon} size={16} color={s.color} />
              <p style={{ color: C.inkDim, fontSize: 9, margin: "4px 0 0", fontFamily: fontSans }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Assistants Section */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "6px 0 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Ico type="users" size={16} color={C.primary} />
          <span style={{ color: C.inkDim, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, fontFamily: fontSans }}>ASSISTENTES (1/2)</span>
        </div>
      </div>

      {/* Permission Note */}
      <div style={{
        background: C.amber + "06", borderRadius: 14, padding: "12px 16px", marginBottom: 16,
        border: `1px solid ${C.amber}12`, display: "flex", alignItems: "flex-start", gap: 10,
      }}>
        <Ico type="alert" size={16} color={C.amber} />
        <p style={{ color: C.inkSec, fontSize: 12, lineHeight: 1.6, margin: 0, fontFamily: fontSans }}>
          Assistentes podem fazer <b>tudo</b> na plataforma, <span style={{ color: C.coral, fontWeight: 700 }}>exceto excluir dados</span>.
          Apenas o tutor proprietário pode remover informações.
        </p>
      </div>

      {/* Assistant Cards */}
      {assistants.map((a, i) => (
        <div key={i} style={{
          background: a.status === "empty" ? C.warm : C.card,
          borderRadius: 22, padding: a.status === "empty" ? 20 : 0,
          border: a.status === "empty" ? `2px dashed ${C.border}` : `1px solid ${C.border}`,
          marginBottom: 14, overflow: "hidden", boxShadow: a.status === "active" ? C.shadow : "none",
        }}>
          {a.status === "active" ? (
            <>
              <div style={{ padding: "18px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                  <div style={{
                    width: 50, height: 50, borderRadius: 16,
                    background: C.sky + "12", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 24, border: `2px solid ${C.sky}20`,
                  }}>{a.avatar}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: C.ink, fontSize: 15, fontWeight: 700, fontFamily: fontSans }}>{a.name}</span>
                      <Badge text="Assistente" color={C.sky} />
                    </div>
                    <p style={{ color: C.inkDim, fontSize: 11, margin: "3px 0 0" }}>{a.email}</p>
                  </div>
                </div>

                {/* Quick Info */}
                <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                  <div style={{ flex: 1, background: C.warm, borderRadius: 10, padding: "8px 10px", display: "flex", alignItems: "center", gap: 6 }}>
                    <Ico type="key" size={13} color={C.inkDim} />
                    <span style={{ color: C.inkSec, fontSize: 10, fontFamily: fontSans }}>Desde {a.since}</span>
                  </div>
                  <div style={{
                    flex: 1, background: a.biometric ? C.sage + "08" : C.warm,
                    borderRadius: 10, padding: "8px 10px", display: "flex", alignItems: "center", gap: 6,
                  }}>
                    <Ico type="fingerprint" size={13} color={a.biometric ? C.sage : C.inkGhost} />
                    <span style={{ color: a.biometric ? C.sage : C.inkDim, fontSize: 10, fontWeight: a.biometric ? 700 : 500, fontFamily: fontSans }}>
                      {a.biometric ? "Biometria ativa" : "Sem biometria"}
                    </span>
                  </div>
                </div>

                {/* Permissions */}
                <p style={{ color: C.inkDim, fontSize: 10, fontWeight: 700, letterSpacing: 1, margin: "0 0 10px", fontFamily: fontSans }}>PERMISSÕES</p>
                {permissionLabels.map((pm) => (
                  <div key={pm.key} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
                    borderBottom: `1px solid ${C.borderLight}`,
                  }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                      background: pm.locked ? C.coral + "10" : a.permissions[pm.key] ? C.sage + "10" : C.bgDeep,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {pm.locked
                        ? <Ico type="lock" size={12} color={C.coral} />
                        : a.permissions[pm.key]
                          ? <Ico type="check" size={12} color={C.sage} />
                          : <Ico type="x" size={12} color={C.inkGhost} />
                      }
                    </div>
                    <span style={{
                      flex: 1, color: pm.locked ? C.coral : C.inkSec,
                      fontSize: 12, fontWeight: pm.locked ? 700 : 600, fontFamily: fontSans,
                    }}>{pm.label}</span>
                    {pm.locked && <Badge text="Bloqueado" color={C.coral} />}
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div style={{
                display: "flex", borderTop: `1px solid ${C.borderLight}`,
              }}>
                <button style={{
                  flex: 1, padding: "13px", cursor: "pointer",
                  background: "none", border: "none", borderRight: `1px solid ${C.borderLight}`,
                  fontFamily: fontSans, fontSize: 12, fontWeight: 700, color: C.inkSec,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}><Ico type="edit" size={14} color={C.inkDim} /> Editar</button>
                <button style={{
                  flex: 1, padding: "13px", cursor: "pointer",
                  background: "none", border: "none",
                  fontFamily: fontSans, fontSize: 12, fontWeight: 700, color: C.coral,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}><Ico type="trash" size={14} color={C.coral} /> Remover</button>
              </div>
            </>
          ) : (
            /* Empty slot */
            <button onClick={() => setShowInvite(true)} style={{
              width: "100%", background: "none", border: "none", cursor: "pointer",
              textAlign: "center", fontFamily: fontSans, padding: 0,
            }}>
              <div style={{
                width: 50, height: 50, borderRadius: 16, margin: "0 auto 12px",
                background: C.bgDeep, border: `2px dashed ${C.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Ico type="plus" size={22} color={C.inkGhost} />
              </div>
              <p style={{ color: C.inkDim, fontSize: 14, fontWeight: 700, margin: 0 }}>Convidar Assistente</p>
              <p style={{ color: C.inkGhost, fontSize: 12, margin: "4px 0 0" }}>Vaga 2 de 2 disponível</p>
            </button>
          )}
        </div>
      ))}

      {/* Invite Modal */}
      {showInvite && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: "rgba(42,31,20,0.45)", backdropFilter: "blur(10px)",
          display: "flex", alignItems: "flex-end", justifyContent: "center",
        }}>
          <div style={{
            background: C.bg, borderRadius: "28px 28px 0 0", width: "100%", maxWidth: 400,
            padding: "8px 22px 32px",
          }}>
            <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 16px" }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: C.inkGhost }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <h3 style={{ color: C.ink, fontSize: 20, fontWeight: 700, margin: 0, fontFamily: font }}>Convidar Assistente</h3>
              <button onClick={() => setShowInvite(false)} style={{ background: C.bgDeep, border: "none", borderRadius: 10, width: 36, height: 36, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Ico type="x" size={18} color={C.inkSec} />
              </button>
            </div>
            <p style={{ color: C.inkDim, fontSize: 13, margin: "4px 0 20px", lineHeight: 1.6, fontFamily: fontSans }}>
              O assistente receberá um convite por email para criar a própria conta com senha e biometria.
            </p>

            <InputField icon="user" label="Nome do assistente" placeholder="Nome completo"
              value="" onChange={() => {}} />

            <InputField icon="mail" label="Email do assistente" placeholder="assistente@email.com"
              value={invEmail} onChange={e => setInvEmail(e.target.value)} />

            <div style={{
              background: C.amber + "06", borderRadius: 14, padding: "12px 16px", marginBottom: 18,
              border: `1px solid ${C.amber}12`,
            }}>
              <p style={{ color: C.inkSec, fontSize: 12, lineHeight: 1.6, margin: 0, fontFamily: fontSans }}>
                O assistente terá acesso a <b>todas as funcionalidades</b> do app,
                <span style={{ color: C.coral, fontWeight: 700 }}> exceto excluir dados</span>.
                Apenas você (tutor) pode remover informações.
              </p>
            </div>

            <button onClick={() => setShowInvite(false)} style={{
              width: "100%", padding: "15px", borderRadius: 16, cursor: "pointer",
              background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`,
              border: "none", color: "#fff", fontSize: 14, fontWeight: 800,
              fontFamily: fontSans, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              <Ico type="send" size={16} color="#fff" /> Enviar Convite
            </button>
          </div>
        </div>
      )}

      {/* Security Info */}
      <div style={{
        background: C.sage + "06", borderRadius: 18, padding: "16px 18px",
        border: `1px solid ${C.sage}10`, marginTop: 6,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Ico type="shield" size={16} color={C.sage} />
          <span style={{ color: C.sage, fontSize: 12, fontWeight: 700, fontFamily: fontSans }}>Segurança</span>
        </div>
        {[
          "Todos os dados são criptografados de ponta a ponta",
          "Biometria armazenada apenas no dispositivo local",
          "Sessões expiram automaticamente após 30 dias de inatividade",
          "Histórico de acessos disponível nas configurações",
        ].map((t, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Ico type="check" size={12} color={C.sage} />
            <span style={{ color: C.inkSec, fontSize: 11, fontFamily: fontSans }}>{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ======================== MAIN APP ========================
export default function AuthApp() {
  const [screen, setScreen] = useState("login"); // login, register, forgot, home, assistants
  const [user, setUser] = useState(null);
  const containerRef = useRef();

  const handleLogin = (u) => {
    setUser(u);
    setScreen("home");
  };

  const scrollTop = () => {
    if (containerRef.current) containerRef.current.scrollTop = 0;
  };

  // HOME (after login)
  const HomeScreen = () => (
    <div style={{ padding: "0 20px 40px" }}>
      <div style={{ padding: "20px 0", textAlign: "center" }}>
        <div style={{
          width: 72, height: 72, borderRadius: 24, margin: "0 auto 14px",
          background: `linear-gradient(145deg, ${C.primary}, ${C.primaryDark})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 6px 20px ${C.primary}25`,
        }}>
          <Ico type="paw" size={34} color="#fff" />
        </div>
        <h2 style={{ color: C.ink, fontSize: 22, fontWeight: 700, margin: "0 0 4px", fontFamily: font }}>
          Olá, {user?.role === "tutor" ? "Ana" : "Assistente"}! 👋
        </h2>
        <p style={{ color: C.inkDim, fontSize: 13, margin: "0 0 6px" }}>
          Logada como <span style={{ color: C.primary, fontWeight: 700 }}>{user?.role === "tutor" ? "Tutora (Proprietária)" : "Assistente"}</span>
        </p>
        <Badge
          text={user?.role === "tutor" ? "Acesso Total" : "Sem permissão para excluir"}
          color={user?.role === "tutor" ? C.sage : C.amber}
        />
      </div>

      {/* Quick Menu */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button onClick={() => { setScreen("assistants"); scrollTop(); }} style={{
          display: "flex", alignItems: "center", gap: 14, width: "100%",
          background: C.card, borderRadius: 18, padding: "16px 18px",
          border: `1px solid ${C.border}`, cursor: "pointer", textAlign: "left",
          fontFamily: fontSans, boxShadow: C.shadow,
        }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: C.primary + "10", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Ico type="users" size={20} color={C.primary} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ color: C.ink, fontSize: 14, fontWeight: 700, margin: 0 }}>Gerenciar Assistentes</p>
            <p style={{ color: C.inkDim, fontSize: 12, margin: "3px 0 0" }}>1 de 2 vagas preenchidas</p>
          </div>
          <Ico type="back" size={16} color={C.inkDim} />
        </button>

        {[
          { icon: "fingerprint", label: "Configurar Biometria", sub: "Impressão digital e reconhecimento facial", color: C.plum },
          { icon: "key", label: "Alterar Senha", sub: "Última alteração: 15 Mar 2026", color: C.amber },
          { icon: "shield", label: "Histórico de Acessos", sub: "3 dispositivos ativos", color: C.sage },
          { icon: "phone", label: "Dispositivos Conectados", sub: "iPhone, iPad, Desktop", color: C.sky },
          { icon: "logout", label: "Sair da Conta", sub: "Encerrar sessão neste dispositivo", color: C.coral },
        ].map((item, i) => (
          <button key={i} onClick={item.icon === "logout" ? () => { setUser(null); setScreen("login"); scrollTop(); } : undefined} style={{
            display: "flex", alignItems: "center", gap: 14, width: "100%",
            background: C.card, borderRadius: 18, padding: "16px 18px",
            border: `1px solid ${C.border}`, cursor: "pointer", textAlign: "left",
            fontFamily: fontSans,
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: item.color + "10", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Ico type={item.icon} size={20} color={item.color} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ color: item.icon === "logout" ? C.coral : C.ink, fontSize: 14, fontWeight: 700, margin: 0 }}>{item.label}</p>
              <p style={{ color: C.inkDim, fontSize: 12, margin: "3px 0 0" }}>{item.sub}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Session info */}
      <div style={{
        marginTop: 18, background: C.warm, borderRadius: 16, padding: "14px 18px",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <Ico type="shield" size={16} color={C.sage} />
        <p style={{ color: C.inkDim, fontSize: 11, margin: 0, fontFamily: fontSans }}>
          Sessão segura · Criptografia AES-256 · Último acesso: Hoje 16:45
        </p>
      </div>
    </div>
  );

  // FORGOT PASSWORD
  const ForgotScreen = () => {
    const [email, setEmail] = useState("");
    const [sent, setSent] = useState(false);

    return (
      <div style={{ padding: "0 28px 40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 0 24px" }}>
          <button onClick={() => { setScreen("login"); scrollTop(); }} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, width: 38, height: 38, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Ico type="back" size={18} color={C.ink} />
          </button>
          <h2 style={{ color: C.ink, fontSize: 20, fontWeight: 700, margin: 0, fontFamily: font }}>Recuperar Senha</h2>
        </div>

        {!sent ? (
          <>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{
                width: 70, height: 70, borderRadius: 22, margin: "0 auto 16px",
                background: C.amber + "10", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Ico type="mail" size={32} color={C.amber} />
              </div>
              <p style={{ color: C.inkSec, fontSize: 14, lineHeight: 1.6, margin: 0, fontFamily: fontSans }}>
                Digite seu email e enviaremos um link para redefinir sua senha.
              </p>
            </div>

            <InputField icon="mail" label="Email cadastrado" placeholder="seu@email.com"
              value={email} onChange={e => setEmail(e.target.value)} />

            <button onClick={() => setSent(true)} style={{
              width: "100%", padding: "15px", borderRadius: 16, cursor: "pointer",
              background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`,
              border: "none", color: "#fff", fontSize: 15, fontWeight: 800,
              fontFamily: fontSans,
            }}>Enviar Link de Recuperação</button>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{
              width: 70, height: 70, borderRadius: 22, margin: "0 auto 16px",
              background: C.sage + "10", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Ico type="check" size={32} color={C.sage} />
            </div>
            <h3 style={{ color: C.ink, fontSize: 18, fontWeight: 700, margin: "0 0 8px", fontFamily: font }}>Email Enviado!</h3>
            <p style={{ color: C.inkDim, fontSize: 13, lineHeight: 1.6, margin: "0 0 24px", fontFamily: fontSans }}>
              Verifique sua caixa de entrada e spam. O link expira em 30 minutos.
            </p>
            <button onClick={() => { setScreen("login"); scrollTop(); }} style={{
              padding: "12px 28px", borderRadius: 14, cursor: "pointer",
              background: C.card, border: `1px solid ${C.border}`,
              color: C.primary, fontSize: 14, fontWeight: 700, fontFamily: fontSans,
            }}>Voltar ao Login</button>
          </div>
        )}
      </div>
    );
  };

  const screens = {
    login: () => <LoginScreen
      onLogin={handleLogin}
      onRegister={() => { setScreen("register"); scrollTop(); }}
      onForgot={() => { setScreen("forgot"); scrollTop(); }}
    />,
    register: () => <RegisterScreen
      onBack={() => { setScreen("login"); scrollTop(); }}
      onRegister={() => handleLogin({ email: "ana@email.com", role: "tutor" })}
    />,
    forgot: () => <ForgotScreen />,
    home: () => <HomeScreen />,
    assistants: () => <AssistantScreen onBack={() => { setScreen("home"); scrollTop(); }} />,
  };

  const Screen = screens[screen] || screens.login;

  return (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center",
      minHeight: "100vh", padding: 20,
      background: `linear-gradient(170deg, #EDE8DC 0%, #E3DACB 50%, #D9D0C0 100%)`,
      fontFamily: fontSans,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Nunito:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div ref={containerRef} style={{
        width: 400, maxHeight: 820, background: C.bg, borderRadius: 40,
        overflow: "auto", position: "relative",
        boxShadow: `0 20px 80px rgba(42,31,20,0.12), 0 0 0 1px ${C.border}`,
      }}>
        {/* Notch */}
        <div style={{ position: "sticky", top: 0, zIndex: 30, display: "flex", justifyContent: "center", padding: "8px 0 0", background: `linear-gradient(to bottom, ${C.bg}, transparent)` }}>
          <div style={{ width: 120, height: 28, borderRadius: 20, background: "#1a1a1a" }} />
        </div>

        <Screen />

        <style>{`
          ::-webkit-scrollbar{width:0;height:0}
          @keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.04);opacity:0.85}}
        `}</style>
      </div>
    </div>
  );
}
