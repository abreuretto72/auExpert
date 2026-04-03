/**
 * invite-pet-member — cria um convite para co-tutoria de pet.
 *
 * Corpo da requisição:
 *   pet_id         string  — UUID do pet
 *   email          string  — email do convidado
 *   role           string  — 'co_parent' | 'caregiver' | 'viewer'
 *   nickname       string? — apelido exibido (ex: "Mamãe")
 *   can_see_finances boolean? — padrão: true para co_parent, false para outros
 *   expires_days   number? — dias até expirar; null = permanente
 *
 * Retorna: { invite_link: string }
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL       = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY        = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const APP_URL            = Deno.env.get('APP_URL') ?? 'auexpert://';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const token = authHeader.replace('Bearer ', '');

    const userClient = createClient(SUPABASE_URL, SERVICE_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser(token);
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401);

    // ── Body ──────────────────────────────────────────────────────────────────
    const { pet_id, email, role, nickname, can_see_finances, expires_days } =
      await req.json() as {
        pet_id: string;
        email: string;
        role: 'co_parent' | 'caregiver' | 'viewer';
        nickname?: string;
        can_see_finances?: boolean;
        expires_days?: number;
      };

    if (!pet_id || !email || !role) {
      return json({ error: 'pet_id, email e role são obrigatórios' }, 400);
    }
    if (!['co_parent', 'caregiver', 'viewer'].includes(role)) {
      return json({ error: 'role inválido' }, 400);
    }

    const supa = createClient(SUPABASE_URL, SERVICE_KEY);

    // ── Verificar permissão do solicitante ───────────────────────────────────
    const { data: pet } = await supa
      .from('pets')
      .select('user_id')
      .eq('id', pet_id)
      .single();

    const isOwner = pet?.user_id === user.id;

    if (!isOwner) {
      const { data: myMember } = await supa
        .from('pet_members')
        .select('role')
        .eq('pet_id', pet_id)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .not('accepted_at', 'is', null)
        .single();

      if (!myMember || !['co_parent'].includes(myMember.role)) {
        return json({ error: 'Sem permissão para convidar membros' }, 403);
      }
    }

    // ── Gerar token e expiração ───────────────────────────────────────────────
    const token_str = crypto.randomUUID().replace(/-/g, '');
    const expires_at = expires_days
      ? new Date(Date.now() + expires_days * 86_400_000).toISOString()
      : null;

    const finances = can_see_finances !== undefined
      ? can_see_finances
      : role === 'co_parent';

    // ── Criar convite ─────────────────────────────────────────────────────────
    const { error: insertErr } = await supa.from('pet_members').insert({
      pet_id,
      email,
      role,
      nickname: nickname ?? null,
      can_see_finances: finances,
      invited_by: user.id,
      invite_token: token_str,
      invite_sent_at: new Date().toISOString(),
      expires_at,
    });

    if (insertErr) throw insertErr;

    const invite_link = `${APP_URL}/invite/${token_str}`;
    return json({ invite_link, token: token_str });

  } catch (err) {
    console.error('[invite-pet-member]', err);
    return json({ error: 'Erro interno' }, 500);
  }
});
