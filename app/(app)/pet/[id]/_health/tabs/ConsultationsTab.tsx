import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BookOpen } from 'lucide-react-native';
import { rs } from '../../../../../../hooks/useResponsive';
import { colors } from '../../../../../../constants/colors';
import { formatDate } from '../../../../../../utils/format';
import { styles } from '../styles';
import { EmptyState, ExpandableCard, InfoRow } from '../components';

interface Props {
  consultations: Record<string, unknown>[];
  consultationsHasMore: boolean;
  currentUserId: string | undefined;
}

export function ConsultationsTab({ consultations, consultationsHasMore, currentUserId }: Props) {
  const { t } = useTranslation();
  const TYPE_COLORS: Record<string, string> = {
    routine: colors.petrol, check_up: colors.petrol,
    emergency: colors.danger,
    specialist: colors.purple, specialty: colors.purple,
    surgery: colors.warning,
    follow_up: colors.sky,
  };
  return (
    <>
      {/* Hint: entry is via diary only */}
      <View style={styles.diaryHintRow}>
        <BookOpen size={rs(13)} color={colors.textDim} strokeWidth={1.8} />
        <Text style={styles.diaryHintText}>{t('health.consultationsViaDiaryHint')}</Text>
      </View>

      {consultations.length === 0 ? (
        <EmptyState message={t('health.emptyConsultations')} hint={t('health.emptyHint')} />
      ) : (
        <>
          {consultations.map((c: Record<string, unknown>, i: number) => {
            const typeKey = String(c.type ?? 'routine');
            const typeColor = TYPE_COLORS[typeKey] ?? colors.petrol;
            const byUser = c.registered_by_user as { full_name?: string } | null;
            const registeredBy = byUser?.full_name
              ? (c.user_id === currentUserId ? t('health.registeredByYou') : String(byUser.full_name))
              : t('health.registeredByUnknown');
            return (
              <ExpandableCard
                key={String(c.id ?? i)}
                header={
                  <View style={styles.consHeaderWrap}>
                    {/* colored left indicator */}
                    <View style={[styles.consTypeDot, { backgroundColor: typeColor }]} />
                    <View style={styles.consHeaderInfo}>
                      {/* Date + time — prominent */}
                      <Text style={styles.consDate}>
                        {formatDate(String(c.date ?? ''))}
                        {c.time ? ` · ${String(c.time).substring(0, 5)}` : ''}
                      </Text>
                      {/* Vet + clinic */}
                      <Text style={styles.consVet}>
                        {String(c.veterinarian ?? '')}
                        {c.clinic ? ` · ${String(c.clinic)}` : ''}
                      </Text>
                      {/* Summary preview — key addition */}
                      {!!c.summary && (
                        <Text style={styles.consSummaryPreview} numberOfLines={1}>
                          {String(c.summary)}
                        </Text>
                      )}
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: typeColor + '15' }]}>
                      <Text style={[styles.statusBadgeText, { color: typeColor }]}>
                        {t(`health.consultType.${typeKey}`, { defaultValue: typeKey })}
                      </Text>
                    </View>
                  </View>
                }
              >
                <View style={styles.vaccineDetails}>
                  {!!c.summary && <InfoRow label={t('health.summary')} value={String(c.summary)} isFirst />}
                  {!!c.diagnosis && c.diagnosis !== c.summary && (
                    <InfoRow label={t('health.diagnosis')} value={String(c.diagnosis)} />
                  )}
                  {!!c.prescriptions && <InfoRow label={t('health.prescriptions')} value={String(c.prescriptions)} />}
                  {!!c.exam_results && <InfoRow label={t('health.examResults')} value={String(c.exam_results)} />}
                  {!!c.follow_up_at && <InfoRow label={t('health.followUp')} value={formatDate(String(c.follow_up_at))} />}
                  {!!c.notes && <InfoRow label={t('health.notes')} value={String(c.notes)} />}
                  <InfoRow label={t('health.addedBy')} value={registeredBy} />
                </View>
              </ExpandableCard>
            );
          })}

          {/* "Showing last 15" indicator */}
          {consultationsHasMore && (
            <View style={styles.consMoreRow}>
              <Text style={styles.consMoreText}>{t('health.consultationsShowingLatest')}</Text>
            </View>
          )}
        </>
      )}
    </>
  );
}
