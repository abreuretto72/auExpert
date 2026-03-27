import { useState, useRef } from "react";

// ======================== PETAULIFE+ DESIGN SYSTEM v4 ========================
const C = {
  bg: "#0F1923", bgCard: "#162231", bgDeep: "#0B1219",
  card: "#1A2B3D", cardHover: "#1E3145", glow: "#2A4A6B",
  accent: "#E8813A", accentLight: "#F09A56", accentDark: "#CC6E2E",
  accentGlow: "#E8813A15", accentMed: "#E8813A30",
  petrol: "#1B8EAD", petrolLight: "#22A8CC", petrolDark: "#15748F",
  petrolGlow: "#1B8EAD15",
  success: "#2ECC71", successSoft: "#2ECC7112",
  danger: "#E74C3C", dangerSoft: "#E74C3C12",
  warning: "#F1C40F", warningSoft: "#F1C40F12",
  purple: "#9B59B6", purpleSoft: "#9B59B612",
  gold: "#F39C12",
  text: "#E8EDF2", textSec: "#8FA3B8", textDim: "#5E7A94", textGhost: "#2E4254",
  // Placeholder mais visível que antes
  placeholder: "#5E7A94",
  border: "#1E3248", borderLight: "#243A50",
  shadow: "0 4px 24px rgba(0,0,0,0.3)",
  shadowAccent: "0 8px 30px rgba(232,129,58,0.25)",
};
const font = "'Sora', -apple-system, sans-serif";
const fontMono = "'JetBrains Mono', monospace";

// ======================== SVG ICONS (Modern, Simple, Colorful) ========================
const Icon = {
  // Pata do logo (custom)
  paw: (size = 24, color = "#fff") => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
      <ellipse cx="12" cy="17" rx="4.5" ry="4"/><circle cx="7" cy="10.5" r="2.2"/>
      <circle cx="17" cy="10.5" r="2.2"/><circle cx="9.5" cy="6.5" r="1.8"/>
      <circle cx="14.5" cy="6.5" r="1.8"/>
    </svg>
  ),
  // Email — envelope moderno
  mail: (size = 20, color = C.petrol) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="3"/>
      <path d="M22 7l-10 6L2 7"/>
    </svg>
  ),
  // Lock — cadeado moderno
  lock: (size = 20, color = C.accent) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="3"/>
      <path d="M7 11V7a5 5 0 0110 0v4"/>
      <circle cx="12" cy="16.5" r="1.5" fill={color} stroke="none"/>
    </svg>
  ),
  // Unlock
  unlock: (size = 20, color = C.accent) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="3"/>
      <path d="M7 11V7a5 5 0 019.9-1"/>
    </svg>
  ),
  // Mic — microfone (speech to text) — SEMPRE laranja
  mic: (size = 20, color = C.accent) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 00-3 3v6a3 3 0 006 0V5a3 3 0 00-3-3z"/>
      <path d="M19 10v1a7 7 0 01-14 0v-1"/>
      <line x1="12" y1="18" x2="12" y2="22"/>
      <line x1="8" y1="22" x2="16" y2="22"/>
    </svg>
  ),
  // Mic active (pulsing state)
  micActive: (size = 20, color = C.accent) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2a3 3 0 00-3 3v6a3 3 0 006 0V5a3 3 0 00-3-3z" fill={color} opacity="0.2" stroke={color} strokeWidth="1.8"/>
      <path d="M19 10v1a7 7 0 01-14 0v-1" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="12" y1="18" x2="12" y2="22" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="8" y1="22" x2="16" y2="22" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="12" cy="8" r="10" fill="none" stroke={color} opacity="0.15" strokeWidth="1"/>
    </svg>
  ),
  // Eye — mostrar senha
  eye: (size = 20, color = C.textDim) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  // Eye off
  eyeOff: (size = 20, color = C.textDim) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ),
  // Arrow right
  arrowRight: (size = 18, color = "#fff") => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12,5 19,12 12,19"/>
    </svg>
  ),
  // Fingerprint
  fingerprint: (size = 32, color = C.accent) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a10 10 0 0110 10"/>
      <path d="M12 2a10 10 0 00-8 4"/>
      <path d="M2 12a10 10 0 002.5 6.6"/>
      <path d="M12 6a6 6 0 016 6v2"/>
      <path d="M12 6a6 6 0 00-6 6v2"/>
      <path d="M12 10a2 2 0 012 2v4"/>
      <path d="M12 10a2 2 0 00-2 2v4a4 4 0 004 4"/>
      <path d="M6 14v2a6 6 0 003.4 5.4"/>
    </svg>
  ),
  // Face scan
  faceScan: (size = 32, color = C.purple) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3H5a2 2 0 00-2 2v2"/>
      <path d="M17 3h2a2 2 0 012 2v2"/>
      <path d="M7 21H5a2 2 0 01-2-2v-2"/>
      <path d="M17 21h2a2 2 0 002-2v-2"/>
      <circle cx="9" cy="10" r="1" fill={color} stroke="none"/>
      <circle cx="15" cy="10" r="1" fill={color} stroke="none"/>
      <path d="M9.5 15a3.5 3.5 0 005 0"/>
    </svg>
  ),
  // Check
  check: (size = 20, color = C.success) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20,6 9,17 4,12"/>
    </svg>
  ),
  // Sparkle / IA
  sparkle: (size = 18, color = C.accent) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/>
    </svg>
  ),
};

