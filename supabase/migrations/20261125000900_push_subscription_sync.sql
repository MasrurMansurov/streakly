-- Reliable push subscriptions (P1 audit):
-- - The app re-syncs this device's subscription on every open. A browser may
--   rotate the endpoint or keys, and Apple can answer 201 for a dead
--   subscription, so "the device still has it" is the only real signal.
-- - endpoint is unique across users: on a shared device the subscription
--   follows whoever is signed in. Before, a second user's save failed silently
--   and the first user's reminders (with their habit names) kept arriving.
-- - last_seen_at: when the app last confirmed the subscription.
--   last_success_at: the last accepted push. Rows the app hasn't confirmed for
--   60 days are removed nightly.

alter table public.push_subscriptions
  add column last_seen_at    timestamptz not null default now(),
  add column last_success_at timestamptz;

create function public.claim_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated';
  end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, last_seen_at)
  values ((select auth.uid()), p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300), now())
  on conflict (endpoint) do update
    set user_id      = excluded.user_id,
        p256dh       = excluded.p256dh,
        auth         = excluded.auth,
        user_agent   = coalesce(excluded.user_agent, public.push_subscriptions.user_agent),
        last_seen_at = now();
end;
$$;

revoke execute on function public.claim_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.claim_push_subscription(text, text, text, text) to authenticated;

-- Nightly: forget subscriptions no app has confirmed for 60 days.
select cron.schedule(
  'cleanup-stale-push-subscriptions',
  '30 3 * * *',
  $$ delete from public.push_subscriptions where last_seen_at < now() - interval '60 days' $$
);
