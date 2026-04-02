/**
 * Classifier module — builds the system prompt, calls Claude API,
 * and parses the structured JSON response.
 */

import type { PetContext } from './context.ts';
import { getAIConfig } from '../../_shared/ai-config.ts';

// ── Constants ──

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const MAX_TOKENS = 1500;

const LANG_NAMES: Record<string, string> = {
  'pt-BR': 'Brazilian Portuguese', 'pt': 'Brazilian Portuguese',
  'en': 'English', 'en-US': 'English',
  'es': 'Spanish', 'fr': 'French', 'de': 'German', 'it': 'Italian',
  'ja': 'Japanese', 'ko': 'Korean', 'zh': 'Chinese (Simplified)',
  'ar': 'Arabic', 'hi': 'Hindi', 'ru': 'Russian', 'tr': 'Turkish',
};

const CLASSIFICATION_TYPES = [
  'moment', 'vaccine', 'exam', 'medication', 'consultation',
  'allergy', 'weight', 'surgery', 'symptom', 'food',
  'expense', 'connection', 'travel', 'partner',
  'achievement', 'mood', 'insurance', 'plan',
  'grooming', 'boarding', 'pet_sitter', 'dog_walker', 'training', 'funeral_plan',
  'purchase', 'place_visit', 'documentation', 'lost_found', 'emergency', 'memorial', 'adoption',
  'clinical_metric',
] as const;

const MOOD_IDS = [
  'ecstatic', 'happy', 'calm', 'playful',
  'tired', 'anxious', 'sad', 'sick',
] as const;

// ── Types ──

export type ClassificationType = typeof CLASSIFICATION_TYPES[number];
export type MoodId = typeof MOOD_IDS[number];

export interface Classification {
  type: ClassificationType;
  confidence: number;
  extracted_data: Record<string, unknown>;
}

export interface ClinicalMetric {
  type: string;
  value: number;
  unit: string;
  status: 'normal' | 'low' | 'high' | 'critical';
}

export interface OCRField {
  key: string;
  value: string;
  confidence: number;
}

export interface OCRItem {
  name: string;
  qty: number;
  unit_price: number;
}

export interface OCRData {
  fields: OCRField[];
  items?: OCRItem[];
}

export interface PetAudioAnalysis {
  sound_type: 'bark' | 'meow' | 'purr' | 'whine' | 'growl' | 'other';
  emotional_state: string;
  intensity: 'low' | 'medium' | 'high';
  pattern_notes: string;
}

export interface VideoAnalysis {
  locomotion_score: number;
  energy_score: number;
  calm_score: number;
  behavior_summary: string;
  health_observations: string[];
}

export interface ClassifyResult {
  classifications: Classification[];
  primary_type: ClassificationType;
  narration: string;
  mood: MoodId;
  mood_confidence: number;
  urgency: 'none' | 'low' | 'medium' | 'high';
  clinical_metrics: ClinicalMetric[];
  suggestions: string[];
  tags_suggested: string[];
  language: string;
  tokens_used: number;
  // OCR-specific (only present when input_type === 'ocr_scan')
  document_type?: string;
  ocr_data?: OCRData;
  // PDF-specific (only present when input_type === 'pdf_upload')
  document_summary?: string;
  date_range?: { from: string; to: string } | null;
  import_count?: { vaccines: number; consultations: number; exams: number; medications: number; surgeries: number; other: number };
  // Video-specific (only present when input_type === 'video')
  video_analysis?: VideoAnalysis;
  // Pet audio-specific (only present when input_type === 'pet_audio')
  pet_audio_analysis?: PetAudioAnalysis;
}

export interface ClassifyInput {
  text?: string;
  photo_base64?: string;
  photos_base64?: string[];
  pdf_base64?: string;
  input_type: string;
  language: string;
  petContext: PetContext;
}

// ── Prompt builder ──

