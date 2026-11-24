-- Challenges: a week-long duel or group (2–6 people). Each member commits one of
-- their habits; the score is the number of days they checked it in. Optional soft
-- stake ("loser buys coffee"). Ends with results and a rematch.
create table public.challenges (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 60),
  stake       text check (stake is null or char_length(stake) between 1 and 80),
  start_date  date not null,
  end_date    date not null,
  created_at  timestamptz not null default now(),
  check (end_date >= start_date and end_date - start_date <= 30)
);
create index challenges_owner_idx on public.challenges (owner_id);

create table public.challenge_members (
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  habit_id     uuid references public.habits (id) on delete set null,
  status       text not null default 'invited' check (status in ('invited', 'joined')),
  invited_at   timestamptz not null default now(),
  joined_at    timestamptz,
  primary key (challenge_id, user_id),
  check ((status = 'joined') = (joined_at is not null))
);
create index challenge_members_user_idx on public.challenge_members (user_id);
create index challenge_members_habit_idx on public.challenge_members (habit_id);

-- membership check without recursive RLS (members can see each other)
create function public.is_challenge_member(p_challenge uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.challenge_members m
    where m.challenge_id = p_challenge and m.user_id = (select auth.uid())
  );
$$;
revoke execute on function public.is_challenge_member(uuid) from public, anon;
grant execute on function public.is_challenge_member(uuid) to authenticated;

-- at most 6 people per challenge
create function public.challenge_members_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.challenge_members where challenge_id = new.challenge_id) >= 6 then
    raise exception 'a challenge has at most 6 members';
  end if;
  return new;
end;
$$;
revoke execute on function public.challenge_members_limit() from public, anon, authenticated;
create trigger challenge_members_limit before insert on public.challenge_members
  for each row execute function public.challenge_members_limit();

alter table public.challenges enable row level security;
alter table public.challenge_members enable row level security;

create policy "challenges: members read"
  on public.challenges for select to authenticated
  using (owner_id = (select auth.uid()) or public.is_challenge_member(id));

create policy "challenges: create own"
  on public.challenges for insert to authenticated
  with check (owner_id = (select auth.uid()) and start_date >= current_date - 1);

create policy "challenges: owner deletes"
  on public.challenges for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy "challenge_members: members read"
  on public.challenge_members for select to authenticated
  using (public.is_challenge_member(challenge_id) or user_id = (select auth.uid()));

-- the owner joins with an own active habit, or invites someone they follow
create policy "challenge_members: owner adds"
  on public.challenge_members for insert to authenticated
  with check (
    exists (select 1 from public.challenges c where c.id = challenge_id and c.owner_id = (select auth.uid()))
    and (
      (user_id = (select auth.uid()) and status = 'joined'
        and exists (select 1 from public.habits h where h.id = habit_id and h.user_id = (select auth.uid()) and h.archived_at is null))
      or
      (user_id <> (select auth.uid()) and status = 'invited' and habit_id is null
        and exists (select 1 from public.follows f where f.follower_id = (select auth.uid()) and f.following_id = user_id))
    )
  );

-- an invitee accepts with one of their own active habits
create policy "challenge_members: accept"
  on public.challenge_members for update to authenticated
  using (user_id = (select auth.uid()) and status = 'invited')
  with check (
    user_id = (select auth.uid()) and status = 'joined'
    and exists (select 1 from public.habits h where h.id = habit_id and h.user_id = (select auth.uid()) and h.archived_at is null)
  );

-- leave / decline yourself, or the owner removes someone
create policy "challenge_members: leave or remove"
  on public.challenge_members for delete to authenticated
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.challenges c where c.id = challenge_id and c.owner_id = (select auth.uid()))
  );

grant select, insert, delete on public.challenges to authenticated;
grant select, insert, delete on public.challenge_members to authenticated;
grant update (habit_id, status, joined_at) on public.challenge_members to authenticated;

-- The caller's challenges with every member's score. SECURITY DEFINER on purpose:
-- it reveals other members' check-in days only for the one habit they put into
-- that challenge, only inside its dates, and only to fellow members.
create function public.my_challenges(p_today date)
returns table (
  challenge_id uuid,
  title text,
  stake text,
  start_date date,
  end_date date,
  i_own boolean,
  member_id uuid,
  is_me boolean,
  username text,
  name text,
  avatar_url text,
  status text,
  habit_name text,
  habit_color text,
  score integer,
  done_today boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.title, c.stake, c.start_date, c.end_date, c.owner_id = (select auth.uid()),
         m.user_id, m.user_id = (select auth.uid()),
         p.username, coalesce(p.display_name, p.username), p.avatar_url,
         m.status, h.name, h.color,
         coalesce((select count(distinct l.log_date)::int from public.habit_logs l
                   where l.habit_id = m.habit_id and l.log_date between c.start_date and least(c.end_date, p_today)), 0),
         exists (select 1 from public.habit_logs l where l.habit_id = m.habit_id and l.log_date = p_today)
  from public.challenges c
  join public.challenge_members m on m.challenge_id = c.id
  join public.profiles p on p.id = m.user_id
  left join public.habits h on h.id = m.habit_id
  where exists (select 1 from public.challenge_members me where me.challenge_id = c.id and me.user_id = (select auth.uid()))
    and c.end_date >= p_today - 7   -- finished challenges stay visible for a week (results, rematch)
  order by c.end_date desc, c.created_at desc;
$$;
revoke execute on function public.my_challenges(date) from public, anon;
grant execute on function public.my_challenges(date) to authenticated;
