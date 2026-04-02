/**
 * AttachmentsPreview — horizontal scrollable row of attachment thumbnails.
 * Renders nothing when there are no attachments.
 */
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AttachmentThumb } from './AttachmentThumb';
import type { Attachment } from './AttachmentThumb';
import { colors } from '../../constants/colors';
import { rs, fs } from '../../hooks/useResponsive';
import { spacing } from '../../constants/spacing';

interface AttachmentsPreviewProps {
  attachments: Attachment[];
  onRemove: (id: string) => void;
}

export function AttachmentsPreview({ attachments, onRemove }: AttachmentsPreviewProps) {
  const { t } = useTranslation();

  if (attachments.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {t('mic.attachments', { count: attachments.length })}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {attachments.map((att) => (
          <AttachmentThumb
            key={att.id}
            attachment={att}
            onRemove={() => onRemove(att.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: rs(spacing.sm),
  },
  label: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(11),
    color: colors.textDim,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: rs(spacing.sm),
    paddingHorizontal: rs(spacing.md),
  },
  scroll: {
    paddingHorizontal: rs(spacing.md),
  },
});

export type { Attachment };