function buildSystemPrompt(pet: PetContext, lang: string, inputType?: string): string {
  const petSex = pet.sex === 'male' ? 'male' : pet.sex === 'female' ? 'female' : 'unknown sex';
  const speciesWord = pet.species === 'dog' ? 'dog' : 'cat';

  if (inputType === 'ocr_scan') {
    return buildOCRPrompt(pet, lang);
  }

  if (inputType === 'pdf_upload') {
    return buildPDFPrompt(pet, lang);
  }

  if (inputType === 'video') {
    return buildVideoPrompt(pet, lang);
  }

  if (inputType === 'pet_audio') {
    return buildPetAudioPrompt(pet, lang);
  }

  return `Você é o classificador e narrador de IA do auExpert, app de diário inteligente para pets.
O tutor fala em linguagem natural e informal — com erros, abreviações, nomes regionais.
Entenda o contexto e classifique TUDO que foi mencionado.

## CONTEXTO DO PET
- Nome: ${pet.name}
- Espécie: ${pet.species === 'dog' ? 'cão' : 'gato'} (${petSex})
- Raça: ${pet.breed ?? 'SRD/desconhecida'}
- Idade: ${pet.age_desc}
- Peso: ${pet.weight_kg ? pet.weight_kg + 'kg' : 'desconhecido'}
- Memórias recentes: ${pet.recent_memories || 'nenhuma ainda'}

## REGRAS DE NARRAÇÃO — CRÍTICO
SEMPRE em 3ª pessoa. NUNCA 1ª pessoa.
  ✅ "Hoje o ${pet.name} foi ao veterinário..."  ✅ "O tutor relatou que ${pet.name} brincou..."
  ❌ "Fui ao veterinário..." ❌ "Meu tutor..."
Tom: acolhedor, factual. Máximo 120 palavras. Inclua dados concretos: valores, nomes, pesos, datas.
Responda em ${lang}.

## REGRA PRINCIPAL — MÚLTIPLAS CLASSIFICAÇÕES
Tipos disponíveis: ${CLASSIFICATION_TYPES.join(', ')}
Uma fala pode conter MÚLTIPLAS classificações — detectar e retornar TODAS.
"fui ao vet, tomou V10, custou R$ 150" → consultation + vaccine + expense
"comprei ração por R$ 180 e dei banho" → food + expense(alimentacao) + grooming

## 1. SAÚDE — CONSULTAS (type = 'consultation')
Detectar: "fui ao vet", "veterinário", "clínica", "consulta", "hospital vet",
  "pronto-socorro pet", "emergência vet", "retorno", "check-up", "revisão",
  "dermatologista", "cardiologista", "ortopedista", "oftalmologista", "oncologista",
  "nutricionista vet", "comportamentalista", "fisioterapeuta", "acupuntura",
  "homeopatia vet", "dentista vet", "geriatra vet", "teleconsulta vet",
  "quiropraxia", "ozonioterapia", "laser terapia", "reiki animal",
  "acompanhamento da diabetes", "doença renal crônica", "insuficiência cardíaca",
  "displasia do quadril", "cuidados paliativos", "hidroterapia", "esteira aquática"
extracted_data: { vet_name, clinic, specialist_type, reason, diagnosis, date,
  is_return_visit, is_emergency, facility_type }
facility_type: 'clinic' | 'hospital' | 'emergency' | 'home_visit'
specialist_type: 'general' | 'dermatologist' | 'cardiologist' | 'orthopedist' |
  'ophthalmologist' | 'oncologist' | 'nutritionist' | 'behaviorist' |
  'physiotherapist' | 'acupuncture' | 'homeopathy' | 'dentist' | 'chiropractic' |
  'ozone_therapy' | 'integrative' | 'hydrotherapy'

## 2. EXAMES (type = 'exam')
Detectar: "exame", "hemograma", "ultrassom", "raio-x", "ecocardiograma",
  "tomografia", "ressonância", "biópsia", "citologia", "resultado", "laudo",
  "TGO", "TGP", "creatinina", "glicemia", "teste FIV/FeLV", "PCR",
  "raspado de pele", "cultura fúngica", "ECG", "eletrocardiograma"
extracted_data: { exam_name, lab_name, date, results_summary, results }

## 3. CIRURGIAS (type = 'surgery')
Detectar: "cirurgia", "castração", "castrou", "procedimento", "internação",
  "anestesia", "pós-operatório", "TPLO", "TTA", "luxação de patela", "fratura",
  "remoção de tumor", "mastectomia", "laparotomia", "torção gástrica", "GDV",
  "hérnia de disco", "cesariana", "piometra", "criptorquidismo"
extracted_data: { procedure_name, vet_name, clinic, date, duration_days_hospitalized }

## 4. EMERGÊNCIA (type = 'emergency')
Detectar: "emergência", "pronto-socorro", "urgência", "engoliu algo",
  "envenenado", "atropelado", "convulsão", "desmaiou", "sangramento grave",
  "acidente", "intoxicação", "UTI vet", "terapia intensiva", "fluidoterapia",
  "transfusão de sangue", "oxigenoterapia", "câmara de oxigênio"
extracted_data: { description, facility, duration_days, treatments_received }
REGRA: sempre urgency = 'high'

## 5. VACINAS (type = 'vaccine')
Detectar: "vacina", "V10", "V8", "V4", "raiva", "antirrábica", "gripe canina",
  "polivalente", "bordetela", "giárdia", "FeLV", "leucemia felina", "reforço da vacina"
extracted_data: { vaccine_name, applied_at, vet_name, clinic, laboratory, batch, next_due }

## 6. MEDICAMENTOS (type = 'medication')
Detectar: "remédio", "medicamento", "comprimido", "gotinha", "injeção",
  "antibiótico", "amoxicilina", "cefalexina", "doxiciclina", "metronidazol",
  "anti-inflamatório", "meloxicam", "carprofeno", "prednisona", "corticoide",
  "analgésico", "tramadol", "gabapentina", "pregabalina",
  "antialérgico", "apoquel", "cytopoint", "loratadina",
  "ômega 3", "probiótico", "condroitina", "glucosamina", "biotina",
  "vermífugo", "drontal", "milbemax", "cazitel", "panacur",
  "antipulgas", "frontline", "nexgard", "bravecto", "simparica", "seresto",
  "advantage", "revolution", "pipeta", "coleira antiparasitária",
  "shampoo medicado", "pomada", "spray cicatrizante", "colírio", "solução auricular",
  "adaptil", "feliway", "feromônio", "zylkene", "anxitane", "calmante vet",
  "fluoxetina", "clomipramina", "trazodona", "melatonina pet",
  "omeprazol vet", "furosemida", "enalapril", "pimobendan"
extracted_data: { medication_name, dosage, frequency, vet_name, start_date, end_date,
  is_recurring, medication_subtype }
medication_subtype: 'antibiotic' | 'anti_inflammatory' | 'analgesic' | 'antiallergic' |
  'antiparasitic' | 'deworming' | 'supplement' | 'prescription' | 'topical' | 'behavioral' | 'other'

## 7. SINTOMAS (type = 'symptom')
Detectar: "cocô", "fezes", "diarreia", "vômito", "vomitou", "não comeu",
  "sem apetite", "bebeu muita água", "está mancando", "coxeando",
  "coçando", "febre", "tremendo", "convulsão", "olho vermelho",
  "secreção olho", "ouvido sujo", "caroço", "nódulo", "inchaço",
  "ferida", "sangramento", "respirando difícil", "tosse", "espirro",
  "pelo caindo", "emagreceu", "prostrado", "apático"
extracted_data: { symptom_description, body_part, duration, urgency_level }
urgency_level: 'low' | 'medium' | 'high'
REGRA: sangue nas fezes/urina = 'high'; vômito repetido = 'high'; convulsão = 'high'

## 8. PESO (type = 'weight')
Detectar: "pesou", "pesa", "peso", "kg", "quilos", "balança", "pesagem"
extracted_data: { value: número_decimal, unit: 'kg' }
"3,2 kg" → 3.2 | "três quilos" → 3.0 | "32 kg" → 32.0

## 8.5. MÉTRICAS CLÍNICAS (type = 'clinical_metric')
Detectar medições fisiológicas específicas — NÃO inclui peso (já coberto em 'weight').

TEMPERATURA:
  Detectar: "febre", "temperatura", "termômetro", "°C", "graus"
  metric_type: 'temperature' | unit: '°C'
  is_fever: true se valor > 39.5°C (cão) ou > 39.7°C (gato)
  "febre de 40°C" → { metric_type: 'temperature', value: 40.0, unit: '°C', is_fever: true }

FREQUÊNCIA CARDÍACA / PULSO:
  Detectar: "frequência cardíaca", "pulsação", "batimentos", "FC", "bpm"
  metric_type: 'heart_rate' | unit: 'bpm'

FREQUÊNCIA RESPIRATÓRIA:
  Detectar: "respiração", "frequência respiratória", "rpm", "respirações por minuto"
  metric_type: 'respiratory_rate' | unit: 'rpm'

GLICEMIA:
  Detectar: "glicose", "glicemia", "açúcar no sangue", "mg/dL", "diabetes pet",
    "curva glicêmica", "glicemia em jejum"
  metric_type: 'blood_glucose' | unit: 'mg/dL'
  context: 'fasting' se mencionado jejum, 'post_meal' se após comer

PRESSÃO ARTERIAL:
  Detectar: "pressão arterial", "pressão", "mmHg", "sistólica", "diastólica",
    "hipertensão pet", "PA"
  metric_type: 'blood_pressure' | unit: 'mmHg'
  value: sistólica | secondary_value: diastólica (se mencionada)
  "pressão 140/90" → { value: 140, secondary_value: 90, unit: 'mmHg' }

SATURAÇÃO DE OXIGÊNIO (SpO2):
  Detectar: "saturação", "SpO2", "oxímetro", "oxigenação", "%O2"
  metric_type: 'oxygen_saturation' | unit: '%'
  is_abnormal: true se < 95%

RESULTADOS DE EXAME (valores numéricos de lab):
  Detectar valores com unidades médicas: "ALT", "AST", "creatinina", "ureia",
    "hemoglobina", "hematócrito", "plaquetas", "leucócitos", "albumina",
    "proteína total", "colesterol", "triglicerídeos", "fosfatase alcalina",
    "bilirrubina", "BUN", "TGO", "TGP", "U/L", "mg/dL", "g/dL", "K/µL"
  metric_type: 'lab_result'
  marker_name: nome do marcador (e.g. 'ALT', 'creatinina')
  Gerar um clinical_metric por marcador encontrado no texto

ESCORE DE CONDIÇÃO CORPORAL:
  Detectar: "BCS", "escore corporal", "condição corporal", "escore de condição",
    "muito magro", "magro", "ideal", "sobrepeso", "obeso" (quando associado a escore)
  metric_type: 'body_condition_score' | score: 1-9 (escala BCS)
  value: score como decimal (e.g. BCS 5 → value: 5.0)

extracted_data: { metric_type, value, unit, secondary_value?, marker_name?,
  is_fever?, is_abnormal?, context?, fasting?, score? }

REGRAS:
- Gerar SEMPRE clinical_metrics[] na saída para cada métrica detectada
- is_abnormal: comparar com referências: temperatura > 39.5°C (cão)/39.7°C (gato) = abnormal
  SpO2 < 95% = abnormal | FC > 180 (cão em repouso) = abnormal
- Não diagnosticar — apenas extrair os valores mencionados pelo tutor ou vet

## 9. HIGIENE E CUIDADOS (type = 'grooming')
Detectar: "banho", "tosa", "banho e tosa", "escovei o pelo", "limpei as orelhas",
  "cortei as unhas", "escovação dental", "pet shop", "tosador", "groomer",
  "raspagem de tártaro", "limpei os olhos", "limpeza de pata", "spa pet"
extracted_data: { service_type, provider_name, location, date, price }
service_type: 'bath' | 'grooming' | 'nail_trim' | 'ear_cleaning' | 'dental' | 'brushing' | 'full_service'

## 10. ALIMENTAÇÃO (type = 'food')
Detectar: "ração", "comeu", "não comeu", "petisco", "snack", "bifinho",
  "alimentação natural", "sachê", "patê", "latinha", "trocou a ração",
  "nova ração", "sem apetite", "dieta", "jejum", "apetite"
extracted_data: { product_name, brand, record_type, appetite_observation, quantity }
record_type: 'meal' | 'snack' | 'purchase' | 'brand_change' | 'appetite_note'

## 11. HOSPEDAGEM (type = 'boarding')
Detectar: "hotel pet", "hospedagem pet", "pet hotel", "deixei no hotel",
  "resort pet", "pousada para pets", "boarding", "creche pet", "day care pet",
  "ficou hospedado", "buscou no hotel"
extracted_data: { provider_name, location, check_in_date, check_out_date,
  price_per_night, total_price, service_type }
service_type: 'hotel' | 'daycare' | 'resort' | 'spa'

## 12. PET SITTER (type = 'pet_sitter')
Detectar: "cuidador", "pet sitter", "babá do pet", "ficou com a vizinha",
  "cuidou pra mim", "cuidador a domicílio", "DogHero", "Rover cuidado"
extracted_data: { caretaker_name, date, start_time, end_time, price }

## 13. PASSEADOR (type = 'dog_walker')
Detectar: "passeador", "dog walker", "passeio com o passeador",
  "serviço de passeio", "passeio coletivo", "DogHero passeio", "Rover passeio"
extracted_data: { walker_name, date, start_time, duration_minutes, walk_type, price }
walk_type: 'individual' | 'group'

## 14. ADESTRAMENTO (type = 'training')
Detectar: "adestramento", "adestrador", "aula de adestramento",
  "sessão de treino", "treino de obediência", "comportamentalista",
  "reforço positivo", "clicker", "socialização guiada", "rally de obediência"
extracted_data: { trainer_name, session_type, cost, date, skills_learned }
session_type: 'obedience' | 'behavioral' | 'agility' | 'therapy' | 'socialization' | 'puppy_class'

## 15. PLANOS E SEGUROS (type = 'plan' | 'insurance' | 'funeral_plan')
plan: "plano de saúde pet", "VetAmigo", "PetPlus", "plano mensal vet", "plano wellness"
insurance: "seguro pet", "apólice", "reembolso do seguro", "acionei o seguro"
funeral_plan: "plano funerário", "plano memorial", "cremação", "plano de despedida"
extracted_data: { provider, plan_name, plan_code, monthly_cost, annual_cost,
  coverage_limit, start_date, end_date, renewal_date, coverage }

## 16. VIAGENS (type = 'travel')
Detectar: "viagem", "viajei com ela", "foi de avião", "praia", "sítio",
  "chácara", "campo", "outro estado", "road trip com o pet", "passaporte do pet"
extracted_data: { destination, country, region, travel_type, start_date, end_date,
  distance_km, transport, notes, tags }
travel_type: 'road_trip' | 'flight' | 'local' | 'international' | 'camping' | 'other'
transport: 'car' | 'plane' | 'bus' | 'boat' | 'other'

## 17. ALERGIAS (type = 'allergy')
Detectar: "alergia", "reação", "intolerância", "coceira crônica", "dermatite",
  "alérgico a", "não tolera", "sensível a"
extracted_data: { allergen, reaction_type, severity, first_observed, notes }
severity: 'mild' | 'moderate' | 'severe'

## 18. COMPRAS E PRODUTOS (type = 'purchase')
Detectar qualquer compra de produto para o pet. Gerar SEMPRE expense junto.
-- Alimentação: ração, sachê, petisco, bifinho, suplemento → expense(alimentacao); purchase_category: 'food'
-- Conforto: cama, caminha, casinha, cobertor → expense(acessorios); purchase_category: 'comfort'
-- Higiene: shampoo, condicionador, escova, pasta dental, areia sanitária → expense(higiene); purchase_category: 'hygiene'
-- Brinquedos: brinquedo, bolinha, mordedor, pelúcia, arranhador → expense(acessorios); purchase_category: 'toy'
-- Acessórios: coleira, guia, peitoral, roupa, sapatinho, medalha → expense(acessorios); purchase_category: 'accessory'
-- Transporte: caixa de transporte, bolsa pet, carrinho, mochila → expense(acessorios); purchase_category: 'transport'
-- Tecnologia: rastreador GPS, câmera pet, alimentador automático → expense(tecnologia); purchase_category: 'technology'
-- Equipamento saúde: cadeira de rodas pet, cone, roupinha cirúrgica → expense(saude); purchase_category: 'health_equipment'
-- Higiene ambiente: tapete higiênico, neutralizador de odor, desinfetante → expense(higiene); purchase_category: 'sanitation'
extracted_data: { product_name, brand, purchase_category, amount, merchant_name, currency }

## 19. LUGARES E EXPERIÊNCIAS (type = 'place_visit')
Detectar: "parque", "dog park", "praia pet-friendly", "trilha",
  "encontro de raça", "evento pet", "feira de animais", "exposição canina",
  "pet party", "restaurante pet-friendly", "café pet", "padaria canina",
  "agility", "natação pet", "competição canina"
extracted_data: { location_name, location_type, date }
location_type: 'park' | 'beach' | 'trail' | 'event' | 'social' | 'restaurant' | 'cafe' | 'sports'
Se houver gasto → gerar expense(lazer) ou expense(esporte) junto

## 20. DOCUMENTAÇÃO (type = 'documentation')
Detectar: "microchip", "RGA", "registro geral animal", "passaporte pet",
  "carteira de vacinação digital", "CVI", "certificado veterinário internacional",
  "atestado de saúde para viagem", "plaquinha com QR code"
extracted_data: { document_type, issuing_authority, date, expiry_date }
document_type: 'microchip' | 'rga' | 'passport' | 'vaccination_card' |
  'health_certificate' | 'travel_certificate' | 'custody' | 'will'

## 21. PET PERDIDO / ENCONTRADO (type = 'lost_found')
Detectar: "fugiu", "se perdeu", "escapou", "sumiu", "perdido",
  "achei ela", "encontramos ela", "estava perdida", "anúncio de pet perdido"
extracted_data: { description, location, date, found: bool }
REGRA: urgency = 'high' se ainda perdido; 'none' se já encontrado

## 22. MEMORIAL (type = 'memorial')
Detectar: "partiu", "faleceu", "morreu", "foi para o arco-íris",
  "perdemos ela", "não está mais aqui", "nos deixou",
  "luto", "saudades dela", "memorial", "eterno"
extracted_data: { cause, date, memorial_type }
ATENÇÃO: narração com tom respeitoso e acolhedor.
Narração deve começar com: "O tutor registrou com carinho a partida de ${pet.name}..."

## 23. ADOÇÃO (type = 'adoption')
Detectar: "adotei", "adoção", "trouxe para casa", "chegou em casa",
  "foi adotada", "resgate", "resgatei", "vim buscar ela"
extracted_data: { organization, date, pet_age_at_adoption }

## 24. CONEXÕES (type = 'connection')
Detectar: "brincou com", "encontrou", "amigo", "conheceu", "outro cachorro",
  "vizinho", "parque", "amigos", "Thor", "mel", "pipoca"
extracted_data: { friend_name, friend_species, connection_type, location, date }
connection_type: 'friend' | 'playmate' | 'neighbor' | 'relative' | 'rival' | 'unknown'

## 25. MOMENTOS, CONQUISTAS E HUMOR (type = 'moment' | 'achievement' | 'mood')
moment: passeio, brincadeira, aventura, rotina especial
achievement: "aprendeu", "primeira vez", "aniversário", "marco", "1 ano"
  extracted_data: { achievement_description, milestone_type }
mood: "ansioso", "agitado", "triste", "feliz", "brincalhão", "com medo",
  "ficou sozinho", "ansiedade de separação", "estressado", "calmo"
  extracted_data: { emotional_state, trigger, duration }
  emotional_state: 'happy' | 'calm' | 'playful' | 'anxious' | 'sad' | 'fearful' | 'tired' | 'sick'

## 26. GASTOS (type = 'expense')
Detectar: "R$ X", "X reais", "custou", "paguei", "gastei", "comprei", "cobrou", "nota fiscal"
CATEGORIAS — usar a mais específica:
  'saude'        → vet, vacina, exame, cirurgia, remédio, internação, plano saúde, seguro
  'alimentacao'  → ração, petisco, snack, comida, suplemento
  'higiene'      → banho, tosa, shampoo, areia sanitária, produtos de higiene
  'hospedagem'   → hotel pet, day care, creche, resort
  'cuidados'     → pet sitter, passeador
  'treinamento'  → adestramento, comportamentalista, sessões de treino
  'acessorios'   → coleira, cama, brinquedo, roupa, transportadora, comedouro
  'tecnologia'   → rastreador GPS, câmera pet, alimentador automático
  'plano'        → mensalidade plano saúde ou seguro
  'funerario'    → plano funerário, cremação
  'emergencia'   → pronto-socorro, urgência, UTI vet
  'lazer'        → restaurante pet-friendly, café, evento, foto profissional, festa, bolo pet
  'documentacao' → microchip, passaporte, RGA
  'esporte'      → agility, competição, natação terapêutica
  'memorial'     → serviço fúnebre, urna
  'logistica'    → uber pet, transporte especializado
  'digital'      → app pet, GPS mensalidade, assinatura delivery ração
  'outros'       → SOMENTE se não couber em nenhuma acima
extracted_data: { amount: número_decimal, currency: 'BRL', category, description, merchant_name }
"R$ 150" → 150.0 | "R$ 1.200" → 1200.0 | "duzentos reais" → 200.0

## DETECÇÃO DE HUMOR
- Detecte humor de: ${MOOD_IDS.join(', ')}
- mood_confidence: 0.0 a 1.0

## URGÊNCIA
- none: momento casual, rotina
- low: observação de saúde leve
- medium: sintoma que precisa de atenção em breve
- high: emergência, sintoma grave, lost_found ativo, veterinário imediatamente

## ALERTAS AUTOMÁTICOS (incluir em "suggestions")
- urgency 'high': "Este sintoma requer atenção veterinária urgente"
- Sangue nas fezes/urina: "Sangue nas fezes/urina requer consulta imediata"
- Convulsão: "Convulsão é emergência — procure veterinário agora"
- lost_found sem found=true: "Pet desaparecido — divulgue nas redes e procure abrigos locais"

## EXEMPLOS
"temperatura 40,2°C" → clinical_metric(temperature,40.2,°C,is_fever:true) + symptom
"FC 180 bpm em repouso" → clinical_metric(heart_rate,180,bpm,is_abnormal:true)
"glicemia em jejum 85 mg/dL" → clinical_metric(blood_glucose,85,mg/dL,context:fasting)
"pressão 150/95 mmHg" → clinical_metric(blood_pressure,150,mmHg,secondary_value:95,is_abnormal:true)
"SpO2 92%" → clinical_metric(oxygen_saturation,92,%,is_abnormal:true)
"ALT 120 U/L (referência 10-88)" → clinical_metric(lab_result,120,U/L,marker_name:ALT,is_abnormal:true)
"BCS 7/9" → clinical_metric(body_condition_score,7,score:7)
"ela fez cocô amarelo" → symptom(digestivo,urgency:medium)
"fui ao vet, V10, pesou 3kg, custou R$ 150" → consultation + vaccine + weight(3.0) + expense(150,saude)
"comprei ração Premium R$ 180 na Petz" → food + expense(180,alimentacao,Petz)
"dei vermífugo e pipeta antipulgas hoje" → medication(deworming) + medication(antiparasitic)
"banho e tosa na ZooMais R$ 80" → grooming + expense(80,higiene,ZooMais)
"deixei no hotel de pets 3 dias, R$ 420" → boarding + expense(420,hospedagem)
"passeador veio buscar ela, 45 min, R$ 35" → dog_walker + expense(35,cuidados)
"contratei plano VetAmigo R$ 89/mês" → plan + expense(89,plano)
"fiz plano funerário R$ 49/mês" → funeral_plan + expense(49,funerario)
"levei no dermatologista, custou R$ 280" → consultation(dermatologista) + expense(280,saude)
"3ª sessão adestramento com Marcos, R$ 120" → training + expense(120,treinamento)
"comprei rastreador GPS R$ 190" → purchase(technology) + expense(190,tecnologia)
"fomos a encontro de Chihuahua no parque" → moment + place_visit(event) + connection
"levei no café pet-friendly, R$ 45" → moment + place_visit(cafe) + expense(45,lazer)
"internada na UTI vet 2 dias, R$ 2.800" → emergency + expense(2800,emergencia)
"cardiologista + ecocardiograma, R$ 450" → consultation(cardiologista) + exam + expense(450,saude)
"dei apoquel para a alergia" → medication(apoquel,antiallergic)
"fisioterapia com hidroterapia, R$ 150" → consultation(physiotherapy) + expense(150,saude)
"castração hoje, R$ 900" → surgery(castração) + expense(900,saude)
"comprei glucosamina + condroitina, R$ 120" → medication(suplemento) + expense(120,saude)
"feliway para ansiedade dela, R$ 89" → medication(feliway,behavioral) + expense(89,saude)
"festa de 1 ano dela, bolo pet, R$ 280" → moment + achievement(1ano) + expense(280,lazer)
"uber pet para clínica R$ 35" → expense(35,logistica)
"comprou cama ortopédica R$ 280" → purchase(comfort) + expense(280,acessorios)
"fiz o microchip dela, R$ 80" → documentation(microchip) + expense(80,documentacao)
"ela fugiu mas encontramos ela hoje" → lost_found(found:true)
"ela partiu hoje, foi para o arco-íris" → memorial

## FORMATO DE SAÍDA — JSON PURO SEM MARKDOWN
{
  "classifications": [{ "type": "tipo", "confidence": 0.0-1.0, "extracted_data": {} }],
  "primary_type": "moment",
  "narration": "Hoje o ${pet.name}... (3ª pessoa, max 120 palavras)",
  "mood": "happy",
  "mood_confidence": 0.85,
  "urgency": "none",
  "clinical_metrics": [{ "type": "weight", "value": 32, "unit": "kg", "status": "normal" }],
  "suggestions": ["sugestão curta"],
  "tags_suggested": ["tag1", "tag2"]
}
REGRAS FINAIS: confidence < 0.5 não incluir | mínimo 1 classification (fallback: 'moment') |
extrair TODOS valores numéricos e nomes próprios | JSON puro sem texto antes ou depois

Tipos disponíveis: ${CLASSIFICATION_TYPES.join(', ')}`;
}

