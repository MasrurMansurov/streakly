-- First-party growth analytics (growth plan 1.1). No third-party trackers:
-- - user_attribution: where each new user came from (first utm_source / ref /
--   external referrer, captured on the first visit, saved at sign-up). Private.
-- - events: the few actions that leave no trace in the data (sharing,
--   invites, yearly recap). Users insert their own rows and read nothing.
-- - growth_funnel(): sign-ups by source → activation → D7 → inviters → sharers.
--   For the project owner only (SQL editor / service role), not the API.

create table public.user_attribution (
  user_id    uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  source     text not null check (char_length(source) <= 64),
  ref        text check (char_length(ref) <= 64),
  landing    text check (char_length(landing) <= 200),
  created_at timestamptz not null default now()
);
alter table public.user_attribution enable row level security;
create policy "user_attribution: add own once"
  on public.user_attribution for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "user_attribution: read own"
  on public.user_attribution for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.user_attribution from anon;
revoke update, delete, truncate, references, trigger on public.user_attribution from authenticated;

create table public.events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name       text not null check (name in (
               'share_opened', 'share_done', 'invite_link_copied', 'invite_opened',
               'invite_accepted', 'wrapped_viewed', 'wrapped_shared')),
  props      jsonb not null default '{}' check (pg_column_size(props) <= 1024),
  created_at timestamptz not null default now()
);
create index events_name_created_idx on public.events (name, created_at);
create index events_user_idx on public.events (user_id);
alter table public.events enable row level security;
create policy "events: add own"
  on public.events for insert to authenticated
  with check (user_id = (select auth.uid()));
revoke all on public.events from anon;
revoke select, update, delete, truncate, references, trigger on public.events from authenticated;

-- Funnel per source for sign-ups in [p_from, p_to]:
--   activated = first check-in within 24 h of sign-up
--   d7        = a check-in on days 7–13 after sign-up (only users old enough)
--   inviters  = started a pact or a challenge, or copied an invite link
--   sharers   = shared a card or the yearly recap
create function public.growth_funnel(p_from date default current_date - 30, p_to date default current_date)
returns table (source text, signups bigint, activated bigint, d7_eligible bigint, d7 bigint, inviters bigint, sharers bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with u as (
    select p.id, p.created_at, coalesce(a.source, 'direct') as src
    from public.profiles p
    left join public.user_attribution a on a.user_id = p.id
    where p.created_at::date between p_from and p_to
  )
  select
    u.src,
    count(*),
    count(*) filter (where exists (
      select 1 from public.habit_logs l where l.user_id = u.id and l.created_at < u.created_at + interval '24 hours')),
    count(*) filter (where u.created_at < now() - interval '14 days'),
    count(*) filter (where u.created_at < now() - interval '14 days' and exists (
      select 1 from public.habit_logs l where l.user_id = u.id
        and l.created_at >= u.created_at + interval '7 days' and l.created_at < u.created_at + interval '14 days')),
    count(*) filter (where exists (select 1 from public.pacts x where x.inviter_id = u.id)
                       or exists (select 1 from public.challenges c where c.owner_id = u.id)
                       or exists (select 1 from public.events e where e.user_id = u.id and e.name = 'invite_link_copied')),
    count(*) filter (where exists (
      select 1 from public.events e where e.user_id = u.id and e.name in ('share_done', 'wrapped_shared')))
  from u
  group by u.src
  order by 2 desc;
$$;
revoke execute on function public.growth_funnel(date, date) from public, anon, authenticated;
