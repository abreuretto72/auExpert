'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, DollarSign, AlertTriangle, LogOut } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase-client';
import { cn } from '@/lib/utils';

const nav = [
  { href: '/',          label: 'Visão geral',   icon: LayoutDashboard },
  { href: '/users',     label: 'Usuários',      icon: Users },
  { href: '/ai-costs',  label: 'Custos de IA',  icon: DollarSign },
  { href: '/errors',    label: 'Erros',         icon: AlertTriangle },
];

export function Sidebar() {
  const pathname = usePathname();

  const handleLogout = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <aside className="w-64 min-h-screen bg-bg-deep border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        <h1 className="font-display text-2xl">
          <span className="italic text-ametista">au</span>Expert
        </h1>
        <p className="text-text-dim text-[10px] mt-1 tracking-widest uppercase font-mono">
          Admin · 2026
        </p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {nav.map(item => {
          const active = pathname === item.href;
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
