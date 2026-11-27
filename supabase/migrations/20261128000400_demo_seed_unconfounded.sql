-- The demo taught a false lesson: moods were higher on Mon/Wed/Fri — exactly the
-- Workout days — so "Workout lifts your mood" was a weekday effect in disguise.
-- Same seed, honest moods (see the comment in the loop). Existing guests keep
-- their data; new demos get this.
create or replace function public.seed_demo(p_today date, p_locale text default 'en')
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  ru boolean := p_locale = 'ru';
  h_read uuid; h_gym uuid; h_walk uuid; h_med uuid;
  d date;
  i int;
begin
  if me is null or not public.is_guest() then
    raise exception 'demo data is for guests only';
  end if;
  if abs(p_today - current_date) > 1 then
    raise exception 'bad date';
  end if;
  if exists (select 1 from public.habits where user_id = me) then
    return; -- already seeded (a reload, a second tab)
  end if;

  insert into public.habits (user_id, name, color, position, target_per_week, mini_label, cue, created_at, is_sample)
  values (me, case when ru then 'Читать 10 страниц' else 'Read 10 pages' end, 'emerald', 0, 7,
          case when ru then '1 страница' else '1 page' end,
          case when ru then 'После ужина — открою книгу' else 'After dinner, I open the book' end,
          (p_today - 60)::timestamptz, true)
  returning id into h_read;
  insert into public.habits (user_id, name, color, position, target_per_week, created_at, is_sample)
  values (me, case when ru then 'Тренировка' else 'Workout' end, 'sky', 1, 3, (p_today - 60)::timestamptz, true)
  returning id into h_gym;
  insert into public.habits (user_id, name, color, position, target_per_week, created_at, is_sample)
  values (me, case when ru then 'Прогулка 30 минут' else '30-minute walk' end, 'amber', 2, 5, (p_today - 60)::timestamptz, true)
  returning id into h_walk;
  insert into public.habits (user_id, name, color, position, target_per_week, mini_label, created_at, is_sample)
  values (me, case when ru then 'Медитация' else 'Meditate' end, 'violet', 3, 7,
          case when ru then '3 вдоха' else '3 breaths' end, (p_today - 45)::timestamptz, true)
  returning id into h_med;

  for i in 1..60 loop
    d := p_today - i;
    -- reading: daily, missed on days 41–42 and 23 → two comebacks, a 22-day streak now
    if i not in (23, 41, 42) then
      insert into public.habit_logs (user_id, habit_id, log_date, created_at)
      values (me, h_read, d, d + time '21:30' + (i % 40) * interval '1 minute');
    end if;
    -- workout: Mon / Wed / Fri, one week skipped
    if extract(isodow from d) in (1, 3, 5) and i not between 29 and 35 then
      insert into public.habit_logs (user_id, habit_id, log_date, created_at)
      values (me, h_gym, d, d + time '07:40');
    end if;
    -- walk: weekdays, most of them
    if extract(isodow from d) <= 5 and i % 9 <> 4 then
      insert into public.habit_logs (user_id, habit_id, log_date, created_at)
      values (me, h_walk, d, d + time '13:10');
    end if;
    -- meditation: since 45 days ago, irregular; some days only the mini version
    if i <= 45 and (i * 7) % 10 < 7 then
      insert into public.habit_logs (user_id, habit_id, log_date, created_at, is_mini)
      values (me, h_med, d, d + time '08:05', i % 5 = 0);
    end if;
    -- moods for the last 45 days. Mood goes with meditation (irregular, a
    -- 10-day rhythm — not tied to weekdays, so the comparison is fair) plus a
    -- little day-to-day noise; energy is just noise. The habit page then shows
    -- one real difference and one "about the same".
    if i <= 45 then
      insert into public.daily_moods (user_id, day, mood, energy)
      values (me, d,
              least(5, greatest(1, 3 + ((i * 37 + 11) % 3) - 1 + case when (i * 7) % 10 < 7 then 1 else 0 end)),
              2 + (i * 53 + 7) % 3);
    end if;
  end loop;
end;
$$;
