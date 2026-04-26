/**
 * CreateBreedPostSheet — Bottom sheet pra criar post no Breed Intelligence.
 *
 * 3 caminhos (zero digitação):
 *   1. Câmera: foto/vídeo → mic STT → IA modera → publica
 *   2. Galeria: foto/vídeo do device → mic STT → IA modera → publica
 *   3. Diário: pega entrada existente → IA gera card automático
 *
 * Mídia é upada pro storage `pet-photos` e a URL pública vai pro EF.
 * Texto vem do useSimpleSTT (já existente em hooks/) — fala livre do tutor.
 */
import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator,
  Pressable, ScrollView, Image, Animated, TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useTranslation } from 'react-i18next';
import {
  Camera, Image as ImageIcon, BookOpen, X, Mic, Square, Sparkles, ArrowRight,
} from 'lucide-react-native';

import { colors } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';
import { rs, fs } from '../../hooks/useResponsive';
import { useToast } from '../../components/Toast';
import { useSimpleSTT } from '../../hooks/useSimpleSTT';
import { useBreedIntelligence } from '../../hooks/useBreedIntelligence';
import { supabase } from '../../lib/supabase';

interface Props {
  visible: boolean;
  onClose: () => void;
  petId: string;
  petName: string;
}

type Stage = 'menu' | 'capturing' | 'recording' | 'preview' | 'diary' | 'publishing';

interface PendingPost {
  mediaUrl?: string;
  mediaType?: 'photo' | 'video' | 'mixed' | 'none';
  mediaDuration?: number;
  diaryEntryId?: string;
  rawText: string;
}

