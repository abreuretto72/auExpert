/**
 * PDF prompt builder — assembles the system prompt used when the tutor
 * uploads a PDF containing the pet's veterinary history. The goal is bulk
 * extraction of every record (vaccines, consultations, exams, medications,
 * surgeries, weights, allergies) — each becomes a separate classification.
 */

import type { PetContext } from '../../context.ts';

export function buildPDFPrompt(pet: PetContext, lang: string): string {
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
