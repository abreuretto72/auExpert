import { useState, useRef } from "react";

// ======================== DESIGN TOKENS ========================
const C = {
  bg: "#141118", bgCard: "#1C1826", bgDeep: "#0D0A12",
  card: "#221E2E", cardHover: "#2A2538", cardGlow: "#2E2940",
  gold: "#F0C754", goldSoft: "#F0C75412", goldMed: "#F0C75425", goldBright: "#FFD96E",
  silver: "#B8C4D0", silverSoft: "#B8C4D012",
  bronze: "#CD8B62", bronzeSoft: "#CD8B6212",
  emerald: "#4DD4A0", emeraldSoft: "#4DD4A010",
  ruby: "#F06878", rubySoft: "#F0687810",
  sapphire: "#5B9CF0", sapphireSoft: "#5B9CF010",
  amethyst: "#A87EDB", amethystSoft: "#A87EDB10",
  topaz: "#F0A83E", topazSoft: "#F0A83E10",
  text: "#EDE8F5", textSec: "#A99FC0", textDim: "#625880", textGhost: "#3D3555",
  border: "#2E2845", borderLight: "#382F50",
  shadow: "0 4px 28px rgba(0,0,0,0.35)",
};
const font = "'Fredoka', -apple-system, sans-serif";
const fontSans = "'Nunito', -apple-system, sans-serif";
const fontMono = "'JetBrains Mono', monospace";

