-- ───────────── Reminder settings on the profile ─────────────
alter table public.profiles
  add column reminder_enabled boolean not null default false,
  add column reminder_time time not null default '20:00',
  add column timezone text not null default 'UTC',
  add column last_reminded_on date;

-- ───────────── Web Push subscriptions (one per browser/device) ─────────────
create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  endpoint   text not null unique check (endpoint like 'https://%' and char_length(endpoint) <= 1000),
  p256dh     text not null check (char_length(p256dh) <= 200),
  auth       text not null check (char_length(auth) <= 100),
  user_agent text check (char_length(user_agent) <= 300),
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions: read own"
  on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));

create policy "push_subscriptions: insert own"
  on public.push_subscriptions for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "push_subscriptions: delete own"
  on public.push_subscriptions for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, delete on public.push_subscriptions to authenticated;

-- ───────────── Scheduler prerequisites (the job itself is in a later migration) ─────────────
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- random token shared between the cron job and the Edge Function (never leaves the database)
select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'reminders_cron_token')
where not exists (select 1 from vault.secrets where name = 'reminders_cron_token');
