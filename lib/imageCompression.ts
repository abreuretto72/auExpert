/**
 * lib/imageCompression.ts
 *
 * Helper de compressão de imagens antes de enviar pra IA (Claude Vision).
 * Reutilizável em qualquer tela que envia foto pra análise:
 *   - trocar.tsx (troca de ração — 2 fotos)
 *   - diary/new.tsx (foto de diário)
 *   - scanner de documento
 *   - foto de receita vet
 *
 * Por quê 1568px? Recomendação oficial da Anthropic para Claude Vision.
 * Acima disso, a API redimensiona internamente — enviar maior é desperdício
 * de upload e tokens sem ganho de qualidade analítica.
 *
 * Por quê quality 0.75? Sweet spot entre tamanho e legibilidade de texto em
 * embalagens, receitas, etc. Valores nutricionais continuam legíveis, logomarcas nítidas.
 */
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export interface CompressionOptions {
  /** Lado maior em pixels. Default: 1568 (recomendação Anthropic). */
  maxDimension?: number;
  /** Qualidade JPEG 0-1. Default: 0.75. */
  quality?: number;
}

export interface CompressedImage {
  base64: string;
  width: number;
  height: number;
  approxSizeKB: number;
}

/**
 * Comprime uma imagem (URI local) para o tamanho ideal para Claude Vision.
 *
 * @param sourceUri URI local da imagem (result.assets[0].uri do ImagePicker)
 * @param options Opções de compressão
 * @returns Imagem comprimida com base64 pronto para enviar no body da API
 */
export async function compressImageForAI(
  sourceUri: string,
  options: CompressionOptions = {},
): Promise<CompressedImage> {
  const { maxDimension = 1568, quality = 0.75 } = options;
  const t0 = Date.now();

  const ref = await ImageManipulator.manipulate(sourceUri)
    .resize({ width: maxDimension })
    .renderAsync();

  const result = await ref.saveAsync({
    compress: quality,
    format: SaveFormat.JPEG,
    base64: true,
  });

  const base64 = result.base64 ?? '';
  const approxSizeKB = Math.round(base64.length * 0.75 / 1024);
  const elapsed = Date.now() - t0;

  console.log(
    '[imageCompression] done | ms:', elapsed,
    '| size KB:', approxSizeKB,
    '| dim:', `${result.width}x${result.height}`,
  );

  return {
    base64,
    width: result.width,
    height: result.height,
    approxSizeKB,
  };
}

/**
 * Comprime múltiplas imagens EM PARALELO.
 * Útil para frente+verso da troca de ração — corta ~50% do tempo vs sequencial.
 */
export async function compressImagesForAI(
  sourceUris: string[],
  options: CompressionOptions = {},
): Promise<CompressedImage[]> {
  const t0 = Date.now();
  const results = await Promise.all(
    sourceUris.map((uri) => compressImageForAI(uri, options)),
  );
  console.log(
    '[imageCompression] batch done | count:', results.length,
    '| total ms:', Date.now() - t0,
    '| total KB:', results.reduce((s, r) => s + r.approxSizeKB, 0),
  );
  return results;
}
