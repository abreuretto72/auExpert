'use server';

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

export async function resendInvite(inviteId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('admin_resend_partnership_invite', {
    p_invite_id: inviteId,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/invites');
  return data as { ok: boolean; error?: string; request_id?: number };
}

export async function revokeInvite(inviteId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('admin_revoke_partnership_invite', {
    p_invite_id: inviteId,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/invites');
  return data as { ok: boolean; error?: string };
}
