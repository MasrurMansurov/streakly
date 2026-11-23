-- Weekly targets: 7 = every day (default), 1–6 = N times per week
alter table public.habits
  add column target_per_week smallint not null default 7
  check (target_per_week between 1 and 7);
