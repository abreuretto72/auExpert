-- Migration 034 — Sistema de co-tutoria (pet_members)
-- Criado em: 2026-04-03

-- ── Tabela principal ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pet_members (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id           UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  user_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  role             VARCHAR(20) NOT NULL DEFAULT 'co_parent'
                   CHECK (role IN ('owner','co_parent','caregiver','viewer')),
  nickname         VARCHAR(50),
  email            VARCHAR(255),
  invited_by       UUID REFERENCES auth.users(id),
  can_see_finances BOOLEAN NOT NULL DEFAULT FALSE,
  invite_token     VARCHAR(100) UNIQUE,
  invite_sent_at   TIMESTAMPTZ,
  accepted_at      TIMESTAMPTZ,
  expires_at       TIMESTAMPTZ,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pet_members_pet  ON pet_members(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_members_user ON pet_members(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pet_members_token
  ON pet_members(invite_token) WHERE invite_token IS NOT NULL;

ALTER TABLE pet_members ENABLE ROW LEVEL SECURITY;

-- RLS: owner do pet gerencia todos
CREATE POLICY pet_members_owner ON pet_members
  FOR ALL
  USING (pet_id IN (SELECT id FROM pets WHERE user_id = auth.uid()));

-- RLS: membros veem outros membros do mesmo pet
CREATE POLICY pet_members_self ON pet_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR pet_id IN (
      SELECT pet_id FROM pet_members pm2
      WHERE pm2.user_id = auth.uid() AND pm2.is_active = TRUE
    )
  );

-- RLS: membros aceitam seu próprio convite
CREATE POLICY pet_members_accept ON pet_members
  FOR UPDATE
  USING (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (true);

-- ── diary_entries: coluna registered_by + RLS atualizado ──────────────────────

ALTER TABLE diary_entries
  ADD COLUMN IF NOT EXISTS registered_by UUID REFERENCES auth.users(id);

DROP POLICY IF EXISTS diary_select ON diary_entries;
DROP POLICY IF EXISTS diary_insert ON diary_entries;
DROP POLICY IF EXISTS diary_update ON diary_entries;
DROP POLICY IF EXISTS diary_delete ON diary_entries;

CREATE POLICY diary_select ON diary_entries
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR pet_id IN (
      SELECT pet_id FROM pet_members
      WHERE user_id = auth.uid()
        AND is_active = TRUE
        AND accepted_at IS NOT NULL
        AND (expires_at IS NULL OR expires_at > NOW())
    )
  );

CREATE POLICY diary_insert ON diary_entries
  FOR INSERT
  WITH CHECK (
    pet_id IN (SELECT id FROM pets WHERE user_id = auth.uid())
    OR pet_id IN (
      SELECT pet_id FROM pet_members
      WHERE user_id = auth.uid()
        AND is_active = TRUE
        AND accepted_at IS NOT NULL
        AND (expires_at IS NULL OR expires_at > NOW())
        AND role IN ('co_parent', 'caregiver')
    )
  );

CREATE POLICY diary_update ON diary_entries
  FOR UPDATE
  USING (
    auth.uid() = user_id
    OR pet_id IN (
      SELECT pet_id FROM pet_members
      WHERE user_id = auth.uid()
        AND is_active = TRUE
        AND accepted_at IS NOT NULL
        AND (expires_at IS NULL OR expires_at > NOW())
        AND role IN ('co_parent', 'caregiver')
    )
  );

CREATE POLICY diary_delete ON diary_entries
  FOR DELETE
  USING (auth.uid() = user_id);

-- ── pets: RLS SELECT inclui membros ──────────────────────────────────────────

DROP POLICY IF EXISTS pets_select ON pets;

CREATE POLICY pets_select ON pets
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR id IN (
      SELECT pet_id FROM pet_members
      WHERE user_id = auth.uid()
        AND is_active = TRUE
        AND accepted_at IS NOT NULL
        AND (expires_at IS NULL OR expires_at > NOW())
    )
  );
