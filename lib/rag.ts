import { supabase } from './supabase';

// ── Importance per classification type ────────────────────────────────────

const IMPORTANCE: Record<string, number> = {
  allergy:      0.95,
  vaccine:      0.9,
  surgery:      0.9,
  medication:   0.85,
  symptom:      0.8,
  consultation: 0.8,
  exam:         0.75,
  weight:          0.7,
  clinical_metric: 0.85,
  food:            0.6,
  plan:         0.6,
  mood:         0.5,
  moment:       0.5,
  connection:   0.5,
  travel:       0.5,
  expense:      0.4,
  boarding:     0.4,
  dog_walker:   0.3,
  grooming:     0.3,
};

// ── Search RAG ─────────────────────────────────────────────────────────────

export async function searchRAG(petId: string, query: string, limit = 5) {
  const { data, error } = await supabase.functions.invoke('search-rag', {
    body: { pet_id: petId, query, limit },
  });
  if (error) throw error;
  return data as { results: Array<{ content: string; similarity: number; content_type: string }> };
}

// ── Generate + save a single embedding ────────────────────────────────────

export async function generateEmbedding(
  petId:        string,
  category:     string,
  diaryEntryId: string,
  text:         string,
  importance:   number,
  userId?:      string,
): Promise<void> {
  const trimmed = (text ?? '').trim();
  if (!trimmed || !userId) return;

  try {
    const { error } = await supabase.functions.invoke('generate-embedding', {
      body: {
        text:           trimmed,
        pet_id:         petId,
        user_id:        userId,
        diary_entry_id: diaryEntryId || null,
        category,
        importance,
        save:           true,
      },
    });
    if (error) console.warn('[rag] generateEmbedding error:', error.message);
  } catch (err) {
    console.warn('[rag] generateEmbedding failed:', String(err));
  }
}

// ── Build structured text for each classification type ─────────────────────

function buildEmbeddingContent(cls: {
  type: string;
  extracted_data?: Record<string, unknown>;
}): string | null {
  const d = (cls.extracted_data ?? {}) as Record<string, unknown>;
  const str = (k: string) => (d[k] as string | undefined) ?? '';

  switch (cls.type) {
    case 'vaccine':
      return [
        `Vacina ${str('vaccine_name')} aplicada`,
        str('applied_at') ? `em ${str('applied_at')}` : '',
        str('vet_name') ? `pela ${str('vet_name')}` : '',
        str('clinic') ? `na ${str('clinic')}` : '',
        str('next_due') ? `Próxima dose: ${str('next_due')}` : '',
      ].filter(Boolean).join('. ');

    case 'medication':
      return [
        `Medicamento: ${str('medication_name')}`,
        str('dosage') ? `Dose: ${str('dosage')}` : '',
        str('frequency') ? `Frequência: ${str('frequency')}` : '',
        str('vet_name') ? `Prescrito por ${str('vet_name')}` : '',
        d.is_recurring ? 'Uso contínuo.' : '',
      ].filter(Boolean).join('. ');

    case 'allergy':
      return [
        `Alergia confirmada: ${str('allergen')}`,
        str('reaction') ? `Reação: ${str('reaction')}` : str('reaction_type') ? `Reação: ${str('reaction_type')}` : '',
      ].filter(Boolean).join('. ');

    case 'weight':
      return d.value != null
        ? `Peso registrado: ${d.value} kg.`
        : d.weight_kg != null ? `Peso registrado: ${d.weight_kg} kg.` : null;

    case 'clinical_metric': {
      const metricType = str('metric_type');
      if (!metricType) return null;
      switch (metricType) {
        case 'temperature':
          return d.is_fever
            ? `Febre registrada: ${d.value}°C${d.is_fever ? ' — acima do normal.' : '.'}`
            : `Temperatura: ${d.value}°C (normal).`;
        case 'heart_rate':
          return `Frequência cardíaca: ${d.value} bpm${d.is_abnormal ? ' — fora do normal.' : '.'}`;
        case 'respiratory_rate':
          return `Frequência respiratória: ${d.value} rpm${d.is_abnormal ? ' — alterada.' : '.'}`;
        case 'blood_glucose':
          return [
            `Glicemia: ${d.value} mg/dL`,
            d.context === 'fasting' ? '(em jejum)' : d.context === 'post_meal' ? '(pós-prandial)' : '',
            d.is_abnormal ? '— fora do normal.' : '.',
          ].filter(Boolean).join(' ');
        case 'blood_pressure':
          return d.secondary_value != null
            ? `Pressão arterial: ${d.value}/${d.secondary_value} mmHg${d.is_abnormal ? ' — alterada.' : '.'}`
            : `Pressão arterial sistólica: ${d.value} mmHg.`;
        case 'oxygen_saturation':
          return `SpO2: ${d.value}%${d.is_abnormal ? ' — abaixo do normal.' : ' (normal).'}`;
        case 'lab_result':
          return d.marker_name
            ? `Resultado lab: ${d.marker_name} = ${d.value}${str('unit') ? ' ' + str('unit') : ''}${d.is_abnormal ? ' — alterado.' : '.'}`
            : null;
        case 'body_condition_score':
          return d.score != null
            ? `Escore de Condição Corporal (BCS): ${d.score}/9.`
            : `Condição corporal: ${d.value}.`;
        default:
          return `Métrica clínica (${metricType}): ${d.value}${str('unit') ? ' ' + str('unit') : ''}.`;
      }
    }

    case 'consultation':
      return [
        'Consulta veterinária',
        str('vet_name') ? `com ${str('vet_name')}` : '',
        str('clinic') ? `na ${str('clinic')}` : '',
        str('diagnosis') ? `Diagnóstico: ${str('diagnosis')}` : '',
        str('reason') ? `Motivo: ${str('reason')}` : '',
      ].filter(Boolean).join('. ');

    case 'surgery':
      return [
        `Cirurgia: ${str('procedure') || str('procedure_name')}`,
        str('vet_name') ? `por ${str('vet_name')}` : '',
        str('date') ? `em ${str('date')}` : '',
      ].filter(Boolean).join('. ');

    case 'food':
      return str('product_name')
        ? `Alimentação atual: ${str('product_name')}${str('brand') ? ' da marca ' + str('brand') : ''}.`
        : null;

    case 'symptom':
      return [
        `Sintoma observado: ${str('symptom_description') || str('symptom')}`,
        str('body_part') ? `Região: ${str('body_part')}` : '',
        str('urgency_level') ? `Urgência: ${str('urgency_level')}` : '',
      ].filter(Boolean).join('. ');

    case 'plan':
      return str('provider') || str('provider_name')
        ? `Plano ativo: ${str('provider') || str('provider_name')}.${d.monthly_cost ? ' R$ ' + d.monthly_cost + '/mês.' : ''}`
        : null;

    case 'connection':
      return str('friend_name')
        ? `Amigo frequente: ${str('friend_name')}${str('friend_species') ? ' (' + str('friend_species') + ')' : ''}.`
        : null;

    case 'grooming':
      return str('establishment')
        ? `Pet shop/clínica frequente: ${str('establishment')}.${str('service_type') ? ' Serviço: ' + str('service_type') + '.' : ''}`
        : null;

    default:
      return null;
  }
}

