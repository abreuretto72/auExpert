# auExpert — Sprint 4.5: Especificação Visual da Agenda
# Versão 2.0 — Definitiva
# Data: 31/03/2026

---

## 1. FLUXO PRINCIPAL

A lente Agenda tem dois painéis empilhados na mesma tela — sem navegação extra.

```
PAINEL 1 — Calendário mensal (sempre visível)
  → Tutor vê os meses com pontinhos coloridos nos dias com ocorrências
  → Toca num dia

PAINEL 2 — Lista do dia (aparece inline abaixo do calendário)
  → Mostra todas as ocorrências do dia selecionado
  → 1-2 linhas por entrada com ícone colorido
  → Filtros adaptativos (só categorias presentes naquele dia)
  → Toca numa linha → abre o card completo daquela entrada

O calendário permanece visível enquanto o tutor lê o detalhe.
Tocar em outro dia troca o painel 2 sem rolar para cima.
```

---

## 2. PAINEL 1 — CALENDÁRIO MENSAL

### 2.1 Layout

```
┌─────────────────────────────────────┐
│  Agenda do Rex          ‹ Abr 2026 ›│
│                                     │
│   D    S    T    Q    Q    S    S   │
│                  1    2    3    4   │
│                  ●    ●    ●        │
│   5    6    7    8    9   10   11   │
│                  ✂●                 │
│  12   13   14   15   16   17   18   │
│                  💉                  │
│  19   20   21   22   23   24   25   │
│                                     │
│  26   27   28   29   30             │
│       ●                             │
└─────────────────────────────────────┘
```

### 2.2 Pontinhos coloridos (dots)

Cada dia com ocorrência exibe pontinhos abaixo do número.
**1 ponto por categoria presente. Máximo 4 pontos por dia.**
Se o dia tem mais de 4 categorias, os 4 mais relevantes são exibidos
(prioridade: saúde > medicação > agendados > outros).

```
Dia com 1 categoria:   ●
Dia com 2 categorias:  ● ●
Dia com 3 categorias:  ● ● ●
Dia com 4+ categorias: ● ● ● ●
```

Tamanho do ponto: 5×5 px, `border-radius: 50%`.
Cor do ponto: cor da categoria (ver seção 4).
Espaçamento entre pontos: 2px.

### 2.3 Dia selecionado

Ao tocar, o dia fica destacado com:
- Fundo `var(--color-background-primary)`
- Borda `0.5px solid var(--color-border-primary)`
- Número com `font-weight: 500`

### 2.4 Dia de hoje

O número do dia recebe:
- Fundo `var(--color-background-info)` (círculo 22×22 px)
- Cor `var(--color-text-info)`

### 2.5 Cabeçalho do calendário

```
[título do pet]                    ‹ [Mês Ano] ›
```

- Setas navegam mês a mês
- Toque longo na seta abre seletor rápido de mês/ano
- Ao navegar para mês passado: carrega entradas do diário
- Ao navegar para mês futuro: carrega eventos agendados
- Mês atual: mistura os dois

### 2.6 Performance — fetchMonthDots

O calendário usa uma query leve que busca **apenas** as categorias por dia,
sem carregar os dados completos. Isso garante abertura rápida da tela.

```typescript
// Retorno: { 'YYYY-MM-DD': string[] }
// Ex:      { '2026-04-01': ['saude', 'medicacao'], '2026-04-31': ['agendado'] }

async function fetchMonthDots(petId: string, month: Date) {
  const start = startOfMonth(month).toISOString();
  const end   = endOfMonth(month).toISOString();

  const [{ data: diary }, { data: events }] = await Promise.all([
    supabase
      .from('diary_entries')
      .select('created_at, primary_type')
      .eq('pet_id', petId)
      .gte('created_at', start)
      .lte('created_at', end)
      .eq('is_active', true),
    supabase
      .from('scheduled_events')
      .select('scheduled_for, event_type')
      .eq('pet_id', petId)
      .gte('scheduled_for', start)
      .lte('scheduled_for', end)
      .eq('is_active', true),
  ]);

  const map: Record<string, Set<string>> = {};

  diary?.forEach(e => {
    const key = e.created_at.slice(0, 10);
    if (!map[key]) map[key] = new Set();
    map[key].add(primaryTypeToCat(e.primary_type));
  });

  events?.forEach(e => {
    const key = e.scheduled_for.slice(0, 10);
    if (!map[key]) map[key] = new Set();
    map[key].add(eventTypeToCat(e.event_type));
  });

  // Máx 4 dots por dia, priorizando saúde
  const PRIORITY = ['saude', 'medicacao', 'agendado', 'cuidados',
                    'financeiro', 'momento', 'lembrete'];
  return Object.fromEntries(
    Object.entries(map).map(([k, v]) => [
      k,
      PRIORITY.filter(p => v.has(p)).slice(0, 4)
    ])
  );
}
```

