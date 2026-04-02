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
  if (classifications.length === 0) return;

  const today = new Date().toISOString().slice(0, 10);
  const linkedField: Record<string, string | undefined> = {};

  for (const cls of classifications) {
    const extracted = (cls.extracted_data ?? {}) as Record<string, unknown>;

    try {
      switch (cls.type) {

        case 'vaccine': {
          const { data } = await supabase.from('vaccines').insert({
            pet_id:           petId,
            user_id:          userId,
            name:             (extracted.vaccine_name as string) ?? (extracted.vaccine_type as string) ?? 'Vacina',
            laboratory:       (extracted.laboratory as string) ?? null,
            batch_number:     (extracted.batch_number as string) ?? (extracted.batch as string) ?? null,
            date_administered:(extracted.date as string) ?? today,
            next_due_date:    (extracted.next_due as string) ?? null,
            veterinarian:     (extracted.veterinarian as string) ?? (extracted.vet_name as string) ?? null,
            clinic:           (extracted.clinic as string) ?? null,
            status:           'up_to_date',
            source:           'ai',
          }).select('id').single();
          if (data?.id) {
            linkedField.linked_vaccine_id = data.id;
            const nextDue = extracted.next_due as string | undefined;
            if (nextDue) {
              createFutureEvent(
                petId, userId, diaryEntryId, 'vaccine',
                `Revacinação ${extracted.vaccine_name ?? ''}`.trim(),
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
          const { data } = await supabase.from('consultations').insert({
            pet_id:      petId,
            user_id:     userId,
            date:        (extracted.date as string) ?? today,
            veterinarian:(extracted.veterinarian as string) ?? (extracted.vet_name as string) ?? 'Veterinário',
            clinic:      (extracted.clinic as string) ?? (extracted.clinic_name as string) ?? null,
            type:        'checkup',
            summary:     (extracted.diagnosis as string) ?? (extracted.summary as string) ?? classification.narration ?? 'Consulta',
            diagnosis:   (extracted.diagnosis as string) ?? null,
            prescriptions:(extracted.prescriptions as string) ?? null,
            follow_up_at:(extracted.return_date as string) ?? null,
            source:      'ai',
          }).select('id').single();
          if (data?.id) {
            linkedField.linked_consultation_id = data.id;
            const returnDate = extracted.return_date as string | undefined;
            if (returnDate) {
              const vetName = (extracted.veterinarian as string) ?? (extracted.vet_name as string);
              createFutureEvent(
                petId, userId, diaryEntryId, 'return_visit',
                `Retorno${vetName ? ` · ${vetName}` : ''}`,
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
            name:         (extracted.medication_name as string) ?? 'Medicamento',
            dosage:       (extracted.dosage as string) ?? null,
            frequency:    (extracted.frequency as string) ?? 'conforme prescrito',
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
                `Fim do ${extracted.medication_name ?? 'medicamento'}`,
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
            name:        (extracted.exam_name as string) ?? 'Exame',
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
                (extracted.exam_name as string) ?? 'Exame',
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
          const rawCategory = (extracted.category as string) ?? (extracted.merchant_type as string) ?? 'outros';
          const category = VALID_EXPENSE_CATEGORIES.includes(rawCategory) ? rawCategory : 'outros';
          const { data } = await supabase.from('expenses').insert({
            pet_id:        petId,
            user_id:       userId,
            diary_entry_id:diaryEntryId,
            date:          (extracted.date as string) ?? today,
            vendor:        (extracted.merchant_name as string) ?? (extracted.vendor as string) ?? null,
            category,
            total:         Number(total) || 0,
            currency:      (extracted.currency as string) ?? 'BRL',
            description:   (extracted.description as string) ?? null,
            items:         items,
            source:        'ai',
          }).select('id').single();
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
            product_name:  (extracted.product_name as string) ?? null,
            brand:         (extracted.brand as string) ?? null,
            category:      (extracted.category as string) ?? null,
            portion_grams: extracted.portion_grams != null ? Number(extracted.portion_grams) : null,
            daily_portions:extracted.daily_portions != null ? Number(extracted.daily_portions) : 1,
            calories_kcal: extracted.calories_kcal != null ? Number(extracted.calories_kcal) : null,
            is_current:    (extracted.is_current as boolean) ?? false,
            notes:         (extracted.notes as string) ?? null,
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
            const { data } = await supabase.from('clinical_metrics').insert({
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
            if (data?.id) linkedField.linked_weight_metric_id = data.id;
          }
          break;
        }

        case 'grooming': {
          const groomDate = (extracted.date as string) ?? today;
          const groomTime = (extracted.time as string) ?? null;
          createFutureEvent(
            petId, userId, diaryEntryId, 'grooming',
            `Banho e tosa${extracted.establishment ? ` · ${extracted.establishment}` : ''}`,
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
              description:   (extracted.service_type as string) ?? 'Banho e tosa',
              source:        'ai',
            });
          }
          break;
        }

        case 'boarding': {
          const checkIn = (extracted.check_in_date as string) ?? today;
          const checkOut = (extracted.check_out_date as string) ?? null;
          createFutureEvent(
            petId, userId, diaryEntryId, 'boarding',
            `Hospedagem${extracted.establishment ? ` · ${extracted.establishment}` : ''}`,
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
              description:   'Hospedagem pet',
              source:        'ai',
            });
          }
          break;
        }

        case 'pet_sitter': {
          const sitterDate = (extracted.date as string) ?? today;
          createFutureEvent(
            petId, userId, diaryEntryId, 'pet_sitter',
            `Pet sitter${extracted.caretaker_name ? ` · ${extracted.caretaker_name}` : ''}`,
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
              description:   'Pet sitter',
              source:        'ai',
            });
          }
          break;
        }

        case 'dog_walker': {
          const walkDate = (extracted.date as string) ?? today;
          const walkTime = (extracted.start_time as string) ?? null;
          createFutureEvent(
            petId, userId, diaryEntryId, 'dog_walker',
            `Passeio${extracted.walker_name ? ` · ${extracted.walker_name}` : ''}`,
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
              description:   'Dog walker',
              source:        'ai',
            });
          }
          break;
        }

        case 'training': {
          const trainDate = (extracted.date as string) ?? today;
          createFutureEvent(
            petId, userId, diaryEntryId, 'training',
            `Adestramento${extracted.trainer_name ? ` · ${extracted.trainer_name}` : ''}`,
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
              description:   (extracted.session_type as string) ?? 'Adestramento',
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
              description:   (extracted.plan_name as string) ?? 'Plano funeral pet',
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
              description:    (extracted.product_name as string) ?? 'Compra',
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

          await supabase.from('clinical_metrics').insert(metricRow);

          // Generate pet_insights for clinically significant values
          checkMetricAlert(petId, userId, metricType, metricValue, {
            isFever:     Boolean(extracted.is_fever),
            isAbnormal:  Boolean(extracted.is_abnormal),
            markerName:  (extracted.marker_name as string) ?? null,
            secondary:   extracted.secondary_value != null ? Number(extracted.secondary_value) : null,
          }).catch(() => {});
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
  if (Object.keys(linkedField).length > 0) {
    await supabase.from('diary_entries').update(linkedField).eq('id', diaryEntryId);
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
        title = `Febre detectada (${value}°C)`;
        body  = `A temperatura registrada de ${value}°C está acima do normal. Consulte um veterinário se persistir.`;
        urgency = value >= 40.5 ? 'high' : 'medium';
      }
      break;
    case 'blood_glucose':
      if (value < 60) {
        title = `Hipoglicemia detectada (${value} mg/dL)`;
        body  = `Glicemia baixa (${value} mg/dL). Atenção imediata necessária.`;
        urgency = 'high';
      } else if (value > 200) {
        title = `Hiperglicemia detectada (${value} mg/dL)`;
        body  = `Glicemia elevada (${value} mg/dL). Recomenda-se consulta veterinária.`;
        urgency = 'high';
      }
      break;
    case 'oxygen_saturation':
      if (value < 95) {
        title = `Saturação de O₂ baixa (${value}%)`;
        body  = `SpO2 de ${value}% está abaixo do normal. Avalie com urgência.`;
        urgency = value < 90 ? 'high' : 'medium';
      }
      break;
    case 'blood_pressure':
      if (value > 160) {
        title = `Pressão arterial elevada (${value} mmHg)`;
        body  = `Pressão sistólica de ${value} mmHg está alta. Agende uma consulta.`;
        urgency = 'medium';
      }
      break;
    case 'lab_result':
      if (opts.isAbnormal && opts.markerName) {
        title = `${opts.markerName} fora do intervalo normal (${value})`;
        body  = `O marcador ${opts.markerName} está alterado. Verifique com seu veterinário.`;
        urgency = 'medium';
      }
      break;
    default:
      if (opts.isAbnormal) {
        title = `Métrica clínica alterada: ${metricType}`;
        body  = `Valor registrado: ${value}. Verificar com veterinário se necessário.`;
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
    action_label: 'Ver prontuário',
    source,
    is_active:    true,
  });
}

export interface SubmitEntryParams {
  text: string | null;
  photosBase64: string[] | null; // array of base64 images for AI analysis
  inputType: string;
  mediaUris?: string[];      // local file URIs for storage upload + immediate display
  videoDuration?: number;
  audioDuration?: number;
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
  mediaUris?: string[];
  videoDuration?: number;
  audioDuration?: number;
}): Promise<void> {
  const { qc, petId, userId, queryKey, tempId, originalEntry, text, photosBase64, inputType, photos, mediaUris, videoDuration, audioDuration } = opts;

  // Upload photo/gallery/scanner media before classify so URLs are ready for the DB entry
  let uploadedPhotos: string[] = photos;
  if (mediaUris && mediaUris.length > 0 && ['photo', 'gallery', 'ocr_scan'].includes(inputType)) {
    try {
      const { uploadPetMedia, getPublicUrl } = await import('../lib/storage');
      const paths = await Promise.all(
        mediaUris.map((uri) => uploadPetMedia(userId, petId, uri, 'photo')),
      );
      uploadedPhotos = paths.map((p) => getPublicUrl('pet-photos', p));
    } catch { /* non-critical — local URIs remain in temp entry */ }
  }

  try {
    const classification = await classifyDiaryEntry(
      petId, text, photosBase64, inputType, i18n.language,
    );

    const inputMethod: import('../types/database').DiaryEntry['input_method'] =
      ['photo', 'gallery', 'ocr_scan'].includes(inputType) ? 'photo'
      : inputType === 'voice' ? 'voice'
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

    if (classification.narration) {
      await api.updateDiaryNarration(
        entryId,
        classification.narration,
        Math.round((classification.mood_confidence ?? 0.5) * 100),
        classification.tags_suggested,
      );
    }

    // Update new diary_entries fields (non-critical)
    try {
      await (await import('../lib/supabase')).supabase
        .from('diary_entries')
        .update({
          input_type: inputType,
          primary_type: classification.primary_type,
          classifications: classification.classifications,
          mood_confidence: classification.mood_confidence,
          urgency: classification.urgency,
        })
        .eq('id', entryId);
    } catch { /* non-critical */ }

    // Upload video/audio media files (fire-and-forget, non-blocking)
    if (inputType === 'video' && mediaUris?.[0]) {
      void (async () => {
        try {
          const { uploadPetMedia, getPublicUrl } = await import('../lib/storage');
          const path = await uploadPetMedia(userId, petId, mediaUris[0], 'video');
          const url = getPublicUrl('pet-photos', path);
          await supabase.from('diary_entries').update({
            video_url: url,
            video_duration: videoDuration ?? null,
          }).eq('id', entryId);
        } catch {}
      })();
    }
    if (inputType === 'pet_audio' && mediaUris?.[0]) {
      void (async () => {
        try {
          const { uploadPetMedia, getPublicUrl } = await import('../lib/storage');
          const path = await uploadPetMedia(userId, petId, mediaUris[0], 'video');
          const url = getPublicUrl('pet-photos', path);
          await supabase.from('diary_entries').update({
            audio_url: url,
            audio_duration: audioDuration ?? null,
          }).eq('id', entryId);
        } catch {}
      })();
    }

    // Best-effort side effects
    const embeddingText = classification.narration
      ? `${text ?? ''}\n\n${classification.narration}`
      : (text ?? '');
    generateEmbedding(petId, 'diary', entryId, embeddingText, 0.5, userId).catch(() => {});
    updatePetRAG(petId, userId, entryId, classification.classifications ?? []).catch(() => {});
    saveToModule(petId, userId, entryId, classification).catch(() => {});
    import('../lib/achievements').then(({ checkAndAwardAchievements }) => {
      checkAndAwardAchievements(petId, userId, entryId).catch(() => {});
    }).catch(() => {});

    // Replace temp entry with real entry in cache
    const realEntry: import('../types/database').DiaryEntry = {
      ...entryData,
      id: entryId,
      narration: classification.narration ?? null,
      entry_type: 'manual',
      primary_type: classification.primary_type ?? 'moment',
      classifications: classification.classifications ?? [],
      input_type: inputType,
      urgency: classification.urgency ?? 'none',
      mood_confidence: classification.mood_confidence ?? null,
      is_registration_entry: false,
      linked_photo_analysis_id: null,
      entry_date: new Date().toISOString().split('T')[0],
      is_active: true,
      processing_status: 'done',
      created_at: originalEntry.created_at,
      updated_at: new Date().toISOString(),
    };

    // Mark SQLite pending entry as synced
    updatePendingStatus(tempId, 'synced');

    // Cache the real entry locally for offline reads
    cacheEntry({
      id:               realEntry.id,
      pet_id:           realEntry.pet_id,
      content:          realEntry.content,
      narration:        realEntry.narration,
      mood_id:          realEntry.mood_id,
      mood_score:       realEntry.mood_score,
      input_method:     realEntry.input_method,
      input_type:       (realEntry as unknown as Record<string, unknown>).input_type as string | null,
      primary_type:     (realEntry as unknown as Record<string, unknown>).primary_type as string | null,
      tags:             Array.isArray(realEntry.tags) ? realEntry.tags : [],
      photos:           Array.isArray(realEntry.photos) ? realEntry.photos : [],
      processing_status:'done',
      is_special:       realEntry.is_special,
      created_at:       realEntry.created_at,
      updated_at:       realEntry.updated_at,
    });

    qc.setQueryData<import('../types/database').DiaryEntry[]>(queryKey as unknown as ['pets', string, 'diary'], (old) =>
      old?.map((e) => e.id === tempId ? realEntry : e) ?? [],
    );
    qc.invalidateQueries({ queryKey: ['pets', petId, 'moods'] });
    qc.invalidateQueries({ queryKey: ['pets', petId, 'lens', 'achievements'] });
    qc.invalidateQueries({ queryKey: ['pets', petId, 'lens', 'travels'] });
    qc.invalidateQueries({ queryKey: ['pets', petId, 'lens', 'mood_trend'] });
    qc.invalidateQueries({ queryKey: ['pets', petId, 'lens', 'agenda'] });
    qc.invalidateQueries({ queryKey: ['pets', petId, 'scheduled_events'] });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Keep SQLite pending entry so useSyncQueue can retry when online
    updatePendingStatus(tempId, 'error', msg);

    qc.setQueryData<import('../types/database').DiaryEntry[]>(queryKey as unknown as ['pets', string, 'diary'], (old) =>
      old?.map((e) => e.id === tempId ? { ...e, processing_status: 'error' as const } : e) ?? [],
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

  // ── submitEntry — optimistic insert + background classify + save ────────────
  // Inserts a temp "processing" entry into the cache immediately, then runs
  // classify + save in the background. The caller navigates away right after.
  const submitEntry = React.useCallback(async (params: SubmitEntryParams): Promise<void> => {
    if (!user?.id) return;

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
      processing_status: (onlineManager.isOnline() ? 'processing' : 'pending') as 'processing' | 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Insert into cache immediately so the timeline shows the entry right away
    qc.setQueryData<DiaryEntry[]>(queryKey, (old) => [tempEntry, ...(old ?? [])]);

    // Background: classify → save → update cache entry to done/error
    void _backgroundClassifyAndSave({
      qc, petId, userId: user.id, queryKey,
      tempId, originalEntry: tempEntry,
      text: params.text, photosBase64: params.photosBase64,
      inputType: params.inputType, photos: [],
      mediaUris: params.mediaUris,
      videoDuration: params.videoDuration,
      audioDuration: params.audioDuration,
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
