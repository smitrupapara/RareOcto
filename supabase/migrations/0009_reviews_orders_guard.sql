-- =============================================================
-- 0009_reviews_orders_guard.sql
-- Permanent fix for "Could not save review".
--
-- Every insert into public.reviews fires the BEFORE INSERT trigger
-- reviews_set_verified_purchase -> set_verified_purchase() ->
-- is_verified_purchase(), which queries public.orders. That table is
-- not created by any migration yet (checkout is unbuilt), so the
-- query raised `relation "public.orders" does not exist` and every
-- review insert failed.
--
-- This redefines is_verified_purchase() to guard on the table's
-- existence via to_regclass(). While orders is absent it returns
-- false (no reviews can be "verified" without an order anyway); once
-- an orders table is added the verified-purchase logic resumes
-- automatically with no further change. The dynamic EXECUTE also lets
-- the function compile even when public.orders does not exist.
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
  if to_regclass('public.orders') is null then
    return false;
  end if;

  execute $q$
    select exists (
      select 1
      from public.orders o,
           jsonb_array_elements(o.items) as item
      where o.user_id = $1
        and o.status in ('paid', 'shipped', 'delivered')
        and (item ->> 'product_id') = $2::text
    )
  $q$
  into v_found
  using p_user, p_product;

  return coalesce(v_found, false);
end;
$$;
