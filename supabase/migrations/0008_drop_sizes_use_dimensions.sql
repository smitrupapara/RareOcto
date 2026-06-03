-- 0008 — Replace fixed S/M/L sizing with customer-entered width × height + unit.
--
-- Pricing semantics shift: products.base_price is now paise PER SQUARE FOOT
-- (was paise per piece). Final unit price is computed at read time:
--   final = round(area_sqft * base_price) + material_modifier
--
-- Global dimension range (enforced in app code, not DB):
--   1 ft  ≤ side ≤ 30 ft  (≈ 30.48 cm … 914.4 cm)
--
-- Existing seed rows are throwaway — we just drop the old columns.

create type public.dimension_unit as enum ('cm', 'inch', 'feet', 'meter');

alter table public.products drop column available_sizes;
alter table public.products drop column dimensions;

alter table public.cart_items
  drop constraint cart_items_user_id_product_id_size_material_key;
alter table public.cart_items drop column size;

alter table public.cart_items
  add column width  numeric not null check (width  > 0),
  add column height numeric not null check (height > 0),
  add column unit   public.dimension_unit not null;

alter table public.cart_items
  add constraint cart_items_dimension_unique
  unique (user_id, product_id, material, width, height, unit);

drop type public.product_size;
