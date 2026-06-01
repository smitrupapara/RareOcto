-- allow a signed-in user to insert their own profile row.
-- needed when the trigger-created row is missing (manual deletion, trigger failure)
-- so onboarding's upsert can recover instead of failing under RLS.
create policy "insert own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);
