ALTER TABLE store_settings
  ADD COLUMN IF NOT EXISTS preorder_button_style VARCHAR(20) DEFAULT 'tomorrow',
  ADD COLUMN IF NOT EXISTS checkout_guest_first BOOLEAN DEFAULT false;
