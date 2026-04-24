/**
 * travelPdf.ts
 *
 * Builds a PDF summary of the pet's trips. Mirrors TravelsLensContent:
 * a summary card (total trips, km, days) + an ordered list of trips with
 * destination, type, status, dates, distance, notes, and tags.
 *
 * Called from app/(app)/pet/[id]/travel-pdf.tsx.
 */
import { previewPdf, sharePdf } from './pdf';
import { supabase } from './supabase';
import i18n from '../i18n';
import { colors } from '../constants/colors';
import type { PetTravel, TravelData } from '../hooks/useLens';

// ── Data fetch + aggregate ────────────────────────────────────────────────────
async function fetchTravels(petId: string): Promise<TravelData> {
  const { data, error } = await supabase
    .from('pet_travels')
    .select('id, destination, country, region, travel_type, status, start_date, end_date, distance_km, notes, photos, tags, diary_entry_id, created_at')
    .eq('pet_id', petId)
    .eq('is_active', true)
    .order('start_date', { ascending: false });

  if (error) throw error;

  const travels = (data ?? []).map((r) => ({
    ...r,
    distance_km: r.distance_km != null ? Number(r.distance_km) : null,
    photos: (r.photos as string[]) ?? [],
    tags: (r.tags as string[]) ?? [],
  })) as PetTravel[];

  const completed = travels.filter((t) => t.status === 'completed');
  const totalKm = Math.round(
    completed.reduce((acc, t) => acc + (t.distance_km ?? 0), 0),
  );
  const totalDays = completed.reduce((acc, t) => {
    if (!t.start_date || !t.end_date) return acc;
    const diff = Math.round(
      (new Date(t.end_date).getTime() - new Date(t.start_date).getTime()) /
        (1000 * 60 * 60 * 24),
    ) + 1;
    return acc + Math.max(diff, 1);
  }, 0);

  return { travels, totalTrips: completed.length, totalKm, totalDays };
}

