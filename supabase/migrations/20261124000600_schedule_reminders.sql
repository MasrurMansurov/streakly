-- Run the send-reminders Edge Function every 15 minutes.
-- The function authenticates the call with a random token kept in Vault.
select cron.schedule(
  'send-reminders',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://oypfnyzhyyyrinxwtagz.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-token', (select decrypted_secret from vault.decrypted_secrets where name = 'reminders_cron_token')
    ),
    body := '{"action":"send"}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
