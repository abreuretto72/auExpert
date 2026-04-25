/**
 * lib/initRemoteErrorReporting.ts
 *
 * Conecta o `errorReporter` (puro, sem deps) ao backend `report-app-error`.
 *
 * Chame uma única vez no boot do app (em app/_layout.tsx). Após isso, todo
 * `reportError(...)` chamado em qualquer lugar do app vai:
 *   1. Logar no console (em __DEV__)
 *   2. Enviar pra Edge Function `report-app-error` via fetch (best-effort)
 *
 * Nunca lança — fetch que falha é engolido. Filosofia: se o reporter quebra
 * a app, é pior que não reportar.
 *
 * Uso típico (em app/_layout.tsx):
 *   import { initRemoteErrorReporting } from '@/lib/initRemoteErrorReporting';
 *   initRemoteErrorReporting();   // idempotente
 */

import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { setErrorSink, type ErrorContext } from './errorReporter';
import { supabase } from './supabase';
import i18n from '../i18n';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
const ENDPOINT = `${SUPABASE_URL}/functions/v1/report-app-error`;

// Estado de rede em cache pra anexar a cada erro sem await
let lastIsOnline: boolean | null = null;
let netInfoSubscribed = false;

function subscribeNetInfo() {
  if (netInfoSubscribed) return;
  netInfoSubscribed = true;
  NetInfo.addEventListener(state => {
    lastIsOnline = state.isConnected ?? null;
  });
  NetInfo.fetch().then(state => { lastIsOnline = state.isConnected ?? null; }).catch(() => {});
}

type Severity = 'info' | 'warning' | 'error' | 'critical';
type Category = 'crash' | 'unhandled' | 'network' | 'ai_failure' |
                'validation' | 'permission' | 'manual_report' | 'other';

interface ReportPayload {
  severity: Severity;
  category: Category;
  message: string;
  stack?: string | null;
  route?: string;
  component?: string;
  app_version?: string;
  platform?: 'ios' | 'android' | 'web';
  os_version?: string;
  device_model?: string;
  locale?: string;
  is_online?: boolean | null;
  user_message?: string;
  pet_id?: string;
  payload?: Record<string, unknown>;
}

/**
 * Mapeia o ErrorContext recebido do reportError para severity/category.
 *
 * Regras:
 *   - context.severity / context.category ganham se passados explicitamente
 *   - boundary='global' → critical/crash
 *   - boundary='section' → error/crash
 *   - sem boundary mas presença de "fetch", "network", "Failed to fetch" no
 *     message → warning/network
 *   - default → error/other
 */
function inferSeverityCategory(error: unknown, ctx: ErrorContext): { severity: Severity; category: Category } {
  const explicitSev = ctx.severity as Severity | undefined;
  const explicitCat = ctx.category as Category | undefined;
  if (explicitSev && explicitCat) return { severity: explicitSev, category: explicitCat };

  const msg = error instanceof Error ? error.message : String(error ?? '');
  const lowerMsg = msg.toLowerCase();

  if (ctx.boundary === 'global') {
    return { severity: explicitSev ?? 'critical', category: explicitCat ?? 'crash' };
  }
  if (ctx.boundary === 'section') {
    return { severity: explicitSev ?? 'error', category: explicitCat ?? 'crash' };
  }
  if (lowerMsg.includes('network') || lowerMsg.includes('failed to fetch') || lowerMsg.includes('timeout')) {
    return { severity: explicitSev ?? 'warning', category: explicitCat ?? 'network' };
  }
  return { severity: explicitSev ?? 'error', category: explicitCat ?? 'other' };
}

function serializeError(error: unknown): { message: string; stack: string | null } {
  if (error instanceof Error) {
    return { message: error.message ?? error.name ?? 'Error', stack: error.stack ?? null };
  }
  if (typeof error === 'string') return { message: error, stack: null };
  try {
    return { message: JSON.stringify(error).slice(0, 500), stack: null };
  } catch {
    return { message: String(error), stack: null };
  }
}

