-- Pacts (P2 audit): a partner's vacation must not break the shared streak.
-- my_pacts() now also returns the vacation days of both people (last 400
-- days, active pacts only); the app treats them like vacation in a personal
-- streak — they connect a run but don't add to it. Only dates leave the
-- function, as before, and only to the other participant.
drop function public.my_pacts();

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
  accepted_at timestamptz,
  paused_days date[]
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
    p.accepted_at,
    case when p.status = 'active' then coalesce(
      (select array_agg(distinct g::date order by g::date)
         from public.pauses pa
         cross join generate_series(pa.start_date, pa.end_date, interval '1 day') g
        where pa.user_id in (p.inviter_id, p.invitee_id)
          and pa.end_date >= current_date - 400),
      '{}') else '{}' end
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
