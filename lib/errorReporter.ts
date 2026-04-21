/**
 * ═══════════════════════════════════════════════════════════════════════════
 * lib/errorReporter.ts
 *
 * Ponto único de captura de erros não-tratados para toda a app.
 *
 * Motivação (CLAUDE.md §12 — Resiliência):
 *   O app NUNCA pode quebrar silenciosamente na mão do tutor. Mesmo erros
 *   que o ErrorBoundary captura (crashes de render) ou que chegam a rejections
 *   não-tratadas precisam deixar rastro — para debug local hoje, para
 *   observabilidade remota (Sentry/Bugsnag/etc) amanhã.
 *
 * Arquitetura:
 *   reportError(err, ctx) é a fachada ÚNICA. Todos os boundaries e try/catch
 *   críticos chamam ela. Internamente, ela delega pro `sink` — função
 *   plugável que começa como um logger de console e pode ser trocada por
 *   Sentry via `setErrorSink()` sem tocar em nenhum call site.
 *
 * Contrato de não-quebrar:
 *   Se o próprio sink lançar (ex: rede caiu no meio do envio pro Sentry),
 *   a exceção é engolida. Um error reporter que quebra a app é pior que
 *   um error reporter que não reporta.
 *
 * Uso típico:
 *   - components/ErrorBoundary.tsx → reportError(err, { boundary: 'global', componentStack })
 *   - components/SectionErrorBoundary.tsx → reportError(err, { boundary: 'section', section, componentStack })
 *   - Futuramente: rejections globais, catch em Edge Functions calls, etc.
 *
 * Integração com Sentry (quando chegar a hora):
 *   import * as Sentry from '@sentry/react-native';
 *   Sentry.init({ dsn: ... });
 *   setErrorSink((err, ctx) => Sentry.captureException(err, { extra: ctx }));
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Contexto estruturado anexado a cada erro reportado.
 * Campos conhecidos são tipados; o resto é livre para cada call site anexar
 * dados relevantes (petId, entryId, screen, etc).
 */
export interface ErrorContext {
  /** Qual boundary capturou: 'global' (root) ou 'section' (por aba/tela). */
  boundary?: 'global' | 'section';
  /** Nome da seção, quando boundary === 'section'. Ex: 'diary', 'health'. */
  section?: string;
  /** Component stack do React — vem do segundo arg de componentDidCatch. */
  componentStack?: string | null;
  /** Qualquer outro dado útil pro diagnóstico. */
  [key: string]: unknown;
}

/**
 * Assinatura do sink — função que realmente faz algo com o erro.
 * Plugável: dev usa console, prod pode usar Sentry/Bugsnag/etc.
 */
export type ErrorSink = (error: unknown, context: ErrorContext) => void;

/**
 * Sink padrão — loga no console com prefixo reconhecível.
 *
 * - __DEV__: imprime erro + contexto + stack de forma legível
 * - prod: ainda loga (console.error persiste em crash reports nativos),
 *   mas sem stack expandida. Quando Sentry entrar, este sink é trocado
 *   e o console.error some.
 */
const defaultSink: ErrorSink = (error, context) => {
  const label = context.boundary
    ? `[errorReporter:${context.boundary}${context.section ? `:${context.section}` : ''}]`
    : '[errorReporter]';

  if (__DEV__) {
    // Dev: verbose — a stack é a peça mais útil em dev.
    console.error(label, error, context);
  } else {
    // Prod: mais enxuto. Quando Sentry for plugado, isso desaparece.
    console.error(label, serializeError(error), sanitizeContext(context));
  }
};

/** Sink ativo. Pode ser trocado em runtime via setErrorSink(). */
let activeSink: ErrorSink = defaultSink;

/**
 * Troca o sink global — ponto de entrada para futura integração com
 * serviço de observabilidade (Sentry, Bugsnag, etc).
 *
 * Deve ser chamado cedo no boot da app (antes do primeiro render).
 */
export function setErrorSink(sink: ErrorSink): void {
  activeSink = sink;
}

/**
 * Reporta um erro para o sink ativo.
 *
 * NUNCA lança — se o sink falhar, a exceção é engolida silenciosamente.
 * Um error reporter que quebra a app é pior que um que não reporta.
 *
 * @param error   — o erro capturado. Aceita `unknown` porque catch blocks
 *                  no TypeScript estrito recebem unknown.
 * @param context — contexto estruturado (boundary, section, componentStack,
 *                  e qualquer metadado extra relevante).
 */
export function reportError(error: unknown, context: ErrorContext = {}): void {
  try {
    activeSink(error, context);
  } catch {
    // Silêncio proposital. Se o sink quebrar, não podemos quebrar a app
    // que estamos TENTANDO proteger. No máximo, um console.warn de fallback.
    if (__DEV__) {
      // Em dev, ao menos avisa que o próprio reporter engasgou.
      try {
        console.warn('[errorReporter] sink threw — error swallowed to protect the app');
      } catch {
        // Se nem console.warn funciona, o app já está além de salvação.
      }
    }
  }
}

/**
 * Serializa um Error pra objeto JSON-safe. Útil em prod onde não queremos
 * o dump verbose do console.error padrão.
 *
 * Error padrão não serializa bem via JSON.stringify — `name`, `message` e
 * `stack` são enumerable: false no protótipo.
 */
function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      // Stack pode vazar paths do dispositivo — em prod real, considere truncar
      // ou omitir. Por enquanto, é útil no Sentry equivalent.
      stack: error.stack,
    };
  }
  // Erro não-Error (string lançada, objeto qualquer, null, etc).
  return { value: error };
}

/**
 * Remove campos potencialmente sensíveis ou muito grandes do contexto
 * antes de logar em prod. Hoje é identidade — fica como hook pra quando
 * o contexto crescer e precisarmos filtrar PII.
 */
function sanitizeContext(context: ErrorContext): ErrorContext {
  // TODO(observability): filtrar PII quando houver campos como email/token.
  return context;
}
