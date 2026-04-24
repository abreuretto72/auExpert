/**
 * DiaryCalendarModal — bottom-sheet month calendar for filtering diary entries.
 *
 * Days with entries show an orange dot.
 * Tapping a day filters the diary to that date and closes the modal.
 * Tapping the active day (or "Limpar filtro") clears the filter.
 */
import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
} from 'react-native';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../constants/colors';
import { rs, fs } from '../../hooks/useResponsive';
import { radii, spacing } from '../../constants/spacing';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Set of 'YYYY-MM-DD' strings that have at least one diary entry */
  markedDates: Set<string>;
  /** Currently active date filter, or null */
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
}

export default function DiaryCalendarModal({
  visible,
  onClose,
  markedDates,
  selectedDate,
  onSelectDate,
}: Props) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en-US' || i18n.language === 'en';
  const locale = isEn ? 'en-US' : 'pt-BR';

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const initDate = selectedDate ? new Date(selectedDate + 'T12:00:00') : new Date();
  const [viewYear, setViewYear] = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());

  const monthLabel = useMemo(() => {
    const d = new Date(viewYear, viewMonth, 1);
    return d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  }, [viewYear, viewMonth, locale]);

  // Abbreviated weekday headers starting from Sunday
  const dayNames = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) =>
        new Date(2023, 0, 1 + i) // Jan 1 2023 is Sunday
          .toLocaleDateString(locale, { weekday: 'narrow' })
          .toUpperCase(),
      ),
    [locale],
  );

  // Grid cells: null = empty padding, number = day of month
  const cells = useMemo(() => {
    const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const arr: Array<number | null> = Array(firstWeekday).fill(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [viewYear, viewMonth]);

  const prevMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 0) { setViewYear((y) => y - 1); return 11; }
      return m - 1;
    });
  }, []);

  const nextMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 11) { setViewYear((y) => y + 1); return 0; }
      return m + 1;
    });
  }, []);

  const toDateStr = useCallback(
    (day: number) =>
      `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    [viewYear, viewMonth],
  );

  const handleDayPress = useCallback(
    (day: number) => {
      const dateStr = toDateStr(day);
      onSelectDate(selectedDate === dateStr ? null : dateStr);
      onClose();
    },
    [toDateStr, selectedDate, onSelectDate, onClose],
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* onPress={() => {}} stops backdrop propagation */}
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />

          {/* Month navigation */}
          <View style={styles.nav}>
            <TouchableOpacity onPress={prevMonth} style={styles.navBtn} activeOpacity={0.7}>
              <ChevronLeft size={rs(20)} color={colors.click} strokeWidth={1.8} />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{monthLabel}</Text>
            <TouchableOpacity onPress={nextMonth} style={styles.navBtn} activeOpacity={0.7}>
              <ChevronRight size={rs(20)} color={colors.click} strokeWidth={1.8} />
            </TouchableOpacity>
          </View>

          {/* Weekday headers */}
          <View style={styles.dayNamesRow}>
            {dayNames.map((d, i) => (
              <Text key={i} style={styles.dayName}>{d}</Text>
            ))}
          </View>

          {/* Day grid */}
          <View style={styles.grid}>
            {cells.map((day, idx) => {
              if (!day) return <View key={idx} style={styles.cell} />;
              const dateStr = toDateStr(day);
              const hasEntry = markedDates.has(dateStr);
              const isSelected = selectedDate === dateStr;
              const isToday = dateStr === todayStr;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.cell,
                    isSelected && styles.cellSelected,
                    isToday && !isSelected && styles.cellToday,
                  ]}
                  onPress={() => handleDayPress(day)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dayNum,
                      isSelected && styles.dayNumSelected,
                      isToday && !isSelected && styles.dayNumToday,
                      !hasEntry && !isToday && !isSelected && styles.dayNumFaded,
                    ]}
                  >
                    {day}
                  </Text>
                  {hasEntry && (
                    <View style={[styles.dot, isSelected && styles.dotOnSelected]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Clear filter — only when a date is active */}
          {selectedDate && (
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => { onSelectDate(null); onClose(); }}
              activeOpacity={0.7}
            >
              <X size={rs(14)} color={colors.textDim} strokeWidth={1.8} />
              <Text style={styles.clearText}>{t('diary.calendarClear')}</Text>
            </TouchableOpacity>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: rs(radii.modal),
    borderTopRightRadius: rs(radii.modal),
    paddingHorizontal: rs(spacing.xl),
    paddingTop: rs(spacing.md),
    paddingBottom: rs(spacing.xxl),
  },
  handle: {
    width: rs(40),
    height: rs(4),
    borderRadius: rs(2),
    backgroundColor: colors.textGhost,
    alignSelf: 'center',
    marginBottom: rs(spacing.md),
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: rs(spacing.md),
  },
  navBtn: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(radii.lg),
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(15),
    color: colors.text,
    textTransform: 'capitalize',
  },
  dayNamesRow: {
    flexDirection: 'row',
    marginBottom: rs(spacing.xs),
  },
  dayName: {
    width: `${100 / 7}%` as unknown as number,
    textAlign: 'center',
    fontFamily: 'Sora_700Bold',
    fontSize: fs(11),
    color: colors.textGhost,
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%` as unknown as number,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: rs(radii.lg),
  },
  cellSelected: {
    backgroundColor: colors.click,
  },
  cellToday: {
    borderWidth: 1.5,
    borderColor: colors.click,
  },
  dayNum: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(13),
    color: colors.text,
  },
  dayNumSelected: {
    color: '#FFFFFF',
  },
  dayNumToday: {
    color: colors.click,
  },
  dayNumFaded: {
    color: colors.textGhost,
  },
  dot: {
    width: rs(5),
    height: rs(5),
    borderRadius: rs(3),
    backgroundColor: colors.click,
    marginTop: rs(2),
  },
  dotOnSelected: {
    backgroundColor: '#FFFFFF',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(spacing.xs),
    marginTop: rs(spacing.md),
    paddingVertical: rs(spacing.sm),
    borderRadius: rs(radii.xl),
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clearText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(13),
    color: colors.textDim,
  },
});
