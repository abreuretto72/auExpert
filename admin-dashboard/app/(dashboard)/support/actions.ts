'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase-server';

/**
 * Server Action: admin envia resposta numa conversa de suporte.
 *
 * Chama a EF support-admin-reply (que já valida role=admin, marca takeover,
 * enfileira push). Retorna ok/error para o componente client.
 */
export async function sendAdminReply(opts: {
  conversation_id: string;
  content: string;
  takeover?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  if (!opts.conversation_id) return { ok: false, error: 'conversation_id obrigatório' };
  if (!opts.content?.trim()) return { ok: false, error: 'mensagem vazia' };

  const supabase = await createSupabaseServerClient();
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  if (!token) return { ok: false, error: 'sem sessão' };

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const ANON_KEY     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/support-admin-reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        conversation_id: opts.conversation_id,
        content: opts.content,
        takeover: opts.takeover ?? true,
      }),
    });

    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) return { ok: false, error: json.error ?? `HTTP ${resp.status}` };

    revalidatePath(`/support/${opts.conversation_id}`);
    revalidatePath('/support');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * Marca uma conversa como fechada (status='closed').
 */
export async function closeConversation(conversationId: string): Promise<{ ok: boolean; error?: string }> {
  if (!conversationId) return { ok: false, error: 'id obrigatório' };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('support_conversations')
    .update({ status: 'closed', closed_at: new Date().toISOString() })
    .eq('id', conversationId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/support');
  revalidatePath(`/support/${conversationId}`);
  return { ok: true };
}

/**
 * Reativa IA numa conversa que admin assumiu.
 */
export async function reactivateAi(conversationId: string): Promise<{ ok: boolean; error?: string }> {
  if (!conversationId) return { ok: false, error: 'id obrigatório' };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('support_conversations')
    .update({ ia_active: true, escalated_to_human: false })
    .eq('id', conversationId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/support/${conversationId}`);
  return { ok: true };
}
