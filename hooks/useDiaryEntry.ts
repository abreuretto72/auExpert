/**
 * useDiaryEntry — Hook único de entrada para o diário (novo conceito).
 *
 * Substitui o fluxo antigo (input → mood → processing → preview → publish)
 * por: input → classify (1 chamada IA) → preview com cards de sugestão → save.
 *
 * A IA classifica, narra em 3ª pessoa, detecta humor e sugere módulos.
 */
import { useMutation, useQueryClient, onlineManager } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { classifyDiaryEntry } from '../lib/ai';
import type { ClassifyDiaryResponse } from '../lib/ai';
import * as api from '../lib/api';
import { generateEmbedding } from '../lib/rag';
import { addToQueue } from '../lib/offlineQueue';
import { supabase } from '../lib/supabase';
import { scheduleAgendaReminders } from '../lib/notifications';
import type { DiaryEntry } from '../types/database';
import i18n from '../i18n';

// ── createFutureEvent — creates a scheduled_event for a future appointment ──

async function createFutureEvent(
  petId: string,
  userId: string,
  diaryEntryId: string,
  eventType: string,
  title: string,
  scheduledFor: string,
  allDay: boolean,
  professional: string | null,
  location: string | null,
): Promise<void> {
  const date = new Date(scheduledFor);
  if (isNaN(date.getTime()) || date.getTime() <= Date.now()) return;

  const { data, error } = await supabase.from('scheduled_events').insert({
    pet_id:        petId,
    user_id:       userId,
    diary_entry_id: diaryEntryId,
    event_type:    eventType,
    title,
    professional,
    location,
    scheduled_for: date.toISOString(),
    all_day:       allDay,
    status:        'scheduled',
    source:        'ai',
    is_active:     true,
  }).select('id, title, scheduled_for, all_day').single();

  if (!error && data) {
    const sub = [professional, location].filter(Boolean).join(' · ');
    scheduleAgendaReminders(
      { id: data.id, title: data.title, scheduled_for: data.scheduled_for, all_day: data.all_day, sub },
      '',  // petName not available here — notification body will still work
    ).catch(() => {});
  }
}

// ── saveToModule — writes classified data to correct health table ──────────

