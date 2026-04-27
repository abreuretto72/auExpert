import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { PageError } from '@/components/page-error';
import { fmtDate, fmtNum, fmtUSD } from '@/lib/utils';
import type { AdminUsersList } from '@/lib/types';
import { UserDetailPanel } from './_components/UserDetailPanel';

// Labels amigáveis de role/professional_type. Ficam no topo do módulo pra não
// re-criar a cada render.
const ROLE_LABELS: Record<string, string> = {
  admin:         'Admin',
  tutor_owner:   'Tutor',
  tutor:         'Tutor',
  professional:  'Profissional',
  vet:           'Veterinário(a)',
  co_tutor:      'Co-tutor',
};

const PROFESSIONAL_TYPE_LABELS: Record<string, string> = {
  veterinarian:           'Veterinário(a)',
  vet:                    'Veterinário(a)',
  vet_tech:               'Aux. veterinário',
  groomer:                'Groomer',
  walker:                 'Passeador',
  trainer:                'Adestrador',
  pet_sitter:             'Pet sitter',
  pet_shop:               'Pet shop',
  hotel:                  'Hospedagem',
  daycare:                'Creche',
  transport:              'Transporte pet',
  photographer:           'Fotógrafo pet',
  designer:               'Designer pet',
  ngo:                    'ONG',
  other:                  'Outro',
};

const APP_STATUS_LABELS: Record<string, string> = {
  active:       'ativo',
  idle:         'parado',
  dormant:      'dormente',
  uninstalled:  'desinstalado',
  never_opened: 'nunca abriu',
};

const APP_STATUS_BADGE: Record<string, string> = {
  active:       'bg-jade/20 text-jade border-jade/30',
  idle:         'bg-warning/10 text-warning border-warning/30',
  dormant:      'bg-warning/20 text-warning border-warning/40',
  uninstalled:  'bg-danger/10 text-danger border-danger/30',
  never_opened: 'bg-bg-deep text-text-dim border-border',
};

type Props = {
  searchParams: Promise<{ q?: string; page?: string; u?: string }>;
};

