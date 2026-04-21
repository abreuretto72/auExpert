/**
 * saveToModule — persists every classification produced by the AI into the
 * correct domain table (vaccines, consultations, medications, exams, expenses,
 * nutrition_records, pet_plans, pet_travels, clinical_metrics, scheduled_events,
 * pet_connections, pets).
 *
 * Pass 3 of the refactor: this file is now a thin DISPATCHER. The per-module
 * persistence logic lives in `./_persist/persist<Module>.ts` — one file per
 * classifier type (or shared body, e.g. consultation + return_visit). Each
 * persister is a pure async function with the `Persister` signature; it writes
 * to its own domain table and optionally returns `{ linkedField }` so the
 * dispatcher can write back `linked_*_id` columns onto the `diary_entries` row.
 *
 * Pipeline (unchanged vs. the monolith):
 *   1. Iterate classifications (per-classification try/catch isolation).
 *   2. For each, look up a persister by `cls.type` in PERSISTER_MAP.
 *   3. Call it with a fresh PersistContext (stable petId/userId/today/…, plus
 *      `moduleType: cls.type` so shared persisters can branch).
 *   4. Merge the returned linkedField into the cumulative `linkedField` object.
 *   5. After the loop: sync root-level `clinical_metrics[type=weight]` onto
 *      pets.weight_kg (safety net for when the AI puts the weight at the
 *      response root instead of / in addition to classifications[type=weight]).
 *   6. If any linkedField was set, update the diary_entries row.
 *
 * Types NOT in PERSISTER_MAP are no-ops:
 *   emergency, place_visit, documentation, lost_found, adoption,
 *   symptom, mood_event, activity, moment
 * (Same behavior as the `default: break` arm of the original switch.)
 *
 * Public surface:
 *   - saveToModule(petId, userId, diaryEntryId, classification, qc?)
 */
import type { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { ClassifyDiaryResponse } from '../../lib/ai';
import type { Persister, PersistContext } from './_persist/types';

// All per-module persisters (one file each in ./_persist/)
import { persistVaccine } from './_persist/persistVaccine';
import { persistConsultation } from './_persist/persistConsultation';
import { persistMedication } from './_persist/persistMedication';
import { persistExam } from './_persist/persistExam';
import { persistExpense } from './_persist/persistExpense';
import { persistConnection } from './_persist/persistConnection';
import { persistFood } from './_persist/persistFood';
import { persistPlan } from './_persist/persistPlan';
import { persistTravel } from './_persist/persistTravel';
import { persistWeight } from './_persist/persistWeight';
import { persistGrooming } from './_persist/persistGrooming';
import { persistBoarding } from './_persist/persistBoarding';
import { persistPetSitter } from './_persist/persistPetSitter';
import { persistDogWalker } from './_persist/persistDogWalker';
import { persistTraining } from './_persist/persistTraining';
import { persistFuneralPlan } from './_persist/persistFuneralPlan';
import { persistPurchase } from './_persist/persistPurchase';
import { persistMemorial } from './_persist/persistMemorial';
import { persistClinicalMetric } from './_persist/persistClinicalMetric';
import { persistDewormingOrAntiparasitic } from './_persist/persistDewormingOrAntiparasitic';
import { persistSurgery } from './_persist/persistSurgery';
import { persistPhysiotherapy } from './_persist/persistPhysiotherapy';
import { persistScheduledEvent } from './_persist/persistScheduledEvent';

// Dispatcher table — classifier type → persister.
// Shared persisters are referenced by multiple keys (consultation+return_visit,
// plan+insurance, deworming+antiparasitic). Any classifier type NOT listed
// here is silently ignored (no-op default, matching the original switch).
const PERSISTER_MAP: Record<string, Persister> = {
  vaccine:         persistVaccine,
  consultation:    persistConsultation,
  return_visit:    persistConsultation,
  medication:      persistMedication,
  exam:            persistExam,
  expense:         persistExpense,
  connection:      persistConnection,
  food:            persistFood,
  plan:            persistPlan,
  insurance:       persistPlan,
  travel:          persistTravel,
  weight:          persistWeight,
  grooming:        persistGrooming,
  boarding:        persistBoarding,
  pet_sitter:      persistPetSitter,
  dog_walker:      persistDogWalker,
  training:        persistTraining,
  funeral_plan:    persistFuneralPlan,
  purchase:        persistPurchase,
  memorial:        persistMemorial,
  clinical_metric: persistClinicalMetric,
  deworming:       persistDewormingOrAntiparasitic,
  antiparasitic:   persistDewormingOrAntiparasitic,
  surgery:         persistSurgery,
  physiotherapy:   persistPhysiotherapy,
  scheduled_event: persistScheduledEvent,
};

// ── saveToModule — writes ALL classified items to their correct health tables ─
// Iterates every classification (not just primaryType) so a single diary entry
// that mentions a vaccine + consultation + weight all get saved correctly.

export async function saveToModule(
  petId: string,
  userId: string,
  diaryEntryId: string,
  classification: ClassifyDiaryResponse,
  qc?: ReturnType<typeof useQueryClient>,
): Promise<void> {
  const classifications = classification.classifications ?? [];
  console.log('[MOD] saveToModule | classifications:', classifications.length);
  classifications.forEach((c, i) => console.log(`[MOD] cls[${i}]: ${c.type} (${c.confidence})`));
  if (classifications.length === 0) return;

  const today = new Date().toISOString().slice(0, 10);
  const linkedField: Record<string, string | undefined> = {};

  for (const cls of classifications) {
    const persister = PERSISTER_MAP[cls.type];
    if (!persister) continue;  // no-op for unhandled types (emergency, symptom, …)

    const extracted = (cls.extracted_data ?? {}) as Record<string, unknown>;
    const ctx: PersistContext = {
      petId,
      userId,
      diaryEntryId,
      today,
      classification,
      moduleType: cls.type,
      qc,
    };

    try {
      const result = await persister(extracted, ctx);
      if (result?.linkedField) Object.assign(linkedField, result.linkedField);
    } catch {
      // Per-classification isolation: one failed insert never blocks the others
    }
  }

  // Safety net: sync weight from root-level clinical_metrics when AI puts it there
  // instead of (or in addition to) classifications[type=weight]
  const rootMetrics = classification.clinical_metrics ?? [];
  const rootWeight = rootMetrics.find((m) => m.type === 'weight');
  if (rootWeight?.value != null) {
    const numericWeight = typeof rootWeight.value === 'string'
      ? parseFloat((rootWeight.value as string).replace(',', '.'))
      : Number(rootWeight.value);
    if (!isNaN(numericWeight)) {
      const { error: rwErr } = await supabase
        .from('pets')
        .update({ weight_kg: numericWeight })
        .eq('id', petId)
        .eq('is_active', true);
      console.log('[MOD] peso sync (root clinical_metrics):', numericWeight, '| erro:', rwErr?.message);
      if (!rwErr) {
        qc?.invalidateQueries({ queryKey: ['pets'] });
        qc?.invalidateQueries({ queryKey: ['pet', petId] });
        qc?.invalidateQueries({ queryKey: ['pets', petId, 'clinical_metrics'] });
        qc?.invalidateQueries({ queryKey: ['pets', petId, 'lens', 'metrics'] });
        qc?.invalidateQueries({ queryKey: ['nutricao', petId] });
      }
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
