-- Readable usernames for new users, from the OAuth profile: GitHub login or the
-- Google name ("Jane Doe" → jane_doe, "Масрур Мансуров" → masrur_mansurov),
-- + digits if taken. The email is never used: usernames can become public.
-- Without a usable name: user_<random>. Photo: avatar_url or Google's picture.

create or replace function public.translit_ru(s text)
returns text
language sql
immutable
set search_path = ''
as $$
  select translate(
    replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(
      lower(s),
      'щ', 'shch'), 'ж', 'zh'), 'х', 'kh'), 'ц', 'ts'), 'ч', 'ch'), 'ш', 'sh'),
      'ю', 'yu'), 'я', 'ya'), 'ё', 'yo'), 'ъ', ''), 'ь', ''),
    'абвгдезийклмнопрстуфыэ',
    'abvgdeziyklmnoprstufye'
  );
$$;

revoke execute on function public.translit_ru(text) from public, anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  base text;
  candidate text;
  n int := 0;
begin
  base := public.translit_ru(coalesce(
    nullif(meta ->> 'user_name', ''),
    nullif(meta ->> 'full_name', ''),
    nullif(meta ->> 'name', ''),
    ''
  ));
  base := regexp_replace(base, '[^a-z0-9_]+', '_', 'g');
  base := left(trim(both '_' from base), 16);
  if char_length(base) < 3 then
    base := 'user_' || substr(replace(new.id::text, '-', ''), 1, 6);
  end if;

  candidate := base;
  while exists (select 1 from public.profiles p where p.username = candidate) loop
    n := n + 1;
    candidate := left(base, 16) || n::text;
    if n > 50 then
      candidate := 'user_' || substr(replace(new.id::text, '-', ''), 1, 10);
      exit;
    end if;
  end loop;

  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    candidate,
    left(coalesce(nullif(meta ->> 'full_name', ''), nullif(meta ->> 'name', '')), 50),
    coalesce(nullif(meta ->> 'avatar_url', ''), nullif(meta ->> 'picture', ''))
  );
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
