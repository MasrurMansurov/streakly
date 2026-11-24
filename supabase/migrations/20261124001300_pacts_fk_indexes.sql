-- covering indexes for the pacts foreign keys (cascading deletes, participant lookups)
create index pacts_inviter_idx on public.pacts (inviter_id);
create index pacts_inviter_habit_idx on public.pacts (inviter_habit_id);
create index pacts_invitee_habit_idx on public.pacts (invitee_habit_id);
