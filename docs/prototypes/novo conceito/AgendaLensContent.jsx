import { useState, useMemo, useCallback } from "react";

// ─── DADOS DE EXEMPLO ────────────────────────────────────────────────────────

const DIARY_DATA = {
  "2026-03-27": [
    { id: "d1", kind: "diary", time: "14:30", primary_type: "consultation", title: "Consulta · Dra. Carla", sub: "Clínica VetBem · check-up anual", status: "done" },
    { id: "d2", kind: "diary", time: "14:30", primary_type: "vaccine",      title: "Vacinação V10",          sub: "Vanguard Plus · Lote A2847N",   status: "done" },
    { id: "d3", kind: "diary", time: "14:30", primary_type: "weight",       title: "Peso registrado: 32 kg", sub: "32 kg · Ideal para Labrador",   status: "done" },
    { id: "d4", kind: "diary", time: "14:30", primary_type: "expense",      title: "Clínica VetBem · R$ 280", sub: "Saúde · Consulta + Vacina",    status: "done" },
  ],
  "2026-03-29": [
    { id: "d5", kind: "diary", time: "15:30", primary_type: "travel",   title: "Rex na praia de Maresias",     sub: "Viagem · 7 dias · Humor: feliz", status: null },
    { id: "d6", kind: "diary", time: "09:00", primary_type: "weight",   title: "Peso registrado: 32,1 kg",    sub: "32,1 kg · Ideal para Labrador",  status: "done" },
  ],
  "2026-03-30": [
    { id: "d7",  kind: "diary", time: "20:10", primary_type: "mood",       title: "Latido de ansiedade",          sub: "12s · Padrão identificado",     status: null },
    { id: "d8",  kind: "diary", time: "08:00", primary_type: "medication", title: "Ômega 3 · dose manhã",         sub: "Recorrente diário · 08:00",     status: "done" },
  ],
  "2026-03-31": [
    { id: "d9",  kind: "diary", time: "16:45", primary_type: "connection", title: "Rex correu com o Thor",        sub: "Humor: feliz · 2 fotos",        status: null },
    { id: "d10", kind: "diary", time: "10:00", primary_type: "vaccine",    title: "Vacinação V10 · Dra. Carla",   sub: "Clínica VetBem · 32 kg",       status: "done" },
    { id: "d11", kind: "diary", time: "10:00", primary_type: "expense",    title: "Clínica VetBem · R$ 280",     sub: "Saúde · Consulta + Vacina",     status: "done" },
  ],
  "2026-04-01": [
    { id: "d12", kind: "diary", time: "08:00", primary_type: "medication", title: "Ômega 3 · dose manhã", sub: "Recorrente diário · 08:00", status: "done" },
  ],
  "2026-04-03": [
    { id: "d13", kind: "diary", time: "11:20", primary_type: "moment",  title: "Rex brincou no jardim", sub: "Humor: feliz · 1 foto", status: null },
  ],
  "2026-04-10": [
    { id: "d14", kind: "diary", time: "09:30", primary_type: "food",    title: "Nova ração Royal Canin", sub: "Royal Canin Medium Adult 15kg", status: null },
    { id: "d15", kind: "diary", time: "09:30", primary_type: "expense", title: "PetShop ZooMais · R$ 210", sub: "Alimentação · Ração",          status: "done" },
  ],
};

