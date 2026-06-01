-- =============================================================
-- 0004_catalog_filters.sql — multi-category + room/color/pattern/style
-- Depends on 0002_catalog.sql
--
-- Changes:
--   1. New enum types: room_type, color_palette, pattern_type, style_theme
--   2. Convert products.category from scalar to category[]
--   3. Add four new array columns: rooms, colors, patterns, styles
--   4. Refresh search_tsv trigger to index the new dimensions
--   5. Add GIN indexes on the new array columns
-- =============================================================

-- -------------------------------------------------------------
-- 1. New enum types
-- -------------------------------------------------------------
create type public.room_type as enum (
  -- home rooms
  'living-room',
  'bedroom',
  'kids-room',
  'kitchen',
  'bathroom',
  'study',
  'hallway',
  'pooja-room',
  -- commercial spaces
  'cafe',
  'restaurant',
  'office',
  'retail',
  'salon',
  -- kids-specific
  'nursery',
  'classroom',
  'playroom',
  -- feature walls
  'accent-wall',
  'entryway',
  'balcony'
);

create type public.color_palette as enum (
  'neutral',
  'pastel',
  'vibrant',
  'dark',
  'earthy',
  'monochrome',
  'blue',
  'green',
  'pink',
  'gold',
  'multi'
);

create type public.pattern_type as enum (
  'floral',
  'geometric',
  'abstract',
  'stripes',
  'polka-dots',
  'scenery',
  'mandala',
  'typography',
  'animal',
  'tropical',
  'solid',
  'organic'
);

create type public.style_theme as enum (
  'modern',
  'vintage',
  'boho',
  'traditional-indian',
  'scandinavian',
  'japandi',
  'minimal',
  'art-deco',
  'mid-century',
  'rustic',
  'contemporary'
);

-- -------------------------------------------------------------
-- 2. Convert products.category to category[]
--    Drop the scalar index first; it cannot apply to the array column.
-- -------------------------------------------------------------
drop index if exists public.products_category_idx;

alter table public.products
  alter column category drop default,
  alter column category type public.category[]
    using array[category]::public.category[],
  alter column category set default '{}'::public.category[],
  alter column category set not null;

-- -------------------------------------------------------------
-- 3. New array columns (default empty, not null so .contains works)
-- -------------------------------------------------------------
alter table public.products
  add column rooms    public.room_type[]     not null default '{}'::public.room_type[],
  add column colors   public.color_palette[] not null default '{}'::public.color_palette[],
  add column patterns public.pattern_type[]  not null default '{}'::public.pattern_type[],
  add column styles   public.style_theme[]   not null default '{}'::public.style_theme[];

-- -------------------------------------------------------------
-- 4. Refresh FTS trigger to include the new dimensions.
--    name + tags stay weight A; description weight B;
--    category + rooms + colors + patterns + styles weight C
--    so they're searchable but won't dominate name matches.
-- -------------------------------------------------------------
create or replace function public.products_search_tsv_update()
returns trigger language plpgsql as $$
begin
  new.search_tsv :=
    setweight(to_tsvector('english', coalesce(new.name, '')), 'A') ||
    setweight(to_tsvector('english', array_to_string(new.tags, ' ')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.description, '')), 'B') ||
    setweight(to_tsvector('english', array_to_string(new.category::text[], ' ')), 'C') ||
    setweight(to_tsvector('english', array_to_string(new.rooms::text[], ' ')), 'C') ||
    setweight(to_tsvector('english', array_to_string(new.colors::text[], ' ')), 'C') ||
    setweight(to_tsvector('english', array_to_string(new.patterns::text[], ' ')), 'C') ||
    setweight(to_tsvector('english', array_to_string(new.styles::text[], ' ')), 'C');
  return new;
end;
$$;

-- Re-fire trigger on existing rows so search_tsv is recomputed with the new dimensions.
update public.products set name = name;

-- -------------------------------------------------------------
-- 5. GIN indexes for the new array columns + category array.
--    .contains() / overlaps queries benefit from these once
--    the catalog grows past a few hundred rows.
-- -------------------------------------------------------------
create index products_category_idx on public.products using gin (category);
create index products_rooms_idx    on public.products using gin (rooms);
create index products_colors_idx   on public.products using gin (colors);
create index products_patterns_idx on public.products using gin (patterns);
create index products_styles_idx   on public.products using gin (styles);