// ======================== ICONS ========================
const Ico = ({ type, size = 20, color = C.textDim }) => {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" };
  const icons = {
    back: <svg {...p}><polyline points="15,18 9,12 15,6"/></svg>,
    lock: <svg {...p}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
    star: <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>,
    check: <svg {...p} strokeWidth="2.5"><polyline points="20,6 9,17 4,12"/></svg>,
    share: <svg {...p}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
    fire: <svg {...p}><path d="M12 22c4-3 7-6.5 7-10.5C19 7 15.5 3 12 2c-1.5 3-2 5-2 7.5C10 12 11 14 12 15c1.5-1.5 2-3 2-5 1.5 2 2.5 4 2.5 6.5 0 2.5-2 4.5-4.5 4.5z"/></svg>,
    trophy: <svg {...p}><path d="M6 9H4a2 2 0 01-2-2V5h4"/><path d="M18 9h2a2 2 0 002-2V5h-4"/><path d="M4 5h16v4a6 6 0 01-6 6h-4a6 6 0 01-6-6V5z"/><path d="M12 15v3"/><path d="M8 21h8"/></svg>,
    gift: <svg {...p}><polyline points="20,12 20,22 4,22 4,12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/></svg>,
    paw: <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><ellipse cx="12" cy="17" rx="4.5" ry="4"/><circle cx="7" cy="10.5" r="2.2"/><circle cx="17" cy="10.5" r="2.2"/><circle cx="9.5" cy="6.5" r="1.8"/><circle cx="14.5" cy="6.5" r="1.8"/></svg>,
    x: <svg {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    zap: <svg {...p}><polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/></svg>,
    target: <svg {...p}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
    clock: <svg {...p}><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>,
    shield: <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    heart: <svg {...p}><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
  };
  return icons[type] || null;
};

// ======================== BADGE DATA ========================
const categories = [
  { id: "all", label: "Todos", emoji: "🏆" },
  { id: "care", label: "Cuidado", emoji: "💚" },
  { id: "social", label: "Social", emoji: "🐾" },
  { id: "health", label: "Saúde", emoji: "🩺" },
  { id: "adventure", label: "Aventura", emoji: "🌟" },
  { id: "legacy", label: "Legado", emoji: "💎" },
];

const rarityConfig = {
  common: { label: "Comum", color: C.silver, bg: C.silverSoft, border: C.silver + "20" },
  rare: { label: "Raro", color: C.sapphire, bg: C.sapphireSoft, border: C.sapphire + "20" },
  epic: { label: "Épico", color: C.amethyst, bg: C.amethystSoft, border: C.amethyst + "20" },
  legendary: { label: "Lendário", color: C.gold, bg: C.goldSoft, border: C.gold + "25" },
  mythic: { label: "Mítico", color: C.ruby, bg: C.rubySoft, border: C.ruby + "25" },
};

const allBadges = [
  // UNLOCKED (12)
  { id: 1, name: "Primeiro Passeio", emoji: "🐾", desc: "Registre o primeiro passeio do pet", cat: "care", rarity: "common", unlocked: true, date: "15 Mar 2023", xp: 10 },
  { id: 2, name: "Fotógrafo de Patas", emoji: "📸", desc: "Tire 10 fotos do pet", cat: "social", rarity: "common", unlocked: true, date: "20 Mar 2023", xp: 15 },
  { id: 3, name: "Vacina em Dia", emoji: "💉", desc: "Mantenha todas as vacinas atualizadas", cat: "health", rarity: "rare", unlocked: true, date: "15 Jan 2026", xp: 50 },
  { id: 4, name: "Patas Incansáveis", emoji: "🏃", desc: "Complete 25 passeios em um mês", cat: "care", rarity: "rare", unlocked: true, date: "22 Mar 2026", xp: 40 },
  { id: 5, name: "Aprendiz Brilhante", emoji: "🎓", desc: "Pet aprende um novo truque", cat: "adventure", rarity: "rare", unlocked: true, date: "20 Jan 2026", xp: 35 },
  { id: 6, name: "Alma Social", emoji: "🤝", desc: "Faça 5 playdates com outros pets", cat: "social", rarity: "common", unlocked: true, date: "10 Feb 2026", xp: 25 },
  { id: 7, name: "Diário Fiel", emoji: "📖", desc: "Escreva no diário por 7 dias seguidos", cat: "legacy", rarity: "rare", unlocked: true, date: "8 Mar 2026", xp: 45 },
  { id: 8, name: "Guardião Solidário", emoji: "🤲", desc: "Ajude um vizinho na rede Pet-Village", cat: "social", rarity: "common", unlocked: true, date: "12 Jan 2026", xp: 20 },
  { id: 9, name: "Check-up Perfeito", emoji: "✅", desc: "Todos os exames normais em um check-up", cat: "health", rarity: "epic", unlocked: true, date: "5 Jan 2026", xp: 60 },
  { id: 10, name: "Explorador Urbano", emoji: "🗺️", desc: "Visite 10 parques diferentes", cat: "adventure", rarity: "rare", unlocked: true, date: "28 Feb 2026", xp: 35 },
  { id: 11, name: "Protetor do Futuro", emoji: "🛡️", desc: "Configure o Testamento Emocional", cat: "legacy", rarity: "epic", unlocked: true, date: "20 Jan 2026", xp: 75 },
  { id: 12, name: "Primeiro Aniversário", emoji: "🎂", desc: "Celebre o aniversário do pet na rede", cat: "legacy", rarity: "rare", unlocked: true, date: "28 Feb 2026", xp: 40 },
  // LOCKED (18)
  { id: 13, name: "Maratonista", emoji: "🏅", desc: "50 passeios em um mês", cat: "care", rarity: "epic", unlocked: false, progress: 25, total: 50, xp: 80 },
  { id: 14, name: "Centenário de Memórias", emoji: "💯", desc: "Registre 100 entradas no diário", cat: "legacy", rarity: "epic", unlocked: false, progress: 87, total: 100, xp: 100 },
  { id: 15, name: "Doador de Vida", emoji: "🩸", desc: "Doe sangue como pet doador", cat: "health", rarity: "legendary", unlocked: false, progress: 0, total: 1, xp: 150 },
  { id: 16, name: "Cápsula Milenar", emoji: "⏳", desc: "Crie 5 cápsulas do tempo", cat: "legacy", rarity: "epic", unlocked: false, progress: 3, total: 5, xp: 90 },
  { id: 17, name: "Detetive de Saúde", emoji: "🔍", desc: "Faça 10 análises de foto IA", cat: "health", rarity: "rare", unlocked: false, progress: 6, total: 10, xp: 50 },
  { id: 18, name: "Tradutor de Latidos", emoji: "🗣️", desc: "Analise 20 áudios do pet", cat: "adventure", rarity: "rare", unlocked: false, progress: 12, total: 20, xp: 45 },
  { id: 19, name: "Árvore Completa", emoji: "🌳", desc: "Encontre 3 parentes do pet", cat: "social", rarity: "legendary", unlocked: false, progress: 2, total: 3, xp: 120 },
  { id: 20, name: "Super Padrinho", emoji: "🦸", desc: "Tenha 10 padrinhos no grupo", cat: "social", rarity: "epic", unlocked: false, progress: 8, total: 10, xp: 70 },
  { id: 21, name: "Viajante de Patas", emoji: "✈️", desc: "Viaje para 3 cidades com o pet", cat: "adventure", rarity: "epic", unlocked: false, progress: 1, total: 3, xp: 85 },
  { id: 22, name: "Peso Ideal 365", emoji: "⚖️", desc: "Mantenha peso ideal por 1 ano", cat: "health", rarity: "legendary", unlocked: false, progress: 180, total: 365, xp: 200 },
  { id: 23, name: "Herói da Aldeia", emoji: "🏘️", desc: "Acumule 100 Pet-Credits", cat: "social", rarity: "legendary", unlocked: false, progress: 27, total: 100, xp: 180 },
  { id: 24, name: "Mestre de Truques", emoji: "🎪", desc: "Pet aprende 10 truques", cat: "adventure", rarity: "legendary", unlocked: false, progress: 3, total: 10, xp: 160 },
  { id: 25, name: "Felicidade Máxima", emoji: "🌈", desc: "Alcance score 100 de felicidade", cat: "care", rarity: "mythic", unlocked: false, progress: 0, total: 1, xp: 250 },
  { id: 26, name: "Prontuário Perfeito", emoji: "📋", desc: "Digitalize todos os documentos via OCR", cat: "health", rarity: "rare", unlocked: false, progress: 3, total: 5, xp: 40 },
  { id: 27, name: "30 Dias de Sol", emoji: "☀️", desc: "30 dias seguidos com humor feliz", cat: "care", rarity: "mythic", unlocked: false, progress: 12, total: 30, xp: 300 },
  { id: 28, name: "Memória Eterna", emoji: "💎", desc: "Mantenha o diário ativo por 1 ano", cat: "legacy", rarity: "legendary", unlocked: false, progress: 270, total: 365, xp: 200 },
  { id: 29, name: "Resgatador", emoji: "🚨", desc: "Ajude a encontrar um pet perdido", cat: "social", rarity: "epic", unlocked: false, progress: 0, total: 1, xp: 100 },
  { id: 30, name: "Lenda Viva", emoji: "👑", desc: "Desbloqueie todos os outros 29 emblemas", cat: "legacy", rarity: "mythic", unlocked: false, progress: 12, total: 29, xp: 500 },
];

// ======================== BADGE COMPONENT ========================
const BadgeCard = ({ badge: b, onClick, compact }) => {
  const rar = rarityConfig[b.rarity];
  const pct = b.unlocked ? 100 : b.total ? Math.round((b.progress / b.total) * 100) : 0;

  return (
    <button onClick={() => onClick(b)} style={{
      background: b.unlocked ? C.card : C.bgCard,
      borderRadius: compact ? 18 : 22, padding: compact ? "14px 10px" : "18px 16px",
      border: `1px solid ${b.unlocked ? rar.border : C.border}`,
      cursor: "pointer", textAlign: "center", position: "relative", overflow: "hidden",
      fontFamily: fontSans, transition: "all 0.25s", width: "100%",
      opacity: b.unlocked ? 1 : 0.7,
      boxShadow: b.unlocked && b.rarity !== "common" ? `0 0 20px ${rar.color}10` : "none",
    }}>
      {/* Rarity glow */}
      {b.unlocked && b.rarity !== "common" && (
        <div style={{
          position: "absolute", top: -20, right: -20, width: 60, height: 60,
          borderRadius: "50%", background: `radial-gradient(circle, ${rar.color}12, transparent)`,
        }} />
      )}

      {/* Lock overlay */}
      {!b.unlocked && (
        <div style={{ position: "absolute", top: 8, right: 8 }}>
          <Ico type="lock" size={12} color={C.textGhost} />
        </div>
      )}

      <div style={{
        width: compact ? 48 : 56, height: compact ? 48 : 56,
        borderRadius: compact ? 16 : 18, margin: "0 auto 10px",
        background: b.unlocked
          ? `linear-gradient(145deg, ${rar.color}20, ${rar.color}08)`
          : C.bgDeep,
        border: b.unlocked ? `2px solid ${rar.color}30` : `2px solid ${C.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: compact ? 24 : 28,
        filter: b.unlocked ? "none" : "grayscale(0.8)",
        boxShadow: b.unlocked ? `0 4px 12px ${rar.color}15` : "none",
      }}>
        {b.emoji}
      </div>

      <p style={{
        color: b.unlocked ? C.text : C.textDim,
        fontSize: compact ? 11 : 12, fontWeight: 700, margin: "0 0 3px",
        lineHeight: 1.3,
      }}>{b.name}</p>

      {/* Progress or Rarity */}
      {b.unlocked ? (
        <span style={{
          display: "inline-block", fontSize: 9, fontWeight: 700,
          color: rar.color, background: rar.bg, padding: "2px 8px", borderRadius: 8,
        }}>{rar.label}</span>
      ) : (
        <div style={{ marginTop: 6, padding: "0 6px" }}>
          <div style={{ height: 3, background: C.bgDeep, borderRadius: 2, overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${pct}%`, borderRadius: 2,
              background: `linear-gradient(90deg, ${rar.color}60, ${rar.color})`,
              transition: "width 0.6s ease",
            }} />
          </div>
          <p style={{ color: C.textGhost, fontSize: 9, margin: "3px 0 0", fontFamily: fontMono }}>{pct}%</p>
        </div>
      )}
    </button>
  );
};