---

## 3. PAINEL 2 — LISTA DO DIA

### 3.1 Cabeçalho do dia

```
Quarta-feira, 1 de abril                    3 ocorrências
```

- Data por extenso à esquerda (13px, bold)
- Contador de ocorrências à direita (11px, muted)
- Contador atualiza quando filtro está ativo

### 3.2 Chips de filtro — adaptativos

Os filtros mostram **apenas** as categorias que existem no dia selecionado.
Se o dia tem só Saúde e Momentos, aparecem apenas 3 chips: Tudo / Saúde / Momentos.

```
[Tudo]  [● Saúde]  [● Medicação]  [● Agendado]
```

Comportamento:
- Barra horizontal rolável, sem scrollbar visível
- Chip "Tudo" sempre presente como primeiro
- Cada chip tem ponto colorido da categoria
- Chip ativo: fundo secundário + borda primária + texto bold
- Chip inativo: só borda + texto muted
- Seleção exclusiva (1 ativo por vez)
- Filtro reseta para "Tudo" ao selecionar outro dia
- Se filtro retorna zero itens: exibir "Nenhuma ocorrência nesta categoria"

### 3.3 Placeholder quando nenhum dia está selecionado

```
           [ícone calendário]
    Toque em um dia para ver
       as ocorrências do Rex
```

---

## 4. CATEGORIAS — ÍCONES, CORES E TIPOS

| Categoria | Cor | Ícone principal | Ícones alternativos | Tipos de dado |
|-----------|-----|----------------|---------------------|---------------|
| Saúde | Teal `#1D9E75` | 🩺 | ⚠️ sintoma · ⚖️ peso · 🔬 cirurgia | consultation, return_visit, symptom, weight, surgery, physiotherapy |
| Vacinas | Teal `#1D9E75` | 💉 | — | vaccine |
| Exames | Teal `#1D9E75` | 🧪 | — | exam |
| Medicações | Green `#3B6D11` | 💊 | — | medication_dose, medication_series, deworming, antiparasitic |
| Cuidados | Amber `#BA7517` | ✂️ | 🦷 dental · ✂️ unhas | grooming, nail_trim, dental_cleaning, microchip |
| Financeiro | Purple `#534AB7` | 💰 | 📋 plano/renovação | expense, plan_renewal, insurance_renewal, plan_payment |
| Momentos | Gray `#888780` | 🐾 | ✈️ viagem · 🏆 conquista · 🐶 amigos · 🎵 som | moment, travel, achievement, connection, food, mood, pet_audio |
| Lembretes | Coral `#D85A30` | 🔔 | — | scheduled_events tipo custom |
| Agendados | Blue `#185FA5` | 📅 | — | scheduled_events status scheduled/confirmed sem categoria específica |

**Regra de cor:** saúde + vacinas + exames compartilham teal — todos pertencem
ao Prontuário. Medicações usam green — relacionadas mas distintas.

**Mapeamento `primary_type` → categoria:**

```typescript
const PRIMARY_TO_CAT: Record<string, string> = {
  moment:       'momento',
  vaccine:      'saude',
  exam:         'saude',
  medication:   'medicacao',
  consultation: 'saude',
  allergy:      'saude',
  weight:       'saude',
  surgery:      'saude',
  symptom:      'saude',
  food:         'momento',
  expense:      'financeiro',
  connection:   'momento',
  travel:       'momento',
  achievement:  'momento',
  mood:         'momento',
  insurance:    'financeiro',
  plan:         'financeiro',
};

const EVENT_TO_CAT: Record<string, string> = {
  consultation:       'saude',
  exam:               'saude',
  surgery:            'saude',
  return_visit:       'saude',
  physiotherapy:      'saude',
  vaccine:            'saude',
  medication_dose:    'medicacao',
  medication_series:  'medicacao',
  deworming:          'medicacao',
  antiparasitic:      'medicacao',
  grooming:           'cuidados',
  nail_trim:          'cuidados',
  dental_cleaning:    'cuidados',
  microchip:          'cuidados',
  plan_renewal:       'financeiro',
  insurance_renewal:  'financeiro',
  plan_payment:       'financeiro',
  training:           'momento',
  behaviorist:        'momento',
  socialization:      'momento',
  travel_checklist:   'momento',
  travel_vaccine:     'saude',
  custom:             'lembrete',
};
```