async function buildPayload(error: unknown, ctx: ErrorContext): Promise<ReportPayload> {
  const { severity, category } = inferSeverityCategory(error, ctx);
  const { message, stack } = serializeError(error);

  return {
    severity,
    category,
    message,
    stack,
    route:        typeof ctx.route === 'string' ? ctx.route : undefined,
    component:    typeof ctx.section === 'string' ? ctx.section : (typeof ctx.component === 'string' ? ctx.component : undefined),
    app_version:  Application.nativeApplicationVersion ?? undefined,
    platform:     (Platform.OS === 'ios' || Platform.OS === 'android' || Platform.OS === 'web') ? Platform.OS : undefined,
    os_version:   String(Platform.Version),
    device_model: Device.modelName ?? undefined,
    locale:       i18n.language,
    is_online:    lastIsOnline,
    user_message: typeof ctx.userMessage === 'string' ? ctx.userMessage : undefined,
    pet_id:       typeof ctx.petId === 'string' ? ctx.petId : undefined,
    payload:      {
      ...(typeof ctx.componentStack === 'string' ? { componentStack: ctx.componentStack.slice(0, 4000) } : {}),
      ...(ctx.extra && typeof ctx.extra === 'object' ? { extra: ctx.extra } : {}),
    },
  };
}

let initialized = false;
let unhandledRejectionListener: ((event: Event) => void) | null = null;

/**
 * Inicializa reporting remoto. Idempotente — chamadas adicionais são no-op.
 */
export function initRemoteErrorReporting(): void {
  if (initialized) return;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('[initRemoteErrorReporting] EXPO_PUBLIC_SUPABASE_URL/ANON_KEY ausentes — fica em modo console-only');
    return;
  }
  initialized = true;

  subscribeNetInfo();

  setErrorSink(async (error, ctx) => {
    // Console em dev pra não perder visibilidade local
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error('[errorReporter:remote]', error, ctx);
    }

    try {
      const payload = await buildPayload(error, ctx);
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token;

      // Fire-and-forget — nunca await na sink crítica do app
      fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      }).catch(() => {
        // Ignora erro de envio — não quebra a UX do tutor
      });
    } catch {
      // ignore — sink nunca lança
    }
  });

  // Captura rejections não-tratadas globais (web e RN com Hermes)
  if (typeof globalThis !== 'undefined') {
    const handler = (event: Event) => {
      try {
        // RN + Hermes: globalThis.HermesInternal?.enablePromiseRejectionTracker
        // Web: window.onunhandledrejection com event.reason
        const reason = (event as unknown as { reason?: unknown }).reason ?? event;
        // Importa lazy pra evitar circular
        // (errorReporter já foi importado, então OK)
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { reportError } = require('./errorReporter');
        reportError(reason, { boundary: 'global', category: 'unhandled', severity: 'error' });
      } catch {
        // ignore
      }
    };
    unhandledRejectionListener = handler;
    if (typeof (globalThis as { addEventListener?: unknown }).addEventListener === 'function') {
      (globalThis as unknown as { addEventListener: (e: string, h: (ev: Event) => void) => void })
        .addEventListener('unhandledrejection', handler);
    }
  }
}

/**
 * Helper opcional para reportar erros de IA percebidos pelo tutor.
 * Use no catch de chamadas a Edge Functions de IA quando o erro chegou
 * a ser EXIBIDO pro tutor (não apenas técnico).
 */
export async function reportAiFailureSeenByTutor(opts: {
  function_name: string;
  error: unknown;
  pet_id?: string;
  user_facing_message?: string;
  route?: string;
}): Promise<void> {
  // Importa de forma lazy pra evitar cycle
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { reportError } = require('./errorReporter') as typeof import('./errorReporter');
  reportError(opts.error, {
    severity: 'warning',
    category: 'ai_failure',
    section: opts.function_name,
    petId: opts.pet_id,
    route: opts.route,
    userMessage: opts.user_facing_message,
  });
}

/**
 * Reporta um feedback manual escrito pelo tutor (botão "Reportar problema").
 */
export async function reportManualFeedback(opts: {
  message: string;
  user_message: string;
  pet_id?: string;
  route?: string;
  screenshot_url?: string;
}): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { reportError } = require('./errorReporter') as typeof import('./errorReporter');
  reportError(new Error(opts.message), {
    severity: 'info',
    category: 'manual_report',
    userMessage: opts.user_message,
    petId: opts.pet_id,
    route: opts.route,
    extra: { screenshot_url: opts.screenshot_url },
  });
}
