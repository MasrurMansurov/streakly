-- Invite links (growth plan 1.2): /i/{code} works for people without an
-- account. The inviter optionally attaches one habit — then the invitee gets a
-- pact proposal for it. Accepting makes the two follow each other.
--
-- Privacy: the preview reveals only what the inviter chose to share by sending
-- the link — their display name, username, avatar and, if attached, that one
-- habit's name, color and recent check-in count — even for a private profile.

create table public.invites (
  code       text primary key check (code ~ '^[a-z0-9]{8}$'),
  inviter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  habit_id   uuid references public.habits (id) on delete cascade,
  uses       integer not null default 0,
  created_at timestamptz not null default now(),
  unique nulls not distinct (inviter_id, habit_id)
);
create index invites_habit_idx on public.invites (habit_id);

alter table public.invites enable row level security;
create policy "invites: read own"
  on public.invites for select to authenticated
  using (inviter_id = (select auth.uid()));
create policy "invites: create own"
  on public.invites for insert to authenticated
  with check (
    inviter_id = (select auth.uid())
    and uses = 0
    and (habit_id is null or exists (
      select 1 from public.habits h where h.id = habit_id and h.user_id = (select auth.uid()) and h.archived_at is null))
  );
create policy "invites: delete own"
  on public.invites for delete to authenticated
  using (inviter_id = (select auth.uid()));
revoke all on public.invites from anon;
revoke update, truncate, references, trigger on public.invites from authenticated;

-- What the invite page shows (anyone with the link).
create function public.invite_preview(p_code text)
returns table (inviter_name text, inviter_username text, inviter_avatar text, habit_name text, habit_color text, habit_checkins_30 integer)
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(p.display_name, p.username), p.username, p.avatar_url,
         h.name, h.color,
         case when h.id is null then null else (
           select count(*)::int from public.habit_logs l where l.habit_id = h.id and l.log_date > current_date - 30
         ) end
  from public.invites i
  join public.profiles p on p.id = i.inviter_id
  left join public.habits h on h.id = i.habit_id and h.archived_at is null
  where i.code = p_code;
$$;
revoke execute on function public.invite_preview(text) from public;
grant execute on function public.invite_preview(text) to anon, authenticated;

-- Accept: follow each other; with a habit attached, a pending pact from the
-- inviter (the invitee picks their own habit when accepting the pact).
-- Returns the inviter's username, or null for an unknown code / own link.
create function public.accept_invite(p_code text)
returns table (inviter_username text, pact_proposed boolean)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  inv public.invites;
  proposed boolean := false;
begin
  if me is null then
    raise exception 'not authenticated';
  end if;
  select * into inv from public.invites where code = p_code;
  if inv is null or inv.inviter_id = me then
    return;
  end if;

  insert into public.follows (follower_id, following_id) values (me, inv.inviter_id), (inv.inviter_id, me)
  on conflict do nothing;

  if inv.habit_id is not null and exists (
    select 1 from public.habits h where h.id = inv.habit_id and h.archived_at is null
  ) then
    -- one pact per pair: an existing one (any direction) wins
    insert into public.pacts (inviter_id, invitee_id, inviter_habit_id, status)
    values (inv.inviter_id, me, inv.habit_id, 'pending')
    on conflict do nothing;
    proposed := found;
  end if;

  update public.invites set uses = uses + 1 where code = p_code;
  return query select p.username, proposed from public.profiles p where p.id = inv.inviter_id;
end;
$$;
revoke execute on function public.accept_invite(text) from public, anon;
grant execute on function public.accept_invite(text) to authenticated;