async function saveToModule(
  petId: string,
  userId: string,
  diaryEntryId: string,
  classification: ClassifyDiaryResponse,
): Promise<void> {
  const primaryType = classification.primary_type;
  const extracted = classification.classifications?.[0]?.extracted_data ?? {};

  const linkedField: Record<string, string | undefined> = {};

  if (primaryType === 'vaccine') {
    const { data } = await supabase.from('vaccines').insert({
      pet_id: petId,
      user_id: userId,
      name: (extracted.vaccine_name as string) ?? 'Vacina',
      lab: (extracted.laboratory as string) ?? null,
      lot_number: (extracted.batch as string) ?? null,
      date_administered: (extracted.date as string) ?? new Date().toISOString().split('T')[0],
      next_due_date: (extracted.next_due as string) ?? null,
      veterinarian: (extracted.vet_name as string) ?? null,
      clinic: (extracted.clinic as string) ?? null,
      source: 'ai',
    }).select('id').single();
    if (data?.id) {
      linkedField.linked_vaccine_id = data.id;
      // Schedule reminder for next vaccine dose if AI detected a future date
      const nextDue = extracted.next_due as string | undefined;
      if (nextDue) {
        createFutureEvent(
          petId, userId, diaryEntryId, 'vaccine',
          `Revacinação ${extracted.vaccine_name ?? ''}`.trim(),
          nextDue, true,
          (extracted.vet_name as string) ?? null,
          (extracted.clinic as string) ?? null,
        ).catch(() => {});
      }
    }

  } else if (primaryType === 'consultation') {
    const { data } = await supabase.from('consultations').insert({
      pet_id: petId,
      user_id: userId,
      date: (extracted.date as string) ?? new Date().toISOString().split('T')[0],
      vet_name: (extracted.vet_name as string) ?? null,
      clinic_name: (extracted.clinic as string) ?? null,
      summary: (extracted.diagnosis as string) ?? classification.narration ?? 'Consulta',
      diagnosis: (extracted.diagnosis as string) ?? null,
      prescriptions: (extracted.prescriptions as string) ?? null,
      source: 'ai',
    }).select('id').single();
    if (data?.id) {
      linkedField.linked_consultation_id = data.id;
      // Schedule reminder for return visit if AI detected a future date
      const returnDate = extracted.return_date as string | undefined;
      if (returnDate) {
        createFutureEvent(
          petId, userId, diaryEntryId, 'return_visit',
          `Retorno${extracted.vet_name ? ` · ${extracted.vet_name}` : ''}`,
          returnDate, false,
          (extracted.vet_name as string) ?? null,
          (extracted.clinic as string) ?? null,
        ).catch(() => {});
      }
    }

  } else if (primaryType === 'medication') {
    const { data } = await supabase.from('medications').insert({
      pet_id: petId,
      user_id: userId,
      name: (extracted.medication_name as string) ?? 'Medicamento',
      dosage: (extracted.dosage as string) ?? null,
      frequency: (extracted.frequency as string) ?? 'conforme prescrito',
      start_date: (extracted.date as string) ?? new Date().toISOString().split('T')[0],
      end_date: (extracted.end_date as string) ?? null,
      prescribed_by: (extracted.vet_name as string) ?? null,
      source: 'ai',
    }).select('id').single();
    if (data?.id) {
      linkedField.linked_medication_id = data.id;
      // Schedule reminder if medication has a known end date
      const endDate = extracted.end_date as string | undefined;
      if (endDate) {
        createFutureEvent(
          petId, userId, diaryEntryId, 'medication_series',
          `Fim do ${extracted.medication_name ?? 'medicamento'}`,
          endDate, true, null, null,
        ).catch(() => {});
      }
    }

  } else if (primaryType === 'exam') {
    const { data } = await supabase.from('exams').insert({
      pet_id: petId,
      user_id: userId,
      name: (extracted.exam_name as string) ?? 'Exame',
      date: (extracted.date as string) ?? new Date().toISOString().split('T')[0],
      laboratory: (extracted.lab_name as string) ?? null,
      veterinarian: (extracted.vet_name as string) ?? null,
      results: (extracted.results as unknown[]) ?? [],
      source: 'ai',
    }).select('id').single();
    if (data?.id) {
      linkedField.linked_exam_id = data.id;
      // Schedule reminder for the exam if it's in the future
      const examDate = extracted.date as string | undefined;
      if (examDate && new Date(examDate).getTime() > Date.now()) {
        createFutureEvent(
          petId, userId, diaryEntryId, 'exam',
          extracted.exam_name as string ?? 'Exame',
          examDate, false,
          (extracted.vet_name as string) ?? null,
          (extracted.lab_name as string) ?? null,
        ).catch(() => {});
      }
    }

    // Extract clinical metrics from exam results (non-blocking)
    const results = (extracted.results as Array<{ item: string; value: number; unit: string; status: string }>) ?? [];
    if (results.length > 0) {
      const metricsRows = results
        .filter((r) => r.value != null)
        .map((r) => ({
          pet_id: petId,
          user_id: userId,
          diary_entry_id: diaryEntryId,
          metric_type: r.item?.toLowerCase().replace(/\s+/g, '_') ?? 'unknown',
          value: r.value,
          unit: r.unit ?? '',
          status: r.status ?? 'normal',
          source: 'ai' as const,
          measured_at: new Date().toISOString(),
        }));
      await supabase.from('clinical_metrics').insert(metricsRows).throwOnError();
    }

  } else if (primaryType === 'expense') {
    const items = (extracted.items as Array<{ name: string; qty: number; unit_price: number }>) ?? [];
    const total = (extracted.total as number) ?? items.reduce((sum, i) => sum + (i.qty ?? 1) * (i.unit_price ?? 0), 0);
    const { data } = await supabase.from('expenses').insert({
      pet_id: petId,
      user_id: userId,
      diary_entry_id: diaryEntryId,
      date: (extracted.date as string) ?? new Date().toISOString().split('T')[0],
      vendor: (extracted.merchant_name as string) ?? null,
      category: (extracted.merchant_type as string) ?? 'other',
      total: Number(total) || 0,
      currency: (extracted.currency as string) ?? 'BRL',
      items: items,
      source: 'ai',
    }).select('id').single();
    if (data?.id) linkedField.linked_expense_id = data.id;

  } else if (primaryType === 'connection') {
    const friendName = (extracted.friend_name as string) ?? null;
    if (friendName) {
      const today = new Date().toISOString().slice(0, 10);
      await supabase.from('pet_connections').insert({
        pet_id: petId,
        user_id: userId,
        diary_entry_id: diaryEntryId,
        friend_name: friendName,
        friend_species: (extracted.friend_species as string) ?? 'unknown',
        friend_breed: (extracted.friend_breed as string) ?? null,
        friend_owner: (extracted.friend_owner as string) ?? null,
        connection_type: (extracted.connection_type as string) ?? 'friend',
        first_met_at: (extracted.date as string) ?? today,
        last_seen_at: (extracted.date as string) ?? today,
        notes: (extracted.notes as string) ?? null,
      }).throwOnError();
    }

  } else if (primaryType === 'food') {
    await supabase.from('nutrition_records').insert({
      pet_id: petId,
      user_id: userId,
      diary_entry_id: diaryEntryId,
      record_type: (extracted.record_type as string) ?? 'food',
      product_name: (extracted.product_name as string) ?? null,
      brand: (extracted.brand as string) ?? null,
      category: (extracted.category as string) ?? null,
      portion_grams: extracted.portion_grams != null ? Number(extracted.portion_grams) : null,
      daily_portions: extracted.daily_portions != null ? Number(extracted.daily_portions) : 1,
      calories_kcal: extracted.calories_kcal != null ? Number(extracted.calories_kcal) : null,
      is_current: (extracted.is_current as boolean) ?? false,
      notes: (extracted.notes as string) ?? null,
      started_at: (extracted.started_at as string) ?? new Date().toISOString().slice(0, 10),
      source: 'ai',
      extracted_data: extracted,
    }).throwOnError();

  } else if (primaryType === 'plan' || primaryType === 'insurance') {
    const provider = (extracted.provider as string) ?? null;
    if (provider) {
      const planType = primaryType === 'insurance' ? 'insurance' : (extracted.plan_type as string) ?? 'health';
      const { data } = await supabase.from('pet_plans').insert({
        pet_id: petId,
        user_id: userId,
        diary_entry_id: diaryEntryId,
        plan_type: ['health', 'insurance', 'funeral', 'assistance', 'emergency'].includes(planType)
          ? planType
          : 'health',
        provider,
        plan_name: (extracted.plan_name as string) ?? null,
        plan_code: (extracted.plan_code as string) ?? null,
        monthly_cost: extracted.monthly_cost != null ? Number(extracted.monthly_cost) : null,
        annual_cost: extracted.annual_cost != null ? Number(extracted.annual_cost) : null,
        coverage_limit: extracted.coverage_limit != null ? Number(extracted.coverage_limit) : null,
        start_date: (extracted.start_date as string) ?? null,
        end_date: (extracted.end_date as string) ?? null,
        renewal_date: (extracted.renewal_date as string) ?? null,
        coverage_items: (extracted.coverage as string[]) ?? [],
        status: 'active',
        extracted_data: extracted,
        source: 'ai',
      }).select('id').single();
      if (data?.id) linkedField.linked_plan_id = data.id;
    }

  } else if (primaryType === 'travel') {
    const destination = (extracted.destination as string) ?? null;
    if (destination) {
      const travelType = extracted.travel_type as string;
      const { data } = await supabase.from('pet_travels').insert({
        pet_id: petId,
        user_id: userId,
        diary_entry_id: diaryEntryId,
        destination,
        country: (extracted.country as string) ?? 'BR',
        region: (extracted.region as string) ?? null,
        travel_type: ['road_trip', 'flight', 'local', 'international', 'camping', 'other'].includes(travelType)
          ? travelType
          : 'road_trip',
        status: 'completed',
        start_date: (extracted.start_date as string) ?? null,
        end_date: (extracted.end_date as string) ?? null,
        distance_km: extracted.distance_km != null ? Number(extracted.distance_km) : null,
        notes: (extracted.notes as string) ?? null,
        tags: (extracted.tags as string[]) ?? [],
        extracted_data: extracted,
        source: 'ai',
      }).select('id').single();
      if (data?.id) linkedField.linked_travel_id = data.id;
    }

  } else if (primaryType === 'weight') {
    const weightVal = extracted.value ?? extracted.weight;
    if (weightVal != null) {
      const { data } = await supabase.from('clinical_metrics').insert({
        pet_id: petId,
        user_id: userId,
        diary_entry_id: diaryEntryId,
        metric_type: 'weight',
        value: Number(weightVal),
        unit: (extracted.unit as string) ?? 'kg',
        status: 'normal',
        source: 'ai',
        measured_at: new Date().toISOString(),
      }).select('id').single();
      if (data?.id) linkedField.linked_weight_metric_id = data.id;
    }
  }

  // Update diary_entry with linked_*_id if any was created
  if (Object.keys(linkedField).length > 0) {
    await supabase.from('diary_entries').update(linkedField).eq('id', diaryEntryId);
  }
}

