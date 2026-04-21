/**
 * persistDewormingOrAntiparasitic — creates a scheduled_event for a deworming
 * or antiparasitic treatment.
 *
 * Extracted verbatim from the SHARED `case 'deworming':` / `case 'antiparasitic':`
 * arm of `hooks/_diary/saveToModule.ts`. Dispatcher maps both classifier types
 * to this single persister.
 *
 * ⚠️  KNOWN LATENT BUG — PRESERVED VERBATIM
 * The original arm references an identifier `type` that is NOT declared in any
 * enclosing scope (the classification loop variable is `cls`, not `type`). At
 * runtime this throws ReferenceError, which the original per-classification
 * try/catch silently swallows. The net effect in production: BOTH deworming
 * and antiparasitic classifications never create a scheduled_event.
 *
 * We intentionally replicate the broken behavior here so `git blame` / triage
 * can still find the ReferenceError. The fix is a SEPARATE follow-up commit
 * (`ctx.moduleType === 'deworming' ? 'deworming' : 'antiparasitic'`) and must
 * NOT be bundled with this refactor — per the project's refactor discipline
 * (never mix extraction with bug fixes).
 *
 * Behavior preserved exactly:
 *   - Event date: `extracted.date` → `ctx.today`.
 *   - Event type param is `type === 'deworming' ? 'deworming' : 'antiparasitic'`
 *     — `type` is undeclared → ReferenceError → swallowed by dispatcher.
 *   - Event title: `product_name` → i18n `ai.event.deworming`.
 *   - Time: `${date}T09:00:00`, all-day true.
 *   - Vet passes through, location null.
 *   - No linkedField.
 */
import i18n from '../../../i18n';
import { createFutureEvent } from './createFutureEvent';
import type { Persister } from './types';

// Preserves pre-existing ReferenceError from the original case body: identifier
// `type` is not declared at runtime (was intended to be `cls.type` /
// `ctx.moduleType`). `declare const` satisfies the TS type checker without
// emitting any runtime binding, so the compiled JS still throws ReferenceError
// — which the dispatcher's per-classification try/catch swallows. This is
// exactly the behavior we want to preserve during extraction.
// Fixing the bug is a follow-up commit; do NOT bundle with this refactor.
declare const type: string;

export const persistDewormingOrAntiparasitic: Persister = async (extracted, ctx) => {
  const dewDate = (extracted.date as string) ?? ctx.today;
  createFutureEvent(
    ctx.petId, ctx.userId, ctx.diaryEntryId,
    type === 'deworming' ? 'deworming' : 'antiparasitic',
    (extracted.product_name as string) ?? i18n.t('ai.event.deworming'),
    `${dewDate}T09:00:00`, true,
    (extracted.veterinarian as string) ?? null,
    null,
  ).catch(() => {});
};
