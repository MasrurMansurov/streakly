-- A user can delete their own account. Everything else (profile, habits,
-- check-ins, notes, follows, reminders) goes with it via ON DELETE CASCADE.
-- Avatar files are removed by the app through the Storage API first.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
