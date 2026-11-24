-- Proof in pacts: a photo and/or a short note attached to a day's check-in.
-- The partner's proof for a day unlocks only after you've checked in that day
-- yourself (a BeReal-style "shared moment"), enforced here, not in the UI.

-- the caller's habit in a pact (or null)
create function public.my_pact_habit(p_pact uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select case when p.inviter_id = (select auth.uid()) then p.inviter_habit_id
              when p.invitee_id = (select auth.uid()) then p.invitee_habit_id end
  from public.pacts p
  where p.id = p_pact and p.status = 'active';
$$;
revoke execute on function public.my_pact_habit(uuid) from public, anon;
grant execute on function public.my_pact_habit(uuid) to authenticated;

-- did the caller check in their pact habit on that day?
create function public.checked_in_for_pact(p_pact uuid, p_day date)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.habit_logs l
    where l.habit_id = public.my_pact_habit(p_pact) and l.user_id = (select auth.uid()) and l.log_date = p_day
  );
$$;
revoke execute on function public.checked_in_for_pact(uuid, date) from public, anon;
grant execute on function public.checked_in_for_pact(uuid, date) to authenticated;

create table public.pact_proofs (
  pact_id     uuid not null references public.pacts (id) on delete cascade,
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  day         date not null,
  note        text check (note is null or char_length(note) between 1 and 140),
  photo_path  text check (photo_path is null or char_length(photo_path) <= 200),
  created_at  timestamptz not null default now(),
  primary key (pact_id, user_id, day),
  check (note is not null or photo_path is not null)
);
create index pact_proofs_user_idx on public.pact_proofs (user_id);

alter table public.pact_proofs enable row level security;

create policy "pact_proofs: own, or the partner's once you've checked in"
  on public.pact_proofs for select to authenticated
  using (
    user_id = (select auth.uid())
    or (public.my_pact_habit(pact_id) is not null and public.checked_in_for_pact(pact_id, day))
  );

-- only for your own check-in in an active pact, for a recent day
create policy "pact_proofs: add own"
  on public.pact_proofs for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and day between current_date - 1 and current_date + 1
    and public.checked_in_for_pact(pact_id, day)
    and (photo_path is null or photo_path like pact_id::text || '/' || (select auth.uid())::text || '/%')
  );

create policy "pact_proofs: edit own"
  on public.pact_proofs for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (photo_path is null or photo_path like pact_id::text || '/' || (select auth.uid())::text || '/%')
  );

create policy "pact_proofs: delete own"
  on public.pact_proofs for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, delete on public.pact_proofs to authenticated;
grant update (note, photo_path) on public.pact_proofs to authenticated;

-- Which of my pacts have a partner proof for that day — existence only, no content
-- (so the UI can show a lock: "check in to see it").
create function public.pacts_with_partner_proof(p_day date)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select pr.pact_id
  from public.pact_proofs pr
  join public.pacts p on p.id = pr.pact_id and p.status = 'active'
  where pr.day = p_day
    and pr.user_id <> (select auth.uid())
    and (select auth.uid()) in (p.inviter_id, p.invitee_id);
$$;
revoke execute on function public.pacts_with_partner_proof(date) from public, anon;
grant execute on function public.pacts_with_partner_proof(date) to authenticated;

-- Private bucket: proofs/<pact id>/<user id>/<yyyy-mm-dd>-<random>.<ext>
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('proofs', 'proofs', false, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- CASE guarantees the casts only run for well-formed paths in this bucket
create policy "proofs: upload own into an active pact"
  on storage.objects for insert to authenticated
  with check (
    case when bucket_id = 'proofs' and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/\d{4}-\d{2}-\d{2}-[a-z0-9]+\.(jpg|png|webp)$'
      then (storage.foldername(name))[2] = (select auth.uid())::text
           and public.my_pact_habit(((storage.foldername(name))[1])::uuid) is not null
      else false end
  );

create policy "proofs: read own, or the partner's once you've checked in that day"
  on storage.objects for select to authenticated
  using (
    case when bucket_id = 'proofs' and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/\d{4}-\d{2}-\d{2}-[a-z0-9]+\.(jpg|png|webp)$'
      then public.my_pact_habit(((storage.foldername(name))[1])::uuid) is not null
           and ((storage.foldername(name))[2] = (select auth.uid())::text
                or public.checked_in_for_pact(((storage.foldername(name))[1])::uuid, left(storage.filename(name), 10)::date))
      else false end
  );

create policy "proofs: delete own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'proofs' and (storage.foldername(name))[2] = (select auth.uid())::text);
