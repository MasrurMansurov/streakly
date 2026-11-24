-- Daily at 03:15 UTC: remove pact proof photos older than 30 days or of deleted pacts.
select cron.schedule(
  'cleanup-proofs',
  '15 3 * * *',
  $$
  select net.http_post(
    url := 'https://oypfnyzhyyyrinxwtagz.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-token', (select decrypted_secret from vault.decrypted_secrets where name = 'reminders_cron_token')
    ),
    body := '{"action":"cleanup"}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