// ======================== BADGE DETAIL MODAL ========================
const BadgeDetail = ({ badge: b, onClose }) => {
  const rar = rarityConfig[b.rarity];
  const pct = b.unlocked ? 100 : b.total ? Math.round((b.progress / b.total) * 100) : 0;
  const sameRarity = allBadges.filter(x => x.rarity === b.rarity);
  const unlockedSame = sameRarity.filter(x => x.unlocked).length;

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 50, background: "rgba(13,10,18,0.7)", backdropFilter: "blur(12px)", display: "flex", alignItems: "flex-end" }}>
      <div style={{ background: C.bg, borderRadius: "32px 32px 0 0", width: "100%", maxHeight: "82%", overflow: "auto", padding: "8px 22px 36px" }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 16px" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: C.textGhost }} />
        </div>

        <div style={{ textAlign: "center", padding: "10px 0 20px", position: "relative" }}>
          {/* Rarity particles */}
          {b.unlocked && ["legendary", "mythic", "epic"].includes(b.rarity) && (
            <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} style={{
                  position: "absolute", left: `${15 + Math.random() * 70}%`, top: `${15 + Math.random() * 60}%`,
                  width: 3 + Math.random() * 3, height: 3 + Math.random() * 3, borderRadius: "50%",
                  background: rar.color, opacity: 0.2 + Math.random() * 0.3,
                  animation: `floatP ${3 + Math.random() * 3}s ease-in-out infinite`,
                  animationDelay: `${Math.random() * 2}s`,
                }} />
              ))}
            </div>
          )}

          <div style={{
            width: 96, height: 96, borderRadius: 30, margin: "0 auto 18px",
            background: b.unlocked
              ? `radial-gradient(circle, ${rar.color}20, ${C.card})`
              : C.bgCard,
            border: `3px solid ${b.unlocked ? rar.color + "40" : C.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 48, filter: b.unlocked ? "none" : "grayscale(0.8)",
            boxShadow: b.unlocked ? `0 0 40px ${rar.color}20` : "none",
          }}>{b.emoji}</div>

          <h2 style={{ color: C.text, fontSize: 22, fontWeight: 700, margin: "0 0 6px", fontFamily: font }}>{b.name}</h2>
          <p style={{ color: C.textSec, fontSize: 14, margin: "0 0 12px", fontFamily: fontSans }}>{b.desc}</p>

          <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
            <span style={{ background: rar.bg, color: rar.color, fontSize: 11, fontWeight: 700, padding: "4px 14px", borderRadius: 12, border: `1px solid ${rar.border}`, fontFamily: fontSans }}>{rar.label}</span>
            <span style={{ background: C.cardGlow, color: C.textSec, fontSize: 11, fontWeight: 700, padding: "4px 14px", borderRadius: 12, fontFamily: fontSans }}>
              +{b.xp} XP
            </span>
            <span style={{ background: C.cardGlow, color: C.textSec, fontSize: 11, fontWeight: 700, padding: "4px 14px", borderRadius: 12, fontFamily: fontSans }}>
              {categories.find(c => c.id === b.cat)?.emoji} {categories.find(c => c.id === b.cat)?.label}
            </span>
          </div>
        </div>

        {b.unlocked ? (
          <>
            {/* Unlocked info */}
            <div style={{
              background: `linear-gradient(135deg, ${rar.color}08, ${C.card})`,
              borderRadius: 20, padding: 20, marginBottom: 16,
              border: `1px solid ${rar.color}15`, textAlign: "center",
            }}>
              <Ico type="check" size={24} color={rar.color} />
              <p style={{ color: rar.color, fontSize: 16, fontWeight: 700, margin: "10px 0 4px", fontFamily: fontSans }}>Desbloqueado!</p>
              <p style={{ color: C.textDim, fontSize: 13, margin: 0 }}>{b.date}</p>
            </div>

            {/* Rarity info */}
            <div style={{
              background: C.card, borderRadius: 18, padding: "14px 18px",
              border: `1px solid ${C.border}`, marginBottom: 16,
            }}>
              <p style={{ color: C.textDim, fontSize: 10, fontWeight: 700, letterSpacing: 1, margin: "0 0 8px", fontFamily: fontSans }}>RARIDADE</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ color: C.textSec, fontSize: 13, fontFamily: fontSans }}>
                  {unlockedSame} de {sameRarity.length} emblemas {rar.label.toLowerCase()}s
                </span>
                <div style={{ display: "flex", gap: 3 }}>
                  {sameRarity.map((s, i) => (
                    <div key={i} style={{
                      width: 10, height: 10, borderRadius: 3,
                      background: s.unlocked ? rar.color : C.bgDeep,
                      border: `1px solid ${rar.color}25`,
                    }} />
                  ))}
                </div>
              </div>
            </div>

            <button style={{
              width: "100%", padding: 14, borderRadius: 16, cursor: "pointer",
              background: C.card, border: `1px solid ${C.border}`,
              color: C.textSec, fontSize: 13, fontWeight: 700, fontFamily: fontSans,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              <Ico type="share" size={16} color={C.textDim} /> Compartilhar Conquista
            </button>
          </>
        ) : (
          <>
            {/* Progress */}
            <div style={{
              background: C.card, borderRadius: 20, padding: 20, marginBottom: 16,
              border: `1px solid ${C.border}`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ color: C.textSec, fontSize: 13, fontWeight: 600, fontFamily: fontSans }}>Progresso</span>
                <span style={{ color: rar.color, fontSize: 14, fontWeight: 800, fontFamily: fontMono }}>{b.progress}/{b.total}</span>
              </div>
              <div style={{ height: 10, background: C.bgDeep, borderRadius: 5, overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${pct}%`, borderRadius: 5,
                  background: `linear-gradient(90deg, ${rar.color}70, ${rar.color})`,
                  transition: "width 1s ease",
                  boxShadow: pct > 10 ? `0 0 8px ${rar.color}30` : "none",
                }} />
              </div>
              <p style={{ color: C.textDim, fontSize: 11, margin: "8px 0 0", fontFamily: fontSans }}>
                {pct >= 80 ? "Quase lá! Continue assim! 🔥" : pct >= 50 ? "Metade do caminho! 💪" : "Continue progredindo! ✨"}
              </p>
            </div>
          </>
        )}

        <button onClick={onClose} style={{
          width: "100%", padding: 14, borderRadius: 16, cursor: "pointer", marginTop: 8,
          background: rar.color + "18", border: `1px solid ${rar.border}`,
          color: rar.color, fontSize: 14, fontWeight: 700, fontFamily: fontSans,
        }}>Fechar</button>

        <style>{`@keyframes floatP{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}`}</style>
      </div>
    </div>
  );
};

