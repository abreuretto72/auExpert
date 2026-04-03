import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  StyleSheet, Animated, Easing, Platform, Image,
} from 'react-native';
import {
  Camera, Video, Music2, FileText, ChevronLeft,
  Info, Pencil, Zap, BookOpen, Mic, MicOff, X,
} from 'lucide-react-native';

// ─── DESIGN SYSTEM ──────────────────────────────────────────────────────────
const C = {
  bg:         '#0F1923',
  bgCard:     '#162231',
  card:       '#1A2B3D',
  border:     '#1E3248',
  accent:     '#E8813A',
  accentSoft: 'rgba(232,129,58,0.12)',
  purple:     '#9B59B6',
  purpleSoft: 'rgba(155,89,182,0.10)',
  petrol:     '#1B8EAD',
  text:       '#E8EDF2',
  textSec:    '#8FA3B8',
  textDim:    '#5E7A94',
  danger:     '#E74C3C',
};

const BAR_COUNT = 20;
const ATTACH_TYPES = [
  { key: 'photo',    label: 'Foto',     Icon: Camera  },
  { key: 'video',    label: 'Vídeo',    Icon: Video   },
  { key: 'audio',    label: 'Som pet',  Icon: Music2  },
  { key: 'document', label: 'Arquivo',  Icon: FileText},
];

// ─── WAVEFORM BAR ────────────────────────────────────────────────────────────
function WaveBar({ delay }) {
  const anim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 600 + Math.random() * 400,
          delay,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0.3,
          duration: 600 + Math.random() * 400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const height = 12 + Math.floor(Math.random() * 32);

  return (
    <Animated.View
      style={{
        width: 3,
        height,
        backgroundColor: C.accent,
        borderRadius: 2,
        opacity: 0.85,
        transform: [{ scaleY: anim }],
      }}
    />
  );
}

// ─── BLINK CURSOR ─────────────────────────────────────────────────────────────
function BlinkCursor() {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View
      style={{ width: 2, height: 14, backgroundColor: C.accent,
               marginLeft: 2, opacity: anim }}
    />
  );
}

