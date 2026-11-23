-- Private notes on check-ins ("read 25 pages").
-- Kept out of habit_logs on purpose: logs of public profiles are world-readable,
-- notes must stay visible to their owner only.
create table public.habit_notes (
  habit_id   uuid not null,
  log_date   date not null,
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  note       text not null check (char_length(note) between 1 and 280),
  updated_at timestamptz not null default now(),
  primary key (habit_id, log_date),
  -- a note belongs to a check-in: unchecking the day removes the note
  foreign key (habit_id, log_date) references public.habit_logs (habit_id, log_date) on delete cascade
);

create index habit_notes_user_id_idx on public.habit_notes (user_id);

alter table public.habit_notes enable row level security;

create policy "habit_notes: read own"
  on public.habit_notes for select to authenticated
  using (user_id = (select auth.uid()));

create policy "habit_notes: insert own"
  on public.habit_notes for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.habits h where h.id = habit_id and h.user_id = (select auth.uid()))
  );

create policy "habit_notes: update own"
  on public.habit_notes for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "habit_notes: delete own"
  on public.habit_notes for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.habit_notes to authenticated;
