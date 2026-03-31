/**
 * AgendaLensContent — Monthly calendar with colored dots + day detail panel.
 *
 * Layout: two stacked panels without extra navigation.
 *   Panel 1 — Month calendar (always visible, dots per day, month navigation)
 *   Panel 2 — Day list (appears below calendar when day is selected)
 *   Modal    — Detail bottom sheet on item tap
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal, Pressable,
} from 'react-native';
import {
  ChevronLeft, ChevronRight,
  Calendar,
  Syringe, ClipboardList, Pill, Scissors,
  Receipt, RefreshCw, Bell, CalendarCheck,
  PawPrint, Plane, Trophy, Mic, BookOpen,
  TrendingUp, Stethoscope, AlertCircle,
  Clock, Check, X,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../constants/colors';
import { rs, fs } from '../../hooks/useResponsive';
import { radii, spacing } from '../../constants/spacing';
import { Skeleton } from '../Skeleton';
import {
  useLensAgenda,
  useLensAgendaDay,
  CAT_COLORS,
  DOT_PRIORITY,
  type AgendaCategory,
  type AgendaItem,
} from '../../hooks/useLens';

// ── Category config (Lucide icons, no emojis) ─────────────────────────────────

const PRIMARY_ICONS: Record<string, React.ElementType> = {
  vaccine:      Syringe,
  exam:         ClipboardList,
  medication:   Pill,
  consultation: Stethoscope,
  return_visit: Stethoscope,
  surgery:      AlertCircle,
  symptom:      AlertCircle,
  weight:       TrendingUp,
  allergy:      AlertCircle,
  expense:      Receipt,
  plan:         RefreshCw,
  insurance:    RefreshCw,
  travel:       Plane,
  connection:   PawPrint,
  achievement:  Trophy,
  mood:         Mic,
  pet_audio:    Mic,
  food:         BookOpen,
  moment:       BookOpen,
};

const EVENT_ICONS: Record<string, React.ElementType> = {
  consultation:       Stethoscope,
  return_visit:       Stethoscope,
  exam:               ClipboardList,
  surgery:            AlertCircle,
  physiotherapy:      TrendingUp,
  vaccine:            Syringe,
  travel_vaccine:     Syringe,
  medication_dose:    Pill,
  medication_series:  Pill,
  deworming:          Pill,
  antiparasitic:      Pill,
  grooming:           Scissors,
  nail_trim:          Scissors,
  dental_cleaning:    Scissors,
  microchip:          BookOpen,
  plan_renewal:       RefreshCw,
  insurance_renewal:  RefreshCw,
  plan_payment:       Receipt,
  training:           Trophy,
  behaviorist:        Trophy,
  socialization:      PawPrint,
  travel_checklist:   Plane,
  custom:             Bell,
};

const WEEKDAY_KEYS = [
  'agenda.wd_sun', 'agenda.wd_mon', 'agenda.wd_tue', 'agenda.wd_wed',
  'agenda.wd_thu', 'agenda.wd_fri', 'agenda.wd_sat',
];

// ── Calendar helpers ──────────────────────────────────────────────────────────

function toKey(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function daysInMonth(y: number, m: number): number {
  return new Date(y, m + 1, 0).getDate();
}

function firstDayOfWeek(y: number, m: number): number {
  return new Date(y, m, 1).getDay();
}

function getIconForItem(item: AgendaItem): React.ElementType {
  if (item.kind === 'diary') return PRIMARY_ICONS[item.primary_type ?? ''] ?? BookOpen;
  return EVENT_ICONS[item.event_type ?? ''] ?? Bell;
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return null;

  if (status === 'done' || status === 'completed') {
    return <View style={styles.statusDot} />;
  }
  if (status === 'confirmed') {
    return (
      <View style={styles.statusChipConfirmed}>
        <CalendarCheck size={rs(8)} color="#0F6E56" strokeWidth={2} />
      </View>
    );
  }
  if (status === 'scheduled') {
    return (
      <View style={styles.statusChipScheduled}>
        <Clock size={rs(8)} color="#185FA5" strokeWidth={2} />
      </View>
    );
  }
  return null;
}

// ── Month header ──────────────────────────────────────────────────────────────

function MonthHeader({
  year, month, petName, onPrev, onNext,
}: {
  year: number;
  month: number;
  petName: string;
  onPrev: () => void;
  onNext: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.monthHeader}>
      <Text style={styles.monthPetName}>{t('agenda.title', { name: petName.toUpperCase() })}</Text>
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={onPrev} style={styles.navBtn} activeOpacity={0.7}>
          <ChevronLeft size={rs(18)} color={colors.accent} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{t(`agenda.month_${month}`)} {year}</Text>
        <TouchableOpacity onPress={onNext} style={styles.navBtn} activeOpacity={0.7}>
          <ChevronRight size={rs(18)} color={colors.accent} strokeWidth={2} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Weekday row ───────────────────────────────────────────────────────────────

function WeekdayRow() {
  const { t } = useTranslation();
  return (
    <View style={styles.weekRow}>
      {WEEKDAY_KEYS.map((key) => (
        <Text key={key} style={styles.weekdayLabel}>{t(key)}</Text>
      ))}
    </View>
  );
}

// ── Day dots ──────────────────────────────────────────────────────────────────

function DayDots({ cats }: { cats: AgendaCategory[] }) {
  if (cats.length === 0) return null;
  return (
    <View style={styles.dotsRow}>
      {cats.slice(0, 4).map((cat, i) => (
        <View key={i} style={[styles.dot, { backgroundColor: CAT_COLORS[cat] }]} />
      ))}
    </View>
  );
}

// ── Calendar grid ─────────────────────────────────────────────────────────────

function CalendarGrid({
  year, month, dots, selected, onSelect,
}: {
  year: number;
  month: number;
  dots: Record<string, AgendaCategory[]>;
  selected: string | null;
  onSelect: (key: string) => void;
}) {
  const today = new Date();
  const todayKey = toKey(today.getFullYear(), today.getMonth(), today.getDate());

  const totalDays = daysInMonth(year, month);
  const startDay  = firstDayOfWeek(year, month);

  const cells: Array<number | null> = [
    ...Array(startDay).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: Array<Array<number | null>> = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <View style={styles.grid}>
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((day, di) => {
            if (!day) return <View key={di} style={styles.dayCell} />;
            const key = toKey(year, month, day);
            const isToday    = key === todayKey;
            const isSelected = key === selected;
            const hasDots    = (dots[key]?.length ?? 0) > 0;
            return (
              <TouchableOpacity
                key={di}
                style={styles.dayCell}
                onPress={() => onSelect(key)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.dayNumber,
                  isToday    && styles.dayToday,
                  isSelected && styles.daySelected,
                ]}>
                  <Text style={[
                    styles.dayText,
                    isToday    && styles.dayTextToday,
                    isSelected && styles.dayTextSelected,
                  ]}>{day}</Text>
                </View>
                {hasDots && <DayDots cats={dots[key]} />}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ── Category filter chips ─────────────────────────────────────────────────────

function CategoryFilters({
  categories, active, onSelect,
}: {
  categories: AgendaCategory[];
  active: AgendaCategory | 'all';
  onSelect: (c: AgendaCategory | 'all') => void;
}) {
  const { t } = useTranslation();
  const chips: Array<{ id: AgendaCategory | 'all'; label: string }> = [
    { id: 'all', label: t('agenda.filterAll') },
    ...DOT_PRIORITY
      .filter((cat) => categories.includes(cat))
      .map((cat) => ({ id: cat, label: t(`agenda.cat_${cat}`) })),
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterRow}
      style={styles.filterScroll}
    >
      {chips.map((chip) => {
        const isActive = chip.id === active;
        const color = chip.id === 'all' ? colors.accent : CAT_COLORS[chip.id as AgendaCategory];
        return (
          <TouchableOpacity
            key={chip.id}
            style={[
              styles.filterChip,
              isActive && { backgroundColor: color + '20', borderColor: color },
            ]}
            onPress={() => onSelect(chip.id as AgendaCategory | 'all')}
            activeOpacity={0.7}
          >
            {chip.id !== 'all' && (
              <View style={[styles.chipDot, { backgroundColor: color }]} />
            )}
            <Text style={[
              styles.filterChipText,
              isActive && { color, fontFamily: 'Sora_700Bold' },
            ]}>
              {chip.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ── Agenda row ────────────────────────────────────────────────────────────────

const AgendaRow = React.memo(function AgendaRow({
  item, onPress,
}: {
  item: AgendaItem;
  onPress: () => void;
}) {
  const IconComp  = getIconForItem(item);
  const catColor  = CAT_COLORS[item.category];
  const isFuture  = item.kind === 'event' && (item.status === 'scheduled' || item.status === 'confirmed');
  const isDimmed  = item.status === 'cancelled' || item.status === 'missed';

  return (
    <TouchableOpacity
      style={[
        styles.agendaRow,
        isFuture && styles.agendaRowFuture,
        isDimmed && styles.agendaRowDimmed,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Icon */}
      <View style={[styles.rowIcon, { backgroundColor: catColor + '18' }]}>
        <IconComp size={rs(13)} color={catColor} strokeWidth={1.8} />
      </View>

      {/* Body */}
      <View style={styles.rowBody}>
        {item.time && !item.all_day && (
          <Text style={styles.rowTime}>{item.time}</Text>
        )}
        <Text
          style={[styles.rowTitle, isDimmed && styles.rowTitleCancelled]}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <Text style={styles.rowSub} numberOfLines={1}>{item.sub}</Text>
      </View>

      {/* Status + recurrence */}
      <View style={styles.rowRight}>
        {item.is_recurring && (
          <RefreshCw size={rs(9)} color={colors.textGhost} strokeWidth={1.8} />
        )}
        <StatusBadge status={item.status} />
        <ChevronRight size={rs(12)} color={colors.textGhost} strokeWidth={1.8} />
      </View>
    </TouchableOpacity>
  );
});