---

## 5. ANATOMIA DE UMA LINHA

Altura fixa: **52px**. Três zonas horizontais: ícone | corpo | status.

```
┌────────────────────────────────────────────────┐  52px
│  ┌───────┐  08:00                 ● [›]        │
│  │  💊   │  Ômega 3 · dose manhã              │
│  │       │  Recorrente diário · 08:00 e 20:00  │
│  └───────┘                                     │
└────────────────────────────────────────────────┘
  26×26px    flex:1                  status chev
```

### 5.1 Ícone (zona esquerda)

- Tamanho: 26×26 px
- Border-radius: 7px
- Fundo: cor da categoria com **10% de opacidade** (ex: `#1D9E7518`)
- Ícone centralizado, `font-size: 13px`
- Gap entre ícone e corpo: 9px

### 5.2 Corpo (zona central)

**Linha de hora** (opcional):
- `font-size: 10px`
- Cor: `var(--color-text-tertiary)`
- Omitida quando `all_day = true`
- Margem inferior: 1px

**Linha de título** (obrigatória):
- `font-size: 13px`, `font-weight: 500`
- Cor: `var(--color-text-primary)`
- Máximo 1 linha — truncado com `…` (`numberOfLines={1}`)

**Linha de subtítulo** (obrigatória):
- `font-size: 11px`
- Cor: `var(--color-text-secondary)`
- Máximo 1 linha — truncado com `…` (`numberOfLines={1}`)
- Gerado automaticamente (ver seção 6)

### 5.3 Status (zona direita)

| Caso | Visual |
|------|--------|
| Entrada do diário (passado) | sem indicador + chevron `›` |
| Concluído | ponto verde 6px + chevron `›` |
| Agendado | badge azul claro `"agendado"` + chevron `›` |
| Confirmado | badge teal claro `"confirmado"` + chevron `›` |
| Cancelado | toda a linha com `opacity: 0.45` + título riscado |
| Missed | toda a linha com `opacity: 0.45` |
| Recorrente | não há indicador no status — aparece no subtítulo |

**Badge de status:**
```
font-size: 9px
padding: 1px 5px
border-radius: 999px
font-weight: 500

Agendado:   background #E6F1FB · color #185FA5
Confirmado: background #E1F5EE · color #0F6E56
```

### 5.4 Linha de evento futuro

Eventos futuros recebem fundo levemente diferente para se destacar dos passados:
```
background: var(--color-background-primary)
border: 0.5px solid var(--color-border-tertiary)
border-radius: var(--border-radius-md)
```

Entradas do diário (passadas) ficam com fundo transparente e sem borda.

### 5.5 Hover / pressed

```
background: var(--color-background-secondary)
```

---

## 6. SUBTÍTULO INTELIGENTE

Gerado automaticamente — não é texto livre do tutor.
Prioriza o dado mais informativo disponível para cada tipo.

