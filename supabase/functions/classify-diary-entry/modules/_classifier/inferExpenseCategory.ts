/**
 * Expense category inference fallback — if the AI returned
 * `expense.category = 'outros'` (or blank/other) but other classifications
 * in the same entry provide clear context, override it. This is a safety
 * net; the system prompt already instructs the AI to do this, but this
 * fallback guarantees correctness even if the AI misses it.
 */

import type { Classification } from './types.ts';

// ── Expense category inference fallback ──

/**
 * If the AI returned expense.category = 'outros' (or blank/other) but
 * other classifications in the same entry provide clear context, override it.
 * This is a safety net — the system prompt already instructs the AI to do this,
 * but the fallback guarantees correctness even if the AI misses it.
 */
export function inferExpenseCategory(classifications: Classification[]): Classification[] {
  const types = classifications.map((c) => c.type);

  return classifications.map((cls) => {
    if (cls.type !== 'expense') return cls;

    const cat = cls.extracted_data?.category as string | undefined;
    if (cat && cat !== 'outros' && cat !== 'other' && cat !== '') {
      return cls; // already has a valid category — keep it
    }

    let inferred = 'outros';

    if (types.some((t) =>
      ['consultation', 'exam', 'surgery', 'vaccine', 'medication',
        'clinical_metric', 'symptom', 'emergency'].includes(t)
    )) {
      inferred = 'saude';
    } else if (types.includes('grooming')) {
      inferred = 'higiene';
    } else if (types.includes('food')) {
      inferred = 'alimentacao';
    } else if (types.includes('boarding')) {
      inferred = 'hospedagem';
    } else if (types.some((t) => ['dog_walker', 'pet_sitter'].includes(t))) {
      inferred = 'cuidados';
    } else if (types.includes('training')) {
      inferred = 'treinamento';
    } else if (types.some((t) => ['plan', 'insurance', 'funeral_plan'].includes(t))) {
      inferred = 'plano';
    }

    if (inferred !== 'outros') {
      console.log(`[classifier] inferExpenseCategory: overriding '${cat ?? ''}' → '${inferred}' (context types: ${types.filter(t => t !== 'expense').join(', ')})`);
    }

    return {
      ...cls,
      extracted_data: { ...cls.extracted_data, category: inferred },
    };
  });
}
