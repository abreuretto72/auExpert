import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Share2, Printer, Sparkles as SparklesIcon } from 'lucide-react-native';
import { rs, fs } from '../../../../hooks/useResponsive';
import { colors } from '../../../../constants/colors';
import { useToast } from '../../../../components/Toast';
import { getErrorMessage } from '../../../../utils/errorMessages';
import { shareIaChatPdf, previewIaChatPdf } from '../../../../lib/iaChatPdf';
import type { ChatMessage } from '../../../../hooks/usePetAssistant';

export default function IaPdfScreen() {
  const { id, messagesJson, petName } = useLocalSearchParams<{
    id: string;
    messagesJson: string;
    petName: string;
  }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { toast } = useToast();

  const [isGenerating, setIsGenerating] = useState(false);
  const [isPrinting, setIsPrinting]     = useState(false);

  const messages: ChatMessage[] = (() => {
    try { return JSON.parse(messagesJson ?? '[]') as ChatMessage[]; }
    catch { return []; }
  })();

  const resolvedName = petName ?? '';

  const handleShare = useCallback(async () => {
    setIsGenerating(true);
    try {
      await shareIaChatPdf(messages, resolvedName);
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    } finally {
      setIsGenerating(false);
    }
  }, [messages, resolvedName, toast]);

  const handlePrint = useCallback(async () => {
    setIsPrinting(true);
    try {
      await previewIaChatPdf(messages, resolvedName);
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    } finally {
      setIsPrinting(false);
    }
  }, [messages, resolvedName, toast]);

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn} activeOpacity={0.7}>
          <ChevronLeft size={rs(22)} color={colors.click} strokeWidth={1.8} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('ia.pdfTitle', { name: resolvedName })}</Text>
        <View style={s.headerCount}>
          <Text style={s.headerCountText}>{messages.length}</Text>
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        style={s.msgScroll}
        contentContainerStyle={s.msgContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 ? (
          <View style={s.emptyWrap}>
            <SparklesIcon size={rs(32)} color={colors.purple} strokeWidth={1.4} />
            <Text style={s.emptyText}>{t('ia.pdfEmpty')}</Text>
          </View>
        ) : (
          messages.map((m) => {
            const isUser = m.role === 'user';
            return (
              <View key={m.id} style={[s.msgRow, isUser && s.msgRowUser]}>
                {!isUser && (
                  <View style={s.msgAvatar}>
                    <SparklesIcon size={rs(12)} color={colors.purple} strokeWidth={1.8} />
                  </View>
                )}
                <View style={[s.msgBubble, isUser ? s.msgBubbleUser : s.msgBubbleAI]}>
                  <Text style={[s.msgText, isUser && s.msgTextUser]}>{m.content}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Footer: share + disclaimer */}
      <View style={s.footer}>
        <TouchableOpacity
          style={[s.shareBtn, isGenerating && s.shareBtnDisabled]}
          onPress={handleShare}
          activeOpacity={0.8}
          disabled={isGenerating}
        >
          <View style={s.shareIcon}>
            {isGenerating
              ? <ActivityIndicator color={colors.petrol} size="small" />
              : <Share2 size={rs(20)} color={colors.petrol} strokeWidth={1.8} />
            }
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.shareTitle}>{t('ia.shareFile')}</Text>
            <Text style={s.shareSubtitle}>{t('ia.shareFileHint')}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.shareBtn, s.printBtn, isPrinting && s.shareBtnDisabled]}
          onPress={handlePrint}
          activeOpacity={0.8}
          disabled={isPrinting}
        >
          <View style={[s.shareIcon, s.printIcon]}>
            {isPrinting
              ? <ActivityIndicator color={colors.click} size="small" />
              : <Printer size={rs(20)} color={colors.click} strokeWidth={1.8} />
            }
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.shareTitle}>{t('ia.printFile')}</Text>
            <Text style={s.shareSubtitle}>{t('ia.printFileHint')}</Text>
          </View>
        </TouchableOpacity>
        <Text style={s.disclaimer}>{t('ia.pdfDisclaimer')}</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: rs(16), paddingVertical: rs(10),
    gap: rs(12), borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerBtn: {
    width: rs(40), height: rs(40), borderRadius: rs(12),
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    flex: 1, fontFamily: 'Sora_700Bold', fontSize: fs(15),
    color: colors.text,
  },
  headerCount: {
    backgroundColor: colors.purple + '20', borderRadius: rs(10),
    paddingHorizontal: rs(10), paddingVertical: rs(4),
    borderWidth: 1, borderColor: colors.purple + '30',
  },
  headerCountText: {
    fontFamily: 'JetBrainsMono_700Bold', fontSize: fs(12), color: colors.purple,
  },

  msgScroll: { flex: 1 },
  msgContent: {
    paddingHorizontal: rs(16), paddingVertical: rs(16), gap: rs(12), flexGrow: 1,
  },

  emptyWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: rs(12), paddingTop: rs(60),
  },
  emptyText: {
    fontFamily: 'Sora_400Regular', fontSize: fs(13), color: colors.textDim,
    textAlign: 'center',
  },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: rs(8) },
  msgRowUser: { justifyContent: 'flex-end' },
  msgAvatar: {
    width: rs(26), height: rs(26), borderRadius: rs(13),
    backgroundColor: colors.purple + '15',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.purple + '20', flexShrink: 0,
  },
  msgBubble: {
    maxWidth: '80%', borderRadius: rs(16),
    paddingHorizontal: rs(14), paddingVertical: rs(10),
  },
  msgBubbleAI: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderBottomLeftRadius: rs(4),
  },
  msgBubbleUser: {
    backgroundColor: colors.click, borderBottomRightRadius: rs(4),
  },
  msgText: {
    fontFamily: 'Sora_400Regular', fontSize: fs(13),
    color: colors.text, lineHeight: fs(20),
  },
  msgTextUser: { color: '#fff' },

  footer: {
    paddingHorizontal: rs(16), paddingVertical: rs(16),
    borderTopWidth: 1, borderTopColor: colors.border, gap: rs(12),
  },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: rs(14),
    backgroundColor: colors.card, borderRadius: rs(16),
    padding: rs(16), borderWidth: 1, borderColor: colors.petrol + '40',
  },
  shareBtnDisabled: { opacity: 0.6 },
  shareIcon: {
    width: rs(44), height: rs(44), borderRadius: rs(12),
    backgroundColor: colors.petrolSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  printBtn: { borderColor: colors.click + '40' },
  printIcon: { backgroundColor: colors.clickSoft },
  shareTitle: { fontFamily: 'Sora_600SemiBold', fontSize: fs(14), color: colors.text },
  shareSubtitle: {
    fontFamily: 'Sora_400Regular', fontSize: fs(12), color: colors.textDim, marginTop: rs(2),
  },
  disclaimer: {
    fontFamily: 'Sora_400Regular', fontSize: fs(10), color: colors.textDim,
    textAlign: 'center', lineHeight: fs(10) * 1.6,
  },
});
