import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import * as api from '../lib/api';
import { generateEmbedding } from '../lib/rag';
import { supabase } from '../lib/supabase';
import i18n from '../i18n';
import type { Vaccine, Allergy } from '../types/database';

// ── Helper: build embedding text from record fields ──
function buildEmbeddingText(fields: Record<string, unknown>): string {
  return Object.entries(fields)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join('. ');
}

// ══════════════════════════════════════
// VACCINES
// ══════════════════════════════════════

export function useVaccines(petId: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['pets', petId, 'vaccines'],
    queryFn: () => api.fetchVaccines(petId),
    enabled: isAuthenticated && !!petId,
  });

  const addMutation = useMutation({
    mutationFn: (vaccine: Omit<Vaccine, 'id' | 'created_at' | 'is_active'>) =>
      api.createVaccine(vaccine),
    onSuccess: (newVaccine) => {
      qc.setQueryData<Vaccine[]>(['pets', petId, 'vaccines'], (old) =>
        old ? [newVaccine, ...old] : [newVaccine],
      );
      // Feed RAG with vaccine data
      const text = buildEmbeddingText({
        tipo: 'Vacina aplicada',
        nome: newVaccine.name,
        data: newVaccine.date_administered,
        lote: newVaccine.lot_number,
        veterinario: newVaccine.veterinarian,
        clinica: newVaccine.clinic,
        proxima: newVaccine.next_due_date,
      });
      generateEmbedding(petId, 'vaccine', newVaccine.id, text, 0.9).catch(() => {});

      // Bridge: create emotional diary entry from health event
      const summary = `${newVaccine.name}${newVaccine.veterinarian ? `, ${newVaccine.veterinarian}` : ''}${newVaccine.clinic ? `, ${newVaccine.clinic}` : ''}`;
      supabase.functions.invoke('bridge-health-to-diary', {
        body: { pet_id: petId, user_id: newVaccine.user_id, event_type: 'vaccine', event_summary: summary, language: i18n.language },
      }).then(() => {
        qc.invalidateQueries({ queryKey: ['pets', petId, 'diary'] });
      }).catch((err) => console.warn('[useHealth] bridge diary failed:', err));
    },
  });

  const vaccines = query.data ?? [];
  const overdueCount = vaccines.filter(
    (v) => v.next_due_date && new Date(v.next_due_date) < new Date(),
  ).length;
  const upcomingCount = vaccines.filter((v) => {
    if (!v.next_due_date) return false;
    const due = new Date(v.next_due_date);
    const now = new Date();
    const inWeek = new Date(now.getTime() + 7 * 86_400_000);
    return due >= now && due <= inWeek;
  }).length;

  return {
    vaccines,
    overdueCount,
    upcomingCount,
    isLoading: query.isLoading,
    refetch: query.refetch,
    addVaccine: addMutation.mutateAsync,
    isAdding: addMutation.isPending,
  };
}

// ══════════════════════════════════════
// EXAMS
// ══════════════════════════════════════

export function useExams(petId: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['pets', petId, 'exams'], queryFn: () => api.fetchExams(petId), enabled: isAuthenticated && !!petId });
  const addMutation = useMutation({
    mutationFn: (exam: Record<string, unknown>) => api.createExam(exam),
    onSuccess: (newExam: Record<string, unknown>) => {
      qc.setQueryData(['pets', petId, 'exams'], (old: unknown[]) => old ? [newExam, ...old] : [newExam]);
      const text = buildEmbeddingText({ tipo: 'Exame realizado', nome: newExam.name, data: newExam.date, resultado: newExam.result, laboratorio: newExam.laboratory });
      generateEmbedding(petId, 'diary', String(newExam.id ?? ''), text, 0.85).catch(() => {});
    },
  });
  return { exams: (query.data ?? []) as Record<string, unknown>[], isLoading: query.isLoading, refetch: query.refetch, addExam: addMutation.mutateAsync, isAdding: addMutation.isPending };
}

// ══════════════════════════════════════
// MEDICATIONS
// ══════════════════════════════════════

export function useMedications(petId: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['pets', petId, 'medications'], queryFn: () => api.fetchMedications(petId), enabled: isAuthenticated && !!petId });
  const addMutation = useMutation({
    mutationFn: (med: Record<string, unknown>) => api.createMedication(med),
    onSuccess: (newMed: Record<string, unknown>) => {
      qc.setQueryData(['pets', petId, 'medications'], (old: unknown[]) => old ? [newMed, ...old] : [newMed]);
      const text = buildEmbeddingText({ tipo: 'Medicamento registrado', nome: newMed.name, dosagem: newMed.dosage, frequencia: newMed.frequency, inicio: newMed.start_date, fim: newMed.end_date });
      generateEmbedding(petId, 'diary', String(newMed.id ?? ''), text, 0.85).catch(() => {});
    },
  });
  return { medications: (query.data ?? []) as Record<string, unknown>[], isLoading: query.isLoading, refetch: query.refetch, addMedication: addMutation.mutateAsync, isAdding: addMutation.isPending };
}

