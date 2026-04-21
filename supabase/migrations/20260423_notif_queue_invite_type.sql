-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: notif_queue_invite_type (Fase 2 · Bloco B · complemento 2.2.4)
-- Projeto: peqpkzituzpwukzusgcq
-- Data: 2026-04-23
-- ═══════════════════════════════════════════════════════════════════════════
-- Expande CHECK de notifications_queue.type para incluir o tipo usado como
-- stub de email de convite profissional: 'professional_invite_email_pending'.
--
-- A Edge Function professional-invite-create (2.2.4) grava uma linha aqui
-- como "intent" de email. Um cron dedicado (2.2.5 real) vai consumir e
-- enviar via Resend/SendGrid. Enquanto o sender real não existe, a linha
-- fica parada aqui e serve de auditoria.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.notifications_queue
  DROP CONSTRAINT notifications_queue_type_check;

ALTER TABLE public.notifications_queue
  ADD CONSTRAINT notifications_queue_type_check CHECK (type IN (
    'vaccine_reminder',
    'diary_reminder',
    'ai_insight',
    'welcome',
    'professional_invite_email_pending'
  ));

COMMIT;
