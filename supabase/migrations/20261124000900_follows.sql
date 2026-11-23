-- Following public profiles
create table public.follows (
  follower_id  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index follows_following_id_idx on public.follows (following_id);

alter table public.follows enable row level security;

-- who follows whom is visible only to the two people involved
create policy "follows: read own"
  on public.follows for select to authenticated
  using (follower_id = (select auth.uid()) or following_id = (select auth.uid()));

-- you can only follow public profiles
create policy "follows: follow public profiles"
  on public.follows for insert to authenticated
  with check (
    follower_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = following_id and p.is_public)
  );

create policy "follows: unfollow"
  on public.follows for delete to authenticated
  using (follower_id = (select auth.uid()));

grant select, insert, delete on public.follows to authenticated;

-- Public counters without exposing the follower lists themselves.
-- SECURITY DEFINER on purpose: it returns only two numbers, and only for
-- public profiles (or your own).
create function public.follow_counts(p_profile uuid)
returns table (followers bigint, following bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*) from public.follows f where f.following_id = p_profile),
    (select count(*) from public.follows f where f.follower_id = p_profile)
  where exists (
    select 1 from public.profiles p
    where p.id = p_profile and (p.is_public or p.id = (select auth.uid()))
  );
$$;

revoke execute on function public.follow_counts(uuid) from public;
grant execute on function public.follow_counts(uuid) to anon, authenticated;