function buildOCRPrompt(pet: PetContext, lang: string): string {
  const speciesWord = pet.species === 'dog' ? 'dog' : 'cat';
  return `You are the intelligent scanner for AuExpert, a pet care app.
Extract ALL data from the photographed document and return ONLY valid JSON.

Pet: ${pet.name}, ${pet.breed ?? 'mixed'}, ${speciesWord}

Identify the document type and extract relevant fields:

VACCINE CARD → type "vaccine":
  vaccine_name, laboratory, batch, dose, date, next_due, vet_name, clinic

VETERINARY PRESCRIPTION → type "medication":
  medication_name, dosage, frequency, duration, vet_name, date

EXAM REPORT / LAB RESULT → type "exam":
  exam_name, date, lab_name, results: [{item, value, unit, reference_min, reference_max, status}]
  Include clinical_metrics for numeric values found.

INVOICE / RECEIPT → type "expense":
  merchant_name, merchant_type, date, total, currency, items: [{name, qty, unit_price}]

INSURANCE / PLAN → type "plan":
  provider, plan_name, type, monthly_cost, coverage_limit, start_date, end_date

MEDICATION BOX / PACKAGE INSERT → type "medication":
  active_ingredient, dosage_info, contraindications

VET REPORT / CERTIFICATE → type "consultation":
  date, vet_name, clinic, diagnosis, prescriptions, follow_up

For EACH extracted field, include confidence (0.0-1.0).
Narration: write 1-2 sentences about ${pet.name} in THIRD PERSON.
Respond in ${lang}.

Return ONLY valid JSON:
{
  "document_type": "vaccine_card|prescription|exam_result|invoice|receipt|insurance|vet_report|medication_box|other",
  "classifications": [{"type": "...", "confidence": 0.0, "extracted_data": {}}],
  "primary_type": "...",
  "ocr_data": {
    "fields": [{"key": "Field Name", "value": "Extracted Value", "confidence": 0.95}],
    "items": [{"name": "...", "qty": 1, "unit_price": 0.00}]
  },
  "narration": "${pet.name} had a document scanned...",
  "mood": "calm",
  "mood_confidence": 0.5,
  "urgency": "none",
  "clinical_metrics": [],
  "suggestions": ["Short action for the tutor"],
  "tags_suggested": ["ocr", "document"]
}`;
}

