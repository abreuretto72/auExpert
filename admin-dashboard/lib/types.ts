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

// ───── get_admin_user_detail (painel lateral) ─────────────────────────────

export type AdminUserDetail = {
  user: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    phone: string | null;
    cpf: string | null;
    birth_date: string | null;
    role: string;
    is_active: boolean;
    plan_id: string | null;
    country: string | null;
    city: string | null;
    state: string | null;
    address_street: string | null;
    address_number: string | null;
    address_complement: string | null;
    address_neighborhood: string | null;
    address_zip: string | null;
    latitude: number | null;
    longitude: number | null;
    social_network_type: string | null;
    social_network_handle: string | null;
    language: string | null;
    preferred_language: string | null;
    timezone: string | null;
    privacy_profile_public: boolean | null;
    privacy_show_location: boolean | null;
    privacy_show_pets: boolean | null;
    privacy_show_social: boolean | null;
    biometric_enabled: boolean | null;
    biometric_type: string | null;
    failed_login_attempts: number | null;
    locked_until: string | null;
    xp: number | null;
    level: number | null;
    title: string | null;
    proof_of_love_tier: string | null;
    created_at: string;
    updated_at: string | null;
    last_app_version: string | null;
    last_build_number: string | null;
    last_platform: string | null;
    last_device_model: string | null;
    last_device_locale: string | null;
    last_seen_at: string | null;
    install_lat: number | null;
    install_lng: number | null;
    install_country: string | null;
    install_country_code: string | null;
    install_location_at: string | null;
    install_location_source: 'gps' | 'manual' | 'ip' | null;
    expo_push_token: 'configured' | null;
    push_token_invalid_at: string | null;
    app_status: 'active' | 'idle' | 'dormant' | 'uninstalled' | 'never_opened';
  };
  professional: {
    id: string;
    professional_type: string;
    verification_status: string;
    council_name: string | null;
    council_number: string | null;
    council_uf: string | null;
    fiscal_id_type: string | null;
    fiscal_id_value: string | null;
    display_name: string | null;
    bio: string | null;
    languages: string[] | null;
    specialties: string[] | null;
    phone: string | null;
    clinic_name: string | null;
    clinic_cnpj: string | null;
    clinic_address: string | null;
    website: string | null;
    profile_photo_url: string | null;
    verified_at: string | null;
    created_at: string;
  } | null;
  invite: {
    inviter_email: string | null;
    inviter_name: string | null;
    invite_role: string | null;
    accepted_at: string;
    pet_id: string | null;
    pet_name: string | null;
  } | null;
  subscription: {
    plan_id: string | null;
    plan_name: Record<string, string> | null;     // jsonb i18n
    plan_price_brl: number | null;
    plan_price_usd: number | null;
    status: string | null;                         // active|trialing|cancelled|expired
    is_paying: boolean;
    current_period_start: string | null;
    current_period_end: string | null;
    trial_end_at: string | null;
    cancelled_at: string | null;
    grace_period_end_at: string | null;
    store: string | null;                          // ios|android|web|stripe|...
    price_paid: number | null;
    currency_paid: string | null;
    subscribed_at: string | null;
    total_payments: number;
    first_paid_at: string | null;
    last_paid_at: string | null;
    last_paid_amount: number | null;
    last_paid_currency: string | null;
    last_paid_event: string | null;
    last_paid_store: string | null;
    lifetime_value_usd: number;
    lifetime_value_brl: number;
  } | null;
  pets: Array<{
    id: string;
    name: string;
    species: string;
    breed: string | null;
    birth_date: string | null;
    weight_kg: number | null;
    photo_url: string | null;
    created_at: string;
  }>;
  stats_30d: {
    ai_invocations: number;
    ai_cost_usd: number;
    errors: number;
    logins: number;
  };
  recent_activity: Array<{
    action: string;
    table_name: string | null;
    changes: Record<string, unknown> | null;
    created_at: string;
  }>;
  recent_ai: Array<{
    id: string;
    function_name: string;
    status: string;
    error_category: string | null;
    model_used: string | null;
    latency_ms: number | null;
    tokens_in: number | null;
    tokens_out: number | null;
    created_at: string;
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
  // Snapshot do app no último login.
  last_app_version: string | null;
  last_build_number: string | null;
  last_platform: string | null;          // 'ios' | 'android' | 'web' | null
  last_seen_at: string | null;
  last_device_model: string | null;      // ex: "iPhone 15 Pro"
  last_device_locale: string | null;     // ex: "pt-BR"
  // Localização capturada via GPS na 1ª vez (com permissão).
  install_lat: number | null;
  install_lng: number | null;
  install_country: string | null;
  install_country_code: string | null;
  install_location_at: string | null;
  install_location_source: 'gps' | 'manual' | 'ip' | null;
  // Tipo profissional + status quando aplicável (LEFT JOIN com professionals).
  professional_type: string | null;       // veterinarian, groomer, walker, ...
  professional_status: string | null;     // pending, verified, rejected
  // Status derivado do app: active/idle/dormant/uninstalled/never_opened.
  app_status: 'active' | 'idle' | 'dormant' | 'uninstalled' | 'never_opened' | null;
  push_token_invalid_at: string | null;
  // Quem convidou esse profissional (via access_invites). Null se for tutor
  // direto ou profissional que se cadastrou sem convite.
  invited_by_email: string | null;
  invited_by_name: string | null;
  invited_at: string | null;
  invited_via_pet_id: string | null;
  invited_via_pet_name: string | null;
  invite_role: string | null;             // vet, vet_full, vet_read, etc.
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
  tokens_in: number | null;
  tokens_out: number | null;
  pet_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
  user_email: string | null;
};

