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
import { useTranslation } from 'react-i18next';
import { Send, ChevronLeft, UserRound, Bot, Headphones, Sparkles } from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';
import { rs, fs } from '../../hooks/useResponsive';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../components/Toast';
import { reportError } from '../../lib/errorReporter';
import * as Application from 'expo-application';

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
  const scrollRef                            = useRef<ScrollView>(null);

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
          app_version: Application.nativeApplicationVersion ?? undefined,
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
    await send(i18n.language.startsWith('pt') ? 'Quero falar com um atendente humano.' : 'I want to speak with a human agent.');
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={rs(22)} color={colors.click} strokeWidth={2} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t('support.title')}</Text>
          <Text style={styles.headerSubtitle}>
            {escalated ? t('support.statusHuman') : iaActive ? t('support.statusAi') : t('support.statusQueued')}
          </Text>
        </View>
        {!escalated && (
          <Pressable onPress={escalateToHuman} style={styles.humanBtn} disabled={sending}>
            <Headphones size={rs(16)} color={colors.click} strokeWidth={2} />
            <Text style={styles.humanBtnLabel}>{t('support.callHuman')}</Text>
          </Pressable>
        )}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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

        {/* Input */}
        <View style={styles.inputBar}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={t('support.inputPlaceholder')}
            placeholderTextColor={colors.placeholder}
            style={styles.input}
            multiline
            editable={!sending}
            onSubmitEditing={() => send(input)}
          />
          <Pressable
            style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
            disabled={!input.trim() || sending}
            onPress={() => send(input)}
          >
            {sending
              ? <ActivityIndicator color="#fff" size="small" />
              : <Send size={rs(18)} color="#fff" strokeWidth={2} />}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
    paddingVertical: rs(spacing.md),
    paddingTop: rs(spacing.xl + spacing.md),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: rs(spacing.sm),
  },
  backBtn: {
    padding: rs(spacing.sm),
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
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rs(radii.lg),
    paddingHorizontal: rs(spacing.md),
    paddingVertical: rs(spacing.sm),
    fontFamily: 'Sora_400Regular',
    fontSize: fs(14),
    color: colors.text,
    maxHeight: rs(120),
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