| Tipo | Subtítulo | Exemplo |
|------|-----------|---------|
| `consultation` | `vet · clínica` | `Dra. Carmen · Clínica VetBem` |
| `return_visit` | `retorno · vet` | `Retorno pós-cirurgia · Dr. Paulo` |
| `vaccine` | `nome da vacina · lab` | `V10 · Vanguard Plus` |
| `exam` | `nome do exame · lab` | `Hemograma · Lab Central` |
| `medication_series` | `recorrente · horários` | `Recorrente diário · 08:00 e 20:00` |
| `medication_dose` | `dose única · vet` | `Dose única · Dr. Paulo` |
| `deworming` | `recorrente mensal` | `Recorrente mensal` |
| `antiparasitic` | `pipeta · recorrente` | `Antipulgas · Recorrente mensal` |
| `symptom` | `urgência + descrição` | `⚠️ Urgente · Vômito recorrente` |
| `weight` | `valor kg · status` | `32,1 kg · Ideal para Labrador` |
| `surgery` | `procedimento · vet` | `Castração · Dr. Paulo` |
| `expense` | `categoria · loja · valor` | `Saúde · VetBem · R$ 280` |
| `plan_renewal` | `mensalidade · tipo` | `R$ 89/mês · Plano Saúde` |
| `grooming` | `serviço · local` | `Banho e tosa · Pet ZooMais` |
| `nail_trim` | `local` | `Clínica VetBem` |
| `dental_cleaning` | `procedimento` | `Raspagem de tártaro` |
| `moment` | `humor · mídias` | `Humor: feliz · 3 fotos` |
| `travel` | `destino · duração` | `Maresias · 7 dias` |
| `connection` | `nome do amigo · encontros` | `Com o Thor · 8º encontro` |
| `achievement` | `XP · nível` | `+100 XP · Nível 5` |
| `mood` | `estado emocional` | `Ansioso · padrão detectado` |
| `pet_audio` | `duração · padrão` | `12s · Latido de ansiedade` |
| `custom` (lembrete) | texto original do tutor | `Comprar ração nova` |
| `training` | `sessão + profissional` | `Sessão 3 · Adestrador Marcos` |
| `travel_checklist` | `destino · dias restantes` | `Nordeste · em 21 dias` |

```typescript
// components/diary/AgendaRow.tsx

export function buildSubtitle(item: AgendaItem): string {
  if (item.kind === 'event') {
    if (item.event_type === 'custom') return item.title;
    const parts: string[] = [];
    if (item.is_recurring) parts.push(`Recorrente ${RECURRENCE_LABELS[item.recurrence_rule]}`);
    if (item.professional) parts.push(item.professional);
    if (item.location)     parts.push(item.location);
    if (item.description && parts.length === 0) parts.push(item.description.slice(0, 50));
    return parts.join(' · ');
  }

  // Entradas do diário
  const d = item.extracted_data || {};
  switch (item.primary_type) {
    case 'consultation':
    case 'return_visit':
      return [d.vet_name, d.clinic].filter(Boolean).join(' · ');
    case 'vaccine':
      return [d.vaccine_name, d.laboratory].filter(Boolean).join(' · ');
    case 'exam':
      return [d.exam_name, d.lab_name].filter(Boolean).join(' · ');
    case 'medication':
      return d.is_recurring
        ? `Recorrente ${RECURRENCE_LABELS[d.recurrence_rule] || 'diário'}`
        : [d.medication_name, d.vet_name].filter(Boolean).join(' · ');
    case 'symptom':
      return [item.urgency === 'high' ? '⚠️ Urgente' : null,
              d.symptom_description].filter(Boolean).join(' · ');
    case 'weight':
      return `${d.value} kg · ${WEIGHT_STATUS[d.status] || ''}`;
    case 'expense':
      return [EXPENSE_CAT_LABELS[d.category], d.merchant_name,
              d.amount ? `R$ ${d.amount}` : null].filter(Boolean).join(' · ');
    case 'moment':
    case 'connection':
      return [item.mood ? `Humor: ${MOOD_LABELS[item.mood]}` : null,
              item.photo_urls?.length > 0 ? `${item.photo_urls.length} foto${item.photo_urls.length > 1?'s':''}` : null]
              .filter(Boolean).join(' · ');
    case 'travel':
      return [d.destination, d.duration_days ? `${d.duration_days} dias` : null]
              .filter(Boolean).join(' · ');
    case 'achievement':
      return `+${d.xp_reward} XP · Nível ${d.level}`;
    case 'mood':
    case 'pet_audio':
      return [d.emotional_state ? EMOTIONAL_LABELS[d.emotional_state] : null,
              d.pattern_notes].filter(Boolean).join(' · ');
    default:
      return item.ai_narration
        ? item.ai_narration
            .replace(new RegExp(`^(O|A|Os|As) ${item.pet_name}\\b`, 'i'), '')
            .trim()
            .slice(0, 60)
        : '';
  }
}
```

---

## 7. SEPARADORES DE DIA

