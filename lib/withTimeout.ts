/**
 * ═══════════════════════════════════════════════════════════════════════════
 * lib/withTimeout.ts
 *
 * Timeout wrapper para Promises — garante que nenhuma requisição deixa o tutor
 * preso num spinner infinito.
 *
 * Motivação (CLAUDE.md §12.4):
 *   "Timeout em toda requisição — não deixar o tutor esperando para sempre"
 *   "Mostrar spinner infinito sem timeout — após 15s, exibir mensagem + botão retry"
 *
 * Comportamento:
 *   - Se a Promise resolve antes de `ms` → valor passa adiante normalmente
 *   - Se a Promise rejeita antes de `ms` → erro passa adiante SEM alteração
 *     (preserva erros do Supabase, da rede, etc. para o caller tratar)
 *   - Se expira `ms` antes de settle → rejeita com TimeoutError
 *
 * Integração com getErrorMessage:
 *   TimeoutError tem name === 'TimeoutError'. utils/errorMessages.ts detecta
 *   por name (sem import — evita ciclo lib/ ↔ utils/) e mapeia para a chave
 *   i18n `errors.timeout` (voz do pet, amigável).
 *
 * Uso típico em lib/api.ts:
 *   const { data, error } = await withTimeout(
 *     supabase.from('pets').select('*').eq('is_active', true),
 *     DEFAULT_TIMEOUT_MS,
 *     'fetchPets:owned',
 *   );
 *
 * Aceita PromiseLike<T> para compatibilidade com PostgrestBuilder do Supabase
 * (thenable que só dispara a query quando .then() é chamado).
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Timeout padrão — 15 segundos. CLAUDE.md §12.4 estabelece esse limite:
 * após 15s, o tutor recebe mensagem amigável + botão retry.
 */
export const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * Erro específico para requisições que excederam o timeout.
 *
 * O `name` é checado por utils/errorMessages.ts via string match (não
 * `instanceof`) para evitar import circular entre lib/ e utils/. Portanto
 * NUNCA renomear essa classe sem atualizar o mapeamento lá.
 */
export class TimeoutError extends Error {
  readonly context: string;
  readonly ms: number;

  constructor(context: string, ms: number) {
    super(`[timeout:${context}] request exceeded ${ms}ms`);
    this.name = 'TimeoutError';
    this.context = context;
    this.ms = ms;

    // Preservar stack trace onde disponível (V8/Hermes).
    const ctor = Error as unknown as {
      captureStackTrace?: (target: object, constructor: unknown) => void;
    };
    if (typeof ctor.captureStackTrace === 'function') {
      ctor.captureStackTrace(this, TimeoutError);
    }
  }
}

/**
 * Race entre a Promise original e um setTimeout que rejeita com TimeoutError.
 *
 * @param promise — a Promise (ou PromiseLike) a ser monitorada.
 * @param ms      — timeout em milissegundos (default 15s, CLAUDE.md §12.4).
 * @param context — identificador para logs e mensagem de erro (ex: 'fetchPets').
 *
 * @returns O valor da Promise se resolver a tempo.
 *          Rejeita com TimeoutError se expirar.
 *          Repassa o erro original se a Promise falhar antes do timeout.
 *
 * O setTimeout é SEMPRE cancelado no finally, independente do resultado,
 * para evitar leak de timers em listas longas de queries.
 */
export function withTimeout<T>(
  promise: Promise<T> | PromiseLike<T>,
  ms: number = DEFAULT_TIMEOUT_MS,
  context: string = 'unknown',
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new TimeoutError(context, ms));
    }, ms);
  });

  // Promise.resolve() converte PromiseLike (ex: PostgrestBuilder) em Promise real
  // e dispara a execução (via .then interno). Race resolve com quem vier primeiro.
  return Promise.race([Promise.resolve(promise), timeoutPromise]).finally(() => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  });
}