export interface SubmitEntryParams {
  text: string | null;
  photosBase64: string[] | null; // array of base64 images (gallery = multiple, camera = 1)
  inputType: string; // 'text' | 'voice' | 'photo' | 'gallery'
}

export interface PDFImportParams {
  pdfBase64: string;
  fileName: string;
  additionalText?: string;
}

export function useDiaryEntry(petId: string) {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const queryKey = ['pets', petId, 'diary'] as const;

  // ── PDF classify (separate from step-based flow) ──
  const pdfClassifyMutation = useMutation({
    mutationFn: async (params: PDFImportParams): Promise<ClassifyDiaryResponse> => {
      return classifyDiaryEntry(
        petId,
        params.additionalText ?? null,
        null,
        'pdf_upload',
        i18n.language,
        params.pdfBase64,
      );
    },
  });

  // ── PDF import save (parent + N children) ──
  const pdfSaveMutation = useMutation({
    mutationFn: async (params: {
      pdfResult: ClassifyDiaryResponse;
      selectedClassifications: ClassifyDiaryResponse['classifications'];
      fileName: string;
    }) => {
      const { pdfResult, selectedClassifications, fileName } = params;

      // 1. Save parent entry (the PDF upload itself)
      const parentEntryId = await api.createDiaryEntry({
        pet_id: petId,
        user_id: user!.id,
        content: `PDF: ${fileName}`,
        input_method: 'text',
        mood_id: pdfResult.mood ?? 'calm',
        mood_score: Math.round((pdfResult.mood_confidence ?? 0.5) * 100),
        mood_source: 'ai_suggested' as const,
        tags: ['pdf-import'],
        photos: [],
        is_special: false,
      });

      // Update parent entry with input_type and narration
      const sb = supabase;
      await sb.from('diary_entries').update({
        input_type: 'pdf_upload',
        primary_type: pdfResult.primary_type,
        classifications: pdfResult.classifications,
        narration: pdfResult.narration,
        urgency: 'none',
      }).eq('id', parentEntryId);

      // 2. Save each selected classification as a child diary entry
      const childIds: string[] = [];
      for (const cls of selectedClassifications) {
        const childId = await api.createDiaryEntry({
          pet_id: petId,
          user_id: user!.id,
          content: `${cls.type}: ${JSON.stringify(cls.extracted_data).slice(0, 200)}`,
          input_method: 'text',
          mood_id: 'calm',
          mood_score: 50,
          mood_source: 'ai_suggested' as const,
          tags: ['pdf-import', cls.type],
          photos: [],
          is_special: false,
        });

        // Link to parent and set classification data
        await sb.from('diary_entries').update({
          parent_entry_id: parentEntryId,
          input_type: 'pdf_upload',
          primary_type: cls.type,
          classifications: [cls],
          urgency: 'none',
        }).eq('id', childId);

        childIds.push(childId);

        // Save to health module
        const mockClassification: ClassifyDiaryResponse = {
          ...pdfResult,
          primary_type: cls.type,
          classifications: [cls],
        };
        saveToModule(petId, user!.id, childId, mockClassification).catch(() => {});
      }

      return { parentEntryId, childIds };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: ['pets', petId, 'moods'] });
    },
  });

  // ── Step 1: Classify (send to AI, get classifications + narration) ──
  const classifyMutation = useMutation({
    mutationFn: async (params: SubmitEntryParams): Promise<ClassifyDiaryResponse> => {
      console.log('[useDiaryEntry] classify — input:', params.inputType, 'text_len:', params.text?.length ?? 0, 'photos:', params.photosBase64?.length ?? 0);

      if (!onlineManager.isOnline()) {
        // Offline fallback: return basic classification without AI
        return {
          classifications: [{ type: 'moment', confidence: 1.0, extracted_data: {} }],
          primary_type: 'moment',
          narration: params.text ?? '',
          mood: 'calm',
          mood_confidence: 0.5,
          urgency: 'none',
          clinical_metrics: [],
          suggestions: [],
          tags_suggested: [],
          language: i18n.language,
          tokens_used: 0,
        };
      }

      return classifyDiaryEntry(
        petId,
        params.text,
        params.photosBase64,
        params.inputType,
        i18n.language,
      );
    },
  });

  // ── Step 2: Save entry (after tutor reviews classification) ──
  const saveMutation = useMutation({
    mutationFn: async (params: {
      text: string;
      inputType: string;
      classification: ClassifyDiaryResponse;
      photos?: string[];
      videoUri?: string;
      videoDuration?: number;
      audioUri?: string;
      audioDuration?: number;
    }) => {
      const { text, inputType, classification, photos, videoUri, videoDuration, audioUri, audioDuration } = params;
      console.log('[useDiaryEntry] save — primary:', classification.primary_type, 'mood:', classification.mood);

      const entryData = {
        pet_id: petId,
        user_id: user!.id,
        content: text || '(photo)',
        input_method: (inputType === 'photo' ? 'photo' : inputType === 'voice' ? 'voice' : 'text') as 'voice' | 'photo' | 'text',
        mood_id: classification.mood,
        mood_score: Math.round((classification.mood_confidence ?? 0.5) * 100),
        mood_source: 'ai_suggested' as const,
        tags: classification.tags_suggested ?? [],
        photos: photos ?? [],
        is_special: false,
      };

      if (!onlineManager.isOnline()) {
        await addToQueue({
          type: 'createDiaryEntry',
          payload: entryData as unknown as Record<string, unknown>,
        });
        return {
          id: `temp-${Date.now()}`,
          ...entryData,
          narration: classification.narration,
          entry_type: 'manual' as const,
          input_type: inputType,
          primary_type: classification.primary_type,
          classifications: classification.classifications,
          urgency: classification.urgency,
          entry_date: new Date().toISOString().split('T')[0],
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as DiaryEntry & { primary_type: string; classifications: unknown[]; urgency: string };
      }

      // Create entry via DB function
      const entryId = await api.createDiaryEntry(entryData);

      // Save narration
      if (classification.narration) {
        await api.updateDiaryNarration(
          entryId,
          classification.narration,
          Math.round((classification.mood_confidence ?? 0.5) * 100),
          classification.tags_suggested,
        );
      }

      // Update new diary_entries fields (classifications, primary_type, etc.)
      try {
        const { error } = await (await import('../lib/supabase')).supabase
          .from('diary_entries')
          .update({
            input_type: inputType,
            primary_type: classification.primary_type,
            classifications: classification.classifications,
            mood_confidence: classification.mood_confidence,
            urgency: classification.urgency,
          })
          .eq('id', entryId);
        if (error) console.warn('[useDiaryEntry] Update new fields failed:', error.message);
      } catch {
        // Non-critical — fields may not exist yet
      }

      // Upload video and save video_url / video_duration / video_analysis (non-blocking if fails)
      if (inputType === 'video' && videoUri) {
        try {
          const { uploadPetMedia, getPublicUrl } = await import('../lib/storage');
          const videoPath = await uploadPetMedia(user!.id, petId, videoUri, 'video');
          const videoUrl = getPublicUrl('pet-photos', videoPath);
          await supabase.from('diary_entries').update({
            video_url: videoUrl,
            video_duration: videoDuration ?? null,
            video_analysis: classification.video_analysis ?? null,
          }).eq('id', entryId);
        } catch (err) {
          console.warn('[useDiaryEntry] Video upload failed (non-critical):', err);
        }
      }

      // Upload audio and save audio_url / audio_duration / pet_audio_analysis (non-blocking if fails)
      if (inputType === 'pet_audio' && audioUri) {
        try {
          const { uploadPetMedia, getPublicUrl } = await import('../lib/storage');
          const audioPath = await uploadPetMedia(user!.id, petId, audioUri, 'video'); // reuse video bucket
          const audioUrl = getPublicUrl('pet-photos', audioPath);
          await supabase.from('diary_entries').update({
            audio_url: audioUrl,
            audio_duration: audioDuration ?? null,
            pet_audio_analysis: classification.pet_audio_analysis ?? null,
          }).eq('id', entryId);
        } catch (err) {
          console.warn('[useDiaryEntry] Audio upload failed (non-critical):', err);
        }
      }

      // Generate embedding (non-blocking)
      const embeddingText = classification.narration
        ? `${text}\n\n${classification.narration}`
        : text;
      generateEmbedding(petId, 'diary', entryId, embeddingText, 0.5).catch(() => {});

      // Save to health module if IA classified a health type (non-blocking, best-effort)
      saveToModule(petId, user!.id, entryId, classification).catch((err) =>
        console.warn('[useDiaryEntry] saveToModule failed (non-critical):', err),
      );

      // Check and award achievements (non-blocking, best-effort)
      import('../lib/achievements').then(({ checkAndAwardAchievements }) => {
        checkAndAwardAchievements(petId, user!.id, entryId).catch(() => {});
      }).catch(() => {});

      return {
        id: entryId,
        ...entryData,
        narration: classification.narration,
        entry_type: 'manual' as const,
        input_type: inputType,
        primary_type: classification.primary_type,
        classifications: classification.classifications,
        urgency: classification.urgency,
        entry_date: new Date().toISOString().split('T')[0],
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as DiaryEntry & { primary_type: string; classifications: unknown[]; urgency: string };
    },
    onSuccess: (newEntry) => {
      // Optimistic cache update
      qc.setQueryData<DiaryEntry[]>(queryKey, (old) =>
        old ? [newEntry as DiaryEntry, ...old] : [newEntry as DiaryEntry],
      );
      qc.invalidateQueries({ queryKey: ['pets', petId, 'moods'] });
      qc.invalidateQueries({ queryKey: ['pets', petId, 'lens', 'achievements'] });
      qc.invalidateQueries({ queryKey: ['pets', petId, 'lens', 'travels'] });
      qc.invalidateQueries({ queryKey: ['pets', petId, 'lens', 'mood_trend'] });
      qc.invalidateQueries({ queryKey: ['pets', petId, 'lens', 'agenda'] });
      qc.invalidateQueries({ queryKey: ['pets', petId, 'scheduled_events'] });
    },
  });

  return {
    // Step 1: classify
    classify: classifyMutation.mutateAsync,
    isClassifying: classifyMutation.isPending,
    classificationResult: classifyMutation.data ?? null,
    classificationError: classifyMutation.error,

    // Step 2: save
    saveEntry: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,

    // PDF import
    classifyPDF: pdfClassifyMutation.mutateAsync,
    isClassifyingPDF: pdfClassifyMutation.isPending,
    pdfResult: pdfClassifyMutation.data ?? null,
    savePDFImport: pdfSaveMutation.mutateAsync,
    isSavingPDF: pdfSaveMutation.isPending,

    // Reset
    reset: () => {
      classifyMutation.reset();
      saveMutation.reset();
      pdfClassifyMutation.reset();
      pdfSaveMutation.reset();
    },
  };
}
