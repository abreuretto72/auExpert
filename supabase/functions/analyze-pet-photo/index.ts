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

    const { photo_base64, species, language = 'pt-BR', media_type: inputMediaType } = await req.json();

    if (!photo_base64) {
      return new Response(
        JSON.stringify({ error: 'photo_base64 is required' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // Detectar media_type pelo header base64
    let mediaType = inputMediaType ?? 'image/jpeg';
    if (photo_base64.startsWith('/9j/')) mediaType = 'image/jpeg';
    else if (photo_base64.startsWith('iVBOR')) mediaType = 'image/png';
    else if (photo_base64.startsWith('UklGR')) mediaType = 'image/webp';
    console.log('[analyze-pet-photo] mediaType:', mediaType, 'base64 length:', photo_base64.length);

    const LANG_NAMES: Record<string, string> = {
      'pt-BR': 'Portuguese (Brazil)', 'pt': 'Portuguese (Brazil)',
      'en': 'English', 'en-US': 'English',
      'es': 'Spanish', 'fr': 'French', 'de': 'German', 'it': 'Italian',
      'ja': 'Japanese', 'ko': 'Korean', 'zh': 'Chinese (Simplified)',
      'zh-Hant': 'Chinese (Traditional)', 'ar': 'Arabic', 'hi': 'Hindi',
      'ru': 'Russian', 'tr': 'Turkish', 'nl': 'Dutch', 'pl': 'Polish',
      'sv': 'Swedish', 'th': 'Thai', 'vi': 'Vietnamese', 'id': 'Indonesian',
      'uk': 'Ukrainian', 'cs': 'Czech', 'ro': 'Romanian', 'he': 'Hebrew',
    };
    const lang = LANG_NAMES[language] ?? LANG_NAMES[language.split('-')[0]] ?? 'English';

    const systemPrompt = `You are a veterinary AI visual analyst for AuExpert, a pet care app.
Analyze the photo with maximum detail. Extract EVERYTHING visible.
NEVER diagnose diseases — only describe what you SEE. Use terms like "suggestive of", "consistent with", "may indicate".
If something is not visible or not assessable from the photo, set it to null.
Confidence values are 0.0 to 1.0. If confidence < 0.5, add a note suggesting the tutor confirm.
Return ONLY valid JSON. No markdown wrapping, no explanation outside the JSON.
Respond in ${lang}.`;

    const jsonSchema = `{
  "identification": {
    "species": { "value": "dog|cat", "confidence": 0.0 },
    "breed": { "primary": "string", "confidence": 0.0, "is_mixed": false, "secondary_breeds": ["string"] | null },
    "size": "small|medium|large|giant",
    "age_category": "puppy|young|adult|senior",
    "estimated_age_months": number | null,
    "estimated_weight_kg": number | null,
    "sex": { "value": "male|female|unknown", "confidence": 0.0 } | null,
    "coat": { "color": "string", "pattern": "solid|bicolor|tricolor|merle|tabby|brindle|spotted|tuxedo|other", "quality": "shiny|healthy|dull|rough|matted", "length": "short|medium|long" }
  },
  "health": {
    "body_condition_score": number (1-9) | null,
    "body_condition": "underweight|ideal|overweight|obese" | null,
    "skin_coat": [{ "observation": "string", "severity": "normal|attention|concern", "confidence": 0.0 }],
    "eyes": [{ "observation": "string", "severity": "normal|attention|concern", "confidence": 0.0 }],
    "ears": [{ "observation": "string", "severity": "normal|attention|concern", "confidence": 0.0 }],
    "mouth_teeth": [{ "observation": "string", "severity": "normal|attention|concern", "confidence": 0.0 }],
    "posture_body": [{ "observation": "string", "severity": "normal|attention|concern", "confidence": 0.0 }],
    "nails": { "observation": "string", "needs_trimming": boolean } | null,
    "hygiene": "clean|moderate|dirty" | null,
    "visible_parasites": boolean | null,
    "visible_lumps": boolean | null
  },
  "mood": {
    "primary": "ecstatic|happy|calm|tired|anxious|sad|playful|sick|alert|fearful|submissive",
    "confidence": 0.0,
    "signals": ["string"]
  },
  "environment": {
    "location": "home_indoor|home_outdoor|park|beach|clinic|car|street|unknown",
    "accessories": [{ "type": "collar|leash|harness|clothes|muzzle|id_tag|other", "description": "string" }],
    "other_animals": boolean,
    "visible_risks": ["string"] | null
  },
  "alerts": [{ "message": "string", "severity": "info|attention|concern", "category": "health|safety|care|toxicity" }],
  "disclaimer": "string",
  "description": "REQUIRED — never null. If a pet is visible: 1-2 sentence summary of health and mood. If NO pet visible (feces, plant, food, object, wound, environment): describe what is shown and its clinical or safety relevance to pet health.",
  "toxicity_check": {
    "has_toxic_items": boolean,
    "items": [{ "name": "string", "toxicity_level": "mild|moderate|severe", "description": "string" }] | null
  }
}`;

    const userPrompt = `Analyze this photo in the context of pet health. The photo may show the pet directly, or pet-related content (feces, food, plants, objects, wounds, or environment) belonging to a ${species === 'dog' ? (language === 'pt-BR' ? 'cão' : 'dog') : (language === 'pt-BR' ? 'gato' : 'cat')}.

Return a JSON object with this EXACT structure (null for anything not visible/assessable):

${jsonSchema}

Be thorough. Analyze every visible detail. The tutor relies on this to care for their pet.

## TOXICITY CHECK
Always fill toxicity_check. If plants, foods, or household items are visible:
- Set has_toxic_items: true if any item is dangerous for ${species === 'dog' ? 'a dog' : 'a cat'}.
- List each toxic item in items: name, toxicity_level (mild/moderate/severe), short description of risk in ${lang}.
- If nothing toxic is visible, set has_toxic_items: false and items: null.

## CLINICAL CONTENT — FECES/EXCREMENT IDENTIFICATION
If the photo shows feces, excrement, stool, or droppings (fezes, cocô, excremento, dejetos):
- This is clinically important data — do NOT classify it generically as "substance" or ignore it.
- The pet may not be visible in the photo; set identification fields to null when not assessable.
- In 'description': describe color, consistency, and any abnormal characteristics. Examples:
  "Fezes de coloração amarelo-esverdeada, consistência pastosa, sugestivo de trânsito intestinal acelerado."
  "Stool with dark brown color and formed consistency. No visible parasites or blood."
- Color guide for clinical assessment:
  • Normal brown: assess consistency only (likely normal)
  • Yellow/green: possible rapid transit, infection, or dietary issue → add 'attention' alert
  • Black/tarry: possible internal bleeding → add 'concern' alert, category 'health'
  • Red/bloody streaks: possible lower GI bleeding → add 'concern' alert, category 'health'
  • White/gray/pale: possible liver or pancreas issue → add 'attention' alert
- Consistency: formed, soft, liquid/diarrhea, mucousy
- Note any: visible parasites (worms, white segments), blood, unusual odor clues, or mucus
- Add alerts for abnormal color or consistency — do not leave alerts empty if something is wrong.

## DESCRIPTION FIELD — ALWAYS REQUIRED
The 'description' field MUST NEVER be null or empty.
- Pet visible: describe health and mood in 1-2 sentences in ${lang}.
- No pet visible (plant, feces, food, wound, object, environment):
  describe what is shown and its relevance to pet health/safety.
  Examples:
  "Petúnias (Petunia spp.) identificadas — planta moderadamente tóxica. Pode causar irritação gastrointestinal se ingerida."
  "Fezes de coloração amarelo-esverdeada com consistência pastosa, sugestivo de trânsito intestinal acelerado ou infecção."
  "Ferida visível na pele — área com vermelhidão e possível inflamação, recomenda-se avaliação veterinária."
- Always write in ${lang}.
- Always use 3rd person or impersonal phrasing.`;

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
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: photo_base64 },
            },
            { type: 'text', text: userPrompt },
          ],
        }],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[analyze-pet-photo] Anthropic API error:', response.status, errorBody);
      return new Response(
        JSON.stringify({ error: 'AI analysis failed', status: response.status, details: errorBody }),
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const aiResponse = await response.json();
    const textContent = aiResponse.content?.find((c: { type: string }) => c.type === 'text');

    if (!textContent?.text) {
      return new Response(
        JSON.stringify({ error: 'Empty AI response' }),
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // Parse JSON (handle possible markdown wrapping)
    let jsonText = textContent.text.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const analysis = JSON.parse(jsonText);

    // Backward compatibility: flatten key fields to top level for the app
    const compat = {
      ...analysis,
      // Top-level shortcuts for AddPetModal
      breed: analysis.identification?.breed
        ? { name: analysis.identification.breed.primary, confidence: analysis.identification.breed.confidence }
        : null,
      estimated_age_months: analysis.identification?.estimated_age_months ?? null,
      estimated_weight_kg: analysis.identification?.estimated_weight_kg ?? null,
      size: analysis.identification?.size === 'giant' ? 'large' : (analysis.identification?.size ?? null),
      color: analysis.identification?.coat?.color ?? null,
    };

    return new Response(
      JSON.stringify(compat),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[analyze-pet-photo] error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal error', message: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }
});
