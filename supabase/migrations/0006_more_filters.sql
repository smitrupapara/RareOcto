-- =============================================================
-- 0006_more_filters.sql — extend category, pattern_type, style_theme
-- Depends on 0005_more_rooms.sql
--
-- Adds:
--   category:     3d, illustration
--   pattern_type: marble-granite, world-map, wood-grain, stone-texture,
--                 canvas-texture, divine
--   style_theme:  egyptian
-- =============================================================

alter type public.category add value if not exists '3d';
alter type public.category add value if not exists 'illustration';

alter type public.pattern_type add value if not exists 'marble-granite';
alter type public.pattern_type add value if not exists 'world-map';
alter type public.pattern_type add value if not exists 'wood-grain';
alter type public.pattern_type add value if not exists 'stone-texture';
alter type public.pattern_type add value if not exists 'canvas-texture';
alter type public.pattern_type add value if not exists 'divine';

alter type public.style_theme add value if not exists 'egyptian';
