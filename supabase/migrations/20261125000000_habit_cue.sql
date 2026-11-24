-- If-then plan ("implementation intention"): the moment that triggers the habit,
-- e.g. "After my morning coffee" → Read 10 pages.
alter table public.habits
  add column cue text check (cue is null or char_length(cue) between 1 and 80);
