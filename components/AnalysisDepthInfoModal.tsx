/**
 * AnalysisDepthInfoModal — explica as 4 fases de análise IA.
 *
 * Renderizado quando o tutor toca no ícone Info ao lado do seletor de
 * profundidade. Mostra uma tabela enxuta com 4 linhas (fase + tempo +
 * resultado) + rodapé com escopo do tempo estimado.
 */

import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { X, Image as ImageIcon, Video, Mic, FileText } from 'lucide-react-native';
import { colors } from '../constants/colors';
import { rs, fs } from '../hooks/useResponsive';
import { useTranslation } from 'react-i18next';
import { MEDIA_LIMITS } from '../constants/media';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function AnalysisDepthInfoModal({ visible, onClose }: Props) {
  const { t } = useTranslation();

  const rows: Array<{ phaseKey: string; timeKey: string; descKey: string }> = [
    { phaseKey: 'diary.aiDepth_off',       timeKey: 'diary.aiInfoTimeOff',       descKey: 'diary.aiInfoOffDesc' },
    { phaseKey: 'diary.aiDepth_fast',      timeKey: 'diary.aiInfoTimeFast',      descKey: 'diary.aiInfoFastDesc' },
    { phaseKey: 'diary.aiDepth_balanced',  timeKey: 'diary.aiInfoTimeBalanced',  descKey: 'diary.aiInfoBalancedDesc' },
    { phaseKey: 'diary.aiDepth_deep',      timeKey: 'diary.aiInfoTimeDeep',      descKey: 'diary.aiInfoDeepDesc' },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.card}>
          {/* Header */}
          <View style={s.header}>
            <Text style={s.title}>{t('diary.aiInfoTitle')}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={rs(20)} color={colors.textSec} strokeWidth={1.8} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Intro */}
            <Text style={s.intro}>{t('diary.aiInfoIntro')}</Text>

            {/* Tabela */}
            <View style={s.table}>
              {/* Cabeçalho */}
              <View style={[s.row, s.rowHeader]}>
                <Text style={[s.cell, s.cellPhase, s.cellHead]}>{t('diary.aiInfoColFase')}</Text>
                <Text style={[s.cell, s.cellTime, s.cellHead]}>{t('diary.aiInfoColTempo')}</Text>
                <Text style={[s.cell, s.cellResult, s.cellHead]}>{t('diary.aiInfoColResult')}</Text>
              </View>
              {/* Linhas */}
              {rows.map((r, idx) => (
                <View
                  key={r.phaseKey}
                  style={[s.row, idx === rows.length - 1 && s.rowLast]}
                >
                  <Text style={[s.cell, s.cellPhase]}>{t(r.phaseKey)}</Text>
                  <Text style={[s.cell, s.cellTime]}>{t(r.timeKey)}</Text>
                  <Text style={[s.cell, s.cellResult]}>{t(r.descKey)}</Text>
                </View>
              ))}
            </View>

            {/* Limites de mídia + lógica texto→narração / mídia→análise */}
            <Text style={s.sectionTitle}>{t('diary.aiInfoMediaTitle')}</Text>
            <Text style={s.mediaIntro}>{t('diary.aiInfoMediaIntro')}</Text>
            <View style={s.mediaTable}>
              <MediaRow
                Icon={ImageIcon}
                label={t('diary.aiInfoMediaPhoto')}
                detail={t('diary.aiInfoMediaPhotoDetail', {
                  size: MEDIA_LIMITS.photo.maxSizeMB,
                  count: MEDIA_LIMITS.photo.maxCount,
                })}
              />
              <MediaRow
                Icon={Video}
                label={t('diary.aiInfoMediaVideo')}
                detail={t('diary.aiInfoMediaVideoDetail', {
                  size: MEDIA_LIMITS.video.maxSizeMB,
                  duration: MEDIA_LIMITS.video.maxDurationSec,
                })}
              />
              <MediaRow
                Icon={Mic}
                label={t('diary.aiInfoMediaAudio')}
                detail={t('diary.aiInfoMediaAudioDetail', {
                  size: MEDIA_LIMITS.audio.maxSizeMB,
                  duration: MEDIA_LIMITS.audio.maxDurationSec,
                })}
              />
              <MediaRow
                Icon={FileText}
                label={t('diary.aiInfoMediaDoc')}
                detail={t('diary.aiInfoMediaDocDetail', {
                  size: MEDIA_LIMITS.document.maxSizeMB,
                  pages: MEDIA_LIMITS.document.maxPages,
                })}
                isLast
              />
            </View>
            <Text style={s.mediaNote}>{t('diary.aiInfoMediaNote')}</Text>

            {/* Rodapé */}
            <Text style={s.footer}>{t('diary.aiInfoFooter')}</Text>

            {/* Botão */}
            <TouchableOpacity style={s.closeBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={s.closeBtnText}>{t('diary.aiInfoClose')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Linha da tabela de limites — ícone + label + detalhe (tamanho/duração/qtd).
 * Mantém alinhamento consistente com a tabela das fases acima.
 */
function MediaRow({
  Icon, label, detail, isLast,
}: {
  Icon: typeof ImageIcon;
  label: string;
  detail: string;
  isLast?: boolean;
}) {
  return (
    <View style={[s.mediaRow, isLast && s.rowLast]}>
      <View style={s.mediaIcon}>
        <Icon size={rs(14)} color={colors.click} strokeWidth={1.8} />
      </View>
      <Text style={s.mediaLabel}>{label}</Text>
      <Text style={s.mediaDetail}>{detail}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(11,18,25,0.75)',
    justifyContent: 'center',
    paddingHorizontal: rs(16),
  },
  card: {
    backgroundColor: colors.bg,
    borderRadius: rs(18),
    borderWidth: 1,
    borderColor: colors.border,
    padding: rs(18),
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rs(10),
  },
  title: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(16),
    color: colors.text,
  },
  intro: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(13),
    color: colors.textSec,
    lineHeight: fs(19),
    marginBottom: rs(14),
  },
  table: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rs(10),
    overflow: 'hidden',
    marginBottom: rs(14),
  },
  row: {
    flexDirection: 'row',
    paddingVertical: rs(10),
    paddingHorizontal: rs(10),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'flex-start',
  },
  rowHeader: { backgroundColor: colors.click + '12' },
  rowLast: { borderBottomWidth: 0 },
  cell: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(12),
    color: colors.text,
    lineHeight: fs(17),
  },
  cellHead: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(10),
    color: colors.click,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  cellPhase: { width: rs(85), fontFamily: 'Sora_600SemiBold', color: colors.text },
  cellTime:  { width: rs(70), fontFamily: 'JetBrainsMono_400Regular', color: colors.textSec },
  cellResult: { flex: 1, color: colors.textSec, paddingLeft: rs(4) },

  // Section: limites de mídia
  sectionTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(11),
    color: colors.click,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: rs(8),
    marginTop: rs(2),
  },
  mediaIntro: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(13),
    color: colors.textSec,
    lineHeight: fs(19),
    marginBottom: rs(10),
  },
  mediaTable: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rs(10),
    overflow: 'hidden',
    marginBottom: rs(8),
  },
  mediaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: rs(10),
    paddingHorizontal: rs(10),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: rs(8),
  },
  mediaIcon: {
    width: rs(28), height: rs(28),
    borderRadius: rs(8),
    backgroundColor: colors.click + '15',
    alignItems: 'center', justifyContent: 'center',
  },
  mediaLabel: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(12),
    color: colors.text,
    width: rs(60),
  },
  mediaDetail: {
    flex: 1,
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: fs(11),
    color: colors.textSec,
    lineHeight: fs(16),
  },
  mediaNote: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(11),
    color: colors.textDim,
    fontStyle: 'italic',
    lineHeight: fs(16),
    marginBottom: rs(14),
  },
  footer: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(11),
    color: colors.textDim,
    lineHeight: fs(16),
    fontStyle: 'italic',
    marginBottom: rs(16),
  },
  closeBtn: {
    backgroundColor: colors.click,
    paddingVertical: rs(12),
    borderRadius: rs(12),
    alignItems: 'center',
  },
  closeBtnText: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(14),
    color: '#FFFFFF',
  },
});
