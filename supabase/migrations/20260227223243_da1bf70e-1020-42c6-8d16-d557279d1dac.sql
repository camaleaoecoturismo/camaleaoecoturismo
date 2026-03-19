SELECT cron.schedule(
  'roca-auto-execute-daily',
  '30 22 * * *',
  $$
  SELECT net.http_post(
    url := 'https://guwplwuwriixgvkjlutg.supabase.co/functions/v1/roca-auto-execute',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1d3Bsd3V3cmlpeGd2a2psdXRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MzE3MDYsImV4cCI6MjA2OTMwNzcwNn0.XqFnllTUiv1SZrnL23hy7pWWeIeWDldfm9lpfO3vIQg"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);