/**
 * send-invite-email — envia email de convite de parceria via SMTP do auExpert.
 *
 * Por que existe: a EF `send-queue-notifications` envia APENAS push via Expo.
 * Convite de profissional vai pra um email que ainda não tem conta no app —
 * sem expo_push_token, o worker antigo apenas marcava como `sent_at` e descartava.
 *
 * Esta EF puxa direto de `access_invites` (não da queue) e usa SMTP do auExpert
 * (smtp.auexpert.com.br:465 SSL) com credenciais do vault.
 *
 * POST body:
 *   { invite_id?: string, process_pending?: boolean, admin_token?: string }
 *
 *   - invite_id: envia pra um convite específico
 *   - process_pending: processa todos pending sem email_sent_at (CRON)
 *   - admin_token: KB_SECRET (CRON/admin). Sem token, exige JWT do tutor que convidou.
 *
 * Marca `access_invites.email_sent_at` quando sucesso, `email_error` em falha.
 *
 * verify_jwt: false (auth manual).
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const KB_SECRET = Deno.env.get('KB_SECRET') ?? '';
// Link de aceitar convite — aponta pra Edge Function `invite-web`
// (que faz lookup em pet_members + access_invites e deep-linka pro app via auexpert://invite/TOKEN).
// Substitui a URL antiga `https://auexpert.com.br/invite/{token}` que dava 404 (landing não tem essa rota).
const INVITE_URL_BASE = Deno.env.get('INVITE_URL_BASE')
  ?? 'https://peqpkzituzpwukzusgcq.supabase.co/functions/v1/invite-web';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResp(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

let cachedSmtp: SmtpConfig | null = null;

async function getSmtpConfig(sb: ReturnType<typeof createClient>): Promise<SmtpConfig> {
  if (cachedSmtp) return cachedSmtp;
  const { data, error } = await sb.from('vault.decrypted_secrets')
    .select('name, decrypted_secret')
    .in('name', ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from']);
  if (error) {
    // Fallback: query direta via RPC
    const { data: rows } = await sb.rpc('exec_sql', { sql: '' }).catch(() => ({ data: null }));
    throw new Error(`smtp config read failed: ${error.message}`);
  }
  const map = new Map<string, string>();
  (data ?? []).forEach((row: Record<string, unknown>) => {
    map.set(String(row.name), String(row.decrypted_secret));
  });
  cachedSmtp = {
    host: map.get('smtp_host') ?? '',
    port: parseInt(map.get('smtp_port') ?? '465', 10),
    user: map.get('smtp_user') ?? '',
    pass: map.get('smtp_pass') ?? '',
    from: map.get('smtp_from') ?? map.get('smtp_user') ?? '',
  };
  if (!cachedSmtp.host || !cachedSmtp.user || !cachedSmtp.pass) {
    throw new Error('smtp credentials incomplete');
  }
  return cachedSmtp;
}

interface InviteData {
  id: string;
  invite_email: string;
  role: string;
  token: string;
  expires_at: string;
  pet_id: string;
  pet_name: string;
  inviter_name: string | null;
  inviter_email: string;
}

function buildEmail(invite: InviteData): { subject: string; html: string; text: string } {
  const link = `${INVITE_URL_BASE}?token=${encodeURIComponent(invite.token)}`;
  const expiresStr = new Date(invite.expires_at).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
  const inviterDisplay = invite.inviter_name || invite.inviter_email;
  const roleLabel = invite.role === 'vet_full' ? 'Veterinário (acesso total)'
    : invite.role === 'vet_read' ? 'Veterinário (leitura)'
    : invite.role === 'co_parent' ? 'Co-tutor'
    : invite.role;

  const subject = `${inviterDisplay} convidou você para acompanhar ${invite.pet_name} no auExpert`;

  const text = `Olá,

${inviterDisplay} (${invite.inviter_email}) convidou você para acompanhar o pet ${invite.pet_name} no auExpert como ${roleLabel}.

Para aceitar, abra o link abaixo no app ou no navegador:

${link}

O convite expira em ${expiresStr}.

Se você não esperava este convite, ignore este email.

—
auExpert
Uma inteligência única para o seu pet
`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#0F1923;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0F1923;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#162231;border-radius:18px;overflow:hidden;">
        <tr><td style="padding:32px 32px 24px 32px;border-bottom:1px solid #1E3248;">
          <div style="font-size:20px;font-weight:700;color:#E8EDF2;letter-spacing:-0.3px;">au<span style="color:#8F7FA8;">Expert</span></div>
          <div style="font-size:11px;color:#8FA3B8;margin-top:4px;letter-spacing:0.5px;">Uma inteligência única para o seu pet</div>
        </td></tr>
        <tr><td style="padding:32px;">
          <div style="font-size:18px;font-weight:600;color:#E8EDF2;margin-bottom:16px;">Você foi convidado para acompanhar ${escapeHtml(invite.pet_name)}</div>
          <div style="font-size:14px;color:#8FA3B8;line-height:1.6;margin-bottom:24px;">
            <strong style="color:#E8EDF2;">${escapeHtml(inviterDisplay)}</strong> (${escapeHtml(invite.inviter_email)}) convidou você para o auExpert como <strong style="color:#8F7FA8;">${escapeHtml(roleLabel)}</strong>.
          </div>
          <div style="background:#1A2B3D;border-radius:12px;padding:20px;margin-bottom:24px;">
            <div style="font-size:11px;color:#5E7A94;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">Pet</div>
            <div style="font-size:16px;color:#E8EDF2;font-weight:600;margin-bottom:12px;">${escapeHtml(invite.pet_name)}</div>
            <div style="font-size:11px;color:#5E7A94;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">Acesso concedido</div>
            <div style="font-size:14px;color:#E8EDF2;">${escapeHtml(roleLabel)}</div>
          </div>
          <div style="text-align:center;margin:32px 0;">
            <a href="${link}" style="display:inline-block;background:#8F7FA8;color:#FFFFFF;text-decoration:none;padding:14px 32px;border-radius:14px;font-weight:600;font-size:15px;">Aceitar convite</a>
          </div>
          <div style="font-size:12px;color:#5E7A94;text-align:center;line-height:1.6;">
            O convite expira em <strong style="color:#8FA3B8;">${expiresStr}</strong>.<br>
            Se você não esperava este convite, ignore este email.
          </div>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #1E3248;text-align:center;">
          <div style="font-size:10px;color:#5E7A94;letter-spacing:0.5px;">auExpert · auExpert</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

async function sendOne(
  sb: ReturnType<typeof createClient>,
  smtp: SmtpConfig,
  invite: InviteData,
): Promise<{ ok: boolean; error?: string }> {
  const client = new SMTPClient({
    connection: {
      hostname: smtp.host,
      port: smtp.port,
      tls: true,  // SSL na 465
      auth: { username: smtp.user, password: smtp.pass },
    },
  });
  try {
    const { subject, html, text } = buildEmail(invite);
    await client.send({
      from: `auExpert <${smtp.from}>`,
      to: invite.invite_email,
      subject,
      content: text,
      html,
    });
    await client.close();
    await sb.from('access_invites').update({
      email_sent_at: new Date().toISOString(),
      email_error: null,
      email_attempts: 1,
    }).eq('id', invite.id);
    return { ok: true };
  } catch (err) {
    try { await client.close(); } catch { /* noop */ }
    const errMsg = String(err).slice(0, 500);
    await sb.from('access_invites').update({
      email_error: errMsg,
      email_attempts: (await sb.from('access_invites').select('email_attempts').eq('id', invite.id).single()).data?.email_attempts ?? 0 + 1,
    }).eq('id', invite.id);
    return { ok: false, error: errMsg };
  }
}