// ======================== LOGO ========================
const PetauLogo = ({ size = "normal" }) => {
  const s = size === "large" ? 1.35 : size === "small" ? 0.7 : 1;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 * s, userSelect: "none" }}>
      <div style={{
        width: 48 * s, height: 48 * s, borderRadius: 16 * s,
        background: `linear-gradient(135deg, ${C.accent}, ${C.accentDark})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: `0 6px 20px ${C.accent}30`,
      }}>
        {Icon.paw(26 * s, "#fff")}
      </div>
      <span style={{ fontSize: 26 * s, fontWeight: 700, fontFamily: font, color: C.text, letterSpacing: -0.5 }}>
        Pet<span style={{ color: C.petrol }}>au</span>Life<span style={{ color: C.accent, fontWeight: 700 }}>+</span>
      </span>
    </div>
  );
};

// ======================== INPUT FIELD ========================
const InputField = ({ icon, label, type = "text", value, onChange, placeholder, error, onMic }) => {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const isPass = type === "password";

  const handleMic = () => {
    setMicActive(true);
    if (onMic) onMic();
    setTimeout(() => setMicActive(false), 2000);
  };

  return (
    <div style={{ marginBottom: 22 }}>
      {label && (
        <p style={{ color: C.textSec, fontSize: 13, fontWeight: 600, margin: "0 0 8px", fontFamily: font, letterSpacing: 0.3 }}>
          {label}
        </p>
      )}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        background: C.card, borderRadius: 14, padding: "0 18px",
        height: 54,
        border: `1.5px solid ${error ? C.danger : focused ? C.accent : C.border}`,
        transition: "all 0.25s",
        boxShadow: focused ? `0 0 0 3px ${C.accentMed}` : "none",
      }}>
        {/* Left icon — colorido */}
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
          {icon}
        </div>

        {/* Input */}
        <input
          type={isPass && !show ? "password" : "text"}
          value={value} onChange={onChange} placeholder={placeholder}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            flex: 1, border: "none", background: "transparent", outline: "none",
            fontFamily: font, fontSize: 15, color: C.text, letterSpacing: 0.2,
            height: "100%",
          }}
        />

        {/* Eye toggle (senha) */}
        {isPass && (
          <button onClick={() => setShow(!show)} style={{
            background: "none", border: "none", cursor: "pointer", padding: 4,
            display: "flex", alignItems: "center",
          }}>
            {show ? Icon.eyeOff(18, C.textDim) : Icon.eye(18, C.textDim)}
          </button>
        )}

        {/* Mic icon — SEMPRE laranja */}
        <button onClick={handleMic} style={{
          background: micActive ? C.accent + "12" : "none",
          border: "none", cursor: "pointer", padding: 4,
          borderRadius: 8, display: "flex", alignItems: "center",
          transition: "all 0.2s",
          animation: micActive ? "micPulse 1s ease infinite" : "none",
        }}>
          {micActive ? Icon.micActive(20, C.accent) : Icon.mic(20, C.accent)}
        </button>
      </div>

      {error && (
        <p style={{ color: C.danger, fontSize: 11, fontWeight: 600, margin: "6px 0 0 18px", fontFamily: font }}>
          {error}
        </p>
      )}
    </div>
  );
};

// ======================== PASSWORD METER ========================
const PasswordMeter = ({ password }) => {
  const checks = [
    { ok: password.length >= 8, label: "8+ chars" },
    { ok: /[A-Z]/.test(password), label: "Maiúscula" },
    { ok: /[0-9]/.test(password), label: "Número" },
    { ok: /[^A-Za-z0-9]/.test(password), label: "Especial" },
  ];
  const score = checks.filter(c => c.ok).length;
  const barColors = ["", C.danger, C.danger, C.warning, C.success];
  const barLabels = ["", "Fraca", "Fraca", "Média", "Forte"];
  if (!password) return null;
  return (
    <div style={{ marginTop: -14, marginBottom: 18, padding: "0 2px" }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i <= score ? barColors[score] : C.border,
            transition: "all 0.3s",
          }} />
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 10 }}>
          {checks.map((c, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: 3, color: c.ok ? C.success : C.textDim, fontSize: 10, fontWeight: 600, fontFamily: font }}>
              {c.ok ? Icon.check(10, C.success) : (
                <span style={{ width: 10, height: 10, borderRadius: 3, border: `1.5px solid ${C.textDim}`, display: "inline-block" }} />
              )}
              {c.label}
            </span>
          ))}
        </div>
        {score > 0 && (
          <span style={{ color: barColors[score], fontSize: 10, fontWeight: 700, fontFamily: font }}>{barLabels[score]}</span>
        )}
      </div>
    </div>
  );
};

// ======================== BIOMETRIC SCAN ========================
const BiometricScan = ({ type = "finger", phase = 0 }) => {
  const isSuccess = phase === 2;
  const isScanning = phase === 1;
  return (
    <div style={{
      width: 140, height: 140, borderRadius: 42, margin: "0 auto",
      background: isSuccess ? C.success + "08" : isScanning ? C.accent + "06" : C.card,
      border: `3px solid ${isSuccess ? C.success + "40" : isScanning ? C.accent + "25" : C.border}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      transition: "all 0.5s",
      boxShadow: isScanning ? `0 0 60px ${C.accent}12` : isSuccess ? `0 0 60px ${C.success}12` : "none",
      animation: isScanning ? "breathe 2s ease infinite" : "none",
    }}>
      {isSuccess
        ? Icon.check(56, C.success)
        : type === "finger"
          ? Icon.fingerprint(56, isScanning ? C.accent : C.textGhost)
          : Icon.faceScan(56, isScanning ? C.purple : C.textGhost)
      }
    </div>
  );
};

