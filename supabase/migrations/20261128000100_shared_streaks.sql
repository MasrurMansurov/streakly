-- Growth plan 3.2: a shared streak without photos — the days you and a friend
-- both checked in *something*. The light sibling of a pact: no invite, no habit
-- to pick. It exists between people who follow each other (both chose to see
-- the other's check-ins).
--
-- Counted the same way from both sides: only check-ins anyone could see on a
-- public profile (not private, not archived habits; public profiles). Private
-- activity never leaks into it.

create function public.shared_streaks(p_today date)
returns table (friend_id uuid, streak int, me_today boolean, friend_today boolean)
language sql
stable
security invoker  -- RLS applies: only rows the caller may read
set search_path = ''
as $$
  with mutual as (
    select f.following_id as friend_id
    from public.follows f
    where f.follower_id = (select auth.uid())
      and exists (
        select 1 from public.follows back
        where back.follower_id = f.following_id and back.following_id = (select auth.uid())
      )
  ),
  -- one row per person per day with a visible check-in (a year back is plenty)
  days as (
    select l.user_id, l.log_date
    from public.habit_logs l
    join public.habits h on h.id = l.habit_id
    join public.profiles p on p.id = l.user_id
    where l.log_date between p_today - 366 and p_today
      and h.archived_at is null
      and not h.is_private
      and p.is_public
      and (l.user_id = (select auth.uid()) or l.user_id in (select friend_id from mutual))
    group by l.user_id, l.log_date
  ),
  both_days as (
    select m.friend_id, mine.log_date
    from mutual m
    join days mine on mine.user_id = (select auth.uid())
    join days theirs on theirs.user_id = m.friend_id and theirs.log_date = mine.log_date
  ),
  -- consecutive days share a group key (gaps and islands)
  islands as (
    select friend_id, log_date, log_date - (row_number() over (partition by friend_id order by log_date))::int as grp
    from both_days
  ),
  -- the streak runs up to today if both already checked in, else up to yesterday (today is still open)
  anchored as (
    select m.friend_id,
           exists (select 1 from both_days b where b.friend_id = m.friend_id and b.log_date = p_today) as both_today
    from mutual m
  )
  select a.friend_id,
         coalesce((
           select count(*)::int from islands i
           where i.friend_id = a.friend_id
             and i.grp = (
               select i2.grp from islands i2
               where i2.friend_id = a.friend_id
                 and i2.log_date = case when a.both_today then p_today else p_today - 1 end
             )
         ), 0) as streak,
         exists (select 1 from days d where d.user_id = (select auth.uid()) and d.log_date = p_today) as me_today,
         exists (select 1 from days d where d.user_id = a.friend_id and d.log_date = p_today) as friend_today
  from anchored a
$$;

revoke execute on function public.shared_streaks(date) from public, anon;
grant execute on function public.shared_streaks(date) to authenticated;
