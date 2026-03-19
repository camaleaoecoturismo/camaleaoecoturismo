SELECT cron.alter_job(
  job_id := (SELECT jobid FROM cron.job WHERE jobname = 'roca-auto-execute-daily'),
  schedule := '0 23 * * *'
);