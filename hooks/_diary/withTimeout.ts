/**
 * withTimeout — wraps a Promise with an independent deadline.
 *
 * Each media-analysis routine in the diary pipeline uses this to enforce
 * per-type time limits without affecting the other parallel routines.
 *
 * Usage:
 *   const result = await withTimeout(analyzeVideo(...), 45_000, 'video');
 *   // Throws TimeoutError if 45 s elapse before the promise settles.
 */

export class TimeoutError extends Error {
  readonly label: string;
  constructor(label: string) {
    super(`timeout:${label}`);
    this.label = label;
    this.name = 'TimeoutError';
  }
}

/**
 * Races `promise` against a timeout of `ms` milliseconds.
 * Rejects with `TimeoutError(label)` if the deadline is reached first.
 *
 * @param promise - The async operation to race.
 * @param ms      - Deadline in milliseconds.
 * @param label   - Human-readable label for error messages (e.g. 'video', 'ocr').
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let handle: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    handle = setTimeout(() => reject(new TimeoutError(label)), ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(handle);
  });
}
