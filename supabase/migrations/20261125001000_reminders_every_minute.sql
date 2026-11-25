-- Reminders can be set to any minute (09:32, not only 09:30 / 09:45), so the
-- scheduler runs every minute instead of every 15. The function's window
-- ("time passed in the last 2 hours, not sent today") stays the same, so a
-- reminder still goes out exactly once a day, also on DST days.
-- ~43k invocations a month — well within the Edge Functions quota.
select cron.alter_job(
  (select jobid from cron.job where jobname = 'send-reminders'),
  schedule := '* * * * *'
);
