import i18n from '../i18n';

interface ApiError {
  status?: number;
  code?: string;
  message?: string;
}

const ERROR_KEYS: Record<string, string> = {
  network: 'errors.network',
  // timeout aponta para chave dedicada — mensagem "isso tá demorando demais"
  // é mais específica que "sem conexão" (caso comum é backend lento, não rede).
  timeout: 'errors.timeout',
  '500': 'errors.server',
  '502': 'errors.server',
  '503': 'errors.server',
  '401': 'errors.sessionExpired',
  '403': 'errors.sessionExpired',
  '404': 'errors.notFound',
  '409': 'errors.conflict',
  '422': 'errors.validation',
  '429': 'errors.rateLimited',
  upload: 'errors.upload',
  ai_analysis: 'errors.aiAnalysis',
  biometric: 'errors.biometric',
  storage: 'errors.storageFull',
  default: 'errors.generic',
};

export function getErrorMessage(error: unknown): string {
  if (!error) return i18n.t(ERROR_KEYS.default);

  // TimeoutError (lib/withTimeout.ts) — detecta por name para evitar import
  // circular entre utils/ e lib/. Se um dia a classe for renomeada, este
  // check precisa ser atualizado em sincronia.
  if ((error as { name?: string }).name === 'TimeoutError') {
    return i18n.t(ERROR_KEYS.timeout);
  }

  if (error instanceof TypeError && error.message?.includes('Network')) {
    return i18n.t(ERROR_KEYS.network);
  }

  const apiError = error as ApiError;

  if (apiError.status) {
    const key = ERROR_KEYS[String(apiError.status)];
    if (key) return i18n.t(key);
  }

  if (apiError.code) {
    const key = ERROR_KEYS[apiError.code];
    if (key) return i18n.t(key);
  }

  if (apiError.message?.toLowerCase().includes('timeout')) {
    return i18n.t(ERROR_KEYS.timeout);
  }

  if (apiError.message?.toLowerCase().includes('network')) {
    return i18n.t(ERROR_KEYS.network);
  }

  return i18n.t(ERROR_KEYS.default);
}
