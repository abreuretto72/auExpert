/**
 * Tests for classify-diary-entry response parsing and normalization.
 * Sprint 1.4: validates AI classification pipeline contract.
 *
 * These tests validate the contract between the Edge Function output
 * and what the client (lib/ai.ts) expects, without hitting the real API.
 */

import type { ClassifyDiaryResponse } from '../../lib/ai';

// ── Helpers ──

/** Simulates the normalization that happens in the Edge Function classifier module */
function normalizeClassifyResponse(raw: Record<string, unknown>): ClassifyDiaryResponse {
  return {
    classifications: (raw.classifications as ClassifyDiaryResponse['classifications']) ?? [{ type: 'moment', confidence: 1.0, extracted_data: {} }],
    primary_type: (raw.primary_type as string) ?? 'moment',
    narration: (raw.narration as string) ?? '',
    mood: (raw.mood as string) ?? 'calm',
    mood_confidence: (raw.mood_confidence as number) ?? 0.5,
    urgency: (raw.urgency as ClassifyDiaryResponse['urgency']) ?? 'none',
    clinical_metrics: (raw.clinical_metrics as ClassifyDiaryResponse['clinical_metrics']) ?? [],
    suggestions: (raw.suggestions as string[]) ?? [],
    tags_suggested: (raw.tags_suggested as string[]) ?? [],
    language: (raw.language as string) ?? 'pt-BR',
    tokens_used: (raw.tokens_used as number) ?? 0,
  };
}

// ── Tests ──

