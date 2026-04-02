/**
 * localDb — SQLite local database for offline-first diary.
 *
 * Provides:
 *   - pending_entries: diary entries awaiting AI classification + sync
 *   - cached_entries:  diary entries fetched from Supabase (fast offline read)
 *   - cached_pets:     pet data fetched from Supabase
 *
 * All operations are synchronous (expo-sqlite sync API).
 * Never throws — caller may skip the write if SQLite is unavailable.
 */
import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;

function getDb(): SQLite.SQLiteDatabase {
  if (!_db) {
    _db = SQLite.openDatabaseSync('auexpert_local.db');
  }
  return _db;
}

// ── Schema ────────────────────────────────────────────────────────────────────

export function initLocalDb(): void {
  try {
    const db = getDb();
    db.execSync(`
      CREATE TABLE IF NOT EXISTS pending_entries (
        id               TEXT PRIMARY KEY,
        pet_id           TEXT NOT NULL,
        input_text       TEXT,
        input_type       TEXT NOT NULL DEFAULT 'text',
        photos_base64    TEXT,         -- JSON array of base64 strings
        local_media_uris TEXT,         -- JSON array of local file URIs
        created_at       TEXT NOT NULL,
        status           TEXT NOT NULL DEFAULT 'pending',
        error_msg        TEXT,
        attempts         INTEGER DEFAULT 0,
        last_attempt     TEXT,
        synced_at        TEXT
      );

      CREATE TABLE IF NOT EXISTS cached_entries (
        id                TEXT PRIMARY KEY,
        pet_id            TEXT NOT NULL,
        content           TEXT,
        narration         TEXT,
        mood_id           TEXT,
        mood_score        INTEGER,
        input_method      TEXT,
        input_type        TEXT,
        primary_type      TEXT,
        tags              TEXT,
        photos            TEXT,
        processing_status TEXT DEFAULT 'done',
        is_special        INTEGER DEFAULT 0,
        created_at        TEXT NOT NULL,
        updated_at        TEXT NOT NULL,
        cached_at         TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS cached_pets (
        id        TEXT PRIMARY KEY,
        data      TEXT NOT NULL,
        cached_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_pending_pet
        ON pending_entries(pet_id, status);
      CREATE INDEX IF NOT EXISTS idx_cached_entry_pet
        ON cached_entries(pet_id, created_at);
    `);
  } catch {
    // SQLite unavailable (e.g. Expo Go) — app degrades gracefully
  }
}

// ── Pending entries ───────────────────────────────────────────────────────────

export interface PendingEntry {
  id: string;
  pet_id: string;
  input_text: string | null;
  input_type: string;
  photos_base64: string[] | null;
  local_media_uris: string[] | null;
  created_at: string;
  status: 'pending' | 'processing' | 'synced' | 'error';
  error_msg: string | null;
  attempts: number;
  last_attempt: string | null;
  synced_at: string | null;
}

export function savePendingEntry(entry: {
  id: string;
  pet_id: string;
  input_text?: string | null;
  input_type: string;
  photos_base64?: string[] | null;
  local_media_uris?: string[] | null;
  created_at: string;
}): void {
  try {
    getDb().runSync(
      `INSERT OR IGNORE INTO pending_entries
         (id, pet_id, input_text, input_type, photos_base64,
          local_media_uris, created_at, status, attempts)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 0)`,
      [
        entry.id,
        entry.pet_id,
        entry.input_text ?? null,
        entry.input_type,
        entry.photos_base64 ? JSON.stringify(entry.photos_base64) : null,
        entry.local_media_uris ? JSON.stringify(entry.local_media_uris) : null,
        entry.created_at,
      ],
    );
  } catch { /* best-effort */ }
}

export function getPendingEntries(petId?: string): PendingEntry[] {
  try {
    const db = getDb();
    const query = petId
      ? `SELECT * FROM pending_entries WHERE status IN ('pending','error') AND pet_id = ? ORDER BY created_at ASC`
      : `SELECT * FROM pending_entries WHERE status IN ('pending','error') ORDER BY created_at ASC`;
    const rows = (petId ? db.getAllSync(query, [petId]) : db.getAllSync(query)) as Record<string, unknown>[];
    return rows.map(deserializePendingEntry);
  } catch {
    return [];
  }
}

