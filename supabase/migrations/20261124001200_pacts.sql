-- Pacts: two people each commit one habit; the shared ("duo") streak grows
-- only on days when both checked in.
create table public.pacts (
  id                uuid primary key default gen_random_uuid(),
  inviter_id        uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  invitee_id        uuid not null references public.profiles (id) on delete cascade,
  inviter_habit_id  uuid not null references public.habits (id) on delete cascade,
  invitee_habit_id  uuid references public.habits (id) on delete cascade,
  status            text not null default 'pending' check (status in ('pending', 'active')),
  created_at        timestamptz not null default now(),
  accepted_at       timestamptz,
  check (inviter_id <> invitee_id),
  check ((status = 'active') = (invitee_habit_id is not null))
);

-- one pact per pair of people at a time
create unique index pacts_pair_idx on public.pacts (least(inviter_id, invitee_id), greatest(inviter_id, invitee_id));
create index pacts_invitee_idx on public.pacts (invitee_id);

alter table public.pacts enable row level security;

create policy "pacts: participants read"
  on public.pacts for select to authenticated
  using ((select auth.uid()) in (inviter_id, invitee_id));

-- invite someone you follow, with one of your own habits
create policy "pacts: invite"
  on public.pacts for insert to authenticated
  with check (
    inviter_id = (select auth.uid())
    and status = 'pending'
    and invitee_habit_id is null
    and exists (select 1 from public.habits h where h.id = inviter_habit_id and h.user_id = (select auth.uid()) and h.archived_at is null)
    and exists (select 1 from public.follows f where f.follower_id = (select auth.uid()) and f.following_id = invitee_id)
  );

-- only the invitee accepts, with one of their own habits
create policy "pacts: accept"
  on public.pacts for update to authenticated
  using (invitee_id = (select auth.uid()) and status = 'pending')
  with check (
    invitee_id = (select auth.uid())
    and status = 'active'
    and exists (select 1 from public.habits h where h.id = invitee_habit_id and h.user_id = (select auth.uid()) and h.archived_at is null)
  );

-- either side can decline / cancel / end
create policy "pacts: participants delete"
  on public.pacts for delete to authenticated
  using ((select auth.uid()) in (inviter_id, invitee_id));

grant select, insert, delete on public.pacts to authenticated;
grant update (invitee_habit_id, status, accepted_at) on public.pacts to authenticated;

-- The caller's pacts with partner details. SECURITY DEFINER on purpose: it
-- reveals the partner's check-in dates for the ONE habit they put into the
-- pact (even if their profile is private) — and only to the other participant.
create function public.my_pacts()
returns table (
  id uuid,
  status text,
  i_invited boolean,
  partner_username text,
  partner_name text,
  partner_avatar text,
  my_habit_id uuid,
  my_habit_name text,
  partner_habit_name text,
  partner_habit_color text,
  partner_dates date[],
  accepted_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (select auth.uid() as uid)
  select
    p.id,
    p.status,
    p.inviter_id = me.uid,
    pr.username,
    coalesce(pr.display_name, pr.username),
    pr.avatar_url,
    mh.id,
    mh.name,
    ph.name,
    ph.color,
    case when p.status = 'active' then coalesce(
      (select array_agg(l.log_date order by l.log_date)
         from public.habit_logs l
        where l.habit_id = ph.id and l.log_date >= current_date - 400),
      '{}') else '{}' end,
    p.accepted_at
  from public.pacts p
  cross join me
  join public.profiles pr
    on pr.id = case when p.inviter_id = me.uid then p.invitee_id else p.inviter_id end
  left join public.habits mh
    on mh.id = case when p.inviter_id = me.uid then p.inviter_habit_id else p.invitee_habit_id end
  left join public.habits ph
    on ph.id = case when p.inviter_id = me.uid then p.invitee_habit_id else p.inviter_habit_id end
  where me.uid in (p.inviter_id, p.invitee_id)
  order by p.status, p.created_at desc;
$$;

revoke execute on function public.my_pacts() from public, anon;
grant execute on function public.my_pacts() to authenticated;