// ======================== LOGIN SCREEN ========================
export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [screen, setScreen] = useState("login"); // login | bio | register
  const [bioType, setBioType] = useState("finger");
  const [bioPhase, setBioPhase] = useState(0);
  const [regStep, setRegStep] = useState(0);
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPass, setRegPass] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regError, setRegError] = useState("");
  const containerRef = useRef();

  const handleLogin = () => {
    if (!email.includes("@")) return setError("Email inválido");
    if (password.length < 8) return setError("Mínimo 8 caracteres");
    setError("");
  };

  const handleBio = (type) => {
    setBioType(type);
    setScreen("bio");
    setBioPhase(1);
    setTimeout(() => setBioPhase(2), 2400);
  };

  const handleRegNext = () => {
    if (!regName) return setRegError("name");
    if (!regEmail.includes("@")) return setRegError("email");
    if (regPass.length < 8) return setRegError("pass");
    if (regPass !== regConfirm) return setRegError("confirm");
    setRegError("");
    // Sucesso — iria para próximo passo
  };

  return (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center",
      minHeight: "100vh", padding: 20,
      background: `radial-gradient(ellipse at 50% 0%, #162231, #0B1219 70%)`,
      fontFamily: font,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div ref={containerRef} style={{
        width: 400, maxHeight: 820, background: C.bg, borderRadius: 44,
        overflow: "auto", position: "relative",
        boxShadow: `0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px ${C.border}`,
      }}>
        {/* Notch */}
        <div style={{ position: "sticky", top: 0, zIndex: 30, display: "flex", justifyContent: "center", padding: "8px 0 0", background: `linear-gradient(to bottom, ${C.bg}, transparent)` }}>
          <div style={{ width: 120, height: 28, borderRadius: 20, background: "#000" }} />
        </div>

        {/* ==================== LOGIN ==================== */}
        {screen === "login" && (
          <div style={{ padding: "0 28px 40px" }}>
            {/* Ambient glow */}
            <div style={{ position: "absolute", top: -60, left: "50%", transform: "translateX(-50%)", width: 280, height: 280, borderRadius: "50%", background: `radial-gradient(circle, ${C.accent}06, transparent 70%)`, pointerEvents: "none" }} />

            {/* Logo + Tagline */}
            <div style={{ textAlign: "center", padding: "38px 0 36px", position: "relative" }}>
              <PetauLogo size="large" />
              <p style={{ color: C.textDim, fontSize: 14, margin: "16px 0 0", fontFamily: font, fontWeight: 500, letterSpacing: 0.5 }}>
                Uma IA única para cada pet
              </p>
            </div>

            {/* Email field */}
            <InputField
              icon={Icon.mail(20, C.petrol)}
              label="Email"
              placeholder="seu@email.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(""); }}
            />

            {/* Password field */}
            <InputField
              icon={Icon.lock(20, C.accent)}
              label="Senha"
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(""); }}
              error={error}
            />

            {/* Forgot */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: -14, marginBottom: 28 }}>
              <button style={{ background: "none", border: "none", cursor: "pointer", color: C.accent, fontSize: 12, fontWeight: 600, fontFamily: font, letterSpacing: 0.2 }}>
                Esqueceu a senha?
              </button>
            </div>

            {/* Login button */}
            <button onClick={handleLogin} style={{
              width: "100%", padding: "16px", borderRadius: 14, cursor: "pointer",
              background: `linear-gradient(135deg, ${C.accent}, ${C.accentDark})`,
              border: "none", color: "#fff", fontSize: 16, fontWeight: 700,
              fontFamily: font, boxShadow: C.shadowAccent, letterSpacing: 0.3,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            }}>
              Entrar {Icon.arrowRight(18, "#fff")}
            </button>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "30px 0" }}>
              <div style={{ flex: 1, height: 1, background: C.border }} />
              <span style={{ color: C.textGhost, fontSize: 11, fontFamily: font, fontWeight: 600 }}>ou entre com</span>
              <div style={{ flex: 1, height: 1, background: C.border }} />
            </div>

            {/* Biometric buttons */}
            <div style={{ display: "flex", gap: 12, marginBottom: 36 }}>
              {[
                { type: "finger", label: "Impressão Digital", icon: Icon.fingerprint(34, C.accent), color: C.accent },
                { type: "face", label: "Reconhecimento Facial", icon: Icon.faceScan(34, C.purple), color: C.purple },
              ].map((b) => (
                <button key={b.type} onClick={() => handleBio(b.type)} style={{
                  flex: 1, padding: "20px 10px", borderRadius: 16, cursor: "pointer",
                  background: C.card, border: `1.5px solid ${C.border}`,
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
                  fontFamily: font, fontSize: 11, fontWeight: 600, color: C.textSec,
                  transition: "all 0.2s",
                }}>
                  {b.icon}
                  <span>{b.label}</span>
                </button>
              ))}
            </div>

            {/* Register link */}
            <div style={{ textAlign: "center" }}>
              <span style={{ color: C.textDim, fontSize: 14, fontFamily: font }}>Novo por aqui? </span>
              <button onClick={() => setScreen("register")} style={{
                background: "none", border: "none", cursor: "pointer",
                color: C.accent, fontSize: 14, fontWeight: 700, fontFamily: font,
              }}>
                Criar conta
              </button>
            </div>
          </div>
        )}

        {/* ==================== BIOMETRIC ==================== */}
        {screen === "bio" && (
          <div style={{ padding: "0 28px 40px", textAlign: "center" }}>
            <div style={{ padding: "60px 0 0" }}>
              <BiometricScan type={bioType} phase={bioPhase} />

              <p style={{
                color: bioPhase === 2 ? C.success : C.text,
                fontSize: 22, fontWeight: 700, margin: "32px 0 8px", fontFamily: font,
              }}>
                {bioPhase === 2 ? "Identidade confirmada!" : "Escaneando..."}
              </p>

              <p style={{ color: C.textDim, fontSize: 14, margin: "0 0 32px", fontFamily: font }}>
                {bioPhase === 2
                  ? "Bem-vinda de volta, Ana!"
                  : bioType === "finger"
                    ? "Posicione o dedo no sensor"
                    : "Olhe para a câmera"
                }
              </p>

              {bioPhase < 2 && (
                <button onClick={() => { setScreen("login"); setBioPhase(0); }} style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: C.accent, fontSize: 13, fontWeight: 600, fontFamily: font,
                }}>
                  Usar email e senha
                </button>
              )}
            </div>
          </div>
        )}

        {/* ==================== REGISTER ==================== */}
        {screen === "register" && (
          <div style={{ padding: "0 28px 40px" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 0 24px" }}>
              <button onClick={() => setScreen("login")} style={{
                background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 12,
                width: 42, height: 42, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15,18 9,12 15,6"/>
                </svg>
              </button>
              <div style={{ flex: 1 }}>
                <h2 style={{ color: C.text, fontSize: 22, fontWeight: 700, margin: 0, fontFamily: font }}>Criar Conta</h2>
                <p style={{ color: C.textDim, fontSize: 12, margin: "3px 0 0", fontFamily: font }}>Passo 1 de 2 — Dados pessoais</p>
              </div>
            </div>

            {/* Progress */}
            <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
              <div style={{ flex: 1, height: 4, borderRadius: 2, background: C.accent }} />
              <div style={{ flex: 1, height: 4, borderRadius: 2, background: C.border }} />
            </div>

            <InputField
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.petrol} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
              label="Nome completo"
              placeholder="Ana Martins"
              value={regName}
              onChange={e => setRegName(e.target.value)}
              error={regError === "name" ? "Obrigatório" : ""}
            />

            <InputField
              icon={Icon.mail(20, C.petrol)}
              label="Email"
              placeholder="ana@email.com"
              value={regEmail}
              onChange={e => setRegEmail(e.target.value)}
              error={regError === "email" ? "Email inválido" : ""}
            />

            <InputField
              icon={Icon.lock(20, C.accent)}
              label="Senha"
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={regPass}
              onChange={e => setRegPass(e.target.value)}
              error={regError === "pass" ? "Mínimo 8 caracteres" : ""}
            />

            <PasswordMeter password={regPass} />

            <InputField
              icon={Icon.lock(20, C.accent)}
              label="Confirmar senha"
              type="password"
              placeholder="Repita a senha"
              value={regConfirm}
              onChange={e => setRegConfirm(e.target.value)}
              error={regError === "confirm" ? "Não coincidem" : ""}
            />

            <button onClick={handleRegNext} style={{
              width: "100%", padding: "16px", borderRadius: 14, cursor: "pointer",
              background: `linear-gradient(135deg, ${C.accent}, ${C.accentDark})`,
              border: "none", color: "#fff", fontSize: 16, fontWeight: 700,
              fontFamily: font, boxShadow: C.shadowAccent,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            }}>
              Próximo {Icon.arrowRight(18, "#fff")}
            </button>

            <p style={{ color: C.textGhost, fontSize: 11, textAlign: "center", margin: "16px 0 0", fontFamily: font }}>
              Já tem conta? <button onClick={() => setScreen("login")} style={{ background: "none", border: "none", cursor: "pointer", color: C.accent, fontSize: 11, fontWeight: 700, fontFamily: font }}>Entrar</button>
            </p>
          </div>
        )}

        <style>{`
          ::-webkit-scrollbar{width:0;height:0}
          input::placeholder{color:${C.placeholder} !important; opacity: 1 !important}
          @keyframes breathe{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.04);opacity:0.85}}
          @keyframes micPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.7;transform:scale(1.1)}}
        `}</style>
      </div>
    </div>
  );
}