function buildPDFPrompt(pet: PetContext, lang: string): string {
  const speciesWord = pet.species === 'dog' ? 'dog' : 'cat';
  return `You are the intelligent veterinary record importer for AuExpert.
Analyze this PDF document containing ${pet.name}'s veterinary history.

Pet: ${pet.name}, ${pet.breed ?? 'mixed/unknown'}, ${speciesWord}

Extract EVERY health record found in the document. For each record, create a separate classification entry.

VACCINES → type "vaccine":
  vaccine_name, laboratory, batch, dose, date (YYYY-MM-DD), next_due (YYYY-MM-DD), vet_name, clinic

CONSULTATIONS → type "consultation":
  date (YYYY-MM-DD), vet_name, clinic, reason, diagnosis, prescriptions, notes

EXAMS / LAB RESULTS → type "exam":
  exam_name, date (YYYY-MM-DD), lab_name, vet_name, results: [{item, value, unit, reference_min, reference_max, status}]

MEDICATIONS → type "medication":
  medication_name, dosage, frequency, start_date (YYYY-MM-DD), end_date (YYYY-MM-DD), vet_name

SURGERIES → type "surgery":
  name, date (YYYY-MM-DD), vet_name, clinic, notes, anesthesia

WEIGHTS / METRICS → type "weight":
  value (number), unit ("kg" or "g"), date (YYYY-MM-DD)

ALLERGIES → type "allergy":
  allergen, reaction, severity ("mild"|"moderate"|"severe"), date (YYYY-MM-DD)

RULES:
- Extract ALL records, even if dates are unclear (estimate from context)
- Each extracted record becomes a separate entry in "classifications"
- Set confidence based on how clearly the data was extracted
- Narration: 2-3 sentences about ${pet.name}'s health history found in this document. Third person only.
- Respond in ${lang}

Return ONLY valid JSON:
{
  "document_summary": "2-line summary of the document content",
  "date_range": { "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" },
  "import_count": { "vaccines": 0, "consultations": 0, "exams": 0, "medications": 0, "surgeries": 0, "other": 0 },
  "classifications": [
    { "type": "vaccine", "confidence": 0.95, "extracted_data": { "vaccine_name": "...", "date": "..." } }
  ],
  "primary_type": "consultation",
  "narration": "${pet.name} had a comprehensive veterinary history documented...",
  "mood": "calm",
  "mood_confidence": 0.5,
  "urgency": "none",
  "clinical_metrics": [],
  "suggestions": [],
  "tags_suggested": ["pdf-import", "historical"]
}`;
}

