/**
 * JSON parser with fallback — strips markdown code fences from Claude/Gemini
 * responses, parses the JSON, and returns a safe default shape if parsing fails.
 * The fallback uses `fallbackText` as the narration so the tutor always sees
 * something sensible even when the model returns malformed output.
 */

// ── JSON parser with fallback ──

export function parseClassification(rawText: string, fallbackText?: string): Record<string, unknown> {
  let jsonText = rawText.trim();

  // Strip markdown code fences if present
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  try {
    const parsed = JSON.parse(jsonText);
    console.log('[classifier] JSON parse OK | keys:', Object.keys(parsed).join(', '));
    if (parsed.ocr_data) {
      console.log('[classifier] OCR parsed | document_type:', parsed.document_type, '| fields:', parsed.ocr_data?.fields?.length ?? 0);
      if (parsed.ocr_data?.fields?.length) {
        console.log('[classifier] OCR first 3 fields:', JSON.stringify(parsed.ocr_data.fields.slice(0, 3)));
      }
    }
    return parsed;
  } catch {
    console.error('[classifier] JSON parse FAILED | chars:', jsonText.length, '| first 400:', jsonText.slice(0, 400));
    console.error('[classifier] JSON last 200:', jsonText.slice(-200));
    return {
      classifications: [{ type: 'moment', confidence: 1.0, extracted_data: {} }],
      primary_type: 'moment',
      narration: fallbackText || 'Entry recorded.',
      mood: 'calm',
      mood_confidence: 0.5,
      urgency: 'none',
      clinical_metrics: [],
      suggestions: [],
      tags_suggested: [],
    };
  }
}