const EVENT_DATA = {
  "2026-04-01": [
    { id: "e1", kind: "event", event_type: "consultation", title: "Consulta · Dra. Carmen", sub: "Dra. Carmen · Clínica VetBem", time: "14:00", all_day: false, status: "scheduled", is_recurring: false },
  ],
  "2026-04-02": [
    { id: "e2", kind: "event", event_type: "custom",       title: "Comprar ração",           sub: "Lembrete do tutor",           time: "09:00", all_day: false, status: "scheduled", is_recurring: false },
  ],
  "2026-04-03": [
    { id: "e3", kind: "event", event_type: "consultation", title: "Consulta · Dra. Carmen", sub: "Dra. Carmen · Clínica VetBem", time: "14:00", all_day: false, status: "confirmed", is_recurring: false },
  ],
  "2026-04-08": [
    { id: "e4", kind: "event", event_type: "grooming",     title: "Banho e tosa",            sub: "Pet Shop ZooMais",             time: "10:00", all_day: false, status: "scheduled", is_recurring: false },
  ],
  "2026-04-15": [
    { id: "e5", kind: "event", event_type: "vaccine",      title: "Revacinação V10",         sub: "Próxima dose · auto-gerado",   time: "",      all_day: true,  status: "scheduled", is_recurring: false },
  ],
  "2026-04-20": [
    { id: "e6", kind: "event", event_type: "medication_series", title: "Ômega 3 · dose manhã", sub: "Recorrente diário · 08:00", time: "08:00", all_day: false, status: "scheduled", is_recurring: true },
  ],
  "2026-04-27": [
    { id: "e7", kind: "event", event_type: "plan_renewal", title: "Renovação VetAmigo",     sub: "R$ 89/mês · plano saúde",      time: "09:00", all_day: false, status: "scheduled", is_recurring: false },
  ],
};

// ─── CONSTANTES ───────────────────────────────────────────────────────────────

const CAT_COLORS = {
  saude:      "#1D9E75",
  medicacao:  "#3B6D11",
  cuidados:   "#BA7517",
  financeiro: "#534AB7",
  momento:    "#888780",
  lembrete:   "#D85A30",
  agendado:   "#185FA5",
};

const TYPE_ICONS = {
  moment: "🐾", vaccine: "💉", exam: "🧪", medication: "💊",
  consultation: "🩺", return_visit: "🩺", allergy: "⚠️", weight: "⚖️",
  surgery: "🔬", symptom: "⚠️", food: "🥘", expense: "💰",
  connection: "🐶", travel: "✈️", achievement: "🏆", mood: "🎵",
  insurance: "📋", plan: "📋", pet_audio: "🎵",
};

const EVENT_ICONS = {
  consultation: "🩺", exam: "🧪", surgery: "🔬", return_visit: "🩺",
  physiotherapy: "🦽", vaccine: "💉", medication_dose: "💊",
  medication_series: "💊", deworming: "💊", antiparasitic: "💊",
  grooming: "✂️", nail_trim: "✂️", dental_cleaning: "🦷", microchip: "📍",
  plan_renewal: "📋", insurance_renewal: "📋", plan_payment: "💰",
  training: "🎓", behaviorist: "🎓", socialization: "🐶",
  travel_checklist: "✈️", travel_vaccine: "💉", custom: "🔔",
};

const PRIMARY_TO_CAT = {
  moment: "momento", vaccine: "saude", exam: "saude", medication: "medicacao",
  consultation: "saude", return_visit: "saude", allergy: "saude", weight: "saude",
  surgery: "saude", symptom: "saude", food: "momento", expense: "financeiro",
  connection: "momento", travel: "momento", achievement: "momento",
  mood: "momento", insurance: "financeiro", plan: "financeiro", pet_audio: "momento",
};

const EVENT_TO_CAT = {
  consultation: "saude", exam: "saude", surgery: "saude", return_visit: "saude",
  physiotherapy: "saude", vaccine: "saude", travel_vaccine: "saude",
  medication_dose: "medicacao", medication_series: "medicacao",
  deworming: "medicacao", antiparasitic: "medicacao",
  grooming: "cuidados", nail_trim: "cuidados", dental_cleaning: "cuidados", microchip: "cuidados",
  plan_renewal: "financeiro", insurance_renewal: "financeiro", plan_payment: "financeiro",
  training: "momento", behaviorist: "momento", socialization: "momento", travel_checklist: "momento",
  custom: "lembrete",
};

