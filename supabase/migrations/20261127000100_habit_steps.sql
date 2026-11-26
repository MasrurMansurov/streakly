-- Steps inside a habit (plan 2.5.1, "Subtasks"): "Morning: water → stretch → shower".
--
-- habit_logs stays the single source of truth for streaks, freezes, pauses and
-- everything else; steps sit on top of it:
--   * all steps done        → a full check-in (is_mini = false)
--   * at least one step     → a mini check-in (the streak goes on)
--   * no steps              → no check-in
-- A full check-in made any other way (one tap on the card, the notification
-- button, the offline queue) ticks every step — a trigger keeps them in sync,
-- so no code path can disagree. Steps are private: owner-only.

create table public.habit_steps (
  id         uuid primary key default gen_random_uuid(),
  habit_id   uuid not null references public.habits (id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title      text not null check (char_length(btrim(title)) between 1 and 80),
  position   integer not null default 0,
  created_at timestamptz not null default now()
);
create index habit_steps_habit_idx on public.habit_steps (habit_id, position);

create table public.habit_step_logs (
  step_id    uuid not null references public.habit_steps (id) on delete cascade,
  habit_id   uuid not null references public.habits (id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  log_date   date not null,
  created_at timestamptz not null default now(),
  primary key (step_id, log_date)
);
create index habit_step_logs_habit_day_idx on public.habit_step_logs (habit_id, log_date);
create index habit_step_logs_user_day_idx on public.habit_step_logs (user_id, log_date);

alter table public.habit_steps enable row level security;
alter table public.habit_step_logs enable row level security;

-- user_id on both tables: policies need no joins on reads
create policy "habit_steps: read own" on public.habit_steps for select to authenticated
  using (user_id = (select auth.uid()));
create policy "habit_steps: add to own habit" on public.habit_steps for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.habits h where h.id = habit_id and h.user_id = (select auth.uid()))
  );
create policy "habit_steps: edit own" on public.habit_steps for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "habit_steps: delete own" on public.habit_steps for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "habit_step_logs: read own" on public.habit_step_logs for select to authenticated
  using (user_id = (select auth.uid()));
create policy "habit_step_logs: add own" on public.habit_step_logs for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.habit_steps s where s.id = step_id and s.habit_id = habit_id and s.user_id = (select auth.uid()))
  );
create policy "habit_step_logs: delete own" on public.habit_step_logs for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.habit_steps, public.habit_step_logs from anon;
-- a step can be renamed or moved, never re-parented to another habit or user
revoke update, truncate, references, trigger on public.habit_steps from authenticated;
grant update (title, position) on public.habit_steps to authenticated;
revoke update, truncate, references, trigger on public.habit_step_logs from authenticated;

-- A full check-in ticks every step; removing the check-in clears them.
-- SECURITY INVOKER: runs with the caller's rights, RLS applies.
create function public.habit_logs_sync_steps()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.habit_step_logs where habit_id = old.habit_id and log_date = old.log_date;
    return old;
  end if;
  if not new.is_mini then
    insert into public.habit_step_logs (step_id, habit_id, user_id, log_date)
    select s.id, s.habit_id, new.user_id, new.log_date
    from public.habit_steps s
    where s.habit_id = new.habit_id
    on conflict do nothing;
  end if;
  return new;
end;
$$;
revoke execute on function public.habit_logs_sync_steps() from public, anon, authenticated;

create trigger habit_logs_sync_steps
  after insert or update of is_mini or delete on public.habit_logs
  for each row execute function public.habit_logs_sync_steps();

-- Tick / untick one step and settle the day's check-in by the rule above.
-- Returns the day's state: 'full', 'mini' or 'none'. SECURITY INVOKER: RLS
-- and the check-in date window apply exactly as for a normal check-in.
create function public.toggle_habit_step(p_step uuid, p_date date, p_done boolean)
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  h uuid;
  total int;
  done int;
begin
  select habit_id into h from public.habit_steps where id = p_step;
  if h is null then
    raise exception 'step not found' using errcode = 'P0002';
  end if;
  if p_date > current_date + 1 or p_date < current_date - 8 then
    raise exception 'check-in date out of range' using errcode = '22008';
  end if;

  if p_done then
    insert into public.habit_step_logs (step_id, habit_id, log_date) values (p_step, h, p_date)
    on conflict do nothing;
  else
    delete from public.habit_step_logs where step_id = p_step and log_date = p_date;
  end if;

  select count(*) into total from public.habit_steps where habit_id = h;
  select count(*) into done from public.habit_step_logs where habit_id = h and log_date = p_date;

  if done = 0 then
    delete from public.habit_logs where habit_id = h and log_date = p_date;
    return 'none';
  elsif done >= total then
    insert into public.habit_logs (habit_id, log_date, is_mini) values (h, p_date, false)
    on conflict (habit_id, log_date) do update set is_mini = false;
    return 'full';
  else
    insert into public.habit_logs (habit_id, log_date, is_mini) values (h, p_date, true)
    on conflict (habit_id, log_date) do update set is_mini = true;
    return 'mini';
  end if;
end;
$$;
revoke execute on function public.toggle_habit_step(uuid, date, boolean) from public, anon;
grant execute on function public.toggle_habit_step(uuid, date, boolean) to authenticated;
