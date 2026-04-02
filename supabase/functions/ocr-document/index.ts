import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getAIConfig } from '../_shared/ai-config.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const { photo_base64, document_type, language = 'pt-BR', media_type: inputMediaType } = await req.json();

    if (!photo_base64) {
      return new Response(
        JSON.stringify({ error: 'photo_base64 is required' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    let mediaType = inputMediaType ?? 'image/jpeg';
    if (photo_base64.startsWith('/9j/')) mediaType = 'image/jpeg';
    else if (photo_base64.startsWith('iVBOR')) mediaType = 'image/png';
    else if (photo_base64.startsWith('UklGR')) mediaType = 'image/webp';

    const LANG_NAMES: Record<string, string> = {
      'pt-BR': 'Portuguese (Brazil)', 'pt': 'Portuguese (Brazil)',
      'en': 'English', 'en-US': 'English',
      'es': 'Spanish', 'fr': 'French', 'de': 'German',
    };
    const lang = LANG_NAMES[language] ?? LANG_NAMES[language.split('-')[0]] ?? 'English';

    const schemas: Record<string, string> = {
      vaccine: `{
  "vaccines": [{
    "name": "vaccine name",
    "laboratory": "lab name or null",
    "batch_number": "batch/lot number or null",
    "date_administered": "YYYY-MM-DD",
    "next_due_date": "YYYY-MM-DD or null",
    "dose_number": "1st dose, 2nd dose, booster, etc or null",
    "veterinarian": "vet name or null",
    "clinic": "clinic name or null",
    "notes": "any notes or null"
  }]
}`,
      exam: `{
  "exams": [{
    "name": "exam name",
    "date": "YYYY-MM-DD",
    "status": "normal|attention|critical",
    "results": [{ "item": "parameter", "value": "result", "reference": "ref range", "normal": true|false }],
    "laboratory": "lab name or null",
    "veterinarian": "vet name or null",
    "notes": "any notes or null"
  }]
}`,
      prescription: `{
  "medications": [{
    "name": "medication name + dosage",
    "type": "category (antibiotic, anti-inflammatory, supplement, etc)",
    "frequency": "how often (daily, 2x/day, monthly, etc)",
    "start_date": "YYYY-MM-DD",
    "end_date": "YYYY-MM-DD or null if continuous",
    "veterinarian": "vet name or null",
    "notes": "instructions, observations or null"
  }]
}`,
      general: `{
  "type": "vaccine|exam|prescription|consultation|surgery",
  "data": { ... extracted fields ... }
}`,
    };

    const schema = schemas[document_type] ?? schemas.general;

    const systemPrompt = `You are a veterinary document OCR specialist for AuExpert.
Extract ALL text and data from the document photo with maximum accuracy.
Return ONLY valid JSON matching the schema. No markdown, no explanation.
Dates must be in YYYY-MM-DD format. Convert any date format to this.
If a field is not visible/readable, set it to null.
Respond in ${lang}.`;

    const userPrompt = `Extract data from this ${document_type ?? 'veterinary'} document photo.
Return JSON with this exact structure:
${schema}`;

    const cfg = await getAIConfig();
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': cfg.anthropic_version,
      },
      body: JSON.stringify({
        model: cfg.model_vision,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: photo_base64 } },
            { type: 'text', text: userPrompt },
          ],
        }],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[ocr-document] API error:', response.status, errorBody);
      return new Response(
        JSON.stringify({ error: 'OCR failed', status: response.status }),
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const aiResponse = await response.json();
    const textContent = aiResponse.content?.find((c: { type: string }) => c.type === 'text');

    if (!textContent?.text) {
      return new Response(
        JSON.stringify({ error: 'Empty response' }),
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    let jsonText = textContent.text.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const result = JSON.parse(jsonText);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[ocr-document] error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal error', message: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }
});
