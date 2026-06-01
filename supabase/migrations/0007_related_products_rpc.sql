-- =============================================================
-- 0007_related_products_rpc.sql
-- Permanent fix for "operator does not exist: category @> unknown".
--
-- PostgREST cannot resolve array operators (@>, &&) against the
-- public.category[] enum column when the literal arrives without an
-- explicit cast (the schema-cache lookup classifies the value as
-- "unknown"). Wrapping the related-products query in a SQL function
-- keeps the type binding inside the function body where we can cast
-- explicitly, so PostgREST only has to call it.
-- =============================================================

create or replace function public.get_related_products(
  p_product_id uuid,
  p_category public.category,
  p_limit int default 8
) returns setof public.products
language sql
stable
security invoker
set search_path = public
as $$
  select p.*
  from public.products p
  where p.id <> p_product_id
    and p.category && array[p_category]::public.category[]
  order by p.created_at desc
  limit p_limit;
$$;

grant execute on function public.get_related_products(uuid, public.category, int)
  to anon, authenticated;

-- Force PostgREST to refresh its schema cache so the new function is callable.
notify pgrst, 'reload schema';