export function CreateBreedPostSheet({ visible, onClose, petId, petName }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { createPost, isPosting } = useBreedIntelligence(petId);

  const [stage, setStage] = useState<Stage>('menu');
  const [pending, setPending] = useState<PendingPost>({ rawText: '' });
  const [diaryEntries, setDiaryEntries] = useState<Array<{ id: string; content: string; created_at: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const pulse = React.useRef(new Animated.Value(1)).current;

  const { isListening, isAvailable, toggle, stop } = useSimpleSTT({
    onTranscript: (text, isFinal) => {
      if (!isFinal) return;
      const cleaned = text.trim();
      if (!cleaned) return;
      setPending(p => ({ ...p, rawText: `${p.rawText} ${cleaned}`.trim() }));
    },
    onError: (msg) => toast(msg, 'warning'),
  });

  // Pulse animation while recording
  React.useEffect(() => {
    if (isListening) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.15, duration: 600, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
  }, [isListening, pulse]);

  const reset = useCallback(() => {
    stop();
    setStage('menu');
    setPending({ rawText: '' });
  }, [stop]);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  // ── Upload media to storage ────────────────────────────────────────────
  // Path obrigatório: ${userId}/<...> — a policy `pet_photos_insert` exige
  // que o primeiro folder do storage path seja igual a auth.uid().
  // Por isso prefixamos com userId, depois `breed-posts/{petId}/...`.
  const uploadMedia = useCallback(async (uri: string, kind: 'photo' | 'video'): Promise<string | null> => {
    const _t = Date.now();
    try {
      setUploading(true);
      // Pega user_id atual — policy do bucket exige que primeiro folder seja auth.uid()
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) {
        console.warn('[CreateBreedPostSheet][upload] no user', authErr?.message);
        toast(t('errors.sessionExpired'), 'error');
        return null;
      }

      const ext = kind === 'video' ? 'mp4' : 'webp';
      const filename = `${user.id}/breed-posts/${petId}/${Date.now()}.${ext}`;
      console.log('[CreateBreedPostSheet][upload] start', {
        kind, uri: uri.slice(0, 60), filename, userId: user.id.slice(0, 8),
      });

      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      console.log('[CreateBreedPostSheet][upload] read base64', { bytes: base64.length });

      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      console.log('[CreateBreedPostSheet][upload] decoded bytes', { byteLength: bytes.byteLength });

      const { error } = await supabase.storage.from('pet-photos').upload(filename, bytes, {
        contentType: kind === 'video' ? 'video/mp4' : 'image/webp',
        upsert: false,
      });
      if (error) {
        console.warn('[CreateBreedPostSheet][upload] supabase error', {
          name: (error as { name?: string }).name,
          message: error.message,
          status: (error as { status?: number }).status,
          statusCode: (error as { statusCode?: string }).statusCode,
        });
        throw error;
      }

      const { data: pub } = supabase.storage.from('pet-photos').getPublicUrl(filename);
      console.log('[CreateBreedPostSheet][upload] success', {
        ms: Date.now() - _t, publicUrl: pub.publicUrl.slice(0, 80),
      });
      return pub.publicUrl;
    } catch (e) {
      const err = e as { message?: string; name?: string };
      console.warn('[CreateBreedPostSheet][upload] failed', {
        ms: Date.now() - _t,
        name: err?.name ?? 'unknown',
        message: err?.message ?? String(e),
      });
      toast(t('breedIntel.uploadFailed'), 'error');
      return null;
    } finally {
      setUploading(false);
    }
  }, [petId, toast, t]);

  // ── Camera / Gallery handlers ──────────────────────────────────────────
  const pickFromCamera = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { toast(t('toast.cameraPermission'), 'warning'); return; }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: false,
      quality: 0.7,
      videoMaxDuration: 60,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const kind: 'photo' | 'video' = asset.type === 'video' ? 'video' : 'photo';
    const url = await uploadMedia(asset.uri, kind);
    if (!url) return;
    setPending({
      mediaUrl: url,
      mediaType: kind,
      mediaDuration: asset.duration ? Math.round(asset.duration / 1000) : undefined,
      rawText: '',
    });
    setStage('recording');
    setTimeout(() => toggle(), 300);
  }, [toggle, toast, t, uploadMedia]);

  const pickFromGallery = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: false,
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const kind: 'photo' | 'video' = asset.type === 'video' ? 'video' : 'photo';
    const url = await uploadMedia(asset.uri, kind);
    if (!url) return;
    setPending({
      mediaUrl: url,
      mediaType: kind,
      mediaDuration: asset.duration ? Math.round(asset.duration / 1000) : undefined,
      rawText: '',
    });
    setStage('recording');
    setTimeout(() => toggle(), 300);
  }, [toggle, uploadMedia]);

  // ── Diary picker ───────────────────────────────────────────────────────
  const openDiaryPicker = useCallback(async () => {
    setStage('diary');
    const { data } = await supabase
      .from('diary_entries')
      .select('id, content, created_at')
      .eq('pet_id', petId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(10);
    setDiaryEntries((data ?? []).map(d => ({
      id: d.id,
      content: String(d.content ?? '').slice(0, 200),
      created_at: d.created_at,
    })));
  }, [petId]);

  const pickDiaryEntry = useCallback((entry: { id: string; content: string }) => {
    setPending({ rawText: entry.content, diaryEntryId: entry.id });
    setStage('preview');
  }, []);

  // ── Publicar ───────────────────────────────────────────────────────────
  const publish = useCallback(async () => {
    if (!pending.rawText.trim() && !pending.mediaUrl) {
      toast(t('breedIntel.speakHint'), 'warning');
      return;
    }
    stop();
    setStage('publishing');
    try {
      const result = await createPost({
        tutorRawText: pending.rawText,
        mediaUrls: pending.mediaUrl ? [pending.mediaUrl] : [],
        mediaType: pending.mediaType ?? 'none',
        mediaDuration: pending.mediaDuration,
        fromDiaryEntryId: pending.diaryEntryId,
      });
      const r = result as { approved: boolean; rejection_reason?: string };
      if (r.approved) {
        toast(t('breedIntel.postPublished'), 'success');
      } else {
        toast(r.rejection_reason ?? t('breedIntel.postRejected'), 'warning');
      }
      handleClose();
    } catch (e) {
      console.warn('[CreateBreedPostSheet] publish failed:', e);
      toast(String(e), 'error');
      setStage('preview');
    }
  }, [pending, createPost, toast, t, handleClose, stop]);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={s.backdrop} onPress={handleClose}>
        <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={s.handle} />
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>{t('breedIntel.createPost')}</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={12}>
              <X size={rs(22)} color={colors.click} strokeWidth={1.8} />
            </TouchableOpacity>
          </View>

          {/* Stage: menu */}
          {stage === 'menu' && (
            <View style={s.menuList}>
              <MenuOption
                icon={<Camera size={rs(22)} color={colors.click} strokeWidth={1.8} />}
                label={t('breedIntel.fromCamera')}
                onPress={pickFromCamera}
              />
              <MenuOption
                icon={<ImageIcon size={rs(22)} color={colors.click} strokeWidth={1.8} />}
                label={t('breedIntel.fromGallery')}
                onPress={pickFromGallery}
              />
              <MenuOption
                icon={<BookOpen size={rs(22)} color={colors.click} strokeWidth={1.8} />}
                label={t('breedIntel.fromDiary')}
                onPress={openDiaryPicker}
              />
              {uploading && (
                <View style={s.uploadingBox}>
                  <ActivityIndicator size="small" color={colors.click} />
                  <Text style={s.uploadingTxt}>...</Text>
                </View>
              )}
            </View>
          )}

          {/* Stage: recording — TextInput editável + mic em paralelo */}
          {stage === 'recording' && (
            <View style={s.recordingBox}>
              {pending.mediaUrl && pending.mediaType === 'photo' && (
                <Image source={{ uri: pending.mediaUrl }} style={s.previewMedia} />
              )}
              <Text style={s.recordPrompt}>{t('breedIntel.speakNow', { petName })}</Text>

              {/* Caixa de texto editável — pode digitar OU usar o mic abaixo. */}
              <View style={s.textInputWrap}>
                <TextInput
                  style={s.textInput}
                  value={pending.rawText}
                  onChangeText={(txt) => setPending(p => ({ ...p, rawText: txt }))}
                  placeholder={t('breedIntel.speakNow', { petName })}
                  placeholderTextColor={colors.textGhost}
                  multiline
                  textAlignVertical="top"
                  editable={!isListening}
                />
              </View>

              <Animated.View style={{ transform: [{ scale: pulse }] }}>
                <TouchableOpacity
                  style={[s.micBtn, isListening && s.micBtnActive]}
                  onPress={toggle}
                  disabled={!isAvailable}
                  activeOpacity={0.85}
                >
                  {isListening
                    ? <Square size={rs(28)} color="#fff" strokeWidth={2} fill="#fff" />
                    : <Mic size={rs(30)} color="#fff" strokeWidth={2} />}
                </TouchableOpacity>
              </Animated.View>
              <Text style={s.micHint}>
                {isListening ? t('breedIntel.speakHint') : t('agentVoiceInput.startListening')}
              </Text>

              {/* Habilita avançar se tem texto OU mídia (a EF aceita media-only). */}
              <TouchableOpacity
                style={[
                  s.publishBtn,
                  !pending.rawText.trim() && !pending.mediaUrl && s.publishBtnDisabled,
                ]}
                onPress={() => { stop(); setStage('preview'); }}
                disabled={!pending.rawText.trim() && !pending.mediaUrl}
                activeOpacity={0.85}
              >
                <Text style={s.publishBtnTxt}>{t('breedIntel.viewMore')}</Text>
                <ArrowRight size={rs(18)} color="#fff" strokeWidth={2} />
              </TouchableOpacity>
            </View>
          )}

          {/* Stage: diary picker */}
          {stage === 'diary' && (
            <ScrollView style={{ maxHeight: rs(400) }}>
              {diaryEntries.length === 0 && (
                <View style={s.emptyBox}>
                  <Text style={s.emptyTxt}>—</Text>
                </View>
              )}
              {diaryEntries.map((d) => (
                <TouchableOpacity
                  key={d.id}
                  style={s.diaryRow}
                  onPress={() => pickDiaryEntry(d)}
                  activeOpacity={0.7}
                >
                  <Text style={s.diaryDate}>{new Date(d.created_at).toLocaleDateString()}</Text>
                  <Text style={s.diaryContent} numberOfLines={3}>{d.content}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Stage: preview */}
          {stage === 'preview' && (
            <View style={s.previewBox}>
              {pending.mediaUrl && pending.mediaType === 'photo' && (
                <Image source={{ uri: pending.mediaUrl }} style={s.previewMedia} />
              )}
              <Text style={s.previewLabel}>{t('breedIntel.speakNow', { petName })}</Text>
              <View style={s.transcriptBox}>
                <Text style={s.transcriptTxt}>{pending.rawText || '—'}</Text>
              </View>
              <View style={s.actionsRow}>
                <TouchableOpacity
                  style={s.editBtn}
                  onPress={() => setStage('recording')}
                  activeOpacity={0.7}
                >
                  <Text style={s.editBtnTxt}>{t('breedIntel.edit')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.publishBtn}
                  onPress={publish}
                  disabled={isPosting}
                  activeOpacity={0.85}
                >
                  {isPosting
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Sparkles size={rs(18)} color="#fff" strokeWidth={2} />}
                  <Text style={s.publishBtnTxt}>{t('breedIntel.publish')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Stage: publishing */}
          {stage === 'publishing' && (
            <View style={s.publishingBox}>
              <ActivityIndicator size="large" color={colors.click} />
              <Text style={s.publishingTxt}>{t('breedIntel.commentPending')}</Text>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function MenuOption({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.menuRow} onPress={onPress} activeOpacity={0.7}>
      <View style={s.menuIcon}>{icon}</View>
      <Text style={s.menuLabel}>{label}</Text>
      <ArrowRight size={rs(18)} color={colors.textDim} strokeWidth={1.8} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(11,18,25,0.6)',
  },
  sheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radii.modal, borderTopRightRadius: radii.modal,
    padding: spacing.md, minHeight: rs(360),
  },
  handle: {
    width: rs(40), height: rs(5), borderRadius: 3,
    backgroundColor: colors.textGhost,
    alignSelf: 'center', marginBottom: rs(12),
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: rs(16),
  },
  sheetTitle: { color: colors.text, fontSize: fs(16), fontWeight: '700' },

  menuList: { gap: rs(10) },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: rs(12),
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.lg, paddingVertical: rs(14), paddingHorizontal: rs(14),
  },
  menuIcon: {
    width: rs(40), height: rs(40), borderRadius: rs(20),
    backgroundColor: colors.clickSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { flex: 1, color: colors.text, fontSize: fs(14), fontWeight: '600' },

  uploadingBox: { flexDirection: 'row', alignItems: 'center', gap: rs(8), paddingVertical: rs(12), justifyContent: 'center' },
  uploadingTxt: { color: colors.textSec, fontSize: fs(12) },

  recordingBox: { alignItems: 'center', gap: rs(14), paddingVertical: rs(14) },
  recordPrompt: { color: colors.text, fontSize: fs(14), fontWeight: '600', textAlign: 'center' },
  micBtn: {
    width: rs(96), height: rs(96), borderRadius: rs(48),
    backgroundColor: colors.click,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.click, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  micBtnActive: { backgroundColor: colors.danger },
  micHint: { color: colors.textSec, fontSize: fs(11), fontStyle: 'italic' },

  transcriptBox: {
    width: '100%', backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg,
    padding: rs(12), minHeight: rs(60),
  },
  transcriptTxt: { color: colors.text, fontSize: fs(13), lineHeight: fs(20) },

  // Caixa de texto editável — usada na stage 'recording'.
  textInputWrap: {
    width: '100%', backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg,
    paddingHorizontal: rs(12), paddingVertical: rs(8),
  },
  textInput: {
    color: colors.text,
    fontSize: fs(14),
    lineHeight: fs(21),
    minHeight: rs(72),
    maxHeight: rs(160),
    fontFamily: 'Sora_400Regular',
  },

  publishBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: rs(8), backgroundColor: colors.click,
    paddingVertical: rs(14), paddingHorizontal: rs(20),
    borderRadius: radii.lg, marginTop: rs(8),
  },
  publishBtnDisabled: { opacity: 0.5 },
  publishBtnTxt: { color: '#fff', fontSize: fs(14), fontWeight: '700' },

  editBtn: {
    paddingVertical: rs(12), paddingHorizontal: rs(20),
    borderWidth: 1.5, borderColor: colors.border, borderRadius: radii.lg,
  },
  editBtnTxt: { color: colors.textSec, fontSize: fs(13), fontWeight: '700' },

  diaryRow: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.lg, padding: rs(12), marginBottom: rs(8),
  },
  diaryDate: { color: colors.textDim, fontSize: fs(11), marginBottom: rs(4) },
  diaryContent: { color: colors.text, fontSize: fs(13), lineHeight: fs(19) },

  previewBox: { gap: rs(12), paddingVertical: rs(8) },
  previewLabel: { color: colors.textSec, fontSize: fs(11), fontWeight: '700', textTransform: 'uppercase' },
  previewMedia: { width: '100%', aspectRatio: 16 / 9, borderRadius: radii.lg, backgroundColor: colors.bg },
  actionsRow: { flexDirection: 'row', gap: rs(10), justifyContent: 'flex-end' },

  publishingBox: { alignItems: 'center', gap: rs(12), paddingVertical: rs(40) },
  publishingTxt: { color: colors.textSec, fontSize: fs(13) },

  emptyBox: { alignItems: 'center', padding: rs(24) },
  emptyTxt: { color: colors.textDim, fontSize: fs(13) },
});
