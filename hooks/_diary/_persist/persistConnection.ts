/**
 * persistConnection — inserts a `pet_connections` row when the classifier
 * identifies a new friend/pet that the pet interacted with.
 *
 * Bug histórico (corrigido 2026-04-27): o classifier retorna friend_species
 * em português ("cão", "gato", etc.) mas a tabela tem CHECK constraint que só
 * aceita os valores em inglês (dog/cat/rabbit/bird/reptile/other/unknown).
 * Sem normalização, o INSERT falhava silenciosamente e nada aparecia em
 * pet_connections. Mesma coisa para connection_type.
 *
 * Behavior preserved + fixes:
 *   - Skip silently when `friend_name` is missing.
 *   - `first_met_at` / `last_seen_at` default to `ctx.today`.
 *   - `friend_species` normalizado: cão→dog, gato→cat, etc.
 *   - `friend_owner` aceita alias `owner_name` (o classifier alterna).
 *   - `connection_type` validado contra enum.
 *   - Insert error é LOGADO (não silenciado) pra debug futuro.
 */
import { supabase } from '../../../lib/supabase';
import type { Persister } from './types';

const SPECIES_MAP: Record<string, string> = {
  // PT
  'cão': 'dog', 'cao': 'dog', 'cachorro': 'dog',
  'gato': 'cat', 'gata': 'cat',
  'coelho': 'rabbit',
  'pássaro': 'bird', 'passaro': 'bird', 'ave': 'bird',
  'réptil': 'reptile', 'reptil': 'reptile',
  // EN (no-op canonical)
  'dog': 'dog', 'cat': 'cat', 'rabbit': 'rabbit',
  'bird': 'bird', 'reptile': 'reptile',
  // ES
  'perro': 'dog', 'perra': 'dog',
  // Fallback
  'other': 'other', 'outro': 'other', 'outra': 'other',
  'unknown': 'unknown', 'desconocido': 'unknown', 'desconhecido': 'unknown',
};

const VALID_CONNECTION_TYPES = new Set([
  'friend', 'playmate', 'neighbor', 'relative', 'rival', 'unknown',
]);

function normalizeSpecies(raw: unknown): string {
  if (!raw || typeof raw !== 'string') return 'unknown';
  const key = raw.trim().toLowerCase();
  return SPECIES_MAP[key] ?? 'other';
}

function normalizeConnectionType(raw: unknown): string {
  if (!raw || typeof raw !== 'string') return 'friend';
  const key = raw.trim().toLowerCase();
  return VALID_CONNECTION_TYPES.has(key) ? key : 'friend';
}

export const persistConnection: Persister = async (extracted, ctx) => {
  const friendName = (extracted.friend_name as string) ?? null;
  if (!friendName) {
    console.log('[persistConnection] skip: no friend_name', { entry: ctx.diaryEntryId?.slice(-8) });
    return;
  }

  const payload = {
    pet_id:         ctx.petId,
    user_id:        ctx.userId,
    diary_entry_id: ctx.diaryEntryId,
    friend_name:    friendName,
    friend_species: normalizeSpecies(extracted.friend_species),
    friend_breed:   (extracted.friend_breed as string) ?? null,
    // O classifier alterna entre friend_owner e owner_name — aceita os dois.
    friend_owner:   (extracted.friend_owner as string)
                  ?? (extracted.owner_name as string)
                  ?? null,
    connection_type: normalizeConnectionType(extracted.connection_type),
    first_met_at:   (extracted.date as string) ?? ctx.today,
    last_seen_at:   (extracted.date as string) ?? ctx.today,
    notes:          (extracted.notes as string) ?? null,
  };

  console.log('[persistConnection] insert', {
    entry: ctx.diaryEntryId?.slice(-8),
    name: payload.friend_name,
    species: payload.friend_species,
    type: payload.connection_type,
  });

  const { data, error } = await supabase
    .from('pet_connections')
    .insert(payload)
    .select('id')
    .single();

  if (error) {
    console.error('[persistConnection] ❌ insert failed', {
      entry: ctx.diaryEntryId?.slice(-8),
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return;
  }

  console.log('[persistConnection] ✓ saved', { connectionId: data?.id });

  // Devolve linkedField pra que saveToModule grave linked_connection_id
  // na diary_entries (igual aos outros persisters).
  return { linkedField: { linked_connection_id: data!.id } };
};