Aparecem na lista do dia apenas quando o tutor navega para múltiplos dias
(não se aplica ao painel 2 que já está filtrado por dia selecionado).
Presentes na view alternativa de lista corrida (se implementada no futuro).

```
─── Hoje · Quarta 01/04 ────────────────────
─── Ontem · Ter 31/03 ──────────────────────
─── Sex · 03/04 ────────────── futuro ───────
```

- Passado: data abreviada, `color: var(--color-text-tertiary)`
- Hoje: "Hoje" em `var(--color-text-info)`, resto muted
- Futuro: badge `"futuro"` à direita em `var(--color-text-tertiary)`
- Linha: `0.5px solid var(--color-border-tertiary)`, `flex: 1`

---

## 8. COMPONENTES — MAPA COMPLETO

```
AgendaLensContent           ← orquestrador principal (LensScreen)
  ├── MonthCalendar          ← painel 1
  │     ├── CalendarHeader   ← título + setas de navegação
  │     ├── WeekdayRow       ← D S T Q Q S S
  │     └── CalendarGrid     ← 35 células (5 semanas)
  │           └── CalendarDay ← número + dots coloridos
  │
  ├── DayDetail              ← painel 2 (visível após seleção)
  │     ├── DayDetailHeader  ← data por extenso + contador
  │     ├── FilterBar        ← chips adaptativos
  │     └── DayList          ← FlatList de ocorrências
  │           ├── AgendaDiaryRow  ← entrada do diário
  │           └── AgendaEventRow  ← evento agendado
  │
  └── PlaceholderHint        ← antes de selecionar um dia
```

### 8.1 CalendarDay

```typescript
function CalendarDay({ day, dots, isToday, isSelected, onPress }) {
  return (
    <TouchableOpacity
      onPress={() => onPress(day)}
      style={[
        styles.calDay,
        isSelected && styles.calDaySelected,
      ]}
    >
      <View style={[styles.dayNum, isToday && styles.dayNumToday]}>
        <Text style={[
          styles.dayNumText,
          isToday && styles.dayNumTextToday,
          isSelected && styles.dayNumTextSelected,
        ]}>
          {day}
        </Text>
      </View>

      {/* Pontinhos coloridos */}
      <View style={styles.dotsRow}>
        {dots.map((cat, i) => (
          <View
            key={i}
            style={[styles.dot, { backgroundColor: CAT_COLORS[cat] }]}
          />
        ))}
      </View>
    </TouchableOpacity>
  );
}
```

### 8.2 AgendaDiaryRow

```typescript
function AgendaDiaryRow({ item, onPress }) {
  const cat    = PRIMARY_TO_CAT[item.primary_type] || 'momento';
  const color  = CAT_COLORS[cat];
  const icon   = TYPE_ICONS[item.primary_type] || '🐾';
  const time   = format(new Date(item.created_at), 'HH:mm');
  const title  = item.ai_narration
    ? buildTitle(item)
    : item.input_text?.slice(0, 60) || 'Entrada do diário';
  const sub    = buildSubtitle(item);

  return (
    <TouchableOpacity onPress={onPress} style={styles.entry} activeOpacity={0.7}>
      <View style={[styles.iconWrap, { backgroundColor: `${color}18` }]}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>

      <View style={styles.entryBody}>
        <Text style={styles.entryTime}>{time}</Text>
        <Text style={styles.entryTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.entrySub}   numberOfLines={1}>{sub}</Text>
      </View>

      <View style={styles.entryRight}>
        <Text style={styles.chevron}>›</Text>
      </View>
    </TouchableOpacity>
  );
}
```

### 8.3 AgendaEventRow