function buildHref(params: Record<string, string | undefined>): string {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v as string)}`)
    .join('&');
  return `/users${qs ? `?${qs}` : ''}`;
}

export default async function UsersPage({ searchParams }: Props) {
  const params = await searchParams;
  const search = params.q ?? null;
  const page = parseInt(params.page ?? '1', 10);
  const openUserId = params.u ?? null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_admin_users_list', {
    p_search: search,
    p_page: page,
    p_per_page: 20,
  });

  if (error) return <PageError pagePath="/users" techMessage={error.message} />;

  const d = data as AdminUsersList;

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl mb-2">Usuários</h1>
          <p className="text-text-muted">
            {fmtNum(d.total)} {d.total === 1 ? 'usuário' : 'usuários'} ativos
          </p>
        </div>
        <form className="flex gap-2">
          <input
            name="q"
            defaultValue={search ?? ''}
            placeholder="Buscar por email ou nome…"
            className="bg-bg-card border border-border rounded-lg px-4 py-2 text-sm text-text focus:border-jade focus:outline-none w-64"
          />
          <button
            type="submit"
            className="bg-ametista hover:bg-ametista/90 text-bg-deep font-medium px-4 py-2 rounded-lg text-sm"
          >
            Buscar
          </button>
        </form>
      </header>

      <div className={`grid grid-cols-1 ${openUserId ? 'lg:grid-cols-3' : ''} gap-6`}>
        <div className={openUserId ? 'lg:col-span-2 space-y-6' : 'space-y-6'}>

      <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg-deep text-text-muted text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left p-4 font-medium">Usuário</th>
              <th className="text-left p-4 font-medium">Função</th>
              <th className="text-left p-4 font-medium">Status</th>
              <th className="text-left p-4 font-medium">Localização</th>
              <th className="text-left p-4 font-medium">Device</th>
              <th className="text-left p-4 font-medium">App</th>
              <th className="text-right p-4 font-medium">Pets</th>
              <th className="text-right p-4 font-medium">IA mês</th>
              <th className="text-right p-4 font-medium">Custo mês</th>
              <th className="text-right p-4 font-medium">Último login</th>
              <th className="w-10 p-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {d.items.map(u => {
              const platformBadge =
                u.last_platform === 'ios' ? 'bg-bg-deep text-text border border-border'
                : u.last_platform === 'android' ? 'bg-jade/10 text-jade border border-jade/30'
                : u.last_platform === 'web' ? 'bg-ametista/10 text-ametista border border-ametista/30'
                : 'bg-bg-deep text-text-dim border border-border';

              // Função visível: prefere professional_type quando há (vet/groomer/etc),
              // fallback pra users.role (tutor_owner → "Tutor", admin → "Admin").
              const functionLabel =
                u.professional_type
                  ? PROFESSIONAL_TYPE_LABELS[u.professional_type] ?? u.professional_type
                  : ROLE_LABELS[u.role] ?? u.role;
              const functionBadge = u.professional_type
                ? 'bg-ai/10 text-ai border border-ai/30'
                : u.role === 'admin'
                ? 'bg-jade/20 text-jade'
                : 'bg-bg-deep text-text-muted';
              const isVerified = u.professional_status === 'verified';

              const localeShort = u.last_device_locale ?? null;
              const hasGps = u.install_location_source === 'gps';

              return (
                <tr
                  key={u.id}
                  className={`hover:bg-bg-deep/40 transition align-top cursor-pointer ${openUserId === u.id ? 'bg-jade/5 border-l-2 border-l-jade' : ''}`}
                  onClick={undefined}
                >
                  <td className="p-4">
                    <Link
                      href={buildHref({ q: search ?? undefined, page: String(page), u: openUserId === u.id ? undefined : u.id })}
                      className="block hover:text-jade transition"
                    >
                      <div className="font-medium text-text">{u.full_name || '—'}</div>
                      <div className="text-text-dim text-xs font-mono">{u.email}</div>
                      <div className="text-jade text-[10px] mt-1 font-medium">
                        {openUserId === u.id ? '← fechar detalhe' : 'ver detalhes →'}
                      </div>
                    </Link>
                  </td>
                  <td className="p-4">
                    <span className={`inline-block text-xs px-2 py-1 rounded-md uppercase tracking-wider ${functionBadge}`}>
                      {functionLabel}
                      {isVerified ? ' ✓' : ''}
                    </span>
                    {u.professional_type && u.professional_status && u.professional_status !== 'verified' && (
                      <div className="text-text-dim text-[10px] mt-1 italic">
                        {u.professional_status}
                      </div>
                    )}
                    {/* Quem convidou — só profissionais que vieram via access_invites */}
                    {u.invited_by_email && (
                      <div className="text-text-dim text-[10px] mt-1.5 leading-tight">
                        <div>convidado por:</div>
                        <div className="text-text-muted font-mono break-all">
                          {u.invited_by_name || u.invited_by_email}
                        </div>
                        {u.invited_via_pet_name && (
                          <div className="text-text-dim italic">via {u.invited_via_pet_name}</div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    {u.app_status ? (
                      <span className={`inline-block text-[10px] px-2 py-1 rounded-md font-mono uppercase border ${APP_STATUS_BADGE[u.app_status] ?? APP_STATUS_BADGE.never_opened}`}>
                        {APP_STATUS_LABELS[u.app_status] ?? u.app_status}
                      </span>
                    ) : (
                      <span className="text-text-dim text-xs italic">—</span>
                    )}
                  </td>
                  <td className="p-4 text-text-muted text-xs">
                    {u.city || u.install_country ? (
                      <div className="flex flex-col gap-0.5">
                        {u.city && (
                          <span>
                            {u.city}{u.state ? ` / ${u.state}` : ''}
                          </span>
                        )}
                        {u.install_country && (
                          <span className="text-text-dim flex items-center gap-1">
                            {u.install_country_code ? (
                              <span className="font-mono text-[10px]">{u.install_country_code}</span>
                            ) : null}
                            <span>{u.install_country}</span>
                            {hasGps && <span title="Origem GPS">📍</span>}
                          </span>
                        )}
                      </div>
                    ) : '—'}
                  </td>
                  <td className="p-4">
                    {u.last_device_model || localeShort ? (
                      <div className="flex flex-col gap-1">
                        {u.last_device_model && (
                          <span className="text-xs text-text">{u.last_device_model}</span>
                        )}
                        {localeShort && (
                          <span className="font-mono text-[10px] text-text-dim">{localeShort}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-text-dim text-xs italic">—</span>
                    )}
                  </td>
                  <td className="p-4">
                    {u.last_app_version || u.last_platform ? (
                      <div className="flex flex-col gap-1">
                        {u.last_app_version && (
                          <span className="font-mono text-xs text-text">
                            v{u.last_app_version}
                            {u.last_build_number ? <span className="text-text-dim"> · {u.last_build_number}</span> : null}
                          </span>
                        )}
                        {u.last_platform && (
                          <span className={`inline-block self-start text-[10px] px-1.5 py-0.5 rounded font-mono uppercase ${platformBadge}`}>
                            {u.last_platform}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-text-dim text-xs italic">desconhecido</span>
                    )}
                  </td>
                  <td className="p-4 text-right font-mono">{u.pets_count}</td>
                  <td className="p-4 text-right font-mono">{fmtNum(u.ai_invocations_this_month)}</td>
                  <td className="p-4 text-right font-mono text-jade">
                    {u.cost_this_month_usd > 0 ? fmtUSD(u.cost_this_month_usd) : '—'}
                  </td>
                  <td className="p-4 text-right text-text-dim text-xs">
                    {u.last_seen_at
                      ? fmtDate(u.last_seen_at)
                      : u.last_login_at
                      ? fmtDate(u.last_login_at)
                      : 'nunca'}
                  </td>
                  <td className="p-4 text-right">
                    <Link
                      href={buildHref({ q: search ?? undefined, page: String(page), u: openUserId === u.id ? undefined : u.id })}
                      className="inline-block text-jade hover:text-jade/80 text-lg leading-none"
                      aria-label={openUserId === u.id ? 'Fechar detalhe' : 'Abrir detalhe'}
                    >
                      {openUserId === u.id ? '×' : '→'}
                    </Link>
                  </td>
                </tr>
              );
            })}
            {d.items.length === 0 && (
              <tr>
                <td colSpan={11} className="p-8 text-center text-text-dim italic">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {d.pages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: d.pages }, (_, i) => i + 1).map(p => (
            <a
              key={p}
              href={`/users?${new URLSearchParams({ ...(search && { q: search }), page: String(p), ...(openUserId && { u: openUserId }) }).toString()}`}
              className={`px-3 py-1.5 rounded-md text-sm font-mono ${
                p === d.page
                  ? 'bg-jade/20 text-jade border border-jade/30'
                  : 'bg-bg-card text-text-muted hover:bg-bg-deep border border-border'
              }`}
            >
              {p}
            </a>
          ))}
        </div>
      )}
        </div>
        {/* Painel lateral — só renderiza quando ?u=<id> está presente */}
        {openUserId && (
          <aside className="lg:col-span-1">
            <div className="lg:sticky lg:top-4">
              <UserDetailPanel
                userId={openUserId}
                closeHref={buildHref({ q: search ?? undefined, page: String(page) })}
              />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
