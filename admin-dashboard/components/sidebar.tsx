'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, DollarSign, AlertTriangle,
  LogOut, Wallet, MessageCircle, UsersRound,
} from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase-client';
import { cn } from '@/lib/utils';

type AdminRole = 'admin' | 'admin_financial' | 'admin_support';

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  /** Quais roles veem este item. Vazio = todos os admin*. */
  roles?: AdminRole[];
}

const NAV: NavItem[] = [
  { href: '/',          label: 'Visão geral',  icon: LayoutDashboard },
  { href: '/users',     label: 'Usuários',     icon: Users,         roles: ['admin'] },
  { href: '/support',   label: 'Suporte',      icon: MessageCircle, roles: ['admin', 'admin_support'] },
  { href: '/costs',     label: 'Custo total',  icon: Wallet,        roles: ['admin', 'admin_financial'] },
  { href: '/ai-costs',  label: 'Custos de IA', icon: DollarSign,    roles: ['admin', 'admin_financial'] },
  { href: '/errors',    label: 'Erros',        icon: AlertTriangle, roles: ['admin', 'admin_support'] },
  { href: '/team',      label: 'Equipe',       icon: UsersRound,    roles: ['admin'] },
];

const ROLE_LABELS: Record<AdminRole, string> = {
  admin:           'Super-admin',
  admin_financial: 'Financeiro',
  admin_support:   'Suporte',
};

interface SidebarProps {
  role: AdminRole | null;
  displayName?: string | null;
}

export function Sidebar({ role, displayName }: SidebarProps) {
  const pathname = usePathname();

  const handleLogout = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  // Filtra os itens que o user pode ver
  const visibleNav = NAV.filter(item => {
    if (!item.roles) return true;
    if (!role) return false;
    return item.roles.includes(role);
  });

  return (
    <aside className="w-64 min-h-screen bg-bg-deep border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        <h1 className="font-display text-2xl">
          <span className="italic text-ametista">au</span>Expert
        </h1>
        <p className="text-text-dim text-[10px] mt-1 tracking-widest uppercase font-mono">
          Admin · 2026
        </p>
        {role && (
          <div className="mt-3 inline-block text-[10px] px-2 py-1 rounded font-mono uppercase border border-jade/30 text-jade bg-jade/10">
            {ROLE_LABELS[role]}
          </div>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {visibleNav.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition',
                active
                  ? 'bg-jade/10 text-jade border border-jade/20'
                  : 'text-text-muted hover:bg-bg-card hover:text-text',
              )}
            >
              <Icon size={18} strokeWidth={1.5} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {displayName && (
        <div className="px-4 pb-2 text-text-dim text-xs truncate">
          {displayName}
        </div>
      )}

      <button
        onClick={handleLogout}
        className="flex items-center gap-3 p-4 mx-4 mb-4 rounded-lg text-sm text-text-dim hover:bg-bg-card hover:text-danger transition"
      >
        <LogOut size={18} strokeWidth={1.5} />
        <span>Sair</span>
      </button>
    </aside>
  );
}
