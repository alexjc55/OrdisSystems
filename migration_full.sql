-- ============================================================
-- Min/max order quantity per product
-- ============================================================
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS min_order_quantity DECIMAL(10,3),
  ADD COLUMN IF NOT EXISTS max_order_quantity DECIMAL(10,3);