const FILTER_MAP = {
  saude:      ["vaccine","exam","medication","consultation","return_visit","allergy","weight","surgery","symptom","physiotherapy","travel_vaccine"],
  medicacao:  ["medication_dose","medication_series","deworming","antiparasitic"],
  cuidados:   ["grooming","nail_trim","dental_cleaning","microchip"],
  financeiro: ["expense","insurance","plan","plan_renewal","insurance_renewal","plan_payment"],
  momento:    ["moment","travel","achievement","connection","food","mood","pet_audio","training","behaviorist","socialization","travel_checklist"],
  lembrete:   ["custom"],
};

const FILTER_LABELS = {
  all: "Tudo", saude: "Saúde", medicacao: "Medicação", cuidados: "Cuidados",
  financeiro: "Financeiro", momento: "Momentos", lembrete: "Lembretes", agendado: "Agendados",
};

const CAT_DOT_PRIORITY = ["saude","medicacao","agendado","cuidados","financeiro","momento","lembrete"];

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const WEEKDAYS = ["D","S","T","Q","Q","S","S"];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function dateKey(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function getDayItems(y, m, d) {
  const k = dateKey(y, m, d);
  const diary  = DIARY_DATA[k] || [];
  const events = EVENT_DATA[k] || [];
  const future = events.filter(e => ["scheduled","confirmed"].includes(e.status));
  const past   = [...diary].sort((a, b) => (b.time || "").localeCompare(a.time || ""));
  return [...future, ...past];
}

function getDotsForDay(y, m, d) {
  const items = getDayItems(y, m, d);
  const cats = new Set();
  items.forEach(i => {
    const cat = i.kind === "diary"
      ? PRIMARY_TO_CAT[i.primary_type]
      : (["scheduled","confirmed"].includes(i.status) ? "agendado" : EVENT_TO_CAT[i.event_type]);
    if (cat) cats.add(cat);
  });
  return CAT_DOT_PRIORITY.filter(c => cats.has(c)).slice(0, 4);
}

function getCategoryForItem(item) {
  if (item.kind === "diary") return PRIMARY_TO_CAT[item.primary_type] || "momento";
  if (["scheduled","confirmed"].includes(item.status)) {
    return EVENT_TO_CAT[item.event_type] || "agendado";
  }
  return EVENT_TO_CAT[item.event_type] || "momento";
}

function applyFilter(items, filter) {
  if (filter === "all") return items;
  if (filter === "agendado") return items.filter(i => i.kind === "event" && ["scheduled","confirmed"].includes(i.status));
  const types = FILTER_MAP[filter] || [];
  return items.filter(i => {
    const t = i.kind === "diary" ? i.primary_type : i.event_type;
    return types.includes(t);
  });
}

function getAvailableFilters(items) {
  const cats = new Set(items.map(i => getCategoryForItem(i)));
  const hasScheduled = items.some(i => i.kind === "event" && ["scheduled","confirmed"].includes(i.status));
  const filters = ["all"];
  ["saude","medicacao","cuidados","financeiro","momento","lembrete"].forEach(f => {
    const types = FILTER_MAP[f] || [];
    const has = items.some(i => {
      const t = i.kind === "diary" ? i.primary_type : i.event_type;
      return types.includes(t);
    });
    if (has) filters.push(f);
  });
  if (hasScheduled) filters.push("agendado");
  return filters;
}

function formatDayFull(y, m, d) {
  const date = new Date(y, m, d);
  return date.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })
    .replace(/^\w/, c => c.toUpperCase());
}

