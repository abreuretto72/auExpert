import { createSupabaseServerClient } from '@/lib/supabase-server';
import { fmtDate, fmtNum, fmtUSD } from '@/lib/utils';
import type { AdminUsersList } from '@/lib/types';

type Props = {
  searchParams: Promise<{ q?: string; page?: string }>;
};

export default async function UsersPage({ searchParams }: Props) {
  const params = await searchParams;
  const search = params.q ?? null;
  const page = parseInt(params.page ?? '1', 10);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_admin_users_list', {
    p_search: search,
    p_page: page,
    p_per_page: 20,
  });

  if (error) {
    return <div className="text-danger">Erro: {error.message}</div>;
  }

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

      <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg-deep text-text-muted text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left p-4 font-medium">Usuário</th>
              <th className="text-left p-4 font-medium">Role</th>
              <th className="text-left p-4 font-medium">Cidade</th>
              <th className="text-right p-4 font-medium">Pets</th>
              <th className="text-right p-4 font-medium">IA mês</th>
              <th className="text-right p-4 font-medium">Custo mês</th>
              <th className="text-right p-4 font-medium">Último login</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {d.items.map(u => (
              <tr key={u.id} className="hover:bg-bg-deep/40 transition">
                <td className="p-4">
                  <div className="font-medium text-text">{u.full_name || '—'}</div>
                  <div className="text-text-dim text-xs font-mono">{u.email}</div>
                </td>
                <td className="p-4">
                  <span className={`inline-block text-xs px-2 py-1 rounded-md font-mono uppercase tracking-wider ${
                    u.role === 'admin' ? 'bg-jade/20 text-jade' : 'bg-bg-deep text-text-muted'
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="p-4 text-text-muted">
                  {u.city ? `${u.city}${u.state ? ` / ${u.state}` : ''}` : '—'}
                </td>
                <td className="p-4 text-right font-mono">{u.pets_count}</td>
                <td className="p-4 text-right font-mono">{fmtNum(u.ai_invocations_this_month)}</td>
                <td className="p-4 text-right font-mono text-jade">
                  {u.cost_this_month_usd > 0 ? fmtUSD(u.cost_this_month_usd) : '—'}
                </td>
                <td className="p-4 text-right text-text-dim text-xs">
                  {u.last_login_at ? fmtDate(u.last_login_at) : 'nunca'}
                </td>
              </tr>
            ))}
            {d.items.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-text-dim italic">
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
              href={`/users?${new URLSearchParams({ ...(search && { q: search }), page: String(p) }).toString()}`}
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
  );
}
