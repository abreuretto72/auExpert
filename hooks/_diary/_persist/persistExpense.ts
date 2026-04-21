/**
 * persistExpense — records an expense row, normalizing the wide variety of
 * category strings the classifier (and OCR variants) may return into one of
 * the 18 valid DB enum values.
 *
 * Extracted verbatim from the `case 'expense'` arm of
 * `hooks/_diary/saveToModule.ts`.
 *
 * This persister is the ONLY one that uses sibling classifications — when the
 * classifier didn't supply a category string at all, we infer from what OTHER
 * classifications are present in the same response (e.g. an expense alongside
 * a 'consultation' classification → category 'saude'). This is why
 * `PersistContext.classification` holds the full ClassifyDiaryResponse, not a
 * narrowed subset.
 *
 * Behavior preserved exactly:
 *   - Total calculation priority: `amount` → `total` → sum of
 *     `items[].qty * items[].unit_price` (with qty default 1, unit_price default 0).
 *   - Valid categories whitelist (18 values) matches DB enum.
 *   - CATEGORY_ALIASES map covers PT-BR + EN classifier outputs AND OCR-specific
 *     values (`veterinary_service`, `general_purchase`, `non_pet`, etc.).
 *   - `rawCategory` priority: `category` → `merchant_type` → empty. Lowercased + trimmed.
 *   - Context inference RUNS ONLY when rawCategory is empty — otherwise whatever
 *     the classifier said takes precedence (CATEGORY_ALIASES lookup, then raw fallback).
 *   - Final guard: if the normalized value isn't in the whitelist, fall back to 'outros'.
 *   - Expense row uses `diary_entry_id` (not linked_*_id — that direction is reversed:
 *     `linked_expense_id` goes ONTO the diary entry via linkedField return).
 *   - currency fallback 'BRL'; vendor supports two field names (`merchant_name`|`vendor`).
 *   - console.log preserved for production debugging of expense save path.
 *   - Returns `linked_expense_id` only when insert yielded an id.
 */
import { supabase } from '../../../lib/supabase';
import type { Persister } from './types';

const VALID_EXPENSE_CATEGORIES = [
  'saude', 'alimentacao', 'higiene', 'hospedagem', 'cuidados', 'treinamento',
  'acessorios', 'tecnologia', 'plano', 'funerario', 'emergencia', 'lazer',
  'documentacao', 'esporte', 'memorial', 'logistica', 'digital', 'outros',
];

// Normalize synonyms the classifier may return (especially older model versions).
// Also covers OCR-specific category values: food | veterinary_service | medication |
// grooming | boarding | accessory | general_purchase | non_pet
const CATEGORY_ALIASES: Record<string, string> = {
  // Health
  veterinario: 'saude', veterinary: 'saude', veterinary_service: 'saude',
  health: 'saude', medical: 'saude', vet: 'saude',
  consulta: 'saude', vacina: 'saude', exame: 'saude',
  // Medication (health)
  medication: 'saude', medicamento: 'saude', remedio: 'saude', remédio: 'saude',
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
  // Accessories (OCR returns 'accessory')
  accessory: 'acessorios', accessories: 'acessorios',
  acessório: 'acessorios', acessórios: 'acessorios',
  // Plans
  insurance: 'plano', plan: 'plano', plano: 'plano', seguro: 'plano',
  // General / non-pet → outros
  general_purchase: 'outros', non_pet: 'outros',
  other: 'outros', outro: 'outros', others: 'outros',
};

export const persistExpense: Persister = async (extracted, ctx) => {
  const items = (extracted.items as Array<{ name: string; qty: number; unit_price: number }>) ?? [];
  const totalRaw = (extracted.amount as number) ?? (extracted.total as number);
  const total = totalRaw ?? items.reduce((sum, i) => sum + (i.qty ?? 1) * (i.unit_price ?? 0), 0);

  const rawCategory = ((extracted.category as string) ?? (extracted.merchant_type as string) ?? '').toLowerCase().trim();

  // Context-based inference when category is missing: look at sibling classification types
  const inferredFromContext = (() => {
    if (rawCategory) return null;
    const types = ctx.classification.classifications.map((c) => c.type);
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
    pet_id:         ctx.petId,
    user_id:        ctx.userId,
    diary_entry_id: ctx.diaryEntryId,
    date:           (extracted.date as string) ?? ctx.today,
    vendor:         (extracted.merchant_name as string) ?? (extracted.vendor as string) ?? null,
    category,
    total:          Number(total) || 0,
    currency:       (extracted.currency as string) ?? 'BRL',
    notes:          (extracted.description as string) ?? null,
    items:          items,
    source:         'ai',
  }).select('id').single();

  console.log('[MOD] gasto salvo:', data?.id?.slice(-8), 'total:', extracted.amount ?? total, '| erro:', expErr?.message);

  if (!data?.id) return;
  return { linkedField: { linked_expense_id: data.id } };
};
