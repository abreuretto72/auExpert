/**
 * persistPurchase — records a general product purchase (toys, beds, tech, etc.).
 *
 * Extracted verbatim from the `case 'purchase'` arm of
 * `hooks/_diary/saveToModule.ts`. Unlike grooming/boarding/etc., purchase does
 * NOT create a scheduled_event — purchases are past events by nature.
 *
 * Only writes an `expenses` row (when a price is present). The expense
 * category is inferred from `purchase_category` via a local map; when the map
 * lookup fails, falls back to 'acessorios' (NOT 'outros') because any
 * purchase that reached this arm is already known to be a physical product.
 *
 * Behavior preserved exactly:
 *   - Category map:
 *       technology        → tecnologia
 *       health_equipment  → saude
 *       hygiene           → higiene
 *       sanitation        → higiene   (grouped with hygiene)
 *       comfort           → acessorios
 *       accessories       → acessorios
 *       sport             → esporte
 *       leisure           → lazer
 *   - Default fallback: 'acessorios'.
 *   - Skips insert when `price` is null/zero-ish (guarded by `if (purchaseAmount)`).
 *   - Description: explicit `product_name` when known, else default i18n key.
 *   - Currency hardcoded to 'BRL'.
 *   - No linkedField return.
 */
import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';
import type { Persister } from './types';

export const persistPurchase: Persister = async (extracted, ctx) => {
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
      pet_id:         ctx.petId,
      user_id:        ctx.userId,
      diary_entry_id: ctx.diaryEntryId,
      date:           (extracted.date as string) ?? ctx.today,
      vendor:         (extracted.merchant_name as string) ?? null,
      category:       purchaseExpCat,
      total:          purchaseAmount,
      currency:       'BRL',
      description:    (extracted.product_name as string) ?? i18n.t('ai.expense.purchase'),
      source:         'ai',
    });
  }
};
