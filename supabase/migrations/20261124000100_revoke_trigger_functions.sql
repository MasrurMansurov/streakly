-- Trigger functions must not be callable through the Data API (/rest/v1/rpc/...)
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.habit_logs_check_owner() from public, anon, authenticated;
