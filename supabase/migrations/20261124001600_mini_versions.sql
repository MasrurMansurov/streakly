-- "Mini" version of a habit (e.g. "1 page" instead of "10 pages"): doing it still
-- keeps the streak alive, it is just marked as a smaller check-in.
alter table public.habits
  add column mini_label text check (mini_label is null or char_length(mini_label) between 1 and 60);

alter table public.habit_logs
  add column is_mini boolean not null default false;

-- owners can upgrade a mini check-in to a full one (and back)
create policy "habit_logs: update own"
  on public.habit_logs for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant update (is_mini) on public.habit_logs to authenticated;