export type AdminAiBreakdown = {
  by_function: AdminAiBreakdownByFunction[];
  by_model: AdminAiBreakdownByModel[];
  errors_by_category: Record<string, number>;
  recent_errors: AdminRecentError[];
};

// Detail RPC: get_admin_ai_error_detail(p_id) — invocação completa + diag_logs
// correlatos (±10min na mesma EF) + estatística de recorrência + resolução
// (quando admin já marcou esta classe de erro como tratada).
export type AdminAiErrorDetail = {
  invocation: {
    id: string;
    function_name: string;
    status: string;
    error_category: string | null;
    error_message: string | null;
    user_message: string | null;
    model_used: string | null;
    provider: string | null;
    tokens_in: number | null;
    tokens_out: number | null;
    cache_read_tokens: number | null;
    cache_write_tokens: number | null;
    image_count: number | null;
    audio_seconds: number | null;
    latency_ms: number | null;
    pet_id: string | null;
    pet_name: string | null;
    user_id: string | null;
    user_email: string | null;
    payload: Record<string, unknown> | null;
    created_at: string;
  };
  signature: string;
  recurrence: {
    count_24h: number;
    count_7d: number;
    users_24h: number;
    first_seen: string | null;
  };
  resolution: {
    is_resolved: boolean;
    resolution_notes: string | null;
    resolved_at: string;
    resolved_by: string | null;
    resolver_email: string | null;
  } | null;
  diag_logs: Array<{
    id: string;
    request_id: string | null;
    level: string;
    message: string;
    payload: Record<string, unknown> | null;
    created_at: string;
  }>;
};

// Diagnóstico IA estruturado retornado pela EF diagnose-ai-error.
export type AiDiagnosis = {
  summary: string;
  root_cause: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: 'low' | 'medium' | 'high';
  evidence: string[];
  fix_actions: Array<{
    type: 'deploy' | 'migration' | 'secret' | 'app_code' | 'external' | 'observe';
    description: string;
    command_or_sql?: string | null;
  }>;
  references?: string[];
};

