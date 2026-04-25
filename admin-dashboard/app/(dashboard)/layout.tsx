import { Sidebar } from '@/components/sidebar';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Busca o role do user logado pra passar pro Sidebar (item-gating)
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let role: 'admin' | 'admin_financial' | 'admin_support' | null = null;
  let displayName: string | null = null;
  if (user) {
    const { data: row } = await supabase
      .from('users')
      .select('role, full_name, email')
      .eq('id', user.id)
      .single();
    if (row && (row.role === 'admin' || row.role === 'admin_financial' || row.role === 'admin_support')) {
      role = row.role;
      displayName = row.full_name ?? row.email ?? null;
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar role={role} displayName={displayName} />
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-8">{children}</div>
      </main>
    </div>
  );
}
