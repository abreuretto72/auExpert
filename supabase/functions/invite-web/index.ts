/**
 * invite-web — Landing page served when a co-tutor taps an invite link.
 * Fetches invite details via service role (bypasses RLS), renders a
 * mobile-first HTML page, and deep-links into the app via auexpert://invite/TOKEN.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')  ?? '';
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const PLAY_STORE = 'https://play.google.com/store/apps/details?id=com.multiversodigital.auexpert';
const APP_STORE  = 'https://apps.apple.com/app/auexpert/id0000000000'; // placeholder

function buildHtml(token: string, petName: string, inviterName: string, role: string): string {
  const roleLabel =
    role === 'owner'     ? 'Dono'       :
    role === 'co_parent' ? 'Co-tutor'   :
    role === 'caregiver' ? 'Cuidador'   : 'Visualizador';

  const deepLink = `auexpert://invite/${token}`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta name="theme-color" content="#0F1923">
  <title>Convite auExpert</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{height:100%}
    body{background:#0F1923;color:#E8EDF2;font-family:'Segoe UI',Roboto,sans-serif;
         display:flex;flex-direction:column;align-items:center;justify-content:center;
         min-height:100svh;padding:20px 16px 48px}
    .card{background:#162231;border:1px solid #1E3248;border-radius:24px;
          padding:40px 28px;max-width:420px;width:100%;text-align:center}
    .logo{font-size:28px;font-weight:800;margin-bottom:28px;letter-spacing:-0.5px}
    .logo .au{color:#E8EDF2}.logo .expert{color:#E8813A}
    .pet-name{font-size:24px;font-weight:700;color:#E8EDF2;margin-bottom:8px}
    .invite-sub{font-size:14px;color:#8FA3B8;line-height:22px;margin-bottom:28px}
    .invite-sub strong{color:#E8EDF2}
    .role-badge{display:inline-block;background:#E8813A22;color:#E8813A;
                font-size:12px;font-weight:700;padding:4px 14px;border-radius:8px;
                letter-spacing:0.5px;text-transform:uppercase;margin-bottom:28px}
    .btn{display:block;width:100%;background:#E8813A;color:#fff;font-size:17px;
         font-weight:700;padding:16px 0;border-radius:14px;text-decoration:none;
         margin-bottom:14px;border:none;cursor:pointer;text-align:center}
    .btn:active{background:#CC6E2E}
    .btn-secondary{display:block;width:100%;background:#1A2B3D;color:#8FA3B8;
                   font-size:14px;font-weight:600;padding:13px 0;border-radius:14px;
                   text-decoration:none;margin-bottom:10px;border:1px solid #1E3248}
    .divider{border:none;border-top:1px solid #1E3248;margin:20px 0}
    .hint{font-size:11px;color:#5E7A94;margin-top:12px;line-height:17px}
    .spinner{width:32px;height:32px;border:3px solid #1E3248;border-top-color:#E8813A;
             border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 16px}
    @keyframes spin{to{transform:rotate(360deg)}}
    #loading{margin-bottom:8px}
  </style>
</head>
<body>
  <div class="card">
    <div class="logo"><span class="au">au</span><span class="expert">Expert</span></div>

    <div id="loading"><div class="spinner"></div></div>

    <div class="pet-name">${escHtml(petName)}</div>
    <p class="invite-sub">
      <strong>${escHtml(inviterName)}</strong> te convidou para cuidar deste pet.
    </p>
    <div class="role-badge">${escHtml(roleLabel)}</div>

    <a id="accept-btn" href="${escHtml(deepLink)}" class="btn">Aceitar Convite</a>

    <hr class="divider">

    <p style="font-size:12px;color:#5E7A94;margin-bottom:12px">
      Ainda n&atilde;o tem o app? Baixe agora:
    </p>
    <a href="${PLAY_STORE}" class="btn-secondary">Baixar para Android</a>
    <a href="${APP_STORE}"  class="btn-secondary">Baixar para iPhone</a>

    <p class="hint">
      Ao aceitar, voc&ecirc; ter&aacute; acesso ao di&aacute;rio e ao hist&oacute;rico deste pet no auExpert.
    </p>
  </div>

  <script>
    (function(){
      var token = ${JSON.stringify(token)};
      var deepLink = "auexpert://invite/" + token;
      document.getElementById("accept-btn").href = deepLink;
      document.getElementById("loading").style.display = "none";

      // Auto-attempt deep link on page load (works on Android, iOS prompts)
      setTimeout(function(){ window.location.href = deepLink; }, 600);
    })();
  </script>
</body>
</html>`;
}

function escHtml(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function errorHtml(msg: string): string {
  return `<!DOCTYPE html><html lang="pt-BR"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>auExpert</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#0F1923;color:#E8EDF2;font-family:'Segoe UI',Roboto,sans-serif;
       display:flex;align-items:center;justify-content:center;min-height:100svh;padding:20px}
  .card{background:#162231;border:1px solid #1E3248;border-radius:24px;
        padding:40px 28px;max-width:420px;width:100%;text-align:center}
  .logo{font-size:28px;font-weight:800;margin-bottom:24px}
  .au{color:#E8EDF2}.expert{color:#E8813A}
  p{font-size:14px;color:#8FA3B8;line-height:22px}
</style></head><body>
<div class="card">
  <div class="logo"><span class="au">au</span><span class="expert">Expert</span></div>
  <p>${escHtml(msg)}</p>
</div></body></html>`;
}

/**
 * Resolve token via querystring (?token=X) OU path (/invite/X)
 * \u2014 o email do auExpert pode usar qualquer um dos dois formatos.
 */
