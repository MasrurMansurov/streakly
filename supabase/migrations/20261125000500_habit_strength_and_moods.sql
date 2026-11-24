-- Habit strength: a weekly one-question automaticity check (simplified SRBAI,
-- 1 = "I have to push myself" … 5 = "I do it without thinking").
create table public.habit_strength (
  habit_id    uuid not null references public.habits (id) on delete cascade,
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  week_start  date not null check (extract(isodow from week_start) = 1),
  score       smallint not null check (score between 1 and 5),
  created_at  timestamptz not null default now(),
  primary key (habit_id, week_start)
);
create index habit_strength_user_idx on public.habit_strength (user_id);

alter table public.habit_strength enable row level security;
create policy "habit_strength: own" on public.habit_strength for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.habits h where h.id = habit_id and h.user_id = (select auth.uid()))
    and week_start between current_date - 14 and current_date + 1
  );
grant select, insert, update, delete on public.habit_strength to authenticated;

-- "Graduated" habits run on autopilot: still trackable, but no longer "due" or reminded.
alter table public.habits add column graduated_at timestamptz;

-- Daily mood & energy, one tap each (1–5).
create table public.daily_moods (
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  day        date not null,
  mood       smallint check (mood between 1 and 5),
  energy     smallint check (energy between 1 and 5),
  updated_at timestamptz not null default now(),
  primary key (user_id, day),
  check (mood is not null or energy is not null)
);
alter table public.daily_moods enable row level security;
create policy "daily_moods: own" on public.daily_moods for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and day between current_date - 2 and current_date + 1);
grant select, insert, update, delete on public.daily_moods to authenticated;
