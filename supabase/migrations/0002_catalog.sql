-- =============================================================
-- 0002_catalog.sql — products, cart_items, favorites, reviews
-- Depends on 0001_init_auth.sql (profiles, enums: category,
-- product_size, role).
-- =============================================================

-- Extensions
create extension if not exists pg_trgm;

-- New enum: product material
create type public.product_material as enum (
  'matte-vinyl',
  'glossy-vinyl',
  'fabric-texture',
  'magnetic-base'
);

-- -------------------------------------------------------------
-- products
-- -------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text not null,
  category public.category not null,
  base_price integer not null check (base_price >= 0),                 -- paise
  images text[] not null default '{}'::text[],                         -- Cloudinary public IDs
  available_sizes public.product_size[] not null default '{}'::public.product_size[],
  available_materials public.product_material[] not null default '{}'::public.product_material[],
  material_price_modifier jsonb not null default '{}'::jsonb,          -- {"fabric-texture": 200}
  dimensions jsonb not null default '{}'::jsonb,                       -- {"S":{"w_cm":60,"h_cm":90},...}
  tags text[] not null default '{}'::text[],
  stock integer not null default 0 check (stock >= 0),
  meta_title text,
  meta_description text,
  search_tsv tsvector,
  created_at timestamptz not null default now()
);

create or replace function public.products_search_tsv_update()
returns trigger language plpgsql as $$
begin
  new.search_tsv :=
    setweight(to_tsvector('english', coalesce(new.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.description, '')), 'B') ||
    setweight(to_tsvector('english', array_to_string(new.tags, ' ')), 'A');
  return new;
end;
$$;

create trigger products_search_tsv_trigger
  before insert or update on public.products
  for each row execute function public.products_search_tsv_update();

create index products_search_idx     on public.products using gin (search_tsv);
create index products_tags_idx       on public.products using gin (tags);
create index products_name_trgm_idx  on public.products using gin (name gin_trgm_ops);
create index products_category_idx   on public.products (category);
create index products_created_at_idx on public.products (created_at desc);

-- -------------------------------------------------------------
-- cart_items
-- -------------------------------------------------------------
create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  size public.product_size not null,
  material public.product_material not null,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (user_id, product_id, size, material)
);

create index cart_items_user_idx on public.cart_items (user_id);

-- -------------------------------------------------------------
-- favorites
-- -------------------------------------------------------------
create table public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create index favorites_product_idx on public.favorites (product_id);

-- -------------------------------------------------------------
-- reviews
-- -------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  title text,
  body text,
  verified_purchase boolean not null default false,
  created_at timestamptz not null default now(),
  unique (product_id, user_id)
);

create index reviews_product_idx on public.reviews (product_id, created_at desc);
create index reviews_user_idx    on public.reviews (user_id);

-- =============================================================
-- Verified purchase: trigger sets reviews.verified_purchase
-- based on whether the user has a paid/shipped/delivered order
-- containing the product. Reads orders.items (jsonb array of
-- line items with product_id strings).
-- =============================================================
create or replace function public.is_verified_purchase(p_user uuid, p_product uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_found boolean;
begin
  select exists (
    select 1
    from public.orders o,
         jsonb_array_elements(o.items) as item
    where o.user_id = p_user
      and o.status in ('paid', 'shipped', 'delivered')
      and (item ->> 'product_id') = p_product::text
  ) into v_found;
  return coalesce(v_found, false);
end;
$$;

create or replace function public.set_verified_purchase()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.verified_purchase := public.is_verified_purchase(new.user_id, new.product_id);
  return new;
end;
$$;

create trigger reviews_set_verified_purchase
  before insert on public.reviews
  for each row execute function public.set_verified_purchase();

-- =============================================================
-- RLS
-- =============================================================

-- products: public read, admin-only writes
alter table public.products enable row level security;

create policy "products are public"
  on public.products
  for select
  using (true);

create policy "admins can insert products"
  on public.products
  for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "admins can update products"
  on public.products
  for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "admins can delete products"
  on public.products
  for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- cart_items: CRUD on own rows
alter table public.cart_items enable row level security;

create policy "users read own cart"   on public.cart_items for select using (auth.uid() = user_id);
create policy "users insert own cart" on public.cart_items for insert with check (auth.uid() = user_id);
create policy "users update own cart" on public.cart_items for update using (auth.uid() = user_id);
create policy "users delete own cart" on public.cart_items for delete using (auth.uid() = user_id);

-- favorites: CRUD on own rows
alter table public.favorites enable row level security;

create policy "users read own favorites"   on public.favorites for select using (auth.uid() = user_id);
create policy "users insert own favorites" on public.favorites for insert with check (auth.uid() = user_id);
create policy "users delete own favorites" on public.favorites for delete using (auth.uid() = user_id);

-- reviews: public read; insert/update/delete on own rows
alter table public.reviews enable row level security;

create policy "reviews are public"      on public.reviews for select using (true);
create policy "users insert own review" on public.reviews for insert with check (auth.uid() = user_id);
create policy "users update own review" on public.reviews for update using (auth.uid() = user_id);
create policy "users delete own review" on public.reviews for delete using (auth.uid() = user_id);
