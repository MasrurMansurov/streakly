-- AI weekly letter: one per user per week, written on request and kept, so the
-- model is called at most once a week per person.
create table public.weekly_letters (
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1),
  locale     text not null check (locale in ('en', 'ru')),
  body       text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  primary key (user_id, week_start)
);
alter table public.weekly_letters enable row level security;
create policy "weekly_letters: own" on public.weekly_letters for select to authenticated
  using (user_id = (select auth.uid()));
create policy "weekly_letters: write own" on public.weekly_letters for insert to authenticated
  with check (user_id = (select auth.uid()) and week_start between current_date - 14 and current_date + 1);
create policy "weekly_letters: delete own" on public.weekly_letters for delete to authenticated
  using (user_id = (select auth.uid()));
grant select, insert, delete on public.weekly_letters to authenticated;
