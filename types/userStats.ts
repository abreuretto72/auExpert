/**
 * userStats.ts — Tipos do painel "Minhas Estatísticas" do tutor.
 *
 * Shape espelha o JSONB retornado pela RPC `get_user_stats(p_year, p_month)`
 * exposta no Supabase. NÃO MEXER no banco; tipos seguem o contrato fornecido.
 */

export interface UserStatsPeriod {
  year: number;
  month: number;       // 1-12
  label: string;       // ex: "Abril 2026"
  start: string;       // ISO timestamp
  end: string;
}

export interface UserStatsAIUsage {
  images: number;      // photo_analyses do mês
  videos: number;      // diary_entries com video_url
  audios: number;      // diary_entries com audio_url
  scanners: number;    // diary_entries com ocr_data
  cardapios: number;   // nutrition_cardapio_history
  prontuarios: number; // prontuario_cache
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
  by_type: Record<string, number>;   // { vet: 2, groomer: 1, ... }
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

/**
 * Mapping de `professional_type` → chave i18n em `stats.profType_*`.
 * Usar com `t(PROFESSIONAL_TYPE_I18N_KEY[type] ?? type)` na tela.
 * Quando o backend trouxer um type não mapeado, cair no próprio identifier.
 */
export const PROFESSIONAL_TYPE_I18N_KEY: Record<string, string> = {
  vet:             'stats.profType_vet',
  veterinarian:    'stats.profType_vet',
  groomer:         'stats.profType_groomer',
  trainer:         'stats.profType_trainer',
  walker:          'stats.profType_walker',
  sitter:          'stats.profType_sitter',
  pet_sitter:      'stats.profType_sitter',
  nutritionist:    'stats.profType_nutritionist',
  physio:          'stats.profType_physio',
  physiotherapist: 'stats.profType_physio',
  dentist:         'stats.profType_dentist',
  behaviorist:     'stats.profType_behaviorist',
  daycare:         'stats.profType_daycare',
  hotel:           'stats.profType_hotel',
};
