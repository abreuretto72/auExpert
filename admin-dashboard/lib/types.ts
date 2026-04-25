// Tipos compartilhados do dashboard admin.

export type Period = {
  year: number;
  month: number;
  label: string;
  start: string;
  end: string;
};

// ───── get_admin_overview ──────────────────────────────────────────────────

export type AdminOverview = {
  period: Period;
  totals: {
    users_total: number;
    pets_total: number;
    pets_dogs: number;
    pets_cats: number;
  };
  active_users: {
    this_month: number;
  };
  ai_usage_this_month: {
    images: number;
    videos: number;
    audios: number;
    scanners: number;
    cardapios: number;
    prontuarios: number;
  };
  cost: {
    this_month_usd: number;
    invocations: number;
    by_model: Record<string, number>;
  };
  performance: {
    avg_latency_ms: number;
    success_rate: number;
    errors_total: number;
  };
  trend_6m: Array<{
    month: string;
    invocations: number;
    cost_usd: number;
  }>;
};

// ───── get_admin_users_list ────────────────────────────────────────────────

export type AdminUserRow = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  city: string | null;
  state: string | null;
  language: string;
  created_at: string;
  pets_count: number;
  ai_invocations_this_month: number;
  cost_this_month_usd: number;
  last_login_at: string | null;
};

export type AdminUsersList = {
  items: AdminUserRow[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
};

// ───── get_admin_ai_breakdown ──────────────────────────────────────────────

export type AdminAiBreakdownByFunction = {
  function_name: string;
  total: number;
  success: number;
  errors: number;
  success_rate: number;
  cost_usd: number;
  avg_latency_ms: number;
};

export type AdminAiBreakdownByModel = {
  model_used: string;
  total: number;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  avg_latency_ms: number;
};

export type AdminRecentError = {
  id: string;
  function_name: string;
  error_category: string | null;
  error_message: string | null;
  user_message: string | null;
  model_used: string | null;
  latency_ms: number | null;
  created_at: string;
  user_email: string | null;
};

export type AdminAiBreakdown = {
  by_function: AdminAiBreakdownByFunction[];
  by_model: AdminAiBreakdownByModel[];
  errors_by_category: Record<string, number>;
  recent_errors: AdminRecentError[];
};

// ───── Labels traduzidos ───────────────────────────────────────────────────

export const FUNCTION_LABELS: Record<string, string> = {
  'analyze-pet-photo': 'Análise de foto',
  'ocr-document': 'Scanner OCR',
  'generate-cardapio': 'Cardápio',
  'generate-prontuario': 'Prontuário',
  'classify-diary-entry': 'Classificação diário',
  'generate-diary-narration': 'Narração diário',
  'generate-embedding': 'Embeddings',
  'pet-assistant': 'Assistente IA',
  'generate-ai-insight': 'Insights',
  'evaluate-nutrition': 'Avaliação nutricional',
  'generate-personality': 'Personalidade',
};

// ───── get_admin_total_costs ───────────────────────────────────────────────

export type CostCategory =
  | 'infrastructure'
  | 'platform'
  | 'development'
  | 'labor'
  | 'equipment'
  | 'training'
  | 'other';

export type BillingCycle = 'monthly' | 'annual' | 'one_time';

export type InfrastructureCostItem = {
  id: string;
  item: string;
  vendor: string | null;
  category: CostCategory;
  amount_usd: number;
  billing_cycle: BillingCycle;
  monthly_equivalent_usd: number;
  original_amount: number | null;
  original_currency: string | null;
  fx_rate_to_usd: number | null;
  started_at: string;
  ended_at: string | null;
  notes: string | null;
};

export type AdminTotalCosts = {
  period: { year: number; month: number; start: string; end: string };
  fixed_monthly_usd: number;
  one_time_paid_this_month_usd: number;
  variable_ai_usd: number;
  grand_total_usd: number;
  by_category: Partial<Record<CostCategory, number>>;
  by_vendor: Record<string, number>;
  items: InfrastructureCostItem[];
};

export const CATEGORY_LABELS: Record<CostCategory, string> = {
  infrastructure: 'Infraestrutura',
  platform:       'Plataformas / Lojas',
  development:    'Ferramentas de dev',
  labor:          'Equipe / Mão de obra',
  equipment:      'Equipamentos',
  training:       'Treinamento',
  other:          'Outros',
};

export const BILLING_LABELS: Record<BillingCycle, string> = {
  monthly:  'Mensal',
  annual:   'Anual',
  one_time: 'Único',
};

export const ERROR_LABELS: Record<string, string> = {
  timeout: 'Timeout',
  network: 'Rede',
  api_error: 'Erro de API',
  invalid_response: 'Resposta inválida',
  quota_exceeded: 'Cota excedida',
  safety_filter: 'Safety filter',
  auth_error: 'Autenticação',
  validation_error: 'Validação',
  unknown: 'Desconhecido',
};