async function loadInvite(
  sb: ReturnType<typeof createClient>,
  inviteId: string,
): Promise<InviteData | null> {
  const { data: i } = await sb.from('access_invites')
    .select('id, invite_email, role, token, expires_at, pet_id, invited_by')
    .eq('id', inviteId)
    .maybeSingle();
  if (!i) return null;
  const invite = i as Record<string, unknown>;
  const { data: pet } = await sb.from('pets')
    .select('name').eq('id', invite.pet_id as string).maybeSingle();
  const { data: user } = await sb.from('users')
    .select('email, full_name').eq('id', invite.invited_by as string).maybeSingle();
  return {
    id:            invite.id as string,
    invite_email:  invite.invite_email as string,
    role:          invite.role as string,
    token:         invite.token as string,
    expires_at:    invite.expires_at as string,
    pet_id:        invite.pet_id as string,
    pet_name:      (pet?.name as string) ?? 'seu pet',
    inviter_name:  (user?.full_name as string) ?? null,
    inviter_email: (user?.email as string) ?? '',
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return jsonResp({ error: 'method not allowed' }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const inviteId = body.invite_id ? String(body.invite_id) : null;
    const processPending = body.process_pending === true;
    const adminToken = body.admin_token ? String(body.admin_token) : null;

    // Auth: admin_token OU JWT (vamos validar ownership pelo invited_by abaixo)
    let isAuthed = false;
    let authedUserId: string | null = null;
    if (KB_SECRET && adminToken && adminToken === KB_SECRET) {
      isAuthed = true;
    } else {
      const auth = req.headers.get('Authorization');
      if (auth?.startsWith('Bearer ')) {
        const token = auth.replace('Bearer ', '');
        const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const { data: { user } } = await anon.auth.getUser(token);
        if (user) { isAuthed = true; authedUserId = user.id; }
      }
    }
    if (!isAuthed) return jsonResp({ error: 'unauthorized' }, 401);

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Carrega SMTP do vault via RPC dedicada (rls bloqueia query direta em vault.*)
    const { data: secretsRaw } = await sb.rpc('get_smtp_config').catch(() => ({ data: null }));
    let smtp: SmtpConfig;
    if (secretsRaw) {
      const m = secretsRaw as Record<string, string>;
      smtp = { host: m.smtp_host, port: parseInt(m.smtp_port, 10), user: m.smtp_user, pass: m.smtp_pass, from: m.smtp_from };
    } else {
      // Fallback: env vars
      smtp = {
        host: Deno.env.get('SMTP_HOST') ?? '',
        port: parseInt(Deno.env.get('SMTP_PORT') ?? '465', 10),
        user: Deno.env.get('SMTP_USER') ?? '',
        pass: Deno.env.get('SMTP_PASS') ?? '',
        from: Deno.env.get('SMTP_FROM') ?? Deno.env.get('SMTP_USER') ?? '',
      };
    }
    if (!smtp.host || !smtp.user || !smtp.pass) {
      return jsonResp({ error: 'smtp config missing — set vault secrets smtp_host/port/user/pass/from' }, 500);
    }

    const results: Array<{ id: string; ok: boolean; error?: string }> = [];

    if (inviteId) {
      const invite = await loadInvite(sb, inviteId);
      if (!invite) return jsonResp({ error: 'invite not found' }, 404);
      // Se JWT, valida ownership
      if (authedUserId) {
        const { data: ownerCheck } = await sb.from('access_invites')
          .select('invited_by').eq('id', inviteId).maybeSingle();
        if (ownerCheck?.invited_by !== authedUserId) {
          return jsonResp({ error: 'not invite owner' }, 403);
        }
      }
      const r = await sendOne(sb, smtp, invite);
      results.push({ id: inviteId, ...r });
    } else if (processPending) {
      // Processa todos pendentes (CRON)
      const { data: pending } = await sb.from('access_invites')
        .select('id')
        .is('email_sent_at', null)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .lt('email_attempts', 3)
        .order('created_at', { ascending: true })
        .limit(50);
      for (const p of (pending ?? []) as Array<{ id: string }>) {
        const invite = await loadInvite(sb, p.id);
        if (!invite) continue;
        const r = await sendOne(sb, smtp, invite);
        results.push({ id: p.id, ...r });
      }
    } else {
      return jsonResp({ error: 'invite_id or process_pending required' }, 400);
    }

    const sent = results.filter(r => r.ok).length;
    const failed = results.length - sent;
    return jsonResp({ success: true, total: results.length, sent, failed, results });
  } catch (err) {
    console.error('[send-invite-email] error:', err);
    return jsonResp({ error: 'internal error', message: String(err) }, 500);
  }
});
