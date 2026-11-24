-- Discord-style profile customization: banner (preset gradient or own image),
-- accent colour, avatar frame, status, pronouns, links, achievement showcase and
-- a featured habit. Values are checked here; presets are rendered by the app.
alter table public.profiles
  add column banner text not null default 'aurora'
    check (banner in ('aurora', 'sunset', 'ocean', 'forest', 'berry', 'ember', 'midnight', 'mono')),
  add column banner_url text check (banner_url is null or banner_url ~ '^https://[a-z0-9.-]+\.supabase\.co/storage/v1/object/public/avatars/'),
  add column accent text not null default 'emerald'
    check (accent in ('emerald', 'sky', 'violet', 'rose', 'amber', 'orange', 'teal', 'slate')),
  add column avatar_frame text not null default 'none'
    check (avatar_frame in ('none', 'ring', 'gradient', 'glow')),
  add column status text check (status is null or char_length(status) between 1 and 60),
  add column pronouns text check (pronouns is null or char_length(pronouns) between 1 and 20),
  add column links text[] not null default '{}',
  add column showcase text[] not null default '{}'
    check (cardinality(showcase) <= 3
           and showcase <@ array['first_checkin', 'streak_7', 'streak_30', 'streak_100', 'checkins_100', 'checkins_500']),
  add column featured_habit_id uuid references public.habits (id) on delete set null;

-- at most 3 links, each an https URL of reasonable length (no javascript: etc.)
create function public.valid_profile_links(p text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(bool_and(l ~ '^https://[^\s/$.?#].[^\s]*$' and char_length(l) <= 200), true) from unnest(p) as l;
$$;
grant execute on function public.valid_profile_links(text[]) to authenticated;
alter table public.profiles add constraint profiles_links_max3 check (cardinality(links) <= 3);
alter table public.profiles add constraint profiles_links_https check (public.valid_profile_links(links));

create index profiles_featured_habit_idx on public.profiles (featured_habit_id);

-- a featured habit must be the profile owner's own
create function public.profiles_featured_habit_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.featured_habit_id is not null and not exists (
    select 1 from public.habits h where h.id = new.featured_habit_id and h.user_id = new.id
  ) then
    raise exception 'featured habit must be your own';
  end if;
  return new;
end;
$$;
revoke execute on function public.profiles_featured_habit_owner() from public, anon, authenticated;
create trigger profiles_featured_habit_owner before insert or update of featured_habit_id on public.profiles
  for each row execute function public.profiles_featured_habit_owner();
