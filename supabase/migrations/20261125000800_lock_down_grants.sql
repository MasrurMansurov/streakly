-- Security audit (P0): grants and check-in dates.
--
-- 1. Supabase's default privileges give anon/authenticated ALL on every new
--    table in public, so the column-level `grant update (...)` statements in
--    earlier migrations restricted nothing. An invitee could accept a pact and
--    rewrite inviter_habit_id to any habit; my_pacts() (SECURITY DEFINER) then
--    revealed that habit's name and check-in dates, even on a private profile.
--    Fix: table-level UPDATE is revoked and re-granted per column.
-- 2. anon never writes: only SELECT stays (RLS decides what it sees).
-- 3. Check-ins can't be backdated: a signed-in user may only log a day within
--    the last week (+1 day of timezone slack), and not before the habit existed.

-- ───────────── anon: read-only ─────────────
revoke insert, update, delete, truncate, references, trigger
  on all tables in schema public from anon;

-- ───────────── authenticated: no DDL-ish privileges ─────────────
revoke truncate, references, trigger on all tables in schema public from authenticated;

-- ───────────── column-level UPDATE where policies only cover some columns ─────────────
-- pacts: the invitee accepts (habit, status, time). Nudge dates are written by
-- the reminders function, which connects as postgres.
revoke update on public.pacts from authenticated;
grant update (invitee_habit_id, status, accepted_at) on public.pacts to authenticated;

-- challenge_members: accepting an invite picks a habit; the row can't move to another challenge
revoke update on public.challenge_members from authenticated;
grant update (habit_id, status, joined_at) on public.challenge_members to authenticated;

-- pact_proofs: only the note and the photo of an existing proof change
revoke update on public.pact_proofs from authenticated;
grant update (note, photo_path) on public.pact_proofs to authenticated;

-- habit_logs: only mini ↔ full; day and habit are fixed (delete + insert instead)
revoke update on public.habit_logs from authenticated;
grant update (is_mini) on public.habit_logs to authenticated;

-- ───────────── check-in date window ─────────────
create function public.habit_logs_check_date()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- service role / postgres (seeding, maintenance) is not limited
  if (select auth.uid()) is null then
    return new;
  end if;
  -- current_date is UTC; ±1 day covers every timezone (UTC−12 … UTC+14)
  if new.log_date > current_date + 1 or new.log_date < current_date - 8 then
    raise exception 'check-in date out of range' using errcode = '22008';
  end if;
  if exists (
    select 1 from public.habits h
    where h.id = new.habit_id and new.log_date < (h.created_at at time zone 'UTC')::date - 1
  ) then
    raise exception 'check-in before the habit was created' using errcode = '22008';
  end if;
  return new;
end;
$$;

revoke execute on function public.habit_logs_check_date() from public, anon, authenticated;

create trigger habit_logs_check_date
  before insert on public.habit_logs
  for each row execute function public.habit_logs_check_date();