// ─── COMPONENTES ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  if (status === "done" || status === "completed") {
    return <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#1D9E75", flexShrink: 0 }} />;
  }
  if (status === "confirmed") {
    return (
      <span style={{ fontSize: 9, fontWeight: 500, padding: "1px 5px", borderRadius: 999, background: "#E1F5EE", color: "#0F6E56", whiteSpace: "nowrap" }}>
        confirmado
      </span>
    );
  }
  if (status === "scheduled") {
    return (
      <span style={{ fontSize: 9, fontWeight: 500, padding: "1px 5px", borderRadius: 999, background: "#E6F1FB", color: "#185FA5", whiteSpace: "nowrap" }}>
        agendado
      </span>
    );
  }
  return null;
}

function AgendaRow({ item, onClick }) {
  const cat   = getCategoryForItem(item);
  const color = CAT_COLORS[cat] || "#888";
  const icon  = item.kind === "diary" ? (TYPE_ICONS[item.primary_type] || "🐾") : (EVENT_ICONS[item.event_type] || "📅");
  const time  = item.kind === "diary" ? item.time : (item.all_day ? null : item.time);
  const isFuture = item.kind === "event" && ["scheduled","confirmed"].includes(item.status);
  const isCancelled = item.status === "cancelled";
  const isMissed = item.status === "missed";
  const isDimmed = isCancelled || isMissed;

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 9,
        padding: "7px 8px", borderRadius: 8, cursor: "pointer",
        border: `0.5px solid ${isFuture ? "var(--color-border-tertiary)" : "transparent"}`,
        background: isFuture ? "var(--color-background-primary)" : "transparent",
        opacity: isDimmed ? 0.45 : 1,
        marginBottom: 2,
        transition: "background 0.1s",
      }}
      onMouseEnter={e => !isFuture && (e.currentTarget.style.background = "var(--color-background-secondary)")}
      onMouseLeave={e => !isFuture && (e.currentTarget.style.background = "transparent")}
    >
      {/* Ícone */}
      <div style={{
        width: 26, height: 26, borderRadius: 7, flexShrink: 0,
        background: `${color}1a`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13,
      }}>
        {icon}
      </div>

      {/* Corpo */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {time && (
          <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", marginBottom: 1 }}>
            {time}
          </div>
        )}
        <div style={{
          fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          textDecoration: isCancelled ? "line-through" : "none",
        }}>
          {item.title}
        </div>
        <div style={{
          fontSize: 11, color: "var(--color-text-secondary)",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {item.sub}
        </div>
      </div>

      {/* Status + chevron */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
        <StatusBadge status={item.status} />
        <span style={{ fontSize: 14, color: "var(--color-text-tertiary)", lineHeight: 1 }}>›</span>
      </div>
    </div>
  );
}

function FilterBar({ filters, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 2, scrollbarWidth: "none" }}>
      {filters.map(f => {
        const isActive = f === active;
        return (
          <button
            key={f}
            onClick={() => onChange(f)}
            style={{
              flexShrink: 0, display: "flex", alignItems: "center", gap: 4,
              padding: "3px 9px", fontSize: 11, borderRadius: 999, cursor: "pointer",
              border: `0.5px solid ${isActive ? "var(--color-border-primary)" : "var(--color-border-secondary)"}`,
              background: isActive ? "var(--color-background-secondary)" : "transparent",
              color: isActive ? "var(--color-text-primary)" : "var(--color-text-secondary)",
              fontWeight: isActive ? 500 : 400,
              whiteSpace: "nowrap",
            }}
          >
            {f !== "all" && (
              <span style={{
                width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                background: CAT_COLORS[f] || "#185FA5",
              }} />
            )}
            {FILTER_LABELS[f]}
          </button>
        );
      })}
    </div>
  );
}

