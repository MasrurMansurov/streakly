-- Reminder time and timezone must not be readable by others: profiles of public
-- users are world-readable, so move these settings to an owner-only table.
alter table public.profiles
  drop column reminder_enabled,
  drop column reminder_time,
  drop column timezone,
  drop column last_reminded_on;

create table public.reminder_settings (
  user_id          uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  enabled          boolean not null default false,
  remind_at        time not null default '20:00',
  timezone         text not null default 'UTC' check (char_length(timezone) <= 64),
  last_reminded_on date,
  updated_at       timestamptz not null default now()
);

alter table public.reminder_settings enable row level security;

create policy "reminder_settings: read own"
  on public.reminder_settings for select to authenticated
  using (user_id = (select auth.uid()));

create policy "reminder_settings: insert own"
  on public.reminder_settings for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "reminder_settings: update own"
  on public.reminder_settings for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update on public.reminder_settings to authenticated;