// ══════════════════════════════════════
// CONSULTATIONS
// ══════════════════════════════════════

export function useConsultations(petId: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['pets', petId, 'consultations'], queryFn: () => api.fetchConsultations(petId), enabled: isAuthenticated && !!petId });
  const addMutation = useMutation({
    mutationFn: (cons: Record<string, unknown>) => api.createConsultation(cons),
    onSuccess: (newCons: Record<string, unknown>) => {
      qc.setQueryData(['pets', petId, 'consultations'], (old: unknown[]) => old ? [newCons, ...old] : [newCons]);
      const text = buildEmbeddingText({ tipo: 'Consulta veterinaria', veterinario: newCons.veterinarian, clinica: newCons.clinic, data: newCons.date, diagnostico: newCons.diagnosis, notas: newCons.notes });
      generateEmbedding(petId, 'diary', String(newCons.id ?? ''), text, 0.85).catch(() => {});
    },
  });
  return { consultations: (query.data ?? []) as Record<string, unknown>[], isLoading: query.isLoading, refetch: query.refetch, addConsultation: addMutation.mutateAsync, isAdding: addMutation.isPending };
}

// ══════════════════════════════════════
// SURGERIES
// ══════════════════════════════════════

export function useSurgeries(petId: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['pets', petId, 'surgeries'], queryFn: () => api.fetchSurgeries(petId), enabled: isAuthenticated && !!petId });
  const addMutation = useMutation({
    mutationFn: (surg: Record<string, unknown>) => api.createSurgery(surg),
    onSuccess: (newSurg: Record<string, unknown>) => {
      qc.setQueryData(['pets', petId, 'surgeries'], (old: unknown[]) => old ? [newSurg, ...old] : [newSurg]);
      const text = buildEmbeddingText({ tipo: 'Cirurgia realizada', nome: newSurg.name, data: newSurg.date, veterinario: newSurg.veterinarian, clinica: newSurg.clinic, notas: newSurg.notes });
      generateEmbedding(petId, 'diary', String(newSurg.id ?? ''), text, 0.85).catch(() => {});
    },
  });
  return { surgeries: (query.data ?? []) as Record<string, unknown>[], isLoading: query.isLoading, refetch: query.refetch, addSurgery: addMutation.mutateAsync, isAdding: addMutation.isPending };
}

// ══════════════════════════════════════
// ALLERGIES
// ══════════════════════════════════════

export function useAllergies(petId: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['pets', petId, 'allergies'],
    queryFn: () => api.fetchAllergies(petId),
    enabled: isAuthenticated && !!petId,
  });

  const addMutation = useMutation({
    mutationFn: (allergy: Omit<Allergy, 'id' | 'created_at' | 'is_active'>) =>
      api.createAllergy(allergy),
    onSuccess: (newAllergy) => {
      qc.setQueryData<Allergy[]>(['pets', petId, 'allergies'], (old) =>
        old ? [newAllergy, ...old] : [newAllergy],
      );
      // Feed RAG with allergy data
      const text = buildEmbeddingText({
        tipo: 'Alergia registrada',
        alergeno: newAllergy.allergen,
        reacao: newAllergy.reaction,
        severidade: newAllergy.severity,
        diagnosticado: newAllergy.diagnosed_by,
      });
      generateEmbedding(petId, 'allergy', newAllergy.id, text, 0.9).catch(() => {});

      // Bridge: create emotional diary entry from allergy registration
      const summary = `${newAllergy.allergen}${newAllergy.reaction ? ` — ${newAllergy.reaction}` : ''}${newAllergy.severity ? ` (${newAllergy.severity})` : ''}`;
      supabase.functions.invoke('bridge-health-to-diary', {
        body: { pet_id: petId, user_id: newAllergy.user_id, event_type: 'allergy', event_summary: summary, language: i18n.language },
      }).then(() => {
        qc.invalidateQueries({ queryKey: ['pets', petId, 'diary'] });
      }).catch((err) => console.warn('[useHealth] bridge diary failed:', err));
    },
  });

  return {
    allergies: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    addAllergy: addMutation?.mutateAsync,
    isAddingAllergy: addMutation?.isPending,
  };
}

// ══════════════════════════════════════
// MOOD LOGS
// ══════════════════════════════════════

export function useMoodLogs(petId: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const query = useQuery({
    queryKey: ['pets', petId, 'moods'],
    queryFn: () => api.fetchMoodLogs(petId),
    enabled: isAuthenticated && !!petId,
  });

  return {
    moodLogs: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
