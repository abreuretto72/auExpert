-- Migration 006: Triggers
-- auExpert MVP

-- ══════════════════════════════════════
-- 1. AUTO-UPDATE updated_at
-- ══════════════════════════════════════
CREATE OR REPLACE FUNCTION trg_fn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();

CREATE TRIGGER trg_pets_updated_at
  BEFORE UPDATE ON pets
  FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();

-- ══════════════════════════════════════
-- 2. AUTO-UPDATE health_score quando vacinas/alergias mudam
-- ══════════════════════════════════════
CREATE OR REPLACE FUNCTION trg_fn_update_health_score()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_pet_id UUID;
BEGIN
  -- Determinar pet_id dependendo da operação
  IF TG_OP = 'DELETE' THEN
    v_pet_id := OLD.pet_id;
  ELSE
    v_pet_id := NEW.pet_id;
  END IF;

  UPDATE pets
  SET health_score = fn_calculate_health_score(v_pet_id)
  WHERE id = v_pet_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_vaccines_health_score
  AFTER INSERT OR UPDATE OR DELETE ON vaccines
  FOR EACH ROW EXECUTE FUNCTION trg_fn_update_health_score();

CREATE TRIGGER trg_allergies_health_score
  AFTER INSERT OR UPDATE OR DELETE ON allergies
  FOR EACH ROW EXECUTE FUNCTION trg_fn_update_health_score();

-- ══════════════════════════════════════
-- 3. AUTO-UPDATE happiness_score quando mood_logs muda
-- ══════════════════════════════════════
CREATE OR REPLACE FUNCTION trg_fn_update_happiness_score()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE pets
  SET happiness_score = fn_calculate_happiness(NEW.pet_id, 30)
  WHERE id = NEW.pet_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_mood_happiness_score
  AFTER INSERT ON mood_logs
  FOR EACH ROW EXECUTE FUNCTION trg_fn_update_happiness_score();

-- ══════════════════════════════════════
-- 4. AUTO-UPDATE current_mood do pet via diary
-- ══════════════════════════════════════
CREATE OR REPLACE FUNCTION trg_fn_update_pet_mood_from_diary()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE pets
  SET current_mood = NEW.mood_id
  WHERE id = NEW.pet_id;

  -- Auto-log mood from diary
  INSERT INTO mood_logs (pet_id, user_id, mood_id, score, source)
  SELECT NEW.pet_id, NEW.user_id, NEW.mood_id, m.score, 'ai_diary'
  FROM (
    VALUES
      ('ecstatic', 100), ('happy', 85), ('playful', 80), ('calm', 65),
      ('tired', 40), ('anxious', 30), ('sad', 20), ('sick', 10)
  ) AS m(mood, score)
  WHERE m.mood = NEW.mood_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_diary_update_mood
  AFTER INSERT ON diary_entries
  FOR EACH ROW EXECUTE FUNCTION trg_fn_update_pet_mood_from_diary();

-- ══════════════════════════════════════
-- 5. AUDIT LOG — registra operações em tabelas sensíveis
-- ══════════════════════════════════════
CREATE OR REPLACE FUNCTION trg_fn_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_changes JSONB;
  v_user_id UUID;
  v_record_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF TG_OP = 'INSERT' THEN
    v_record_id := NEW.id;
    v_changes := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_record_id := NEW.id;
    -- Registrar apenas campos que mudaram
    SELECT jsonb_object_agg(key, value)
    INTO v_changes
    FROM jsonb_each(to_jsonb(NEW))
    WHERE to_jsonb(NEW) ->> key IS DISTINCT FROM to_jsonb(OLD) ->> key;
  ELSIF TG_OP = 'DELETE' THEN
    v_record_id := OLD.id;
    v_changes := to_jsonb(OLD);
  END IF;

  -- Não logar se nada mudou
  IF v_changes IS NOT NULL AND v_changes != '{}'::jsonb THEN
    INSERT INTO audit_log (user_id, action, table_name, record_id, changes)
    VALUES (v_user_id, TG_OP, TG_TABLE_NAME, v_record_id, v_changes);
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Audit em tabelas sensíveis do MVP
CREATE TRIGGER trg_audit_pets
  AFTER INSERT OR UPDATE OR DELETE ON pets
  FOR EACH ROW EXECUTE FUNCTION trg_fn_audit_log();

CREATE TRIGGER trg_audit_vaccines
  AFTER INSERT OR UPDATE OR DELETE ON vaccines
  FOR EACH ROW EXECUTE FUNCTION trg_fn_audit_log();

CREATE TRIGGER trg_audit_allergies
  AFTER INSERT OR UPDATE OR DELETE ON allergies
  FOR EACH ROW EXECUTE FUNCTION trg_fn_audit_log();

CREATE TRIGGER trg_audit_diary
  AFTER INSERT OR UPDATE OR DELETE ON diary_entries
  FOR EACH ROW EXECUTE FUNCTION trg_fn_audit_log();

-- ══════════════════════════════════════
-- 6. AUTO-CREATE user profile on auth signup
-- ══════════════════════════════════════
CREATE OR REPLACE FUNCTION trg_fn_handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, language)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'language', 'pt-BR')
  )
  ON CONFLICT (id) DO NOTHING;

  -- Notificação de boas-vindas
  INSERT INTO notifications_queue (user_id, type, title, body)
  VALUES (
    NEW.id,
    'welcome',
    'Bem-vindo ao auExpert!',
    'Uma inteligência única para o seu pet. Comece adicionando seu primeiro pet!'
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION trg_fn_handle_new_auth_user();
