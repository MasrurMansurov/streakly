-- Per-habit reminder time ("Workout" at 07:00, "Read" at 22:00). Kept out of
-- `habits` because habits of public profiles are readable by anyone, and when
-- a person trains is nobody else's business. Only the owner can see or change it;
-- `last_sent_on` is written by the reminder function only.
create table public.habit_reminders (
  habit_id     uuid primary key references public.habits (id) on delete cascade,
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  remind_at    time not null,
  last_sent_on date
);
create index habit_reminders_user_id_idx on public.habit_reminders (user_id);
alter table public.habit_reminders enable row level security;

create policy "habit_reminders: read own" on public.habit_reminders for select to authenticated
  using (user_id = (select auth.uid()));
create policy "habit_reminders: insert own" on public.habit_reminders for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.habits h where h.id = habit_id and h.user_id = (select auth.uid()))
  );
create policy "habit_reminders: update own" on public.habit_reminders for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.habits h where h.id = habit_id and h.user_id = (select auth.uid()))
  );
create policy "habit_reminders: delete own" on public.habit_reminders for delete to authenticated
  using (user_id = (select auth.uid()));

-- Supabase grants new tables to anon/authenticated by default: start from nothing
revoke all on public.habit_reminders from anon, authenticated;
grant select, delete on public.habit_reminders to authenticated;
grant insert (habit_id, remind_at), update (habit_id, remind_at) on public.habit_reminders to authenticated;

-- a new time means a new reminder today, even if the old one already went out
create function public.reset_habit_reminder_sent() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.remind_at is distinct from old.remind_at then
    new.last_sent_on := null;
  end if;
  return new;
end $$;
revoke execute on function public.reset_habit_reminder_sent() from public, anon, authenticated;
create trigger habit_reminders_reset_sent before update on public.habit_reminders
  for each row execute function public.reset_habit_reminder_sent();