// ── Index pet health data (vaccines, consultations, medications, profile) ──

export async function indexPetHealthData(
  petId:  string,
  userId: string,
): Promise<void> {

  // 1. Vaccines
  const { data: vaccines } = await supabase
    .from('vaccines')
    .select('id, name, date_administered, next_due_date, veterinarian, clinic')
    .eq('pet_id', petId)
    .eq('is_active', true);

  for (const v of vaccines ?? []) {
    const content = [
      `Vacina ${v.name} aplicada`,
      v.date_administered ? `em ${v.date_administered}` : '',
      v.veterinarian ? `pela ${v.veterinarian}` : '',
      v.clinic ? `na ${v.clinic}` : '',
      v.next_due_date ? `Próxima dose: ${v.next_due_date}` : '',
    ].filter(Boolean).join('. ');

    await generateEmbedding(petId, 'vaccine', v.id, content, 0.9, userId)
      .catch(() => {});
  }

  // 2. Consultations
  const { data: consultations } = await supabase
    .from('consultations')
    .select('id, date, veterinarian, clinic, diagnosis, type')
    .eq('pet_id', petId)
    .eq('is_active', true);

  for (const c of consultations ?? []) {
    const content = [
      'Consulta veterinária',
      c.veterinarian ? `com ${c.veterinarian}` : '',
      c.clinic ? `na ${c.clinic}` : '',
      c.date ? `em ${c.date}` : '',
      c.diagnosis ? `Diagnóstico: ${c.diagnosis}` : '',
    ].filter(Boolean).join('. ');

    await generateEmbedding(petId, 'consultation', c.id, content, 0.8, userId)
      .catch(() => {});
  }

  // 3. Medications
  const { data: medications } = await supabase
    .from('medications')
    .select('id, name, dosage, frequency, start_date, end_date')
    .eq('pet_id', petId)
    .eq('is_active', true);

  for (const m of medications ?? []) {
    const content = [
      `Medicamento: ${m.name}`,
      m.dosage ? `Dose: ${m.dosage}` : '',
      m.frequency ? `Frequência: ${m.frequency}` : '',
      m.start_date ? `Início: ${m.start_date}` : '',
      m.end_date ? `Término: ${m.end_date}` : '',
    ].filter(Boolean).join('. ');

    await generateEmbedding(petId, 'medication', m.id, content, 0.85, userId)
      .catch(() => {});
  }

  // 4. Pet profile
  const { data: pet } = await supabase
    .from('pets')
    .select('name, species, breed, birth_date, sex, weight_kg, blood_type, microchip_id')
    .eq('id', petId)
    .single();

  if (pet) {
    const content = [
      `${pet.name} é um ${pet.species === 'dog' ? 'cão' : 'gato'}`,
      pet.breed ? `da raça ${pet.breed}` : '',
      pet.sex ? `sexo ${pet.sex === 'male' ? 'macho' : 'fêmea'}` : '',
      pet.weight_kg ? `pesando ${pet.weight_kg} kg` : '',
      pet.blood_type ? `tipo sanguíneo ${pet.blood_type}` : '',
      pet.birth_date ? `nascido em ${pet.birth_date}` : '',
    ].filter(Boolean).join(', ');

    await generateEmbedding(petId, 'profile', petId, content, 1.0, userId)
      .catch(() => {});
  }
}

// ── Update RAG after saving a diary entry ─────────────────────────────────

export async function updatePetRAG(
  petId:           string,
  userId:          string,
  diaryEntryId:    string,
  classifications: Array<{ type: string; confidence: number; extracted_data?: Record<string, unknown> }>,
): Promise<void> {
  if (!classifications?.length) return;

  // Fire-and-forget per classification. Best-effort — never throws.
  await Promise.allSettled(
    classifications
      .map((cls) => {
        const content = buildEmbeddingContent(cls);
        if (!content) return null;
        const importance = IMPORTANCE[cls.type] ?? 0.5;
        return generateEmbedding(petId, cls.type, diaryEntryId, content, importance, userId);
      })
      .filter((p): p is Promise<void> => p !== null),
  );
}
