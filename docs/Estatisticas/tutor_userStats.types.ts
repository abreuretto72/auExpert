/**
 * Tipos do painel de estatísticas do tutor.
 * Arquivo destino: src/types/userStats.ts
 */

export interface UserStatsPeriod {
  year: number;
  month: number;      // 1-12
  label: string;      // "Abril 2026"
  start: string;      // ISO timestamp
  end: string;        // ISO timestamp
}

export interface UserStatsAIUsage {
  images: number;
  videos: number;
  audios: number;
  scanners: number;
  cardapios: number;
  prontuarios: number;
}

export interface UserStatsPets {
  dogs: number;
  cats: number;
  total: number;
}

export interface UserStatsPeople {
  tutors: number;
  co_parents: number;
  caregivers: number;
  visitors: number;
  total: number;
}

export interface UserStatsProfessionals {
  by_type: Record<string, number>;
  total: number;
  pending_invites: number;
}

export interface UserStatsActivity {
  logins_days_count: number;
  last_login_at: string | null;
}

export interface UserStats {
  period: UserStatsPeriod;
  ai_usage: UserStatsAIUsage;
  pets: UserStatsPets;
  people: UserStatsPeople;
  professionals: UserStatsProfessionals;
  activity: UserStatsActivity;
}

/** Tradução do professional_type em labels amigáveis. */
export const PROFESSIONAL_TYPE_LABELS: Record<string, string> = {
  vet:           'Veterinário',
  groomer:       'Banho & Tosa',
  trainer:       'Adestrador',
  walker:        'Passeador',
  sitter:        'Pet sitter',
  nutritionist:  'Nutricionista',
  physio:        'Fisioterapeuta',
  dentist:       'Dentista',
  behaviorist:   'Comportamentalista',
  daycare:       'Creche',
  hotel:         'Hotel',
};
