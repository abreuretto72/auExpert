/**
 * support-admin-reply — admin envia resposta numa conversa de suporte.
 *
 * Marca:
 *   - support_messages com sender='admin' + sender_user_id=admin
 *   - support_conversations.ia_active = false (admin assumiu)
 *   - support_conversations.assigned_admin_id = admin
 *   - read_by_admin = true em msgs anteriores do user
 *
 * Enfileira push notification pro tutor (notifications_queue type='support_reply').
 *
 * POST body:
 *   { conversation_id: string, content: string, takeover?: boolean (default true) }
 *
 * Auth: Bearer JWT obrigatório, role=admin
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResp(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return jsonResp({ error: 'method not allowed' }, 405);

  try {
    // Auth admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return jsonResp({ error: 'unauthorized' }, 401);
    const token = authHeader.replace('Bearer ', '');
    const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { user } } = await anon.auth.getUser(token);
    if (!user) return jsonResp({ error: 'unauthorized' }, 401);

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verifica role admin
    const { data: userRow } = await sb
      .from('users')
      .select('role, is_active')
      .eq('id', user.id)
      .single();
    if (!userRow || userRow.role !== 'admin' || !userRow.is_active) {
      return jsonResp({ error: 'forbidden' }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const { conversation_id, content, takeover = true } = body as Record<string, unknown>;

    if (typeof conversation_id !== 'string' || !conversation_id) {
      return jsonResp({ error: 'conversation_id required' }, 400);
    }
    if (typeof content !== 'string' || content.trim().length === 0) {
      return jsonResp({ error: 'content required' }, 400);
    }

    // Confirma conversa existe
    const { data: conv } = await sb
      .from('support_conversations')
      .select('id, user_id, ia_active, escalated_to_human, assigned_admin_id')
      .eq('id', conversation_id)
      .single();
    if (!conv) return jsonResp({ error: 'conversation not found' }, 404);

    // Insere msg admin
    const { error: insErr } = await sb.from('support_messages').insert({
      conversation_id: conv.id,
      sender:          'admin',
      sender_user_id:  user.id,
      content:         (content as string).trim().slice(0, 4000),
      read_by_admin:   true,
    });
    if (insErr) return jsonResp({ error: 'failed to insert', details: insErr.message }, 500);

    // Atualiza conversa: admin assumiu, IA off, marca msgs do user como lidas
    const updatePayload: Record<string, unknown> = {
      assigned_admin_id: user.id,
    };
    if (takeover) {
      updatePayload.ia_active = false;
      updatePayload.escalated_to_human = true;
      if (!conv.escalated_to_human) {
        updatePayload.escalated_at = new Date().toISOString();
      }
    }
    await sb.from('support_conversations').update(updatePayload).eq('id', conv.id);

    await sb.from('support_messages')
      .update({ read_by_admin: true })
      .eq('conversation_id', conv.id)
      .eq('sender', 'user')
      .eq('read_by_admin', false);

    // Enfileira push pro tutor
    try {
      await sb.from('notifications_queue').insert({
        user_id:   conv.user_id,
        type:      'support_reply',
        payload: {
          conversation_id: conv.id,
          preview: (content as string).trim().slice(0, 80),
        },
      });
    } catch (queueErr) {
      // CHECK constraint pode rejeitar 'support_reply' se ainda não estiver na lista.
      // Best-effort; não trava o response do admin.
      console.warn('[support-admin-reply] notifications_queue insert failed:', queueErr);
    }

    return jsonResp({ ok: true });
  } catch (err) {
    console.error('[support-admin-reply] error:', err);
    return jsonResp({ error: 'internal error', message: String(err) }, 500);
  }
});