// ── HTML helpers ──────────────────────────────────────────────────────────────
function escHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(iso: string | null, lang: string): string {
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00').toLocaleDateString(lang, {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

const TYPE_COLOR: Record<string, string> = {
  road_trip:     colors.click,
  flight:        colors.sky,
  local:         colors.petrol,
  international: colors.purple,
  camping:       colors.success,
  other:         colors.textDim,
};

const STATUS_COLOR: Record<string, string> = {
  completed: colors.petrol,
  active:    colors.success,
  planned:   colors.warning,
};

function typeLabel(type: string): string {
  const t = i18n.t.bind(i18n);
  const map: Record<string, string> = {
    road_trip:     t('travels.typeRoadTrip'),
    flight:        t('travels.typeFlight'),
    local:         t('travels.typeLocal'),
    international: t('travels.typeInternational'),
    camping:       t('travels.typeCamping'),
    other:         t('travels.typeOther'),
  };
  return map[type] ?? type;
}

function statusLabel(status: string): string {
  const t = i18n.t.bind(i18n);
  return t(`travels.status_${status}`, status);
}

// ── Body ──────────────────────────────────────────────────────────────────────
function buildBody(data: TravelData, lang: string): string {
  const t = i18n.t.bind(i18n);

  if (data.travels.length === 0) {
    return `<p style="text-align:center;color:${colors.textDim};padding:40px 0;">${escHtml(t('pdfCommon.empty'))}</p>`;
  }

  const summaryHtml = `
    <section style="margin-bottom:18px;page-break-inside:avoid;">
      <h2 style="font-size:14px;color:#222;margin-bottom:10px;border-bottom:2px solid ${colors.sky};padding-bottom:3px;">${escHtml(t('travelPdf.summary'))}</h2>
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px;">
        <div style="flex:1;min-width:120px;border:1px solid #ddd;border-radius:8px;padding:10px;">
          <div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">${escHtml(t('travels.statTrips'))}</div>
          <div style="font-size:20px;font-weight:700;color:${colors.sky};margin-top:2px;">${data.totalTrips}</div>
        </div>
        <div style="flex:1;min-width:120px;border:1px solid #ddd;border-radius:8px;padding:10px;">
          <div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">${escHtml(t('travels.statKm'))}</div>
          <div style="font-size:20px;font-weight:700;color:${colors.click};margin-top:2px;">${data.totalKm.toLocaleString()}</div>
        </div>
        <div style="flex:1;min-width:120px;border:1px solid #ddd;border-radius:8px;padding:10px;">
          <div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">${escHtml(t('travels.statDays'))}</div>
          <div style="font-size:20px;font-weight:700;color:${colors.success};margin-top:2px;">${data.totalDays}</div>
        </div>
      </div>
    </section>
  `;

  const tripsHtml = `
    <section style="page-break-inside:auto;">
      <h2 style="font-size:14px;color:#222;margin-bottom:10px;border-bottom:2px solid ${colors.sky};padding-bottom:3px;">${escHtml(t('travels.listTitle'))}</h2>
      ${data.travels.map((tr) => {
        const typeCol = TYPE_COLOR[tr.travel_type] ?? colors.textDim;
        const statusCol = STATUS_COLOR[tr.status] ?? colors.textDim;
        const dateRange = tr.start_date
          ? (tr.end_date
              ? `${formatDate(tr.start_date, lang)} – ${formatDate(tr.end_date, lang)}`
              : formatDate(tr.start_date, lang))
          : '—';
        return `
          <div style="border:1px solid #e5e7eb;border-left:3px solid ${statusCol};border-radius:8px;padding:10px 12px;margin-bottom:8px;page-break-inside:avoid;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:6px;">
              <div style="flex:1;">
                <div style="font-size:13px;font-weight:700;color:#222;">${escHtml(tr.destination)}</div>
                ${tr.region ? `<div style="font-size:10px;color:#888;margin-top:2px;">${escHtml(tr.region)}${tr.country ? ' · ' + escHtml(tr.country) : ''}</div>` : (tr.country ? `<div style="font-size:10px;color:#888;margin-top:2px;">${escHtml(tr.country)}</div>` : '')}
              </div>
              <div style="display:flex;gap:6px;flex-shrink:0;">
                <span style="background:${typeCol}18;color:${typeCol};font-size:9px;font-weight:700;padding:3px 7px;border-radius:8px;">${escHtml(typeLabel(tr.travel_type))}</span>
                <span style="background:${statusCol}18;color:${statusCol};font-size:9px;font-weight:700;padding:3px 7px;border-radius:8px;">${escHtml(statusLabel(tr.status))}</span>
              </div>
            </div>
            <div style="font-size:10px;color:#555;display:flex;gap:14px;flex-wrap:wrap;">
              <span><strong>${escHtml(t('travelPdf.dates'))}:</strong> ${escHtml(dateRange)}</span>
              ${tr.distance_km ? `<span><strong>${escHtml(t('travelPdf.distance'))}:</strong> ${tr.distance_km.toLocaleString()} km</span>` : ''}
            </div>
            ${tr.notes ? `<div style="font-size:10px;color:#666;margin-top:6px;font-style:italic;">${escHtml(tr.notes)}</div>` : ''}
            ${tr.tags.length > 0 ? `<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px;">${tr.tags.map((tag) => `<span style="background:${colors.sky}15;color:${colors.sky};font-size:9px;padding:2px 6px;border-radius:6px;">${escHtml(tag)}</span>`).join('')}</div>` : ''}
          </div>
        `;
      }).join('')}
    </section>
  `;

  return summaryHtml + tripsHtml;
}

// ── Public API ────────────────────────────────────────────────────────────────
export interface TravelPdfOptions {
  petId: string;
  petName: string;
}

export async function previewTravelPdf({ petId, petName }: TravelPdfOptions): Promise<void> {
  const t = i18n.t.bind(i18n);
  const data = await fetchTravels(petId);
  const body = buildBody(data, i18n.language);
  await previewPdf({
    title: t('travelPdf.title', { name: petName }),
    subtitle: t('travelPdf.subtitle'),
    bodyHtml: body,
    language: i18n.language,
  });
}

export async function shareTravelPdf({ petId, petName }: TravelPdfOptions): Promise<void> {
  const t = i18n.t.bind(i18n);
  const data = await fetchTravels(petId);
  const body = buildBody(data, i18n.language);
  await sharePdf(
    {
      title: t('travelPdf.title', { name: petName }),
      subtitle: t('travelPdf.subtitle'),
      bodyHtml: body,
      language: i18n.language,
    },
    `travels_${petName.toLowerCase().replace(/\s+/g, '_')}.pdf`,
  );
}
