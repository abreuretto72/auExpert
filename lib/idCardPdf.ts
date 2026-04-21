/**
 * idCardPdf.ts
 *
 * HTML body generator for the pet digital ID card PDF.
 * Mirrors the pattern of prontuarioPdf.ts — uses previewPdf()/sharePdf() from
 * lib/pdf.ts which wraps the shared PDF template (header with logo + title +
 * date, body injected here, footer "Multiverso Digital © 2026 — auExpert").
 *
 * Per CLAUDE.md §12.8: toda ID card DEVE ser exportável via tela dedicada de
 * preview (app/.../id-card-pdf.tsx). Este arquivo é só o gerador de body.
 */
import type { Pet, User } from '../types/database';
import { previewPdf, sharePdf } from './pdf';
import i18n from '../i18n';

// ── Helpers ───────────────────────────────────────────────────────────────────

function escHtml(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatAge(months: number | null | undefined): string {
  if (months == null) return '—';
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  if (years === 0) return `${remMonths}m`;
  if (remMonths === 0) return `${years}a`;
  return `${years}a ${remMonths}m`;
}

function sectionHeader(title: string): string {
  return `<div style="margin-top:16px;margin-bottom:8px;font-size:10px;font-weight:700;letter-spacing:1.2px;color:#5E7A94;text-transform:uppercase;border-bottom:1px solid #E8EDF220;padding-bottom:4px;">${escHtml(title)}</div>`;
}

function kv(label: string, value: string | null | undefined): string {
  return `
    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #F1F5F9;font-size:11px;">
      <span style="color:#5E7A94;font-weight:600;letter-spacing:0.3px;">${escHtml(label)}</span>
      <span style="color:#1A2B3D;font-weight:600;text-align:right;">${escHtml(value ?? '—')}</span>
    </div>
  `;
}

function pill(text: string, color = '#E8813A'): string {
  return `<span style="display:inline-block;background:${color}18;color:${color};border-radius:6px;padding:2px 8px;font-size:9px;font-weight:700;margin:2px 4px 2px 0;">${escHtml(text)}</span>`;
}

// ── Body HTML builder ─────────────────────────────────────────────────────────

export function buildIdCardBodyHtml(pet: Pet, tutor: User | null): string {
  const t = i18n.t.bind(i18n);
  const sections: string[] = [];

  // ── Hero card (pet identity + verified badge) ────────────────────────────
  const speciesLabel = pet.species === 'cat' ? t('pets.cat') : t('pets.dog');
  const sexLabel =
    pet.sex === 'female'
      ? t('addPet.sexFemale')
      : pet.sex === 'male'
        ? t('addPet.sexMale')
        : '—';

  const avatarHtml = pet.avatar_url
    ? `<img src="${pet.avatar_url}" style="width:72px;height:72px;border-radius:14px;object-fit:cover;flex-shrink:0;margin-right:14px;" />`
    : '';

  sections.push(`
    <div style="background:#F8FAFC;border-radius:12px;padding:16px;margin-bottom:6px;border:1px solid #E2E8F0;display:flex;align-items:flex-start;">
      ${avatarHtml}
      <div style="flex:1;">
        <div style="font-size:18px;font-weight:700;color:#0F1923;">${escHtml(pet.name)}</div>
        <div style="font-size:11px;color:#5E7A94;margin-top:2px;">
          ${escHtml(pet.breed ?? t('health.unknown'))} · ${speciesLabel}
        </div>
        <div style="margin-top:8px;">
          ${pill(t('idCard.verified'), '#2ECC71')}
          ${pet.microchip_id ? pill(`Microchip · ${escHtml(pet.microchip_id)}`, '#1B8EAD') : ''}
        </div>
      </div>
    </div>
  `);

  // ── Pet data ─────────────────────────────────────────────────────────────
  sections.push(sectionHeader(t('idCard.pdfPetSection')));
  sections.push(`
    <div style="background:#fff;border:1px solid #E2E8F0;border-radius:10px;padding:12px 14px;">
      ${kv(t('addPet.breed'), pet.breed)}
      ${kv(t('addPet.estimatedAge'), formatAge(pet.estimated_age_months))}
      ${kv(t('addPet.petSex'), sexLabel)}
      ${pet.weight_kg != null ? kv(t('addPet.estimatedWeight'), `${pet.weight_kg} kg`) : ''}
      ${pet.size ? kv(t('addPet.petSize'), t(`addPet.size${pet.size.charAt(0).toUpperCase()}${pet.size.slice(1)}`, { defaultValue: pet.size })) : ''}
      ${pet.color ? kv(t('addPet.coatColor'), pet.color) : ''}
    </div>
  `);

  // ── Tutor data ───────────────────────────────────────────────────────────
  sections.push(sectionHeader(t('idCard.pdfTutorSection')));
  sections.push(`
    <div style="background:#fff;border:1px solid #E2E8F0;border-radius:10px;padding:12px 14px;">
      ${kv(t('idCard.tutorLabel'), tutor?.full_name ?? tutor?.email ?? '—')}
      ${kv('E-mail', tutor?.email)}
      ${tutor?.phone ? kv(t('auth.phone'), tutor.phone) : ''}
      ${tutor?.city ? kv(t('auth.addressCity'), tutor.city) : ''}
      ${tutor?.country ? kv(t('auth.addressCountry'), tutor.country) : ''}
    </div>
  `);

  // ── Microchip details ────────────────────────────────────────────────────
  sections.push(sectionHeader(t('idCard.pdfChipSection')));
  sections.push(`
    <div style="background:#fff;border:1px solid #E2E8F0;border-radius:10px;padding:12px 14px;">
      ${kv(t('idCard.chipNumber'), pet.microchip_id)}
      ${kv(t('idCard.chipStandard'), 'ISO 11784')}
      ${kv(t('idCard.chipImplanted'), '—')}
      ${kv(t('idCard.chipRegisteredBy'), '—')}
    </div>
  `);

  // ── Footer note ──────────────────────────────────────────────────────────
  sections.push(`
    <div style="margin-top:24px;padding:12px 14px;background:#1B8EAD08;border-left:3px solid #1B8EAD;border-radius:6px;font-size:10px;color:#1A2B3D;line-height:1.6;text-align:center;">
      ${escHtml(t('idCard.pdfFooterNote'))}
    </div>
  `);

  return sections.join('\n');
}

// ── Export functions ──────────────────────────────────────────────────────────

export async function previewIdCardPdf(pet: Pet, tutor: User | null): Promise<void> {
  const t = i18n.t.bind(i18n);
  const bodyHtml = buildIdCardBodyHtml(pet, tutor);
  await previewPdf({
    title: t('idCard.pdfTitle', { name: pet.name }),
    subtitle: t('idCard.pdfSubtitle'),
    bodyHtml,
    language: i18n.language,
  });
}

export async function shareIdCardPdf(pet: Pet, tutor: User | null): Promise<void> {
  const t = i18n.t.bind(i18n);
  const bodyHtml = buildIdCardBodyHtml(pet, tutor);
  const fileName = `carteirinha_${pet.name.toLowerCase().replace(/\s+/g, '_')}.pdf`;
  await sharePdf({
    title: t('idCard.pdfTitle', { name: pet.name }),
    subtitle: t('idCard.pdfSubtitle'),
    bodyHtml,
    language: i18n.language,
  }, fileName);
}
