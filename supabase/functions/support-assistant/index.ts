/**
 * support-assistant — Chat de suporte do auExpert.
 *
 * Recebe mensagem do tutor + conversation_id (cria nova se não veio).
 * IA responde sobre o APP (FAQ, navegação, problemas conhecidos) — NÃO sobre
 * saúde do pet (pet-assistant cuida disso).
 *
 * Quando o tutor pede explicitamente "falar com humano" ou IA detecta que
 * não consegue ajudar, marca escalated_to_human=true → o admin recebe push
 * e responde via página /support do admin web.
 *
 * Uma vez escalated_to_human=true OU ia_active=false, esta EF retorna
 * { queued: true } sem chamar a IA — o admin assume.
 *
 * POST body:
 *   {
 *     conversation_id?: string,    // se omitido, cria nova conversa
 *     message: string,             // texto do tutor
 *     pet_id?: string,             // contexto (opcional)
 *     app_version?: string,
 *     platform?: 'ios'|'android'|'web',
 *     locale?: string
 *   }
 *
 * Resp:
 *   {
 *     conversation_id: string,
 *     reply: string | null,        // null se queued (IA não respondeu)
 *     escalated: boolean,          // true se foi escalado pra admin
 *     queued: boolean,             // true se IA já estava off ou foi escalada
 *     ia_active: boolean
 *   }
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getAIConfig } from '../_shared/ai-config.ts';
import {
  recordAiInvocation,
  categorizeError,
  statusFromCategory,
} from '../_shared/recordAiInvocation.ts';
import { extractAnthropicUsage } from '../_shared/extractAnthropicUsage.ts';
import { SUPPORT_KNOWLEDGE_BASE } from '../_shared/supportKnowledgeBase.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LANG_NAMES: Record<string, string> = {
  'pt-BR': 'Brazilian Portuguese', 'pt': 'Brazilian Portuguese',
  'en': 'English', 'en-US': 'English',
  'es': 'Spanish', 'es-MX': 'Spanish (Mexico)', 'es-AR': 'Spanish (Argentina)',
  'fr': 'French', 'de': 'German',
};

// Frases que disparam handoff humano
const ESCALATION_TRIGGERS = [
  'falar com humano', 'falar com pessoa', 'atendente', 'atendimento humano',
  'atendente humano', 'pessoa de verdade',
  'speak to human', 'talk to human', 'real person', 'speak to a person',
  'human support', 'human agent',
  'persona real', 'hablar con humano', 'agente humano',
];

function detectEscalationRequest(message: string): boolean {
  const lower = message.toLowerCase();
  return ESCALATION_TRIGGERS.some(t => lower.includes(t));
}

function jsonResp(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return jsonResp({ error: 'method not allowed' }, 405);

  const t0 = Date.now();
  const ctx: {
    user_id: string | null;
    conversation_id: string | null;
    model_used: string | null;
  } = { user_id: null, conversation_id: null, model_used: null };
  const telemetryClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // ── Auth obrigatório ───────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return jsonResp({ error: 'unauthorized' }, 401);
    const token = authHeader.replace('Bearer ', '');
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { user } } = await anonClient.auth.getUser(token);
    if (!user) return jsonResp({ error: 'unauthorized' }, 401);
    ctx.user_id = user.id;

    // ── Body ──────────────────────────────────────────────────────────────
    const body = await req.json().catch(() => ({}));
    let {
      conversation_id, message, pet_id,
      app_version, platform, locale = 'pt-BR',
    } = body as Record<string, unknown>;

    if (typeof message !== 'string' || message.trim().length === 0) {
      return jsonResp({ error: 'message required' }, 400);
    }
    message = message.trim();

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── Conversation existente ou nova ────────────────────────────────────
    let conversation;
    if (typeof conversation_id === 'string' && conversation_id) {
      const { data, error } = await sb
        .from('support_conversations')
        .select('id, user_id, status, ia_active, escalated_to_human, message_count, locale')
        .eq('id', conversation_id)
        .eq('user_id', user.id)
        .single();
      if (error || !data) return jsonResp({ error: 'conversation not found' }, 404);
      conversation = data;
    } else {
      const { data, error } = await sb
        .from('support_conversations')
        .insert({
          user_id:     user.id,
          status:      'open',
          ia_active:   true,
          locale:      typeof locale === 'string' ? locale : 'pt-BR',
          app_version: typeof app_version === 'string' ? app_version : null,
          platform:    typeof platform === 'string' ? platform : null,
        })
        .select('id, user_id, status, ia_active, escalated_to_human, message_count, locale')
        .single();
      if (error || !data) return jsonResp({ error: 'failed to create conversation', details: error?.message }, 500);
      conversation = data;
    }
    ctx.conversation_id = conversation.id;

    // ── Salva mensagem do tutor ───────────────────────────────────────────
    await sb.from('support_messages').insert({
      conversation_id: conversation.id,
      sender:          'user',
      sender_user_id:  user.id,
      content:         (message as string).slice(0, 4000),
      read_by_user:    true,
      read_by_admin:   false,
    });

    // ── Detecta pedido explícito de humano OU já escalada ─────────────────
    const userWantsHuman = detectEscalationRequest(message as string);

    if (userWantsHuman && !conversation.escalated_to_human) {
      await sb.from('support_conversations').update({
        escalated_to_human: true,
        escalated_at:       new Date().toISOString(),
        ia_active:          false,
      }).eq('id', conversation.id);

      // Mensagem automática informando que humano foi acionado
      const handoffReply = (conversation.locale ?? 'pt-BR').startsWith('pt')
        ? 'Sua solicitação foi encaminhada à equipe de suporte humano. Você receberá uma resposta em breve.'
        : 'Your request was forwarded to the human support team. You\'ll receive a reply shortly.';

      await sb.from('support_messages').insert({
        conversation_id: conversation.id,
        sender:          'ai',
        content:         handoffReply,
        read_by_user:    false,
      });

      return jsonResp({
        conversation_id: conversation.id,
        reply:           handoffReply,
        escalated:       true,
        queued:          true,
        ia_active:       false,
      });
    }

    // Se IA já está off (admin assumiu antes), só queue
    if (!conversation.ia_active || conversation.escalated_to_human) {
      return jsonResp({
        conversation_id: conversation.id,
        reply:           null,
        escalated:       conversation.escalated_to_human,
        queued:          true,
        ia_active:       false,
      });
    }

    // ── Busca histórico (últimas 12 mensagens) ─────────────────────────────
    const { data: history } = await sb
      .from('support_messages')
      .select('sender, content')
      .eq('conversation_id', conversation.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(12);

    const messages = (history ?? []).reverse().map(m => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.content,
    }));

    // ── Prompt sistema em 2 blocos: KB cacheável + diretivas dinâmicas ────
    const lang = LANG_NAMES[(conversation.locale ?? 'pt-BR') as string]
              ?? LANG_NAMES[String(conversation.locale ?? 'pt-BR').split('-')[0]]
              ?? 'Brazilian Portuguese';

    // Bloco 1: KB completa do app (cacheável — 5min ephemeral, hit em ~10% custo).
    // Bloco 2: diretivas dinâmicas (idioma do tutor + escalation rules).
    // Ambos juntos formam o system prompt da Anthropic Messages API.
    const systemBlocks = [
      {
        type: 'text' as const,
        text: SUPPORT_KNOWLEDGE_BASE,
        cache_control: { type: 'ephemeral' as const },
      },
      {
        type: 'text' as const,
        text: `## DIRETIVAS DE RESPOSTA (variáveis)

- Responda OBRIGATORIAMENTE em ${lang}.
- Use a knowledge base acima como fonte única de verdade sobre o app.
- Tom: registro Elite (3ª pessoa ou impessoal, frases curtas, imperativo polido, SEM "!", SEM onomatopeia, SEM markdown).
- Concisão: 2-4 frases na maioria; passo-a-passo numerado quando o tutor pediu "como fazer".
- Se a pergunta foge do escopo do app (saúde do pet, conselho veterinário): redirecione.
- Se você não tem a resposta na knowledge base, diga "Não tenho essa informação confirmada — posso encaminhar para a equipe humana?".
- Se o tutor demonstrar frustração ou pedir explicitamente humano, sugira: "Posso encaminhar para a equipe humana?" — a EF processa o pedido.
- NUNCA invente recursos, telas, fluxos ou rotas que não estão na knowledge base.
- Resposta = só o texto do assistente. Sem JSON, sem code fences.`,
      },
    ];

    const cfg = await getAIConfig(sb);
    ctx.model_used = cfg.model_chat;

    // ── Chamada Anthropic ─────────────────────────────────────────────────
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         ANTHROPIC_API_KEY,
        'anthropic-version': cfg.anthropic_version,
      },
      body: JSON.stringify({
        model:      cfg.model_chat,
        max_tokens: 600,
        system:     systemBlocks,
        messages,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('[support-assistant] Anthropic error:', response.status, errBody);

      const cat = response.status === 429 ? 'quota_exceeded'
                : response.status === 401 || response.status === 403 ? 'auth_error'
                : response.status >= 500 ? 'api_error' : 'validation_error';
      recordAiInvocation(telemetryClient, {
        function_name: 'support-assistant',
        user_id: ctx.user_id, provider: 'anthropic',
        model_used: ctx.model_used, latency_ms: Date.now() - t0,
        status: statusFromCategory(cat), error_category: cat,
        error_message: `HTTP ${response.status} — ${errBody.slice(0, 500)}`,
        payload: { conversation_id: ctx.conversation_id, http_status: response.status },
      }).catch(() => {});

      // Salva mensagem de fallback explicando que IA falhou
      const fallbackMsg = (conversation.locale ?? 'pt-BR').startsWith('pt')
        ? 'Não foi possível processar agora. Tentando novamente em instantes — ou peça para falar com a equipe humana.'
        : 'Could not process right now. Try again in a moment — or ask to speak with the human team.';

      await sb.from('support_messages').insert({
        conversation_id: conversation.id,
        sender:          'ai',
        content:         fallbackMsg,
      });

      return jsonResp({
        conversation_id: conversation.id,
        reply:           fallbackMsg,
        escalated:       false,
        queued:          false,
        ia_active:       true,
      });
    }

    const aiResponse = await response.json();
    const textContent = aiResponse.content?.find((c: { type: string }) => c.type === 'text');
    const reply: string = (textContent?.text ?? '').trim();

    // Telemetria — sucesso
    const usage = extractAnthropicUsage(aiResponse);
    recordAiInvocation(telemetryClient, {
      function_name: 'support-assistant',
      user_id: ctx.user_id, provider: 'anthropic',
      model_used: usage.model ?? ctx.model_used,
      tokens_in: usage.tokens_in, tokens_out: usage.tokens_out,
      cache_read_tokens: usage.cache_read_tokens, cache_write_tokens: usage.cache_write_tokens,
      latency_ms: Date.now() - t0, status: 'success',
      payload: { conversation_id: ctx.conversation_id, history_len: messages.length },
    }).catch(() => {});

    // Salva resposta da IA
    await sb.from('support_messages').insert({
      conversation_id: conversation.id,
      sender:          'ai',
      content:         reply || '...',
      ai_model:        usage.model ?? ctx.model_used,
      ai_tokens_in:    usage.tokens_in,
      ai_tokens_out:   usage.tokens_out,
    });

    // Subject auto-gerado na 1ª mensagem (resumo curto da query do user)
    if (conversation.message_count === 0) {
      const subject = (message as string).slice(0, 80);
      await sb.from('support_conversations').update({ subject }).eq('id', conversation.id);
    }

    return jsonResp({
      conversation_id: conversation.id,
      reply,
      escalated: false,
      queued:    false,
      ia_active: true,
    });

  } catch (err) {
    console.error('[support-assistant] error:', err);

    const cat = categorizeError(err);
    recordAiInvocation(telemetryClient, {
      function_name: 'support-assistant',
      user_id: ctx.user_id, provider: 'anthropic',
      model_used: ctx.model_used, latency_ms: Date.now() - t0,
      status: statusFromCategory(cat), error_category: cat,
      error_message: String(err).slice(0, 1000),
      payload: { conversation_id: ctx.conversation_id },
    }).catch(() => {});

    return jsonResp({ error: 'internal error', message: String(err) }, 500);
  }
});