// ======================== MAIN APP ========================
export default function ConquistasPet() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [viewMode, setViewMode] = useState("grid"); // grid | list
  const containerRef = useRef();

  const unlocked = allBadges.filter(b => b.unlocked);
  const locked = allBadges.filter(b => !b.unlocked);
  const totalXP = unlocked.reduce((s, b) => s + b.xp, 0);
  const maxXP = allBadges.reduce((s, b) => s + b.xp, 0);

  const filtered = activeFilter === "all" ? allBadges : allBadges.filter(b => b.cat === activeFilter);
  const filteredUnlocked = filtered.filter(b => b.unlocked);
  const filteredLocked = filtered.filter(b => !b.unlocked);

  // Level calculation
  const levels = [
    { name: "Filhote", min: 0, emoji: "🐣" },
    { name: "Explorador", min: 100, emoji: "🐾" },
    { name: "Guardião", min: 300, emoji: "🛡️" },
    { name: "Mestre", min: 600, emoji: "⭐" },
    { name: "Lenda", min: 1000, emoji: "👑" },
  ];
  const currentLevel = [...levels].reverse().find(l => totalXP >= l.min) || levels[0];
  const nextLevel = levels[levels.indexOf(currentLevel) + 1];
  const levelPct = nextLevel ? Math.round(((totalXP - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100) : 100;

  // Closest to unlock
  const almostDone = locked
    .filter(b => b.total)
    .map(b => ({ ...b, pct: (b.progress / b.total) * 100 }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3);

  // Rarity summary
  const rarityCounts = Object.entries(rarityConfig).map(([key, conf]) => ({
    ...conf, key,
    total: allBadges.filter(b => b.rarity === key).length,
    unlocked: allBadges.filter(b => b.rarity === key && b.unlocked).length,
  }));

  return (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center",
      minHeight: "100vh", padding: 20,
      background: `radial-gradient(ellipse at 40% 20%, #1E1830, ${C.bgDeep} 60%, #08060E)`,
      fontFamily: fontSans,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div ref={containerRef} style={{
        width: 400, maxHeight: 820, background: C.bg, borderRadius: 40,
        overflow: "auto", position: "relative",
        boxShadow: `0 20px 80px rgba(0,0,0,0.5), 0 0 0 1px ${C.border}`,
      }}>
        {/* Notch */}
        <div style={{ position: "sticky", top: 0, zIndex: 30, display: "flex", justifyContent: "center", padding: "8px 0 0", background: `linear-gradient(to bottom, ${C.bg}, transparent)` }}>
          <div style={{ width: 120, height: 28, borderRadius: 20, background: "#000" }} />
        </div>

        {/* Header */}
        <div style={{ padding: "12px 20px 6px", display: "flex", alignItems: "center", gap: 12 }}>
          <button style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, width: 38, height: 38, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Ico type="back" size={18} color={C.text} />
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ color: C.text, fontSize: 22, margin: 0, fontWeight: 700, fontFamily: font }}>Conquistas</h1>
            <p style={{ color: C.textDim, fontSize: 12, margin: "2px 0 0" }}>{unlocked.length} de {allBadges.length} emblemas</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ color: C.gold, fontSize: 18, fontWeight: 800, margin: 0, fontFamily: fontMono }}>{totalXP}</p>
            <p style={{ color: C.textDim, fontSize: 10, margin: "1px 0 0" }}>XP Total</p>
          </div>
        </div>

        {/* Level Card */}
        <div style={{
          margin: "16px 20px 0", padding: "22px 20px",
          background: `linear-gradient(145deg, ${C.card}, ${C.cardGlow})`,
          borderRadius: 24, border: `1px solid ${C.gold}15`,
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: -30, right: -20, width: 120, height: 120, borderRadius: "50%", background: `radial-gradient(circle, ${C.gold}06, transparent)` }} />

          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 22,
              background: `linear-gradient(145deg, ${C.gold}18, ${C.gold}08)`,
              border: `2px solid ${C.gold}30`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 32, boxShadow: `0 4px 16px ${C.gold}15`,
            }}>{currentLevel.emoji}</div>
            <div style={{ flex: 1 }}>
              <p style={{ color: C.textDim, fontSize: 10, fontWeight: 700, letterSpacing: 1, margin: "0 0 4px" }}>NÍVEL ATUAL</p>
              <p style={{ color: C.gold, fontSize: 22, fontWeight: 700, margin: "0 0 4px", fontFamily: font }}>{currentLevel.name}</p>
              {nextLevel && (
                <p style={{ color: C.textDim, fontSize: 11, margin: 0 }}>
                  {nextLevel.min - totalXP} XP para <span style={{ color: C.text, fontWeight: 700 }}>{nextLevel.name} {nextLevel.emoji}</span>
                </p>
              )}
            </div>
          </div>

          {nextLevel && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: C.textDim, fontSize: 10, fontFamily: fontMono }}>{totalXP} XP</span>
                <span style={{ color: C.textDim, fontSize: 10, fontFamily: fontMono }}>{nextLevel.min} XP</span>
              </div>
              <div style={{ height: 8, background: C.bgDeep, borderRadius: 4, overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${levelPct}%`, borderRadius: 4,
                  background: `linear-gradient(90deg, ${C.gold}80, ${C.goldBright})`,
                  boxShadow: `0 0 10px ${C.gold}30`,
                  transition: "width 1s ease",
                }} />
              </div>
            </div>
          )}

          {/* Overall progress */}
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            {[
              { label: "Emblemas", value: `${unlocked.length}/${allBadges.length}`, color: C.gold },
              { label: "XP Ganho", value: `${Math.round(totalXP/maxXP*100)}%`, color: C.emerald },
              { label: "Sequência", value: "4 sem", color: C.sapphire },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, background: C.bgCard, borderRadius: 14, padding: "10px 8px", textAlign: "center" }}>
                <p style={{ color: s.color, fontSize: 16, fontWeight: 800, margin: 0, fontFamily: fontMono }}>{s.value}</p>
                <p style={{ color: C.textDim, fontSize: 9, margin: "2px 0 0" }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Almost there */}
        {almostDone.length > 0 && (
          <div style={{ padding: "18px 20px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Ico type="fire" size={16} color={C.topaz} />
              <span style={{ color: C.textDim, fontSize: 11, fontWeight: 700, letterSpacing: 1.2 }}>QUASE DESBLOQUEANDO</span>
            </div>
            {almostDone.map((b, i) => {
              const rar = rarityConfig[b.rarity];
              return (
                <button key={i} onClick={() => setSelectedBadge(b)} style={{
                  display: "flex", alignItems: "center", gap: 14, width: "100%",
                  background: C.card, borderRadius: 18, padding: "14px 16px", marginBottom: 8,
                  border: `1px solid ${rar.color}15`, cursor: "pointer", fontFamily: fontSans,
                  textAlign: "left",
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 14,
                    background: rar.color + "10", border: `1.5px solid ${rar.color}20`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 22,
                  }}>{b.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ color: C.text, fontSize: 13, fontWeight: 700 }}>{b.name}</span>
                      <span style={{ color: rar.color, fontSize: 12, fontWeight: 800, fontFamily: fontMono }}>{Math.round(b.pct)}%</span>
                    </div>
                    <div style={{ height: 5, background: C.bgDeep, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", width: `${b.pct}%`, borderRadius: 3,
                        background: `linear-gradient(90deg, ${rar.color}60, ${rar.color})`,
                      }} />
                    </div>
                    <p style={{ color: C.textDim, fontSize: 10, margin: "4px 0 0" }}>{b.progress}/{b.total} · +{b.xp} XP</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Rarity Collection */}
        <div style={{ padding: "14px 20px 0" }}>
          <p style={{ color: C.textDim, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, margin: "0 0 10px" }}>COLEÇÃO POR RARIDADE</p>
          <div style={{ display: "flex", gap: 6 }}>
            {rarityCounts.map((r, i) => (
              <div key={i} style={{
                flex: 1, background: C.card, borderRadius: 14, padding: "10px 6px",
                border: `1px solid ${r.border}`, textAlign: "center",
              }}>
                <p style={{ color: r.color, fontSize: 16, fontWeight: 800, margin: 0, fontFamily: fontMono }}>{r.unlocked}/{r.total}</p>
                <p style={{ color: r.color, fontSize: 8, fontWeight: 700, margin: "3px 0 0", letterSpacing: 0.5 }}>{r.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Category Filter */}
        <div style={{
          position: "sticky", top: 28, zIndex: 15,
          padding: "16px 20px 10px",
          background: `linear-gradient(to bottom, ${C.bg}, ${C.bg}F8, ${C.bg}00)`,
        }}>
          <div style={{ display: "flex", gap: 5, overflow: "auto", paddingBottom: 2 }}>
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setActiveFilter(cat.id)} style={{
                display: "flex", alignItems: "center", gap: 4, padding: "8px 12px",
                borderRadius: 12, cursor: "pointer", whiteSpace: "nowrap",
                background: activeFilter === cat.id ? C.gold + "20" : C.card,
                border: activeFilter === cat.id ? `1px solid ${C.gold}30` : `1px solid ${C.border}`,
                color: activeFilter === cat.id ? C.gold : C.textDim,
                fontSize: 11, fontWeight: 700, fontFamily: fontSans,
                transition: "all 0.2s",
              }}>
                <span style={{ fontSize: 13 }}>{cat.emoji}</span> {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Badge Grid */}
        <div style={{ padding: "4px 20px" }}>
          {/* Unlocked */}
          {filteredUnlocked.length > 0 && (
            <>
              <p style={{ color: C.gold, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, margin: "8px 0 12px" }}>
                ✨ DESBLOQUEADOS ({filteredUnlocked.length})
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
                {filteredUnlocked.map(b => (
                  <BadgeCard key={b.id} badge={b} onClick={setSelectedBadge} compact />
                ))}
              </div>
            </>
          )}

          {/* Locked */}
          {filteredLocked.length > 0 && (
            <>
              <p style={{ color: C.textDim, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, margin: "8px 0 12px" }}>
                🔒 BLOQUEADOS ({filteredLocked.length})
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
                {filteredLocked.map(b => (
                  <BadgeCard key={b.id} badge={b} onClick={setSelectedBadge} compact />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Rewards Section */}
        <div style={{ padding: "6px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Ico type="gift" size={16} color={C.emerald} />
            <span style={{ color: C.textDim, fontSize: 11, fontWeight: 700, letterSpacing: 1.2 }}>RECOMPENSAS POR XP</span>
          </div>
          {[
            { xp: 200, reward: "5% desconto PetShop parceira", emoji: "🏪", unlocked: totalXP >= 200 },
            { xp: 400, reward: "Badge exclusiva no perfil do pet", emoji: "🎖️", unlocked: totalXP >= 400 },
            { xp: 600, reward: "Consulta veterinária com desconto", emoji: "🩺", unlocked: totalXP >= 600 },
            { xp: 1000, reward: "Seguro pet -15% (parceiro)", emoji: "🛡️", unlocked: totalXP >= 1000 },
          ].map((r, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 12,
              background: r.unlocked ? C.emerald + "08" : C.card,
              borderRadius: 16, padding: "12px 16px", marginBottom: 8,
              border: `1px solid ${r.unlocked ? C.emerald + "20" : C.border}`,
              opacity: r.unlocked ? 1 : 0.6,
            }}>
              <span style={{ fontSize: 22 }}>{r.emoji}</span>
              <div style={{ flex: 1 }}>
                <p style={{ color: r.unlocked ? C.text : C.textDim, fontSize: 13, fontWeight: 600, margin: 0 }}>{r.reward}</p>
                <p style={{ color: C.textDim, fontSize: 10, margin: "2px 0 0", fontFamily: fontMono }}>{r.xp} XP necessários</p>
              </div>
              {r.unlocked
                ? <Ico type="check" size={18} color={C.emerald} />
                : <Ico type="lock" size={14} color={C.textGhost} />
              }
            </div>
          ))}
        </div>

        {/* AI Note */}
        <div style={{
          margin: "14px 20px 30px", padding: 20,
          background: `linear-gradient(145deg, ${C.gold}06, ${C.amethyst}04)`,
          borderRadius: 22, border: `1px solid ${C.gold}10`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Ico type="paw" size={16} color={C.gold} />
            <span style={{ color: C.gold, fontSize: 12, fontWeight: 700 }}>Diário do Rex</span>
          </div>
          <p style={{ color: C.textSec, fontSize: 15, lineHeight: 1.9, margin: 0, fontFamily: "'Caveat', cursive", fontStyle: "italic" }}>
            "O meu humano fica todo contente quando aparece um brilhinho dourado no telemóvel.
            Acho que é por minha causa! Eu também fico feliz quando ele me leva ao parque —
            talvez seja a nossa versão de 'conquista desbloqueada'? 🏆"
          </p>
        </div>

        {/* Detail Modal */}
        {selectedBadge && <BadgeDetail badge={selectedBadge} onClose={() => setSelectedBadge(null)} />}

        <style>{`::-webkit-scrollbar{width:0;height:0}`}</style>
      </div>
    </div>
  );
}