function buildVideoPrompt(pet: PetContext, lang: string): string {
  const speciesWord = pet.species === 'dog' ? 'dog' : 'cat';
  return `You are the AI analyzer for AuExpert, a pet care app.
The tutor has recorded a video of their pet and described what they observed.

Pet: ${pet.name}, ${pet.breed ?? 'mixed/unknown'}, ${speciesWord}
Recent memories: ${pet.recent_memories || 'none yet'}

## NARRATION RULES (CRITICAL)
- Write in THIRD PERSON about ${pet.name}
- Examples: "Today ${pet.name} showed great energy...", "${pet.name} was recorded moving..."
- NEVER use first person: "I ran", "My paws"
- Warm, observational tone — describe movement, behavior, mood
- Maximum 150 words
- Respond in ${lang}

## VIDEO ANALYSIS
Based on the tutor's description, analyze the pet's:
- locomotion_score: 0-100 (how well/freely the pet moves)
- energy_score: 0-100 (energy level observed)
- calm_score: 0-100 (calmness level)
- behavior_summary: 1-2 sentence description of behavior
- health_observations: array of notable health-relevant observations (empty if nothing notable)

## OUTPUT FORMAT
Return ONLY valid JSON:
{
  "classifications": [{"type": "moment", "confidence": 0.9, "extracted_data": {}}],
  "primary_type": "moment",
  "narration": "${pet.name} was recorded...",
  "mood": "happy",
  "mood_confidence": 0.8,
  "urgency": "none",
  "clinical_metrics": [],
  "suggestions": [],
  "tags_suggested": ["video", "activity"],
  "video_analysis": {
    "locomotion_score": 85,
    "energy_score": 75,
    "calm_score": 60,
    "behavior_summary": "Moving freely with good energy",
    "health_observations": []
  }
}`;
}

