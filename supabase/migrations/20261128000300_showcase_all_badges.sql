-- The badge showcase rejected the two comeback badges added later
-- ("comeback", "never_twice"): the check still listed the first six.
-- Keep this list in sync with ACHIEVEMENTS in src/lib/achievements.ts
-- (a unit test compares them).
alter table public.profiles drop constraint profiles_showcase_check;
alter table public.profiles add constraint profiles_showcase_check check (
  cardinality(showcase) <= 3
  and showcase <@ array['first_checkin', 'streak_7', 'streak_30', 'streak_100', 'checkins_100', 'checkins_500', 'comeback', 'never_twice']
);
