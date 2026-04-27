/**
 * UserDetailPanel — server component carregado quando ?u=<id> está na rota
 * /users. Layout inspirado no AiErrorDetailPanel: cabeçalho com identidade,
 * grid de chips factuais, sub-seções por tema, sidebar sticky.
 */

import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { fmtDate, fmtNum, fmtUSD } from '@/lib/utils';
import type { AdminUserDetail } from '@/lib/types';

const APP_STATUS_LABELS: Record<string, string> = {
  active:       'Ativo',
  idle:         'Parado',
  dormant:      'Dormente',
  uninstalled:  'Desinstalado',
  never_opened: 'Nunca abriu',
};

const APP_STATUS_BADGE: Record<string, string> = {
  active:       'bg-jade/20 text-jade border-jade/30',
  idle:         'bg-warning/10 text-warning border-warning/30',
  dormant:      'bg-warning/20 text-warning border-warning/40',
  uninstalled:  'bg-danger/10 text-danger border-danger/30',
  never_opened: 'bg-bg-deep text-text-dim border-border',
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin', tutor_owner: 'Tutor', tutor: 'Tutor',
  professional: 'Profissional', vet: 'Veterinário(a)', co_tutor: 'Co-tutor',
};

const PROF_TYPE_LABELS: Record<string, string> = {
  veterinarian: 'Veterinário(a)', vet: 'Veterinário(a)',
  vet_tech: 'Aux. veterinário', groomer: 'Groomer', walker: 'Passeador',
  trainer: 'Adestrador', pet_sitter: 'Pet sitter', pet_shop: 'Pet shop',
  hotel: 'Hospedagem', daycare: 'Creche', transport: 'Transporte pet',
  photographer: 'Fotógrafo pet', designer: 'Designer pet', ngo: 'ONG',
  other: 'Outro',
};

interface Props {
  userId: string;
  closeHref: string;
}

