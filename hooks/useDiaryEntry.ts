/**
 * useDiaryEntry — Hook único de entrada para o diário (novo conceito).
 *
 * Substitui o fluxo antigo (input → mood → processing → preview → publish)
 * por: input → classify (1 chamada IA) → preview com cards de sugestão → save.
 *
 * A IA classifica, narra em 3ª pessoa, detecta humor e sugere módulos.
 */
import React from 'react';
import { useMutation, useQueryClient, onlineManager } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { classifyDiaryEntry } from '../lib/ai';
import type { ClassifyDiaryResponse } from '../lib/ai';
import * as api from '../lib/api';
import { generateEmbedding, updatePetRAG } from '../lib/rag';
import { addToQueue } from '../lib/offlineQueue';
import { savePendingEntry, updatePendingStatus, cacheEntry } from '../lib/localDb';
import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
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

// ── saveToModule — writes ALL classified items to their correct health tables ─
// Iterates every classification (not just primaryType) so a single diary entry
// that mentions a vaccine + consultation + weight all get saved correctly.

async function saveToModule(
  petId: string,
  userId: string,
  diaryEntryId: string,
  classification: ClassifyDiaryResponse,
): Promise<void> {
  const classifications = classification.classifications ?? [];
  console.log('[MOD] saveToModule | classifications:', classifications.length);
  classifications.forEach((c: {type: string; confidence: number}, i: number) => console.log(`[MOD] cls[${i}]: ${c.type} (${c.confidence})`));
  if (classifications.length === 0) return;

  const today = new Date().toISOString().slice(0, 10);
  const linkedField: Record<string, string | undefined> = {};

  for (const cls of classifications) {
    const extracted = (cls.extracted_data ?? {}) as Record<string, unknown>;

    try {
      switch (cls.type) {

        case 'vaccine': {
          const { data, error: vaccErr } = await supabase.from('vaccines').insert({
            pet_id:           petId,
            user_id:          userId,
            name:             (extracted.vaccine_name as string) ?? (extracted.vaccine_type as string) ?? i18n.t('ai.default.vaccine'),
            laboratory:       (extracted.laboratory as string) ?? null,
            batch_number:     (extracted.batch_number as string) ?? (extracted.batch as string) ?? null,
            date_administered:(extracted.date as string) ?? today,
            next_due_date:    (extracted.next_due as string) ?? null,
            veterinarian:     (extracted.veterinarian as string) ?? (extracted.vet_name as string) ?? null,
            clinic:           (extracted.clinic as string) ?? null,
            status:           'up_to_date',
            source:           'ai',
          }).select('id').single();
          console.log('[MOD] vacina salva:', data?.id?.slice(-8), '| erro:', vaccErr?.message);
          if (data?.id) {
            linkedField.linked_vaccine_id = data.id;
            const nextDue = extracted.next_due as string | undefined;
            if (nextDue) {
              const vaccineNameSuffix = extracted.vaccine_name ? ` ${extracted.vaccine_name}` : '';
              createFutureEvent(
                petId, userId, diaryEntryId, 'vaccine',
                `${i18n.t('ai.event.revaccination')}${vaccineNameSuffix}`.trim(),
                nextDue, true,
                (extracted.veterinarian as string) ?? (extracted.vet_name as string) ?? null,
                (extracted.clinic as string) ?? null,
              ).catch(() => {});
            }
          }
          break;
        }

        case 'consultation':
        case 'return_visit': {
          const { data, error: consErr } = await supabase.from('consultations').insert({
            pet_id:      petId,
            user_id:     userId,
            date:        (extracted.date as string) ?? today,
            veterinarian:(extracted.veterinarian as string) ?? (extracted.vet_name as string) ?? i18n.t('ai.default.veterinarian'),
            clinic:      (extracted.clinic as string) ?? (extracted.clinic_name as string) ?? null,
            type:        'checkup',
            summary:     (extracted.diagnosis as string) ?? (extracted.summary as string) ?? classification.narration ?? i18n.t('ai.expense.consultation'),
            diagnosis:   (extracted.diagnosis as string) ?? null,
            prescriptions:(extracted.prescriptions as string) ?? null,
            follow_up_at:(extracted.return_date as string) ?? null,
            source:      'ai',
          }).select('id').single();
          console.log('[MOD] consulta salva:', data?.id?.slice(-8), '| erro:', consErr?.message);
          if (data?.id) {
            linkedField.linked_consultation_id = data.id;
            const returnDate = extracted.return_date as string | undefined;
            if (returnDate) {
              const vetName = (extracted.veterinarian as string) ?? (extracted.vet_name as string);
              createFutureEvent(
                petId, userId, diaryEntryId, 'return_visit',
                vetName ? `${i18n.t('ai.event.returnVisit')} · ${vetName}` : i18n.t('ai.event.returnVisit'),
                returnDate, false,
                vetName ?? null,
                (extracted.clinic as string) ?? null,
              ).catch(() => {});
            }
          }
          break;
        }

        case 'medication': {
          const { data } = await supabase.from('medications').insert({
            pet_id:       petId,
            user_id:      userId,
            name:         (extracted.medication_name as string) ?? i18n.t('ai.default.medication'),
            dosage:       (extracted.dosage as string) ?? null,
            frequency:    (extracted.frequency as string) ?? i18n.t('ai.expense.medicationFrequency'),
            start_date:   (extracted.date as string) ?? today,
            end_date:     (extracted.end_date as string) ?? null,
            prescribed_by:(extracted.veterinarian as string) ?? (extracted.vet_name as string) ?? null,
            source:       'ai',
          }).select('id').single();
          if (data?.id) {
            linkedField.linked_medication_id = data.id;
            const endDate = extracted.end_date as string | undefined;
            if (endDate) {
              createFutureEvent(
                petId, userId, diaryEntryId, 'medication_series',
                i18n.t('ai.event.medicationEnd'),
                endDate, true, null, null,
              ).catch(() => {});
            }
          }
          break;
        }

        case 'exam': {
          const { data } = await supabase.from('exams').insert({
            pet_id:      petId,
            user_id:     userId,
            name:        (extracted.exam_name as string) ?? i18n.t('ai.default.exam'),
            date:        (extracted.date as string) ?? today,
            laboratory:  (extracted.laboratory as string) ?? (extracted.lab_name as string) ?? null,
            veterinarian:(extracted.veterinarian as string) ?? (extracted.vet_name as string) ?? null,
            results:     (extracted.results as unknown[]) ?? [],
            source:      'ai',
          }).select('id').single();
          if (data?.id) {
            linkedField.linked_exam_id = data.id;
            const examDate = extracted.date as string | undefined;
            if (examDate && new Date(examDate).getTime() > Date.now()) {
              createFutureEvent(
                petId, userId, diaryEntryId, 'exam',
                (extracted.exam_name as string) ?? i18n.t('ai.default.exam'),
                examDate, false,
                (extracted.veterinarian as string) ?? (extracted.vet_name as string) ?? null,
                (extracted.laboratory as string) ?? (extracted.lab_name as string) ?? null,
              ).catch(() => {});
            }
          }
          // Extract clinical metrics from exam results
          const results = (extracted.results as Array<{ item: string; value: number; unit: string; status: string }>) ?? [];
          if (results.length > 0) {
            const metricsRows = results
              .filter((r) => r.value != null)
              .map((r) => ({
                pet_id:        petId,
                user_id:       userId,
                diary_entry_id:diaryEntryId,
                metric_type:   r.item?.toLowerCase().replace(/\s+/g, '_') ?? 'unknown',
                value:         r.value,
                unit:          r.unit ?? '',
                status:        r.status ?? 'normal',
                source:        'ai' as const,
                measured_at:   new Date().toISOString(),
              }));
            await supabase.from('clinical_metrics').insert(metricsRows);
          }
          break;
        }

        case 'expense': {
          const items = (extracted.items as Array<{ name: string; qty: number; unit_price: number }>) ?? [];
          const totalRaw = (extracted.amount as number) ?? (extracted.total as number);
          const total = totalRaw ?? items.reduce((sum, i) => sum + (i.qty ?? 1) * (i.unit_price ?? 0), 0);
          const VALID_EXPENSE_CATEGORIES = [
            'saude', 'alimentacao', 'higiene', 'hospedagem', 'cuidados', 'treinamento',
            'acessorios', 'tecnologia', 'plano', 'funerario', 'emergencia', 'lazer',
            'documentacao', 'esporte', 'memorial', 'logistica', 'digital', 'outros',
          ];
          // Normalize synonyms the classifier may return (especially older model versions)
          const CATEGORY_ALIASES: Record<string, string> = {
            // Health
            veterinario: 'saude', veterinary: 'saude', health: 'saude', medical: 'saude',
            vet: 'saude', consulta: 'saude', vacina: 'saude', exame: 'saude',
            // Food
            food: 'alimentacao', nutrition: 'alimentacao', racao: 'alimentacao',
            ração: 'alimentacao', petisco: 'alimentacao', petiscos: 'alimentacao',
            alimentação: 'alimentacao', alimento: 'alimentacao', alimentos: 'alimentacao',
            // Hygiene
            grooming: 'higiene', banho: 'higiene', tosa: 'higiene',
            // Boarding
            boarding: 'hospedagem', hotel: 'hospedagem', hospedagem: 'hospedagem',
            // Care
            walker: 'cuidados', sitter: 'cuidados', caretaker: 'cuidados',
            passeio: 'cuidados', cuidado: 'cuidados',
            // Training
            training: 'treinamento', adestramento: 'treinamento',
            // Accessories
            accessories: 'acessorios', acessório: 'acessorios', acessórios: 'acessorios',
            // Plans
            insurance: 'plano', plan: 'plano', plano: 'plano', seguro: 'plano',
            // Fallback
            other: 'outros', outro: 'outros', others: 'outros',
          };
          const rawCategory = ((extracted.category as string) ?? (extracted.merchant_type as string) ?? '').toLowerCase().trim();
          // Context-based inference when category is missing: look at sibling classification types
          const inferredFromContext = (() => {
            if (rawCategory) return null;
            const types = classifications.map((c: { type: string }) => c.type);
            if (types.some((t: string) => ['consultation', 'exam', 'surgery', 'vaccine', 'medication', 'clinical_metric', 'symptom', 'emergency'].includes(t))) return 'saude';
            if (types.includes('food')) return 'alimentacao';
            if (types.includes('grooming')) return 'higiene';
            if (types.includes('boarding')) return 'hospedagem';
            if (types.some((t: string) => ['dog_walker', 'pet_sitter'].includes(t))) return 'cuidados';
            if (types.includes('training')) return 'treinamento';
            if (types.some((t: string) => ['plan', 'insurance', 'funeral_plan'].includes(t))) return 'plano';
            return null;
          })();
          const normalizedCategory = inferredFromContext ?? CATEGORY_ALIASES[rawCategory] ?? rawCategory;
          const category = VALID_EXPENSE_CATEGORIES.includes(normalizedCategory) ? normalizedCategory : 'outros';
          const { data, error: expErr } = await supabase.from('expenses').insert({
            pet_id:        petId,
            user_id:       userId,
            diary_entry_id:diaryEntryId,
            date:          (extracted.date as string) ?? today,
            vendor:        (extracted.merchant_name as string) ?? (extracted.vendor as string) ?? null,
            category,
            total:         Number(total) || 0,
            currency:      (extracted.currency as string) ?? 'BRL',
            notes:         (extracted.description as string) ?? null,
            items:         items,
            source:        'ai',
          }).select('id').single();
          console.log('[MOD] gasto salvo:', data?.id?.slice(-8), 'total:', extracted.amount ?? total, '| erro:', expErr?.message);
          if (data?.id) linkedField.linked_expense_id = data.id;
          break;
        }

        case 'connection': {
          const friendName = (extracted.friend_name as string) ?? null;
          if (friendName) {
            await supabase.from('pet_connections').insert({
              pet_id:         petId,
              user_id:        userId,
              diary_entry_id: diaryEntryId,
              friend_name:    friendName,
              friend_species: (extracted.friend_species as string) ?? 'unknown',
              friend_breed:   (extracted.friend_breed as string) ?? null,
              friend_owner:   (extracted.friend_owner as string) ?? null,
              connection_type:(extracted.connection_type as string) ?? 'friend',
              first_met_at:   (extracted.date as string) ?? today,
              last_seen_at:   (extracted.date as string) ?? today,
              notes:          (extracted.notes as string) ?? null,
            });
          }
          break;
        }

        case 'food': {
          await supabase.from('nutrition_records').insert({
            pet_id:        petId,
            user_id:       userId,
            diary_entry_id:diaryEntryId,
            record_type:   (extracted.record_type as string) ?? 'food',
            product_name:  (extracted.product_name as string) ?? (extracted.brand_name as string) ?? null,
            brand:         (extracted.brand as string) ?? (extracted.brand_name as string) ?? null,
            category:      (extracted.category as string) ?? null,
            portion_grams: extracted.portion_grams != null ? Number(extracted.portion_grams) : null,
            daily_portions:extracted.daily_portions != null ? Number(extracted.daily_portions) : 1,
            calories_kcal: extracted.calories_kcal != null ? Number(extracted.calories_kcal) : null,
            is_current:    (extracted.is_current as boolean) ?? false,
            notes:         (extracted.notes as string) ?? (extracted.transition_guide as string) ?? (extracted.ocr_confidence_note as string) ?? null,
            started_at:    (extracted.started_at as string) ?? today,
            source:        'ai',
            extracted_data:extracted,
          });
          break;
        }

        case 'plan':
        case 'insurance': {
          const provider = (extracted.provider as string) ?? null;
          if (provider) {
            const planType = cls.type === 'insurance' ? 'insurance' : (extracted.plan_type as string) ?? 'health';
            const { data } = await supabase.from('pet_plans').insert({
              pet_id:         petId,
              user_id:        userId,
              diary_entry_id: diaryEntryId,
              plan_type:      ['health', 'insurance', 'funeral', 'assistance', 'emergency'].includes(planType)
                ? planType : 'health',
              provider,
              plan_name:      (extracted.plan_name as string) ?? null,
              plan_code:      (extracted.plan_code as string) ?? null,
              monthly_cost:   extracted.monthly_cost != null ? Number(extracted.monthly_cost) : null,
              annual_cost:    extracted.annual_cost != null ? Number(extracted.annual_cost) : null,
              coverage_limit: extracted.coverage_limit != null ? Number(extracted.coverage_limit) : null,
              start_date:     (extracted.start_date as string) ?? null,
              end_date:       (extracted.end_date as string) ?? null,
              renewal_date:   (extracted.renewal_date as string) ?? null,
              coverage_items: (extracted.coverage as string[]) ?? [],
              status:         'active',
              extracted_data: extracted,
              source:         'ai',
            }).select('id').single();
            if (data?.id) linkedField.linked_plan_id = data.id;
          }
          break;
        }

        case 'travel': {
          const destination = (extracted.destination as string) ?? null;
          if (destination) {
            const travelType = extracted.travel_type as string;
            const { data } = await supabase.from('pet_travels').insert({
              pet_id:        petId,
              user_id:       userId,
              diary_entry_id:diaryEntryId,
              destination,
              country:       (extracted.country as string) ?? 'BR',
              region:        (extracted.region as string) ?? null,
              travel_type:   ['road_trip', 'flight', 'local', 'international', 'camping', 'other'].includes(travelType)
                ? travelType : 'road_trip',
              status:        'completed',
              start_date:    (extracted.start_date as string) ?? null,
              end_date:      (extracted.end_date as string) ?? null,
              distance_km:   extracted.distance_km != null ? Number(extracted.distance_km) : null,
              notes:         (extracted.notes as string) ?? null,
              tags:          (extracted.tags as string[]) ?? [],
              extracted_data:extracted,
              source:        'ai',
            }).select('id').single();
            if (data?.id) linkedField.linked_travel_id = data.id;
          }
          break;
        }

        case 'weight': {
          const weightVal = extracted.value ?? extracted.weight;
          if (weightVal != null) {
            const { data, error: wErr } = await supabase.from('clinical_metrics').insert({
              pet_id:        petId,
              user_id:       userId,
              diary_entry_id:diaryEntryId,
              metric_type:   'weight',
              value:         Number(weightVal),
              unit:          (extracted.unit as string) ?? 'kg',
              status:        'normal',
              source:        'ai',
              measured_at:   new Date().toISOString(),
            }).select('id').single();
            console.log('[MOD] métrica salva: weight', data?.id?.slice(-8), '| erro:', wErr?.message);
            if (data?.id) linkedField.linked_weight_metric_id = data.id;
          }
          break;
        }

        case 'grooming': {
          const groomDate = (extracted.date as string) ?? today;
          const groomTime = (extracted.time as string) ?? null;
          const groomBase = i18n.t('ai.event.grooming');
          createFutureEvent(
            petId, userId, diaryEntryId, 'grooming',
            extracted.establishment ? `${groomBase} · ${extracted.establishment}` : groomBase,
            groomTime ? `${groomDate}T${groomTime}:00` : `${groomDate}T09:00:00`, !groomTime,
            (extracted.professional as string) ?? null,
            (extracted.establishment as string) ?? null,
          ).catch(() => {});
          const groomPrice = extracted.price != null ? Number(extracted.price) : null;
          if (groomPrice) {
            await supabase.from('expenses').insert({
              pet_id:        petId,
              user_id:       userId,
              diary_entry_id:diaryEntryId,
              date:          groomDate,
              vendor:        (extracted.establishment as string) ?? null,
              category:      'cuidados',
              total:         groomPrice,
              currency:      'BRL',
              description:   (extracted.service_type as string) ?? i18n.t('ai.expense.grooming'),
              source:        'ai',
            });
          }
          break;
        }

        case 'boarding': {
          const checkIn = (extracted.check_in_date as string) ?? today;
          const checkOut = (extracted.check_out_date as string) ?? null;
          const boardingBase = i18n.t('ai.event.boarding');
          createFutureEvent(
            petId, userId, diaryEntryId, 'boarding',
            extracted.establishment ? `${boardingBase} · ${extracted.establishment}` : boardingBase,
            `${checkIn}T12:00:00`, true,
            (extracted.professional as string) ?? null,
            (extracted.establishment as string) ?? null,
          ).catch(() => {});
          const perNight = extracted.price_per_night != null ? Number(extracted.price_per_night) : null;
          const nights = (checkOut && checkIn)
            ? Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000))
            : 1;
          const boardingTotal = extracted.total_price != null
            ? Number(extracted.total_price)
            : perNight ? perNight * nights : null;
          if (boardingTotal) {
            await supabase.from('expenses').insert({
              pet_id:        petId,
              user_id:       userId,
              diary_entry_id:diaryEntryId,
              date:          checkIn,
              vendor:        (extracted.establishment as string) ?? null,
              category:      'hospedagem',
              total:         boardingTotal,
              currency:      'BRL',
              description:   i18n.t('ai.expense.boarding'),
              source:        'ai',
            });
          }
          break;
        }

        case 'pet_sitter': {
          const sitterDate = (extracted.date as string) ?? today;
          const sitterBase = i18n.t('ai.event.petSitter');
          createFutureEvent(
            petId, userId, diaryEntryId, 'pet_sitter',
            extracted.caretaker_name ? `${sitterBase} · ${extracted.caretaker_name}` : sitterBase,
            `${sitterDate}T09:00:00`, true,
            (extracted.caretaker_name as string) ?? null,
            null,
          ).catch(() => {});
          const sitterPrice = extracted.price != null ? Number(extracted.price) : null;
          if (sitterPrice) {
            await supabase.from('expenses').insert({
              pet_id:        petId,
              user_id:       userId,
              diary_entry_id:diaryEntryId,
              date:          sitterDate,
              vendor:        (extracted.caretaker_name as string) ?? null,
              category:      'cuidados',
              total:         sitterPrice,
              currency:      'BRL',
              description:   i18n.t('ai.expense.petSitter'),
              source:        'ai',
            });
          }
          break;
        }

        case 'dog_walker': {
          const walkDate = (extracted.date as string) ?? today;
          const walkTime = (extracted.start_time as string) ?? null;
          const walkerBase = i18n.t('ai.event.dogWalker');
          createFutureEvent(
            petId, userId, diaryEntryId, 'dog_walker',
            extracted.walker_name ? `${walkerBase} · ${extracted.walker_name}` : walkerBase,
            walkTime ? `${walkDate}T${walkTime}:00` : `${walkDate}T08:00:00`, !walkTime,
            (extracted.walker_name as string) ?? null,
            null,
          ).catch(() => {});
          const walkerPrice = extracted.price != null ? Number(extracted.price) : null;
          if (walkerPrice) {
            await supabase.from('expenses').insert({
              pet_id:        petId,
              user_id:       userId,
              diary_entry_id:diaryEntryId,
              date:          walkDate,
              vendor:        (extracted.walker_name as string) ?? null,
              category:      'cuidados',
              total:         walkerPrice,
              currency:      'BRL',
              description:   i18n.t('ai.expense.dogWalker'),
              source:        'ai',
            });
          }
          break;
        }

        case 'training': {
          const trainDate = (extracted.date as string) ?? today;
          const trainingBase = i18n.t('ai.event.training');
          createFutureEvent(
            petId, userId, diaryEntryId, 'training',
            extracted.trainer_name ? `${trainingBase} · ${extracted.trainer_name}` : trainingBase,
            `${trainDate}T10:00:00`, true,
            (extracted.trainer_name as string) ?? null,
            null,
          ).catch(() => {});
          const trainPrice = extracted.price != null ? Number(extracted.price) : null;
          if (trainPrice) {
            await supabase.from('expenses').insert({
              pet_id:        petId,
              user_id:       userId,
              diary_entry_id:diaryEntryId,
              date:          trainDate,
              vendor:        (extracted.trainer_name as string) ?? null,
              category:      'treinamento',
              total:         trainPrice,
              currency:      'BRL',
              description:   (extracted.session_type as string) ?? i18n.t('ai.expense.training'),
              source:        'ai',
            });
          }
          break;
        }

        case 'funeral_plan': {
          const funeralProvider = (extracted.provider as string) ?? null;
          const { data: funeralPlan } = await supabase.from('pet_plans').insert({
            pet_id:         petId,
            user_id:        userId,
            diary_entry_id: diaryEntryId,
            plan_type:      'funeral',
            provider:       funeralProvider,
            plan_name:      (extracted.plan_name as string) ?? null,
            plan_code:      (extracted.plan_code as string) ?? null,
            monthly_cost:   extracted.monthly_cost != null ? Number(extracted.monthly_cost) : null,
            coverage_items: (extracted.coverage as string[]) ?? [],
            status:         'active',
            extracted_data: extracted,
            source:         'ai',
          }).select('id').single();
          if (funeralPlan?.id) linkedField.linked_plan_id = funeralPlan.id;
          const funeralCost = extracted.monthly_cost != null
            ? Number(extracted.monthly_cost)
            : extracted.total_cost != null ? Number(extracted.total_cost) : null;
          if (funeralCost) {
            await supabase.from('expenses').insert({
              pet_id:        petId,
              user_id:       userId,
              diary_entry_id:diaryEntryId,
              date:          today,
              vendor:        funeralProvider,
              category:      'funerario',
              total:         funeralCost,
              currency:      'BRL',
              description:   (extracted.plan_name as string) ?? i18n.t('ai.expense.funeralPlan'),
              source:        'ai',
            });
          }
          break;
        }

        case 'purchase': {
          const purchaseCategoryMap: Record<string, string> = {
            technology:        'tecnologia',
            health_equipment:  'saude',
            hygiene:           'higiene',
            sanitation:        'higiene',
            comfort:           'acessorios',
            accessories:       'acessorios',
            sport:             'esporte',
            leisure:           'lazer',
          };
          const rawPurchaseCat = (extracted.purchase_category as string) ?? '';
          const purchaseExpCat = purchaseCategoryMap[rawPurchaseCat] ?? 'acessorios';
          const purchaseAmount = extracted.price != null ? Number(extracted.price) : null;
          if (purchaseAmount) {
            await supabase.from('expenses').insert({
              pet_id:         petId,
              user_id:        userId,
              diary_entry_id: diaryEntryId,
              date:           (extracted.date as string) ?? today,
              vendor:         (extracted.merchant_name as string) ?? null,
              category:       purchaseExpCat,
              total:          purchaseAmount,
              currency:       'BRL',
              description:    (extracted.product_name as string) ?? i18n.t('ai.expense.purchase'),
              source:         'ai',
            });
          }
          break;
        }

        case 'memorial': {
          await supabase.from('pets').update({ is_memorial: true }).eq('id', petId);
          break;
        }

        // emergency, place_visit, documentation, lost_found, adoption — stored in classifications JSON only
        case 'clinical_metric': {
          const metricType = (extracted.metric_type as string) ?? null;
          const metricValue = extracted.value != null ? Number(extracted.value) : null;
          if (!metricType || metricValue == null) break;

          const metricRow: Record<string, unknown> = {
            pet_id:          petId,
            user_id:         userId,
            diary_entry_id:  diaryEntryId,
            metric_type:     metricType,
            value:           metricValue,
            unit:            (extracted.unit as string) ?? null,
            source:          'ai',
            measured_at:     new Date().toISOString(),
          };

          // Optional enrichment columns
          if (extracted.secondary_value != null) metricRow.secondary_value = Number(extracted.secondary_value);
          if (extracted.marker_name)     metricRow.marker_name    = extracted.marker_name as string;
          if (extracted.is_fever != null) metricRow.is_fever      = Boolean(extracted.is_fever);
          if (extracted.is_abnormal != null) metricRow.is_abnormal = Boolean(extracted.is_abnormal);
          if (extracted.context)         metricRow.context        = extracted.context as string;
          if (extracted.fasting != null) metricRow.fasting        = Boolean(extracted.fasting);
          if (extracted.score != null)   metricRow.score          = Number(extracted.score);

          // Derive status from is_abnormal flag
          metricRow.status = extracted.is_abnormal ? 'high' : 'normal';

          const { data: metricData, error: metricErr } = await supabase.from('clinical_metrics').insert(metricRow).select('id').single();
          console.log('[MOD] métrica salva:', metricType, metricData?.id?.slice(-8), '| erro:', metricErr?.message);

          // Generate pet_insights for clinically significant values
          checkMetricAlert(petId, userId, metricType, metricValue, {
            isFever:     Boolean(extracted.is_fever),
            isAbnormal:  Boolean(extracted.is_abnormal),
            markerName:  (extracted.marker_name as string) ?? null,
            secondary:   extracted.secondary_value != null ? Number(extracted.secondary_value) : null,
          }).catch(() => {});
          break;
        }

        // ── Future event types: create a scheduled_event directly ──
        // These are detected from free-text like "levar ao vet sexta para cirurgia"
        case 'deworming':
        case 'antiparasitic': {
          const dewDate = (extracted.date as string) ?? today;
          createFutureEvent(
            petId, userId, diaryEntryId,
            type === 'deworming' ? 'deworming' : 'antiparasitic',
            (extracted.product_name as string) ?? i18n.t('ai.event.deworming'),
            `${dewDate}T09:00:00`, true,
            (extracted.veterinarian as string) ?? null,
            null,
          ).catch(() => {});
          break;
        }

        case 'surgery': {
          const surgDate = (extracted.date as string) ?? today;
          createFutureEvent(
            petId, userId, diaryEntryId, 'surgery',
            (extracted.procedure as string) ?? i18n.t('ai.event.surgery'),
            `${surgDate}T08:00:00`, false,
            (extracted.veterinarian as string) ?? null,
            (extracted.clinic as string) ?? null,
          ).catch(() => {});
          break;
        }

        case 'physiotherapy': {
          const physioDate = (extracted.date as string) ?? today;
          createFutureEvent(
            petId, userId, diaryEntryId, 'physiotherapy',
            i18n.t('ai.event.physiotherapy'),
            `${physioDate}T10:00:00`, false,
            (extracted.professional as string) ?? null,
            (extracted.location as string) ?? null,
          ).catch(() => {});
          break;
        }

        // Generic future event — tutor mentioned a future date/time with no specific type
        // e.g. "levar ao vet na próxima quinta"
        case 'scheduled_event': {
          const schedDate = (extracted.date as string) ?? today;
          const schedTitle = (extracted.title as string)
            ?? (extracted.description as string)
            ?? i18n.t('ai.event.custom');
          createFutureEvent(
            petId, userId, diaryEntryId, 'custom',
            schedTitle,
            `${schedDate}T09:00:00`, (extracted.all_day as boolean) ?? true,
            (extracted.professional as string) ?? null,
            (extracted.location as string) ?? null,
          ).catch(() => {});
          break;
        }

        case 'emergency':
        case 'place_visit':
        case 'documentation':
        case 'lost_found':
        case 'adoption':

        // symptom, mood_event, activity, moment — no module table, no-op
        default:
          break;
      }
    } catch {
      // Per-classification isolation: one failed insert never blocks the others
    }
  }

  // Update diary_entry with linked_*_id fields for any modules that were created
  console.log('[MOD] linkedField:', JSON.stringify(linkedField));
  if (Object.keys(linkedField).length > 0) {
    const { error: linkedErr } = await supabase
      .from('diary_entries')
      .update(linkedField)
      .eq('id', diaryEntryId);
    if (linkedErr) {
      console.warn('[LENTES] erro ao gravar linked IDs:', linkedErr.message, linkedField);
    } else {
      console.log('[MOD] linkedField gravado no banco');
    }
  }
}

