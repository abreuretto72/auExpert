/**
 * profilePdf.ts
 *
 * HTML body generator for the tutor profile PDF.
 * Follows the same pattern as idCardPdf.ts and other *Pdf.ts helpers — uses
 * previewPdf()/sharePdf() from lib/pdf.ts with the shared template (logo header,
 * body injected here, footer "Multiverso Digital © 2026 — auExpert").
 *
 * Per CLAUDE.md §12.8: all tutor data exports go through a dedicated preview
 * screen (app/(app)/profile-pdf.tsx). This file only builds the HTML body.
 */
import type { Pet } from '../types/database';
import { previewPdf, sharePdf } from './pdf';
import i18n from '../i18n';

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Tutor data shape used by the PDF — superset of the authStore `User` type
 * because the profile screen fetches extended fields directly from the `users`
 * table (address, social, privacy, gamification).
 */
export interface TutorProfileData {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_zip: string | null;
  social_network_type: string | null;
  social_network_handle: string | null;
  privacy_profile_public: boolean;
  privacy_show_location: boolean;
  privacy_show_pets: boolean;
  privacy_show_social: boolean;
  xp: number;
  level: number;
  title: string | null;
  proof_of_love_tier: string | null;
  created_at: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function escHtml(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

function formatMemberSince(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(i18n.language || undefined, {
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function buildFullAddress(d: TutorProfileData): string {
  const line1 = [d.address_street, d.address_number].filter(Boolean).join(', ');
  const line2 = [d.address_complement, d.address_neighborhood].filter(Boolean).join(' · ');
  const line3 = [d.city, d.state, d.country].filter(Boolean).join(', ');
  const zip = d.address_zip ? `CEP ${d.address_zip}` : '';
  const parts = [line1, line2, line3, zip].filter((s) => s && s.length > 0);
  return parts.length ? parts.join('<br/>') : '—';
}

const PROOF_DISCOUNTS: Record<string, number> = {
  bronze: 5,
  silver: 10,
  gold: 15,
  diamond: 25,
};

// ── Body HTML builder ─────────────────────────────────────────────────────────

export function buildProfileBodyHtml(
  tutor: TutorProfileData,
  pets: Pet[],
): string {
  const t = i18n.t.bind(i18n);
  const sections: string[] = [];

  // ── Hero card (tutor identity) ──────────────────────────────────────────
  const avatarHtml = tutor.avatar_url
    ? `<img src="${tutor.avatar_url}" style="width:72px;height:72px;border-radius:14px;object-fit:cover;flex-shrink:0;margin-right:14px;" />`
    : `<div style="width:72px;height:72px;border-radius:14px;background:#E8813A18;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-right:14px;font-size:26px;font-weight:700;color:#E8813A;">${escHtml((tutor.full_name ?? tutor.email ?? '?').charAt(0).toUpperCase())}</div>`;

  const tierLabel = tutor.proof_of_love_tier
    ? t(`tutor.proofTier.${tutor.proof_of_love_tier}`, { defaultValue: tutor.proof_of_love_tier })
    : '—';
  const discount = PROOF_DISCOUNTS[tutor.proof_of_love_tier ?? ''] ?? 0;

  sections.push(`
    <div style="background:#F8FAFC;border-radius:12px;padding:16px;margin-bottom:6px;border:1px solid #E2E8F0;display:flex;align-items:flex-start;">
      ${avatarHtml}
      <div style="flex:1;">
        <div style="font-size:18px;font-weight:700;color:#0F1923;">${escHtml(tutor.full_name ?? '—')}</div>
        <div style="font-size:11px;color:#5E7A94;margin-top:2px;">${escHtml(tutor.email ?? '—')}</div>
        <div style="margin-top:8px;">
          ${pill(t('tutor.level', { level: tutor.level }), '#F39C12')}
          ${tutor.title ? pill(tutor.title, '#9B59B6') : ''}
          ${tutor.proof_of_love_tier ? pill(`${tierLabel} · −${discount}%`, '#E8813A') : ''}
        </div>
      </div>
    </div>
  `);

  // ── Identification ───────────────────────────────────────────────────────
  sections.push(sectionHeader(t('profilePdf.sectionIdentity')));
  sections.push(`
    <div style="background:#fff;border:1px solid #E2E8F0;border-radius:10px;padding:12px 14px;">
      ${kv(t('tutor.fullName'), tutor.full_name)}
      ${kv('E-mail', tutor.email)}
      ${kv(t('tutor.phone'), tutor.phone)}
      ${kv(t('profilePdf.memberSince'), formatMemberSince(tutor.created_at))}
    </div>
  `);

  // ── Gamification ─────────────────────────────────────────────────────────
  sections.push(sectionHeader(t('profilePdf.sectionGamification')));
  sections.push(`
    <div style="background:#fff;border:1px solid #E2E8F0;border-radius:10px;padding:12px 14px;">
      ${kv(t('profilePdf.level'), String(tutor.level ?? 1))}
      ${kv(t('profilePdf.xp'), `${tutor.xp ?? 0} XP`)}
      ${tutor.title ? kv(t('profilePdf.title'), tutor.title) : ''}
      ${kv(t('tutor.proofOfLove'), tierLabel)}
      ${kv(t('profilePdf.discount'), tutor.proof_of_love_tier ? `−${discount}%` : '—')}
    </div>
  `);

  // ── Address ──────────────────────────────────────────────────────────────
  sections.push(sectionHeader(t('profilePdf.sectionAddress')));
  sections.push(`
    <div style="background:#fff;border:1px solid #E2E8F0;border-radius:10px;padding:12px 14px;font-size:11px;">
      <div style="color:#1A2B3D;font-weight:600;line-height:1.8;">${buildFullAddress(tutor)}</div>
    </div>
  `);

  // ── Social ───────────────────────────────────────────────────────────────
  if (tutor.social_network_handle) {
    sections.push(sectionHeader(t('profilePdf.sectionSocial')));
    const snType = tutor.social_network_type
      ? t(`tutor.socialTypes.${tutor.social_network_type}`, { defaultValue: tutor.social_network_type })
      : '—';
    sections.push(`
      <div style="background:#fff;border:1px solid #E2E8F0;border-radius:10px;padding:12px 14px;">
        ${kv(t('profilePdf.socialApp'), snType)}
        ${kv(t('profilePdf.socialHandle'), tutor.social_network_handle)}
      </div>
    `);
  }

  // ── Pets ─────────────────────────────────────────────────────────────────
  sections.push(sectionHeader(t('profilePdf.sectionPets', { count: pets.length })));
  if (pets.length === 0) {
    sections.push(`
      <div style="background:#fff;border:1px solid #E2E8F0;border-radius:10px;padding:16px;text-align:center;font-size:11px;color:#5E7A94;">
        ${escHtml(t('profilePdf.noPets'))}
      </div>
    `);
  } else {
    const rows = pets
      .map((pet) => {
        const speciesLabel = pet.species === 'cat' ? t('pets.cat') : t('pets.dog');
        const petAvatar = pet.avatar_url
          ? `<img src="${pet.avatar_url}" style="width:40px;height:40px;border-radius:10px;object-fit:cover;flex-shrink:0;margin-right:10px;" />`
          : `<div style="width:40px;height:40px;border-radius:10px;background:${pet.species === 'cat' ? '#9B59B618' : '#E8813A18'};display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-right:10px;font-size:14px;font-weight:700;color:${pet.species === 'cat' ? '#9B59B6' : '#E8813A'};">${escHtml(pet.name.charAt(0).toUpperCase())}</div>`;
        const health = pet.health_score != null ? `${pet.health_score}/100` : '—';
        return `
          <div style="display:flex;align-items:center;padding:10px 0;border-bottom:1px solid #F1F5F9;">
            ${petAvatar}
            <div style="flex:1;">
              <div style="font-size:12px;font-weight:700;color:#1A2B3D;">${escHtml(pet.name)}</div>
              <div style="font-size:10px;color:#5E7A94;margin-top:2px;">${escHtml(pet.breed ?? speciesLabel)} · ${speciesLabel}</div>
            </div>
            <div style="font-size:11px;font-weight:700;color:#2ECC71;">${escHtml(health)}</div>
          </div>
        `;
      })
      .join('');
    sections.push(`
      <div style="background:#fff;border:1px solid #E2E8F0;border-radius:10px;padding:4px 14px;">
        ${rows}
      </div>
    `);
  }

  // ── Privacy ──────────────────────────────────────────────────────────────
  const onLabel = t('common.on', { defaultValue: 'Ativo' });
  const offLabel = t('common.off', { defaultValue: 'Inativo' });
  const privacyVal = (v: boolean) => (v ? onLabel : offLabel);
  sections.push(sectionHeader(t('profilePdf.sectionPrivacy')));
  sections.push(`
    <div style="background:#fff;border:1px solid #E2E8F0;border-radius:10px;padding:12px 14px;">
      ${kv(t('tutor.privacyPublicProfile'), privacyVal(tutor.privacy_profile_public))}
      ${kv(t('tutor.privacyShowLocation'), privacyVal(tutor.privacy_show_location))}
      ${kv(t('tutor.privacyShowPets'), privacyVal(tutor.privacy_show_pets))}
      ${kv(t('tutor.privacyShowSocial'), privacyVal(tutor.privacy_show_social))}
    </div>
  `);

  // ── Footer note ──────────────────────────────────────────────────────────
  sections.push(`
    <div style="margin-top:24px;padding:12px 14px;background:#1B8EAD08;border-left:3px solid #1B8EAD;border-radius:6px;font-size:10px;color:#1A2B3D;line-height:1.6;text-align:center;">
      ${escHtml(t('profilePdf.footerNote'))}
    </div>
  `);

  return sections.join('\n');
}

// ── Export functions ──────────────────────────────────────────────────────────

export async function previewProfilePdf(
  tutor: TutorProfileData,
  pets: Pet[],
): Promise<void> {
  const t = i18n.t.bind(i18n);
  const bodyHtml = buildProfileBodyHtml(tutor, pets);
  await previewPdf({
    title: t('profilePdf.pdfTitle', { name: tutor.full_name ?? tutor.email ?? '' }),
    subtitle: t('profilePdf.pdfSubtitle'),
    bodyHtml,
    language: i18n.language,
  });
}

export async function shareProfilePdf(
  tutor: TutorProfileData,
  pets: Pet[],
): Promise<void> {
  const t = i18n.t.bind(i18n);
  const bodyHtml = buildProfileBodyHtml(tutor, pets);
  const baseName = (tutor.full_name ?? tutor.email ?? 'tutor')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const fileName = `perfil_${baseName || 'tutor'}.pdf`;
  await sharePdf({
    title: t('profilePdf.pdfTitle', { name: tutor.full_name ?? tutor.email ?? '' }),
    subtitle: t('profilePdf.pdfSubtitle'),
    bodyHtml,
    language: i18n.language,
  }, fileName);
}
