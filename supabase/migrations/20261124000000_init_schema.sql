-- Streakly: initial schema
-- profiles  — one row per auth user, optional public page at /u/<username>
-- habits    — user's habits
-- habit_logs — one row per (habit, day) when the habit was completed

-- ───────────── profiles ─────────────
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text not null unique
               check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text check (char_length(display_name) <= 50),
  bio          text check (char_length(bio) <= 160),
  avatar_url   text,
  is_public    boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ───────────── habits ─────────────
create table public.habits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid()
              references public.profiles (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 60),
  description text check (char_length(description) <= 200),
  color       text not null default 'emerald',
  icon        text not null default 'check',
  position    integer not null default 0,
  archived_at timestamptz,
  created_at  timestamptz not null default now()
);

create index habits_user_id_idx on public.habits (user_id);

-- ───────────── habit_logs ─────────────
create table public.habit_logs (
  id         uuid primary key default gen_random_uuid(),
  habit_id   uuid not null references public.habits (id) on delete cascade,
  user_id    uuid not null default auth.uid()
             references public.profiles (id) on delete cascade,
  log_date   date not null,
  created_at timestamptz not null default now(),
  unique (habit_id, log_date)
);

create index habit_logs_user_date_idx on public.habit_logs (user_id, log_date);

-- A log must belong to a habit of the same user
create function public.habit_logs_check_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.habits h
    where h.id = new.habit_id and h.user_id = new.user_id
  ) then
    raise exception 'habit does not belong to user';
  end if;
  return new;
end;
$$;

create trigger habit_logs_check_owner
  before insert or update on public.habit_logs
  for each row execute function public.habit_logs_check_owner();

-- ───────────── auto-create profile on sign up ─────────────
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    'user_' || substr(replace(new.id::text, '-', ''), 1, 10),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────── Row Level Security ─────────────
alter table public.profiles   enable row level security;
alter table public.habits     enable row level security;
alter table public.habit_logs enable row level security;

-- profiles: owner sees own, everyone sees public ones
create policy "profiles: read own or public"
  on public.profiles for select to anon, authenticated
  using (is_public or id = (select auth.uid()));

create policy "profiles: update own"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- habits: owner has full access; public profiles expose active habits
create policy "habits: read own or public"
  on public.habits for select to anon, authenticated
  using (
    user_id = (select auth.uid())
    or (
      archived_at is null
      and exists (select 1 from public.profiles p where p.id = habits.user_id and p.is_public)
    )
  );

create policy "habits: insert own"
  on public.habits for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "habits: update own"
  on public.habits for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "habits: delete own"
  on public.habits for delete to authenticated
  using (user_id = (select auth.uid()));

-- habit_logs: same idea
create policy "habit_logs: read own or public"
  on public.habit_logs for select to anon, authenticated
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.profiles p where p.id = habit_logs.user_id and p.is_public)
  );

create policy "habit_logs: insert own"
  on public.habit_logs for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "habit_logs: delete own"
  on public.habit_logs for delete to authenticated
  using (user_id = (select auth.uid()));

-- ───────────── grants (Data API) ─────────────
grant select on public.profiles, public.habits, public.habit_logs to anon;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.habits to authenticated;
grant select, insert, delete on public.habit_logs to authenticated;
