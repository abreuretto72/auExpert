/**
 * ═══════════════════════════════════════════════════════════════════════════
 * lib/validate.ts
 *
 * Helpers de validação runtime — pegam um payload cru do Supabase e entregam
 * dados tipados + validados antes que cheguem à UI.
 *
 * Filosofia:
 *   - DEV (__DEV__ = true): falha ALTO e CEDO. Throw com detalhes do campo
 *     inválido. Dev corrige o schema ou descobre migration quebrada na hora.
 *   - PROD (__DEV__ = false): degrada GRACIOSAMENTE. Linhas inválidas são
 *     descartadas (safeArray) ou retorna null (safeOne), com log estruturado
 *     para telemetria posterior. O tutor nunca vê crash por shape mismatch.
 *
 * Por que não usar parse() direto no callsite:
 *   - Padronizar logging (prefixo [validate:${context}])
 *   - Padronizar diff dev vs prod
 *   - Dar ao caller o controle de pegar `data?.length` sem se preocupar em
 *     tratar N pontos de falha
 *
 * Uso típico (em lib/api.ts):
 *   const { data, error } = await supabase.from('pets').select(...);
 *   if (error) throw error;
 *   return safeArray(data, PetSchema, 'fetchPets');
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { type ZodType, type ZodError } from 'zod';

/**
 * Formata erros Zod para log legível. Pega os 3 primeiros issues — suficiente
 * pra diagnosticar sem inundar o console.
 */
function formatIssues(error: ZodError): string {
  return error.issues
    .slice(0, 3)
    .map((issue) => `  • ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
}

/**
 * Valida um array de rows vindo do Supabase.
 *
 * @param raw — payload bruto (geralmente `data` do `.select()`). Pode ser null/undefined.
 * @param schema — schema Zod que valida CADA item do array.
 * @param context — identificador para logs (ex: 'fetchPets', 'fetchVaccines:petId=xxx').
 *
 * @returns Array tipado e validado. Vazio se raw for null/undefined.
 *
 * Comportamento:
 *   - raw null/undefined → retorna []
 *   - raw não é array → dev throw, prod retorna [] com log
 *   - cada row passa pelo schema individualmente
 *   - rows válidas passam, rows inválidas são filtradas em prod (logadas)
 *   - em dev, qualquer row inválida causa throw (falha alto e cedo)
 */
export function safeArray<T>(
  raw: unknown,
  schema: ZodType<T>,
  context: string
): T[] {
  if (raw == null) return [];

  if (!Array.isArray(raw)) {
    const message = `[validate:${context}] expected array, got ${typeof raw}`;
    if (__DEV__) throw new Error(message);
    console.error(message, { raw });
    return [];
  }

  const valid: T[] = [];
  let rejected = 0;

  for (let i = 0; i < raw.length; i++) {
    const result = schema.safeParse(raw[i]);
    if (result.success) {
      valid.push(result.data);
    } else {
      rejected++;
      const issues = formatIssues(result.error);
      if (__DEV__) {
        // Em dev, falha alto e cedo — o dev precisa ver que o schema está
        // desalinhado com a realidade do banco. Throw na primeira linha ruim
        // evita ruído (resto do array provavelmente tem o mesmo problema).
        throw new Error(
          `[validate:${context}] row ${i} failed validation:\n${issues}\n\n` +
            `Row data: ${JSON.stringify(raw[i], null, 2)}`
        );
      }
      // Em prod, loga e descarta — mantém o app vivo com os dados bons.
      console.error(`[validate:${context}] rejected row ${i}:\n${issues}`);
    }
  }

  if (rejected > 0 && !__DEV__) {
    console.warn(
      `[validate:${context}] ${rejected}/${raw.length} rows rejected, ${valid.length} delivered`
    );
  }

  return valid;
}

/**
 * Valida uma única row vinda do Supabase (típico de `.single()` ou `.maybeSingle()`).
 *
 * @param raw — payload bruto. Pode ser null/undefined se a query usou maybeSingle().
 * @param schema — schema Zod.
 * @param context — identificador para logs.
 *
 * @returns Objeto tipado e validado, ou null se raw for null/undefined OU (em prod) se inválido.
 *
 * Comportamento:
 *   - raw null/undefined → retorna null (sem log — "não encontrado" é estado válido)
 *   - validação falha em dev → throw
 *   - validação falha em prod → retorna null + log
 */
export function safeOne<T>(
  raw: unknown,
  schema: ZodType<T>,
  context: string
): T | null {
  if (raw == null) return null;

  const result = schema.safeParse(raw);
  if (result.success) return result.data;

  const issues = formatIssues(result.error);
  const message = `[validate:${context}] row failed validation:\n${issues}`;
  if (__DEV__) {
    throw new Error(`${message}\n\nRow data: ${JSON.stringify(raw, null, 2)}`);
  }
  console.error(message);
  return null;
}