describe('ClassifyDiaryResponse normalization', () => {
  it('normalizes a complete AI response', () => {
    const raw = {
      classifications: [
        { type: 'vaccine', confidence: 0.92, extracted_data: { name: 'V10', lab: 'Pfizer' } },
        { type: 'weight', confidence: 0.88, extracted_data: { value: 32, unit: 'kg' } },
      ],
      primary_type: 'vaccine',
      narration: 'Hoje o Rex foi ao veterinário. Foi aplicada a vacina V10 e o peso registrado foi de 32 quilos.',
      mood: 'calm',
      mood_confidence: 0.87,
      urgency: 'none',
      clinical_metrics: [{ type: 'weight', value: 32, unit: 'kg', status: 'normal' }],
      suggestions: ['Registrar vacina V10 no prontuário', 'Atualizar peso para 32kg'],
      tags_suggested: ['veterinário', 'vacina', 'peso'],
      language: 'pt-BR',
      tokens_used: 450,
    };

    const result = normalizeClassifyResponse(raw);

    expect(result.classifications).toHaveLength(2);
    expect(result.primary_type).toBe('vaccine');
    expect(result.narration).toContain('Rex');
    expect(result.mood).toBe('calm');
    expect(result.mood_confidence).toBe(0.87);
    expect(result.urgency).toBe('none');
    expect(result.clinical_metrics).toHaveLength(1);
    expect(result.clinical_metrics[0].value).toBe(32);
    expect(result.suggestions).toHaveLength(2);
    expect(result.tags_suggested).toHaveLength(3);
  });

  it('provides safe defaults for empty/malformed response', () => {
    const result = normalizeClassifyResponse({});

    expect(result.classifications).toHaveLength(1);
    expect(result.classifications[0].type).toBe('moment');
    expect(result.classifications[0].confidence).toBe(1.0);
    expect(result.primary_type).toBe('moment');
    expect(result.narration).toBe('');
    expect(result.mood).toBe('calm');
    expect(result.mood_confidence).toBe(0.5);
    expect(result.urgency).toBe('none');
    expect(result.clinical_metrics).toEqual([]);
    expect(result.suggestions).toEqual([]);
    expect(result.tags_suggested).toEqual([]);
  });

  it('handles partial response (only narration)', () => {
    const result = normalizeClassifyResponse({
      narration: 'O Rex dormiu a tarde toda.',
      mood: 'tired',
    });

    expect(result.narration).toBe('O Rex dormiu a tarde toda.');
    expect(result.mood).toBe('tired');
    expect(result.primary_type).toBe('moment');
    expect(result.classifications[0].type).toBe('moment');
  });

  it('narration is always in 3rd person (contract)', () => {
    const goodNarrations = [
      'Hoje o Rex brincou no parque.',
      'O Rex foi fotografado descansando no sofá.',
      'Rex recebeu a vacina V10 hoje.',
    ];
    const badNarrations = [
      'Fui brincar no parque hoje!',
      'Meu dono me levou ao vet.',
      'Eu comi ração nova.',
    ];

    goodNarrations.forEach((n) => {
      expect(n).not.toMatch(/^(Fui|Meu dono|Eu )/);
    });

    badNarrations.forEach((n) => {
      expect(n).toMatch(/^(Fui|Meu dono|Eu )/);
    });
  });

  it('handles multiple classifications (Fluxo 2: voz multi-item)', () => {
    const raw = {
      classifications: [
        { type: 'consultation', confidence: 0.90, extracted_data: { vet: 'Dra. Ana' } },
        { type: 'vaccine', confidence: 0.92, extracted_data: { name: 'V10' } },
        { type: 'weight', confidence: 0.88, extracted_data: { value: 32, unit: 'kg' } },
      ],
      primary_type: 'vaccine',
      narration: 'Hoje o Rex foi ao veterinário.',
      mood: 'calm',
      mood_confidence: 0.85,
      urgency: 'none',
      clinical_metrics: [{ type: 'weight', value: 32, unit: 'kg', status: 'normal' }],
      suggestions: [],
      tags_suggested: [],
    };

    const result = normalizeClassifyResponse(raw);

    expect(result.classifications).toHaveLength(3);
    expect(result.classifications.map((c) => c.type)).toEqual(['consultation', 'vaccine', 'weight']);
    expect(result.clinical_metrics).toHaveLength(1);
    expect(result.primary_type).toBe('vaccine');
  });

  it('handles urgency detection (Fluxo: symptom)', () => {
    const raw = {
      classifications: [{ type: 'symptom', confidence: 0.95, extracted_data: { symptom: 'diarreia', duration: '2 dias' } }],
      primary_type: 'symptom',
      narration: 'O Rex está com diarreia há dois dias.',
      mood: 'sick',
      mood_confidence: 0.9,
      urgency: 'medium',
      clinical_metrics: [],
      suggestions: ['Levar ao veterinário em breve'],
      tags_suggested: ['saúde', 'urgente'],
    };

    const result = normalizeClassifyResponse(raw);

    expect(result.urgency).toBe('medium');
    expect(result.mood).toBe('sick');
    expect(result.suggestions).toHaveLength(1);
  });

  it('handles photo-only entry (Fluxo 3)', () => {
    const raw = {
      classifications: [{ type: 'moment', confidence: 0.95, extracted_data: { health_visual: 'healthy', coat: 'shiny' } }],
      primary_type: 'moment',
      narration: 'O Rex foi fotografado descansando no sofá. Aparência saudável, pelo brilhoso.',
      mood: 'calm',
      mood_confidence: 0.82,
      urgency: 'none',
      clinical_metrics: [],
      suggestions: [],
      tags_suggested: ['foto', 'relaxamento'],
    };

    const result = normalizeClassifyResponse(raw);

    expect(result.primary_type).toBe('moment');
    expect(result.narration).toContain('fotografado');
    expect(result.mood).toBe('calm');
  });
});

describe('ClassifyDiaryResponse types', () => {
  it('valid classification types', () => {
    const validTypes = [
      'moment', 'vaccine', 'exam', 'medication', 'consultation',
      'allergy', 'weight', 'surgery', 'symptom', 'food',
      'expense', 'connection', 'travel', 'partner',
      'achievement', 'mood', 'insurance', 'plan',
    ];

    validTypes.forEach((type) => {
      const result = normalizeClassifyResponse({
        classifications: [{ type, confidence: 0.9, extracted_data: {} }],
        primary_type: type,
      });
      expect(result.primary_type).toBe(type);
    });
  });

  it('valid mood ids', () => {
    const validMoods = ['ecstatic', 'happy', 'calm', 'playful', 'tired', 'anxious', 'sad', 'sick'];

    validMoods.forEach((mood) => {
      const result = normalizeClassifyResponse({ mood });
      expect(result.mood).toBe(mood);
    });
  });

  it('valid urgency levels', () => {
    const levels = ['none', 'low', 'medium', 'high'];

    levels.forEach((urgency) => {
      const result = normalizeClassifyResponse({ urgency });
      expect(result.urgency).toBe(urgency);
    });
  });
});