```typescript
function AgendaEventRow({ item, onPress }) {
  const cat   = EVENT_TO_CAT[item.event_type] || 'agendado';
  const color = CAT_COLORS[cat];
  const icon  = EVENT_ICONS[item.event_type] || '📅';
  const time  = item.all_day ? null : format(new Date(item.scheduled_for), 'HH:mm');
  const sub   = buildSubtitle(item);

  const isCancelled = item.status === 'cancelled';
  const isMissed    = item.status === 'missed';

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.entry,
        styles.entryFuture,
        (isCancelled || isMissed) && styles.entryDimmed,
      ]}
      activeOpacity={0.7}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${color}18` }]}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>

      <View style={styles.entryBody}>
        {time && <Text style={styles.entryTime}>{time}</Text>}
        <Text
          style={[styles.entryTitle, isCancelled && styles.titleStrikethrough]}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <Text style={styles.entrySub} numberOfLines={1}>{sub}</Text>
      </View>

      <View style={styles.entryRight}>
        {item.status === 'completed' && (
          <View style={[styles.statusDot, { backgroundColor: '#1D9E75' }]} />
        )}
        {item.status === 'confirmed' && (
          <View style={styles.badgeConfirmed}>
            <Text style={styles.badgeTextConfirmed}>confirmado</Text>
          </View>
        )}
        {item.status === 'scheduled' && (
          <View style={styles.badgeScheduled}>
            <Text style={styles.badgeTextScheduled}>agendado</Text>
          </View>
        )}
        <Text style={styles.chevron}>›</Text>
      </View>
    </TouchableOpacity>
  );
}
```

---

## 9. STYLESHEET (StyleSheet.create)

```typescript
const CAT_COLORS: Record<string, string> = {
  saude:      '#1D9E75',
  medicacao:  '#3B6D11',
  cuidados:   '#BA7517',
  financeiro: '#534AB7',
  momento:    '#888780',
  lembrete:   '#D85A30',
  agendado:   '#185FA5',
};

const styles = StyleSheet.create({
  // Célula do calendário
  calDay:          { minHeight: 48, borderRadius: 8, padding: 4, alignItems: 'center',
                     gap: 2, borderWidth: 0.5, borderColor: 'transparent' },
  calDaySelected:  { borderColor: 'var_border_primary', backgroundColor: 'var_bg_primary' },
  dayNum:          { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  dayNumToday:     { borderRadius: 11, backgroundColor: 'var_bg_info' },
  dayNumText:      { fontSize: 12, color: 'var_text_secondary' },
  dayNumTextToday: { color: 'var_text_info' },
  dayNumTextSelected: { fontWeight: '500', color: 'var_text_primary' },
  dotsRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: 2, maxWidth: 28,
                     justifyContent: 'center' },
  dot:             { width: 5, height: 5, borderRadius: 3 },

  // Linha de ocorrência
  entry:           { flexDirection: 'row', alignItems: 'center', gap: 9,
                     paddingHorizontal: 8, paddingVertical: 7,
                     borderRadius: 8, borderWidth: 0.5, borderColor: 'transparent' },
  entryFuture:     { backgroundColor: 'var_bg_primary', borderColor: 'var_border_tertiary' },
  entryDimmed:     { opacity: 0.45 },
  iconWrap:        { width: 26, height: 26, borderRadius: 7,
                     alignItems: 'center', justifyContent: 'center' },
  iconText:        { fontSize: 13 },
  entryBody:       { flex: 1, minWidth: 0 },
  entryTime:       { fontSize: 10, color: 'var_text_tertiary', marginBottom: 1 },
  entryTitle:      { fontSize: 13, fontWeight: '500', color: 'var_text_primary' },
  titleStrikethrough: { textDecorationLine: 'line-through' },
  entrySub:        { fontSize: 11, color: 'var_text_secondary' },
  entryRight:      { alignItems: 'flex-end', gap: 2 },
  chevron:         { fontSize: 13, color: 'var_text_tertiary' },
  statusDot:       { width: 6, height: 6, borderRadius: 3 },

  // Badges de status
  badgeScheduled:  { backgroundColor: '#E6F1FB', borderRadius: 999,
                     paddingHorizontal: 5, paddingVertical: 1 },
  badgeTextScheduled: { fontSize: 9, fontWeight: '500', color: '#185FA5' },
  badgeConfirmed:  { backgroundColor: '#E1F5EE', borderRadius: 999,
                     paddingHorizontal: 5, paddingVertical: 1 },
  badgeTextConfirmed: { fontSize: 9, fontWeight: '500', color: '#0F6E56' },
});
```

---

## 10. MAPEAMENTO COMPLETO DE ÍCONES

```typescript
// Um ícone por primary_type do diário
const TYPE_ICONS: Record<string, string> = {
  moment:       '🐾',
  vaccine:      '💉',
  exam:         '🧪',
  medication:   '💊',
  consultation: '🩺',
  return_visit: '🩺',
  allergy:      '⚠️',
  weight:       '⚖️',
  surgery:      '🔬',
  symptom:      '⚠️',
  food:         '🥘',
  expense:      '💰',
  connection:   '🐶',
  travel:       '✈️',
  achievement:  '🏆',
  mood:         '😊',
  insurance:    '📋',
  plan:         '📋',
  pet_audio:    '🎵',
};

