-- Private habits: tracked as usual (dashboard, reminders, streaks), but never
-- shown to others — not on the public profile, in the friends feed or on the
-- leaderboard. Enforced by RLS, not just hidden in the UI.
--
-- Also closes a small leak: check-ins of ARCHIVED habits on a public profile
-- were readable through the API (the habits themselves were already hidden).
-- Others now see check-ins only of habits they can see.
--
-- Pacts and challenges are unchanged: putting a habit into one is an explicit
-- choice to share it with that person / group.

alter table public.habits
  add column is_private boolean not null default false;

drop policy "habits: read own or public" on public.habits;
create policy "habits: read own or public"
  on public.habits for select to anon, authenticated
  using (
    user_id = (select auth.uid())
    or (
      archived_at is null
      and not is_private
      and exists (select 1 from public.profiles p where p.id = habits.user_id and p.is_public)
    )
  );

drop policy "habit_logs: read own or public" on public.habit_logs;
create policy "habit_logs: read own or public"
  on public.habit_logs for select to anon, authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1
      from public.habits h
      join public.profiles p on p.id = h.user_id
      where h.id = habit_logs.habit_id
        and h.archived_at is null
        and not h.is_private
        and p.is_public
    )
  );
