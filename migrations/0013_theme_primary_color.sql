-- The standard primary color has 21 characters; old schemas allowed only 20.
-- Widen only undersized varchar columns; never truncate existing colors or
-- narrow a store's custom text/larger varchar column. Safe to apply repeatedly.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'themes'
      AND column_name = 'primary_color' AND data_type = 'character varying'
      AND character_maximum_length < 64
  ) THEN
    ALTER TABLE public.themes ALTER COLUMN primary_color TYPE varchar(64);
  END IF;
END $$;

-- Theme application already writes these translated shop images. Old
-- manually-upgraded stores may have them; clean generated schemas did not.
ALTER TABLE IF EXISTS public.store_settings
  ADD COLUMN IF NOT EXISTS logo_url_en varchar(500),
  ADD COLUMN IF NOT EXISTS logo_url_he varchar(500),
  ADD COLUMN IF NOT EXISTS logo_url_ar varchar(500),
  ADD COLUMN IF NOT EXISTS banner_image_url_en varchar(500),
  ADD COLUMN IF NOT EXISTS banner_image_url_he varchar(500),
  ADD COLUMN IF NOT EXISTS banner_image_url_ar varchar(500);
