'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { AdminRole } from '@/lib/types';

interface InviteResult {
  ok: boolean;
  error?: string;
  accept_url?: string;
  emailed?: boolean;
}

/** Convida nova pessoa pro painel via EF admin-team-invite. */
export async function inviteAdmin(opts: {
  email: string;
  role: AdminRole;
}): Promise<InviteResult> {
  if (!opts.email?.trim()) return { ok: false, error: 'email obrigatório' };
  if (!opts.role) return { ok: false, error: 'role obrigatório' };

  const supabase = await createSupabaseServerClient();
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  if (!token) return { ok: false, error: 'sem sessão' };

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const ANON_KEY     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/admin-team-invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email: opts.email.trim().toLowerCase(), role: opts.role }),
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) return { ok: false, error: json.error ?? `HTTP ${resp.status}` };

    revalidatePath('/team');
    return {
      ok: true,
      accept_url: json.accept_url,
      emailed:    json.emailed ?? false,
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function changeRole(targetUserId: string, newRole: AdminRole) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('update_admin_role', {
    p_target_user_id: targetUserId,
    p_new_role: newRole,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/team');
  return { ok: true };
}

export async function revokeAdminAccess(targetUserId: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('revoke_admin_access', {
    p_target_user_id: targetUserId,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/team');
  return { ok: true };
}

export async function revokeInvite(inviteId: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('revoke_admin_invite', {
    p_invite_id: inviteId,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/team');
  return { ok: true };
}