export function getPendingCount(petId?: string): number {
  try {
    const db = getDb();
    const query = petId
      ? `SELECT COUNT(*) as cnt FROM pending_entries WHERE status IN ('pending','error') AND pet_id = ?`
      : `SELECT COUNT(*) as cnt FROM pending_entries WHERE status IN ('pending','error')`;
    const row = (petId ? db.getFirstSync(query, [petId]) : db.getFirstSync(query)) as { cnt: number } | null;
    return row?.cnt ?? 0;
  } catch {
    return 0;
  }
}

export function updatePendingStatus(
  id: string,
  status: 'processing' | 'synced' | 'error',
  errorMsg?: string,
): void {
  try {
    getDb().runSync(
      `UPDATE pending_entries
       SET status = ?, error_msg = ?,
           last_attempt = datetime('now'),
           attempts = attempts + 1,
           synced_at = CASE WHEN ? = 'synced' THEN datetime('now') ELSE synced_at END
       WHERE id = ?`,
      [status, errorMsg ?? null, status, id],
    );
  } catch { /* best-effort */ }
}

function deserializePendingEntry(row: Record<string, unknown>): PendingEntry {
  return {
    id:               row.id as string,
    pet_id:           row.pet_id as string,
    input_text:       (row.input_text as string | null) ?? null,
    input_type:       (row.input_type as string) ?? 'text',
    photos_base64:    parseJsonArray(row.photos_base64 as string | null),
    local_media_uris: parseJsonArray(row.local_media_uris as string | null),
    created_at:       row.created_at as string,
    status:           (row.status as PendingEntry['status']) ?? 'pending',
    error_msg:        (row.error_msg as string | null) ?? null,
    attempts:         (row.attempts as number) ?? 0,
    last_attempt:     (row.last_attempt as string | null) ?? null,
    synced_at:        (row.synced_at as string | null) ?? null,
  };
}

// ── Cached diary entries ───────────────────────────────────────────────────────

export function cacheEntry(entry: {
  id: string;
  pet_id: string;
  content?: string | null;
  narration?: string | null;
  mood_id?: string | null;
  mood_score?: number | null;
  input_method?: string | null;
  input_type?: string | null;
  primary_type?: string | null;
  tags?: string[] | null;
  photos?: string[] | null;
  processing_status?: string | null;
  is_special?: boolean | null;
  created_at: string;
  updated_at?: string | null;
}): void {
  try {
    const now = new Date().toISOString();
    getDb().runSync(
      `INSERT OR REPLACE INTO cached_entries
         (id, pet_id, content, narration, mood_id, mood_score,
          input_method, input_type, primary_type, tags, photos,
          processing_status, is_special, created_at, updated_at, cached_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.id,
        entry.pet_id,
        entry.content ?? null,
        entry.narration ?? null,
        entry.mood_id ?? null,
        entry.mood_score ?? null,
        entry.input_method ?? null,
        entry.input_type ?? null,
        entry.primary_type ?? null,
        JSON.stringify(entry.tags ?? []),
        JSON.stringify(entry.photos ?? []),
        entry.processing_status ?? 'done',
        entry.is_special ? 1 : 0,
        entry.created_at,
        entry.updated_at ?? entry.created_at,
        now,
      ],
    );
  } catch { /* best-effort */ }
}

export function getCachedDiary(petId: string, limit = 50): Record<string, unknown>[] {
  try {
    const rows = getDb().getAllSync(
      `SELECT * FROM cached_entries WHERE pet_id = ? ORDER BY created_at DESC LIMIT ?`,
      [petId, limit],
    ) as Record<string, unknown>[];
    return rows.map((r) => ({
      ...r,
      tags:     parseJsonArray(r.tags as string | null) ?? [],
      photos:   parseJsonArray(r.photos as string | null) ?? [],
      is_special: (r.is_special as number) === 1,
    }));
  } catch {
    return [];
  }
}

// ── Cached pets ───────────────────────────────────────────────────────────────

export function cachePet(pet: Record<string, unknown>): void {
  try {
    getDb().runSync(
      `INSERT OR REPLACE INTO cached_pets (id, data, cached_at) VALUES (?, ?, datetime('now'))`,
      [pet.id as string, JSON.stringify(pet)],
    );
  } catch { /* best-effort */ }
}

export function getCachedPet(petId: string): Record<string, unknown> | null {
  try {
    const row = getDb().getFirstSync(
      `SELECT data FROM cached_pets WHERE id = ?`,
      [petId],
    ) as { data: string } | null;
    return row ? JSON.parse(row.data) : null;
  } catch {
    return null;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseJsonArray(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