export type AiDiagnosisResponse = {
  from_cache: boolean;
  signature: string;
  id: string | null;
  diagnosis: AiDiagnosis;
  model_used: string;
  tokens_in: number;
  tokens_out: number;
  latency_ms: number;
  occurrences_when_diagnosed: number;
  generated_at: string;
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

// ───── get_admin_app_errors_list ───────────────────────────────────────────

export type AppErrorSeverity = 'info' | 'warning' | 'error' | 'critical';
export type AppErrorCategory =
  | 'crash' | 'unhandled' | 'network' | 'ai_failure'
  | 'validation' | 'permission' | 'manual_report' | 'other';
export type AppErrorStatus =
  | 'open' | 'investigating' | 'resolved' | 'wont_fix' | 'duplicate';

export type AppErrorRow = {
  id: string;
  severity: AppErrorSeverity;
  category: AppErrorCategory;
  message: string;
  route: string | null;
  component: string | null;
  app_version: string | null;
  platform: 'ios' | 'android' | 'web' | null;
  os_version: string | null;
  device_model: string | null;
  is_online: boolean | null;
  user_message: string | null;
  status: AppErrorStatus;
  fingerprint: string | null;
  occurrence_count: number;
  created_at: string;
  resolved_at: string | null;
  resolution_note: string | null;
  user_email: string | null;
};

export type AdminAppErrorsList = {
  page: number;
  per_page: number;
  total: number;
  pages: number;
  totals: { open: number; critical_30d: number; today: number };
  by_severity: Partial<Record<AppErrorSeverity, number>>;
  by_category: Partial<Record<AppErrorCategory, number>>;
  items: AppErrorRow[];
};

export const APP_ERROR_SEVERITY_LABELS: Record<AppErrorSeverity, string> = {
  info:     'Info',
  warning:  'Aviso',
  error:    'Erro',
  critical: 'Crítico',
};

export const APP_ERROR_CATEGORY_LABELS: Record<AppErrorCategory, string> = {
  crash:         'Crash',
  unhandled:     'Promise não-tratada',
  network:       'Rede',
  ai_failure:    'Falha de IA (vista pelo tutor)',
  validation:    'Validação',
  permission:    'Permissão / RLS',
  manual_report: 'Relato manual',
  other:         'Outros',
};

export const APP_ERROR_STATUS_LABELS: Record<AppErrorStatus, string> = {
  open:          'Aberto',
  investigating: 'Investigando',
  resolved:      'Resolvido',
  wont_fix:      'Won\'t fix',
  duplicate:     'Duplicado',
};

// ───── get_admin_support_conversations ─────────────────────────────────────

export type SupportConvStatus = 'open' | 'closed' | 'archived';
export type SupportSender = 'user' | 'ai' | 'admin';

export type SupportConversationRow = {
  id: string;
  user_id: string;
  user_email: string | null;
  user_name: string | null;
  status: SupportConvStatus;
  ia_active: boolean;
  escalated_to_human: boolean;
  escalated_at: string | null;
  subject: string | null;
  last_message_at: string;
  last_sender: SupportSender | null;
  message_count: number;
  app_version: string | null;
  platform: string | null;
  locale: string | null;
  created_at: string;
  unread_admin_count: number;
};

export type AdminSupportConversations = {
  page: number;
  per_page: number;
  total: number;
  pages: number;
  totals: {
    open: number;
    escalated: number;
    unread_admin: number;
  };
  items: SupportConversationRow[];
};

export type SupportMessageRow = {
  id: string;
  sender: SupportSender;
  sender_user_id: string | null;
  content: string;
  attachments: unknown;
  ai_model: string | null;
  ai_tokens_in: number | null;
  ai_tokens_out: number | null;
  read_by_user: boolean;
  read_by_admin: boolean;
  created_at: string;
};

export type AdminSupportMessages = {
  conversation: SupportConversationRow;
  messages: SupportMessageRow[];
};

// ───── get_admin_team_list ─────────────────────────────────────────────────

export type AdminRole = 'admin' | 'admin_financial' | 'admin_support';

export type AdminTeamMember = {
  id: string;
  email: string;
  full_name: string | null;
  role: AdminRole;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
};

export type AdminInviteRow = {
  id: string;
  email: string;
  role: AdminRole;
  expires_at: string;
  created_at: string;
  invited_by_email: string | null;
  status?: 'pending' | 'accepted' | 'expired' | 'revoked';
  accepted_at?: string | null;
  revoked_at?: string | null;
};

export type AdminTeamList = {
  members: AdminTeamMember[];
  pending_invites: AdminInviteRow[];
  history: AdminInviteRow[];
};

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  admin:           'Super-admin (acesso total)',
  admin_financial: 'Financeiro (custos)',
  admin_support:   'Suporte (chat + erros)',
};

// ───── Error labels (legacy — usado pela tela /errors antiga) ──────────────

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
