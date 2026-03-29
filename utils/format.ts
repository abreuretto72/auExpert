/**
 * Formats a date string to a localized short format.
 * Examples: "27 mar 2026", "15 jan 2026"
 */
export function formatDate(
  dateStr: string | null | undefined,
  locale: string = 'pt-BR',
): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Formats a date string to relative time (e.g., "há 2 horas", "ontem").
 */
export function formatRelativeDate(
  dateStr: string | null | undefined,
  locale: string = 'pt-BR',
): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '—';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  const isPtBr = locale === 'pt-BR';

  if (diffMin < 1) return isPtBr ? 'agora' : 'just now';
  if (diffMin < 60) return isPtBr ? `há ${diffMin} min` : `${diffMin}m ago`;
  if (diffHours < 24) return isPtBr ? `há ${diffHours}h` : `${diffHours}h ago`;
  if (diffDays === 1) return isPtBr ? 'ontem' : 'yesterday';
  if (diffDays < 7) return isPtBr ? `há ${diffDays} dias` : `${diffDays}d ago`;

  return formatDate(dateStr, locale);
}

/**
 * Formats weight in kg with appropriate precision.
 * Examples: "32 kg", "4.2 kg", "0.8 kg"
 */
export function formatWeight(kg: number | null | undefined): string {
  if (kg == null) return '—';
  return kg >= 10 ? `${Math.round(kg)} kg` : `${kg.toFixed(1)} kg`;
}

/**
 * Formats age in months to a human-readable string.
 * Examples: "3 anos", "8 meses", "2 anos e 4 meses"
 */
export function formatAge(
  months: number | null | undefined,
  locale: string = 'pt-BR',
): string {
  if (months == null) return '—';
  const isPtBr = locale === 'pt-BR';
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years === 0) {
    return isPtBr
      ? `${remainingMonths} ${remainingMonths === 1 ? 'mês' : 'meses'}`
      : `${remainingMonths} ${remainingMonths === 1 ? 'month' : 'months'}`;
  }
  if (remainingMonths === 0) {
    return isPtBr
      ? `${years} ${years === 1 ? 'ano' : 'anos'}`
      : `${years} ${years === 1 ? 'year' : 'years'}`;
  }
  return isPtBr
    ? `${years} ${years === 1 ? 'ano' : 'anos'} e ${remainingMonths} ${remainingMonths === 1 ? 'mês' : 'meses'}`
    : `${years}y ${remainingMonths}m`;
}

/**
 * Truncates text to a max length with ellipsis.
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1).trimEnd() + '\u2026';
}

/**
 * Formats a health score to display string with color hint.
 */
// ══════════════════════════════════════
// DATE INPUT — Locale-aware birth date
// ══════════════════════════════════════

type DateOrder = 'dmy' | 'mdy' | 'ymd';

/** Detect date field order from locale */
export function getDateOrder(locale: string): DateOrder {
  const lang = locale.split('-')[0];
  // US, Philippines, Micronesia: month first
  if (locale === 'en-US' || locale === 'en-PH' || locale === 'fil') return 'mdy';
  // Japan, Korea, China, Hungary, Lithuania: year first
  if (['ja', 'ko', 'zh', 'hu', 'lt'].includes(lang)) return 'ymd';
  // Most of the world: day first
  return 'dmy';
}

/** Get placeholder string for date input */
export function getDatePlaceholder(locale: string): string {
  const order = getDateOrder(locale);
  if (order === 'mdy') return 'mm/dd/yyyy';
  if (order === 'ymd') return 'yyyy/mm/dd';
  return 'dd/mm/yyyy';
}

/** Auto-format date digits with slashes based on locale */
export function formatDateInput(text: string, locale: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  const order = getDateOrder(locale);
  if (order === 'ymd') {
    // yyyy/mm/dd
    if (digits.length > 6) return `${digits.slice(0, 4)}/${digits.slice(4, 6)}/${digits.slice(6)}`;
    if (digits.length > 4) return `${digits.slice(0, 4)}/${digits.slice(4)}`;
    return digits;
  }
  // dd/mm/yyyy or mm/dd/yyyy — same mask shape
  if (digits.length > 4) return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

/** Parse locale-formatted date string to ISO (yyyy-mm-dd). Returns null if invalid or future. */
export function parseDateInput(input: string, locale: string): string | null {
  const digits = input.replace(/\D/g, '');
  if (digits.length !== 8) return null;

  const order = getDateOrder(locale);
  let yyyy: string, mm: string, dd: string;

  if (order === 'ymd') {
    yyyy = digits.slice(0, 4); mm = digits.slice(4, 6); dd = digits.slice(6, 8);
  } else if (order === 'mdy') {
    mm = digits.slice(0, 2); dd = digits.slice(2, 4); yyyy = digits.slice(4, 8);
  } else {
    dd = digits.slice(0, 2); mm = digits.slice(2, 4); yyyy = digits.slice(4, 8);
  }

  const d = new Date(`${yyyy}-${mm}-${dd}`);
  if (isNaN(d.getTime())) return null;
  if (d > new Date()) return null;
  // Validate day/month match (catches stuff like 31/02)
  if (d.getMonth() + 1 !== parseInt(mm, 10)) return null;
  return `${yyyy}-${mm}-${dd}`;
}

/** Format ISO date (yyyy-mm-dd) to locale display string for input field */
export function isoToDateInput(isoDate: string, locale: string): string {
  const [yyyy, mm, dd] = isoDate.split('-');
  if (!yyyy || !mm || !dd) return '';
  const order = getDateOrder(locale);
  if (order === 'ymd') return `${yyyy}/${mm}/${dd}`;
  if (order === 'mdy') return `${mm}/${dd}/${yyyy}`;
  return `${dd}/${mm}/${yyyy}`;
}

/** Calculate age in months from ISO date string */
export function calcAgeMonths(isoDate: string): number {
  const birth = new Date(isoDate);
  const now = new Date();
  return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
}

export function getHealthLevel(score: number | null | undefined): {
  label: string;
  level: 'good' | 'warning' | 'danger';
} {
  if (score == null) return { label: '—', level: 'warning' };
  if (score >= 80) return { label: `${score}`, level: 'good' };
  if (score >= 50) return { label: `${score}`, level: 'warning' };
  return { label: `${score}`, level: 'danger' };
}
