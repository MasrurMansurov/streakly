-- Growth plan 3.1: small social signals between people who follow each other.
--   high_five — "nice one" for a day someone checked in (one per person per day)
--   nudge     — a friendly push to someone who hasn't checked in today (one per person per day)

create table public.cheers (
  id         uuid primary key default gen_random_uuid(),
  from_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  to_id      uuid not null references public.profiles (id) on delete cascade,
  kind       text not null check (kind in ('high_five', 'nudge')),
  -- high_five: the feed day it is for; nudge: the sender's today
  day        date not null,
  created_at timestamptz not null default now(),
  check (from_id <> to_id),
  unique (from_id, to_id, kind, day)
);

create index cheers_to_id_created_idx on public.cheers (to_id, created_at desc);

alter table public.cheers enable row level security;

-- the two people involved see it; nobody else
create policy "cheers: sender and recipient read" on public.cheers for select to authenticated
  using ((select auth.uid()) in (from_id, to_id));

-- only to someone you follow, only as yourself, only for a recent day
-- (a small window around "today" covers every time zone)
create policy "cheers: send to people you follow" on public.cheers for insert to authenticated
  with check (
    from_id = (select auth.uid())
    and exists (
      select 1 from public.follows f
      where f.follower_id = (select auth.uid()) and f.following_id = to_id
    )
    and day between current_date - 2 and current_date + 1
  );

-- a high five can be taken back
create policy "cheers: sender undoes" on public.cheers for delete to authenticated
  using (from_id = (select auth.uid()));

-- demo guests have no social features (see 20261127000000_guest_demo.sql)
create policy "guests: no cheers" on public.cheers as restrictive for insert to authenticated
  with check (not (select public.is_guest()));

-- nothing is ever edited (same lockdown as every table: 20261125000800_lock_down_grants)
revoke all on public.cheers from anon;
revoke update, truncate, references, trigger on public.cheers from authenticated;

-- Who cheered me lately, with their names. A sender may have a private profile
-- (RLS would hide it), but they chose to reach out — the recipient sees who.
create function public.my_recent_cheers()
returns table (kind text, from_name text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select c.kind, coalesce(nullif(p.display_name, ''), p.username), c.created_at
  from public.cheers c
  join public.profiles p on p.id = c.from_id
  where c.to_id = (select auth.uid())
    and c.created_at > now() - interval '36 hours'
  order by c.created_at desc
  limit 20
$$;

revoke execute on function public.my_recent_cheers() from public, anon;
grant execute on function public.my_recent_cheers() to authenticated;
