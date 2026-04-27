/**
 * Tela /support — Chat de suporte do auExpert.
 *
 * - Chama EF support-assistant (cria conversa nova ou usa última aberta)
 * - Renderiza histórico (mensagens user/ai/admin coloridas)
 * - Input pro tutor escrever
 * - Botão "Falar com humano" no header (escala explicitamente)
 *
 * Fluxo de fallback:
 *   - Se EF retornar { queued: true, ia_active: false }, mostra que admin
 *     vai responder em breve.
 *   - Se admin responder enquanto a tela está aberta, refetch periódico
 *     (10s) traz a nova mensagem.
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, KeyboardAvoidingView, Platform,
  Pressable, ActivityIndicator, StyleSheet, AppState,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Send, ChevronLeft, UserRound, Bot, Headphones, Sparkles, Mic, FileText } from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';
import { rs, fs } from '../../hooks/useResponsive';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../components/Toast';
import { reportError } from '../../lib/errorReporter';
import { useSimpleSTT } from '../../hooks/useSimpleSTT';
import PdfActionModal from '../../components/pdf/PdfActionModal';
import { previewPdf, sharePdf } from '../../lib/pdf';

// Lazy-load opcional pra evitar quebrar bundle se não instalado
let _Application: typeof import('expo-application') | null = null;
try { _Application = require('expo-application'); } catch { /* opcional */ }

// Versão exibida no header — visível em qualquer momento da conversa pra
// equipe de suporte (ou o próprio tutor) saber em qual build a dúvida foi
// enviada. Buscada uma vez no carregamento do módulo (não muda na sessão).
const APP_VERSION = _Application?.nativeApplicationVersion ?? '—';
const APP_BUILD = _Application?.nativeBuildVersion ?? null;

interface SupportMessage {
  id: string;
  sender: 'user' | 'ai' | 'admin';
  content: string;
  created_at: string;
  read_by_user?: boolean;
}

const REFRESH_INTERVAL_MS = 10_000;

