-- Database advisor (unindexed_foreign_keys): deleting a profile cascades through
-- these foreign keys; without an index each cascade scans the whole table.
create index if not exists habit_steps_user_id_idx on public.habit_steps (user_id);
create index if not exists streak_gifts_from_user_id_idx on public.streak_gifts (from_user_id);