// Um ícone por event_type
const EVENT_ICONS: Record<string, string> = {
  consultation:      '🩺',
  exam:              '🧪',
  surgery:           '🔬',
  return_visit:      '🩺',
  physiotherapy:     '🦽',
  vaccine:           '💉',
  medication_dose:   '💊',
  medication_series: '💊',
  deworming:         '💊',
  antiparasitic:     '💊',
  grooming:          '✂️',
  nail_trim:         '✂️',
  dental_cleaning:   '🦷',
  microchip:         '📍',
  plan_renewal:      '📋',
  insurance_renewal: '📋',
  plan_payment:      '💰',
  training:          '🎓',
  behaviorist:       '🎓',
  socialization:     '🐶',
  travel_checklist:  '✈️',
  travel_vaccine:    '💉',
  custom:            '🔔',
};
```

---

## 11. FILTROS — MAPEAMENTO COMPLETO

```typescript
const FILTER_CATEGORIES: Record<string, string[]> = {
  all: [],  // vazio = todos

  saude: [
    // primary_type
    'vaccine', 'exam', 'medication', 'consultation', 'return_visit',
    'allergy', 'weight', 'surgery', 'symptom', 'physiotherapy',
    // event_type
    'exam', 'surgery', 'return_visit', 'physiotherapy',
    'vaccine', 'travel_vaccine',
  ],

  medicacao: [
    'medication_dose', 'medication_series', 'deworming', 'antiparasitic',
  ],

  cuidados: [
    'grooming', 'nail_trim', 'dental_cleaning', 'microchip',
  ],

  financeiro: [
    // primary_type
    'expense', 'insurance', 'plan',
    // event_type
    'plan_renewal', 'insurance_renewal', 'plan_payment',
  ],

  momento: [
    // primary_type
    'moment', 'travel', 'achievement', 'connection', 'food', 'mood', 'pet_audio',
    // event_type
    'training', 'behaviorist', 'socialization', 'travel_checklist',
  ],

  lembrete: [
    'custom',  // só scheduled_events tipo custom
  ],

  agendado: [],  // lógica especial: scheduled_events com status 'scheduled' ou 'confirmed'
};

