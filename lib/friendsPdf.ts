/**
 * friendsPdf.ts
 *
 * Builds a PDF of the pet's friends network (pet_connections).
 *
 * Called from app/(app)/pet/[id]/friends-pdf.tsx.
 */
import { previewPdf, sharePdf } from './pdf';
import { supabase } from './supabase';
import i18n from '../i18n';
import { colors } from '../constants/colors';

// ── Types ─────────────────────────────────────────────────────────────────────
// pet_connections persiste 1 row por menção no diário. O PDF consolida
// mostrando 1 card por amigo com meet_count agregado client-side. A tabela
// NÃO tem `meet_count` nem `photo_url` — não pedir esses campos no SELECT
// (PostgREST 42703 zera o painel).
interface FriendRow {
  id: string;
  friend_name: string;
  friend_species: string | null;
  friend_breed: string | null;
  friend_owner: string | null;
  connection_type: string | null;
  first_met_at: string | null;
  last_seen_at: string | null;
  notes: string | null;
  created_at: string;
}

interface FriendAggregate extends FriendRow {
  meet_count: number;
}

function maxDate(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a >= b ? a : b;
}

function minDate(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a <= b ? a : b;
}

function aggregateByFriend(rows: FriendRow[]): FriendAggregate[] {
  const byFriend = new Map<string, FriendAggregate>();
  for (const r of rows) {
    const key = r.friend_name.trim().toLowerCase();
    const existing = byFriend.get(key);
    if (!existing) {
      byFriend.set(key, { ...r, meet_count: 1 });
    } else {
      existing.meet_count += 1;
      existing.first_met_at = minDate(existing.first_met_at, r.first_met_at);
      existing.last_seen_at = maxDate(existing.last_seen_at, r.last_seen_at);
      existing.friend_breed = existing.friend_breed ?? r.friend_breed;
      existing.friend_owner = existing.friend_owner ?? r.friend_owner;
      existing.notes = existing.notes ?? r.notes;
    }
  }
  return [...byFriend.values()].sort((a, b) => {
    const da = a.last_seen_at ?? a.created_at;
    const db = b.last_seen_at ?? b.created_at;
    return db.localeCompare(da);
  });
}

// ── Data fetch ────────────────────────────────────────────────────────────────
async function fetchFriends(petId: string): Promise<FriendAggregate[]> {
  const { data, error } = await supabase
    .from('pet_connections')
    .select(
      'id, friend_name, friend_species, friend_breed, friend_owner, connection_type, first_met_at, last_seen_at, notes, created_at',
    )
    .eq('pet_id', petId)
    .eq('is_active', true)
    .order('last_seen_at', { ascending: false, nullsFirst: false })
    .limit(500);

  if (error) throw error;
  return aggregateByFriend((data ?? []) as FriendRow[]);
}

// ── HTML helpers ──────────────────────────────────────────────────────────────
function escHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(value: string | null, lang: string): string {
  if (!value) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(lang, { day: 'numeric', month: 'short', year: 'numeric' });
  }
  const d = new Date(value);
  if (isNaN(d.getTime())) return escHtml(value);
  return d.toLocaleDateString(lang, { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Body builder ──────────────────────────────────────────────────────────────
function buildBody(rows: FriendAggregate[], lang: string): string {
  const t = i18n.t.bind(i18n);

  if (rows.length === 0) {
    return `<p style="text-align:center;color:${colors.textDim};padding:40px 0;">${escHtml(t('pdfCommon.empty'))}</p>`;
  }

  const cards = rows
    .map((r) => {
      const meets = r.meet_count;
      const meetLabel = t('friendsPdf.meetCount', { count: meets });
      const speciesLine = [r.friend_species, r.friend_breed].filter(Boolean).join(' · ');
      const ownerLine = r.friend_owner ? `<div style="font-size:10px;color:#888;margin-top:2px;">${escHtml(r.friend_owner)}</div>` : '';
      const notesBlock = r.notes
        ? `<div style="font-size:11px;color:#555;margin-top:6px;padding-top:6px;border-top:1px dashed #e8e8e8;font-style:italic;">${escHtml(r.notes)}</div>`
        : '';
      return `
        <div style="padding:10px 12px;border:1px solid #eee;border-radius:8px;margin-bottom:8px;page-break-inside:avoid;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
            <div style="flex:1;">
              <div style="font-size:13px;font-weight:700;color:#222;">${escHtml(r.friend_name)}</div>
              ${speciesLine ? `<div style="font-size:10.5px;color:${colors.textDim};margin-top:2px;">${escHtml(speciesLine)}</div>` : ''}
              ${ownerLine}
            </div>
            <div style="text-align:right;">
              <div style="font-size:11px;font-weight:700;color:${colors.click};">${escHtml(meetLabel)}</div>
            </div>
          </div>
          <div style="display:flex;gap:12px;margin-top:8px;font-size:10px;color:#666;">
            <div><strong style="color:#333;">${escHtml(t('friendsPdf.firstMet'))}:</strong> ${escHtml(formatDate(r.first_met_at, lang))}</div>
            <div><strong style="color:#333;">${escHtml(t('friendsPdf.lastSeen'))}:</strong> ${escHtml(formatDate(r.last_seen_at, lang))}</div>
          </div>
          ${notesBlock}
        </div>
      `;
    })
    .join('');

  return `<section style="page-break-inside:auto;">${cards}</section>`;
}

// ── Public API ────────────────────────────────────────────────────────────────
export interface FriendsPdfOptions {
  petId: string;
  petName: string;
}

export async function previewFriendsPdf({ petId, petName }: FriendsPdfOptions): Promise<void> {
  const t = i18n.t.bind(i18n);
  const rows = await fetchFriends(petId);
  const body = buildBody(rows, i18n.language);
  await previewPdf({
    title: t('friendsPdf.title', { name: petName }),
    subtitle: t('friendsPdf.subtitle', { count: rows.length }),
    bodyHtml: body,
    language: i18n.language,
  });
}

export async function shareFriendsPdf({ petId, petName }: FriendsPdfOptions): Promise<void> {
  const t = i18n.t.bind(i18n);
  const rows = await fetchFriends(petId);
  const body = buildBody(rows, i18n.language);
  await sharePdf(
    {
      title: t('friendsPdf.title', { name: petName }),
      subtitle: t('friendsPdf.subtitle', { count: rows.length }),
      bodyHtml: body,
      language: i18n.language,
    },
    `friends_${petName.toLowerCase().replace(/\s+/g, '_')}.pdf`,
  );
}