// ── Item detail modal ─────────────────────────────────────────────────────────

function ItemDetailModal({
  item,
  selectedDate,
  onClose,
}: {
  item: AgendaItem;
  selectedDate: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const IconComp = getIconForItem(item);
  const catColor = CAT_COLORS[item.category];

  const kindLabel = item.kind === 'diary'
    ? t('agenda.kindDiary')
    : t('agenda.kindEvent');

  const statusLabel = (() => {
    switch (item.status) {
      case 'done':       return t('agenda.status_done');
      case 'confirmed':  return t('agenda.status_confirmed');
      case 'scheduled':  return t('agenda.status_scheduled');
      case 'cancelled':  return t('agenda.status_cancelled');
      case 'missed':     return t('agenda.status_missed');
      default: return '—';
    }
  })();

  const rows: Array<[string, string]> = [
    [t('agenda.detailDate'),   selectedDate],
    [t('agenda.detailTime'),   item.all_day ? t('agenda.allDay') : (item.time || '—')],
    [t('agenda.detailKind'),   kindLabel],
    [t('agenda.detailStatus'), statusLabel],
    ...(item.is_recurring ? [[t('agenda.detailRecurring'), t('agenda.recurrenceYes')] as [string, string]] : []),
  ];

  const isScheduled = item.kind === 'event' && item.status === 'scheduled';

  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={() => undefined}>
          {/* Handle bar */}
          <View style={styles.sheetHandle} />

          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderTitle}>{t('agenda.detailTitle')}</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={styles.modalClose}>
              <X size={rs(18)} color={colors.textSec} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* Icon + title */}
          <View style={styles.modalItem}>
            <View style={[styles.modalItemIcon, { backgroundColor: catColor + '18' }]}>
              <IconComp size={rs(22)} color={catColor} strokeWidth={1.8} />
            </View>
            <View style={styles.modalItemBody}>
              <Text style={styles.modalItemTitle}>{item.title}</Text>
              <Text style={styles.modalItemSub}>{item.sub}</Text>
            </View>
          </View>

          {/* Fields */}
          <View style={styles.modalFields}>
            {rows.map(([label, value]) => (
              <View key={label} style={styles.modalFieldRow}>
                <Text style={styles.modalFieldLabel}>{label}</Text>
                <Text style={styles.modalFieldValue}>{value}</Text>
              </View>
            ))}
          </View>

          {/* Action buttons for scheduled events */}
          {isScheduled && (
            <View style={styles.modalActions}>
              {[
                { key: 'confirm',   label: t('agenda.actionConfirm') },
                { key: 'reschedule', label: t('agenda.actionReschedule') },
                { key: 'done',      label: t('agenda.actionDone') },
              ].map(({ key, label }) => (
                <TouchableOpacity
                  key={key}
                  style={styles.modalActionBtn}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalActionText}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Day panel ─────────────────────────────────────────────────────────────────

function DayPanel({
  petId, selected, petName, onClose,
}: {
  petId: string;
  selected: string | null;
  petName: string;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const [activeFilter, setActiveFilter] = useState<AgendaCategory | 'all'>('all');
  const [openCard, setOpenCard] = useState<AgendaItem | null>(null);
  const { data: items, isLoading } = useLensAgendaDay(petId, selected);

  const selectedDate = useMemo(() => {
    if (!selected) return null;
    const d = new Date(selected + 'T12:00:00');
    const lang = i18n.language.startsWith('pt') ? 'pt-BR' : 'en-US';
    return d.toLocaleDateString(lang, { weekday: 'long', day: 'numeric', month: 'long' });
  }, [selected, i18n.language]);

  const categories = useMemo(
    () => Array.from(new Set((items ?? []).map((i) => i.category))),
    [items],
  );

  const filtered = useMemo(() => {
    if (!items) return [];
    // Future scheduled/confirmed events float to the top
    const sorted = [...items].sort((a, b) => {
      const aFuture = a.kind === 'event' && (a.status === 'scheduled' || a.status === 'confirmed') ? 0 : 1;
      const bFuture = b.kind === 'event' && (b.status === 'scheduled' || b.status === 'confirmed') ? 0 : 1;
      return aFuture - bFuture;
    });
    if (activeFilter === 'all') return sorted;
    return sorted.filter((i) => i.category === activeFilter);
  }, [items, activeFilter]);

  const handleFilterSelect = useCallback((c: AgendaCategory | 'all') => setActiveFilter(c), []);

  if (!selected) {
    return (
      <View style={styles.emptyDay}>
        <Calendar size={rs(28)} color={colors.textGhost} strokeWidth={1.4} />
        <Text style={styles.emptyDayText}>{t('agenda.selectDayHint', { name: petName })}</Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.dayPanel}>
        {/* Day header */}
        <View style={styles.dayHeader}>
          <Text style={styles.dayHeaderDate}>{selectedDate}</Text>
          <View style={styles.dayHeaderRight}>
            {!isLoading && (
              <Text style={styles.dayHeaderCount}>
                {t('agenda.occurrences', { count: items?.length ?? 0 })}
              </Text>
            )}
            <TouchableOpacity onPress={onClose} style={styles.dayCloseBtn} activeOpacity={0.7}>
              <X size={rs(14)} color={colors.textSec} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Filters */}
        {categories.length > 1 && (
          <CategoryFilters
            categories={categories}
            active={activeFilter}
            onSelect={handleFilterSelect}
          />
        )}

        {/* Items */}
        {isLoading ? (
          <View style={styles.dayLoadingWrap}>
            <Skeleton width="100%" height={rs(52)} borderRadius={radii.lg} />
            <Skeleton width="100%" height={rs(52)} borderRadius={radii.lg} />
          </View>
        ) : filtered.length === 0 ? (
          <Text style={styles.noneText}>{t('agenda.noOccurrences')}</Text>
        ) : (
          filtered.map((item) => (
            <AgendaRow key={item.id} item={item} onPress={() => setOpenCard(item)} />
          ))
        )}
      </View>

      {/* Detail modal */}
      {openCard && selectedDate && (
        <ItemDetailModal
          item={openCard}
          selectedDate={selectedDate}
          onClose={() => setOpenCard(null)}
        />
      )}
    </>
  );
}

// ── Color legend ──────────────────────────────────────────────────────────────

function Legend() {
  const { t } = useTranslation();
  const cats: AgendaCategory[] = [
    'saude', 'medicacao', 'cuidados', 'financeiro', 'momento', 'lembrete', 'agendado',
  ];
  return (
    <View style={styles.legendWrap}>
      {cats.map((cat) => (
        <View key={cat} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: CAT_COLORS[cat] }]} />
          <Text style={styles.legendLabel}>{t(`agenda.cat_${cat}`)}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface AgendaLensContentProps {
  petId: string;
  petName: string;
}

export function AgendaLensContent({ petId, petName }: AgendaLensContentProps) {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<string | null>(null);

  const { data: dots, isLoading } = useLensAgenda(petId, year, month);

  const goToPrev = useCallback(() => {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
    setSelected(null);
  }, [month]);

  const goToNext = useCallback(() => {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
    setSelected(null);
  }, [month]);

  return (
    <View>
      {/* Calendar card */}
      <View style={styles.calCard}>
        <MonthHeader
          year={year}
          month={month}
          petName={petName}
          onPrev={goToPrev}
          onNext={goToNext}
        />
        <WeekdayRow />
        {isLoading
          ? <Skeleton width="100%" height={rs(160)} borderRadius={radii.lg} />
          : <CalendarGrid
              year={year}
              month={month}
              dots={dots ?? {}}
              selected={selected}
              onSelect={setSelected}
            />
        }
      </View>

      {/* Color legend */}
      <Legend />

      {/* Day detail */}
      <DayPanel petId={petId} selected={selected} petName={petName} onClose={() => setSelected(null)} />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Calendar card
  calCard: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  monthHeader: {
    marginBottom: rs(12),
  },
  monthPetName: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(10),
    color: colors.textGhost,
    letterSpacing: 1.8,
    marginBottom: rs(6),
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: {
    padding: rs(4),
  },
  monthLabel: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(14),
    color: colors.text,
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Sora_700Bold',
    fontSize: fs(10),
    color: colors.textGhost,
    paddingBottom: rs(6),
  },
  grid: {
    marginTop: rs(4),
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: rs(3),
    minHeight: rs(40),
  },
  dayNumber: {
    width: rs(26),
    height: rs(26),
    borderRadius: rs(13),
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayToday: {
    backgroundColor: colors.accent + '25',
  },
  daySelected: {
    backgroundColor: colors.accent,
  },
  dayText: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(12),
    color: colors.textSec,
  },
  dayTextToday: {
    color: colors.accent,
    fontFamily: 'Sora_700Bold',
  },
  dayTextSelected: {
    color: colors.bg,
    fontFamily: 'Sora_700Bold',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: rs(2),
    marginTop: rs(2),
    justifyContent: 'center',
  },
  dot: {
    width: rs(5),
    height: rs(5),
    borderRadius: rs(3),
  },

  // Filters
  filterScroll: {
    marginBottom: rs(8),
  },
  filterRow: {
    gap: rs(6),
    paddingHorizontal: rs(2),
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(5),
    paddingHorizontal: rs(10),
    paddingVertical: rs(5),
    borderRadius: rs(10),
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipDot: {
    width: rs(6),
    height: rs(6),
    borderRadius: rs(3),
  },
  filterChipText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(11),
    color: colors.textDim,
  },

  // Day panel
  dayPanel: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: rs(10),
  },
  dayHeaderDate: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(13),
    color: colors.text,
    flex: 1,
    textTransform: 'capitalize',
  },
  dayHeaderCount: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: fs(11),
    color: colors.textDim,
  },
  dayLoadingWrap: {
    gap: rs(6),
  },
  noneText: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(12),
    color: colors.textGhost,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },

  // Agenda row
  agendaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(9),
    minHeight: rs(52),
    borderRadius: rs(8),
    paddingVertical: rs(6),
    paddingHorizontal: rs(4),
    marginBottom: rs(2),
  },
  agendaRowFuture: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: rs(8),
  },
  agendaRowDimmed: {
    opacity: 0.45,
  },
  rowIcon: {
    width: rs(26),
    height: rs(26),
    borderRadius: rs(7),
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowBody: {
    flex: 1,
  },
  rowTime: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: fs(10),
    color: colors.textGhost,
    marginBottom: rs(1),
  },
  rowTitle: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(13),
    color: colors.text,
  },
  rowTitleCancelled: {
    textDecorationLine: 'line-through',
    color: colors.textDim,
  },
  rowSub: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(11),
    color: colors.textSec,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
    flexShrink: 0,
  },

  // Status badge
  statusDot: {
    width: rs(7),
    height: rs(7),
    borderRadius: rs(4),
    backgroundColor: '#1D9E75',
  },
  statusChipConfirmed: {
    backgroundColor: '#E1F5EE',
    borderRadius: rs(4),
    padding: rs(3),
  },
  statusChipScheduled: {
    backgroundColor: '#E6F1FB',
    borderRadius: rs(4),
    padding: rs(3),
  },

  // Legend
  legendWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs(8),
    paddingHorizontal: rs(spacing.sm),
    paddingVertical: rs(spacing.sm),
    marginBottom: rs(spacing.sm),
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
  },
  legendDot: {
    width: rs(6),
    height: rs(6),
    borderRadius: rs(3),
  },
  legendLabel: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(9),
    color: colors.textGhost,
  },

  // Day header close
  dayHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
  },
  dayCloseBtn: {
    padding: rs(4),
  },

  // Empty day placeholder
  emptyDay: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyDayText: {
    fontFamily: 'Caveat_400Regular',
    fontSize: fs(15),
    color: colors.textDim,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: fs(15) * 1.9,
  },

  // Detail modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(11, 18, 25, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: rs(26),
    borderTopRightRadius: rs(26),
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  sheetHandle: {
    width: rs(40),
    height: rs(5),
    backgroundColor: colors.textGhost,
    borderRadius: rs(3),
    alignSelf: 'center',
    marginBottom: rs(16),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: rs(16),
  },
  modalHeaderTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(14),
    color: colors.text,
  },
  modalClose: {
    padding: rs(4),
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(12),
    marginBottom: rs(16),
  },
  modalItemIcon: {
    width: rs(44),
    height: rs(44),
    borderRadius: rs(12),
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  modalItemBody: {
    flex: 1,
  },
  modalItemTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(15),
    color: colors.text,
    marginBottom: rs(3),
  },
  modalItemSub: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(12),
    color: colors.textSec,
  },
  modalFields: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: rs(14),
  },
  modalFieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: rs(5),
  },
  modalFieldLabel: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(13),
    color: colors.textSec,
  },
  modalFieldValue: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(13),
    color: colors.text,
  },
  modalActions: {
    flexDirection: 'row',
    gap: rs(8),
    marginTop: rs(16),
  },
  modalActionBtn: {
    flex: 1,
    paddingVertical: rs(10),
    borderRadius: rs(8),
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  modalActionText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(12),
    color: colors.text,
  },
});
