-- Migration 008: Storage Buckets
-- auExpert MVP

-- ══════════════════════════════════════
-- BUCKETS
-- ══════════════════════════════════════

-- pet-photos: fotos dos pets (max 12MB, WebP/JPEG/PNG)
-- Estrutura: {user_id}/{pet_id}/{timestamp}_{filename}
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('pet-photos', 'pet-photos', true, 12582912, ARRAY['image/webp', 'image/jpeg', 'image/png']),
  ('avatars', 'avatars', true, 5242880, ARRAY['image/webp', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO NOTHING;

-- ══════════════════════════════════════
-- RLS POLICIES — pet-photos
-- Leitura pública, escrita/exclusão apenas pelo dono (user_id na pasta)
-- ══════════════════════════════════════
CREATE POLICY "pet_photos_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'pet-photos');

CREATE POLICY "pet_photos_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'pet-photos' AND auth.uid()::TEXT = (storage.foldername(name))[1]);

CREATE POLICY "pet_photos_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'pet-photos' AND auth.uid()::TEXT = (storage.foldername(name))[1]);

-- ══════════════════════════════════════
-- RLS POLICIES — avatars
-- Leitura pública, upload/update/delete apenas pelo dono
-- ══════════════════════════════════════
CREATE POLICY "avatars_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::TEXT = (storage.foldername(name))[1]);

CREATE POLICY "avatars_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::TEXT = (storage.foldername(name))[1]);

CREATE POLICY "avatars_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.uid()::TEXT = (storage.foldername(name))[1]);