// Aplicar filtro na lista mesclada
function applyFilter(items: AgendaItem[], filter: string): AgendaItem[] {
  if (filter === 'all') return items;

  if (filter === 'agendado') {
    return items.filter(i =>
      i.kind === 'event' && ['scheduled', 'confirmed'].includes(i.status)
    );
  }

  const cats = FILTER_CATEGORIES[filter] || [];

  return items.filter(i => {
    const type = i.kind === 'diary' ? i.primary_type : i.event_type;
    return cats.includes(type);
  });
}
```

---

## 12. QUERY DO DIA SELECIONADO

```typescript
async function fetchDayItems(petId: string, date: Date): Promise<AgendaItem[]> {
  const dayStart = startOfDay(date).toISOString();
  const dayEnd   = endOfDay(date).toISOString();

  const [{ data: diary }, { data: events }] = await Promise.all([
    supabase
      .from('diary_entries')
      .select(`
        id, created_at, primary_type, ai_narration, input_text,
        mood, urgency, photo_urls, video_url, audio_url,
        classifications, linked_vaccine_id, linked_expense_id
      `)
      .eq('pet_id', petId)
      .gte('created_at', dayStart)
      .lte('created_at', dayEnd)
      .eq('is_active', true)
      .order('created_at', { ascending: false }),

    supabase
      .from('scheduled_events')
      .select(`
        id, event_type, title, professional, location,
        scheduled_for, all_day, is_recurring, recurrence_rule,
        status, description, notify_before
      `)
      .eq('pet_id', petId)
      .gte('scheduled_for', dayStart)
      .lte('scheduled_for', dayEnd)
      .eq('is_active', true)
      .order('scheduled_for', { ascending: true }),
  ]);

  const diaryItems = (diary || []).map(e => ({ kind: 'diary' as const, ...e }));
  const eventItems = (events || []).map(e => ({ kind: 'event' as const, ...e }));

  // Passados: ordem cronológica inversa (mais recente primeiro)
  // Futuros: ordem cronológica direta (mais próximo primeiro)
  const past   = diaryItems.sort((a,b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const future = eventItems.filter(e =>
    ['scheduled','confirmed'].includes(e.status));

  return [...future, ...past];
}
```

---

## 13. CHECKLIST COMPLETO DE IMPLEMENTAÇÃO

```
CALENDÁRIO
[ ] MonthCalendar renderiza 5 semanas corretamente (padding de dias anteriores)
[ ] CalendarDay com número + pontinhos coloridos
[ ] Máximo 4 pontinhos por dia, priorizados por relevância
[ ] Dia de hoje com círculo azul no número
[ ] Dia selecionado com borda e fundo distintos
[ ] fetchMonthDots usa Promise.all (2 queries em paralelo)
[ ] fetchMonthDots retorna no máximo 4 cats por dia, priorizadas
[ ] CalendarHeader com navegação mês anterior / próximo
[ ] Toque longo na seta abre seletor de mês/ano
[ ] Ao trocar de mês, selectedDay reseta e painel 2 fecha

PAINEL 2 — DETALHE DO DIA
[ ] DayDetailHeader com data por extenso + contador de ocorrências
[ ] FilterBar mostra apenas categorias presentes no dia (adaptativos)
[ ] Chip "Tudo" sempre primeiro
[ ] Cada chip tem ponto colorido da categoria
[ ] Filtro ativo visualmente destacado
[ ] Filtro reseta para "Tudo" ao selecionar novo dia
[ ] Contador atualiza ao aplicar filtro
[ ] "Nenhuma ocorrência nesta categoria" quando filtro vazio
[ ] PlaceholderHint antes de qualquer dia ser selecionado

LINHAS DA AGENDA
[ ] Altura fixa 52px para todas as linhas
[ ] Ícone 26×26 com fundo tintado (10% de opacidade da cor)
[ ] Hora 10px omitida quando all_day = true
[ ] Título 13px bold truncado em 1 linha
[ ] Subtítulo 11px muted truncado em 1 linha
[ ] buildSubtitle() implementado para todos os 20+ tipos
[ ] Ponto verde para status 'completed'
[ ] Badge azul "agendado" para status 'scheduled'
[ ] Badge teal "confirmado" para status 'confirmed'
[ ] Linha com opacity 0.45 para 'cancelled' e 'missed'
[ ] Título riscado para 'cancelled'
[ ] Eventos futuros com fundo branco + borda fina
[ ] Tocar em qualquer linha navega para o card completo
[ ] fetchDayItems: futuros no topo, passados abaixo

MAPEAMENTOS
[ ] PRIMARY_TO_CAT cobre todos os 18 primary_types
[ ] EVENT_TO_CAT cobre todos os 22 event_types
[ ] TYPE_ICONS cobre todos os primary_types
[ ] EVENT_ICONS cobre todos os event_types
[ ] CAT_COLORS definido para todas as 8 categorias
[ ] FILTER_CATEGORIES mapeado para todos os filtros
[ ] applyFilter lógica especial para 'agendado'
```

---

## 14. REFERÊNCIA VISUAL RÁPIDA

```
CATEGORIA    COR          PONTO  ÍCONES
─────────────────────────────────────────
Saúde        #1D9E75      ●      🩺 💉 🧪 ⚖️ ⚠️ 🔬
Medicações   #3B6D11      ●      💊
Cuidados     #BA7517      ●      ✂️ 🦷 📍
Financeiro   #534AB7      ●      💰 📋
Momentos     #888780      ●      🐾 ✈️ 🏆 🐶 🎵 😊 🥘
Lembretes    #D85A30      ●      🔔
Agendados    #185FA5      ●      📅

STATUS       VISUAL
──────────────────────────────────────────────
Passado      sem indicador
Concluído    ponto verde 6px
Agendado     badge #E6F1FB / #185FA5
Confirmado   badge #E1F5EE / #0F6E56
Cancelado    opacity 0.45 + título riscado
Missed       opacity 0.45
Futuro       fundo branco + borda fina
```