export default function SupportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const userId = useAuthStore(s => s.user?.id ?? null);

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [iaActive, setIaActive]             = useState(true);
  const [escalated, setEscalated]           = useState(false);
  const [messages, setMessages]             = useState<SupportMessage[]>([]);
  const [input, setInput]                   = useState('');
  const [loading, setLoading]               = useState(true);
  const [sending, setSending]               = useState(false);
  const [interimText, setInterimText]       = useState('');
  const [inputHeight, setInputHeight]       = useState(rs(44));
  const [pdfModalVisible, setPdfModalVisible] = useState(false);
  const scrollRef                            = useRef<ScrollView>(null);

  // STT — mic toggle no input
  const stt = useSimpleSTT({
    lang: i18n.language,
    onTranscript: (text, isFinal) => {
      if (isFinal) {
        // Append no input + limpa interim
        setInput(prev => (prev ? `${prev} ${text}`.trim() : text));
        setInterimText('');
      } else {
        setInterimText(text);
      }
    },
    onError: (msg) => toast(msg, 'warning'),
  });

  // Carrega ou cria a conversa mais recente do tutor
  const loadConversation = useCallback(async () => {
    if (!userId) return;
    try {
      // Última conversa aberta (ou null se primeiro acesso)
      const { data: convs } = await supabase
        .from('support_conversations')
        .select('id, ia_active, escalated_to_human, status')
        .eq('user_id', userId)
        .eq('is_active', true)
        .eq('status', 'open')
        .order('last_message_at', { ascending: false })
        .limit(1);

      const conv = convs?.[0];
      if (!conv) {
        setLoading(false);
        return;
      }
      setConversationId(conv.id);
      setIaActive(conv.ia_active);
      setEscalated(conv.escalated_to_human);

      const { data: msgs } = await supabase
        .from('support_messages')
        .select('id, sender, content, created_at, read_by_user')
        .eq('conversation_id', conv.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      setMessages(msgs ?? []);

      // Marca como lidas pelo tutor
      const unread = (msgs ?? []).filter(m => !m.read_by_user && m.sender !== 'user');
      if (unread.length > 0) {
        await supabase.from('support_messages')
          .update({ read_by_user: true })
          .in('id', unread.map(m => m.id));
      }
    } catch (err) {
      reportError(err, { boundary: 'section', section: 'support', route: '/support' });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Refetch periódico pra capturar respostas do admin enquanto a tela está aberta
  useEffect(() => {
    loadConversation();
    const handle = setInterval(() => loadConversation(), REFRESH_INTERVAL_MS);

    // Para de pollar quando o app vai pra background
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') loadConversation();
    });

    return () => {
      clearInterval(handle);
      sub.remove();
    };
  }, [loadConversation]);

  // Auto-scroll pro fim quando msgs mudam
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }, [messages]);

  async function send(messageText: string) {
    if (!messageText.trim() || sending) return;
    setSending(true);

    // Optimistic: já mostra a msg do user
    const optimistic: SupportMessage = {
      id: `temp-${Date.now()}`,
      sender: 'user',
      content: messageText.trim(),
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    setInput('');

    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token;

      const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/support-assistant`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          message: messageText.trim(),
          locale: i18n.language,
          app_version: _Application?.nativeApplicationVersion ?? undefined,
          platform: Platform.OS,
        }),
      });

      if (!resp.ok) {
        throw new Error(`support-assistant ${resp.status}`);
      }
      const json = await resp.json();

      if (json.conversation_id) setConversationId(json.conversation_id);
      if (typeof json.ia_active === 'boolean') setIaActive(json.ia_active);
      if (typeof json.escalated === 'boolean') setEscalated(json.escalated);

      // Recarrega lista atualizada (a EF já gravou tudo)
      await loadConversation();
    } catch (err) {
      reportError(err, {
        boundary: 'section',
        section: 'support',
        route: '/support',
        category: 'ai_failure',
        userMessage: messageText.trim(),
      });
      toast(t('support.sendFailed'), 'error');
      // Remove a optimistic
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  }

  async function escalateToHuman() {
    if (stt.isListening) stt.stop();
    await send(i18n.language.startsWith('pt') ? 'Quero falar com um atendente humano.' : 'I want to speak with a human agent.');
  }

  // Para o mic se trocou de tela ou desmontou
  useEffect(() => () => stt.stop(), []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── PDF: monta HTML da conversa pra previewPdf/sharePdf ────────────────
  function buildConversationHtml(): string {
    const senderLabel = (s: SupportMessage['sender']) => (
      s === 'user'  ? t('support.pdfSenderTutor', { defaultValue: 'Você' })
    : s === 'ai'    ? t('support.pdfSenderAi',    { defaultValue: 'Assistente IA' })
    : s === 'admin' ? t('support.pdfSenderAdmin', { defaultValue: 'Equipe humana' })
    : s);

    const senderColor = (s: SupportMessage['sender']) => (
      s === 'user'  ? '#8F7FA8'   // ametista
    : s === 'ai'    ? '#4FA89E'   // jade
    : s === 'admin' ? '#7FA886'   // success
    : '#666');

    const fmt = (iso: string) => {
      try { return new Date(iso).toLocaleString(i18n.language); } catch { return iso; }
    };

    const escapeHtml = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const messagesHtml = messages.map((m) => `
      <div style="margin-bottom:14px; padding:10px 14px; border-left:3px solid ${senderColor(m.sender)}; background:#fafafa;">
        <div style="font-size:11px; color:${senderColor(m.sender)}; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">
          ${senderLabel(m.sender)} · <span style="color:#999; font-weight:400;">${fmt(m.created_at)}</span>
        </div>
        <div style="font-size:13px; color:#222; line-height:1.55; white-space:pre-wrap;">${escapeHtml(m.content)}</div>
      </div>
    `).join('');

    return `
      <div style="font-size:13px; color:#333; line-height:1.6;">
        <p style="color:#666; margin-bottom:18px;">
          ${t('support.pdfIntro', {
            defaultValue: 'Registro completo da conversa de suporte do tutor com a equipe auExpert (IA + humano).',
          })}
        </p>
        ${messagesHtml || '<p style="color:#999; font-style:italic;">Sem mensagens registradas.</p>'}
        <p style="margin-top:24px; color:#999; font-size:11px;">
          Total de ${messages.length} mensagem${messages.length === 1 ? '' : 's'}.
        </p>
      </div>
    `;
  }

  async function handlePdfPreview() {
    await previewPdf({
      title: t('support.pdfTitle', { defaultValue: 'Conversa de suporte' }),
      subtitle: t('support.pdfSubtitle', {
        defaultValue: '{{count}} mensagens',
        count: messages.length,
      }),
      bodyHtml: buildConversationHtml(),
      language: i18n.language,
    });
  }

  async function handlePdfShare() {
    const fileName = `auExpert-suporte-${new Date().toISOString().slice(0, 10)}.pdf`;
    await sharePdf({
      title: t('support.pdfTitle', { defaultValue: 'Conversa de suporte' }),
      subtitle: t('support.pdfSubtitle', {
        defaultValue: '{{count}} mensagens',
        count: messages.length,
      }),
      bodyHtml: buildConversationHtml(),
      language: i18n.language,
    }, fileName);
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + rs(spacing.sm) }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={rs(22)} color={colors.click} strokeWidth={2} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t('support.title')}</Text>
          <Text style={styles.headerSubtitle}>
            {escalated ? t('support.statusHuman') : iaActive ? t('support.statusAi') : t('support.statusQueued')}
          </Text>
          <Text style={styles.headerVersion}>
            {t('support.versionLine', {
              version: APP_VERSION,
              build: APP_BUILD ? ` · build ${APP_BUILD}` : '',
              platform: Platform.OS,
              defaultValue: 'auExpert v{{version}}{{build}} · {{platform}}',
            })}
          </Text>
        </View>

        {/* Botão PDF — sempre renderizado, padrão do app: ícone FileText.
            Desabilitado quando sem mensagens (gerar PDF vazio não faz sentido). */}
        <Pressable
          onPress={() => setPdfModalVisible(true)}
          style={[styles.iconBtn, messages.length === 0 && styles.iconBtnDisabled]}
          disabled={sending || messages.length === 0}
          hitSlop={8}
          accessibilityLabel={t('pdfCommon.printOrSave', { defaultValue: 'Imprimir ou salvar' })}
        >
          <FileText
            size={rs(20)}
            color={messages.length === 0 ? colors.textGhost : colors.click}
            strokeWidth={1.8}
          />
        </Pressable>

        {/* Falar com humano — versão compacta (só ícone) pra caber junto do PDF */}
        {!escalated && (
          <Pressable
            onPress={escalateToHuman}
            style={styles.iconBtn}
            disabled={sending}
            hitSlop={8}
          >
            <Headphones size={rs(20)} color={colors.click} strokeWidth={1.8} />
          </Pressable>
        )}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        style={{ flex: 1 }}
      >
        {/* Mensagens */}
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.click} />
            </View>
          ) : messages.length === 0 ? (
            <Welcome />
          ) : (
            messages.map(m => <MessageBubble key={m.id} message={m} />)
          )}
        </ScrollView>

        {/* Input — caixa flexível com auto-grow + mic STT.
            paddingBottom respeita SafeArea (gesture nav do Android, home indicator iOS)
            evitando que o input fique atrás da barra do sistema. */}
        <View style={[styles.inputBar, { paddingBottom: rs(spacing.md) + insets.bottom }]}>
          <View style={styles.inputWrap}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={t('support.inputPlaceholder')}
              placeholderTextColor={colors.placeholder}
              style={styles.input}
              multiline
              editable={!sending}
              textAlignVertical="top"
            />

            {/* Mic STT — sempre renderizado. Se modulo nativo indisponível,
                onPress mostra toast (sem esconder o botão pra UX consistente) */}
            <Pressable
              onPress={stt.toggle}
              disabled={sending}
              style={[styles.micBtn, stt.isListening && styles.micBtnActive]}
              hitSlop={8}
            >
              <Mic
                size={rs(18)}
                color={stt.isListening ? '#FFFFFF' : colors.click}
                strokeWidth={2}
              />
            </Pressable>
          </View>

          {/* Caption de interim STT — aparece embaixo enquanto o tutor fala */}
          {stt.isListening && interimText.length > 0 && (
            <Text style={styles.interimCaption} numberOfLines={2}>
              {interimText}
            </Text>
          )}

          <Pressable
            style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
            disabled={!input.trim() || sending}
            onPress={() => {
              if (stt.isListening) stt.stop();
              send(input);
            }}
          >
            {sending
              ? <ActivityIndicator color="#fff" size="small" />
              : <Send size={rs(18)} color="#fff" strokeWidth={2} />}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Bottom sheet padrão de PDF do app — usado em todos os exports */}
      <PdfActionModal
        visible={pdfModalVisible}
        onClose={() => setPdfModalVisible(false)}
        title={t('support.pdfTitle', { defaultValue: 'Conversa de suporte' })}
        subtitle={t('support.pdfSubtitle', {
          defaultValue: '{{count}} mensagens',
          count: messages.length,
        })}
        onPreview={handlePdfPreview}
        onShare={handlePdfShare}
      />
    </View>
  );
}

function Welcome() {
  const { t } = useTranslation();
  return (
    <View style={styles.welcome}>
      <View style={styles.welcomeIconWrap}>
        <Sparkles size={rs(36)} color={colors.click} strokeWidth={1.5} />
      </View>
      <Text style={styles.welcomeTitle}>{t('support.welcomeTitle')}</Text>
      <Text style={styles.welcomeBody}>{t('support.welcomeBody')}</Text>
    </View>
  );
}

function MessageBubble({ message }: { message: SupportMessage }) {
  const isUser  = message.sender === 'user';
  const isAdmin = message.sender === 'admin';

  return (
    <View style={[
      styles.bubbleRow,
      isUser ? styles.bubbleRowRight : styles.bubbleRowLeft,
    ]}>
      {!isUser && (
        <View style={[styles.avatar, isAdmin ? styles.avatarAdmin : styles.avatarAi]}>
          {isAdmin
            ? <UserRound size={rs(14)} color="#fff" strokeWidth={2} />
            : <Bot size={rs(14)} color="#fff" strokeWidth={2} />}
        </View>
      )}
      <View style={[
        styles.bubble,
        isUser  ? styles.bubbleUser
                : isAdmin ? styles.bubbleAdmin : styles.bubbleAi,
      ]}>
        <Text style={[
          styles.bubbleText,
          isUser ? styles.bubbleTextUser : styles.bubbleTextOther,
        ]}>
          {message.content}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rs(spacing.md),
    paddingBottom: rs(spacing.md),
    // paddingTop é setado inline com insets.top + spacing.sm pra respeitar a notch/status bar
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: rs(spacing.sm),
  },
  backBtn: {
    padding: rs(spacing.sm),
  },
  iconBtn: {
    width: rs(40),
    height: rs(40),
    borderRadius: rs(20),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardHover,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconBtnDisabled: {
    opacity: 0.4,
  },
  headerTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(18),
    color: colors.text,
  },
  headerSubtitle: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(11),
    color: colors.textDim,
    marginTop: rs(2),
  },
  headerVersion: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: fs(10),
    color: colors.textGhost,
    marginTop: rs(2),
    letterSpacing: 0.3,
  },
  humanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
    paddingHorizontal: rs(spacing.md),
    paddingVertical: rs(spacing.sm),
    backgroundColor: colors.cardHover,
    borderRadius: rs(radii.md),
    borderWidth: 1,
    borderColor: colors.border,
  },
  humanBtnLabel: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(11),
    color: colors.click,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: rs(spacing.md),
    paddingBottom: rs(spacing.lg),
  },
  centered: {
    paddingTop: rs(spacing.xxl),
    alignItems: 'center',
  },
  welcome: {
    alignItems: 'center',
    paddingTop: rs(60),
    paddingHorizontal: rs(spacing.lg),
  },
  welcomeIconWrap: {
    width: rs(72),
    height: rs(72),
    borderRadius: rs(36),
    backgroundColor: colors.cardHover,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: rs(spacing.lg),
  },
  welcomeTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(20),
    color: colors.text,
    marginBottom: rs(spacing.sm),
    textAlign: 'center',
  },
  welcomeBody: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(14),
    color: colors.textSec,
    lineHeight: fs(22),
    textAlign: 'center',
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: rs(spacing.sm),
    gap: rs(spacing.sm),
  },
  bubbleRowLeft: {
    justifyContent: 'flex-start',
  },
  bubbleRowRight: {
    justifyContent: 'flex-end',
  },
  avatar: {
    width: rs(28),
    height: rs(28),
    borderRadius: rs(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarAi: {
    backgroundColor: colors.click,
  },
  avatarAdmin: {
    backgroundColor: colors.success,
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: rs(spacing.md),
    paddingVertical: rs(spacing.sm),
    borderRadius: rs(radii.lg),
  },
  bubbleUser: {
    backgroundColor: colors.click,
    borderBottomRightRadius: rs(4),
  },
  bubbleAi: {
    backgroundColor: colors.cardHover,
    borderBottomLeftRadius: rs(4),
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleAdmin: {
    backgroundColor: colors.successSoft,
    borderBottomLeftRadius: rs(4),
    borderWidth: 1,
    borderColor: colors.success,
  },
  bubbleText: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(14),
    lineHeight: fs(21),
  },
  bubbleTextUser: {
    color: '#FFFFFF',
  },
  bubbleTextOther: {
    color: colors.text,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: rs(spacing.md),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: rs(spacing.sm),
    backgroundColor: colors.bg,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rs(radii.lg),
    paddingRight: rs(spacing.xs),
  },
  input: {
    flex: 1,
    paddingHorizontal: rs(spacing.md),
    paddingTop: rs(spacing.sm),
    paddingBottom: rs(spacing.sm),
    fontFamily: 'Sora_400Regular',
    fontSize: fs(14),
    color: colors.text,
    minHeight: rs(44),
    maxHeight: rs(180),
    // multiline cresce naturalmente entre minHeight e maxHeight (sem height inline)
  },
  interimCaption: {
    marginTop: rs(4),
    marginHorizontal: rs(spacing.md),
    fontFamily: 'Sora_400Regular',
    fontSize: fs(12),
    color: colors.textDim,
    fontStyle: 'italic',
  },
  micBtn: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(18),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: rs(4),
    marginRight: rs(2),
  },
  micBtnActive: {
    backgroundColor: colors.click,
  },
  sendBtn: {
    width: rs(44),
    height: rs(44),
    borderRadius: rs(22),
    backgroundColor: colors.click,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});