// ─── ATTACHMENT THUMB ─────────────────────────────────────────────────────────
function AttachThumb({ attachment, onRemove }) {
  return (
    <View style={s.thumb}>
      {attachment.uri ? (
        <Image source={{ uri: attachment.uri }}
               style={s.thumbImg} />
      ) : (
        <View style={s.thumbDoc}>
          <FileText size={20} color={C.petrol} strokeWidth={1.5} />
          <Text style={s.thumbDocName} numberOfLines={1}>
            {attachment.name || 'arquivo'}
          </Text>
        </View>
      )}
      {attachment.type === 'photo' && (
        <View style={s.thumbBadge}>
          <Text style={s.thumbBadgeText}>foto</Text>
        </View>
      )}
      <TouchableOpacity
        style={s.thumbRemove}
        onPress={() => onRemove(attachment.id)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <X size={9} color="#fff" strokeWidth={2.5} />
      </TouchableOpacity>
    </View>
  );
}

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
export default function NovaEntradaScreen({ navigation, route }) {
  const petName    = route?.params?.petName ?? 'Mana';
  const [micState, setMicState]       = useState('recording'); // 'recording' | 'paused'
  const [transcription, setTrans]     = useState('Hoje levei a Mana no vet, a Dra. Marta deu a vacina V10 e disse que ela está pesando 3kg e está ótima');
  const [attachments, setAttachments] = useState([
    { id: '1', type: 'photo',    uri: null,  name: 'foto.jpg' },
    { id: '2', type: 'document', uri: null,  name: 'carteirinha.pdf' },
  ]);
  const [recSeconds, setRecSeconds]   = useState(23);

  // Timer
  useEffect(() => {
    if (micState !== 'recording') return;
    const t = setInterval(() => setRecSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [micState]);

  const formatTime = s =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const toggleMic = () =>
    setMicState(prev => prev === 'recording' ? 'paused' : 'recording');

  const removeAttachment = id =>
    setAttachments(prev => prev.filter(a => a.id !== id));

  const handleAddAttachment = type => {
    // Pausar mic durante seleção
    if (micState === 'recording') setMicState('paused');
    // TODO: abrir picker para o tipo
    // Retomar mic após fechar o picker
    // setMicState('recording');
  };

  const handleGravar = () => {
    // 1. Parar o mic
    // 2. Navegar imediatamente para o diário
    navigation?.goBack();
    // 3. Processar em background (fire and forget)
    // dispatchEntry({ text: transcription, attachments });
  };

  const handleBack = () => {
    if (transcription.trim()) {
      // Mostrar confirm antes de descartar
      // confirm({ text: t('mic.discardConfirm'), type: 'warning' })
    }
    navigation?.goBack();
  };

  return (
    <View style={s.screen}>

      {/* ── HEADER ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.headerBtn} onPress={handleBack}>
          <ChevronLeft size={20} color={C.accent} strokeWidth={2} />
        </TouchableOpacity>

        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Nova entrada</Text>
          <Text style={s.headerSub}>Diário do {petName}</Text>
        </View>

        <TouchableOpacity style={s.headerBtn}>
          <Info size={18} color={C.textSec} strokeWidth={1.8} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── WAVEFORM ── */}
        <View style={s.waveCard}>
          <View style={s.waveHeader}>
            <View style={s.recBadge}>
              <Animated.View style={[s.recDot,
                micState === 'paused' && { backgroundColor: C.textDim }
              ]} />
              <Text style={[s.recLabel,
                micState === 'paused' && { color: C.textDim }
              ]}>
                {micState === 'recording' ? 'Gravando' : 'Pausado'}
              </Text>
            </View>
            <Text style={s.recTime}>{formatTime(recSeconds)}</Text>
          </View>

          <View style={s.waveform}>
            {Array.from({ length: BAR_COUNT }).map((_, i) => (
              micState === 'recording'
                ? <WaveBar key={i} delay={i * 40} />
                : <View key={i} style={[s.waveBarStatic,
                    { height: 6 + (i % 5) * 4 }]} />
            ))}
          </View>

          <Text style={s.waveHint}>
            {micState === 'recording'
              ? 'Toque no microfone para pausar e editar'
              : 'Toque no microfone para retomar a gravação'}
          </Text>
        </View>

        {/* ── TRANSCRIÇÃO ── */}
        <View style={s.txCard}>
          <Text style={s.txLabel}>O que você falou</Text>

          <TouchableOpacity
            style={s.editBtn}
            onPress={() => setMicState('paused')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Pencil size={13} color={C.accent} strokeWidth={1.8} />
          </TouchableOpacity>

          {micState === 'paused' ? (
            <TextInput
              style={s.txInput}
              value={transcription}
              onChangeText={setTrans}
              multiline
              autoFocus
              placeholderTextColor={C.textDim}
              selectionColor={C.accent}
            />
          ) : (
            <View style={s.txReadonly}>
              <Text style={s.txText}>{transcription}</Text>
              <BlinkCursor />
            </View>
          )}
        </View>

        {/* ── ANEXOS ── */}
        <View style={s.attSection}>
          <Text style={s.sectionLabel}>Anexar à entrada</Text>

          {/* Botões de tipo */}
          <View style={s.attBtns}>
            {ATTACH_TYPES.map(({ key, label, Icon }) => (
              <TouchableOpacity
                key={key}
                style={s.attBtn}
                onPress={() => handleAddAttachment(key)}
              >
                <Icon size={20} color={C.accent} strokeWidth={1.8} />
                <Text style={s.attLabel}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Thumbnails */}
          {attachments.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.thumbsRow}
            >
              {attachments.map(att => (
                <AttachThumb
                  key={att.id}
                  attachment={att}
                  onRemove={removeAttachment}
                />
              ))}
            </ScrollView>
          )}
        </View>

        {/* ── AI HINT ── */}
        <View style={s.aiHint}>
          <Zap size={13} color={C.purple} strokeWidth={2} />
          <Text style={s.aiHintText}>
            A IA vai narrar, classificar e construir as lentes automaticamente
          </Text>
        </View>

      </ScrollView>

      {/* ── BOTTOM ACTIONS ── */}
      <View style={s.bottomBar}>

        {/* Mic toggle */}
        <View style={s.micCol}>
          <TouchableOpacity style={[s.micBtn,
            micState === 'paused' && s.micBtnPaused
          ]} onPress={toggleMic}>
            {micState === 'recording'
              ? <Mic  size={22} color={C.accent}   strokeWidth={2} />
              : <MicOff size={22} color={C.textDim} strokeWidth={2} />
            }
          </TouchableOpacity>
          <Text style={s.micHint}>
            {micState === 'recording' ? 'pausar' : 'retomar'}
          </Text>
        </View>

        {/* GRAVAR NO DIÁRIO */}
        <TouchableOpacity
          style={[s.recordBtn,
            !transcription.trim() && s.recordBtnDisabled
          ]}
          onPress={handleGravar}
          disabled={!transcription.trim()}
          activeOpacity={0.85}
        >
          <View style={s.recordBtnIcon}>
            <BookOpen size={18} color="#fff" strokeWidth={2} />
          </View>
          <View style={s.recordBtnText}>
            <Text style={s.recordBtnMain}>Gravar no Diário</Text>
            <Text style={s.recordBtnSub}>IA processa em background</Text>
          </View>
        </TouchableOpacity>

      </View>

    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: 12,
  },
  headerBtn: {
    width: 38, height: 38,
    backgroundColor: C.bgCard,
    borderWidth: 1, borderColor: C.border,
    borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { alignItems: 'center' },
  headerTitle: {
    color: C.text, fontSize: 17, fontWeight: '700',
  },
  headerSub: {
    color: C.textDim, fontSize: 11, marginTop: 1,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16, paddingBottom: 24,
  },

  // Waveform
  waveCard: {
    backgroundColor: C.bgCard,
    borderWidth: 1, borderColor: C.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  waveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  recBadge: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: C.accent,
  },
  recLabel: {
    color: C.accent, fontSize: 11, fontWeight: '700',
    letterSpacing: 0.8, textTransform: 'uppercase',
  },
  recTime: { color: C.textDim, fontSize: 12, fontFamily: 'monospace' },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3, height: 48, marginBottom: 10,
  },
  waveBarStatic: {
    width: 3, backgroundColor: C.textDim,
    borderRadius: 2, opacity: 0.4,
  },
  waveHint: {
    color: C.textDim, fontSize: 11, textAlign: 'center',
  },

  // Transcrição
  txCard: {
    backgroundColor: C.bgCard,
    borderWidth: 1, borderColor: C.border,
    borderRadius: 14, padding: 14,
    marginBottom: 12, position: 'relative',
  },
  txLabel: {
    color: C.textDim, fontSize: 9, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: 8,
  },
  editBtn: {
    position: 'absolute', top: 12, right: 12,
    width: 30, height: 30,
    backgroundColor: C.card,
    borderWidth: 1, borderColor: C.border,
    borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  txReadonly: { flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap' },
  txText: { color: C.text, fontSize: 14, lineHeight: 22 },
  txInput: {
    color: C.text, fontSize: 14, lineHeight: 22,
    minHeight: 60, textAlignVertical: 'top',
    paddingRight: 36,
  },

  // Attachments
  attSection: { marginBottom: 12 },
  sectionLabel: {
    color: C.textDim, fontSize: 9, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: 10, paddingLeft: 2,
  },
  attBtns: {
    flexDirection: 'row', gap: 8, marginBottom: 10,
  },
  attBtn: {
    flex: 1,
    backgroundColor: C.bgCard,
    borderWidth: 1, borderColor: C.border,
    borderRadius: 12, paddingVertical: 10,
    alignItems: 'center', gap: 5,
  },
  attLabel: { color: C.textSec, fontSize: 10, fontWeight: '600' },

  thumbsRow: { gap: 8, paddingBottom: 4 },
  thumb: {
    width: 64, height: 64,
    borderRadius: 10, overflow: 'hidden',
    backgroundColor: C.card,
    borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  thumbImg: { width: '100%', height: '100%' },
  thumbDoc: { alignItems: 'center', gap: 4 },
  thumbDocName: { color: C.textDim, fontSize: 8, maxWidth: 56 },
  thumbBadge: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(232,129,58,0.85)',
    alignItems: 'center', paddingVertical: 2,
  },
  thumbBadgeText: { color: '#fff', fontSize: 8 },
  thumbRemove: {
    position: 'absolute', top: 3, right: 3,
    width: 16, height: 16,
    backgroundColor: 'rgba(231,76,60,0.9)',
    borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },

  // AI hint
  aiHint: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.purpleSoft,
    borderWidth: 1, borderColor: 'rgba(155,89,182,0.2)',
    borderRadius: 10, padding: 10, marginBottom: 4,
  },
  aiHintText: {
    color: C.purple, fontSize: 11,
    fontStyle: 'italic', lineHeight: 16, flex: 1,
  },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    backgroundColor: C.bg,
    borderTopWidth: 1, borderTopColor: C.border,
  },

  // Mic
  micCol: { alignItems: 'center', gap: 3 },
  micBtn: {
    width: 54, height: 54,
    backgroundColor: C.bgCard,
    borderWidth: 2, borderColor: C.accent,
    borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  micBtnPaused: { borderColor: C.border },
  micHint: { color: C.textDim, fontSize: 9 },

  // Gravar no Diário
  recordBtn: {
    flex: 1,
    backgroundColor: C.accent,
    borderRadius: 14, height: 58,
    flexDirection: 'row',
    alignItems: 'center', gap: 12,
    paddingHorizontal: 14,
  },
  recordBtnDisabled: { opacity: 0.5 },
  recordBtnIcon: {
    width: 36, height: 36,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  recordBtnText: {},
  recordBtnMain: {
    color: '#fff', fontSize: 15, fontWeight: '700',
  },
  recordBtnSub: {
    color: 'rgba(255,255,255,0.65)', fontSize: 10, marginTop: 2,
  },
});