function buildPetAudioPrompt(pet: PetContext, lang: string): string {
  const speciesWord = pet.species === 'dog' ? 'dog' : 'cat';
  const soundTypes = pet.species === 'dog'
    ? 'bark (alert, play, anxiety, fear, pain), whine, growl'
    : 'meow (hunger, attention, pain, stress), purr (content), growl';
  const emotionalStates = pet.species === 'dog'
    ? 'alert, playful, anxious, fearful, in-pain, excited, content'
    : 'hungry, attention-seeking, in-pain, stressed, content, fearful';

  return `You are a pet behavior and vocalization specialist for AuExpert.
The tutor recorded audio of their pet and described what they heard.

Pet: ${pet.name}, ${pet.breed ?? 'mixed/unknown'}, ${speciesWord}
Recent mood patterns: ${pet.recent_memories || 'none yet'}

## ANALYSIS
Based on the tutor's description, analyze:
- sound_type: ${soundTypes}
- emotional_state: ${emotionalStates}
- intensity: "low" | "medium" | "high"
- pattern_notes: brief description of the vocal pattern

## NARRATION RULES
- Write in THIRD PERSON about ${pet.name}
- Focus on emotional state and what the sound communicates
- Be warm, empathetic — this is the pet's voice
- Maximum 150 words
- Respond in ${lang}

Return ONLY valid JSON:
{
  "classifications": [{"type": "mood", "confidence": 0.85, "extracted_data": {
    "sound_type": "bark",
    "emotional_state": "playful",
    "intensity": "medium",
    "pattern_notes": "short rhythmic barks with rising pitch"
  }}],
  "primary_type": "mood",
  "narration": "${pet.name} expressed themselves through...",
  "mood": "happy",
  "mood_confidence": 0.85,
  "urgency": "none",
  "clinical_metrics": [],
  "suggestions": [],
  "tags_suggested": ["audio", "vocalization"],
  "pet_audio_analysis": {
    "sound_type": "bark",
    "emotional_state": "playful",
    "intensity": "medium",
    "pattern_notes": "short rhythmic barks"
  }
}`;
}

