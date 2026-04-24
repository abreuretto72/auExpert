/**
 * DeletedRecordsScreen — shows soft-deleted diary entries for a pet.
 * Only visible to owner and co_parent (enforced by RLS + nav guard).
 * Tutor can restore individual entries.
 */
import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, RotateCcw, Trash2, BookOpen } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { rs, fs } from '../../../../hooks/useResponsive';
import { colors } from '../../../../constants/colors';
import { useDeletedRecords, DeletedEntry } from '../../../../hooks/useDeletedRecords';
import { useToast } from '../../../../components/Toast';
import { getErrorMessage } from '../../../../utils/errorMessages';
import { Skeleton } from '../../../../components/Skeleton';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(locale, {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function shortContent(content: string | null, max = 120): string {
  if (!content) return '';
  return content.length > max ? content.slice(0, max) + '...' : content;
}

// ── DeletedEntryCard ──────────────────────────────────────────────────────────

interface DeletedEntryCardProps {
  item: DeletedEntry;
  locale: string;
  onRestore: (id: string) => void;
  isRestoring: boolean;
}

function DeletedEntryCard({ item, locale, onRestore, isRestoring }: DeletedEntryCardProps) {
  const { t } = useTranslation();

  const deletedByName =
    item.deleted_by_user?.full_name ?? item.deleted_by_user?.email ?? t('diary.registeredByUnknown');

  const registeredByName =
    item.registered_by_user?.full_name ?? item.registered_by_user?.email ?? t('diary.registeredByUnknown');

  return (
    <View style={s.card}>
      {/* Header row */}
      <View style={s.cardHeader}>
        <View style={s.cardIconWrap}>
          <BookOpen size={rs(16)} color={colors.click} strokeWidth={1.8} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.cardType}>
            {item.entry_type ? item.entry_type.replace('_', ' ') : t('diary.registeredByUnknown')}
          </Text>
          <Text style={s.cardDate}>
            {formatDate(item.entry_date ?? item.created_at, locale)}
          </Text>
        </View>
        <TouchableOpacity
          style={s.restoreBtn}
          onPress={() => onRestore(item.id)}
          disabled={isRestoring}
          activeOpacity={0.7}
        >
          {isRestoring
            ? <ActivityIndicator size="small" color={colors.click} />
            : <RotateCcw size={rs(16)} color={colors.click} strokeWidth={2} />}
          <Text style={s.restoreBtnText}>{t('diary.restore')}</Text>
        </TouchableOpacity>
      </View>

      {/* Content preview */}
      {!!item.content && (
        <Text style={s.cardContent} numberOfLines={3}>
          {shortContent(item.content)}
        </Text>
      )}

      {/* Audit row */}
      <View style={s.cardAudit}>
        <Trash2 size={rs(10)} color={colors.textGhost} strokeWidth={1.8} />
        <Text style={s.auditText}>
          {t('diary.deletedBy', {
            name: deletedByName,
            date: formatDate(item.deleted_at, locale),
          })}
        </Text>
      </View>
      <View style={[s.cardAudit, { marginTop: rs(2) }]}>
        <BookOpen size={rs(10)} color={colors.textGhost} strokeWidth={1.8} />
        <Text style={s.auditText}>
          {t('diary.registeredBy', {
            name: registeredByName,
            date: formatDate(item.created_at, locale),
          })}
        </Text>
      </View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function DeletedRecordsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();

  const { deletedEntries, isLoading, refetch, restoreEntry, isRestoring } =
    useDeletedRecords(id!);

  const handleRestore = useCallback(async (entryId: string) => {
    try {
      await restoreEntry(entryId);
      toast(t('diary.restoreSuccess'), 'success');
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    }
  }, [restoreEntry, toast, t]);

  const renderItem = useCallback(
    ({ item }: { item: DeletedEntry }) => (
      <DeletedEntryCard
        item={item}
        locale={i18n.language}
        onRestore={handleRestore}
        isRestoring={isRestoring}
      />
    ),
    [i18n.language, handleRestore, isRestoring],
  );

  const keyExtractor = useCallback((item: DeletedEntry) => item.id, []);

  return (
    <SafeAreaView style={s.safe} edges={[]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn} activeOpacity={0.7}>
          <ChevronLeft size={rs(22)} color={colors.click} strokeWidth={1.8} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('pet.deletedRecords')}</Text>
        <View style={s.headerBtn} />
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={s.loadingWrap}>
          {[1, 2, 3].map((k) => (
            <Skeleton key={k} width="100%" height={rs(110)} radius={rs(16)} style={{ marginBottom: rs(12) }} />
          ))}
        </View>
      ) : (
        <FlatList
          data={deletedEntries}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          onRefresh={refetch}
          refreshing={isLoading}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Trash2 size={rs(40)} color={colors.textGhost} strokeWidth={1.4} />
              <Text style={s.emptyText}>{t('diary.noDeleted')}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: rs(16), paddingVertical: rs(8),
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerBtn: {
    width: rs(40), height: rs(40), borderRadius: rs(12),
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Sora_700Bold', fontSize: fs(18), color: colors.text,
  },

  loadingWrap: { padding: rs(16) },

  list: { padding: rs(16), paddingBottom: rs(40) },

  card: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: rs(16), padding: rs(16), marginBottom: rs(12),
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(10), marginBottom: rs(10) },
  cardIconWrap: {
    width: rs(36), height: rs(36), borderRadius: rs(10),
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.click + '20',
    alignItems: 'center', justifyContent: 'center',
  },
  cardType: { fontFamily: 'Sora_600SemiBold', fontSize: fs(12), color: colors.textSec, textTransform: 'capitalize' },
  cardDate: { fontFamily: 'JetBrainsMono_500Medium', fontSize: fs(11), color: colors.textDim, marginTop: rs(2) },

  restoreBtn: {
    flexDirection: 'row', alignItems: 'center', gap: rs(5),
    backgroundColor: colors.click + '12', borderWidth: 1, borderColor: colors.click + '30',
    borderRadius: rs(10), paddingHorizontal: rs(12), paddingVertical: rs(8),
  },
  restoreBtnText: { fontFamily: 'Sora_700Bold', fontSize: fs(12), color: colors.click },

  cardContent: {
    fontFamily: 'Sora_400Regular', fontSize: fs(13), color: colors.textSec,
    lineHeight: fs(20), marginBottom: rs(10),
  },

  cardAudit: { flexDirection: 'row', alignItems: 'center', gap: rs(5) },
  auditText: {
    fontFamily: 'Sora_400Regular', fontSize: fs(10), color: colors.textGhost,
    lineHeight: fs(15),
  },

  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: rs(80), gap: rs(12) },
  emptyText: { fontFamily: 'Sora_400Regular', fontSize: fs(14), color: colors.textDim, textAlign: 'center' },
});
