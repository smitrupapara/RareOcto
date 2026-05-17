-- enums
create type public.role as enum ('user', 'admin');
create type public.product_size as enum ('S', 'M', 'L');
create type public.category as enum ('abstract','botanical','geometric','mural','kids','minimal');
create type public.order_status as enum ('created','pending','paid','shipped','delivered','cancelled','refunded');

-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text unique,
  email text,
  name text,
  role public.role not null default 'user',
  created_at timestamptz not null default now()
);

-- RLS
alter table public.profiles enable row level security;
create policy "read own profile"   on public.profiles for select using (auth.uid() = id);
create policy "update own profile" on public.profiles for update using (auth.uid() = id);

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, phone)
  values (new.id, new.phone)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
