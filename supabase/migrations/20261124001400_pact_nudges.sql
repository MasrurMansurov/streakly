-- the (recipient-local) day each side was last notified about their partner's check-in,
-- so a pact sends at most one push per person per day
alter table public.pacts
  add column inviter_nudged_on date,
  add column invitee_nudged_on date;
