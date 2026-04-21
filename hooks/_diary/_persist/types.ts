/**
 * Shared types for the _persist/ module system.
 *
 * Each persister (persistVaccine, persistConsultation, …) receives the same
 * `PersistContext` plus the already-narrowed `extracted_data` object produced
 * by the classifier for its own module type.
 *
 * A persister may return `{ linkedField }` to contribute one or more
 * `linked_*_id` columns that the dispatcher will write back onto the
 * `diary_entries` row at the end of the pipeline. Persisters that don't link
 * anything (memorial, connection, food, grooming, …) may simply return void.
 */
import type { useQueryClient } from '@tanstack/react-query';
import type { ClassifyDiaryResponse } from '../../../lib/ai';

// Linked-ID columns on diary_entries. All optional — a persister writes only
// the key it owns. Keys must match real DB columns on `diary_entries`.
export type LinkedFields = {
  linked_vaccine_id?: string;
  linked_consultation_id?: string;
  linked_medication_id?: string;
  linked_exam_id?: string;
  linked_expense_id?: string;
  linked_plan_id?: string;
  linked_travel_id?: string;
  linked_weight_metric_id?: string;
};

// Context passed to every persister. Stable across the whole `saveToModule`
// call so persisters can reference `today` and the full classification array
// (needed by persistExpense for context inference from sibling classifications).
//
// `moduleType` is the `cls.type` of the classification being processed in THIS
// invocation. The dispatcher sets it per-invocation. Needed by persisters that
// serve multiple classifier types from a single body (persistPlan handles both
// 'plan' and 'insurance' and branches on this field to decide plan_type).
export type PersistContext = {
  petId: string;
  userId: string;
  diaryEntryId: string;
  today: string;
  classification: ClassifyDiaryResponse;
  moduleType: string;
  qc?: ReturnType<typeof useQueryClient>;
};

// A persister narrows the extracted_data payload and writes to its own domain
// table. It may optionally return linked IDs for the dispatcher to propagate
// onto the diary_entries row.
export type Persister = (
  extracted: Record<string, unknown>,
  ctx: PersistContext,
) => Promise<{ linkedField?: Partial<LinkedFields> } | void>;
