/**
 * lib/photoIntent.ts — pré-classificador de imagem.
 *
 * Antes de submeter uma foto pelo pipeline clínico (analyze-pet-photo), chama
 * a EF `classify-photo-intent` (Haiku Vision, ~$0.0008/foto) pra decidir se
 * a imagem é:
 *   - foto do PRÓPRIO pet (subject) → pipeline clínico normal
 *   - documento (caderneta, receita, exame) → pipeline OCR
 *   - foto de OUTRO pet (amigo, conhecido) → pular análise clínica
 *   - mista ou indeterminada → pipeline pet conservador
 *
 * Bug histórico 1: tutor fotografava caderneta de vacina pelo botão "Foto" e
 * a IA respondia "isto não é seu pet, é um documento". Resolvido com type='document'.
 *
 * Bug histórico 2 (2026-04-27): tutor escrevia "Tiao fez amizade com Bobby"
 * e anexava foto do Bobby — a IA analisava o Bobby como se fosse o Tiao,
 * gerando análise clínica errada (raça/peso/saúde do amigo atribuída ao
 * pet titular). Resolvido com type='other_pet' + skip clinical analysis.
 *
 * Falhas (timeout, sem rede, status 5xx) NÃO bloqueiam o fluxo: retornamos
 * 'pet' como default conservador (mantém comportamento atual).
 */
import { supabase } from './supabase';

export type PhotoIntent = 'pet' | 'document' | 'mixed' | 'unclear' | 'other_pet';

export interface PhotoIntentResult {
  type: PhotoIntent;
  confidence: number;
  reason: string;
}

/** Contexto opcional pra ajudar o classificador a distinguir o pet titular dos demais. */
export interface PhotoIntentContext {
  /** Texto escrito pelo tutor na entrada — sinal mais forte pra detectar `other_pet`. */
  textContext?: string | null;
  /** Nome do pet titular do diário (ex: "Tiao"). */
  subjectPetName?: string | null;
  /** Raça do pet titular do diário (ex: "Border Collie"). */
  subjectPetBreed?: string | null;
}

const TIMEOUT_MS = 8000;

/**
 * Classifica uma imagem (base64) como foto do pet titular, documento, ou foto
 * de outro pet (amigo).
 *
 * @param photoBase64 base64 puro (sem prefixo data:image/...).
 * @param ctx contexto opcional do diário (texto + dados do pet titular). Quando
 *            fornecido, o classificador usa o texto pra distinguir foto do
 *            pet titular vs foto de um amigo mencionado.
 * @returns intent + confiança 0-1 + razão curta. Em caso de erro/timeout,
 *          retorna { type: 'pet', confidence: 0, reason: '...' } pra não
 *          mudar o pipeline que o usuário escolheu.
 */
export async function classifyPhotoIntent(
  photoBase64: string,
  ctx?: PhotoIntentContext,
): Promise<PhotoIntentResult> {
  const _t = Date.now();
  console.log('[photoIntent] classify start | base64KB:', Math.round(photoBase64.length / 1024 * 0.75),
    '| hasCtx:', !!ctx, '| subject:', ctx?.subjectPetName ?? '?');

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

    const body: Record<string, unknown> = { photo_base64: photoBase64 };
    if (ctx?.textContext) body.text_context = ctx.textContext;
    if (ctx?.subjectPetName) body.subject_pet_name = ctx.subjectPetName;
    if (ctx?.subjectPetBreed) body.subject_pet_breed = ctx.subjectPetBreed;

    const { data, error } = await supabase.functions.invoke('classify-photo-intent', {
      body,
    });

    clearTimeout(timer);

    if (error) {
      console.warn('[photoIntent] EF error — falling back to "pet":', error.message);
      return { type: 'pet', confidence: 0, reason: 'classifier_error' };
    }
    if (!data || typeof data !== 'object') {
      console.warn('[photoIntent] empty response — falling back to "pet"');
      return { type: 'pet', confidence: 0, reason: 'empty_response' };
    }

    const result = data as PhotoIntentResult;
    console.log('[photoIntent] result:', { ms: Date.now() - _t, type: result.type, conf: result.confidence, reason: result.reason });
    return result;
  } catch (e) {
    console.warn('[photoIntent] exception — falling back to "pet":', String(e));
    return { type: 'pet', confidence: 0, reason: 'exception' };
  }
}

/**
 * Decide se a foto deve ir pelo pipeline OCR em vez do clínico.
 *
 * Threshold: confidence > 0.7 pra type='document' (alta certeza).
 * 'mixed' (pet + doc) continua no pipeline pet — o OCR roda em paralelo
 * via media_analyses normalmente.
 */
export function shouldRouteToOCR(intent: PhotoIntentResult): boolean {
  return intent.type === 'document' && intent.confidence > 0.7;
}

/**
 * Decide se a análise clínica (`analyze-pet-photo`) deve ser PULADA.
 *
 * Quando true: a foto é de um pet diferente do titular do diário (amigo,
 * conhecido, pet de outro tutor). Rodar análise clínica geraria resultado
 * errado — raça/peso/saúde do amigo atribuídas ao pet titular.
 *
 * Threshold: confidence > 0.7 pra type='other_pet' (alta certeza). Em
 * confidence menor, fica conservador e roda análise normal.
 *
 * O texto do tutor + classificação 'connection' ainda processam — o app
 * extrai o nome do amigo do texto e popula pet_connections. A foto é
 * armazenada como mídia da entry, mas NÃO atribuída ao prontuário do pet
 * titular.
 */
export function shouldSkipClinicalAnalysis(intent: PhotoIntentResult): boolean {
  return intent.type === 'other_pet' && intent.confidence > 0.7;
}