// ── Clinical metric alert generator ─────────────────────────────────────────

async function checkMetricAlert(
  petId: string,
  userId: string,
  metricType: string,
  value: number,
  opts: { isFever: boolean; isAbnormal: boolean; markerName: string | null; secondary: number | null },
): Promise<void> {
  let title: string | null = null;
  let body: string | null = null;
  let urgency = 'medium';

  switch (metricType) {
    case 'temperature':
      if (opts.isFever) {
        title = i18n.t('ai.alert.feverTitle', { value });
        body  = i18n.t('ai.alert.feverBody', { value });
        urgency = value >= 40.5 ? 'high' : 'medium';
      }
      break;
    case 'blood_glucose':
      if (value < 60) {
        title = i18n.t('ai.alert.hypoTitle', { value });
        body  = i18n.t('ai.alert.hypoBody', { value });
        urgency = 'high';
      } else if (value > 200) {
        title = i18n.t('ai.alert.hyperTitle', { value });
        body  = i18n.t('ai.alert.hyperBody', { value });
        urgency = 'high';
      }
      break;
    case 'oxygen_saturation':
      if (value < 95) {
        title = i18n.t('ai.alert.spo2Title', { value });
        body  = i18n.t('ai.alert.spo2Body', { value });
        urgency = value < 90 ? 'high' : 'medium';
      }
      break;
    case 'blood_pressure':
      if (value > 160) {
        title = i18n.t('ai.alert.bpTitle', { value });
        body  = i18n.t('ai.alert.bpBody', { value });
        urgency = 'medium';
      }
      break;
    case 'lab_result':
      if (opts.isAbnormal && opts.markerName) {
        title = i18n.t('ai.alert.labTitle', { marker: opts.markerName, value });
        body  = i18n.t('ai.alert.labBody', { marker: opts.markerName });
        urgency = 'medium';
      }
      break;
    default:
      if (opts.isAbnormal) {
        title = i18n.t('ai.alert.metricTitle', { type: metricType });
        body  = i18n.t('ai.alert.metricBody', { value });
        urgency = 'low';
      }
  }

  if (!title) return;

  // Dedup: check if a similar insight was already inserted in the last 24h
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const source = `clinical_${metricType}_${petId}`;
  const { count } = await supabase
    .from('pet_insights')
    .select('id', { count: 'exact', head: true })
    .eq('pet_id', petId)
    .eq('source', source)
    .gte('created_at', since);
  if ((count ?? 0) > 0) return;

  await supabase.from('pet_insights').insert({
    pet_id:       petId,
    user_id:      userId,
    type:         'alert',
    urgency,
    title,
    body,
    action_route: `/pet/${petId}/health`,
    action_label: i18n.t('ai.alert.actionLabel'),
    source,
    is_active:    true,
  });
}

