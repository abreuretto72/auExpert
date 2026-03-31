-- Migration 010: Add video MIME types to pet-photos bucket
-- auExpert — enable video uploads for diary entries

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/webp', 'image/jpeg', 'image/png',
  'video/mp4', 'video/quicktime', 'video/webm'
],
file_size_limit = 52428800  -- 50MB (videos are larger than photos)
WHERE id = 'pet-photos';