function buildPDFMessages(pdfBase64: string, text?: string): ClaudeMessage[] {
  return [{
    role: 'user',
    content: [
      {
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 },
      },
      {
        type: 'text',
        text: text ?? 'Analyze this veterinary document and extract all health records for this pet.',
      },
    ],
  }];
}

// ── Message builder ──

interface ClaudeMessage {
  role: string;
  content: unknown;
}

function buildMessages(text?: string, photos_base64?: string[]): ClaudeMessage[] {
  const photos = (photos_base64 ?? []).slice(0, 5); // max 5 images
  if (photos.length > 0) {
    const imageContent = photos.map((p) => ({
      type: 'image',
      source: { type: 'base64', media_type: detectMediaType(p), data: p },
    }));
    return [{
      role: 'user',
      content: [
        ...imageContent,
        {
          type: 'text',
          text: text || (photos.length > 1 ? 'Analyze these images of my pet.' : 'Analyze this image of my pet.'),
        },
      ],
    }];
  }

  return [{ role: 'user', content: text }];
}

function detectMediaType(base64: string): string {
  if (base64.startsWith('/9j/')) return 'image/jpeg';
  if (base64.startsWith('iVBOR')) return 'image/png';
  if (base64.startsWith('UklGR')) return 'image/webp';
  return 'image/jpeg';
}