function CalendarDay({ day, dots, isToday, isSelected, isOtherMonth, onClick }) {
  return (
    <div
      onClick={day && !isOtherMonth ? onClick : undefined}
      style={{
        minHeight: 50, borderRadius: 8, padding: "4px 2px",
        cursor: day && !isOtherMonth ? "pointer" : "default",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
        border: `0.5px solid ${isSelected ? "var(--color-border-primary)" : "transparent"}`,
        background: isSelected ? "var(--color-background-primary)" : "transparent",
        opacity: isOtherMonth ? 0.3 : 1,
      }}
    >
      {day ? (
        <>
          <div style={{
            width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: isToday ? "50%" : 0,
            background: isToday ? "var(--color-background-info)" : "transparent",
            fontSize: 12, fontWeight: isSelected ? 500 : 400,
            color: isToday ? "var(--color-text-info)" : "var(--color-text-secondary)",
          }}>
            {day}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 2, maxWidth: 28 }}>
            {dots.map((cat, i) => (
              <span key={i} style={{
                width: 5, height: 5, borderRadius: "50%",
                background: CAT_COLORS[cat] || "#888",
                flexShrink: 0,
              }} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────

export default function AgendaLensContent() {
  const today = new Date();
  const [curYear,  setCurYear]  = useState(today.getFullYear());
  const [curMonth, setCurMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);
  const [filter, setFilter] = useState("all");
  const [openCard, setOpenCard] = useState(null);

  const daysInMonth   = new Date(curYear, curMonth + 1, 0).getDate();
  const firstWeekday  = new Date(curYear, curMonth, 1).getDay();

  const calCells = useMemo(() => {
    const cells = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [curYear, curMonth, firstWeekday, daysInMonth]);

  const changeMonth = useCallback((dir) => {
    let m = curMonth + dir, y = curYear;
    if (m > 11) { m = 0; y++; }
    if (m < 0)  { m = 11; y--; }
    setCurMonth(m); setCurYear(y);
    setSelectedDay(null); setFilter("all");
  }, [curMonth, curYear]);

  const handleDayClick = useCallback((d) => {
    setSelectedDay(d); setFilter("all");
  }, []);

  const allDayItems = useMemo(() =>
    selectedDay ? getDayItems(curYear, curMonth, selectedDay) : [],
    [selectedDay, curYear, curMonth]
  );

  const availableFilters = useMemo(() => getAvailableFilters(allDayItems), [allDayItems]);
  const filteredItems    = useMemo(() => applyFilter(allDayItems, filter), [allDayItems, filter]);

  const handleFilterChange = useCallback((f) => setFilter(f), []);

  return (
    <div style={{ fontFamily: "var(--font-sans)", maxWidth: 420, margin: "0 auto", padding: "1rem 0" }}>

      {/* ── PAINEL 1: CALENDÁRIO ─────────────────────────────────────────── */}
      <div style={{
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-lg)", padding: 16, marginBottom: 12,
      }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>
            Agenda do Rex
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => changeMonth(-1)} style={{
              width: 26, height: 26, borderRadius: 7, border: "0.5px solid var(--color-border-secondary)",
              background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", fontSize: 13,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>‹</button>
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)", minWidth: 80, textAlign: "center" }}>
              {MONTHS[curMonth].slice(0, 3)} {curYear}
            </span>
            <button onClick={() => changeMonth(1)} style={{
              width: 26, height: 26, borderRadius: 7, border: "0.5px solid var(--color-border-secondary)",
              background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", fontSize: 13,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>›</button>
          </div>
        </div>

        {/* Dias da semana */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginBottom: 4 }}>
          {WEEKDAYS.map((w, i) => (
            <div key={i} style={{ fontSize: 10, fontWeight: 500, color: "var(--color-text-tertiary)", textAlign: "center", padding: "2px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {w}
            </div>
          ))}
        </div>

        {/* Grade de dias */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
          {calCells.map((d, i) => {
            if (!d) return <div key={`e-${i}`} />;
            const isToday    = curYear === today.getFullYear() && curMonth === today.getMonth() && d === today.getDate();
            const isSelected = selectedDay === d;
            const dots       = getDotsForDay(curYear, curMonth, d);
            return (
              <CalendarDay
                key={d} day={d} dots={dots}
                isToday={isToday} isSelected={isSelected} isOtherMonth={false}
                onClick={() => handleDayClick(d)}
              />
            );
          })}
        </div>
      </div>

      {/* ── PAINEL 2: DETALHE DO DIA ─────────────────────────────────────── */}
      {!selectedDay && (
        <div style={{ textAlign: "center", padding: "2rem 0", color: "var(--color-text-tertiary)", fontSize: 13, lineHeight: 1.7 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📅</div>
          Toque em um dia para ver<br />as ocorrências do Rex
        </div>
      )}

      {selectedDay && (
        <div style={{
          background: "var(--color-background-primary)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-lg)", padding: 16,
        }}>

          {/* Cabeçalho do dia */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>
              {formatDayFull(curYear, curMonth, selectedDay)}
            </span>
            <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
              {filteredItems.length} ocorrência{filteredItems.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Filtros adaptativos */}
          {availableFilters.length > 1 && (
            <div style={{ marginBottom: 10 }}>
              <FilterBar filters={availableFilters} active={filter} onChange={handleFilterChange} />
            </div>
          )}

          {/* Lista de ocorrências */}
          {filteredItems.length === 0 ? (
            <div style={{ textAlign: "center", padding: "1.5rem 0", fontSize: 13, color: "var(--color-text-tertiary)" }}>
              Nenhuma ocorrência nesta categoria
            </div>
          ) : (
            <div>
              {filteredItems.map(item => (
                <AgendaRow
                  key={item.id}
                  item={item}
                  onClick={() => setOpenCard(item)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: CARD COMPLETO ─────────────────────────────────────────── */}
      {openCard && (
        <div
          onClick={() => setOpenCard(null)}
          style={{
            position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)",
            display: "flex", alignItems: "flex-end", justifyContent: "center",
            zIndex: 50, minHeight: 500, borderRadius: "inherit",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "var(--color-background-primary)",
              borderRadius: "16px 16px 0 0",
              padding: 20, width: "100%", maxWidth: 420,
              border: "0.5px solid var(--color-border-tertiary)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>
                Detalhes
              </span>
              <button
                onClick={() => setOpenCard(null)}
                style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 18, color: "var(--color-text-tertiary)", lineHeight: 1 }}
              >×</button>
            </div>

            {/* Ícone + título */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: `${CAT_COLORS[getCategoryForItem(openCard)] || "#888"}1a`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
              }}>
                {openCard.kind === "diary"
                  ? (TYPE_ICONS[openCard.primary_type] || "🐾")
                  : (EVENT_ICONS[openCard.event_type] || "📅")}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 3 }}>
                  {openCard.title}
                </div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                  {openCard.sub}
                </div>
              </div>
            </div>

            {/* Campos */}
            <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 14 }}>
              {[
                ["Data",    formatDayFull(curYear, curMonth, selectedDay)],
                ["Horário", openCard.all_day ? "Dia inteiro" : (openCard.time || "—")],
                ["Tipo",    openCard.kind === "diary" ? "Entrada do diário" : "Evento agendado"],
                ["Status",  openCard.status === "done" ? "Concluído" : openCard.status === "scheduled" ? "Agendado" : openCard.status === "confirmed" ? "Confirmado" : openCard.status || "—"],
                openCard.is_recurring ? ["Recorrência", "Recorrente"] : null,
              ].filter(Boolean).map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13 }}>
                  <span style={{ color: "var(--color-text-secondary)" }}>{label}</span>
                  <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Ações */}
            {openCard.kind === "event" && openCard.status === "scheduled" && (
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                {["Confirmar","Reagendar","Concluído"].map(label => (
                  <button key={label} onClick={() => setOpenCard(null)} style={{
                    flex: 1, padding: "8px 0", fontSize: 12, fontWeight: 500,
                    borderRadius: 8, border: "0.5px solid var(--color-border-secondary)",
                    background: "transparent", color: "var(--color-text-primary)", cursor: "pointer",
                  }}>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
