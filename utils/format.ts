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
export function getHealthLevel(score: number | null | undefined): {
  label: string;
  level: 'good' | 'warning' | 'danger';
} {
  if (score == null) return { label: '—', level: 'warning' };
  if (score >= 80) return { label: `${score}`, level: 'good' };
  if (score >= 50) return { label: `${score}`, level: 'warning' };
  return { label: `${score}`, level: 'danger' };
}