export interface SubmitEntryParams {
  text: string | null;
  photosBase64: string[] | null; // array of base64 images for AI analysis
  inputType: string;
  mediaUris?: string[];      // all attachment URIs (photos + video + audio) in attachment order
  videoDuration?: number;
  audioDuration?: number;
  audioOriginalName?: string; // original filename as picked/recorded by the tutor (e.g. "latido.mp3")
  additionalContext?: string; // e.g. "The media shows a DIFFERENT pet, not the owner's pet."
  hasVideo?: boolean;         // true when video URIs are present regardless of inputType
  docBase64?: string;         // inline base64 of a scanned document (uploaded + OCR'd separately from photos)
  skipAI?: boolean;           // when true, skip AI classification/narration — just save text + upload media
  /** Per-routine AI analysis flags. When absent, defaults to all-enabled (backward compat). */
  aiFlags?: import('./_diary/types').AIAnalysisFlags;
}

export interface PDFImportParams {
  pdfBase64: string;
  fileName: string;
  additionalText?: string;
}

// ── Background helpers (used by submitEntry + retryEntry) ────────────────────

async function _backgroundClassifyAndSave(opts: {
  qc: ReturnType<typeof useQueryClient>;
  petId: string;
  userId: string;
  queryKey: readonly string[];
  tempId: string;
  originalEntry: import('../types/database').DiaryEntry;
  text: string | null;
  photosBase64: string[] | null;
  inputType: string;
  photos: string[];
  species?: string;
  petName?: string;
  petBreed?: string;
  mediaUris?: string[];   // all attachment URIs (photos first, then video/audio)
  videoDuration?: number;
  audioDuration?: number;
  audioOriginalName?: string;
  additionalContext?: string;
  hasVideo?: boolean;
  docBase64?: string;     // inline base64 of a scanned document (upload + OCR in parallel with main classify)
  skipAI?: boolean;       // skip AI pipeline — upload media + save entry with manual defaults
  /** Per-routine AI analysis flags. When absent, defaults to all-enabled (backward compat). */
  aiFlags?: import('./_diary/types').AIAnalysisFlags;
}): Promise<void> {
  const { qc, petId, userId, queryKey, tempId, originalEntry, text, photosBase64, inputType, photos, mediaUris, videoDuration, audioDuration, audioOriginalName, additionalContext } = opts;

  // Mark as processing immediately so useSyncQueue doesn't pick it up and create a duplicate
  updatePendingStatus(tempId, 'processing');

  // Upload all media types in parallel before classify so URLs are ready
  let uploadedPhotos: string[] = photos;
  let uploadedVideoUrls: string[] = [];
  let videoThumbUrls: (string | null)[] = [];
  let uploadedAudioUrl: string | null = null;
  let uploadedDocUrl: string | null = null;

  const { uploadPetMedia, getPublicUrl } = await import('../lib/storage');

  // Photos: first N URIs that are not video or audio
  // AI path: N = photosBase64.length (explicit count)
  // skip-AI path: infer from URI extension (docs excluded — they come via docBase64, not mediaUris)
  const nonMediaRe = /\.(mp4|mov|webm|m4v|avi|m4a|aac|mp3|wav|ogg)$/i;
  const photoCount = photosBase64?.length
    ?? (mediaUris ?? []).filter((u) => !nonMediaRe.test(u ?? '')).length;
  const photoUris = photoCount > 0 ? (mediaUris ?? []).slice(0, photoCount) : [];
  // Video/audio: the URI right after the photos (if any)
  const mediaUri = (mediaUris ?? []).slice(photoCount)[0] ?? undefined;

  await Promise.allSettled([
    // 1. Photos — compress + upload whenever photoUris exist
    //    (no longer gated on photosBase64 — skip-AI path has no base64 but still needs upload)
    (async () => {
      if (photoUris.length === 0) return;
      try {
        const ImageManipulator = require('expo-image-manipulator');
        const paths = await Promise.all(
          photoUris.map(async (uri) => {
            try {
              const comp = await ImageManipulator.manipulateAsync(
                uri,
                [{ resize: { width: 1200 } }],
                { compress: 0.78, format: ImageManipulator.SaveFormat.JPEG },
              );
              return uploadPetMedia(userId, petId, comp.uri, 'photo');
            } catch {
              return uploadPetMedia(userId, petId, uri, 'photo');
            }
          }),
        );
        uploadedPhotos = paths.map((p) => getPublicUrl('pet-photos', p));
      } catch (e) {
        console.warn('[BG] photo upload failed:', String(e));
      }
    })(),

    // 2. Videos — upload all video URIs + generate thumbnails (may be multiple)
    (async () => {
      const videoUris = (mediaUris ?? []).filter((u) => /\.(mp4|mov|webm|m4v|avi)$/i.test(u ?? ''));
      if (videoUris.length === 0) return;
      try {
        const VideoThumbnails = await import('expo-video-thumbnails');
        const results = await Promise.all(
          videoUris.map(async (u) => {
            const videoPath = await uploadPetMedia(userId, petId, u, 'video');
            const videoUrl = getPublicUrl('pet-photos', videoPath);
            let thumbUrl: string | null = null;
            try {
              const { uri: thumbLocalUri } = await VideoThumbnails.getThumbnailAsync(u, { time: 1000, quality: 0.3 });
              const thumbPath = await uploadPetMedia(userId, petId, thumbLocalUri, 'photo');
              thumbUrl = getPublicUrl('pet-photos', thumbPath);
            } catch {
              // thumbnail optional — video still works without it
            }
            return { videoUrl, thumbUrl };
          }),
        );
        uploadedVideoUrls = results.map((r) => r.videoUrl);
        videoThumbUrls = results.map((r) => r.thumbUrl);
      } catch (e) {
        console.warn('[BG] video upload failed:', String(e));
      }
    })(),

    // 3. Audio — primary: mediaUri (after photos); fallback: scan by extension
    (async () => {
      const aUri = inputType === 'pet_audio'
        ? (mediaUri ?? mediaUris?.[0])
        : mediaUris?.find((u) => /\.(m4a|aac|mp3|wav|ogg)$/i.test(u ?? ''));
      console.log('[AUDIO-UP] inputType:', inputType);
      console.log('[AUDIO-UP] mediaUri (slot após fotos):', mediaUri?.slice(-60) ?? 'undefined');
      console.log('[AUDIO-UP] mediaUris completo:', JSON.stringify(mediaUris?.map(u => u?.slice(-50))));
      console.log('[AUDIO-UP] aUri resolvido:', aUri?.slice(-60) ?? 'NULL — upload será pulado');
      if (!aUri) {
        console.warn('[AUDIO-UP] ⚠️ nenhum URI de áudio encontrado — upload pulado');
        return;
      }
      console.log('[AUDIO-UP] scheme:', aUri.split('://')[0], '| isContent:', aUri.startsWith('content://'));
      const t0 = Date.now();
      try {
        const path = await uploadPetMedia(userId, petId, aUri, 'video', audioOriginalName ?? undefined); // audio stored in video bucket — originalName preserves extension
        uploadedAudioUrl = getPublicUrl('pet-photos', path);
        console.log('[AUDIO-UP] ✅ upload OK em', Date.now() - t0, 'ms | path:', path);
        console.log('[AUDIO-UP] publicUrl:', uploadedAudioUrl?.slice(0, 80));
      } catch (e) {
        console.warn('[AUDIO-UP] ❌ upload falhou em', Date.now() - t0, 'ms:', String(e));
      }
    })(),

    // 4. Scanned document — write base64 to tmp file then upload to storage
    (async () => {
      if (!opts.docBase64) return;
      try {
        const ext = opts.docBase64.startsWith('/9j/') ? 'jpg' : 'png';
        const tmpUri = `${FileSystem.cacheDirectory}doc_attach_${Date.now()}.${ext}`;
        await FileSystem.writeAsStringAsync(tmpUri, opts.docBase64, { encoding: 'base64' as any });
        const docPath = await uploadPetMedia(userId, petId, tmpUri, 'photo');
        uploadedDocUrl = getPublicUrl('pet-photos', docPath);
        console.log('[DOC-ATTACH] doc upado:', uploadedDocUrl?.slice(0, 60));
      } catch (e) {
        console.warn('[DOC-ATTACH] upload falhou:', String(e));
      }
    })(),
  ]);

  console.log('[S2] uploadedPhotos:', uploadedPhotos?.length, uploadedPhotos?.[0]?.slice(0,60));
  console.log('[S2] uploadedVideoUrls:', uploadedVideoUrls.length, uploadedVideoUrls[0]?.slice(0,60));
  console.log('[S2] uploadedAudioUrl:', uploadedAudioUrl?.slice(0,60));

  // ── Skip AI path — just save entry + media, no classification ────────────────
  if (opts.skipAI) {
    try {
      const inputMethod: import('../types/database').DiaryEntry['input_method'] =
        inputType === 'ocr_scan' ? 'ocr_scan'
        : inputType === 'pdf' ? 'pdf'
        : ['photo', 'gallery'].includes(inputType) ? 'gallery'
        : inputType === 'voice' ? 'voice'
        : inputType === 'video' ? 'video'
        : inputType === 'audio' ? 'audio'
        : inputType === 'pet_audio' ? 'pet_audio'
        : 'text';

      const entryData = {
        pet_id: petId,
        user_id: userId,
        content: text ?? '(media)',
        input_method: inputMethod,
        mood_id: 'calm' as const,
        mood_score: 50,
        mood_source: 'manual' as const,
        tags: [] as string[],
        photos: uploadedPhotos,
        is_special: false,
      };
      const entryId = await api.createDiaryEntry(entryData);

      const extraFields: Record<string, unknown> = {
        input_type: inputType,
        primary_type: 'moment',
      };
      if (uploadedVideoUrls.length > 0) {
        extraFields.video_url = uploadedVideoUrls[0];
        extraFields.video_duration = videoDuration ?? null;
      }
      if (uploadedAudioUrl) {
        extraFields.audio_url = uploadedAudioUrl;
        extraFields.audio_duration = audioDuration ?? null;
      }

      const mediaAnalysesArr: Array<Record<string, unknown>> = [];
      if (inputType !== 'video' && inputType !== 'pet_audio' && uploadedPhotos.length > 0) {
        uploadedPhotos.forEach((url) => {
          mediaAnalysesArr.push({ type: 'photo', mediaUrl: url, analysis: null });
        });
      }
      uploadedVideoUrls.forEach((url, i) => {
        mediaAnalysesArr.push({ type: 'video', mediaUrl: url, thumbnailUrl: videoThumbUrls[i] ?? null, analysis: null, videoAnalysis: null });
      });
      if (uploadedAudioUrl) {
        const audioFilename = audioOriginalName
          ?? (mediaUris ?? []).find((u) => /\.(m4a|aac|mp3|wav|ogg)$/i.test(u ?? ''))?.split('/').pop()
          ?? 'audio';
        mediaAnalysesArr.push({ type: 'audio', mediaUrl: uploadedAudioUrl, fileName: audioFilename, petAudioAnalysis: null, analysis: null });
      }
      if (mediaAnalysesArr.length > 0) extraFields.media_analyses = mediaAnalysesArr;

      await supabase.from('diary_entries').update(extraFields).eq('id', entryId);

      generateEmbedding(petId, 'diary', entryId, text ?? '', 0.5, userId).catch(() => {});
      updatePendingStatus(tempId, 'synced');

      const { data: freshEntry } = await supabase
        .from('diary_entries')
        .select(`*, expenses:expenses!expenses_diary_entry_id_fkey(id, total, currency, category, notes, vendor), vaccines:vaccines!diary_entries_linked_vaccine_id_fkey(id, name, laboratory, veterinarian, clinic, date_administered, next_due_date, batch_number), consultations:consultations!diary_entries_linked_consultation_id_fkey(id, veterinarian, clinic, type, diagnosis, date), clinical_metrics:clinical_metrics!diary_entries_linked_weight_metric_id_fkey(id, metric_type, value, unit, measured_at), medications:medications!diary_entries_linked_medication_id_fkey(id, name, dosage, frequency, veterinarian)`)
        .eq('id', entryId)
        .single();

      const finalEntry = (freshEntry ?? {
        ...entryData,
        id: entryId,
        narration: null,
        entry_type: 'manual' as const,
        primary_type: 'moment',
        classifications: [],
        input_type: inputType,
        urgency: 'none',
        mood_confidence: null,
        is_registration_entry: false,
        linked_photo_analysis_id: null,
        entry_date: new Date().toISOString().split('T')[0],
        is_active: true,
        processing_status: 'done' as const,
        created_at: originalEntry.created_at,
        updated_at: new Date().toISOString(),
        video_url: uploadedVideoUrls[0] ?? null,
        audio_url: uploadedAudioUrl,
        media_analyses: mediaAnalysesArr.length > 0 ? mediaAnalysesArr : null,
      }) as import('../types/database').DiaryEntry;

      qc.setQueryData<import('../types/database').DiaryEntry[]>(queryKey, (old) => {
        const withoutTemp = (old ?? []).filter((e) => !e.id.startsWith('temp-'));
        return [finalEntry, ...withoutTemp];
      });
      setTimeout(() => {
        qc.fetchQuery({
          queryKey: ['pets', petId, 'diary'],
          queryFn: async () => {
            const { fetchDiaryEntries } = await import('../lib/api');
            const fresh = await fetchDiaryEntries(petId);
            if (fresh && fresh.length > 0) return fresh;
            return qc.getQueryData(['pets', petId, 'diary']) ?? [];
          },
        }).catch(() => {});
      }, 5000);

      qc.invalidateQueries({ queryKey: ['pets', petId, 'moods'] });
    } catch (err) {
      console.error('[SKIP-AI] save failed:', err);
      qc.setQueryData<import('../types/database').DiaryEntry[]>(queryKey, (old) =>
        old?.map((e) => e.id === tempId ? { ...e, processing_status: 'error' as const } : e) ?? [],
      );
    }
    return;
  }

  try {
    // ── Extract video frames for visual analysis ──────────────────────────────
    let videoFramesBase64: string[] = [];
    let videoThumbnailUrl: string | null = null;
    if ((inputType === 'video' || opts.hasVideo) && (mediaUris?.length ?? 0) > 0) {
      const photoCount = photosBase64?.length ?? 0;
      const videoUri = (mediaUris ?? []).slice(photoCount)[0]
        ?? mediaUris?.find((u) => /\.(mp4|mov|webm|m4v|avi)$/i.test(u ?? ''))
        ?? null;
      if (videoUri) {
        const [{ extractVideoFrames }, VideoThumbnails] = await Promise.all([
          import('../lib/videoAnalysis'),
          import('expo-video-thumbnails'),
        ]);
        // Limit to 1 frame when photos are also present to avoid OOM with mixed media
        const maxFrames = (photosBase64?.length ?? 0) > 0 ? 1 : 3;
        videoFramesBase64 = await extractVideoFrames(videoUri, maxFrames);
        console.log('[S3] frames extraídos do vídeo:', videoFramesBase64.length, '(maxFrames:', maxFrames, ')');

        // Upload first frame as thumbnail for video card display (always, regardless of photos)
        if (videoFramesBase64.length > 0) {
          try {
            const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(videoUri, { time: 1000, quality: 0.3 });
            const thumbPath = await uploadPetMedia(userId, petId, thumbUri, 'photo');
            videoThumbnailUrl = getPublicUrl('pet-photos', thumbPath);
            console.log('[S3] frame thumbnail upado:', videoThumbnailUrl?.slice(0, 60));
            // If no tutor photos, also store as uploadedPhotos so DB photo field is populated
            if (uploadedPhotos.length === 0) {
              uploadedPhotos = [videoThumbnailUrl];
            }
          } catch (e) {
            console.warn('[BG] frame thumbnail upload failed:', String(e));
          }
        }
      }
    }

    // ── Run text classification and per-photo analysis in parallel ────────────
    // hasPhotos: true whenever photos or video frames are available for analysis
    // Fotos têm prioridade. Se há fotos E vídeo, incluir até 2 fotos + 1 frame do vídeo
    // para garantir que o vídeo também seja analisado pelo analyze-pet-photo.
    let analysisFrames: string[];
    if (photosBase64 && photosBase64.length > 0 && videoFramesBase64.length > 0) {
      // Misto: até 2 fotos + 1 frame de vídeo (total 3 para não estourar OOM)
      analysisFrames = [...photosBase64.slice(0, 2), ...videoFramesBase64.slice(0, 1)];
    } else if (photosBase64 && photosBase64.length > 0) {
      analysisFrames = photosBase64;
    } else if (videoFramesBase64.length > 0) {
      analysisFrames = videoFramesBase64;
    } else {
      analysisFrames = [];
    }
    const analysisFramesCapped = analysisFrames.slice(0, 3);
    const hasVisualInput = analysisFramesCapped.length > 0;

    // Append additionalContext (e.g. "other pet") to text for classify
    const textForClassify = additionalContext
      ? `${text ?? ''}\n\n[CONTEXT: ${additionalContext}]`.trim()
      : text;

    // refreshSession() forces a network call to exchange the refresh token for a
    // new access token — guarantees the JWT is fresh and not stale from SecureStore.
    // (getSession() reads SecureStore which can race with autoRefresh writes.)
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    const bgToken = refreshError || !refreshData.session
      ? (await supabase.auth.getSession()).data.session?.access_token   // fallback
      : refreshData.session.access_token;
    const bgAuthHeader: Record<string, string> = bgToken
      ? { Authorization: `Bearer ${bgToken}` }
      : {};
    console.log('[DIAG] refreshSession error:', refreshError?.message ?? 'none');
    console.log('[DIAG] bgToken present:', !!bgToken);
    console.log('[DIAG] bgToken prefix:', bgToken?.slice(0, 20) ?? 'NONE');
    console.log('[DIAG] bgAuthHeader keys:', Object.keys(bgAuthHeader).join(','));

    console.log('[S3-PRE] textForClassify length:', (textForClassify ?? '').length);
    console.log('[S3-PRE] textForClassify FULL:', textForClassify ?? '');
    console.log('[S3-PRE] analysisFramesCapped:', analysisFramesCapped.length, 'frames');
    if (inputType === 'ocr_scan') {
      const ocrBase64Size = (analysisFramesCapped[0]?.length ?? 0);
      console.log('[OCR] base64 size KB:', Math.round(ocrBase64Size / 1024 * 0.75));
    }
    // Upload OCR scanner photo to Storage so it appears in the diary card
    if (inputType === 'ocr_scan' && analysisFramesCapped[0]) {
      try {
        const ocrBase64 = analysisFramesCapped[0];
        const ext = ocrBase64.startsWith('/9j/') ? 'jpg' : 'png';
        const tmpUri = `${FileSystem.cacheDirectory}ocr_${Date.now()}.${ext}`;
        await FileSystem.writeAsStringAsync(tmpUri, ocrBase64, {
          encoding: 'base64' as any,
        });
        const ocrPath = await uploadPetMedia(userId, petId, tmpUri, 'photo');
        const ocrUrl = getPublicUrl('pet-photos', ocrPath);
        uploadedPhotos = [ocrUrl];
        console.log('[OCR] foto upada:', ocrUrl?.slice(0, 60));
      } catch (e) {
        console.warn('[OCR] upload foto falhou:', String(e));
      }
    }
    console.log('[S3-PRE] photosBase64:', photosBase64?.length ?? 0, 'fotos');
    console.log('[S3-PRE] inputType enviado ao classify:', inputType);
    console.log('[S3-PRE] uploadedAudioUrl presente:', !!uploadedAudioUrl, uploadedAudioUrl?.slice(0, 60) ?? 'null');
    console.log('[S3-PRE] audioDuration:', audioDuration ?? 'null');
    if (inputType === 'pet_audio') {
      console.log('[AUDIO-CLASSIFY] ▶ classify PRIMÁRIO pet_audio iniciando');
      console.log('[AUDIO-CLASSIFY] textForClassify len:', (textForClassify ?? '').length);
      console.log('[AUDIO-CLASSIFY] photosBase64 para classify:', analysisFramesCapped.length > 0 ? analysisFramesCapped.length : (photosBase64?.length ?? 0));
    }
    // ── Resolve AI analysis flags ─────────────────────────────────────────────
    // opts.aiFlags → explicit per-routine control (from AI toggle in the UI)
    // absent → all enabled (backward compat for PDF import, retry, offline sync)
    // opts.skipAI handled separately above (fast-path before try block)
    const { AI_FLAGS_ALL_ON } = await import('./_diary/types');
    const aiFlags = opts.aiFlags ?? AI_FLAGS_ALL_ON;

    const {
      runTextClassification,
      runPhotoAnalyses,
      runVideoClassification,
      runAudioClassification,
      runOCRClassification,
    } = await import('./_diary/mediaRoutines');

    const _classifyStart = Date.now();
    console.log('[ORCH] aiFlags:', JSON.stringify(aiFlags));
    console.log('[ORCH] hasVisualInput:', hasVisualInput, '| audioUrl:', !!uploadedAudioUrl, '| docBase64:', !!opts.docBase64, '| videoUrl:', !!uploadedVideoUrls[0]);

    // ── 5 rotinas independentes em paralelo ───────────────────────────────────
    // Nenhuma lança exceção — cada uma retorna RoutineOutcome<T>.
    // Promise.all é seguro aqui (não cancela as demais em caso de falha).
    const authHeader = Object.keys(bgAuthHeader).length > 0 ? bgAuthHeader : {};

    const [textOutcome, photoOutcome, videoOutcome, audioOutcome, ocrOutcome] = await Promise.all([
      // A: Text narration + classification (mood, tags, urgency)
      aiFlags.narrateText && textForClassify?.trim()
        ? runTextClassification({ petId, text: textForClassify, language: i18n.language, authHeader })
        : Promise.resolve<import('./_diary/types').TextClassificationOutcome>(
            { status: 'skipped', reason: aiFlags.narrateText ? 'no_input' : 'toggle_off' }
          ),

      // B: Per-photo/frame deep analysis via analyze-pet-photo
      aiFlags.analyzePhotos && hasVisualInput
        ? runPhotoAnalyses({
            framesBase64: analysisFramesCapped,
            tutorPhotoCount: photosBase64?.length ?? 0,
            species: opts.species ?? 'dog',
            petName: opts.petName ?? null,
            petBreed: opts.petBreed ?? null,
            language: i18n.language,
            authHeader,
          })
        : Promise.resolve<import('./_diary/types').PhotoAnalysesOutcome>(
            { status: 'skipped', reason: aiFlags.analyzePhotos ? 'no_input' : 'toggle_off' }
          ),

      // C: Video behavior analysis (locomotion, energy, calm, health observations)
      aiFlags.analyzeVideo && uploadedVideoUrls[0]
        ? runVideoClassification({
            petId,
            videoUrl: uploadedVideoUrls[0],
            text: textForClassify ?? null,
            thumbnailFrameBase64: videoFramesBase64[0] ?? null,
            language: i18n.language,
            authHeader,
          })
        : Promise.resolve<import('./_diary/types').VideoClassificationOutcome>(
            { status: 'skipped', reason: aiFlags.analyzeVideo ? 'no_input' : 'toggle_off' }
          ),

      // D: Pet audio analysis (sound_type, emotional_state, intensity)
      aiFlags.analyzeAudio && uploadedAudioUrl
        ? runAudioClassification({
            petId,
            audioUrl: uploadedAudioUrl,
            text: textForClassify ?? null,
            durationSeconds: audioDuration ?? null,
            language: i18n.language,
            authHeader,
          })
        : Promise.resolve<import('./_diary/types').AudioClassificationOutcome>(
            { status: 'skipped', reason: aiFlags.analyzeAudio ? 'no_input' : 'toggle_off' }
          ),

      // E: OCR document extraction (fields, document_type, items)
      // NOTE: document ALWAYS gets saved to diary — this outcome only controls
      //       whether OCR fields are populated. See docMediaUrl guard below.
      aiFlags.analyzeOCR && opts.docBase64
        ? runOCRClassification({
            petId,
            docBase64: opts.docBase64,
            language: i18n.language,
            authHeader,
          })
        : Promise.resolve<import('./_diary/types').OCRClassificationOutcome>(
            { status: 'skipped', reason: aiFlags.analyzeOCR ? 'no_input' : 'toggle_off' }
          ),
    ]);

    const _classifyEnd = Date.now();
    console.log('[ORCH] duration ms:', _classifyEnd - _classifyStart);
    console.log('[ORCH] text:', textOutcome.status, '| photo:', photoOutcome.status, '| video:', videoOutcome.status, '| audio:', audioOutcome.status, '| ocr:', ocrOutcome.status);

    // ── Extract classification (primary result for narration, mood, tags, etc.) ─
    // Uses text routine result when available; falls back to video/audio routine
    // result for inputType-specific fields; neutral defaults when all skipped/failed.
    const textValue = textOutcome.status === 'ok' ? textOutcome.value : null;
    const videoValue = videoOutcome.status === 'ok' ? videoOutcome.value : null;
    const audioValue = audioOutcome.status === 'ok' ? audioOutcome.value : null;

    // classification: primary object consumed by DB save, saveToModule, RAG, etc.
    // Merges text classification with video/audio-specific fields from their routines.
    const classification: import('../lib/ai').ClassifyDiaryResponse = textValue ?? {
      classifications: [],
      primary_type:    'moment',
      narration:       null as unknown as string,
      mood:            'calm',
      mood_confidence: 0.5,
      urgency:         'none',
      clinical_metrics: [],
      suggestions:     [],
      tags_suggested:  [],
      language:        i18n.language,
      tokens_used:     0,
    };

    // Attach video_analysis and pet_audio_analysis from their dedicated routines
    // (when text routine didn't already produce them from a combined call)
    if (videoValue?.video_analysis && !classification.video_analysis) {
      (classification as Record<string, unknown>).video_analysis = videoValue.video_analysis;
    }
    if (audioValue?.pet_audio_analysis && !classification.pet_audio_analysis) {
      (classification as Record<string, unknown>).pet_audio_analysis = audioValue.pet_audio_analysis;
    }

    // Legacy variable aliases for downstream compat (not renamed to minimise diff)
    // photoAnalysisResults: convert direct array → PromiseSettledResult shape used downstream
    const photoRawArray = photoOutcome.status === 'ok' ? photoOutcome.value : null;
    const photoAnalysisResults: PromiseSettledResult<Record<string, unknown> | null>[] | null =
      photoRawArray
        ? photoRawArray.map((v) =>
            v != null
              ? ({ status: 'fulfilled', value: v } as PromiseFulfilledResult<Record<string, unknown>>)
              : ({ status: 'rejected', reason: 'analyze-pet-photo returned null' } as PromiseRejectedResult),
          )
        : null;

    // audioClassification: kept for backward compat with secondary-audio logic below
    const audioClassification = audioValue;

    // ocrClassification: used in media_analyses builder below
    const ocrClassification = ocrOutcome.status === 'ok' ? ocrOutcome.value : null;

    // ── Log outcomes ──────────────────────────────────────────────────────────
    console.log('[S3] classify OK | narration:', !!classification.narration, '| usou fotos:', (photosBase64?.length ?? 0) > 0, '| frames:', videoFramesBase64.length);
    console.log('[S3] primary_type:', classification.primary_type);
    console.log('[S3] mood:', classification.mood, '| urgency:', classification.urgency);
    console.log('[S3] tokens_used:', classification.tokens_used);
    console.log('[S3] narration preview:', (classification.narration ?? '').slice(0, 100));
    console.log('[S3] classifications RAW:', JSON.stringify(classification.classifications));
    console.log('[DIAG] photoAnalysisResults:', JSON.stringify(
      Array.isArray(photoAnalysisResults)
        ? photoAnalysisResults.map((r, i) => ({
            idx: i,
            status: r.status,
            hasValue: r.status === 'fulfilled' && r.value != null,
            desc: r.status === 'fulfilled' && r.value
              ? String((r.value as Record<string,unknown>).description ?? 'NULL').slice(0, 80)
              : r.status === 'rejected'
                ? String((r as PromiseRejectedResult).reason).slice(0, 80)
                : 'NULL',
          }))
        : 'photoAnalysisResults is null'
    ));
    // PASSO 7: Clear base64 references after classify to free memory
    // (JS GC will collect them once no references remain)
    videoFramesBase64 = [];
    console.log('[S3] classifications:', classification.classifications?.map((c: {type: string}) => c.type));
    console.log('[S3] tags_suggested:', JSON.stringify(classification.tags_suggested));
    console.log('[S3] extracted_data:', JSON.stringify(
      classification.classifications
        ?.filter((c: {type: string}) => ['symptom','consultation','weight'].includes(c.type))
        ?.map((c: {type: string; extracted_data: Record<string,unknown>}) => ({
          type: c.type,
          data: c.extracted_data,
        }))
    ));
    console.log('[S3] photoAnalysisResults count:', Array.isArray(photoAnalysisResults) ? photoAnalysisResults.length : 0);

    // ── Partial-success toast ─────────────────────────────────────────────────
    // If some routines were attempted but failed, let the tutor know that
    // the entry was saved but some analyses didn't complete. One toast only.
    {
      const { countFailedRoutines, countAttemptedRoutines } = await import('./_diary/types');
      const bundle: import('./_diary/types').MediaAnalysisBundle = {
        textClassification: textOutcome,
        photoAnalyses:      photoOutcome,
        videoClassification: videoOutcome,
        audioClassification: audioOutcome,
        ocrClassification:  ocrOutcome,
      };
      const attempted = countAttemptedRoutines(bundle);
      const failed = countFailedRoutines(bundle);
      if (attempted > 0 && failed > 0) {
        const toastFn = (await import('../components/Toast')).toast;
        if (failed < attempted) {
          toastFn(i18n.t('diary.aiRoutines.partialSuccess'), 'warning');
        } else {
          toastFn(i18n.t('errors.aiRoutineFailed'), 'error');
        }
      }
    }

    // DB constraint: voice | text | gallery | video | audio | ocr_scan | pdf | pet_audio
    // NOTE: 'photo' is NOT a valid DB value — map to 'gallery'
    const inputMethod: import('../types/database').DiaryEntry['input_method'] =
      inputType === 'ocr_scan' ? 'ocr_scan'
      : inputType === 'pdf' ? 'pdf'
      : ['photo', 'gallery'].includes(inputType) ? 'gallery'
      : inputType === 'voice' ? 'voice'
      : inputType === 'video' ? 'video'
      : inputType === 'audio' ? 'audio'
      : inputType === 'pet_audio' ? 'pet_audio'
      : 'text';

    const entryData = {
      pet_id: petId,
      user_id: userId,
      content: text ?? '(media)',
      input_method: inputMethod,
      mood_id: classification.mood,
      mood_score: Math.round((classification.mood_confidence ?? 0.5) * 100),
      mood_source: 'ai_suggested' as const,
      tags: classification.tags_suggested ?? [],
      photos: uploadedPhotos,
      is_special: false,
    };

    const entryId = await api.createDiaryEntry(entryData);
    console.log('[S4] entryId:', entryId?.slice(-8));

    if (classification.narration) {
      await api.updateDiaryNarration(
        entryId,
        classification.narration,
        Math.round((classification.mood_confidence ?? 0.5) * 100),
        classification.tags_suggested,
      );
    }

    // ── Build media_analyses array (declared here so insights can access it after await) ──
    const mediaAnalysesArr: Array<Record<string, unknown>> = [];

    // ── Run all post-creation updates concurrently ────────────────────────────
    const postSavePromises: Promise<unknown>[] = [];

    // 1. Extra classification fields + video_analysis / pet_audio_analysis
    const extraFields: Record<string, unknown> = {
      input_type: inputType,
      primary_type: classification.primary_type,
      classifications: classification.classifications,
      mood_confidence: classification.mood_confidence,
      urgency: classification.urgency,
    };
    if (classification.video_analysis) extraFields.video_analysis = classification.video_analysis;
    if (classification.pet_audio_analysis) extraFields.pet_audio_analysis = classification.pet_audio_analysis;

    // Secondary pet_audio classify result (F+A, V+A, F+V+A etc.) — fills pet_audio_analysis
    // when the main classify focused on photos/video and couldn't run the audio prompt
    const secondaryAudioAnalysis = (audioClassification as import('../lib/ai').ClassifyDiaryResponse | null)?.pet_audio_analysis;
    if (secondaryAudioAnalysis && !extraFields.pet_audio_analysis) {
      extraFields.pet_audio_analysis = secondaryAudioAnalysis;
      console.log('[AUDIO-ATTACH] pet_audio_analysis preenchido pelo classify secundário');
    }

    // Inferir pet_audio_analysis a partir do behavior_summary quando há frames de vídeo
    if (inputType === 'video' && uploadedVideoUrls.length > 0 && classification.video_analysis && !classification.pet_audio_analysis) {
      const behavior = (classification.video_analysis as { behavior_summary?: string }).behavior_summary ?? '';
      const moodContext = classification.mood;
      if (/lat|barkin|vocal|miand|meow/i.test(behavior)) {
        const isBark = /lat|barkin/i.test(behavior);
        extraFields.pet_audio_analysis = {
          sound_type: isBark ? 'bark' : 'meow',
          emotional_state: moodContext ?? 'alert',
          intensity: classification.urgency === 'high' ? 'high' : 'medium',
          pattern_notes: `Inferido do comportamento visual: ${behavior}`,
        };
      }
    }

    postSavePromises.push(
      supabase.from('diary_entries').update(extraFields).eq('id', entryId).then(() => undefined).catch(() => {}),
    );

    // 2. Save per-photo analyses (photo_analyses table + link to entry)
    let primaryPhotoAnalysis: Record<string, unknown> | null = null;

    if (photoAnalysisResults) {
      const successfulAnalyses = (photoAnalysisResults as PromiseSettledResult<Record<string, unknown> | null>[])
        .filter((r): r is PromiseFulfilledResult<Record<string, unknown>> =>
          r.status === 'fulfilled' && r.value != null,
        )
        .map((r) => r.value);

      if (successfulAnalyses.length > 0) {
        primaryPhotoAnalysis = successfulAnalyses[0];

        // Save primary photo_analysis_data JSONB to diary_entries (first/best result)
        postSavePromises.push(
          supabase.from('diary_entries')
            .update({ photo_analysis_data: successfulAnalyses[0] ?? null })
            .eq('id', entryId)
            .then(() => undefined).catch(() => {}),
        );

        // Insert individual records into photo_analyses + link first to entry
        postSavePromises.push(
          (async () => {
            try {
              const rows = successfulAnalyses.map((data, idx) => ({
                pet_id: petId,
                user_id: userId,
                photo_url: uploadedPhotos[idx] ?? uploadedPhotos[0] ?? '',
                analysis_result: data,
                confidence: typeof data.confidence === 'number' ? data.confidence : 0.8,
                analysis_type: 'general' as const,
              }));
              const { data: inserted } = await supabase
                .from('photo_analyses')
                .insert(rows)
                .select('id');
              if (inserted?.[0]?.id) {
                await supabase.from('diary_entries')
                  .update({ linked_photo_analysis_id: inserted[0].id })
                  .eq('id', entryId);
              }
            } catch { /* non-critical */ }
          })(),
        );
      }
    }

    // 3. Video URL + analysis persistence (already uploaded above)
    if (uploadedVideoUrls.length > 0) {
      postSavePromises.push(
        supabase.from('diary_entries').update({
          video_url:      uploadedVideoUrls[0],  // primary video in main field
          video_duration: videoDuration ?? null,
          ...(classification.video_analysis ? { video_analysis: classification.video_analysis } : {}),
        }).eq('id', entryId).then(() => undefined).catch(() => {}),
      );
    }

    // 4. Audio URL + analysis persistence (already uploaded above)
    if (uploadedAudioUrl) {
      postSavePromises.push(
        supabase.from('diary_entries').update({
          audio_url:      uploadedAudioUrl,
          audio_duration: audioDuration ?? null,
          ...(classification.pet_audio_analysis ? { pet_audio_analysis: classification.pet_audio_analysis } : {}),
        }).eq('id', entryId).then(() => undefined).catch(() => {}),
      );
    }

    // 5. Module saves (vaccines, consultations, etc.) + linked_*_id writes back
    postSavePromises.push(
      saveToModule(petId, userId, entryId, classification).catch((err) => {
        console.warn('[LENTES] saveToModule falhou (non-critical):', err);
      }),
    );

    // 6. Build media_analyses array and save it
    {
      const photoResultsRaw = Array.isArray(photoAnalysisResults)
        ? (photoAnalysisResults as PromiseSettledResult<Record<string, unknown> | null>[])
            .map((r) => r.status === 'fulfilled' ? (r.value ?? null) : null)
        : [];

      // A) Fotos (not video/audio/ocr_scan — ocr_scan gets a 'document' item in section D instead)
      if (inputType !== 'video' && inputType !== 'pet_audio' && inputType !== 'ocr_scan' && uploadedPhotos.length > 0) {
        uploadedPhotos.forEach((photoUrl, idx) => {
          mediaAnalysesArr.push({ type: 'photo', mediaUrl: photoUrl, analysis: photoResultsRaw[idx] ?? null });
        });
      }

      // B) Vídeos — um subcard por vídeo
      uploadedVideoUrls.forEach((videoUrl, idx) => {
        const videoThumb = idx === 0 ? videoThumbnailUrl : null;
        const videoFrameAnalysis = idx === 0
          ? (photoResultsRaw[(photosBase64?.length ?? 0) + idx] ?? null)
          : null;
        mediaAnalysesArr.push({
          type: 'video',
          mediaUrl: videoUrl,
          thumbnailUrl: videoThumb,
          analysis: videoFrameAnalysis,
          videoAnalysis: idx === 0
            ? ((classification as Record<string, unknown>).video_analysis ?? null)
            : null,
        });
      });

      // C) Áudio
      if (uploadedAudioUrl) {
        // Use original filename from tutor's file pick — fall back to URI-derived name
        const audioFilename = audioOriginalName
          ?? (mediaUris ?? []).find((u) => /\.(m4a|aac|mp3|wav|ogg)$/i.test(u ?? ''))?.split('/').pop()
          ?? 'audio';
        mediaAnalysesArr.push({
          type: 'audio',
          mediaUrl: uploadedAudioUrl,
          fileName: audioFilename,
          petAudioAnalysis: (classification as Record<string, unknown>).pet_audio_analysis ?? null,
          analysis: null,
        });
      }

      // D) Documento OCR — two cases:
      //    1. Pure OCR entry (inputType === 'ocr_scan'): use main classify result + uploadedPhotos[0]
      //    2. Mixed entry (photos + scanned doc): use ocrClassification result + uploadedDocUrl
      const docMediaUrl = inputType === 'ocr_scan' ? uploadedPhotos[0] : uploadedDocUrl;
      const docOcrSource = inputType === 'ocr_scan'
        ? (classification as Record<string, unknown>)
        : ((ocrClassification as Record<string, unknown> | null) ?? null);

      if (docMediaUrl) {
        console.log('[OCR-MOD] docMediaUrl:', docMediaUrl?.slice(0, 60));
        console.log('[OCR-MOD] docOcrSource:', docOcrSource ? 'present' : 'null (OCR falhou — doc salvo sem campos)');
        if (docOcrSource) {
          console.log('[OCR-MOD] docOcrSource keys:', Object.keys(docOcrSource).join(', '));
          console.log('[OCR-MOD] document_type:', (docOcrSource as Record<string,unknown>).document_type);
          const _ocrData = (docOcrSource as Record<string,unknown>).ocr_data as Record<string,unknown> | undefined;
          console.log('[OCR-MOD] ocr_data.fields count:', (_ocrData?.fields as unknown[])?.length ?? 0);
          if ((_ocrData?.fields as unknown[])?.length) {
            console.log('[OCR-MOD] ocr_data first 3 fields:', JSON.stringify((_ocrData.fields as unknown[]).slice(0, 3)));
          } else {
            console.warn('[OCR-MOD] ocr_data.fields EMPTY | full ocr_data:', JSON.stringify(_ocrData));
          }
        }
        mediaAnalysesArr.push({
          type: 'document',
          mediaUrl: docMediaUrl,
          ocrData: {
            fields: (docOcrSource?.ocr_data as { fields?: Array<{key: string; value: string}> } | undefined)?.fields ?? [],
            document_type: (docOcrSource?.document_type as string) ?? 'other',
            items: (docOcrSource?.ocr_data as { items?: Array<{name: string; qty: number; unit_price: number}> } | undefined)?.items ?? undefined,
          },
          analysis: inputType === 'ocr_scan' ? (photoResultsRaw[0] ?? null) : null,
        });
      }

      if (mediaAnalysesArr.length > 0) {
        console.log('[S5] media_analyses:', mediaAnalysesArr.length, 'items', mediaAnalysesArr.map((m) => m.type));
        postSavePromises.push(
          supabase.from('diary_entries')
            .update({ media_analyses: mediaAnalysesArr })
            .eq('id', entryId)
            .then(({ error: updErr }) => {
              if (updErr) console.error('[S5] media_analyses UPDATE FALHOU:', updErr.code, updErr.message);
              else console.log('[S5] media_analyses salvo OK');
            }).catch((e) => console.error('[S5] media_analyses catch:', e)),
        );
      }
    }

    await Promise.allSettled(postSavePromises);
    console.log('[S5] postSave concluído');
    console.log('[S5] primaryPhotoAnalysis:', !!primaryPhotoAnalysis);
    console.log('[S5] primaryPhotoAnalysis.description:', (primaryPhotoAnalysis as Record<string,unknown> | null)?.description?.toString().slice(0,60));

    // ── 7. Generate pet_insights from media analyses (fire-and-forget) ────────
    {
      const insightsToCreate: Array<Record<string, unknown>> = [];

      for (const media of mediaAnalysesArr) {
        // Photo: toxicity alerts
        if (media.type === 'photo' && media.analysis) {
          const toxCheck = (media.analysis as Record<string, unknown>).toxicity_check as Record<string, unknown> | undefined;
          if (toxCheck?.has_toxic_items) {
            const items = toxCheck.items as Array<{name: string; toxicity_level: string; description: string}> | undefined;
            const severeItems = (items ?? []).filter((i) => i.toxicity_level === 'severe' || i.toxicity_level === 'moderate');
            if (severeItems.length > 0) {
              insightsToCreate.push({
                pet_id: petId,
                user_id: userId,
                diary_entry_id: entryId,
                category: 'saude',
                urgency: severeItems.some((i) => i.toxicity_level === 'severe') ? 'high' : 'medium',
                title: 'Planta/objeto tóxico detectado na foto',
                body: severeItems.map((i) => `${i.name}: ${i.description}`).join('\n'),
                source: 'photo_analysis',
                is_active: true,
              });
            }
          }
        }
        // Video: low energy or locomotion
        if (media.type === 'video' && media.videoAnalysis) {
          const va = media.videoAnalysis as Record<string, unknown>;
          const energy = va.energy_score as number | undefined;
          const locomotion = va.locomotion_score as number | undefined;
          if ((energy != null && energy < 30) || (locomotion != null && locomotion < 40)) {
            insightsToCreate.push({
              pet_id: petId,
              user_id: userId,
              diary_entry_id: entryId,
              category: 'comportamento',
              urgency: 'medium',
              title: 'Baixa energia ou dificuldade de locomoção detectada',
              body: `${(va.behavior_summary as string) ?? ''} Energia: ${energy ?? '?'}/100. Locomoção: ${locomotion ?? '?'}/100.`.trim(),
              source: 'video_analysis',
              is_active: true,
            });
          }
        }
      }

      if (insightsToCreate.length > 0) {
        console.log('[S5] insights a criar:', insightsToCreate.length);
        supabase.from('pet_insights')
          .insert(insightsToCreate)
          .then(() => { qc.invalidateQueries({ queryKey: ['pets', petId, 'insights'] }); })
          .catch(() => {});
      }
    }

    // Fetch the complete entry from DB with all fields and module joins.
    // All postSavePromises (narration, classifications, photo_analysis_data, video/audio) are
    // already awaited above, so the DB has the full data at this point.
    const { data: freshEntry, error: freshError } = await supabase
      .from('diary_entries')
      .select(`
        *,
        expenses:expenses!expenses_diary_entry_id_fkey(id, total, currency, category, notes, vendor),
        vaccines:vaccines!diary_entries_linked_vaccine_id_fkey(id, name, laboratory, veterinarian, clinic, date_administered, next_due_date, batch_number),
        consultations:consultations!diary_entries_linked_consultation_id_fkey(id, veterinarian, clinic, type, diagnosis, date),
        clinical_metrics:clinical_metrics!diary_entries_linked_weight_metric_id_fkey(id, metric_type, value, unit, measured_at),
        medications:medications!diary_entries_linked_medication_id_fkey(id, name, dosage, frequency, veterinarian)
      `)
      .eq('id', entryId)
      .single();
    console.log('[S6] freshEntry fromDB:', !!freshEntry, freshError?.message);
    console.log('[S6] freshEntry.photos:', (freshEntry as unknown as Record<string,unknown>)?.photos);
    console.log('[S6] freshEntry.photo_analysis_data:', !!(freshEntry as unknown as Record<string,unknown>)?.photo_analysis_data);
    console.log('[S6] freshEntry.narration:', !!(freshEntry as unknown as Record<string,unknown>)?.narration);
    console.log('[S6] freshEntry.video_url:', !!(freshEntry as unknown as Record<string,unknown>)?.video_url);
    console.log('[S6] freshEntry.classifications:', ((freshEntry as unknown as Record<string,unknown>)?.classifications as unknown[] | null)?.length ?? 0);
    console.log('[S6] freshEntry.media_analyses:', ((freshEntry as unknown as Record<string,unknown>)?.media_analyses as unknown[] | null)?.length ?? 'null');
    console.log('[S6] expenses:', ((freshEntry as unknown as Record<string,unknown>)?.expenses as unknown[] | null)?.length ?? 0);
    console.log('[S6] vaccines:', ((freshEntry as unknown as Record<string,unknown>)?.vaccines as unknown[] | null)?.length ?? 0);
    if (freshError) {
      console.warn('[BG] freshEntry fetch failed:', freshError.message, freshError.code);
    }

    // Best-effort side effects
    const embeddingText = classification.narration
      ? `${text ?? ''}\n\n${classification.narration}`
      : (text ?? '');
    generateEmbedding(petId, 'diary', entryId, embeddingText, 0.5, userId).catch(() => {});
    updatePetRAG(petId, userId, entryId, classification.classifications ?? []).catch(() => {});
    import('../lib/achievements').then(({ checkAndAwardAchievements }) => {
      checkAndAwardAchievements(petId, userId, entryId).catch(() => {});
    }).catch(() => {});

    // Mark SQLite pending entry as synced
    updatePendingStatus(tempId, 'synced');

    // Build final entry: fresh DB row if available, otherwise manual construction.
    // Fallback includes all data available in memory so the card renders correctly
    // even if the DB fetch failed (e.g. timing / RLS).
    const finalEntry = (freshEntry ?? {
      ...entryData,
      id: entryId,
      narration:               classification.narration ?? null,
      entry_type:              'manual' as const,
      primary_type:            classification.primary_type ?? 'moment',
      classifications:         classification.classifications ?? [],
      input_type:              inputType,
      urgency:                 classification.urgency ?? 'none',
      mood_confidence:         classification.mood_confidence ?? null,
      is_registration_entry:   false,
      linked_photo_analysis_id: null,
      entry_date:              new Date().toISOString().split('T')[0],
      is_active:               true,
      processing_status:       'done' as const,
      created_at:              originalEntry.created_at,
      updated_at:              new Date().toISOString(),
      photos:                  uploadedPhotos,
      video_url:               uploadedVideoUrls[0] ?? null,
      audio_url:               uploadedAudioUrl,
      photo_analysis_data:     primaryPhotoAnalysis,
      video_analysis:          (classification as Record<string, unknown>).video_analysis ?? null,
      pet_audio_analysis:      (classification as Record<string, unknown>).pet_audio_analysis ?? null,
      media_analyses:          mediaAnalysesArr.length > 0 ? mediaAnalysesArr : null,
    }) as import('../types/database').DiaryEntry;

    // Cache locally for offline reads
    cacheEntry({
      id:               finalEntry.id,
      pet_id:           finalEntry.pet_id,
      content:          finalEntry.content,
      narration:        finalEntry.narration,
      mood_id:          finalEntry.mood_id,
      mood_score:       finalEntry.mood_score,
      input_method:     finalEntry.input_method,
      input_type:       (finalEntry as unknown as Record<string, unknown>).input_type as string | null,
      primary_type:     (finalEntry as unknown as Record<string, unknown>).primary_type as string | null,
      tags:             Array.isArray(finalEntry.tags) ? finalEntry.tags : [],
      photos:           Array.isArray(finalEntry.photos) ? finalEntry.photos : [],
      processing_status:'done',
      is_special:       finalEntry.is_special,
      created_at:       finalEntry.created_at,
      updated_at:       finalEntry.updated_at,
    });

    // Replace temp entry with the complete fresh entry from DB.
    // Do NOT invalidate diary immediately — an instant refetch could overwrite
    // the cache with a stale row if any write is still propagating. Schedule it
    // after 3 s so the card shows correct data right away.
    console.log('[S7] setQueryData com finalEntry | photoAnalysisData:', !!(finalEntry as unknown as Record<string,unknown>)?.photo_analysis_data);
    qc.setQueryData<import('../types/database').DiaryEntry[]>(queryKey as unknown as ['pets', string, 'diary'], (old) => {
      const withoutTemp = (old ?? []).filter((e) => !e.id.startsWith('temp-'));
      return [finalEntry, ...withoutTemp];
    });
    // Refetch silencioso após 5s — não zera cache se o banco retornar vazio
    setTimeout(() => {
      qc.fetchQuery({
        queryKey: ['pets', petId, 'diary'],
        queryFn: async () => {
          const { fetchDiaryEntries } = await import('../lib/api');
          const fresh = await fetchDiaryEntries(petId);
          if (fresh && fresh.length > 0) {
            return fresh;
          }
          // Banco retornou vazio (propagação lenta) — manter cache atual
          return qc.getQueryData(['pets', petId, 'diary']) ?? [];
        },
      }).catch(() => {});
    }, 5000);

    qc.invalidateQueries({ queryKey: ['pets', petId, 'moods'] });
    qc.invalidateQueries({ queryKey: ['pets', petId, 'lens', 'expenses'] });
    qc.invalidateQueries({ queryKey: ['pets', petId, 'lens', 'metrics'] });
    qc.invalidateQueries({ queryKey: ['pets', petId, 'lens', 'achievements'] });
    qc.invalidateQueries({ queryKey: ['pets', petId, 'lens', 'travels'] });
    qc.invalidateQueries({ queryKey: ['pets', petId, 'lens', 'mood_trend'] });
    qc.invalidateQueries({ queryKey: ['pets', petId, 'lens', 'agenda'] });
    qc.invalidateQueries({ queryKey: ['pets', petId, 'scheduled_events'] });
    qc.invalidateQueries({ queryKey: ['pets', petId, 'vaccines'] });
    qc.invalidateQueries({ queryKey: ['pets', petId, 'consultations'] });
    qc.invalidateQueries({ queryKey: ['pets', petId, 'insights'] });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[BG] _backgroundClassifyAndSave failed:', msg);
    // Keep SQLite pending entry so useSyncQueue can retry when online
    updatePendingStatus(tempId, 'error', msg);

    qc.setQueryData<import('../types/database').DiaryEntry[]>(queryKey as unknown as ['pets', string, 'diary'], (old) =>
      (old ?? []).map((e) => e.id === tempId ? { ...e, processing_status: 'error' as const } : e),
    );
  }
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
      generateEmbedding(petId, 'diary', entryId, embeddingText, 0.5, user!.id).catch(() => {});
      updatePetRAG(petId, user!.id, entryId, classification.classifications ?? []).catch(() => {});

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
      // Remove any stale temp entries, then prepend the real entry
      qc.setQueryData<DiaryEntry[]>(queryKey, (old) => {
        const withoutTemp = (old ?? []).filter((e) => !e.id.startsWith('temp-'));
        return [newEntry as DiaryEntry, ...withoutTemp];
      });
      qc.invalidateQueries({ queryKey: ['pets', petId, 'moods'] });
      qc.invalidateQueries({ queryKey: ['pets', petId, 'lens', 'expenses'] });
      qc.invalidateQueries({ queryKey: ['pets', petId, 'lens', 'metrics'] });
      qc.invalidateQueries({ queryKey: ['pets', petId, 'lens', 'achievements'] });
      qc.invalidateQueries({ queryKey: ['pets', petId, 'lens', 'travels'] });
      qc.invalidateQueries({ queryKey: ['pets', petId, 'lens', 'mood_trend'] });
      qc.invalidateQueries({ queryKey: ['pets', petId, 'lens', 'agenda'] });
      qc.invalidateQueries({ queryKey: ['pets', petId, 'scheduled_events'] });
      qc.invalidateQueries({ queryKey: ['pets', petId, 'vaccines'] });
      qc.invalidateQueries({ queryKey: ['pets', petId, 'consultations'] });
      qc.invalidateQueries({ queryKey: ['pets', petId, 'insights'] });
    },
  });

  // ── submitEntry — optimistic insert + background classify + save ────────────
  // Inserts a temp "processing" entry into the cache immediately, then runs
  // classify + save in the background. The caller navigates away right after.
  const submitEntry = React.useCallback(async (params: SubmitEntryParams): Promise<void> => {
    if (!user?.id) return;

    const { text, photosBase64, inputType, hasVideo, mediaUris = [] } = params;
    console.log('[S1] submitEntry chamado | photosBase64:', photosBase64?.length ?? 0, '| mediaUris:', mediaUris.length);
    console.log('[S1] text length:', (text ?? '').length, '| preview:', (text ?? '').slice(0, 80));
    console.log('[S1] inputType:', inputType, '| hasVideo:', hasVideo);

    const tempId = `temp-${Date.now()}`;

    // OFFLINE FIRST — save locally before any network call
    savePendingEntry({
      id:               tempId,
      pet_id:           petId,
      input_text:       params.text,
      input_type:       params.inputType,
      photos_base64:    params.photosBase64,
      local_media_uris: params.mediaUris ?? null,
      created_at:       new Date().toISOString(),
    });
    const inputMethod: DiaryEntry['input_method'] =
      ['photo', 'gallery', 'ocr_scan'].includes(params.inputType) ? 'photo'
      : params.inputType === 'voice' ? 'voice'
      : 'text';

    // Use local URIs as photos in temp entry for immediate display
    const tempPhotos = params.mediaUris ?? [];

    const tempEntry: DiaryEntry = {
      id: tempId,
      pet_id: petId,
      user_id: user.id,
      content: params.text ?? '(media)',
      input_method: inputMethod,
      input_type: params.inputType,
      narration: null,
      mood_id: 'calm',
      mood_score: null,
      mood_source: 'manual',
      entry_type: 'manual',
      tags: [],
      photos: tempPhotos,
      is_special: false,
      is_registration_entry: false,
      linked_photo_analysis_id: null,
      entry_date: new Date().toISOString().split('T')[0],
      is_active: true,
      processing_status: 'processing' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Insert into cache immediately so the timeline shows the entry right away
    qc.setQueryData<DiaryEntry[]>(queryKey, (old) => [tempEntry, ...(old ?? [])]);

    // Background: classify → save → update cache entry to done/error
    const cachedPets = qc.getQueryData<Array<{id: string; species?: string}>>(['pets']) ?? [];
    const petSpecies = cachedPets.find(p => p.id === petId)?.species ?? 'dog';

    void _backgroundClassifyAndSave({
      qc, petId, userId: user.id, queryKey,
      tempId, originalEntry: tempEntry,
      text: params.text, photosBase64: params.photosBase64,
      inputType: params.inputType, photos: [],
      mediaUris: params.mediaUris,
      videoDuration: params.videoDuration,
      audioDuration: params.audioDuration,
      audioOriginalName: params.audioOriginalName,
      additionalContext: params.additionalContext,
      hasVideo: params.hasVideo,
      docBase64: params.docBase64,
      skipAI: params.skipAI,
      species: petSpecies,
      petName: cachedPets.find(p => p.id === petId)?.name ?? undefined,
      petBreed: cachedPets.find(p => p.id === petId)?.breed ?? undefined,
    });
  }, [petId, user, qc, queryKey]);

  // ── retryEntry — re-run classify+save for a failed temp entry ───────────────
  const retryEntry = React.useCallback(async (tempId: string): Promise<void> => {
    if (!user?.id) return;
    const entry = (qc.getQueryData<DiaryEntry[]>(queryKey) ?? []).find((e) => e.id === tempId);
    if (!entry) return;

    // Set back to processing
    qc.setQueryData<DiaryEntry[]>(queryKey, (old) =>
      old?.map((e) => e.id === tempId ? { ...e, processing_status: 'processing' as const } : e) ?? [],
    );

    void _backgroundClassifyAndSave({
      qc, petId, userId: user.id, queryKey,
      tempId, originalEntry: entry,
      text: entry.content, photosBase64: null,
      inputType: entry.input_method, photos: Array.isArray(entry.photos) ? entry.photos : [],
    });
  }, [petId, user, qc, queryKey]);

  return {
    // Step 1: classify
    classify: classifyMutation.mutateAsync,
    isClassifying: classifyMutation.isPending,
    classificationResult: classifyMutation.data ?? null,
    classificationError: classifyMutation.error,

    // Step 2: save
    saveEntry: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,

    // Fire-and-forget submit (optimistic UI + background AI)
    submitEntry,
    retryEntry,

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