function extractToken(url: URL): string {
  const qs = url.searchParams.get('token');
  if (qs) return qs;
  // path: /functions/v1/invite-web/<token> OU /invite/<token>
  const parts = url.pathname.split('/').filter(Boolean);
  // pega o \u00faltimo segmento se n\u00e3o for o nome da fun\u00e7\u00e3o
  const last = parts[parts.length - 1];
  if (last && last !== 'invite-web' && last !== 'invite') return last;
  return '';
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const token = extractToken(url);

  if (!token) {
    return new Response(errorHtml('Link inv\u00e1lido ou expirado. Pe\u00e7a um novo convite.'), {
      status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  // 1) Tenta pet_members (legado co-tutor/cuidador)
  let petName = '';
  let inviterId: string | null = null;
  let role = 'co_parent';
  let isAcceptedOrInactive = false;
  let isExpired = false;
  let found = false;

  {
    const { data: pm } = await db
      .from('pet_members')
      .select('role, invited_by, expires_at, is_active, accepted_at, pets(name)')
      .eq('invite_token', token)
      .maybeSingle();
    if (pm) {
      found = true;
      role = pm.role ?? 'co_parent';
      inviterId = pm.invited_by ?? null;
      petName = (pm.pets as { name: string } | null)?.name ?? 'seu pet';
      if (!pm.is_active || pm.accepted_at) isAcceptedOrInactive = true;
      if (pm.expires_at && new Date(pm.expires_at) < new Date()) isExpired = true;
    }
  }

  // 2) Fallback: access_invites (sistema profissional novo \u2014 vet_full/vet_read/co_parent)
  if (!found) {
    const { data: ai } = await db
      .from('access_invites')
      .select('role, invited_by, expires_at, status, accepted_at, pets(name)')
      .eq('token', token)
      .maybeSingle();
    if (ai) {
      found = true;
      role = ai.role ?? 'vet_full';
      inviterId = ai.invited_by ?? null;
      petName = (ai.pets as { name: string } | null)?.name ?? 'seu pet';
      if (ai.status !== 'pending' || ai.accepted_at) isAcceptedOrInactive = true;
      if (ai.expires_at && new Date(ai.expires_at) < new Date()) isExpired = true;
    }
  }

  if (!found) {
    return new Response(errorHtml('Convite n\u00e3o encontrado. Pe\u00e7a um novo convite ao tutor.'), {
      status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
  if (isAcceptedOrInactive) {
    return new Response(errorHtml('Este convite j\u00e1 foi usado ou expirou. Pe\u00e7a um novo convite ao tutor.'), {
      status: 410, headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
  if (isExpired) {
    return new Response(errorHtml('Este convite expirou. Pe\u00e7a um novo convite ao tutor.'), {
      status: 410, headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  let inviterName = 'Tutor';
  if (inviterId) {
    const { data: inviter } = await db
      .from('users')
      .select('full_name, email')
      .eq('id', inviterId)
      .maybeSingle();
    inviterName =
      (inviter as { full_name: string | null; email: string } | null)?.full_name ??
      (inviter as { full_name: string | null; email: string } | null)?.email?.split('@')[0] ??
      'Tutor';
  }

  const html = buildHtml(token, petName, inviterName, role);

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
});
