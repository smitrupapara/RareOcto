-- =============================================================
-- 0005_more_rooms.sql — extend room_type with commercial/office spaces
-- Depends on 0004_catalog_filters.sql
--
-- Adds eight new values to public.room_type:
--   director-chamber, reception-area, conference-room, pantry,
--   dining-area, product-display, foyer, entrance-branding
-- =============================================================

alter type public.room_type add value if not exists 'dining-area';
alter type public.room_type add value if not exists 'pantry';
alter type public.room_type add value if not exists 'foyer';
alter type public.room_type add value if not exists 'director-chamber';
alter type public.room_type add value if not exists 'reception-area';
alter type public.room_type add value if not exists 'conference-room';
alter type public.room_type add value if not exists 'product-display';
alter type public.room_type add value if not exists 'entrance-branding';