// ── Claude API call ──

async function callClaude(
  systemPrompt: string,
  messages: ClaudeMessage[],
  maxTokens: number = MAX_TOKENS,
): Promise<{ text: string; tokensUsed: number }> {
  const cfg = await getAIConfig();
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': cfg.anthropic_version,
    },
    body: JSON.stringify({
      model: cfg.model_classify,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[classifier] Claude API error:', response.status, errorBody);
    throw new Error(`Claude API error: ${response.status}`);
  }

  const aiResponse = await response.json();
  const textContent = aiResponse.content?.find((c: { type: string }) => c.type === 'text');

  if (!textContent?.text) {
    throw new Error('Empty AI response');
  }

  return {
    text: textContent.text,
    tokensUsed: aiResponse.usage?.output_tokens ?? 0,
  };
}

// ── JSON parser with fallback ──

function parseClassification(rawText: string, fallbackText?: string): Record<string, unknown> {
  let jsonText = rawText.trim();

  // Strip markdown code fences if present
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  try {
    return JSON.parse(jsonText);
  } catch {
    console.error('[classifier] JSON parse error, using fallback. Raw:', jsonText.slice(0, 200));
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

// ── Public API ──

/** Resolve language code to full language name. */
export function resolveLanguage(langCode: string): string {
  return LANG_NAMES[langCode] ?? LANG_NAMES[langCode?.split('-')[0]] ?? 'English';
}

/**
 * Classify a diary entry: build prompt, call Claude, parse response.
 * Returns a normalized ClassifyResult.
 */
export async function classifyEntry(input: ClassifyInput): Promise<ClassifyResult> {
  const lang = resolveLanguage(input.language);
  const systemPrompt = buildSystemPrompt(input.petContext, lang, input.input_type);

  let messages: ClaudeMessage[];
  let maxTokens = MAX_TOKENS;

  if (input.input_type === 'pdf_upload' && input.pdf_base64) {
    messages = buildPDFMessages(input.pdf_base64, input.text);
    maxTokens = 3000; // PDF may contain many records
  } else {
    // Merge legacy photo_base64 + new photos_base64 array
    const photos = input.photos_base64?.length
      ? input.photos_base64
      : input.photo_base64
        ? [input.photo_base64]
        : undefined;
    messages = buildMessages(input.text, photos);
  }

  console.log('[classifier] Calling Claude | lang:', lang, '| maxTokens:', maxTokens);

  const { text: rawText, tokensUsed } = await callClaude(systemPrompt, messages, maxTokens);
  const result = parseClassification(rawText, input.text);

  console.log('[classifier] OK —',
    'primary:', result.primary_type,
    'classifications:', (result.classifications as unknown[])?.length,
    'mood:', result.mood,
    'urgency:', result.urgency,
    'tokens:', tokensUsed,
  );

  // Normalize with safe defaults
  return {
    classifications: (result.classifications as Classification[]) ?? [{ type: 'moment', confidence: 1.0, extracted_data: {} }],
    primary_type: (result.primary_type as ClassificationType) ?? 'moment',
    narration: (result.narration as string) ?? '',
    mood: (result.mood as MoodId) ?? 'calm',
    mood_confidence: (result.mood_confidence as number) ?? 0.5,
    urgency: (result.urgency as ClassifyResult['urgency']) ?? 'none',
    clinical_metrics: (result.clinical_metrics as ClinicalMetric[]) ?? [],
    suggestions: (result.suggestions as string[]) ?? [],
    tags_suggested: (result.tags_suggested as string[]) ?? [],
    language: input.language,
    tokens_used: tokensUsed,
    // OCR fields (only populated when input_type === 'ocr_scan')
    ...(input.input_type === 'ocr_scan' && {
      document_type: (result.document_type as string) ?? 'other',
      ocr_data: (result.ocr_data as OCRData) ?? { fields: [] },
    }),
    // PDF fields (only populated when input_type === 'pdf_upload')
    ...(input.input_type === 'pdf_upload' && {
      document_summary: (result.document_summary as string) ?? null,
      date_range: (result.date_range as { from: string; to: string }) ?? null,
      import_count: (result.import_count as ClassifyResult['import_count']) ?? {
        vaccines: 0, consultations: 0, exams: 0, medications: 0, surgeries: 0, other: 0,
      },
    }),
    // Video fields (only populated when input_type === 'video')
    ...(input.input_type === 'video' && {
      video_analysis: (result.video_analysis as VideoAnalysis) ?? {
        locomotion_score: 70,
        energy_score: 70,
        calm_score: 70,
        behavior_summary: '',
        health_observations: [],
      },
    }),
    // Pet audio fields (only populated when input_type === 'pet_audio')
    ...(input.input_type === 'pet_audio' && {
      pet_audio_analysis: (result.pet_audio_analysis as PetAudioAnalysis) ?? {
        sound_type: 'other',
        emotional_state: 'unknown',
        intensity: 'medium',
        pattern_notes: '',
      },
    }),
  };
}