export async function UserDetailPanel({ userId, closeHref }: Props) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_admin_user_detail', { p_user_id: userId });

  if (error) {
    return (
      <div className="bg-bg-card border border-danger/30 rounded-xl p-5">
        <PanelHeader title="Erro ao carregar" closeHref={closeHref} />
        <pre className="text-text-dim text-xs whitespace-pre-wrap font-mono mt-2">
{error.message}
        </pre>
      </div>
    );
  }

  const detail = data as AdminUserDetail | null;
  if (!detail || !detail.user || ('error' in (detail as Record<string, unknown>))) {
    return (
      <div className="bg-bg-card border border-border rounded-xl p-5">
        <PanelHeader title="Usuário não encontrado" closeHref={closeHref} />
      </div>
    );
  }

  const u = detail.user;
  const prof = detail.professional;
  const invite = detail.invite;
  const sub = detail.subscription;
  const stats = detail.stats_30d;

  const subStatusBadge =
    sub?.status === 'active'    ? 'bg-jade/20 text-jade border-jade/30' :
    sub?.status === 'trialing'  ? 'bg-ametista/10 text-ametista border-ametista/30' :
    sub?.status === 'cancelled' ? 'bg-warning/10 text-warning border-warning/30' :
    sub?.status === 'expired'   ? 'bg-danger/10 text-danger border-danger/30' :
                                  'bg-bg-deep text-text-dim border-border';
  const subStatusLabel: Record<string, string> = {
    active: 'pagando', trialing: 'trial', cancelled: 'cancelado',
    expired: 'expirado', past_due: 'inadimplente',
  };
  const functionLabel = prof
    ? PROF_TYPE_LABELS[prof.professional_type] ?? prof.professional_type
    : ROLE_LABELS[u.role] ?? u.role;

  return (
    <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-bg-deep px-5 py-4 border-b border-border flex items-baseline justify-between gap-4">
        <div className="min-w-0">
          <div className="text-text-muted text-[10px] uppercase tracking-widest font-medium mb-1">
            Detalhe do usuário
          </div>
          <h3 className="font-display text-2xl text-text truncate">
            {u.full_name || u.email}
          </h3>
          <div className="text-text-dim text-xs mt-1 font-mono truncate">{u.email}</div>
          <div className="text-text-dim text-[11px] mt-1">
            cadastrado {fmtDate(u.created_at)}
          </div>
        </div>
        <Link
          href={closeHref}
          className="text-text-muted hover:text-text text-xs px-3 py-1.5 rounded-lg border border-border hover:border-text-muted transition shrink-0"
        >
          Fechar ✕
        </Link>
      </div>

      {/* Status + função */}
      <div className="px-5 py-4 border-b border-border flex flex-wrap gap-2">
        <span className={`text-[10px] px-2 py-1 rounded-md font-mono uppercase border ${APP_STATUS_BADGE[u.app_status] ?? APP_STATUS_BADGE.never_opened}`}>
          {APP_STATUS_LABELS[u.app_status]}
        </span>
        <span className={`text-[10px] px-2 py-1 rounded-md uppercase tracking-wider border ${
          prof ? 'bg-ai/10 text-ai border-ai/30' :
          u.role === 'admin' ? 'bg-jade/20 text-jade border-jade/30' :
          'bg-bg-deep text-text-muted border-border'
        }`}>
          {functionLabel}
          {prof?.verification_status === 'verified' ? ' ✓' : ''}
        </span>
        {u.plan_id && (
          <span className="text-[10px] px-2 py-1 rounded-md bg-ametista/10 text-ametista border border-ametista/30 uppercase">
            {u.plan_id}
          </span>
        )}
        {u.is_active === false && (
          <span className="text-[10px] px-2 py-1 rounded-md bg-danger/10 text-danger border border-danger/30 uppercase">
            inativo
          </span>
        )}
      </div>

      {/* Stats 30d */}
      <div className="px-5 py-4 border-b border-border grid grid-cols-4 gap-3">
        <Stat label="Pets" value={fmtNum(detail.pets.length)} />
        <Stat label="IA 30d" value={fmtNum(stats.ai_invocations)} />
        <Stat label="Custo 30d" value={stats.ai_cost_usd > 0 ? fmtUSD(stats.ai_cost_usd) : '—'} accent="jade" />
        <Stat label="Logins 30d" value={fmtNum(stats.logins)} />
        {stats.errors > 0 && (
          <Stat label="Erros 30d" value={fmtNum(stats.errors)} accent="danger" />
        )}
      </div>

      {/* Identidade */}
      <Section title="Identidade">
        <Field label="Nome completo" value={u.full_name} />
        <Field label="Email" value={u.email} mono />
        <Field label="Telefone" value={u.phone} mono />
        <Field label="CPF" value={u.cpf} mono />
        <Field label="Nascimento" value={u.birth_date ? fmtDate(u.birth_date) : null} />
        <Field label="Bloqueado até" value={u.locked_until ? fmtDate(u.locked_until) : null} accent={u.locked_until ? 'danger' : undefined} />
        <Field label="Tentativas falhas" value={u.failed_login_attempts ? String(u.failed_login_attempts) : '0'} />
      </Section>

      {/* Assinatura */}
      {sub && (
        <Section title="Assinatura">
          <Field
            label="Status"
            value={sub.status ? (subStatusLabel[sub.status] ?? sub.status).toUpperCase() : null}
            accent={sub.is_paying ? 'jade' : sub.status === 'expired' ? 'danger' : 'warning'}
          />
          <Field label="Plano" value={sub.plan_id} mono />
          <Field
            label="Pagando atualmente?"
            value={sub.is_paying ? 'sim' : 'não'}
            accent={sub.is_paying ? 'jade' : 'danger'}
          />
          <Field label="Assinou em" value={sub.subscribed_at ? fmtDate(sub.subscribed_at) : null} />
          <Field
            label="Trial até"
            value={sub.trial_end_at ? fmtDate(sub.trial_end_at) : null}
            accent="warning"
          />
          <Field label="Período atual" value={
            sub.current_period_start && sub.current_period_end
              ? `${fmtDate(sub.current_period_start)} → ${fmtDate(sub.current_period_end)}`
              : null
          } />
          <Field
            label="Cancelado em"
            value={sub.cancelled_at ? fmtDate(sub.cancelled_at) : null}
            accent="warning"
          />
          <Field
            label="Período de carência"
            value={sub.grace_period_end_at ? `até ${fmtDate(sub.grace_period_end_at)}` : null}
            accent="warning"
          />
          <Field label="Loja" value={sub.store} mono />

          {/* Pagamentos — agregados */}
          <div className="col-span-2 mt-2 pt-3 border-t border-border grid grid-cols-3 gap-3">
            <Stat
              label="Total de pagamentos"
              value={fmtNum(sub.total_payments)}
              accent={sub.total_payments > 0 ? 'jade' : undefined}
            />
            <Stat
              label="Lifetime (USD)"
              value={sub.lifetime_value_usd > 0 ? fmtUSD(sub.lifetime_value_usd) : '—'}
              accent="jade"
            />
            <Stat
              label="Lifetime (BRL)"
              value={sub.lifetime_value_brl > 0 ? `R$ ${sub.lifetime_value_brl.toFixed(2)}` : '—'}
            />
          </div>

          {/* Último pagamento */}
          {sub.last_paid_at && (
            <div className="col-span-2 mt-2 pt-3 border-t border-border">
              <div className="text-text-dim text-[10px] uppercase tracking-widest font-medium mb-2">
                Último pagamento
              </div>
              <div className="bg-bg-deep border border-border rounded-lg p-3 flex items-baseline justify-between gap-3">
                <div>
                  <div className="font-mono text-jade text-lg font-bold">
                    {sub.last_paid_currency === 'USD'
                      ? fmtUSD(sub.last_paid_amount ?? 0)
                      : `${sub.last_paid_currency ?? 'R$'} ${(sub.last_paid_amount ?? 0).toFixed(2)}`}
                  </div>
                  <div className="text-text-dim text-[10px] mt-0.5">
                    {sub.last_paid_event ?? 'pagamento'}
                    {sub.last_paid_store ? ` · ${sub.last_paid_store}` : ''}
                  </div>
                </div>
                <div className="text-text-muted text-xs font-mono">{fmtDate(sub.last_paid_at)}</div>
              </div>
              {sub.first_paid_at && (
                <div className="text-text-dim text-[10px] mt-1.5">
                  primeira ocorrência: <span className="font-mono">{fmtDate(sub.first_paid_at)}</span>
                </div>
              )}
            </div>
          )}

          {sub.total_payments === 0 && (
            <div className="col-span-2 text-text-dim text-xs italic mt-1">
              Nenhum pagamento registrado em <code className="font-mono">subscription_payments</code>.
              {sub.is_paying ? ' (Cadastro existe mas o webhook do RevenueCat ainda não populou o histórico.)' : ''}
            </div>
          )}
        </Section>
      )}

      {/* Endereço */}
      <Section title="Endereço">
        <Field label="País" value={u.country} />
        <Field label="Cidade / Estado" value={u.city ? `${u.city}${u.state ? ` / ${u.state}` : ''}` : null} />
        <Field label="Bairro" value={u.address_neighborhood} />
        <Field label="Rua" value={u.address_street ? `${u.address_street}${u.address_number ? `, ${u.address_number}` : ''}` : null} />
        <Field label="Complemento" value={u.address_complement} />
        <Field label="CEP" value={u.address_zip} mono />
        {(u.latitude != null || u.install_lat != null) && (
          <Field
            label="GPS"
            value={
              u.install_lat != null
                ? `${u.install_lat.toFixed(4)}, ${u.install_lng?.toFixed(4)}`
                : `${u.latitude?.toFixed(4)}, ${u.longitude?.toFixed(4)}`
            }
            mono
          />
        )}
        {u.install_country && (
          <Field
            label="País (GPS)"
            value={`${u.install_country_code ? `${u.install_country_code} · ` : ''}${u.install_country}`}
            accent={u.install_location_source === 'gps' ? 'jade' : undefined}
          />
        )}
      </Section>

      {/* Device + app */}
      <Section title="Aplicativo">
        <Field label="Versão" value={u.last_app_version ? `v${u.last_app_version}` : null} mono />
        <Field label="Build" value={u.last_build_number} mono />
        <Field label="Plataforma" value={u.last_platform?.toUpperCase()} mono />
        <Field label="Modelo do device" value={u.last_device_model} />
        <Field label="Idioma do device" value={u.last_device_locale} mono />
        <Field label="Idioma preferido (app)" value={u.preferred_language ?? u.language} mono />
        <Field label="Timezone" value={u.timezone} mono />
        <Field
          label="Push token"
          value={u.expo_push_token ? (u.push_token_invalid_at ? 'inválido' : 'ativo') : 'ausente'}
          accent={u.push_token_invalid_at ? 'danger' : u.expo_push_token ? 'jade' : undefined}
        />
        <Field label="Última abertura" value={u.last_seen_at ? fmtDate(u.last_seen_at) : null} />
      </Section>

      {/* Profissional */}
      {prof && (
        <Section title="Perfil profissional">
          <Field label="Tipo" value={PROF_TYPE_LABELS[prof.professional_type] ?? prof.professional_type} />
          <Field label="Status verificação" value={prof.verification_status} accent={prof.verification_status === 'verified' ? 'jade' : 'warning'} />
          <Field label="Conselho" value={prof.council_name ? `${prof.council_name}${prof.council_uf ? ` / ${prof.council_uf}` : ''}` : null} />
          <Field label="Nº conselho" value={prof.council_number} mono />
          <Field label="Documento" value={prof.fiscal_id_value ? `${prof.fiscal_id_type ?? ''} ${prof.fiscal_id_value}`.trim() : null} mono />
          <Field label="Nome de exibição" value={prof.display_name} />
          <Field label="Telefone profissional" value={prof.phone} mono />
          <Field label="Clínica" value={prof.clinic_name} />
          <Field label="CNPJ" value={prof.clinic_cnpj} mono />
          <Field label="Endereço clínica" value={prof.clinic_address} />
          <Field label="Website" value={prof.website} mono />
          <Field label="Verificado em" value={prof.verified_at ? fmtDate(prof.verified_at) : null} />
          {prof.bio && (
            <div className="col-span-2 mt-2">
              <div className="text-text-dim text-[10px] uppercase tracking-widest font-medium mb-1">Bio</div>
              <div className="text-text-muted text-sm leading-relaxed">{prof.bio}</div>
            </div>
          )}
          {prof.specialties && prof.specialties.length > 0 && (
            <div className="col-span-2 mt-2">
              <div className="text-text-dim text-[10px] uppercase tracking-widest font-medium mb-1">Especialidades</div>
              <div className="flex flex-wrap gap-1.5">
                {prof.specialties.map((s) => (
                  <span key={s} className="text-[11px] bg-bg-deep px-2 py-0.5 rounded border border-border text-text-muted">{s}</span>
                ))}
              </div>
            </div>
          )}
        </Section>
      )}

      {/* Convite */}
      {invite && (
        <Section title="Como entrou">
          <Field label="Convidado por" value={invite.inviter_name || invite.inviter_email} />
          <Field label="Email do convidador" value={invite.inviter_email} mono />
          <Field label="Pet de origem" value={invite.pet_name} />
          <Field label="Papel do convite" value={invite.invite_role} mono />
          <Field label="Aceito em" value={fmtDate(invite.accepted_at)} />
        </Section>
      )}

      {/* Privacidade */}
      <Section title="Privacidade">
        <Field label="Perfil público" value={u.privacy_profile_public ? 'sim' : 'não'} />
        <Field label="Mostra localização" value={u.privacy_show_location ? 'sim' : 'não'} />
        <Field label="Mostra pets" value={u.privacy_show_pets ? 'sim' : 'não'} />
        <Field label="Mostra redes sociais" value={u.privacy_show_social ? 'sim' : 'não'} />
        <Field label="Biometria" value={u.biometric_enabled ? `sim (${u.biometric_type ?? '?'})` : 'não'} />
      </Section>

      {/* Pets */}
      {detail.pets.length > 0 && (
        <Section title={`Pets (${detail.pets.length})`}>
          <div className="col-span-2 space-y-2">
            {detail.pets.map((p) => (
              <div key={p.id} className="flex items-center gap-3 bg-bg-deep border border-border rounded-lg p-2.5">
                {p.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.photo_url} alt={p.name} className="w-10 h-10 rounded-md object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-md bg-bg-card border border-border flex items-center justify-center text-xs text-text-dim">
                    {p.species === 'cat' ? '🐈' : '🐕'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-text font-medium text-sm">{p.name}</div>
                  <div className="text-text-dim text-xs truncate">
                    {p.species}{p.breed ? ` · ${p.breed}` : ''}
                    {p.weight_kg ? ` · ${p.weight_kg}kg` : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Atividade IA recente */}
      {detail.recent_ai.length > 0 && (
        <Section title={`Últimas chamadas de IA (${detail.recent_ai.length})`}>
          <div className="col-span-2 space-y-1.5">
            {detail.recent_ai.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-2 text-xs bg-bg-deep border border-border rounded-md px-2.5 py-1.5">
                <span className="font-mono text-text-muted truncate">{a.function_name}</span>
                <span className={`font-mono text-[10px] uppercase px-1.5 rounded ${
                  a.status === 'success' ? 'text-jade' : 'text-danger'
                }`}>{a.status}</span>
                <span className="font-mono text-text-dim text-[10px] whitespace-nowrap">{fmtDate(a.created_at)}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Atividade audit recente */}
      {detail.recent_activity.length > 0 && (
        <Section title="Atividade recente">
          <div className="col-span-2 space-y-1.5">
            {detail.recent_activity.slice(0, 10).map((a, i) => (
              <div key={i} className="flex items-center justify-between gap-2 text-xs bg-bg-deep border border-border rounded-md px-2.5 py-1.5">
                <span className="font-mono text-text-muted">{a.action}</span>
                {a.table_name && <span className="text-text-dim text-[10px]">{a.table_name}</span>}
                <span className="font-mono text-text-dim text-[10px] whitespace-nowrap">{fmtDate(a.created_at)}</span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function PanelHeader({ title, closeHref }: { title: string; closeHref: string }) {
  return (
    <div className="flex items-baseline justify-between mb-3">
      <h3 className="font-display text-xl">{title}</h3>
      <Link href={closeHref} className="text-text-muted hover:text-text text-xs">
        Fechar ✕
      </Link>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-5 py-4 border-b border-border">
      <div className="text-ametista text-[10px] uppercase tracking-widest font-medium mb-3">
        {title}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {children}
      </div>
    </div>
  );
}

function Field({
  label, value, mono = false, accent,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
  accent?: 'jade' | 'warning' | 'danger';
}) {
  if (value === null || value === undefined || value === '') return null;
  const colorClass =
    accent === 'jade' ? 'text-jade'
    : accent === 'warning' ? 'text-warning'
    : accent === 'danger' ? 'text-danger'
    : 'text-text';
  return (
    <div>
      <div className="text-text-dim text-[10px] uppercase tracking-widest font-medium mb-0.5">{label}</div>
      <div className={`text-sm ${colorClass} ${mono ? 'font-mono' : ''} break-words`}>{value}</div>
    </div>
  );
}

function Stat({
  label, value, accent,
}: {
  label: string;
  value: string;
  accent?: 'jade' | 'warning' | 'danger';
}) {
  const color =
    accent === 'jade' ? 'text-jade' :
    accent === 'warning' ? 'text-warning' :
    accent === 'danger' ? 'text-danger' :
    'text-text';
  return (
    <div className="bg-bg-deep border border-border rounded-lg px-3 py-2 text-center">
      <div className="text-text-dim text-[10px] uppercase tracking-widest font-medium mb-0.5">{label}</div>
      <div className={`font-display text-xl ${color}`}>{value}</div>
    </div>
  );
}
