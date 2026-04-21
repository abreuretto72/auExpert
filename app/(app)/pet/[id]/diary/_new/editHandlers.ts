/**
 * Edit-mode + back-navigation handlers — extracted verbatim from
 * app/(app)/pet/[id]/diary/new.tsx.
 *
 * Move-only extraction. Same bodies, same try/catch patterns, same
 * confirm() copy, same ordering of stopListening → setStep/router.back,
 * same AsyncStorage.removeItem(draftKey) placement, same deps arrays.
 *
 * Exposes `useEditHandlers(params)` — custom hook that returns
 * handleSaveEdit, handleDelete, handleBack.
 */
import { useCallback, type Dispatch, type SetStateAction } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getErrorMessage } from '../../../../../../utils/errorMessages';
import { PREVIEW_STEPS, type Step } from './types';

type ToastType = 'success' | 'error' | 'warning' | 'info';

type UseEditHandlersParams = {
  edit: string | undefined;
  tutorText: string;
  step: Step;
  draftKey: string;
  updateEntry: (params: { id: string; content?: string }) => Promise<unknown>;
  deleteEntry: (entryId: string) => Promise<unknown>;
  stopListening: () => void;
  setStep: Dispatch<SetStateAction<Step>>;
  router: { back: () => void };
  toast: (msg: string, type?: ToastType) => void;
  confirm: (options: {
    text: string;
    type?: ToastType;
    yesLabel?: string;
    noLabel?: string;
  }) => Promise<boolean>;
  t: (key: string, options?: Record<string, unknown>) => string;
};

export function useEditHandlers({
  edit,
  tutorText,
  step,
  draftKey,
  updateEntry,
  deleteEntry,
  stopListening,
  setStep,
  router,
  toast,
  confirm,
  t,
}: UseEditHandlersParams) {
  const handleSaveEdit = useCallback(async () => {
    if (!edit) return;
    const text = tutorText.trim();
    if (text.length < 3) {
      toast(t('diary.contentMin'), 'warning');
      return;
    }
    try {
      await updateEntry({ id: edit, content: text });
      toast(t('diary.updated'), 'success');
      router.back();
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    }
  }, [edit, tutorText, updateEntry, toast, t, router]);

  const handleDelete = useCallback(async () => {
    if (!edit) return;
    const yes = await confirm({ text: t('diary.deleteConfirmDiary'), type: 'warning' });
    if (!yes) return;
    try {
      await deleteEntry(edit);
      toast(t('diary.deleted'), 'success');
      router.back();
    } catch {
      toast(t('diary.deleteFailed'), 'error');
    }
  }, [edit, deleteEntry, confirm, toast, t, router]);

  // ── Back navigation ───────────────────────────────────────────────────────

  const handleBack = useCallback(async () => {
    if (PREVIEW_STEPS.includes(step)) {
      const discard = await confirm({ text: t('diary.discardCapture'), type: 'warning' });
      if (!discard) return;
    }
    stopListening();
    if (step !== 'mic') {
      setStep('mic');
    } else {
      void AsyncStorage.removeItem(draftKey);
      router.back();
    }
  }, [step, confirm, t, stopListening, draftKey, router]);

  return { handleSaveEdit, handleDelete, handleBack };
}
