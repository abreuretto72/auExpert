/**
 * ScheduledEventCard — rendered for scheduled (upcoming) timeline items.
 * Includes the private SCHED_EVENT_ICON map (only used here).
 * Extracted verbatim from TimelineCards.tsx.
 */

import React from 'react';
import { View, Text } from 'react-native';
import { AlertCircle, Calendar, FileText, ShieldCheck } from 'lucide-react-native';
import { colors } from '../../../constants/colors';
import { rs } from '../../../hooks/useResponsive';
import i18n from '../../../i18n';
import { type CardProps } from './shared';
import { styles } from './styles';

// ── ScheduledEventCard ──

const SCHED_EVENT_ICON: Record<string, React.ElementType> = {
  consultation:      Calendar,
  return_visit:      Calendar,
  exam:              FileText,
  surgery:           AlertCircle,
  physiotherapy:     Calendar,
  vaccine:           ShieldCheck,
  travel_vaccine:    ShieldCheck,
  medication_dose:   Calendar,
  medication_series: Calendar,
  deworming:         Calendar,
  antiparasitic:     Calendar,
  grooming:          Calendar,
  nail_trim:         Calendar,
  dental_cleaning:   Calendar,
  microchip:         Calendar,
  plan_renewal:      Calendar,
  insurance_renewal: Calendar,
  plan_payment:      Calendar,
  training:          Calendar,
  behaviorist:       Calendar,
  socialization:     Calendar,
  travel_checklist:  Calendar,
  custom:            Calendar,
};

export const ScheduledEventCard = React.memo(({ event, t }: CardProps) => {
  const IconComponent = SCHED_EVENT_ICON[event.scheduledEventType ?? 'custom'] ?? Calendar;
  const isAI = event.scheduledSource === 'ai';
  const formattedDate = event.scheduledFor
    ? new Date(event.scheduledFor).toLocaleDateString(
        i18n.language === 'en-US' || i18n.language === 'en' ? 'en-US' : 'pt-BR',
        { weekday: 'short', day: '2-digit', month: 'short', hour: event.scheduledAllDay ? undefined : '2-digit', minute: event.scheduledAllDay ? undefined : '2-digit' },
      )
    : '—';

  return (
    <View style={[styles.cardBase, styles.schedCard]}>
      <View style={styles.schedHeader}>
        <View style={styles.schedIconWrap}>
          <IconComponent size={rs(16)} color={colors.petrol} strokeWidth={1.8} />
        </View>
        <Text style={styles.schedTypeLabel}>{t('diary.upcomingEvent')}</Text>
        {isAI && (
          <View style={styles.schedAIBadge}>
            <Text style={styles.schedAIText}>IA</Text>
          </View>
        )}
      </View>

      <Text style={styles.schedTitle}>{event.title}</Text>

      <View style={styles.schedDateRow}>
        <Calendar size={rs(12)} color={colors.petrol} strokeWidth={1.8} />
        <Text style={styles.schedDateText}>{formattedDate}</Text>
      </View>

      {event.detail ? (
        <Text style={styles.schedDetail}>{event.detail}</Text>
      ) : null}

      {(event.scheduledProfessional || event.scheduledLocation) ? (
        <View style={styles.schedMetaRow}>
          {event.scheduledProfessional ? (
            <Text style={styles.schedMetaText}>{event.scheduledProfessional}</Text>
          ) : null}
          {event.scheduledLocation ? (
            <Text style={styles.schedMetaText}>{event.scheduledLocation}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
});
