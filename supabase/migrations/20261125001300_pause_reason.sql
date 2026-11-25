-- Pauses get a reason (P2 audit): "I'm ill" is a different feeling than a
-- streak freeze or a vacation, and naming it takes the self-blame out of a
-- break. Streaks and reminders work the same for every reason.
alter table public.pauses
  add column reason text not null default 'vacation' check (reason in ('vacation', 'sick', 'rest'));
