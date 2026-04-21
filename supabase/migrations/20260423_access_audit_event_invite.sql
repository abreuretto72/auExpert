-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: access_audit_event_invite (Fase 2 · Bloco B · complemento 2.2.4)
-- Projeto: peqpkzituzpwukzusgcq
-- Data: 2026-04-23
-- ═══════════════════════════════════════════════════════════════════════════
-- Expande CHECK de access_audit_log.event_type para incluir eventos do ciclo
-- de vida de convite (access_invites). Necessário porque a Edge Function
-- professional-invite-create (2.2.4) grava event_type='invite_created'.
--
-- Adiciona preventivamente os eventos do Bloco C (accept/decline/cancel/expire)
-- pra evitar ALTER TABLE de novo no próximo sub-passo.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.access_audit_log
  DROP CONSTRAINT access_audit_log_event_type_check;

ALTER TABLE public.access_audit_log
  ADD CONSTRAINT access_audit_log_event_type_check CHECK (event_type IN (
    -- Fase 1 (grants)
    'grant_created',
    'grant_accepted',
    'grant_rejected',
    'grant_revoked',
    'grant_expired',
    -- Fase 2 Bloco A (leitura clínica)
    'clinical_read',
    'clinical_write',
    'clinical_sign',
    'diary_read',
    'diary_write',
    'export_pdf',
    -- Fase 2 Bloco B/C (convites)
    'invite_created',
    'invite_accepted',
    'invite_declined',
    'invite_cancelled',
    'invite_expired'
  ));

COMMIT;
